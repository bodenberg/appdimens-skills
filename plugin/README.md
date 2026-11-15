# AppDimens skills

Skills that teach Claude how to implement responsive layouts with the AppDimens libraries. Claude first reads the
layout intent of a screen (base screen, which elements scale, which stay fixed, how text grows), then writes it
with the right AppDimens library, unit and strategy for the project: Android (Compose, Views, XML), Kotlin
Multiplatform, SwiftUI / UIKit, Flutter, React Native, Web, .NET, Qt, GTK, LVGL, Roku, Python / Blender and games
(Unity, Unreal, Godot, C/C++).

Included skills: layout intent and the decision table, design-to-code (Figma, screenshots, specs), Claude Design,
editing existing screens, creating new screens, custom scaling strategies, and one skill per AppDimens library.

The skills are plain Markdown. The optional validation CLI and Claude Code hook are installed separately with
`npx appdimens-skills` (see https://github.com/bodenberg/appdimens-skills).

License: Apache-2.0.
