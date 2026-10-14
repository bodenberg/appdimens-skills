# Evals

Two layers of checks keep the skills honest.

## 1. Deterministic: `npm test`

`tools/appdimens-kit/test/` runs the lint rules against one fixture project per platform, plus the scale-factor math (checked against the numbers published in the AppDimens docs) and the Claude Code hook contract. CI and contributors run it on every change.

## 2. Agent behaviour: `intent-cases.json` + `score.mjs`

Each case has a mode (`read`, `claude-design`, `edit`, `create`), a project config, an input, the decisions a correct agent must make (`expect`, prose) and a machine-checkable `assert` block:

- `must_match`: regexes that must appear in the agent's output (tokens such as `11\.5\.asdp`, APIs such as `minimumInteractiveComponentSize`);
- `must_not_match`: regexes that reveal a wrong decision (the as-is value `16\.asdp`, `Positioned`, a Px token in markup);
- `must_ask`: whether the agent should stop with a question before converting (the base-screen rule).

Run a case with any agent in a scratch project, then score it:

```bash
node scripts/install.mjs --target codex /tmp/case && echo '<case config>' > /tmp/case/appdimens.config.json
claude -p "<case input>" --output-format text > out.txt        # or: codex exec "<case input>" > out.txt
node evals/score.mjs <case-id> out.txt [--asked yes|no]       # exit 0 only on a perfect score
```

Keep a results table per agent and skill version; a drop on a case after editing a skill means the edit made the model worse at that decision. Add a case whenever an agent gets something wrong in real use.
