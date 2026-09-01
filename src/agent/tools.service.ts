import { tool } from "langchain";
import * as z from "zod";

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

export const findRecipe = tool(
  async (input: { recipeName: string }) => {
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

export const webSearch = tool(
  async (input: { query: string }) => {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(input.query)}&format=json&no_html=1&skip_disambig=1`;
    const data = await fetchJson<{
      AbstractText?: string;
      AbstractSource?: string;
      AbstractURL?: string;
      Heading?: string;
      RelatedTopics?: Array<
        { Name?: string; Text?: string; FirstURL?: string } | string
      >;
    }>(searchUrl);

    const relatedTopics = (data.RelatedTopics ?? [])
      .filter(
        (topic): topic is { Name?: string; Text?: string; FirstURL?: string } =>
          typeof topic === "object" && topic !== null,
      )
      .slice(0, 5)
      .map((topic) => ({
        title: topic.Name ?? "Related result",
        text: topic.Text ?? "",
        url: topic.FirstURL ?? null,
      }));

    return normalizeToolResult(
      {
        query: input.query,
        answer:
          data.AbstractText ||
          data.Heading ||
          "No direct summary was returned.",
        source: data.AbstractSource || null,
        url: data.AbstractURL || relatedTopics[0]?.url || null,
        relatedTopics,
      },
      `The web search for "${input.query}" did not return usable results. Try a more specific or shorter search query.`,
    );
  },
  {
    name: "web_search",
    description:
      "Search the web for recent or factual information, then summarize the most relevant results.",
    schema: z.object({
      query: z
        .string()
        .describe("The search query to investigate on the internet"),
    }),
  },
);

export const getCommonInfo = tool(
  async (input: { query: string }) => {
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
