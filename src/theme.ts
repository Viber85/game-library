/** Independent dashboard styles; does not mutate Steam's global theme. */
export const DASHBOARD_CSS = String.raw`
.gl-root {
  --gl-bg:#030c1a; --gl-surface:#0b1b31; --gl-line:rgba(146,192,238,.24);
  --gl-blue:#4fc3ff; --gl-text:#f2f7ff; --gl-muted:#a7b8ce;
  position:absolute; inset:0; width:100%; height:100vh;
  box-sizing:border-box; display:flex; background:radial-gradient(ellipse at 65% 0,#0c3160 0%,#041324 35%,#020912 82%);
  color:var(--gl-text); font-family:"Noto Sans", "Inter", sans-serif;
  overflow:hidden;
}
.gl-root * { box-sizing:border-box; }
.gl-sidebar { position:relative; z-index:4; width:76px; flex:0 0 76px;
  background:linear-gradient(180deg,#061326,#030915); border-right:1px solid var(--gl-line);
  padding:16px 8px; }
.gl-sidebar-brand { height:52px; font-size:30px; color:var(--gl-blue);
  display:flex; align-items:center; justify-content:center; margin-bottom:28px; }
.gl-rail { display:flex; flex-direction:column; align-items:center; gap:14px; }
.gl-rail-item { width:54px; height:54px; border-radius:14px; display:flex;
  align-items:center; justify-content:center; position:relative; flex:0 0 auto;
  color:#b5cce8; background:transparent; transition:color .16s, background-color .16s;
}
.gl-rail-icon { font-size:27px; flex-shrink:0; }
.gl-rail-item.gl-focused, .gl-rail-item:hover { color:#f2f9ff;
  background:#164a7a; box-shadow:inset 0 0 0 1px #4fc3ff,0 0 18px #087ad999; }
.gl-rail-label { display:none; position:absolute; z-index:10;
  left:66px; top:50%; transform:translateY(-50%);
  padding:10px 18px; background:#163a63; border:1px solid #57c8ff;
  border-radius:10px; box-shadow:0 8px 25px #0009; white-space:nowrap;
  font-size:17px; font-weight:600; pointer-events:none; }
.gl-rail-item.gl-focused .gl-rail-label, .gl-rail-item:hover .gl-rail-label { display:block; }
.gl-main { position:relative; min-width:0; flex:1; display:flex; flex-direction:column; padding:0 34px; }
.gl-header { display:flex; justify-content:space-between; align-items:center; height:69px; flex:0 0 69px; }
.gl-brand { font-size:23px; font-weight:800; letter-spacing:.025em; }
.gl-brand-sub { font-size:14px; font-weight:500; color:#a8bdd5; margin-left:12px; }
.gl-header-tools { display:flex; align-items:center; gap:22px; }
.gl-header-control { width:40px; height:40px; display:flex; align-items:center; justify-content:center;
  border-radius:50%; background:#0f2640; font-size:24px; }
.gl-header-control.gl-focused { box-shadow:0 0 0 2px #fff; }
.gl-time { font-size:18px; font-weight:600; }
.gl-filterbar { display:flex; justify-content:space-between; align-items:center; flex:0 0 65px; gap:16px; }
.gl-filters { display:flex; flex-wrap:nowrap; overflow-x:auto; gap:10px; padding:7px 4px; min-width:0; scrollbar-width:none; }
.gl-pill, .gl-sort { white-space:nowrap; border-radius:999px; padding:11px 17px;
  background:#102944; border:1px solid #31516d; font-size:14px; font-weight:600; }
.gl-pill.gl-active { background:#d6edff; color:#071529; border-color:#7dccff; }
.gl-pill.gl-focused, .gl-sort.gl-focused { box-shadow:0 0 0 2px #fff,0 0 14px #2badff; }
.gl-sort { display:flex; align-items:center; gap:7px; flex:0 0 auto; }
.gl-strip { position:relative; display:flex; align-items:flex-start; gap:12px;
  flex:0 0 auto; height:232px; padding:18px 4px 14px; min-width:0; overflow-x:auto; overflow-y:hidden;
  scrollbar-width:none; scroll-padding-inline:4px; }
.gl-strip::-webkit-scrollbar, .gl-filters::-webkit-scrollbar { display:none; }
.gl-game { width:clamp(112px,10vw,168px); height:197px; flex:0 0 clamp(112px,10vw,168px);
  border-radius:12px; padding:0; transition:transform .15s; overflow:visible;
  outline:none; }
.gl-poster { position:relative; width:100%; height:100%; overflow:hidden; border-radius:12px;
  background:linear-gradient(135deg,#19416d,#071527); border:2px solid #264967; }
.gl-poster img { display:block; width:100%; height:100%; object-fit:cover; }
.gl-poster::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(0deg,rgba(1,5,12,.96),transparent 55%); }
.gl-poster-name { position:absolute; bottom:14px; left:10px; right:10px; z-index:1;
  font-size:14px; font-weight:800; line-height:1.18; text-shadow:0 1px 5px black; }
.gl-installed-indicator { position:absolute; right:7px; bottom:4px; font-size:20px; z-index:2; }
.gl-game.gl-selected .gl-poster { border-color:#49baff; box-shadow:0 0 0 2px #bdeaff,0 0 18px #03a7ffbb; }
.gl-game.gl-focused { transform:translateY(-2px); }
.gl-game.gl-focused .gl-poster { box-shadow:0 0 0 3px #fff,0 0 22px #03a7ff; }
.gl-feature { flex:1; min-height:190px; position:relative; overflow:hidden;
  border:1px solid #1f4d7b; border-radius:17px; margin-bottom:8px; background:#061426; }
.gl-hero { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:70% center; opacity:.95; }
.gl-feature-shade { position:absolute; inset:0; background:linear-gradient(90deg,#061224 0%,#08182c 34%,rgba(7,19,37,.76) 51%,transparent 85%),
 linear-gradient(0deg,#061224 0%,transparent 28%); }
.gl-feature-content { position:relative; height:100%; display:flex; flex-direction:column; justify-content:center;
  padding:19px 26px; width:min(740px,66%); }
.gl-feature h1 { margin:0 0 5px; font-size:clamp(22px,3vw,38px); line-height:1.13; }
.gl-desc { color:#cad8e8; font-size:15px; margin:0 0 14px; }
.gl-status { display:flex; gap:20px; flex-wrap:wrap; margin-bottom:17px; }
.gl-status span { display:flex; align-items:center; gap:7px; font-size:14px; }
.gl-metrics { display:flex; flex-wrap:nowrap; gap:9px; margin-bottom:16px; }
.gl-metric { display:flex; align-items:center; gap:8px; padding:10px;
  min-width:0; flex:1; background:#102944c9; border:1px solid #315574; border-radius:11px; font-size:22px; }
.gl-metric>svg { flex-shrink:0; }
.gl-metric div { display:flex; flex-direction:column; gap:2px; min-width:0; }
.gl-metric small { font-size:10px; color:#b6c9dc; }
.gl-metric strong { font-size:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gl-actions { display:flex; gap:12px; }
.gl-button { display:inline-flex; align-items:center; justify-content:center; gap:9px;
  padding:12px 22px; min-width:145px; background:#132f4b; border:1px solid #315a79;
  border-radius:12px; font-size:16px; font-weight:700; }
.gl-button svg { font-size:24px; }
.gl-button.gl-primary { background:#d0eeff; color:#061628; border-color:#7bd5ff; }
.gl-button.gl-focused { box-shadow:0 0 0 2px #fff,0 0 18px #1eafff; }
.gl-empty { display:flex; flex:1; min-height:0; flex-direction:column; align-items:flex-start; justify-content:center; gap:15px; }
.gl-empty h1 { margin:0; } .gl-empty p { margin:0; color:var(--gl-muted); }
.gl-sync-note { position:absolute; bottom:40px; left:34px; right:34px;
  max-width:75%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  font-size:11px; color:#9fb5ce; pointer-events:none; }
.gl-filterbar { min-width:0; }
.gl-filters { scroll-behavior:smooth; }
.gl-footer { display:flex; gap:30px; align-items:center; justify-content:flex-end; flex:0 0 38px;
  color:#b6c8d9; border-top:1px solid #173b5d; font-size:12px; }
.gl-footer span:first-child { margin-right:auto; }
@media (max-height:700px) {
  .gl-header { height:53px; flex-basis:53px; }
  .gl-filterbar { flex-basis:53px; }
  .gl-strip { height:172px; padding-top:10px; }
  .gl-game { height:150px; }
  .gl-feature-content { padding:10px 22px; }
  .gl-feature h1 { font-size:26px; }
  .gl-metrics { margin-bottom:8px; }
  .gl-metric { padding:6px; }
  .gl-status { margin-bottom:9px; }
  .gl-button { padding:8px 15px; }
}
@media (max-width:900px) {
  .gl-main { padding:0 18px; }
  .gl-sidebar { width:66px; flex-basis:66px; }
  .gl-feature-content { width:78%; }
  .gl-pill { padding:8px 12px; }
  .gl-metric strong { font-size:13px; }
}

/* v0.2.0-test.3 — keep all dashboard content below Steam's native status bar.
 * Steam owns this top region; the old duplicate header was obscured by it. */
.gl-root {
  padding:48px 0 38px;
  height:100%;
  min-height:0;
  background:
    radial-gradient(ellipse 58% 42% at 62% 10%,rgba(18,73,136,.50),transparent 75%),
    linear-gradient(155deg,#030915 0%,#07152b 48%,#020713 100%);
  --gl-bg:#020815;
  --gl-surface:#0c1b32;
  --gl-line:rgba(93,165,231,.18);
  --gl-blue:#4ac1ff;
  --gl-text:#f5f8ff;
  --gl-muted:#9fb7d1;
}
.gl-header,.gl-sidebar-brand { display:none; }
.gl-sidebar { background:linear-gradient(180deg,rgba(5,19,37,.97),rgba(2,9,23,.98));border-right:1px solid rgba(88,161,220,.20); }
.gl-rail { margin-top:12px; gap:12px; }
.gl-rail-item { color:#acc9e9; }
.gl-rail-item.gl-focused,.gl-rail-item:hover {
  background:linear-gradient(140deg,#185488,#083058);
  box-shadow:inset 0 0 0 2px #63cfff,0 0 20px rgba(3,157,255,.72);
}
.gl-main { padding:0 32px; }
.gl-filterbar { flex:0 0 70px; }
.gl-pill,.gl-sort {
  background:linear-gradient(180deg,rgba(28,56,91,.84),rgba(9,29,53,.95));
  border:1px solid rgba(108,164,218,.19);box-shadow:0 2px 10px rgba(0,0,0,.20);
  color:#e7f2ff;
}
.gl-pill.gl-active {
  background:linear-gradient(180deg,#f0fbff,#bfdfff);
  color:#07182e;border-color:#bdeaff;box-shadow:0 0 16px rgba(40,176,255,.47);
}
.gl-pill.gl-focused,.gl-sort.gl-focused { box-shadow:0 0 0 2px #e0faff,0 0 18px #28a9ff; }
.gl-strip { gap:13px; }
.gl-poster {border:1px solid rgba(108,181,251,.19);background:linear-gradient(135deg,#14335a,#06101f);}
.gl-game.gl-selected .gl-poster {border-color:#89d9ff;box-shadow:0 0 0 2px #9adbff,0 0 22px #0099ffb0;}
.gl-feature {
  border:0;
  border-radius:0;
  box-shadow:none;
  margin:0 -32px -8px -8px;
  background:linear-gradient(110deg,#061326,#0e2749 66%,#050b19);
  min-height:160px;
}
.gl-hero {
  position:absolute;inset:0;width:100%;height:100%;
  display:block;object-fit:cover;object-position:center 45%;
  opacity:1;filter:saturate(1.10) contrast(1.04);
}
.gl-feature-shade {
  background:
    linear-gradient(90deg,#030c1d 0%,rgba(3,12,29,.97) 27%,rgba(3,12,29,.73) 49%,rgba(3,12,29,.18) 77%,transparent 100%),
    linear-gradient(0deg,rgba(3,10,22,.44),transparent 36%),
    linear-gradient(180deg,rgba(3,10,22,.20),transparent 35%);
}
.gl-feature-content {width:min(680px,66%);padding:19px 30px;}
.gl-feature h1 {color:#fff;text-shadow:0 2px 13px #030b17;line-height:1.14;}
.gl-desc {color:#cad8e9;}
.gl-metric {background:rgba(10,27,48,.81);border:1px solid rgba(100,165,224,.23);backdrop-filter:blur(7px);}
.gl-button {background:linear-gradient(180deg,rgba(32,61,95,.9),rgba(10,30,53,.95));border:1px solid rgba(100,166,229,.26);}
.gl-button.gl-primary {background:linear-gradient(180deg,#e8f8ff,#a9ddff);color:#051b2f;box-shadow:0 0 14px rgba(18,169,255,.37);}
.gl-footer { display:none; } /* Steam supplies its own Game Mode footer. */
@media (max-height:700px) {
  .gl-root { padding-top:43px;padding-bottom:32px; }
  .gl-filterbar {flex-basis:59px;}
  .gl-feature-content {padding:12px 24px;}
  .gl-metrics {margin-bottom:10px;}
  .gl-feature h1 {font-size:clamp(21px,3vw,29px);}
}
@media (max-width:900px) {
  .gl-main {padding:0 20px;}
  .gl-feature {margin-right:-20px;}
  .gl-feature-content {width:min(580px,78%);}
}

/* Custom Steam title artwork — preserve the transparent logo aspect ratio. */
.gl-game-logo {
  display:block; width:auto; max-width:min(390px,96%); max-height:72px;
  object-fit:contain; object-position:left center; margin:0 0 9px;
  filter:drop-shadow(0 2px 9px rgba(0,0,0,.62));
}
.gl-feature-content { width:min(775px,74%); padding:14px 28px; }
.gl-feature h1 { font-size:clamp(22px,2.65vw,34px); }
.gl-metrics { align-items:stretch; gap:8px; }
.gl-metric { flex:1 1 0; padding:10px; gap:7px; }
.gl-hltb { flex:1.65 1 0; min-width:190px; }
.gl-hltb-icon { font-size:22px; align-self:flex-start; }
.gl-hltb-body { min-width:0; flex:1; display:block; }
.gl-hltb-body small { display:block; margin-bottom:5px; letter-spacing:.02em; }
.gl-hltb-values {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}
.gl-hltb-values span {display:flex;flex-direction:column;gap:2px;}
.gl-hltb-values em {font-size:10px;font-style:normal;color:#a7c8e7;white-space:nowrap;}
.gl-hltb-values strong {font-size:16px;color:#fff;white-space:nowrap;}
.gl-hltb-empty {font-size:13px;color:#dceafa;display:block;white-space:nowrap;}
@media (max-height:730px) {
  .gl-game-logo {max-height:53px;margin-bottom:5px;}
  .gl-feature-content {padding:8px 22px;}
  .gl-feature h1 {font-size:24px;}
  .gl-desc {margin-bottom:6px;}
  .gl-status {margin-bottom:8px;}
  .gl-metric {padding:7px 6px;}
  .gl-hltb {min-width:175px;}
}
@media (max-width:1000px) {
  .gl-feature-content {width:83%;}
  .gl-metrics {gap:5px;}
  .gl-hltb {min-width:157px;}
  .gl-hltb-icon {display:none;}
  .gl-hltb-values {gap:3px;}
  .gl-hltb-values strong {font-size:13px;}
  .gl-hltb-values em {font-size:9px;}
}

/* Compact HLTB 3-column typography. Important: .gl-metric div from the
 * base theme had higher specificity than .gl-hltb-values and forced a
 * vertical flex column on the metrics, creating a giant card. */
.gl-metrics {
  display:flex;align-items:stretch;gap:8px;max-width:100%;
  margin-bottom:12px;
}
.gl-metric { flex:1 1 0; min-width:0; height:80px; min-height:80px; max-height:80px;
  padding:9px 10px; align-items:center; }
.gl-metric>svg {font-size:19px;}
.gl-hltb {flex:1.95 1 0; min-width:0; align-items:center;}
.gl-metric .gl-hltb-body {display:block;flex:1;min-width:0;}
.gl-metric .gl-hltb-body small {display:block;font-size:9px;line-height:1.2;
  margin-bottom:8px;color:#bbd4ef;font-weight:700;}
.gl-metric .gl-hltb-values {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
  column-gap:9px;row-gap:0;min-width:0;}
.gl-hltb-values span {min-width:0;display:flex;flex-direction:column;gap:3px;}
.gl-hltb-values em {display:block;font-size:10px;line-height:1.1;
  font-style:normal;color:#a9c2df;}
.gl-hltb-values strong {display:block;font-size:16px;line-height:1.1;
  font-weight:750;overflow:visible;white-space:nowrap;color:#f5faff;}
.gl-hltb-icon {font-size:19px;align-self:center;}
.gl-hltb-empty {font-size:13px;white-space:nowrap;}
/* A community ProtonDB badge on its own row ABOVE Installed, not mixed with
 * Steam's separate compatibility/verification categories. */
.gl-proton-row {display:flex;justify-content:flex-start;align-items:center;
  margin:0 0 7px;}
.gl-proton-badge {display:inline-flex;align-items:center;gap:7px;
  min-height:24px;padding:3px 9px;border-radius:6px;
  background:rgba(10,23,43,.83);border:1px solid rgba(130,157,193,.48);
  color:#d9e6f7;font-size:12px;white-space:nowrap;line-height:1.2;
  backdrop-filter:blur(8px);}
.gl-proton-badge strong {font-size:12px;font-weight:750;letter-spacing:.02em;}
.gl-proton-source {font-size:11px;color:#bacce0;font-weight:650;}
.gl-proton-icon {font-size:15px;}
.gl-proton-badge.platinum {border-color:#b6e3fa;color:#d1f0ff;}
.gl-proton-badge.gold {border-color:#ebc363;color:#f7d477;}
.gl-proton-badge.silver {border-color:#c5cedc;color:#e1e9f3;}
.gl-proton-badge.bronze {border-color:#c99570;color:#e5b08e;}
.gl-proton-badge.borked {border-color:#f27986;color:#ff9da7;}
.gl-proton-badge.unknown {border-color:rgba(139,166,200,.35);color:#b3c2d4;}
@media (max-height:730px) {
  .gl-metric {height:70px;min-height:70px;max-height:70px;padding:6px 8px;}
  .gl-proton-row {margin-bottom:5px;}
  .gl-metrics {margin-bottom:8px;gap:6px;}
  .gl-metric .gl-hltb-body small {font-size:8px;margin-bottom:6px;}
  .gl-hltb-values strong {font-size:14px;}
}
@media (max-width:1000px) {
  .gl-metric {padding:7px;gap:5px;}
  .gl-metric .gl-hltb-values {column-gap:4px;}
  .gl-hltb-values em {font-size:9px;}
  .gl-hltb-values strong {font-size:13px;}
  .gl-hltb-icon {display:none;}
}

/* Unified status row: ProtonDB tier sits level with Installed / Non-Steam. */
.gl-status {display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:11px;}
.gl-status > span {display:inline-flex;align-items:center;gap:6px;min-height:26px;}
.gl-status .gl-proton-row {display:inline-flex;align-items:center;margin:0;min-height:26px;}
.gl-status .gl-proton-badge {min-height:25px;padding:3px 8px;}
.gl-status .gl-proton-badge .gl-proton-source {display:inline;font-size:11px;}

/* Fifteen recent game tiles followed by a keyboard/controller-focusable CTA. */
.gl-view-more {
  width:clamp(112px,10vw,168px);height:197px;flex:0 0 clamp(112px,10vw,168px);
  border-radius:12px;border:1px solid rgba(109,190,255,.42);
  background:linear-gradient(145deg,#173a64,#07172d 85%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:10px;color:#e4f6ff;outline:none;box-shadow:inset 0 0 16px #03274877;
}
.gl-view-more svg {color:#6bcfff;}
.gl-view-more strong {font-size:16px;font-weight:750;white-space:nowrap;}
.gl-view-more span {font-size:12px;color:#afcfe5;}
.gl-view-more.gl-focused,.gl-view-more:hover {
  background:linear-gradient(145deg,#2265a4,#0b2b52);
  box-shadow:0 0 0 3px #e9faff,0 0 22px #26b9ff;
}

/* View More page: same art/titles/borders as the carousel, now in a grid. */
.gl-grid-page {display:flex;flex-direction:column;flex:1;min-height:0;padding:10px 0 4px;}
.gl-grid-heading {display:flex;justify-content:space-between;align-items:center;
  gap:24px;flex:0 0 63px;padding:0 8px 12px;}
.gl-grid-heading h2 {font-size:24px;font-weight:750;margin:0 0 4px;color:#f5faff;}
.gl-grid-heading span {font-size:12px;color:#a3bfdd;}
.gl-grid-back {display:flex;align-items:center;gap:8px;padding:10px 14px;
  border:1px solid #375b80;border-radius:10px;background:#102945;font-size:13px;
  color:#e2f2ff;white-space:nowrap;}
.gl-grid-back.gl-focused {box-shadow:0 0 0 2px #dcf7ff,0 0 14px #31acff;}
.gl-full-grid-scroll {flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;
  padding:8px 7px 16px;overscroll-behavior:contain;scrollbar-width:thin;
  scrollbar-color:#35658c #07172c;}
.gl-full-grid {display:grid;grid-template-columns:repeat(6,minmax(0,1fr));
  gap:22px 17px;align-content:start;align-items:start;}
.gl-full-grid .gl-game {display:block;width:100%;height:220px;max-width:none;
  flex:none;min-width:0;}
.gl-full-grid .gl-game.gl-focused {transform:translateY(-2px);}
.gl-full-grid .gl-poster-name {font-size:14px;}
.gl-grid-hint {flex:0 0 27px;display:flex;align-items:center;justify-content:center;
  font-size:12px;color:#a8c5df;border-top:1px solid #153c60;}
@media (max-width:1100px) {
  .gl-full-grid {grid-template-columns:repeat(5,minmax(0,1fr));gap:18px 13px;}
  .gl-full-grid .gl-game {height:195px;}
}
@media (max-width:860px) {
  .gl-full-grid {grid-template-columns:repeat(4,minmax(0,1fr));gap:14px 10px;}
  .gl-full-grid .gl-game {height:172px;}
  .gl-grid-heading h2 {font-size:20px;}
}
@media (max-height:700px) {
  .gl-view-more {height:150px;}
  .gl-grid-heading {flex-basis:52px;}
  .gl-full-grid .gl-game {height:166px;}
  .gl-status {gap:8px;margin-bottom:8px;}
}

/* Full-screen selected-game hero. One image fills the entire Home viewport,
 * behind filters, carousel and details. The grid view does not render it.
 * Keep the native Steam system status/footer layers above this scene. */
.gl-main {
  isolation:isolate;
  background:transparent;
}
.gl-scene {
  position:absolute;
  top:-48px;
  right:-32px;
  bottom:-38px;
  left:-32px;
  z-index:0;
  overflow:hidden;
  pointer-events:none;
  background:linear-gradient(120deg,#020b1d,#0a2b4c 70%,#091428);
}
.gl-scene .gl-hero {
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  object-position:center center;
  opacity:1;
  filter:saturate(1.07) contrast(1.05);
}
.gl-scene-shade {
  position:absolute;
  inset:0;
  background:
    linear-gradient(90deg,
      rgba(2,8,22,.98) 0%,
      rgba(2,11,27,.94) 21%,
      rgba(2,13,30,.78) 39%,
      rgba(3,14,30,.38) 60%,
      rgba(3,14,30,.08) 82%,
      transparent 100%),
    linear-gradient(180deg,
      rgba(2,8,20,.67) 0%,
      rgba(2,9,21,.25) 25%,
      transparent 43%,
      transparent 73%,
      rgba(2,8,20,.32) 100%);
}
.gl-main > :not(.gl-scene) {
  position:relative;
  z-index:1;
}
.gl-feature {
  background:transparent;
  box-shadow:none;
}
.gl-feature-content {
  position:relative;
  z-index:1;
}
.gl-strip,.gl-filterbar {
  background:transparent;
}
@media (max-height:700px) {
  .gl-scene {top:-43px;bottom:-32px;}
}
@media (max-width:900px) {
  .gl-scene {left:-20px;right:-20px;}
}
/* The left navigation remains above the full-bleed art. */
.gl-sidebar {z-index:4;}

/* Steam achievement progress card: faithful compact trophy / 28 of 45 /
 * cyan progress line from the approved Game Library reference. */
.gl-metric.gl-achievement-card {
  flex:1.25 1 0;
  align-items:center;
  min-width:0;
}
.gl-achievement-card .gl-achievement-icon {
  font-size:19px;
  color:#d6e6f8;
  flex:0 0 auto;
}
.gl-metric .gl-achievement-content {
  display:flex;
  flex-direction:column;
  min-width:0;
  flex:1;
  gap:7px;
}
.gl-metric .gl-achievement-content small {
  font-size:9px;
  color:#bed1e4;
  letter-spacing:.02em;
  font-weight:750;
  white-space:nowrap;
}
.gl-metric .gl-achievement-stats {
  display:flex;
  flex-direction:row;
  align-items:center;
  min-width:0;
  gap:8px;
  width:100%;
}
.gl-metric .gl-achievement-stats strong {
  display:block;
  flex:none;
  font-size:15px;
  font-weight:760;
  color:#f4fbff;
  overflow:visible;
  line-height:1.2;
  white-space:nowrap;
}
.gl-metric .gl-achievement-track {
  display:block;
  position:relative;
  height:6px;
  min-width:30px;
  max-width:90px;
  flex:1 1 auto;
  overflow:hidden;
  border-radius:8px;
  background:rgba(135,166,197,.25);
}
.gl-metric .gl-achievement-track > span {
  display:block;
  height:100%;
  background:linear-gradient(90deg,#0aa9f1,#5bd4ff);
  border-radius:inherit;
  box-shadow:0 0 7px rgba(12,187,255,.5);
}
@media (max-width:1000px){
  .gl-metric .gl-achievement-stats {gap:5px;}
  .gl-metric .gl-achievement-stats strong {font-size:13px;}
  .gl-achievement-card .gl-achievement-icon {display:none;}
  .gl-metric .gl-achievement-track {min-width:23px;}
}
@media (max-height:730px){
  .gl-metric .gl-achievement-content {gap:5px;}
  .gl-metric .gl-achievement-content small {font-size:8px;}
}

/* v0.4.0 — focus-expand navigation rail.
 * Flex width animation genuinely pushes the dashboard instead of covering it.
 * Controller focus remains on the original rail item throughout the motion. */
.gl-root {
  --gl-nav-closed-width: 76px;
  --gl-nav-open-width: 218px;
  --gl-nav-motion: 220ms cubic-bezier(.22,1,.36,1);
}
.gl-root .gl-sidebar {
  width:var(--gl-nav-closed-width);
  flex:0 0 var(--gl-nav-closed-width);
  min-width:0;
  overflow:visible;
  transition:
    width var(--gl-nav-motion),
    flex-basis var(--gl-nav-motion),
    background-color var(--gl-nav-motion);
  will-change:width,flex-basis;
}
.gl-root.gl-nav-expanded .gl-sidebar {
  width:var(--gl-nav-open-width);
  flex-basis:var(--gl-nav-open-width);
  background:linear-gradient(180deg,rgba(7,23,43,.985),rgba(3,12,28,.99));
}
.gl-root .gl-rail {
  align-items:flex-start;
  width:100%;
}
.gl-root .gl-rail-item {
  justify-content:flex-start;
  width:54px;
  height:54px;
  padding:0 13px;
  gap:0;
  overflow:hidden;
  border-radius:12px;
  transition:
    width var(--gl-nav-motion),
    background-color 150ms ease,
    box-shadow 150ms ease;
}
.gl-root.gl-nav-expanded .gl-rail-item {
  width:100%;
  gap:13px;
}
.gl-root .gl-rail-icon {
  flex:0 0 27px;
  width:27px;
  height:27px;
}
.gl-root .gl-rail .gl-rail-label,
.gl-root .gl-rail-item.gl-focused .gl-rail-label,
.gl-root .gl-rail-item:hover .gl-rail-label {
  display:block;
  position:static;
  padding:0;
  margin:0;
  min-width:0;
  max-width:0;
  white-space:nowrap;
  overflow:hidden;
  background:none;
  border:none;
  box-shadow:none;
  font-size:14px;
  line-height:1.25;
  font-weight:650;
  color:inherit;
  opacity:0;
  visibility:hidden;
  transform:translateX(-6px);
  pointer-events:none;
  transition:
    max-width var(--gl-nav-motion),
    opacity 140ms ease,
    transform var(--gl-nav-motion),
    visibility 0ms linear 220ms;
}
.gl-root.gl-nav-expanded .gl-rail .gl-rail-label {
  max-width:150px;
  opacity:1;
  visibility:visible;
  transform:translateX(0);
  transition:
    max-width var(--gl-nav-motion),
    opacity 150ms ease 50ms,
    transform var(--gl-nav-motion),
    visibility 0ms linear 0ms;
}
.gl-root .gl-main {
  min-width:0;
  transition:padding var(--gl-nav-motion);
}
@media (max-width:900px) {
  .gl-root {
    --gl-nav-closed-width:66px;
    --gl-nav-open-width:204px;
  }
}
@media (prefers-reduced-motion:reduce) {
  .gl-root .gl-sidebar,
  .gl-root .gl-rail-item,
  .gl-root .gl-rail .gl-rail-label {
    transition-duration:0ms !important;
    transition-delay:0ms !important;
  }
}

/* v0.4.5 — truly floating glass navigation bar.
 * Keep within our dashboard only; do not draw over native Steam overlay roots
 * and leave Steam's compositor/notifications unchanged. */
.gl-root {
  padding-top:26px;
}
.gl-scene {
  top:-26px;
}
.gl-main > .gl-header.gl-library-topbar {
  display:flex;
  flex:0 0 51px;
  height:51px;
  min-height:51px;
  margin:0 0 8px;
  padding:0 16px 0 23px;
  min-width:0;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  border:1px solid rgba(166,217,254,.27);
  border-radius:17px;
  background:linear-gradient(115deg,rgba(14,35,63,.79),rgba(8,24,46,.69));
  box-shadow:0 10px 27px rgba(0,9,27,.28),inset 0 1px 0 rgba(217,239,255,.10);
  backdrop-filter:blur(15px) saturate(1.18);
  -webkit-backdrop-filter:blur(15px) saturate(1.18);
}
.gl-topbar-titles {
  display:flex;
  flex:1 1 auto;
  align-items:center;
  min-width:0;
}
.gl-topbar-current {
  display:block;
  max-width:100%;
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  color:#f4faff;
  font-size:clamp(22px,2.5vw,31px);
  font-weight:790;
  letter-spacing:-.025em;
  line-height:1.1;
  text-shadow:0 1px 10px rgba(0,0,0,.28);
}
.gl-topbar-status {
  flex:0 0 auto;
  display:flex;
  flex-direction:row;
  align-items:center;
  gap:8px;
  min-width:0;
  color:#e8f6ff;
}
.gl-topbar-icon,.gl-topbar-battery,.gl-topbar-avatar {
  display:inline-flex;
  position:relative;
  flex:0 0 auto;
  align-items:center;
  justify-content:center;
  color:#d9eeff;
  border-radius:10px;
  min-height:30px;
  outline:none;
}
.gl-topbar-icon {
  width:28px;
  font-size:19px;
}
.gl-topbar-icon.gl-focused,.gl-topbar-battery.gl-focused,.gl-topbar-avatar.gl-focused,
.gl-topbar-icon:hover,.gl-topbar-battery:hover,.gl-topbar-avatar:hover {
  background:rgba(41,101,152,.62);
  box-shadow:0 0 0 2px #bde9ff;
}
.gl-topbar-icon.gl-status-dim {
  opacity:.45;
}
.gl-topbar-unread {
  position:absolute;
  top:-3px;
  right:-4px;
  display:block;
  min-width:14px;
  height:14px;
  padding:0 3px;
  border-radius:7px;
  background:#4ac1ff;
  color:#031627;
  font-size:9px;
  font-weight:800;
  line-height:14px;
  text-align:center;
}
.gl-topbar-battery {gap:3px;padding:0 3px;}
.gl-topbar-battery-icon {display:flex;align-items:center;font-size:25px;}
.gl-topbar-battery-icon.gl-battery-charging {color:#6de2ff;}
.gl-topbar-battery-percent {font-size:12px;font-weight:750;font-variant-numeric:tabular-nums;}
.gl-topbar-avatar {width:31px;height:31px;overflow:hidden;background:rgba(48,89,122,.46);}
.gl-topbar-avatar img {display:block;width:100%;height:100%;object-fit:cover;border-radius:9px;}
.gl-topbar-avatar svg {font-size:27px;}

.gl-topbar-search {
  flex:0 0 33px;
  width:33px;
  height:33px;
  border:1px solid rgba(136,198,247,.25);
  border-radius:11px;
  background:rgba(30,61,98,.55);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:19px;
  color:#d6f0ff;
}
.gl-topbar-search.gl-focused,
.gl-topbar-search:hover {
  background:rgba(38,100,154,.80);
  border-color:#8dd8ff;
  box-shadow:0 0 0 2px #d9f4ff,0 0 12px rgba(39,167,245,.37);
}
.gl-topbar-clock {
  display:block;
  min-width:52px;
  text-align:right;
  font-size:14px;
  font-weight:700;
  color:#d5e8fa;
  font-variant-numeric:tabular-nums;
  white-space:nowrap;
}
.gl-main > .gl-filterbar {
  flex-basis:56px;
  min-height:0;
  gap:12px;
}
.gl-filterbar .gl-pill,
.gl-filterbar .gl-sort {
  background:rgba(12,33,58,.66);
  border:1px solid rgba(138,191,236,.29);
  border-radius:999px;
  box-shadow:inset 0 1px 0 rgba(214,242,255,.09),0 4px 13px rgba(0,11,27,.18);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
}
.gl-filterbar .gl-pill.gl-active {
  background:linear-gradient(160deg,#a9ddff,#71c4f6);
  color:#071a30;
  border-color:#a7e1ff;
  box-shadow:0 2px 16px rgba(41,169,249,.30);
}
.gl-filterbar .gl-pill.gl-focused,
.gl-filterbar .gl-sort.gl-focused {
  box-shadow:0 0 0 2px #eaf8ff,0 0 17px rgba(35,182,255,.57);
}
@media (max-height:730px) {
  .gl-root {padding-top:20px;}
  .gl-scene {top:-20px;}
  .gl-main > .gl-header.gl-library-topbar {
    flex-basis:44px;
    height:44px;
    min-height:44px;
    border-radius:14px;
    margin-bottom:5px;
  }
  .gl-topbar-current {font-size:clamp(20px,2.5vw,25px);}
  .gl-main > .gl-filterbar {flex-basis:49px;}
}
@media (max-width:900px) {
  .gl-main > .gl-header.gl-library-topbar {
    padding:0 11px 0 16px;
    border-radius:14px;
  }
  .gl-topbar-current {font-size:clamp(19px,2.5vw,24px);}
  .gl-topbar-status {gap:4px;}
  .gl-topbar-icon {width:23px;font-size:17px;}
  .gl-topbar-battery-icon {font-size:22px;}
  .gl-topbar-battery-percent {font-size:11px;}
  .gl-topbar-avatar {width:26px;height:26px;}
  .gl-topbar-avatar svg {font-size:24px;}
  .gl-topbar-clock {font-size:12px;min-width:44px;}
  .gl-topbar-search {width:30px;height:30px;flex-basis:30px;}
}
@media (max-width:720px) {
  .gl-main > .gl-header.gl-library-topbar {padding:0 7px 0 11px;gap:6px;}
  .gl-topbar-current {font-size:18px;}
  .gl-topbar-status {gap:2px;}
  .gl-topbar-icon {width:20px;}
  .gl-topbar-clock {min-width:38px;font-size:11px;}
  .gl-topbar-battery {gap:1px;padding:0;}
  .gl-topbar-search {width:24px;height:28px;flex-basis:24px;}

}


/* v0.4.7 — full-height navigation, separate tab heading, pill status,
 * and larger carousel posters. Dashboard-scoped only: native Steam overlay
 * surfaces remain transparent for volume and achievement notifications. */
.gl-root {
  padding:0;
}
.gl-root .gl-sidebar {
  align-self:stretch;
  height:100%;
  min-height:0;
}
.gl-root .gl-main {
  padding-top:20px;
  padding-bottom:30px;
}
.gl-root .gl-scene {
  top:0;
  bottom:0;
}
/* Header itself is transparent. The title sits OUTSIDE the glass pill. */
.gl-main > .gl-header.gl-library-topbar {
  flex:0 0 45px;
  height:45px;
  min-height:45px;
  margin:0 0 7px;
  padding:0;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  border:0;
  border-radius:0;
  background:transparent;
  box-shadow:none;
  backdrop-filter:none;
  -webkit-backdrop-filter:none;
}
.gl-main .gl-topbar-titles {
  flex:1 1 auto;
  min-width:0;
}
.gl-main .gl-topbar-current {
  font-size:clamp(23px,2.55vw,31px);
  font-weight:790;
  text-shadow:0 2px 10px rgba(0,0,0,.36);
}
/* Only the real system icons, battery, time and avatar share the pill. */
.gl-main .gl-topbar-status {
  width:max-content;
  max-width:75%;
  flex:0 0 auto;
  padding:3px 9px;
  gap:8px;
  border:1px solid rgba(155,210,254,.28);
  border-radius:999px;
  background:linear-gradient(110deg,rgba(16,35,61,.82),rgba(12,30,54,.72));
  box-shadow:0 6px 20px rgba(0,8,25,.25),inset 0 1px 0 rgba(218,241,255,.12);
  backdrop-filter:blur(14px) saturate(1.13);
  -webkit-backdrop-filter:blur(14px) saturate(1.13);
}
.gl-main .gl-topbar-search,
.gl-main .gl-topbar-avatar {
  border-radius:999px;
}
.gl-main .gl-topbar-avatar img {
  border-radius:999px;
}
.gl-main .gl-topbar-search {
  border-color:transparent;
  background:rgba(42,80,121,.39);
}
/* Consume the space formerly used by carousel count/navigation hints. */
.gl-main > .gl-strip {
  height:268px;
  padding:10px 4px 14px;
  gap:13px;
}
.gl-main .gl-strip .gl-game,
.gl-main .gl-strip .gl-view-more {
  width:clamp(136px,11.6vw,182px);
  flex:0 0 clamp(136px,11.6vw,182px);
  height:238px;
}
.gl-main .gl-strip .gl-poster-name {
  font-size:clamp(13px,1.15vw,16px);
}
@media (max-height:730px) {
  .gl-root {padding:0;}
  .gl-root .gl-main {padding-top:15px;padding-bottom:27px;}
  .gl-root .gl-scene {top:0;bottom:0;}
  .gl-main > .gl-header.gl-library-topbar {
    flex-basis:40px;
    height:40px;
    min-height:40px;
    margin-bottom:5px;
  }
  .gl-main .gl-topbar-current {font-size:clamp(21px,2.5vw,26px);}
  .gl-main .gl-topbar-status {padding:2px 7px;}
  .gl-main > .gl-strip {height:219px;padding:8px 4px 12px;}
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {height:195px;}
}
@media (max-height:650px) {
  .gl-main > .gl-strip {height:197px;padding:7px 4px 10px;}
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {height:178px;}
}
@media (max-width:900px) {
  .gl-main .gl-topbar-status {gap:4px;padding:2px 7px;}
  .gl-main .gl-topbar-current {font-size:clamp(20px,2.5vw,26px);}
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {
    width:clamp(128px,12.5vw,168px);
    flex-basis:clamp(128px,12.5vw,168px);
  }
}

/* v0.4.8 — unmistakable controller focus, with a quieter idle primary.
 * Restrict all emphasis to the Game Library action buttons, not Steam's
 * QAM/system controls. Keep ring visible for gamepad and keyboard users. */
.gl-root .gl-feature .gl-actions .gl-button {
  position:relative;
  outline:0;
  transition:transform 140ms ease, background-color 140ms ease,
    box-shadow 140ms ease, border-color 140ms ease;
}
.gl-root .gl-feature .gl-actions .gl-button.gl-primary:not(.gl-focused):not(:focus-visible) {
  background:linear-gradient(180deg,#d9f1ff,#a9ddff);
  box-shadow:0 3px 11px rgba(18,169,255,.15);
}
.gl-root .gl-feature .gl-actions .gl-button:is(.gl-focused,.gpfocus,:focus-visible,:focus-within) {
  z-index:2;
  transform:translateY(-2px);
  border-color:#f3fbff;
  box-shadow:0 0 0 3px #fff,0 0 0 6px #189fff,
    0 0 23px rgba(30,175,255,.78);
}
.gl-root .gl-feature .gl-actions .gl-button.gl-primary:is(.gl-focused,.gpfocus,:focus-visible,:focus-within) {
  background:linear-gradient(180deg,#f5fdff,#c5eeff);
  color:#04172c;
}
.gl-root .gl-feature .gl-actions .gl-button:not(.gl-primary):is(.gl-focused,.gpfocus,:focus-visible,:focus-within) {
  background:linear-gradient(180deg,#24629a,#10416c);
  color:#fff;
}
@media (prefers-reduced-motion:reduce) {
  .gl-root .gl-feature .gl-actions .gl-button {
    transition:none;
  }
  .gl-root .gl-feature .gl-actions .gl-button:is(.gl-focused,.gpfocus,:focus-visible,:focus-within) {
    transform:none;
  }
}
/* Slightly larger main-carousel cards, not the full-library grid.
 * Keep the selected game's details and bottom Game Mode footer visible. */
.gl-main > .gl-strip {
  height:285px;
  padding:11px 4px 15px;
}
.gl-main .gl-strip .gl-game,
.gl-main .gl-strip .gl-view-more {
  width:clamp(145px,12.3vw,192px);
  flex-basis:clamp(145px,12.3vw,192px);
  height:254px;
}
@media (max-height:730px) {
  .gl-main > .gl-strip {height:233px;padding:9px 4px 13px;}
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {height:207px;}
}
@media (max-height:650px) {
  .gl-main > .gl-strip {height:207px;padding:7px 4px 12px;}
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {height:188px;}
}
@media (max-width:900px) {
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {
    width:clamp(136px,13.2vw,180px);
    flex-basis:clamp(136px,13.2vw,180px);
  }
}


/* v0.4.12 — enlarged dashboard carousel and hero information.
 * Only the home carousel and selected game are affected. The full grid,
 * controller focus, navigation rail and native Steam status/footer stay put. */
.gl-main > .gl-strip {
  height:306px;
  padding:11px 4px 15px;
  gap:14px;
}
.gl-main .gl-strip .gl-game,
.gl-main .gl-strip .gl-view-more {
  width:clamp(151px,13vw,208px);
  flex:0 0 clamp(151px,13vw,208px);
  height:274px;
}
.gl-main .gl-strip .gl-poster-name {
  font-size:clamp(14px,1.2vw,17px);
  line-height:1.17;
}
.gl-main .gl-feature-content {
  width:min(960px,89%);
  padding:10px 26px;
  min-width:0;
}
.gl-main .gl-feature .gl-game-logo {
  max-height:80px;
  max-width:min(460px,100%);
  margin-bottom:6px;
}
.gl-main .gl-feature h1 {
  font-size:clamp(28px,3.15vw,40px);
  line-height:1.10;
  margin-bottom:5px;
}
.gl-main .gl-feature .gl-status {
  gap:14px;
  margin-bottom:9px;
}
.gl-main .gl-feature .gl-status > span {
  font-size:15px;
}
.gl-main .gl-feature .gl-metrics {
  width:100%;
  max-width:100%;
  gap:10px;
  margin-bottom:12px;
  align-items:stretch;
}
.gl-main .gl-feature .gl-metric {
  height:92px;
  min-height:92px;
  max-height:92px;
  padding:12px;
  gap:9px;
  font-size:25px;
  min-width:0;
}
.gl-main .gl-feature .gl-metric > svg {
  font-size:23px;
}
.gl-main .gl-feature .gl-metric small {
  font-size:11px;
}
.gl-main .gl-feature .gl-metric strong {
  font-size:18px;
}
.gl-main .gl-feature .gl-hltb {
  flex:1.95 1 0;
  min-width:0;
}
.gl-main .gl-feature .gl-hltb .gl-hltb-body small {
  font-size:10px;
  margin-bottom:9px;
}
.gl-main .gl-feature .gl-hltb .gl-hltb-values {
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:0 9px;
}
.gl-main .gl-feature .gl-hltb .gl-hltb-values em {
  font-size:11px;
}
.gl-main .gl-feature .gl-hltb .gl-hltb-values strong {
  font-size:18px;
}
.gl-main .gl-feature .gl-achievement-card {
  flex:1.25 1 0;
}
.gl-main .gl-feature .gl-achievement-card .gl-achievement-content {
  gap:9px;
}
.gl-main .gl-feature .gl-achievement-card .gl-achievement-stats strong {
  font-size:17px;
}
.gl-main .gl-feature .gl-achievement-track {
  height:7px;
}
.gl-main .gl-feature .gl-actions .gl-button {
  font-size:17px;
  min-width:156px;
  padding:12px 23px;
}
@media (max-height:730px) {
  .gl-main > .gl-strip {
    height:239px;
    padding:9px 4px 14px;
  }
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {height:213px;}
  .gl-main .gl-feature-content {padding:9px 21px;}
  .gl-main .gl-feature .gl-game-logo {max-height:64px;margin-bottom:5px;}
  .gl-main .gl-feature h1 {font-size:30px;margin-bottom:4px;}
  .gl-main .gl-feature .gl-status {gap:11px;margin-bottom:8px;}
  .gl-main .gl-feature .gl-metrics {gap:7px;margin-bottom:9px;}
  .gl-main .gl-feature .gl-metric {
    height:84px;min-height:84px;max-height:84px;padding:8px 9px;gap:7px;
  }
  .gl-main .gl-feature .gl-metric > svg {font-size:20px;}
  .gl-main .gl-feature .gl-metric strong {font-size:16px;}
  .gl-main .gl-feature .gl-hltb .gl-hltb-body small {font-size:9px;margin-bottom:7px;}
  .gl-main .gl-feature .gl-hltb .gl-hltb-values em {font-size:10px;}
  .gl-main .gl-feature .gl-hltb .gl-hltb-values strong {font-size:16px;}
  .gl-main .gl-feature .gl-achievement-card .gl-achievement-stats strong {font-size:15px;}
  .gl-main .gl-feature .gl-actions .gl-button {padding:10px 20px;}
}
@media (max-height:650px) {
  .gl-main > .gl-strip {height:218px;padding:8px 4px 12px;}
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {height:196px;}
  .gl-main .gl-feature-content {padding:7px 19px;}
  .gl-main .gl-feature .gl-game-logo {max-height:52px;margin-bottom:4px;}
  .gl-main .gl-feature h1 {font-size:26px;}
  .gl-main .gl-feature .gl-status {margin-bottom:6px;}
  .gl-main .gl-feature .gl-metrics {gap:6px;margin-bottom:7px;}
  .gl-main .gl-feature .gl-metric {
    height:75px;min-height:75px;max-height:75px;padding:6px 8px;gap:5px;
  }
  .gl-main .gl-feature .gl-metric strong {font-size:15px;}
  .gl-main .gl-feature .gl-hltb .gl-hltb-values strong {font-size:15px;}
  .gl-main .gl-feature .gl-actions .gl-button {padding:9px 18px;}
}
@media (max-height:610px) {
  .gl-main > .gl-strip {height:200px;padding:7px 4px 10px;}
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {height:181px;}
  .gl-main .gl-feature .gl-game-logo {max-height:44px;margin-bottom:3px;}
  .gl-main .gl-feature h1 {font-size:24px;}
  .gl-main .gl-feature .gl-status > span {font-size:13px;}
  .gl-main .gl-feature .gl-metric {
    height:69px;min-height:69px;max-height:69px;padding:5px 7px;
  }
}
@media (max-width:1000px) {
  .gl-main .gl-feature-content {width:94%;padding-left:18px;padding-right:18px;}
  .gl-main .gl-feature .gl-metrics {gap:6px;}
  .gl-main .gl-feature .gl-metric {padding-left:7px;padding-right:7px;gap:5px;}
  .gl-main .gl-feature .gl-metric small {font-size:9px;}
  .gl-main .gl-feature .gl-hltb .gl-hltb-values {column-gap:4px;}
  .gl-main .gl-feature .gl-hltb .gl-hltb-values em {font-size:9px;}
  .gl-main .gl-feature .gl-hltb .gl-hltb-values strong {font-size:clamp(13px,1.7vw,16px);}
  .gl-main .gl-feature .gl-achievement-card .gl-achievement-stats strong {font-size:14px;}
}
@media (max-width:900px) {
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {
    width:clamp(141px,13.8vw,190px);
    flex-basis:clamp(141px,13.8vw,190px);
  }
}

`;
