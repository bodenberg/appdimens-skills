# Changelog

## 0.2.0

- **New platform skills:** `appdimens-qt` (Qt 5/6 Widgets + QML), `appdimens-gtk` (GTK 3/4 and the portable C99 core), `appdimens-lvgl` (LVGL 8/9 on MCUs and embedded Linux) and `appdimens-python` (Tkinter, Qt for Python, Kivy, pygame, pyglet, wx, Dear PyGui, Panda3D, Blender).
- **`appdimens-games` rewritten for 3.3.0:** Unity, Unreal Engine 5, Godot 4, custom C/C++ and .NET engines plus Android; viewports, per-API projections (OpenGL, Vulkan, D3D11/12, Metal, WebGPU), FOV policies, FSR/DLSS/XeSS/MetalFX/TSR render size, safe areas, Steam Deck/Proton, LOD.
- **Detection:** `detect` and the installer recognise Qt (CMake `find_package(Qt5/6)`, qmake `.pro`), GTK (Meson/CMake `gtk4`/`gtk+-3.0`), LVGL (`lv_conf.h`, ESP-IDF `idf_component.yml`, PlatformIO), Python GUI/game projects and Blender add-ons, Unity (`ProjectSettings/ProjectVersion.txt`), Unreal (`*.uproject`) and Godot (`project.godot`).
- **Schema:** `appdimens.config.json` targets accept the platforms `qt`, `gtk`, `lvgl`, `python` and the libraries `appdimens-qt`, `appdimens-gtk`, `appdimens-lvgl`, `appdimens-py`.
- Cursor/Copilot/Windsurf globs for `*.qml`, `*.py`, `*.gd`, `*.uproject`, `*.uplugin`.

## 0.1.2

- **Listing icon** for the Claude directory (`.claude-plugin/icon.png`).
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
