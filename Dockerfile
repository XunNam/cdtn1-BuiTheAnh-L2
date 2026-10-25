FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY src/backend/package*.json ./src/backend/
RUN npm ci --prefix src/backend
COPY src/frontend/package*.json ./src/frontend/
RUN npm ci --prefix src/frontend
COPY src/backend ./src/backend
COPY src/frontend ./src/frontend
COPY scripts ./scripts
COPY package.json ./
RUN npm --prefix src/backend run build && npm --prefix src/frontend run build

FROM build AS verify
RUN cd src/frontend && npx playwright install --with-deps chromium
CMD ["node", "scripts/test-all.mjs"]

FROM node:24-bookworm-slim AS backend
WORKDIR /app
ENV NODE_ENV=production
COPY src/backend/package*.json ./
RUN npm ci --omit=dev && mkdir .private && chown node:node .private
COPY --from=build /app/src/backend/dist ./dist
COPY --from=build /app/src/backend/migrations ./migrations
COPY --from=build /app/src/backend/config ./config
USER node
EXPOSE 3001
CMD ["node", "dist/compose-start.js"]

FROM node:24-bookworm-slim AS frontend
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/src/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/src/frontend/.next/static ./.next/static
COPY --from=build --chown=node:node /app/src/frontend/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
