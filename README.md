# shipskip

`shipskip` is a Bun workspace for running AI-assisted frontend tasks against disposable template workspaces.

The CLI copies a template into a temporary session directory, gives an agent a task prompt plus implementation instructions, and keeps the generated workspace and logs as artifacts for review.

## Repository Layout

- `packages/cli` - Bun CLI that runs tasks through the AI SDK `ToolLoopAgent`.
- `packages/tasks` - packaged task registry, prompts, and templates used by the CLI.
- `apps/web` - Next.js web app.
- `.github/workflows` - CI checks plus artifact submission and publishing flows.
- `submissions.jsonl` - append-only submission queue; publish by labeling a submission PR.

## Requirements

- Bun
- Git
- `OPENROUTER_API_KEY` for the model you run

## Setup

To install dependencies:

```bash
bun install
```

## Local Usage

Run the sample SaaS landing page task against the Next.js template:

```bash
bun run dev:cli -- run \
  --task next-app/saas-landing-page \
  --model qwen/qwen3-coder:free
```

The command writes the generated app to the session directory. By default sessions are created under `<tmp>/shipskip/<timestamp>`, or you can set `SHIPSKIP_SESSION_DIR` to choose a fixed location.

For CLI options, OpenRouter model ids, and session environment variables, see [`packages/cli/README.md`](packages/cli/README.md).

## Submissions

Run `Submit shipskip artifact` from a non-default branch or fork. The workflow accepts JSON arrays for `tasks` and `models`, runs every task/model combination, uploads each generated artifact, appends one UUID-backed record per submission to `submissions.jsonl`, and pushes the records to the source branch.

Open a PR containing the new `submissions.jsonl` lines. Adding the `publish` label to the PR triggers `Publish shipskip artifact`, which validates each referenced workflow run, downloads each artifact, deploys each static build, stores each manifest, log, and app archive in R2, and comments the Pages and R2 URLs on the PR.

## Development Checks

To format-check, lint, typecheck, and build all workspace packages:

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
