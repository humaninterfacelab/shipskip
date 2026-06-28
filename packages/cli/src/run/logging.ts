import type {
  AgentSession,
  AgentSessionEvent,
} from "@earendil-works/pi-coding-agent";
import { consola } from "consola";

function safeStringify(obj: unknown, maxLength = 500) {
  const str = JSON.stringify(obj);

  return str.length > maxLength
    ? `${str.slice(0, maxLength)}... (${str.length} chars)`
    : str;
}

export function attachSessionLogging(session: AgentSession) {
  let isStreamingText = false;

  const ensureNewline = () => {
    if (isStreamingText) {
      process.stdout.write("\n");
      isStreamingText = false;
    }
  };

  session.subscribe((event: AgentSessionEvent) => {
    switch (event.type) {
      case "agent_start":
        ensureNewline();
        consola.start("Agent started");
        break;

      case "agent_end":
        ensureNewline();
        consola.success("Agent finished");
        break;

      case "compaction_start":
        ensureNewline();
        consola.start("Compaction started");
        break;

      case "compaction_end":
        ensureNewline();
        consola.success("Compaction finished");
        break;

      case "tool_execution_start":
        ensureNewline();
        consola.info(
          `Running tool: ${event.toolName}`,
          safeStringify(event.args),
        );

        break;

      case "tool_execution_end":
        ensureNewline();

        if (event.isError) {
          consola.warn(`Tool failed: ${event.toolName}`);
        } else {
          consola.success(`Tool finished: ${event.toolName}`);
        }

        break;

      case "auto_retry_start":
        ensureNewline();
        consola.warn(
          `Retrying (attempt ${event.attempt}/${event.maxAttempts}, delay ${event.delayMs}ms): ${event.errorMessage}`,
        );
        break;

      case "auto_retry_end":
        ensureNewline();
        if (!event.success) {
          consola.error(`Retries exhausted: ${event.finalError ?? "unknown error"}`);
        }
        break;

      case "message_update":
        if (event.assistantMessageEvent.type === "text_delta") {
          isStreamingText = true;
          process.stdout.write(event.assistantMessageEvent.delta);
        }
        break;

      default:
        break;
    }
  });
}
