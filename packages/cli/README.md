# @shipskip/cli

CLI package for `shipskip`. It runs frontend tasks by copying a template into a temporary workspace, giving an AI agent scoped tools, and preserving the generated workspace plus logs as session artifacts.

## Command

```bash
shipskip run \
  --task <task-name> \
  --model <provider>/<model>[#reasoning]
```

From the repository root during development:

```bash
bun dev:cli run -t next-app/saas-landing-page -m openrouter/qwen/qwen3-coder:free
bun dev:cli run -t next-app/software-engineer-portfolio -m openrouter/deepseek/deepseek-v4-flash#low
bun dev:cli run -t next-app/software-engineer-portfolio -m google/gemini-3.1-flash-lite#low
bun dev:cli run -t next-app/software-engineer-portfolio -m openrouter/openai/gpt-oss-120b:free
bun dev:cli run -t next-app/software-engineer-portfolio -m perplexity/sonar-pro
bun dev:cli run -t next-app/software-engineer-portfolio -m openrouter/google/gemini-3.1-flash-lite-preview#minimal
```

## Options

- `-t, --task <string>` - task name from `@shipskip/tasks`, such as `next-app/saas-landing-page`.
- `-m, --model <string>` - model profile in `<provider>/<model>[#reasoning]` format.

Supported providers are `openai`, `google`, `openrouter`, and `perplexity`.

## Model Profiles

Examples:

```text
openai/gpt-5.5
openai/gpt-5.5#high
google/gemini-3-pro#medium
openrouter/meta-llama/llama-3.1-8b-instruct:free#high
perplexity/sonar-pro
perplexity/sonar-reasoning-pro
```

Reasoning support depends on the provider:

- OpenAI: `minimal`, `low`, `medium`, `high`.
- Google: `minimal`, `low`, `medium`, `high`.
- OpenRouter: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, or a positive token count.
- Perplexity: choose a reasoning model such as `sonar-reasoning` or `sonar-reasoning-pro`.

## Environment Variables

Provider API keys are read by their AI SDK providers. Set the key for the provider you use, such as:

- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `PERPLEXITY_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GOOGLE_API_KEY`

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
