import path from "node:path";

import pino from "pino";

import { getSessionDir } from "./session";

let logger: pino.Logger | undefined;

export function getLogger() {
  if (logger) return logger;

  const level = "trace";

  logger = pino(
    {
      base: undefined,
      level,
    },
    pino.destination({
      dest: path.join(getSessionDir(), "logs.ndjson"),
      mkdir: true,
      sync: false,
    }),
  );

  return logger;
}
