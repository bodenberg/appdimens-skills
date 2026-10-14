// Checks the concrete API claims made by the platform skills against the AppDimens library sources.
// Clone every library into one folder (see README → Maintaining) and run:
//   node scripts/verify-upstream.mjs <folder>
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const LIBS = process.env.APPDIMENS_LIBS || process.argv[2];
if (!LIBS) {
  console.error('Usage: node scripts/verify-upstream.mjs <folder with clones of the AppDimens repositories>');
  process.exit(2);
}
const grep = (repo, re, opts = []) => {
  try {
    const out = execFileSync('grep', ['-rIlE', '--exclude-dir=.git', '--exclude-dir=build', '--exclude-dir=node_modules', '--exclude-dir=KDOC', ...opts, re, join(LIBS, repo)], { encoding: 'utf8', maxBuffer: 1 << 26 });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
};
// [skill, claim, repo, regex, mustExist = true, include globs]
const C = [
  // ---------- appdimens-android (appdimens-dynamic)
  ['android', 'version 3.2.0', 'appdimens-dynamic', 'VERSION_NAME=3\\.2\\.0|appdimens\\.version=3\\.2\\.0', true, ['--include=gradle.properties']],
  ['android', 'BOM artifact appdimens-dynamic-bom', 'appdimens-dynamic', 'appdimens-dynamic-bom'],
  ['android', 'satellite artifact appdimens-dynamic-auto', 'appdimens-dynamic', 'appdimens-dynamic-auto'],
  ['android', 'satellite artifacts -fluid -percent -resize -units', 'appdimens-dynamic', 'appdimens-dynamic-(fluid|percent|resize|units)'],
  ['android', 'Compose is compileOnly', 'appdimens-dynamic', 'compileOnly\\(.*compose', true, ['--include=*.kts']],
  ['android', 'package com.appdimens.dynamic.compose.auto', 'appdimens-dynamic', '^package com\\.appdimens\\.dynamic\\.compose\\.auto'],
  ['android', 'Compose val Number.asdp / assp', 'appdimens-dynamic', 'val Number\\.(asdp|assp)\\b'],
  ['android', 'code fun Number.asdp(context)', 'appdimens-dynamic', 'fun Number\\.asdp\\(context'],
  ['android', 'object DimenSdp / DimenSsp (code)', 'appdimens-dynamic', 'object Dimen(Sdp|Ssp)\\b'],
  ['android', 'Compose fsdp/fssp (fluid)', 'appdimens-dynamic', 'val Number\\.(fsdp|fssp)\\b'],
  ['android', 'Compose spaceW (percent)', 'appdimens-dynamic', 'val Number\\.spaceW\\b'],
  ['android', 'units in package com.appdimens.dynamic.compose with Float .mm', 'appdimens-dynamic', 'val (Float|Int)\\.mm: Float'],
  ['android', 'resize autoResizeTextSp in compose.resize', 'appdimens-dynamic', 'fun BoxWithConstraintsScope\\.autoResizeTextSp\\('],
  ['android', 'AppDimensProvider', 'appdimens-dynamic', 'fun AppDimensProvider\\('],
  ['android', 'sdpQualifier(qualified, DpQualifier, value)', 'appdimens-dynamic', 'fun Number\\.sdpQualifier\\(qualifiedValue: Number, qualifierType: DpQualifier'],
  ['android', 'scaledDp() builder with screen()', 'appdimens-dynamic', 'fun (Number|Int)\\.scaledDp\\('],
  ['android', 'DpQualifier.SMALL_WIDTH', 'appdimens-dynamic', 'SMALL_WIDTH'],
  ['android', 'hdp = height / 300 (screenHeightFactor)', 'appdimens-dynamic', 'screenHeightFactor: Float = screenHeightDp \\* DimenCache\\.INV_BASE_RATIO'],
  // ---------- appdimens-android-xml (sdps / ssps)
  ['android-xml', 'sdps version 3.2.0', 'appdimens-sdps', '3\\.2\\.0', true, ['--include=gradle.properties', '--include=*.kts', '--include=README.md']],
  ['android-xml', 'ssps version 3.2.0', 'appdimens-ssps', '3\\.2\\.0', true, ['--include=gradle.properties', '--include=*.kts', '--include=README.md']],
  ['android-xml', '_minus300sdp exists', 'appdimens-sdps', 'name="_minus300sdp"'],
  ['android-xml', '_600sdp exists', 'appdimens-sdps', 'name="_600sdp"'],
  ['android-xml', '_0sdp does NOT exist', 'appdimens-sdps', 'name="_0sdp"', false],
  ['android-xml', '_600hdp / _600wdp exist', 'appdimens-sdps', 'name="_600(h|w)dp"'],
  ['android-xml', '_1ssp and _600ssp exist', 'appdimens-ssps', 'name="_(1|600)ssp"'],
  ['android-xml', '_0ssp does NOT exist', 'appdimens-ssps', 'name="_0ssp"', false],
  ['android-xml', '_14hsp / _14wsp exist', 'appdimens-ssps', 'name="_14(h|w)sp"'],
  ['android-xml', 'bucket values-h900dp: _48hdp = 144dp', 'appdimens-sdps', '"_48hdp">144\\.00dp'],
  ['android-xml', 'Compose package com.appdimens.sdps.compose', 'appdimens-sdps', '^package com\\.appdimens\\.sdps\\.compose'],
  ['android-xml', 'code DimenSdp in com.appdimens.sdps.code', 'appdimens-sdps', 'object DimenSdp'],
  // ---------- appdimens-kmp
  ['kmp', 'artifact appdimens-kmp-bom', 'appdimens-kmp', 'appdimens-kmp-bom'],
  ['kmp', 'artifact appdimens-kmp-auto', 'appdimens-kmp', 'appdimens-kmp-auto'],
  ['kmp', 'package com.appdimens.kmp.compose.auto', 'appdimens-kmp', '^package com\\.appdimens\\.kmp\\.compose\\.auto'],
  ['kmp', 'package com.appdimens.kmp.compose.fluid', 'appdimens-kmp', '^package com\\.appdimens\\.kmp\\.compose\\.fluid'],
  ['kmp', 'package com.appdimens.kmp.compose.percent', 'appdimens-kmp', '^package com\\.appdimens\\.kmp\\.compose\\.percent'],
  ['kmp', 'package com.appdimens.kmp.compose.resize', 'appdimens-kmp', '^package com\\.appdimens\\.kmp\\.compose\\.resize'],
  ['kmp', 'AppDimensContext / ScreenConfiguration', 'appdimens-kmp', '(class|interface) (AppDimensContext|ScreenConfiguration)\\b'],
  ['kmp', 'AppDimensProvider', 'appdimens-kmp', 'fun AppDimensProvider\\('],
  // ---------- appdimens-apple (appdimens-ios)
  ['apple', 'product AppDimensDynamic', 'appdimens-ios', '\\.library\\(name: "AppDimensDynamic"'],
  ['apple', 'products Fluid/Percent/Power/Logarithmic/Interpolated/Diagonal/Perimeter/Fit/Fill/Density', 'appdimens-ios', '\\.library\\(name: "AppDimens(Fluid|Percent|Power|Logarithmic|Interpolated|Diagonal|Perimeter|Fit|Fill|Density)"'],
  ['apple', 'AppDimensDynamic re-exports Auto (and not Fluid)', 'appdimens-ios', '@_exported import AppDimensAuto'],
  ['apple', 'AppDimensDynamic does NOT re-export Fluid', 'appdimens-ios', '@_exported import AppDimensFluid', false],
  ['apple', 'version 3.2.0 in docs', 'appdimens-ios', 'from: "3\\.2\\.0"'],
  ['apple', '.appDimens() modifier', 'appdimens-ios', 'func appDimens\\('],
  ['apple', 'AppDimens.startAutomaticUpdates()', 'appdimens-ios', 'func startAutomaticUpdates\\('],
  ['apple', '@ScaledDimension property wrapper', 'appdimens-ios', 'struct ScaledDimension'],
  ['apple', '\\.appDimensConfiguration environment', 'appdimens-ios', 'appDimensConfiguration'],
  ['apple', 'updatesAmbient parameter', 'appdimens-ios', 'updatesAmbient'],
  ['apple', 'UIFont/NSFont ssp(_:weight:)', 'appdimens-ios', 'static func ssp\\(_ size: Double, weight'],
  ['apple', 'sdp(in: view)', 'appdimens-ios', 'func sdp\\(in '],
  ['apple', 'fsdp declared in AppDimensFluid', 'appdimens-ios', 'fsdp', true, ['--include=*.swift']],
  ['apple', 'spaceW declared in AppDimensPercent', 'appdimens-ios', 'spaceW', true, ['--include=*.swift']],
  ['apple', 'DimensResize / ResizeBound', 'appdimens-ios', '(struct|enum|class) (DimensResize|ResizeBound)\\b'],
  // ---------- appdimens-flutter
  ['flutter', 'package appdimens_flutter 3.2.0', 'appdimens-flutter', 'version: 3\\.2\\.0', true, ['--include=pubspec.yaml']],
  ['flutter', 'packages appdimens_auto / appdimens_bom / appdimens_resize / appdimens_units', 'appdimens-flutter', '^name: appdimens_(auto|bom|resize|units)$', true, ['--include=pubspec.yaml']],
  ['flutter', 'lib/appdimens.dart entry', 'appdimens-flutter', '^library;', true, ['--include=appdimens.dart']],
  ['flutter', 'AppDimensApp widget', 'appdimens-flutter', 'class AppDimensApp\\b'],
  ['flutter', 'AppDimensScopeBinder', 'appdimens-flutter', 'class AppDimensScopeBinder\\b'],
  ['flutter', 'sdpOf(context)', 'appdimens-flutter', 'sdpOf\\('],
  ['flutter', 'AppDimensScope.withMetrics', 'appdimens-flutter', 'withMetrics'],
  ['flutter', 'AutoResizeText / AutoResizeSquare', 'appdimens-flutter', 'class AutoResize(Text|Square)\\b'],
  ['flutter', 'sdpQualifier facilitator', 'appdimens-flutter', 'sdpQualifier'],
  ['flutter', 'spaceW / psdp (percent)', 'appdimens-flutter', '(spaceW|psdp)'],
  // ---------- appdimens-react-native
  ['react-native', 'npm package appdimens-react-native 3.2.0', 'appdimens-react-native', '"version": "3\\.2\\.0"', true, ['--include=package.json']],
  ['react-native', 'sub-path exports ./auto ./fluid ./percent ./resize ./units', 'appdimens-react-native', '"\\./(auto|fluid|percent|resize|units)"', true, ['--include=package.json']],
  ['react-native', 'createDimenStyles', 'appdimens-react-native', 'export (function|const) createDimenStyles'],
  ['react-native', 'useDimenMetrics', 'appdimens-react-native', 'export (function|const) useDimenMetrics'],
  ['react-native', 'DimenStyleSheet', 'appdimens-react-native', 'DimenStyleSheet'],
  ['react-native', 'AutoResizeText / useAutoResizeTextSp', 'appdimens-react-native', '(AutoResizeText|useAutoResizeTextSp)'],
  ['react-native', 'DimenCache.setMetricsOverride', 'appdimens-react-native', 'setMetricsOverride'],
  ['react-native', 'AppDimensProvider uiModeType', 'appdimens-react-native', 'uiModeType'],
  ['react-native', 'scaledDp builder', 'appdimens-react-native', 'scaledDp'],
  ['react-native', 'sdpPx', 'appdimens-react-native', 'sdpPx'],
  // ---------- appdimens-web (webdimens)
  ['web', 'npm webdimens 3.2.1', 'appdimens-web', '"version": "3\\.2\\.1"', true, ['--include=package.json']],
  ['web', 'exports ./postcss ./scss ./resize ./units ./auto', 'appdimens-web', '"\\./(postcss|scss|resize|units|auto)"', true, ['--include=package.json']],
  ['web', 'install()', 'appdimens-web', 'export function install\\('],
  ['web', 'dimens() SSR-safe', 'appdimens-web', 'export function dimens(<|\\()'],
  ['web', '<style data-webdimens>', 'appdimens-web', 'data-webdimens'],
  ['web', 'useWebDimens (React)', 'appdimens-web', 'useWebDimens'],
  ['web', 'provideWebDimens (Angular)', 'appdimens-web', 'provideWebDimens'],
  ['web', 'autoResizeText (resize)', 'appdimens-web', 'autoResizeText'],
  ['web', 'class token syntax p:16sdp', 'appdimens-web', 'p:16sdp'],
  ['web', 'webdimens.global.js build', 'appdimens-web', 'webdimens\\.global\\.js'],
  // ---------- appdimens-dotnet (appdimens-net-binding)
  ['dotnet', 'version 3.6.1', 'appdimens-net-binding', '3\\.6\\.1', true, ['--include=*.props', '--include=*.csproj', '--include=README.md']],
  ['dotnet', 'PackageId Bodenberg.AppDimens.Maui.Sdps', 'appdimens-net-binding', 'Bodenberg\\.AppDimens\\.Maui\\.Sdps'],
  ['dotnet', 'PackageIds Bodenberg.AppDimens.Sdps.Wpf/.WinForms/.WinUI', 'appdimens-net-binding', 'Bodenberg\\.AppDimens\\.Sdps\\.(Wpf|WinForms|WinUI)'],
  ['dotnet', 'PackageIds AppDimens.Net.Sdk / AppDimens.Net.Maui', 'appdimens-net-binding', 'AppDimens\\.Net\\.(Sdk|Maui)\\b'],
  ['dotnet', 'Android bindings Bodenberg.AppDimens.Sdps / Ssps / Dynamic', 'appdimens-net-binding', 'Bodenberg\\.AppDimens\\.(Ssps|Dynamic)\\b'],
  ['dotnet', 'UseAppDimensSdps()', 'appdimens-net-binding', 'UseAppDimensSdps\\('],
  ['dotnet', 'AppDimensSdpsWindow.Attach', 'appdimens-net-binding', 'class AppDimensSdpsWindow'],
  ['dotnet', 'AppDimensMaui.AttachWindow', 'appdimens-net-binding', 'AttachWindow\\('],
  ['dotnet', 'AppDimensWpf.Initialize', 'appdimens-net-binding', 'class AppDimensWpf'],
  ['dotnet', 'AppDimensWinForms.Initialize / Apply', 'appdimens-net-binding', 'public static [A-Za-z]+ Apply\\(Control'],
  ['dotnet', 'AppDimensWinUI.Initialize', 'appdimens-net-binding', 'class AppDimensWinUI'],
  ['dotnet', 'ASdp / FSdp / SpaceWDp extensions', 'appdimens-net-binding', 'public static float (ASdp|FSdp|SpaceWDp)\\('],
  ['dotnet', 'no FSsp (strategies are dp-only)', 'appdimens-net-binding', 'public static float FSsp\\(', false],
  ['dotnet', 'DimenPx.ToPx / ToPt', 'appdimens-net-binding', 'static .*To(Px|Pt)\\('],
  ['dotnet', 'SspPt / SdpPx', 'appdimens-net-binding', 'public static (float|int|double) (SspPt|SdpPx)\\('],
  ['dotnet', 'MAUI markup FsdpExtension / WPF FSdpExtension', 'appdimens-net-binding', 'class (FsdpExtension|FSdpExtension)\\b'],
  ['dotnet', 'HostDimensScope / FakeAppDimensContext', 'appdimens-net-binding', 'class (HostDimensScope|FakeAppDimensContext)\\b'],
  ['dotnet', 'RegisterConfigurationListener', 'appdimens-net-binding', 'RegisterConfigurationListener'],
  ['dotnet', 'SDPS markup {sdp:16} (SdpExtension)', 'appdimens-net-binding', 'class SdpExtension\\b'],
  // ---------- appdimens-games
  ['games', 'version 3.2.0', 'appdimens-games', '3\\.2\\.0', true, ['--include=gradle.properties']],
  ['games', 'artifacts appdimens-games-bom / -native / -auto', 'appdimens-games', 'appdimens-games-(bom|native|auto)'],
  ['games', 'GameScreen.updateFromContext', 'appdimens-games', 'fun updateFromContext\\('],
  ['games', 'WorldScale.fitPx / fillPx', 'appdimens-games', 'fun (fitPx|fillPx)\\('],
  ['games', 'ViewportMode FIT_ALL / CROP', 'appdimens-games', 'FIT_ALL'],
  ['games', 'ViewportTransform', 'appdimens-games', 'class ViewportTransform\\b'],
  ['games', 'GameMath / GameMetrics', 'appdimens-games', '(object GameMath|class GameMetrics)\\b'],
  ['games', 'sdpi(ctx) code extension', 'appdimens-games', 'fun (Number|Int|Float)\\.sdpi\\('],
  ['games', 'cmPx(ctx) units', 'appdimens-games', 'cmPx'],
  ['games', 'native updateMetrics / invariantMetrics', 'appdimens-games', 'invariantMetrics'],
  ['games', 'C99 adg_make', 'appdimens-games', 'adg_make'],
  ['games', 'JNI NativeBridge', 'appdimens-games', 'object NativeBridge\\b'],
  ['games', 'C# MathKernels / Screen.Update / World.ViewportRect', 'appdimens-games', '(class MathKernels|ViewportRect\\()'],
  ['games', 'C++ namespace appdimens::games', 'appdimens-games', 'namespace appdimens::games|namespace games'],
  ['games', 'GamesCompat (deprecated 2.x)', 'appdimens-games', 'GamesCompat'],
];

let fail = 0;
const byPlatform = {};
for (const [skill, claim, repo, re, must = true, inc = []] of C) {
  const hits = grep(repo, re, inc);
  const ok = must ? hits.length > 0 : hits.length === 0;
  (byPlatform[skill] ??= { ok: 0, total: 0 }).total++;
  if (ok) byPlatform[skill].ok++;
  else {
    fail++;
    console.log(`✗ [${skill}] ${claim}  (${repo}: /${re}/ → ${hits.length} files)`);
  }
}
console.log('\n' + Object.entries(byPlatform).map(([k, v]) => `${k.padEnd(14)} ${v.ok}/${v.total}`).join('\n'));
console.log(`\n${C.length - fail}/${C.length} claims verified`);
process.exit(fail ? 1 : 0);
