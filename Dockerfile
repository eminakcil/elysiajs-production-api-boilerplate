# --- Build stage: compile to a standalone binary ---
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
RUN bun build --compile --minify --target bun --outfile server src/index.ts

# --- Runtime stage: minimal image with just the binary ---
FROM gcr.io/distroless/base-debian12
WORKDIR /app

COPY --from=build /app/server /app/server

ENV NODE_ENV=production
EXPOSE 3000

CMD ["./server"]
