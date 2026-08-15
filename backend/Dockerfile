FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
EXPOSE 4000
# Migrations run on startup by default (see RUN_MIGRATIONS_ON_STARTUP in
# src/config.ts). To run them as a separate step instead — e.g. a K8s Job or
# init container ahead of a multi-replica rollout — run `node dist/db/migrate.js`
# there and set RUN_MIGRATIONS_ON_STARTUP=false on the deployment.
CMD ["node", "dist/index.js"]
