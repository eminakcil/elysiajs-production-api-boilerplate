# --- Build stage: compile to a standalone binary ---
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
# Compile both entrypoints: the API server and the background worker.
RUN bun build --compile --minify --target bun --outfile server src/index.ts \
 && bun build --compile --minify --target bun --outfile worker src/worker.ts

# --- Runtime stage: minimal image with just the binaries ---
FROM gcr.io/distroless/base-debian12
WORKDIR /app

COPY --from=build /app/server /app/server
COPY --from=build /app/worker /app/worker

ENV NODE_ENV=production
EXPOSE 3000

# API by default; the worker service overrides this with ["./worker"].
CMD ["./server"]
