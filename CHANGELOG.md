# Changelog

## 0.3.1

- **Qt and games: family token calls.** `appdimens-qt` uses the token applied to a value — QML `AppDimens.sdp(16)` (reactive), C++ `ad->sdp(16)`, `AppDimens::sdp(16)`, `16_sdp`; the factor form `16 * AppDimens.sdp` is gone. `appdimens-games`: C# `64f.ASdp()` (AppDimens.Net casing), every token in GDScript (`AppDimens.asdp(64)`), C++ `appdimens::asdp(64)` / `64_asdp`, Unreal `ASdp`/`FTSdp` nodes. The Qt and games skills, adapters and `plugin/` follow; two new upstream claims (151 in total).
- **Games layout:** paths follow the per-platform repository (`android/`, `native/`, `engines/{unity,unreal,godot}`, `dotnet/`).

## 0.3.0

- **Roku:** new `appdimens-roku` skill (BrightScript / SceneGraph: coordinate space from `ui_resolutions`, reference / tv modes, `ad.sdp`, `ad.fontSize`, `ad.safeRect`, custom strategies); `detect` recognises Roku channels (`manifest` with `major_version=` / `ui_resolutions=`); schema target `roku` / library `appdimens-roku`; Cursor/Copilot/Windsurf glob `*.brs`.
- **Custom strategies on the new ports:** Python (`appdimens.custom`), C/C++ (`appdimens_custom.h` in GTK, Qt, LVGL, native games and Unreal) and Roku (`AppDimensCustom.brs`) in `appdimens-custom-strategies` and each platform skill.
- **Platform router:** rows for Qt, GTK, LVGL, Roku, Python/Blender and the Unity/Unreal/Godot evidence files.
- **Claude plugin directory:** `plugin/` (built by `scripts/build-plugin.mjs`, checked in CI) is the folder to submit — manifest, icon, skills, README and LICENSE only, no hooks or executables. The npm CLI moved from `bin/` to `cli/` (claude.ai does not install plugins with a `bin/` directory), no file carries an executable bit, and the changelog no longer names a bundled image path.

## Custom strategies (shipped in 0.3.0)

- **New skill `appdimens-custom-strategies`** (workflow group, installed with `--skills detected`): one place for custom strategies on every platform — which form to pick (typed one-liner, text formula, full config, shared JSON), the shared text language and JSON essentials, a per-platform syntax table verified against each library's source (Android/KMP/Games Kotlin, Unity C#, .NET, Swift, Flutter, Web, React Native), the rules (declare once, purity, fast path, value bounds ≥ 0, strict atomic JSON) and kit verification (`custom check`, `custom explain --formula`, `normalize --formula`). References: `references/platforms.md`, `references/language-and-json.md`. Linked from every platform skill's custom section, the decision table and the platform router; new eval case `custom-dotnet-desktop-rule`.
- **Custom scaling strategies.** This release supports the new custom modules of every AppDimens library: `appdimens-dynamic-custom`, `appdimens-kmp-custom`, `appdimens-games-custom` (+ Unity C#), `AppDimensCustom`, `appdimens_custom`, `appdimens-react-native/custom`, `webdimens/custom` and `AppDimens.Net.Custom`.
  - **`schemas/custom-strategy.schema.json`** is the official cross-platform format. It covers reference, axis, curves, factor/value bounds, aspect ratio, font-scale policy, rules per device class / screen range / orientation / multi-window, `extends`, and free-form text formulas (`"type": "expression"`, `"formula"`).
  - **`appdimens.config.json`** gains `customStrategies` (`file`, `ids`, `default`), `strategy.layout` / `strategy.text` accept `custom:<id>`, and `targets[].strategies` accepts `custom`. `validate` loads the file and checks the ids and every `custom:<id>` use.
  - **Kit:** `custom check [file]`, `custom explain <id> --devices …`, `normalize --strategy custom:<id>` (also `--custom <file>` and `--class`). Lint suggests `cdp`/`csp` with the project strategy, and flags `cdp`/`csp` without the custom import. The math runs on `lib/custom-engine.mjs`, generated from the webdimens engine by `scripts/sync-custom-engine.mjs` and checked against the shared 540-case parity fixture.
  - **Skills:** a *Project-defined strategies* section in the decision table, a custom row in the platform router, a *Custom strategies* section in every platform skill (Android XML: scaled only), and notes in the new-screen, code-edit, design-to-code and Claude Design workflows. There are 4 new eval cases (`custom-strategy-declared`, `custom-no-invented-id`, `custom-free-formula`, `custom-write-the-math`).
  - **Simplest form first:** the skills recommend writing the math as one typed code line with autocomplete when the user just wants a formula (Android/KMP/Games `scalingFormula { base * pow(sw / 360f, 0.8f) }` / `CustomScaleStrategy { … }`, Apple `CustomScaleStrategy { s in … }`, Flutter `customScaleStrategy((s) => …)`, .NET/Unity `CustomScaleStrategy.Create(s => …)`, web and React Native `scalingFormula(({ base, sw, pow }) => …)` / `customScaleStrategy(({ width, clamp }) => …)`), and the text formula (`{"id": "hud", "formula": "base * …"}`, `16.cdp("…")`) for JSON and remote config. Kit: `custom explain --formula "<text>"` and `normalize --formula "<text>"` (formulas shaped `base * (…)`; the token is printed as `cdp(16, '…')` / `16.cdp("…")`); `custom check` shows each strategy's `formula` and treats `base * (…)` formulas as screen-only; the bundled engine is resynced from webdimens (proportional-formula fast path, typed scopes).

## 0.2.0

- **New platform skills:** `appdimens-qt` (Qt 5/6 Widgets + QML), `appdimens-gtk` (GTK 3/4 and the portable C99 core), `appdimens-lvgl` (LVGL 8/9 on MCUs and embedded Linux) and `appdimens-python` (Tkinter, Qt for Python, Kivy, pygame, pyglet, wx, Dear PyGui, Panda3D, Blender).
- **`appdimens-games` rewritten for 3.3.0:** Unity, Unreal Engine 5, Godot 4, custom C/C++ and .NET engines plus Android; viewports, per-API projections (OpenGL, Vulkan, D3D11/12, Metal, WebGPU), FOV policies, FSR/DLSS/XeSS/MetalFX/TSR render size, safe areas, Steam Deck/Proton, LOD.
- **Detection:** `detect` and the installer recognise Qt (CMake `find_package(Qt5/6)`, qmake `.pro`), GTK (Meson/CMake `gtk4`/`gtk+-3.0`), LVGL (`lv_conf.h`, ESP-IDF `idf_component.yml`, PlatformIO), Python GUI/game projects and Blender add-ons, Unity (`ProjectSettings/ProjectVersion.txt`), Unreal (`*.uproject`) and Godot (`project.godot`).
- **Schema:** `appdimens.config.json` targets accept the platforms `qt`, `gtk`, `lvgl`, `python` and the libraries `appdimens-qt`, `appdimens-gtk`, `appdimens-lvgl`, `appdimens-py`.
- Cursor/Copilot/Windsurf globs for `*.qml`, `*.py`, `*.gd`, `*.uproject`, `*.uplugin`.

## 0.1.2

- **Listing icon** for the Claude directory.
- **Lint rule ids renamed**: `px-token-in-css` is now `px-unit-in-css` and `js-only-token` is now `js-only-unit`. The kit's code and CLI output say "unit", "dimen" or "theme scale" instead of "token", which also means an access token. `normalize --theme` prints the same values under the header `theme scale`.
- **README: Privacy and network** section. The plugin makes no network calls and reads no credentials or environment variables.
- The visual eval screenshots are no longer committed; `compare.mjs` and `summary.mjs` regenerate them.

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
