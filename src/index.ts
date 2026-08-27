import { Elysia, t } from "elysia";
import { fromTypes, openapi } from "@elysia/openapi";
import { healthController } from "./health/health.controller";

const app = new Elysia({
  prefix: "/v1",
  normalize: false,
});

app.trace(async ({ onHandle, context }) => {
  onHandle(({ begin, onStop }) => {
    onStop(({ end }) => {
      console.log(
        `${context.route} -> query/param: ${JSON.stringify(context.query) ?? JSON.stringify(context.params) ?? "-"} took`,
        (end - begin).toPrecision(2),
        "ms",
      );
    });
  });
});

app.use(
  openapi({
    path: "/docs",
    documentation: {
      info: {
        title: "Agent Sorra Documentation",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    references: fromTypes(
      process.env.NODE_ENV === "production"
        ? "dist/index.d.ts"
        : "src/index.ts",
    ),
  }),
);

app.use(healthController);

app.listen(9000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
