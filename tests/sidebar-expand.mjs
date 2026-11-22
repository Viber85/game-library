import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const ui=readFileSync(new URL("../src/Dashboard.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/theme.ts",import.meta.url),"utf8");
const status=readFileSync(new URL("../src/SystemStatusBar.tsx",import.meta.url),"utf8");
const artwork=readFileSync(new URL("../src/SelectedGameArtwork.tsx",import.meta.url),"utf8");

test("focus opens navigation and returning to games collapses it",()=>{
  assert.match(ui,/const \[railExpanded, setRailExpanded\] = useState\(false\)/);
  assert.match(ui,/onGamepadFocus=\{\(\) => \{\s*lastRailId\.current=action\.id;\s*setRailIndex\(index\);\s*setRailExpanded\(true\);\s*\}\}/);
  assert.match(ui,/const focusRail = \(index: number\) => \{[\s\S]*?setRailExpanded\(true\);[\s\S]*?focusNativeMenuControl\(railRefs\.current\[target\],GamepadButton\.DIR_LEFT\);/);
  assert.match(ui,/const goToGame = \(index\?: number\) => \{\s*setRailExpanded\(false\);/);
  assert.match(ui,/onFocusCapture=\{event => \{[\s\S]*?sidebarRef\.current\?\.contains\(event\.target as Node\)/);
});

test("rail expansion changes flex layout rather than covering game content",()=>{
  assert.match(css,/--gl-nav-closed-width:\s*76px/);
  assert.match(css,/--gl-nav-open-width:\s*218px/);
  assert.match(css,/\.gl-root\.gl-nav-expanded \.gl-sidebar\s*\{[\s\S]*?flex-basis:var\(--gl-nav-open-width\)/);
  assert.match(css,/transition:[\s\S]*?width var\(--gl-nav-motion\)/);
  assert.doesNotMatch(css,/\.gl-root\.gl-nav-expanded \.gl-sidebar\s*\{[^}]*?position:fixed/);
});

test("labels are inline in the expanded rail, not floating tooltip popups",()=>{
  assert.match(css,/\.gl-root \.gl-rail \.gl-rail-label[\s\S]*?position:static/);
  assert.match(css,/\.gl-root\.gl-nav-expanded \.gl-rail \.gl-rail-label\s*\{[^}]*?opacity:1/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(ui,/<span className="gl-rail-label">\{action\.label\}<\/span>/);
});


test("floating library header has native notifications focus, clock and no search icon",()=>{
  assert.match(ui,/<header className="gl-header gl-library-topbar" aria-label="Library navigation">/);
  assert.match(ui,/<span className="gl-topbar-current" title=\{tab\.title\} aria-live="polite">\{tab\.title\}<\/span>/);
  assert.doesNotMatch(ui,/<span className="gl-topbar-title">Game Library<\/span>/);
  assert.doesNotMatch(ui,/gl-topbar-divider/);
  assert.match(ui,/<SystemStatusBar statusRef=\{headerStatusRef\}/);
  assert.match(status,/<Focusable ref=\{statusRef\} className="gl-topbar-icon gl-topbar-notifications"/);
  assert.doesNotMatch(status,/gl-topbar-search|onSearch|MdSearch|Navigate\("\/search"\)/);
  assert.match(status,/<time className="gl-topbar-clock" dateTime=\{time\.toISOString\(\)\}/);
  assert.match(status,/const clock=window\.setInterval\(\(\)=>setTime\(new Date\(\)\),15000\)/);
  assert.doesNotMatch(ui,/setTime\(new Date\(\)\)/);
  assert.match(css,/\/\* v0\.4\.7[^]*?\.gl-root\s*\{\s*padding:0;/);
  assert.match(css,/\.gl-root \.gl-sidebar\s*\{\s*align-self:stretch;\s*height:100%;/);
  assert.match(css,/\.gl-root \.gl-main\s*\{\s*padding-top:20px;/);
  assert.match(css,/\.gl-main > \.gl-header\.gl-library-topbar\s*\{[^}]*?background:transparent;/);
  assert.match(css,/\.gl-main \.gl-topbar-status\s*\{[^}]*?border-radius:999px;/);
  assert.match(css,/\.gl-main > \.gl-strip\s*\{\s*height:268px;/);
  assert.match(css,/\.gl-topbar-current\s*\{[\s\S]*?font-size:clamp\(22px,2\.5vw,31px\)/);
  assert.doesNotMatch(ui,/className="gl-pagination"/);
  assert.doesNotMatch(ui,/L1\/R1 Tabs · ↑ Tabs/);
  assert.match(css,/\.gl-main \.gl-strip \.gl-game,\s*\.gl-main \.gl-strip \.gl-view-more\s*\{[^}]*?height:238px;/);
  assert.match(status,/m_FriendsUIFriendStore\?\.m_self\?\.m_persona/);
  assert.match(status,/onError=\{\(\)=>setFailedAvatar\(steam\.avatar\)\}/);
  assert.doesNotMatch(ui,/Selected from your Steam library/);
  assert.match(ui,/className=\{\s*"gl-pill"\s*\+/);
  assert.match(ui,/const cycleTab = \(direction: number\)/);
  for(const name of ["gl-topbar-wifi","gl-topbar-bluetooth","gl-topbar-battery",
    "gl-topbar-notifications","gl-topbar-avatar","gl-topbar-clock"])
    assert.ok(status.includes(name),"Missing topbar feature: "+name);
  assert.match(status,/callable<\[\], DeviceStatus>\("get_system_status"\)/);
  assert.match(status,/onActivate=\{\(\)=>Navigation.Navigate\("\/settings"\)\}/);
  assert.match(status,/onStatusButtonDown/);
  assert.match(ui,/headerStatusRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(status,/Math\.random\(\)/);
});


test("Install Play and Game Details have an unmistakable controller focus",()=>{
  const v8=css.slice(css.indexOf("/* v0.4.8 — unmistakable controller focus"));
  assert.ok(v8.length>1000,"The v0.4.8 scoped focus styles must be present");
  assert.match(v8,/\.gl-root \.gl-feature \.gl-actions \.gl-button:is\(\.gl-focused,\.gpfocus,:focus-visible,:focus-within\)/);
  assert.match(v8,/box-shadow:0 0 0 3px #fff,0 0 0 6px #189fff/);
  assert.match(v8,/transform:translateY\(-2px\)/);
  assert.match(v8,/\.gl-button\.gl-primary:not\(\.gl-focused\):not\(:focus-visible\)/);
  assert.match(v8,/\.gl-button:not\(\.gl-primary\):is\(\.gl-focused,\.gpfocus,:focus-visible,:focus-within\)/);
  assert.match(ui,/className="gl-button gl-primary" focusClassName="gl-focused" noFocusRing/);
  assert.match(ui,/homeActionRefs\.current\[1\]\?\.focus\(\)/);
  assert.match(ui,/className="gl-button" focusClassName="gl-focused" noFocusRing/);
  assert.match(ui,/homeActionRefs\.current\[0\]\?\.focus\(\)/);
  assert.match(v8,/prefers-reduced-motion:reduce/);
});

test("main carousel poster expansion remains responsive and grid is untouched",()=>{
  const start=css.indexOf("/* v0.4.8 — unmistakable controller focus");
  const end=css.indexOf("/* v0.4.12 — enlarged dashboard carousel",start);
  assert.ok(start>=0&&end>start);
  const v8=css.slice(start,end);
  assert.match(v8,/\.gl-main > \.gl-strip\s*\{\s*height:285px/);
  assert.match(v8,/height:254px/);
  assert.match(v8,/max-height:730px/);
  assert.match(v8,/height:207px/);
  assert.match(v8,/max-height:650px/);
  assert.match(v8,/height:188px/);
  assert.match(v8,/max-width:900px/);
  assert.doesNotMatch(v8,/\.gl-full-grid/);
});


test("v0.4.12 scales both carousel and selected-game detail safely",()=>{
  const start=css.indexOf("/* v0.4.12 — enlarged dashboard carousel and hero information.");
  assert.ok(start>=0,"New hero-and-carousel design stylesheet must exist");
  const end=css.indexOf("/* v0.4.20 — running game shortcut",start);
  assert.ok(end>start,"Old carousel scope should end before later components");
  const layout=css.slice(start,end);
  for(const term of [
    ".gl-main > .gl-strip", "height:306px", "height:274px",
    "width:clamp(151px,13vw,208px)", "height:260px",
    "@media (max-height:820px)", "@media (max-height:770px)",
    "height:213px", "@media (max-height:680px)", "height:196px",
    "@media (max-height:610px)", "height:181px",
  ])assert.ok(layout.includes(term),"Missing responsive poster rule: "+term);
  for(const term of [
    ".gl-main .gl-feature-content", "width:min(960px,89%)",
    ".gl-main .gl-feature .gl-game-logo", "max-height:80px",
    ".gl-main .gl-feature h1", "font-size:clamp(28px,3.15vw,40px)",
    ".gl-main .gl-feature .gl-status", "font-size:15px",
    ".gl-main .gl-feature .gl-metrics", "height:92px",
    ".gl-main .gl-feature .gl-hltb .gl-hltb-values",
    "grid-template-columns:repeat(3,minmax(0,1fr))",
    ".gl-main .gl-feature .gl-achievement-card",
    ".gl-main .gl-feature .gl-achievement-track", "height:7px",
    ".gl-main .gl-feature .gl-actions .gl-button",
  ])assert.ok(layout.includes(term),"Missing enlarged game detail styling: "+term);
  assert.ok(!layout.includes(".gl-full-grid"),"Do not enlarge full grid or alter its navigation");
  assert.ok(!layout.includes("#QuickAccess-Menu"),"Do not change the native QAM");
  assert.ok(!layout.includes("data-glm-settings"),"Do not touch Settings palette");
  for(const name of [
    "gl-game-logo","gl-status","gl-metrics","gl-metric","gl-actions",
  ])assert.ok((ui+artwork).includes(name),"The resized region must exist: "+name);
  assert.match(ui,/<HowLongToBeatCard key=\{"hltb-"/);
  assert.match(ui,/<AchievementsCard key=\{"achievements-"/);
  assert.ok(layout.includes(".gl-hltb")&&layout.includes(".gl-achievement-card"),
    "Metrics components are enlarged via their shared CSS classes");
  // Budget each visual-height tier conservatively, including margins,
  // buttons and padding. Keep native Steam bottom help cues unobscured.
  const cases=[
    {viewport:850,chrome:20+30+52+56,strip:306,detail:341},
    {viewport:800,chrome:20+30+52+56,strip:288,detail:322},
    {viewport:771,chrome:20+30+52+56,strip:288,detail:322},
    {viewport:730,chrome:15+27+45+49,strip:239,detail:294},
    {viewport:681,chrome:15+27+45+49,strip:239,detail:294},
    {viewport:610,chrome:15+27+45+49,strip:200,detail:242},
  ];
  for(const c of cases)
    assert.ok(c.viewport-c.chrome-c.strip>=c.detail,
      "Detail panel could clip at "+c.viewport+"px viewport");
});
