# Evals

Two layers of checks keep the skills honest.

## 1. Deterministic: `npm test`

`tools/appdimens-kit/test/` runs the lint rules against one fixture project per platform, plus the scale-factor math (checked against the numbers published in the AppDimens docs) and the Claude Code hook contract. CI and contributors run it on every change.

## 2. Agent behaviour: `intent-cases.json`

Each case has a mode (`read` design → code, `create` brief → design, `edit` code → code), a project config, an input, and the decisions a correct agent must make (`expect`), including what it must **not** do.

How to run a case with any agent (Claude Code, Codex, Cursor…):

1. Install the kit in an empty project (`node scripts/install.mjs --target <agent> <dir>`) and write the case's `config` to `<dir>/appdimens.config.json`.
2. Give the agent the case `input` as the prompt ("Implement this…", "Migrate this…", "Design…").
3. Score the intent sheet and code against `expect`: 1 point per expected decision, −1 per `must_not` hit. Run `appdimens-kit lint` on the output (0 errors expected).

Keep a small table of results per agent and skill version. A drop on a case after editing a skill means the edit made the model worse at that decision.

Add a case whenever an agent gets something wrong in real use: the input that fooled it, and the decision it should have made.
