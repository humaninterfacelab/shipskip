# @shipskip/cli

CLI package for `shipskip`. It runs frontend tasks by copying a template into a temporary workspace, giving an AI agent scoped tools, and preserving the generated workspace plus logs as session artifacts.

## Command

```bash
shipskip run \
  --instructions <file> \
  --prompt <file> \
  --template <dir> \
  --model <provider>/<model>[#reasoning]
```

From the repository root during development:

```bash
bun run dev:cli -- run \
  --instructions tasks/saas-landing-page/nextjs/instructions.md \
  --prompt tasks/saas-landing-page/nextjs/prompt.md \
  --template templates/nextjs \
  --model openai/gpt-5.5#high
```

## Options

- `-i, --instructions <file>` - task instruction file used as the agent system instructions.
- `-p, --prompt <file>` - task prompt file used as the run prompt.
- `-w, --template <dir>` - template directory copied into the session workspace.
- `-m, --model <string>` - model profile in `<provider>/<model>[#reasoning]` format.

Supported providers are `openai`, `google`, and `openrouter`.

## Model Profiles

Examples:

```text
openai/gpt-5.5
openai/gpt-5.5#high
google/gemini-3-pro#medium
openrouter/meta-llama/llama-3.1-8b-instruct:free#high
```

Reasoning support depends on the provider:

- OpenAI: `minimal`, `low`, `medium`, `high`.
- Google: `minimal`, `low`, `medium`, `high`.
- OpenRouter: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, or a positive token count.

## Environment Variables

Provider API keys are read by their AI SDK providers. Set the key for the provider you use, such as:

- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GOOGLE_API_KEY`

Session paths can be controlled with:

- `SHIPSKIP_SESSION_ID` - fixed session ID instead of a generated UUID.
- `SHIPSKIP_SESSION_PATH` - fixed session directory instead of `<tmp>/.shipskip/<session-id>`.

At the end of every run, the CLI prints `SHIPSKIP_SESSION=...` with `id`, `path`, `workspacePath`, and `logPath`.

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
