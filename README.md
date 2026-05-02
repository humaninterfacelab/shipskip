# shipskip

`shipskip` is a Bun workspace for running AI-assisted frontend tasks against disposable template workspaces.

The CLI copies a template into a temporary session directory, gives an agent a task prompt plus implementation instructions, and keeps the generated workspace and logs as artifacts for review.

## Repository Layout

- `packages/cli` - Bun CLI that runs tasks through the AI SDK `ToolLoopAgent`.
- `templates` - starter projects copied into each agent session.
- `tasks` - task definitions, prompts, and build scripts.
- `docs` - project workflow and architecture documentation.
- `.github/workflows` - CI checks plus artifact submission and publishing flows.

## Requirements

- Bun
- Git
- Provider API key for the model you run, such as `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, or `GOOGLE_API_KEY`

## Setup

To install dependencies:

```bash
bun install
```

## Local Usage

Run the sample SaaS landing page task against the Next.js template:

```bash
bun run dev:cli -- run \
  --instructions tasks/saas-landing-page/nextjs/instructions.md \
  --prompt tasks/saas-landing-page/nextjs/prompt.md \
  --template templates/nextjs \
  --model openai/gpt-5.5#high
```

The command prints a `SHIPSKIP_SESSION=...` JSON object at the end with the generated workspace and session log paths.

For CLI options, model profile syntax, and session environment variables, see [`packages/cli/README.md`](packages/cli/README.md).

## Development Checks

To lint, typecheck, test, and build all workspace packages:

```bash
bun run check
```

Individual commands are also available:

```bash
bun run lint
bun run typecheck
bun run test
bun run coverage
bun run build
```
