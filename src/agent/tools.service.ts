import { tool } from "langchain";
import * as z from "zod";
import { findKnowledge } from "../embedding/embedding.service";
import { COLLECTION_NAME } from "../utils/enum";

const weatherCodeMap: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Heavy thunderstorm with hail",
};

async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${url}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown fetch error",
    } as T;
  }
}

function normalizeToolResult<T extends Record<string, unknown>>(
  result: T,
  fallbackMessage: string,
): T & { success: boolean; message?: string } {
  if ((result as any).error) {
    return {
      ...result,
      success: false,
      message: fallbackMessage,
    };
  }

  return {
    ...result,
    success: true,
  };
}

export const getRecipe = tool(
  async (input: { recipeName: string }) => {
    console.log("GETTING RECIPE INVOKED WITH NAME:", input.recipeName);
    const recipeRequest = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(input.recipeName)}`,
    );
    const recipeJson = (await recipeRequest.json()) as {
      meals?: Array<any>;
    };

    if (!recipeJson.meals || recipeJson.meals.length === 0) {
      return normalizeToolResult(
        {
          recipeName: input.recipeName,
          message: `No recipe found for "${input.recipeName}".`,
        },
        `No recipe was found for "${input.recipeName}". Try a different dish name or ingredient-based search.`,
      );
    }

    const meal = recipeJson.meals[0];
    const ingredients: Array<{ name: string; measure: string }> = [];

    for (let i = 1; i <= 20; i += 1) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (!ingredient || !String(ingredient).trim()) break;

      ingredients.push({
        name: String(ingredient).trim(),
        measure: measure ? String(measure).trim() : "",
      });
    }

    return normalizeToolResult(
      {
        name: meal.strMeal,
        category: meal.strCategory,
        area: meal.strArea,
        instructions: meal.strInstructions,
        ingredients,
        thumbnail: meal.strMealThumb,
        youtube: meal.strYoutube,
        source: meal.strSource,
      },
      `Recipe data could not be loaded for "${input.recipeName}". Please try another recipe name.`,
    );
  },
  {
    name: "get_recipe",
    description:
      "Get the recipe for a given recipe name, including ingredients and cooking steps.",
    schema: z.object({
      recipeName: z.string().describe("The recipe name to get the recipe for"),
    }),
  },
);

export const getWeather = tool(
  async (input: { location: string; unit?: "celsius" | "fahrenheit" }) => {
    console.log("GETTING WEATHER INVOKED WITH LOCATION:", input.location);
    const unit = input.unit ?? "celsius";
    const geocodeData = await fetchJson<{
      results?: Array<{
        name: string;
        country: string;
        latitude: number;
        longitude: number;
        timezone: string;
      }>;
    }>(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input.location)}&count=1&language=en&format=json`,
    );

    const location = geocodeData.results?.[0];
    if (!location || (geocodeData as any).error) {
      return normalizeToolResult(
        {
          location: input.location,
          error: `Could not find weather data for "${input.location}".`,
        },
        `No weather data was found for "${input.location}". Please check the city name or provide a more specific location.`,
      );
    }

    const weatherData = await fetchJson<{
      current?: {
        time?: string;
        temperature_2m?: number;
        apparent_temperature?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
        weather_code?: number;
      };
    }>(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&temperature_unit=${unit === "fahrenheit" ? "fahrenheit" : "celsius"}&windspeed_unit=kmh&timezone=auto&forecast_days=1`,
    );

    const current = weatherData.current;
    const weatherCode = current?.weather_code ?? 0;

    return normalizeToolResult(
      {
        location: `${location.name}, ${location.country}`,
        timezone: location.timezone,
        current: {
          time: current?.time ?? null,
          temperature: current?.temperature_2m ?? null,
          feelsLike: current?.apparent_temperature ?? null,
          humidity: current?.relative_humidity_2m ?? null,
          windSpeed: current?.wind_speed_10m ?? null,
          conditions: weatherCodeMap[weatherCode] ?? "Unknown",
          unit,
        },
      },
      `Weather data could not be loaded for "${input.location}". Please try another location or check the spelling.`,
    );
  },
  {
    name: "get_weather",
    description:
      "Get current weather conditions for a location, including temperature, humidity, and forecast-relevant conditions.",
    schema: z.object({
      location: z.string().describe("The city or location to get weather for"),
      unit: z
        .enum(["celsius", "fahrenheit"])
        .optional()
        .describe("Temperature unit to return"),
    }),
  },
);

export const getCommonInfo = tool(
  async (input: { query: string }) => {
    console.log("GETTING COMMON INFO INVOKED WITH QUERY:", input.query);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(input.query)}&format=json&utf8=1&origin=*`;
    const searchData = await fetchJson<{
      query?: {
        search?: Array<{ title: string; snippet: string; pageid: number }>;
      };
    }>(searchUrl);

    const topResult = searchData.query?.search?.[0];
    if (!topResult) {
      return normalizeToolResult(
        {
          query: input.query,
          answer: `No summary found for "${input.query}".`,
        },
        `No common information was found for "${input.query}". Try a broader or more specific question.`,
      );
    }

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topResult.title)}`;
    const summaryData = await fetchJson<{
      title?: string;
      description?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    }>(summaryUrl);

    return normalizeToolResult(
      {
        query: input.query,
        title: summaryData.title ?? topResult.title,
        description: summaryData.description ?? null,
        answer: summaryData.extract ?? topResult.snippet,
        url:
          summaryData.content_urls?.desktop?.page ??
          `https://en.wikipedia.org/wiki/${encodeURIComponent(topResult.title)}`,
      },
      `General information for "${input.query}" could not be retrieved. Please try another wording for the question.`,
    );
  },
  {
    name: "get_common_info",
    description:
      "Fetch stable general knowledge from a trusted source like Wikipedia for definitions, facts, and concise explanations.",
    schema: z.object({
      query: z.string().describe("The factual question or topic to look up"),
    }),
  },
);

export const getInterviewKnowledge = tool(
  async (input: { query: string }) => {
    console.log("INTERVIEW KNOWLEDGE TOOL INVOKED WITH QUERY:", input.query);
    const searchQuery = input.query.trim();

    if (!searchQuery) {
      return normalizeToolResult(
        {
          query: input.query,
          message: "No interview question was provided.",
        },
        "No interview knowledge was found because the query was empty. Please provide a topic or question about interview preparation.",
      );
    }

    const result = await findKnowledge(
      searchQuery,
      COLLECTION_NAME.INTERVIEW_GUIDE_DOCS,
    );

    if (!result || !result.length) {
      return normalizeToolResult(
        {
          query: searchQuery,
          message: `No knowledge found for "${searchQuery}".`,
        },
        `No interview knowledge was found for "${searchQuery}". Try a different query or a broader topic about interview preparation.`,
      );
    }

    return normalizeToolResult(
      {
        query: searchQuery,
        result: result[0],
      },
      `Interview knowledge data could not be loaded for "${searchQuery}". Please try another search query.`,
    );
  },
  {
    name: "get_interview_knowledge",
    description:
      "Search the interview-preparation knowledge base for the user's actual question or topic, such as company research, behavioral interviews, technical interview prep, mock interview tips, salary discussion, or interview etiquette.",
    schema: z.object({
      query: z
        .string()
        .min(1)
        .describe(
          "The user's interview-related question or topic to search for, such as company research, behavioral questions, technical prep, mock interview tips, or interview follow-up guidance.",
        ),
    }),
  },
);
