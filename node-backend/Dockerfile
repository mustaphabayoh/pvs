FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
# Use npm install in the image to avoid strict lockfile failures during CI builds
RUN npm install --no-audit --no-fund
COPY . .

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /app/package*.json ./
# Install runtime deps (omit dev) in the runtime image
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/src ./src
COPY --from=build /app/config ./config
COPY --from=build /app/migrations ./migrations
EXPOSE 4000
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
