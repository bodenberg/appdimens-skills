---
name: appdimens-lvgl
description: Implement layout intent in LVGL 8.3 / 9.x UIs on MCUs and embedded Linux (ESP32, STM32, RP2040, NXP, Zephyr, Arduino, PlatformIO, fbdev/DRM/SDL) with appdimens-lvgl — lv_appdimens_init, lv_ad_sdp/lv_ad_asdp/lv_ad_ssp integer pixels, responsive style bindings (lv_ad_style_bind), font picking (lv_ad_font_for). Use when one firmware must support several display resolutions or rotations.
---

# LVGL — `appdimens-lvgl` 3.2.0

Decide intent first with `appdimens-layout-intent` (base screen = a **300 px-wide** reference in PIXEL mode).
Upstream skill: `bodenberg/appdimens-lvgl/skills/appdimens-lvgl/SKILL.md`.

## Install / wire-up

ESP-IDF component, PlatformIO `bodenberg/appdimens-lvgl`, Arduino library, Zephyr module or CMake `appdimens::lvgl`.
Call `lv_appdimens_init(NULL)` after the display is registered — it follows resolution and rotation changes.

## Tokens

| Intent | Call |
|---|---|
| sizes, padding, radius | `lv_ad_sdp(v)` (`lv_ad_asdp` when small and large panels share firmware) |
| content that must never be cropped on other aspects | `lv_ad_ftsdp(v)` |
| literal % of the display | `lv_ad_space_w(p)`, `lv_ad_space_h(p)` |
| text | `lv_ad_font_for(fonts, n, AD_SCALED, 0, size)` (bitmap fonts) or Tiny TTF size `lv_ad_ssp(size)` |
| styles that update themselves | `lv_ad_style_bind(&st, LV_STYLE_RADIUS, AD_SCALED, AD_SLOT(AD_VAR_S, 0), 8)`, `lv_ad_style_bind_pad_all` |

## Rules

- Integer hot path (no FPU): fine inside draw/event callbacks. `lv_ad_dimen("16sdp")` parses — config only.
- `LV_APPDIMENS_MODE_DPI` only when panels differ a lot in DPI. Unbind (`lv_ad_style_unbind`) before `lv_style_reset`.
- Validate on the smallest and largest panel and after rotation.
