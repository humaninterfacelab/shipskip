import pino from "pino";

export function createLogger(logPath: string) {
  const transport = pino.transport({
    targets: [
      {
        target: "pino-pretty",
        level: "debug",
        options: {
          destination: 2,
          colorize: true,
          translateTime: "SYS:standard",
        },
      },
      {
        target: "pino/file",
        level: "debug",
        options: {
          destination: logPath,
          mkdir: true,
          append: false,
        },
      },
    ],
  });

  return pino(
    {
      level: "debug",
    },
    transport,
  );
}
