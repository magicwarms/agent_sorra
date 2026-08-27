import Elysia from "elysia";
import { HealthDTO } from "./health.model";
import { healthCheck } from "./health.service";

export const healthController = new Elysia({
  prefix: "/health",
  detail: { tags: ["Health"] },
}).get("/", () => healthCheck(), {
  response: {
    200: HealthDTO.healthResponse,
  },
  detail: {
    summary: "Health check endpoint",
  },
});
