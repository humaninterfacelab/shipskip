# @shipskip/cli

CLI package for `shipskip`. It runs frontend tasks by copying a template into a temporary workspace, giving an AI agent scoped tools, and preserving the generated workspace plus logs as session artifacts.

## Command

```bash
shipskip run \
  --task <task-name> \
  --model <openrouter-model-id>
```

From the repository root during development:

```bash
bun dev:cli run -t next-app/saas-landing-page -m qwen/qwen3-coder:free
bun dev:cli run -t next-app/saas-landing-page -m google/gemini-3.1-flash-lite

bun dev:cli run -t next-app/software-engineer-portfolio -m deepseek/deepseek-v4-flash
```

## Options

- `-t, --task <string>` - task name from `@shipskip/tasks`, such as `next-app/saas-landing-page`.
- `-m, --model <string>` - exact OpenRouter model id, passed directly to `@openrouter/ai-sdk-provider`.

ShipSkip does not parse, normalize, or add reasoning options to model ids. Use the model id exactly as OpenRouter publishes it.

## Models

Examples:

```text
qwen/qwen3-coder:free
openai/gpt-oss-120b:free
google/gemini-3.1-flash-lite-preview
```

## Environment Variables

Provider API keys are read by the OpenRouter AI SDK provider. Set:

- `OPENROUTER_API_KEY`

Session paths can be controlled with:

- `SHIPSKIP_SESSION_DIR` - fixed session directory instead of `<tmp>/shipskip/<timestamp>`.

Each run writes the copied app to `<session-dir>/app`, logs to `<session-dir>/logs.ndjson`, and build artifacts to the paths produced by the selected template build script.

## Tooling Boundaries

Agent tools are scoped to the copied workspace. The command tool allows only package-manager commands through `npm`, `yarn`, `pnpm`, or `bun`, and rejects shell syntax such as pipes, redirects, command chaining, `cd`, background jobs, command substitution, and environment assignments.

## Development

```bash
bun install
bun --filter '@shipskip/cli' dev
```

## Checks

```bash
bun --filter '@shipskip/cli' lint
bun --filter '@shipskip/cli' typecheck
bun --filter '@shipskip/cli' test
bun --filter '@shipskip/cli' build
```
