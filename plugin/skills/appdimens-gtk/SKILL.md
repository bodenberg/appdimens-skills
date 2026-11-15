---
name: appdimens-gtk
description: Implement layout intent in GTK 3 / GTK 4 apps (C, PyGObject, GJS, Vala, gtk-rs, libadwaita) with appdimens-gtk — AppDimensScope, responsive GTK CSS (padding: 16sdp; font-size: 14ssp), appdimens_scope_px("16sdp"), Pango sizes — and in any C/C++ toolkit through the portable single-header core appdimens.h (ad_sdp, ad_dp, ad_dimen). Use when sizing GTK UI, fixing fractional scaling or text-scaling issues, or embedding AppDimens math in C/C++.
---

# GTK — `appdimens-gtk` 3.2.0

Decide intent first with `appdimens-layout-intent`. Upstream skill: `bodenberg/appdimens-gtk/skills/appdimens-gtk/SKILL.md`.

## Install / wire-up

- Meson `meson setup build -Dgtk=4` (or `-Dgtk=3`), pkg-config `appdimens-gtk4` / `appdimens-gtk3`; CMake `AppDimens::gtk`.
- `AppDimensScope *ad = appdimens_scope_new_for_widget(window);` — keep a reference for the window's lifetime.
- PyGObject / GJS: `gi.require_version("AppDimens", "3")`, `AppDimens.Scope.new_for_widget(win)`.

## Tokens

| Intent | GTK CSS (via `appdimens_scope_add_css`) | C |
|---|---|---|
| spacing / sizes, phone-first (Phosh) | `padding: 16sdp` | `appdimens_scope_px(ad, "16sdp")` |
| desktop app sizes | `min-height: 44asdp` | `ad_asdp(appdimens_scope_get_metrics(ad), 44)` |
| text (follows desktop text scaling) | `font-size: 14ssp` / `14assp` | `appdimens_scope_pango_size(ad, "ssp", 14)` |
| text that must not follow text scaling | `font-size: 12sem` | `ad_sem(m, 12)` |

## Rules

- GTK CSS px are logical: never use `Px` tokens in CSS; never multiply by the scale factor.
- Re-layout in the `changed` signal; don't poll. Re-read `appdimens_scope_get_metrics()` each frame (double-buffered).
- Plain C/C++ toolkits: `#include "appdimens/appdimens.h"`, build an `ad_metrics` with `ad_metrics_make(&m, w, h, density, font_scale)` on resize, then `ad_sdp(&m, 16)`.

## Custom strategies

Only when `appdimens.config.json` declares `customStrategies` (or the user asks for their own rule); never invent ids.
`#define ADC_IMPLEMENTATION` + `#include "appdimens/appdimens_custom.h"` → `adc_load_json(text, err, n)`, `adc_dp(adc_get("id"), appdimens_scope_get_metrics(scope), 16)`. Full flow: `appdimens-custom-strategies`.
