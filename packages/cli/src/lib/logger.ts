import path from "node:path";

import pino from "pino";
import pretty from "pino-pretty";

import { getSessionDir } from "./session";

let logger: pino.Logger | undefined;

export function getLogger() {
  if (logger) return logger;

  const level = "trace";

  const fileStream = pino.destination({
    dest: path.join(getSessionDir(), "logs.ndjson"),
    mkdir: true,
    sync: false,
  });

  logger = pino(
    {
      level,
    },
    pino.multistream([
      { level, stream: fileStream },
      {
        level,
        stream: pretty({
          colorize: true,
          destination: process.stderr,
          ignore: "pid,hostname",
          singleLine: true,
          translateTime: "HH:MM:ss",
        }),
      },
    ]),
  );

  return logger;
}
