import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const RateLimitPlain = t.Object(
  {
    id: t.String(),
    key: t.String(),
    count: t.Integer(),
    lastRequest: t.Integer(),
  },
  { additionalProperties: false },
);

export const RateLimitRelations = t.Object({}, { additionalProperties: false });

export const RateLimitPlainInputCreate = t.Object(
  { key: t.String(), count: t.Integer(), lastRequest: t.Integer() },
  { additionalProperties: false },
);

export const RateLimitPlainInputUpdate = t.Object(
  {
    key: t.Optional(t.String()),
    count: t.Optional(t.Integer()),
    lastRequest: t.Optional(t.Integer()),
  },
  { additionalProperties: false },
);

export const RateLimitRelationsInputCreate = t.Object(
  {},
  { additionalProperties: false },
);

export const RateLimitRelationsInputUpdate = t.Partial(
  t.Object({}, { additionalProperties: false }),
);

export const RateLimitWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          key: t.String(),
          count: t.Integer(),
          lastRequest: t.Integer(),
        },
        { additionalProperties: false },
      ),
    { $id: "RateLimit" },
  ),
);

export const RateLimitWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            { id: t.String(), key: t.String() },
            { additionalProperties: false },
          ),
          { additionalProperties: false },
        ),
        t.Union([t.Object({ id: t.String() }), t.Object({ key: t.String() })], {
          additionalProperties: false,
        }),
        t.Partial(
          t.Object({
            AND: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            NOT: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            OR: t.Array(Self, { additionalProperties: false }),
          }),
          { additionalProperties: false },
        ),
        t.Partial(
          t.Object(
            {
              id: t.String(),
              key: t.String(),
              count: t.Integer(),
              lastRequest: t.Integer(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "RateLimit" },
);

export const RateLimitSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      key: t.Boolean(),
      count: t.Boolean(),
      lastRequest: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const RateLimitInclude = t.Partial(
  t.Object({ _count: t.Boolean() }, { additionalProperties: false }),
);

export const RateLimitOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      key: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      count: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      lastRequest: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const RateLimit = t.Composite([RateLimitPlain, RateLimitRelations], {
  additionalProperties: false,
});

export const RateLimitInputCreate = t.Composite(
  [RateLimitPlainInputCreate, RateLimitRelationsInputCreate],
  { additionalProperties: false },
);

export const RateLimitInputUpdate = t.Composite(
  [RateLimitPlainInputUpdate, RateLimitRelationsInputUpdate],
  { additionalProperties: false },
);
