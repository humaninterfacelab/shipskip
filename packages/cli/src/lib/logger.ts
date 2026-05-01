import pino from "pino";

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
        destination: "./logs/app.log",
        mkdir: true,
        append: false,
      },
    },
  ],
});

export const logger = pino(
  {
    level: "debug",
  },
  transport,
);
