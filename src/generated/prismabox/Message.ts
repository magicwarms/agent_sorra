import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const MessagePlain = t.Object(
  {
    id: t.String(),
    threadId: t.Integer(),
    content: t.String(),
    role: t.Union([t.Literal("USER"), t.Literal("ASSISTANT")], {
      additionalProperties: false,
    }),
    createdAt: t.Date(),
  },
  { additionalProperties: false },
);

export const MessageRelations = t.Object(
  {
    thread: t.Object(
      {
        id: t.Integer(),
        title: t.String(),
        userId: t.Integer(),
        createdAt: t.Date(),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const MessagePlainInputCreate = t.Object(
  {
    content: t.String(),
    role: t.Union([t.Literal("USER"), t.Literal("ASSISTANT")], {
      additionalProperties: false,
    }),
  },
  { additionalProperties: false },
);

export const MessagePlainInputUpdate = t.Object(
  {
    content: t.Optional(t.String()),
    role: t.Optional(
      t.Union([t.Literal("USER"), t.Literal("ASSISTANT")], {
        additionalProperties: false,
      }),
    ),
  },
  { additionalProperties: false },
);

export const MessageRelationsInputCreate = t.Object(
  {
    thread: t.Object(
      {
        connect: t.Object(
          {
            id: t.Integer({ additionalProperties: false }),
          },
          { additionalProperties: false },
        ),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const MessageRelationsInputUpdate = t.Partial(
  t.Object(
    {
      thread: t.Object(
        {
          connect: t.Object(
            {
              id: t.Integer({ additionalProperties: false }),
            },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
);

export const MessageWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          threadId: t.Integer(),
          content: t.String(),
          role: t.Union([t.Literal("USER"), t.Literal("ASSISTANT")], {
            additionalProperties: false,
          }),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "Message" },
  ),
);

export const MessageWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object({ id: t.String() }, { additionalProperties: false }),
          { additionalProperties: false },
        ),
        t.Union([t.Object({ id: t.String() })], {
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
              threadId: t.Integer(),
              content: t.String(),
              role: t.Union([t.Literal("USER"), t.Literal("ASSISTANT")], {
                additionalProperties: false,
              }),
              createdAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Message" },
);

export const MessageSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      threadId: t.Boolean(),
      content: t.Boolean(),
      role: t.Boolean(),
      createdAt: t.Boolean(),
      thread: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const MessageInclude = t.Partial(
  t.Object(
    { role: t.Boolean(), thread: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const MessageOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      threadId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      content: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const Message = t.Composite([MessagePlain, MessageRelations], {
  additionalProperties: false,
});

export const MessageInputCreate = t.Composite(
  [MessagePlainInputCreate, MessageRelationsInputCreate],
  { additionalProperties: false },
);

export const MessageInputUpdate = t.Composite(
  [MessagePlainInputUpdate, MessageRelationsInputUpdate],
  { additionalProperties: false },
);
