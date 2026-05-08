import { fileURLToPath } from "node:url";

import { createMCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export async function createWebSearchTools() {
  const webSearchMcpClient = await createMCPClient({
    transport: new StdioClientTransport({
      command: process.execPath,
      args: [
        fileURLToPath(import.meta.resolve("open-websearch/build/index.js")),
      ],
      env: {
        MODE: "stdio",
      },
    }),
  });

  return {
    tools: await webSearchMcpClient.tools(),
    close: () => webSearchMcpClient.close(),
  };
}
