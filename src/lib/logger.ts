import pino from "pino";
import pretty from "pino-pretty";
import { createStream } from "rotating-file-stream";
import { env, isProduction, isTest } from "@/config/env";

/**
 * Central structured logger (Pino).
 * - development → human-readable console (pino-pretty) **and** a rotated JSON
 *   file (multistream).
 * - production  → rotated single-line JSON file only.
 * - test        → silent (keeps test output clean; no file is created).
 *
 * Rotation uses `rotating-file-stream` as a plain stream — no worker thread —
 * so it stays safe under Bun and `bun build --compile`, like the pino-pretty
 * stream. Files rotate daily (`LOG_ROTATE_INTERVAL`) or when they pass
 * `LOG_ROTATE_SIZE` (whichever first); `LOG_MAX_FILES` rotated files are kept,
 * gzipped when `LOG_COMPRESS`. Call `closeLogger()` on shutdown so buffered
 * file writes flush before the process exits.
 *
 * Use `logger` for app-wide events and `createLogger({...})` /
 * `logger.child({...})` to bind context (e.g. a requestId). Never use `console.*`
 * (the one exception is config/env.ts, which runs before the logger exists).
 */
const options = {
  level: isTest ? "silent" : env.LOG_LEVEL,
  // Safeguard against accidentally logging secrets.
  redact: [
    "req.headers.authorization",
    "headers.authorization",
    "password",
    "*.password",
    "accessToken",
    "*.accessToken",
    "refreshToken",
    "*.refreshToken",
  ],
};

// Rotated filename: rfs calls the generator with time=null for the active
// (un-rotated) file, and with a Date + index for each rotated file.
const pad = (n: number) => String(n).padStart(2, "0");
const rotatedName = (time: number | Date | null, index?: number) => {
  if (!time) return env.LOG_FILE;
  const d = time instanceof Date ? time : new Date(time);
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const base = env.LOG_FILE.replace(/\.log$/, "");
  return `${base}-${date}-${index}.log`;
};

// File destination, shared by prod (file only) and dev (console + file). Kept
// at module scope so closeLogger() can flush it on shutdown. Null in tests.
const fileStream = isTest
  ? null
  : createStream(rotatedName, {
      path: env.LOG_DIR,
      size: env.LOG_ROTATE_SIZE,
      interval: env.LOG_ROTATE_INTERVAL,
      maxFiles: env.LOG_MAX_FILES,
      compress: env.LOG_COMPRESS ? "gzip" : false,
    });

export const logger = isTest
  ? // Silent in tests (level=silent); cheap sync stdout destination, no file.
    pino(options, pino.destination({ sync: true }))
  : isProduction
    ? // Production: rotated JSON file only (fileStream is non-null when !isTest).
      pino(options, fileStream as NodeJS.WritableStream)
    : // Development: pretty console + rotated JSON file.
      pino(
        options,
        pino.multistream([
          { stream: pretty({ colorize: true, translateTime: "SYS:HH:MM:ss" }) },
          { stream: fileStream as NodeJS.WritableStream },
        ]),
      );

export const createLogger = (bindings: Record<string, unknown>) =>
  logger.child(bindings);

/**
 * Flush and close the rotated log file. Call from graceful shutdown before
 * `process.exit` so buffered file writes aren't lost on SIGTERM. No-op in tests.
 */
export const closeLogger = (): Promise<void> =>
  new Promise((resolve) => {
    if (!fileStream) return resolve();
    fileStream.end(() => resolve());
  });
