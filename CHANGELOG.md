# Changelog

## 0.1.1

- **Schema validation of the project contract.** `appdimens.config.json` is validated against `schemas/appdimens.config.schema.json`. It used to be only parsed with `JSON.parse`. The validator ships with the kit, has no dependencies, and fails on any schema keyword it does not implement. It also checks that each target's platform and library belong together (a `web` target cannot declare `appdimens-ios`).
- **An invalid contract stops processing.** `lint`, `detect`, `normalize` (unless `--syntax` is passed) and the Claude Code hook exit 2 and list each failing field. An invalid config is never used. Before, invalid JSON in a parent folder's config was silently ignored, and the hook dropped config errors unless line 1 had been edited.
- **New command `validate`.** It checks `appdimens.config.json`, or layout-intent sheets with `--intent` against `schemas/layout-intent.schema.json`. The hook also validates the config whenever an edit changes it. The installer validates the config it generates.

## 0.1.0

First public release.

- **Skills**: core `layout-intent` (base screen profile, layout-intent model, decision table, platform router), 4 workflows (Figma / screenshots / specs, Claude Design, existing screens, new screens) and 9 platform skills covering every AppDimens library: appdimens-dynamic, appdimens-sdps + appdimens-ssps, appdimens-kmp, appdimens-ios, appdimens-flutter, appdimens-react-native, webdimens, appdimens-net-binding and appdimens-games.
- **Installer** (`npx appdimens-skills`): detects the agentic clients and IDEs on the machine (Claude Code, OpenAI Codex, Gemini CLI, OpenClaw, Hermes Agent, Cursor, GitHub Copilot, Windsurf) and the platforms of the project; interactive selection of agents, optional skills, scope (project / user), the Claude Code hook and the project contract; non-interactive flags; manifest-based `uninstall`.
- **Kit CLI** (`appdimens-kit` / `npx appdimens-skills kit`): `detect`, `devices`, `normalize` (every strategy, axis, density, aspect suffix, exact text, XML buckets, theme tokens, platform syntax), `compare` (existing tablet overrides) and `lint`; Claude Code PostToolUse hook that checks only the lines each edit wrote.
- **Quality**: unit tests, 18 golden eval cases with a scorer, a visual eval with blind agents, and `verify-upstream` (117 claims checked against the library sources).
