const userSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "Google account subject ID" },
    email: { type: "string" },
    name: { type: "string" },
    avatarUrl: { type: "string", nullable: true },
    homeAddress: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const tripSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    userId: { type: "string" },
    name: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    events: { type: "array", items: { $ref: "#/components/schemas/Event" } },
  },
};

const eventSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "wizards-abc123" },
    game: { type: "string", enum: ["mtg", "fab"] },
    eventType: {
      type: "string",
      enum: ["prerelease", "rcq", "store_championship", "skirmish", "pro_quest"],
    },
    title: { type: "string" },
    storeName: { type: "string" },
    address: { type: "string" },
    country: { type: "string", nullable: true },
    lat: { type: "number", nullable: true },
    lng: { type: "number", nullable: true },
    startTime: { type: "string", format: "date-time" },
    timezone: { type: "string", nullable: true },
    distanceKm: { type: "number", nullable: true, description: "Distance from ORIGIN_QUERY in kilometers" },
    priceAmount: { type: "number", nullable: true },
    priceCurrency: { type: "string", nullable: true },
    format: { type: "string", nullable: true },
    sourceUrl: { type: "string", nullable: true },
    lastSyncedAt: { type: "string", format: "date-time" },
  },
};

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "TCG Calendar App API",
    version: "0.1.0",
    description: "Aggregated Magic: The Gathering and Flesh and Blood store event listings.",
  },
  paths: {
    "/api/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is up",
            content: {
              "application/json": {
                schema: { type: "object", properties: { status: { type: "string" } } },
              },
            },
          },
        },
      },
    },
    "/api/meta": {
      get: {
        summary: "Search configuration (origin location and search radius)",
        responses: {
          "200": {
            description: "Metadata describing the configured search corridor",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    originQuery: { type: "string", example: "Timisoara, Romania" },
                    radiusKm: { type: "number", description: "Same radius applied to both MTG and FAB sources" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/geocode": {
      get: {
        summary: "Address search suggestions (proxies OpenStreetMap Nominatim)",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Up to 5 suggestions, empty array if q is under 3 characters",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { type: "object", properties: { label: { type: "string" } } },
                },
              },
            },
          },
        },
      },
    },
    "/api/events": {
      get: {
        summary: "List events",
        parameters: [
          {
            name: "game",
            in: "query",
            description: "Comma-separated game codes to filter by (e.g. mtg,fab)",
            schema: { type: "string" },
          },
          {
            name: "type",
            in: "query",
            description: "Comma-separated event types to filter by",
            schema: { type: "string" },
          },
          {
            name: "from",
            in: "query",
            description: "ISO 8601 date; only events starting on/after this time",
            schema: { type: "string", format: "date-time" },
          },
          {
            name: "to",
            in: "query",
            description: "ISO 8601 date; only events starting on/before this time",
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: {
          "200": {
            description: "Matching events, ordered by start time ascending",
            content: {
              "application/json": {
                schema: { type: "array", items: eventSchema },
              },
            },
          },
        },
      },
    },
    "/api/events/{id}": {
      get: {
        summary: "Get a single event",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "The event",
            content: { "application/json": { schema: eventSchema } },
          },
          "404": {
            description: "Event not found",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } } },
              },
            },
          },
        },
      },
    },
    "/api/sync": {
      post: {
        summary: "Trigger a manual sync of upstream sources",
        security: [{ syncToken: [] }],
        responses: {
          "200": { description: "Sync result" },
          "401": { description: "Missing or invalid x-sync-token header" },
          "500": { description: "Sync failed" },
        },
      },
    },
    "/api/auth/google": {
      post: {
        summary: "Exchange a Google ID token for an app session token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["idToken"], properties: { idToken: { type: "string" } } },
            },
          },
        },
        responses: {
          "200": {
            description: "Signed in",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { token: { type: "string" }, user: userSchema },
                },
              },
            },
          },
          "401": { description: "Invalid Google ID token" },
        },
      },
    },
    "/api/me": {
      get: {
        summary: "Get the current user's profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "The profile", content: { "application/json": { schema: userSchema } } },
          "401": { description: "Missing or invalid session token" },
        },
      },
      put: {
        summary: "Update the current user's profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string" }, homeAddress: { type: "string", nullable: true } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated profile", content: { "application/json": { schema: userSchema } } },
          "401": { description: "Missing or invalid session token" },
        },
      },
    },
    "/api/me/notification-preferences": {
      get: {
        summary: "Get the current user's subscribed notification event types",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Subscribed event types",
            content: {
              "application/json": {
                schema: { type: "object", properties: { eventTypes: { type: "array", items: { type: "string" } } } },
              },
            },
          },
        },
      },
      put: {
        summary: "Replace the current user's subscribed notification event types",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { eventTypes: { type: "array", items: { type: "string" } } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated subscribed event types",
            content: {
              "application/json": {
                schema: { type: "object", properties: { eventTypes: { type: "array", items: { type: "string" } } } },
              },
            },
          },
        },
      },
    },
    "/api/me/push-token": {
      post: {
        summary: "Register an Expo push token for the current device",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["token"], properties: { token: { type: "string" } } },
            },
          },
        },
        responses: { "204": { description: "Registered" }, "400": { description: "Missing token" } },
      },
      delete: {
        summary: "Remove a push token (e.g. on sign out)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["token"], properties: { token: { type: "string" } } },
            },
          },
        },
        responses: { "204": { description: "Removed" }, "400": { description: "Missing token" } },
      },
    },
    "/api/trips": {
      get: {
        summary: "List the current user's trips, each with its events",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Trips",
            content: { "application/json": { schema: { type: "array", items: tripSchema } } },
          },
        },
      },
      post: {
        summary: "Create a trip",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } },
          },
        },
        responses: { "201": { description: "Created trip", content: { "application/json": { schema: tripSchema } } } },
      },
    },
    "/api/trips/{id}": {
      patch: {
        summary: "Rename a trip",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Renamed trip" }, "404": { description: "Trip not found" } },
      },
      delete: {
        summary: "Delete a trip",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" }, "404": { description: "Trip not found" } },
      },
    },
    "/api/trips/{id}/events": {
      post: {
        summary: "Add an event to a trip",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["eventId"], properties: { eventId: { type: "string" } } },
            },
          },
        },
        responses: { "201": { description: "Added" }, "404": { description: "Trip or event not found" } },
      },
    },
    "/api/trips/{id}/events/{eventId}": {
      delete: {
        summary: "Remove an event from a trip",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "eventId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "204": { description: "Removed" }, "404": { description: "Trip not found" } },
      },
    },
  },
  components: {
    schemas: {
      Event: eventSchema,
    },
    securitySchemes: {
      syncToken: {
        type: "apiKey",
        in: "header",
        name: "x-sync-token",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};
