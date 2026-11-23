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
  background:linear-gradient(135deg,#19416d,#071527); border:0;box-shadow:none; }
.gl-poster img { display:block; width:100%; height:100%; object-fit:cover; }
.gl-poster::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(0deg,rgba(1,5,12,.96),transparent 55%); }
.gl-poster-name { position:absolute; bottom:14px; left:10px; right:10px; z-index:1;
  font-size:14px; font-weight:800; line-height:1.18; text-shadow:0 1px 5px black; }
.gl-installed-indicator { position:absolute; right:7px; bottom:4px; font-size:20px; z-index:2; }
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
.gl-poster {border:0;box-shadow:none;background:linear-gradient(135deg,#14335a,#06101f);}
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
  border-radius:12px;border:0;
  background:linear-gradient(145deg,#173a64,#07172d 85%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:10px;color:#e4f6ff;outline:none;box-shadow:none;
}
.gl-view-more svg {color:#6bcfff;}
.gl-view-more strong {font-size:16px;font-weight:750;white-space:nowrap;}
.gl-view-more span {font-size:12px;color:#afcfe5;}
.gl-view-more.gl-focused {
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
/* Middle-height devices keep enlarged cards while reserving comfortable
 * vertical space for the expanded game logo, title and metrics. */
@media (max-height:820px) {
  .gl-main > .gl-strip {height:288px;padding:10px 4px 14px;}
  .gl-main .gl-strip .gl-game,
  .gl-main .gl-strip .gl-view-more {height:260px;}
  .gl-main .gl-feature .gl-game-logo {max-height:72px;margin-bottom:5px;}
  .gl-main .gl-feature h1 {font-size:36px;}
  .gl-main .gl-feature .gl-metrics {margin-bottom:11px;}
  .gl-main .gl-feature .gl-metric {
    height:88px;min-height:88px;max-height:88px;
  }
}
@media (max-height:770px) {
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
@media (max-height:680px) {
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


/* v0.4.20 — running game shortcut, visually consistent with focus-expand rail.
 * The green dot is status only; the focus outline is unchanged. A long game
 * title scrolls inside its own label and can never move the navigation icons. */
.gl-root .gl-rail-item.gl-running-item {
  position:relative;
}
.gl-root .gl-running-art {
  display:block;
  flex:0 0 27px;
  width:27px;
  height:27px;
  border-radius:6px;
  object-fit:cover;
  box-shadow:none;
}
.gl-root .gl-running-indicator {
  position:absolute;
  pointer-events:none;
  width:8px;
  height:8px;
  left:34px;
  top:7px;
  border-radius:50%;
  background:#46dfac;
  border:1px solid #0b2a31;
}
.gl-root .gl-rail-item.gl-running-item .gl-running-label {
  flex:1 1 0;
  min-width:0;
}
.gl-root.gl-nav-expanded .gl-rail-item.gl-running-item .gl-running-label {
  max-width:150px;
}
.gl-root .gl-running-title-viewport {
  display:block;
  width:100%;
  max-width:100%;
  min-width:0;
  overflow:hidden;
}
.gl-root .gl-running-title {
  display:inline-block;
  width:max-content;
  max-width:none;
  white-space:nowrap;
  transform:translateX(0);
}
.gl-root.gl-nav-expanded .gl-running-title.gl-marquee-active {
  animation:gl-running-title-news 8s ease-in-out infinite;
}
@keyframes gl-running-title-news {
  0%,15%,100% { transform:translateX(0); }
  47%,69% { transform:translateX(calc(-1 * var(--gl-marquee-distance))); }
}
@media (prefers-reduced-motion:reduce) {
  .gl-root .gl-running-title.gl-marquee-active {
    animation:none !important;
    max-width:100%;
    overflow:hidden;
    text-overflow:ellipsis;
  }
}


/* v0.5.6 — Midnight Library: D-pad/touch 11-criterion sort menu.
 * Only our .gl-root is affected; native Steam Library remains intact. */
.gl-root .gl-filterbar {position:relative;z-index:6;overflow:visible;}
.gl-root .gl-sort-menu {
  position:absolute;z-index:100;right:4px;top:calc(100% - 4px);
  width:min(440px,calc(100vw - 110px));
  max-height:calc(100vh - 150px);
  display:flex;flex-direction:column;gap:3px;
  overflow-y:auto;overflow-x:hidden;
  background:linear-gradient(160deg,rgba(7,25,45,.98),rgba(3,12,27,.99));
  border:1px solid rgba(99,207,255,.55);
  border-radius:16px;padding:12px;
  box-shadow:0 20px 55px rgba(0,0,0,.67),0 0 22px rgba(3,157,255,.18);
  overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#326d97 #08172a;
}
.gl-root .gl-sort-menu-title {
  color:#bdeeff;font-size:12px;font-weight:800;
  letter-spacing:.12em;padding:6px 12px 9px;
}
.gl-root .gl-sort-option {
  display:flex;align-items:center;justify-content:space-between;
  gap:8px;min-height:40px;padding:9px 11px;flex-shrink:0;
  border-radius:10px;cursor:pointer;background:rgba(17,43,68,.64);
  color:#d7eafa;border:1px solid transparent;
  font-weight:650;font-size:13px;line-height:1.3;
}
.gl-root .gl-sort-option svg {color:#69dbf6;flex-shrink:0;font-size:18px;}
.gl-root .gl-sort-option.gl-sort-selected {
  border-color:rgba(99,207,255,.42);background:#133c58;color:#f5fcff;
}
.gl-root .gl-sort-option.gl-focused,
.gl-root .gl-sort-option:focus-visible {
  background:#17577a;color:#fff;border-color:#63cfff;
  outline:2px solid #63cfff;outline-offset:-2px;
  box-shadow:0 0 17px rgba(3,157,255,.58);
}
.gl-root .gl-sort-menu-hint {
  font-size:11px;color:#aec7df;padding:8px 12px 2px;text-align:center;
}
/* v0.5.6-test.4 — Sort metadata status is distinct from native B footer.
 * Full Library: dedicated flex row below the page heading (never covers
 * controller hint or game covers). Home: a compact overlay near the top tabs.
 * No spinner or pulsing animation that distracts while long HLTB requests run.
 */
.gl-root .gl-sort-progress-slot {
  pointer-events:none;
}
.gl-root .gl-sort-progress-grid {
  flex:0 0 auto;
  min-height:0;
  display:flex;
  justify-content:flex-end;
  padding:0 8px 10px;
}
.gl-root .gl-sort-progress-home {
  position:absolute;
  z-index:5;
  top:132px;
  right:22px;
  width:min(420px,calc(100% - 44px));
}
.gl-root .gl-sort-progress {
  display:flex;
  flex-direction:column;
  gap:8px;
  width:min(420px,100%);
  padding:12px 14px 10px;
  color:#e9f6ff;
  border:1px solid rgba(103,211,255,.72);
  border-left:3px solid #59d8ff;
  border-radius:12px;
  background:linear-gradient(135deg,rgba(12,43,72,.98),rgba(4,17,34,.98));
  box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 18px rgba(0,167,255,.20);
}
.gl-root .gl-sort-progress-top {
  display:flex;
  align-items:center;
  gap:11px;
  min-width:0;
}
.gl-root .gl-sort-progress-icon {
  flex:0 0 34px;
  height:34px;
  display:grid;
  place-items:center;
  border-radius:9px;
  background:rgba(59,175,233,.17);
  border:1px solid rgba(95,208,255,.27);
  color:#67d9ff;
  font-size:21px;
}
.gl-root .gl-sort-progress-name {
  display:flex;
  flex:1 1 auto;
  min-width:0;
  flex-direction:column;
  gap:3px;
}
.gl-root .gl-sort-progress-name strong {
  font-size:12px;
  line-height:1.25;
  font-weight:800;
  color:#bbebff;
  letter-spacing:.04em;
}
.gl-root .gl-sort-progress-name span {
  font-size:11px;
  color:#d9eaff;
  font-weight:550;
}
.gl-root .gl-sort-progress-count {
  flex:0 0 auto;
  white-space:nowrap;
  color:#fff;
  font-size:18px;
  font-weight:800;
  font-variant-numeric:tabular-nums;
}
.gl-root .gl-sort-progress-track {
  height:6px;
  flex:0 0 6px;
  border-radius:999px;
  overflow:hidden;
  background:#08192b;
  box-shadow:inset 0 0 0 1px rgba(98,184,233,.27);
}
.gl-root .gl-sort-progress-fill {
  height:100%;
  border-radius:inherit;
  background:linear-gradient(90deg,#268fe2,#5ce5ff);
  box-shadow:0 0 10px rgba(81,213,255,.35);
  transition:width .22s ease-out;
}
.gl-root .gl-sort-progress-note {
  color:#abc8df;
  font-size:10.5px;
  line-height:1.25;
}
@media (max-width:860px) {
  .gl-root .gl-sort-progress-grid {padding:0 6px 7px;}
  .gl-root .gl-sort-progress-home {top:110px;right:13px;}
  .gl-root .gl-sort-progress {padding:9px 10px 8px;gap:6px;}
  .gl-root .gl-sort-progress-count {font-size:16px;}
  .gl-root .gl-sort-progress-icon {height:30px;flex-basis:30px;font-size:18px;}
}
@media (prefers-reduced-motion:reduce) {
  .gl-root .gl-sort-progress-fill {transition:none;}
}
.gl-root .gl-grid-header-actions {
  display:flex;align-items:center;justify-content:flex-end;gap:8px;
  flex-shrink:0;
}
.gl-root .gl-grid-header-actions .gl-grid-back {font-size:12px;padding:9px 11px;}
.gl-root .gl-grid-header-actions .gl-native-library {
  border-color:rgba(72,164,209,.35);background:rgba(11,39,65,.78);
}
@media (max-width:860px) {
  .gl-root .gl-grid-header-actions {gap:5px;}
  .gl-root .gl-grid-header-actions .gl-grid-back {font-size:11px;padding:7px 8px;}
  .gl-root .gl-sort-menu {max-height:calc(100vh - 120px);}
  .gl-root .gl-sort-option {font-size:12px;min-height:35px;padding:7px 9px;}
}

/* v0.5.9-test.1 — Game Library left rail and collapsible Appearance screen.
 * Only .gl-root is affected; Steam native Menu, Settings and QAM CSS remain untouched. */
.gl-root .gl-rail-item.gl-rail-current:not(.gl-focused)::after {
  content:"";position:absolute;left:0;top:18px;bottom:18px;width:2px;
  border-radius:3px;background:var(--gl-blue);pointer-events:none;
}
.gl-root .gl-appearance {position:relative;display:flex;flex:1;flex-direction:column;min-height:0;}
.gl-root .gl-appearance-scroll {
  flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;
  padding:17px 9px 22px;scrollbar-color:#326d97 transparent;
}
.gl-root .gl-appearance-intro {padding:8px 3px 23px;}
.gl-root .gl-appearance-overline {color:#76c9ef;font-size:10px;font-weight:800;letter-spacing:.16em;}
.gl-root .gl-appearance-intro h1 {font-size:clamp(26px,3vw,38px);line-height:1.15;margin:9px 0;}
.gl-root .gl-appearance-intro p {font-size:13px;color:var(--gl-muted);margin:0;}
.gl-root .gl-appearance-cards {display:flex;flex-direction:column;gap:11px;max-width:1030px;}
.gl-root .gl-appearance-card {
  border:1px solid rgba(97,156,202,.3);border-radius:13px;
  background:linear-gradient(145deg,rgba(11,32,55,.95),rgba(5,18,37,.96));
  overflow:visible;box-shadow:0 8px 18px rgba(0,0,0,.14);
}
.gl-root .gl-appearance-card-heading {
  display:flex;align-items:center;gap:15px;width:100%;min-height:68px;
  padding:14px 18px;border-radius:12px;background:transparent;
  color:#edf8ff;border:1px solid transparent;
}
.gl-root .gl-appearance-card-heading.gl-focused,
.gl-root .gl-appearance-card-heading:focus-visible {
  background:#17577a;border-color:#63cfff;outline:2px solid #63cfff;
  outline-offset:-2px;box-shadow:0 0 18px rgba(3,157,255,.38);
}
.gl-root .gl-appearance-card-icon {font-size:25px;color:#67d9ff;flex:0 0 27px;}
.gl-root .gl-appearance-heading-copy {display:flex;flex:1;flex-direction:column;gap:5px;min-width:0;}
.gl-root .gl-appearance-heading-copy strong {font-size:17px;line-height:1.2;}
.gl-root .gl-appearance-heading-copy small {font-size:12px;color:#b2cbe1;line-height:1.25;}
.gl-root .gl-appearance-chevron {color:#b8dbef;font-size:23px;flex-shrink:0;}
.gl-root .gl-appearance-card-body {padding:3px 17px 18px;border-top:1px solid rgba(114,176,210,.16);}
.gl-root .gl-appearance-theme-options {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px;}
.gl-root .gl-appearance-theme-option {
  display:flex;align-items:center;gap:12px;min-height:74px;
  padding:12px 14px;border:1px solid #31516d;border-radius:11px;
  background:#0d2842;color:#ecf6ff;
}
.gl-root .gl-appearance-theme-option.gl-appearance-theme-selected {
  border-color:#4fc3ff;background:#123a5b;
}
.gl-root .gl-appearance-theme-option.gl-focused,
.gl-root .gl-appearance-theme-option:focus-visible {
  outline:2px solid #fff;outline-offset:1px;
  box-shadow:0 0 18px rgba(3,157,255,.55);
}
.gl-root .gl-appearance-swatch {
  width:41px;height:41px;flex:0 0 41px;border-radius:9px;
  background:linear-gradient(140deg,#061323 10%,#175d94 58%,#52c7f2);
  border:1px solid rgba(119,205,255,.58);
}
.gl-root .gl-appearance-swatch-steam {background:linear-gradient(140deg,#151c26,#4a5058);}
.gl-root .gl-appearance-choice-copy {display:flex;flex:1;min-width:0;flex-direction:column;gap:4px;}
.gl-root .gl-appearance-choice-copy strong {font-size:15px;}
.gl-root .gl-appearance-choice-copy small {font-size:11px;color:#bdd5e7;line-height:1.3;}
.gl-root .gl-appearance-selected-check {font-size:22px;color:#6be2ff;flex-shrink:0;}
.gl-root .gl-appearance-note {font-size:12px;color:#b2cbe1;line-height:1.45;margin:12px 0 0;}
.gl-root .gl-appearance-error {color:#ffb1b9;font-size:12px;}
.gl-root .gl-appearance-success {color:#b5ebd2;font-size:12px;}
.gl-root .gl-appearance-card-body .DialogPanel {max-width:100%;}
@media (max-width:760px){
  .gl-root .gl-appearance-theme-options {grid-template-columns:1fr;}
  .gl-root .gl-appearance-card-heading {min-height:58px;padding:11px 12px;}
  .gl-root .gl-appearance-card-body {padding:2px 12px 13px;}
}

/* v0.5.9-test.2 — non-Home Game Library routes own the top status area.
 * Steam's real #header is independently painted by system-theme/shared.css
 * and may overlay our pill on Decky /game-library/* routes. Hide ONLY
 * that verified native header while one of our own-status pages is mounted.
 * Unlike global body classes, this is automatically reverted by unmounting
 * the page, and never targets our .gl-library-topbar or Steam QAM popups.
 * Preserve element geometry to avoid shifting Steam's native route/layout.
 */
html:has(.gl-root.gl-own-status-only) #header {
  visibility:hidden !important;
  pointer-events:none !important;
}

/* v0.5.9-test.3 — local search controls. Native Steam QAM, Settings and
 * the Appearance controls are unchanged; scope all rules to .gl-root. */
.gl-root .gl-library-search-controls {
  position:relative;z-index:5;flex:0 0 auto;display:flex;flex-direction:column;
  gap:8px;min-width:0;padding:8px 7px 11px;
  border-bottom:1px solid rgba(82,160,209,.18);
}
.gl-root .gl-library-search-field-row {
  display:flex;align-items:center;gap:10px;min-height:50px;
}
/* v0.5.9-test.6 — native Steam TextField: no clipped/hidden descendants.
 * Decky resolves this component dynamically from Steam, so its wrapper
 * class names are not a stable API. Only set width on containers and
 * render one visible input with a single focus ring on the row. */
.gl-root .gl-library-search-field {
  display:flex;align-items:center;gap:11px;flex:1 1 0;min-width:0;
  min-height:48px;padding:0 14px;box-sizing:border-box;
  border:1px solid rgba(110,189,240,.65);border-radius:11px;
  background:#0b2b4a;color:#f1faff;
}
.gl-root .gl-library-search-field>svg {
  flex-shrink:0;font-size:23px;color:#7dd8ff;
}
.gl-root .gl-library-search-native {
  flex:1 1 0;width:100%;min-width:0;max-width:none;
}
.gl-root .gl-library-search-native > *,
.gl-root .gl-library-search-native :where(div,label) {
  box-sizing:border-box;width:100%!important;
  min-width:0!important;max-width:none!important;
}
.gl-root .gl-library-search-native input {
  box-sizing:border-box;display:block;
  width:100%!important;min-width:0!important;max-width:none!important;
  min-height:44px;padding:0 3px!important;
  border:0!important;border-radius:0!important;
  outline:0!important;box-shadow:none!important;
  background:transparent!important;
  color:#f1faff!important;-webkit-text-fill-color:#f1faff!important;
  font-size:17px!important;font-weight:500;
  opacity:1!important;visibility:visible!important;
}
.gl-root .gl-library-search-native input::placeholder {
  color:#a7c6df!important;-webkit-text-fill-color:#a7c6df!important;
  opacity:1!important;
}
.gl-root .gl-library-search-field:focus-within {
  border-color:#d3efff!important;
  outline:2px solid #d3efff;outline-offset:0;
  box-shadow:0 0 13px rgba(41,169,255,.38);
}
.gl-root .gl-library-search-clear {
  display:flex;align-items:center;gap:4px;padding:8px 10px;
  background:#113555;border:1px solid #315d7c;
  border-radius:11px;color:#d1edff;font-size:12px;
}
.gl-root .gl-library-search-filter-row {
  display:flex;align-items:center;gap:12px;min-width:0;
  min-height:33px;
}
.gl-root .gl-library-search-filter-row>strong {
  width:94px;flex:0 0 94px;font-size:12px;color:#afcfe7;font-weight:750;
}
.gl-root .gl-library-search-chips {
  display:flex;flex-wrap:wrap;gap:7px;min-width:0;max-width:100%;
  overflow:visible;padding:3px;margin:-3px;
}
.gl-root .gl-library-search-chip {
  flex:0 0 auto;padding:7px 13px;border:1px solid rgba(92,161,213,.31);
  border-radius:999px;background:rgba(14,42,71,.79);
  color:#c3d9eb;font-size:12px;font-weight:700;white-space:nowrap;
}
.gl-root .gl-library-search-chip.gl-search-active {
  background:#d6edff;color:#06192d;border-color:#8ad8ff;
}
/* Consistent inset focus ring: native Steam ring no longer looks doubled
 * or gets clipped by a horizontal-scroll container on the source chips. */
.gl-root .gl-library-search-chip:is(.gl-focused,.gpfocus,:focus-visible),
.gl-root .gl-library-search-clear:is(.gl-focused,.gpfocus,:focus-visible),
.gl-root .gl-search-page .gl-grid-back:is(.gl-focused,.gpfocus,:focus-visible) {
  outline:none!important;border-color:#e1f4ff!important;
  box-shadow:inset 0 0 0 1px #f0faff,0 0 12px rgba(42,184,255,.55)!important;
}
.gl-root .gl-search-page {position:relative;padding-top:5px;min-height:0;}
.gl-root .gl-search-page .gl-grid-heading {flex-basis:56px;padding-bottom:7px;}
.gl-root .gl-search-sort-menu {
  position:absolute;right:4px;top:48px;z-index:50;width:min(400px,90%);
  max-height:min(62vh,420px);overflow-y:auto;overflow-x:hidden;
}
.gl-root .gl-search-empty {
  flex:1;min-height:0;display:flex;align-items:center;justify-content:center;
  flex-direction:column;gap:9px;color:#b8d3e9;text-align:center;
}
.gl-root .gl-search-empty>svg {font-size:42px;color:#70c8f7;}
.gl-root .gl-search-empty h2 {color:#ecf8ff;font-size:23px;margin:3px 0;}
.gl-root .gl-search-empty p {font-size:13px;margin:0;}
@media (max-height:730px) {
  .gl-root .gl-library-search-controls {gap:5px;padding:3px 6px 5px;}
  .gl-root .gl-library-search-field-row {min-height:39px;}
  .gl-root .gl-library-search-field {min-height:42px;}
  .gl-root .gl-library-search-native input {min-height:38px;}
  .gl-root .gl-library-search-filter-row {min-height:29px;}
  .gl-root .gl-library-search-chip {padding:5px 10px;}
  .gl-root .gl-search-page .gl-grid-heading {flex-basis:49px;}
}
@media (max-width:720px) {
  .gl-root .gl-library-search-filter-row {gap:6px;}
  .gl-root .gl-library-search-filter-row>strong {width:71px;flex-basis:71px;font-size:10px;}
  .gl-root .gl-library-search-chip {font-size:11px;padding:6px 9px;}
}

/* v0.5.9-test.8 — Collections hub, intentionally local to our route.
 * No changes to Steam native Settings, QAM, Appearance or Home colors. */
.gl-root .gl-collections-page {
  flex:1;min-height:0;min-width:0;display:flex;flex-direction:column;
  position:relative;
}
.gl-root .gl-collections-scroll {
  flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;
  padding:13px 8px 22px;overscroll-behavior:contain;
  scrollbar-color:#315e88 transparent;
}
.gl-root .gl-collections-intro {padding:7px 4px 24px;}
.gl-root .gl-collections-eyebrow {
  color:#70cafa;font-size:11px;letter-spacing:.15em;font-weight:800;
}
.gl-root .gl-collections-intro h1 {
  margin:7px 0 5px;font-size:clamp(26px,3vw,38px);font-weight:800;
  line-height:1.15;color:#f0faff;
}
.gl-root .gl-collections-intro p {
  margin:0;font-size:13px;color:#adcbdf;
}
.gl-root .gl-collections-cards {
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
  gap:16px;align-items:stretch;max-width:1120px;
}
.gl-root .gl-collections-card {
  position:relative;min-width:0;min-height:174px;
  display:flex;flex-direction:column;align-items:stretch;
  padding:18px 21px;border-radius:15px;
  border:1px solid rgba(107,183,233,.36);color:#eff9ff;
  background:linear-gradient(145deg,rgba(17,57,93,.88),rgba(5,20,39,.98));
  outline:none;overflow:visible;text-align:left;
}
.gl-root .gl-collections-card.gl-focused,
.gl-root .gl-collections-card:focus-visible {
  border-color:#b7ecff;background:linear-gradient(145deg,#195f92,#0b3459);
  box-shadow:inset 0 0 0 1px #d1efff,0 0 19px rgba(18,165,250,.42);
}
.gl-root .gl-collections-card-top {
  display:flex;align-items:center;justify-content:space-between;
  gap:9px;margin-bottom:10px;
}
.gl-root .gl-collections-card-icon {font-size:28px;color:#7ddcff;}
.gl-root .gl-collections-card-count {
  padding:4px 11px;min-width:35px;border-radius:999px;
  border:1px solid rgba(126,197,233,.3);color:#c9e7f9;
  text-align:center;font-size:13px;font-weight:750;
}
.gl-root .gl-collections-card-tag {
  color:#8cbbd8;letter-spacing:.11em;font-size:10px;
  font-weight:750;margin-bottom:6px;
}
.gl-root .gl-collections-card strong {
  font-size:clamp(17px,1.65vw,23px);line-height:1.25;font-weight:750;
}
.gl-root .gl-collections-card small {
  margin-top:5px;padding-right:20px;color:#bed4e5;font-size:12px;
}
.gl-root .gl-collections-card-arrow {
  position:absolute;right:17px;bottom:19px;font-size:22px;color:#86cdea;
}
.gl-root .gl-collections-detail-heading {
  display:flex;align-items:center;gap:16px;min-height:67px;
  margin-bottom:18px;
}
.gl-root .gl-collections-detail-copy h1 {
  margin:0 0 2px;font-size:clamp(20px,2.5vw,30px);
}
.gl-root .gl-collections-detail-copy span {
  font-size:12px;color:#a7c7de;
}
.gl-root .gl-collections-groups {
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
}
.gl-root .gl-collections-group {
  display:flex;align-items:center;gap:11px;min-height:64px;
  padding:15px;border:1px solid #345e80;border-radius:11px;
  background:#0b2948;color:#e4f4ff;
}
.gl-root .gl-collections-group>svg {font-size:23px;color:#79d1f9;}
.gl-root .gl-collections-group>strong {flex:1;min-width:0;}
.gl-root .gl-collections-group.gl-focused {
  outline:2px solid #d8f4ff;outline-offset:0;
  border-color:#a9dcff;background:#185176;
}
.gl-root .gl-collections-grid {
  grid-auto-rows:max-content;padding:5px 8px 20px;
}
.gl-root .gl-collections-empty {
  display:flex;flex:1;min-height:230px;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;
  padding:22px;gap:10px;color:#bcd2e4;
}
.gl-root .gl-collections-empty>svg {font-size:38px;color:#78d1ff;}
.gl-root .gl-collections-empty h2 {font-size:21px;margin:0;color:#eaf8ff;}
.gl-root .gl-collections-empty p {
  margin:0;max-width:520px;font-size:13px;line-height:1.55;
}
@media(max-width:720px){
  .gl-root .gl-collections-card {min-height:145px;padding:13px;}
  .gl-root .gl-collections-intro {padding-bottom:15px;}
  .gl-root .gl-collections-cards {gap:10px;}
  .gl-root .gl-collections-group {padding:10px;min-height:57px;}
}
@media(max-height:650px){
  .gl-root .gl-collections-card {min-height:133px;padding:12px;}
  .gl-root .gl-collections-card-top {margin-bottom:5px;}
  .gl-root .gl-collections-intro {padding-bottom:13px;}
}
/* v0.5.9-test.9 — manual collection editor, scoped to Collections only. */
.gl-root .gl-collections-manage {
  display:flex;align-items:center;gap:15px;min-height:52px;
  margin:-3px 0 14px;padding:2px 1px;
}
.gl-root .gl-collections-add {
  display:flex;align-items:center;gap:7px;flex:0 0 auto;
  padding:10px 18px;min-height:42px;border-radius:11px;
  background:#176195;color:#f4faff;border:1px solid #5bb3e7;
  font-size:14px;font-weight:750;
}
.gl-root .gl-collections-add>svg {font-size:22px;}
.gl-root .gl-collections-manage>span {
  color:#a9c7df;font-size:12px;line-height:1.4;
}
.gl-root .gl-collections-add:is(.gl-focused,.gpfocus,:focus-visible) {
  outline:none;border-color:#f0fbff;
  box-shadow:inset 0 0 0 1px #f0fbff,0 0 14px rgba(31,176,255,.56);
}
.gl-root .gl-collections-remove-hint {
  position:absolute;top:5px;left:5px;z-index:2;padding:4px 7px;
  font-size:11px;font-weight:750;background:rgba(4,20,35,.9);
  border-radius:7px;color:#d9eeff;
}
.gl-root .gl-collections-picker {display:flex;flex-direction:column;min-height:0;}
.gl-root .gl-collections-picker-search {flex:0 0 auto;margin:1px 1px 6px;}
.gl-root .gl-collections-picker-note {
  flex:0 0 auto;padding:3px 4px 9px;font-size:12px;color:#b4d2e7;
}
.gl-root .gl-collections-picker-list {
  display:flex;flex-direction:column;gap:7px;
  min-height:0;padding:3px 6px 14px;
}
.gl-root .gl-collections-picker-row {
  display:flex;align-items:center;gap:13px;min-width:0;min-height:63px;
  padding:6px 13px;border:1px solid #345e80;border-radius:10px;
  background:#0b2948;color:#ecf8ff;outline:none;
}
.gl-root .gl-collections-picker-row.gl-collections-selected {
  background:#103f62;border-color:#579ecc;
}
.gl-root .gl-collections-picker-row:is(.gl-focused,.gpfocus,:focus-visible) {
  outline:none;border-color:#effaff;
  box-shadow:inset 0 0 0 1px #c7ecff,0 0 13px rgba(32,171,255,.5);
}
.gl-root .gl-collections-picker-art {
  flex:0 0 35px;width:35px;height:48px;overflow:hidden;
  border-radius:4px;background:#102f49;
}
.gl-root .gl-collections-picker-art img {
  display:block;width:100%;height:100%;object-fit:cover;
}
.gl-root .gl-collections-picker-name {
  flex:1;min-width:0;font-size:14px;font-weight:700;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.gl-root .gl-collections-picker-state {
  flex:0 0 auto;max-width:35%;text-align:right;
  font-size:12px;color:#a9dcff;font-weight:750;
}
.gl-root .gl-collections-selected .gl-collections-picker-state {color:#baf5d4;}
@media(max-height:650px) {
  .gl-root .gl-collections-picker-row {min-height:51px;padding:4px 10px;}
  .gl-root .gl-collections-picker-art {height:39px;width:29px;flex-basis:29px;}
  .gl-root .gl-collections-manage {min-height:43px;margin-bottom:8px;}
}

/* v0.5.9-test.11 — passive alphabet indicator for dedicated Library grid.
 * Never alter native Steam screens, gamepad controls, cover layout on Home,
 * or the Search/Collections/Appearance routes. */
.gl-root .gl-grid-page.gl-alphabet-enabled {position:relative;}
.gl-root .gl-grid-page.gl-alphabet-enabled > .gl-full-grid-scroll {
  margin-right:34px;
}
.gl-root .gl-grid-page.gl-alphabet-enabled .gl-alphabet-rail {
  position:absolute;z-index:2;right:1px;top:90px;bottom:32px;
  width:29px;padding:7px 2px;
  display:flex;flex-direction:column;align-items:center;
  justify-content:space-between;gap:0;
  border:1px solid rgba(95,173,228,.22);border-radius:12px;
  background:linear-gradient(180deg,rgba(9,28,52,.84),rgba(5,17,35,.91));
  pointer-events:none;user-select:none;
}
.gl-root .gl-alphabet-rail-letter {
  flex:1 1 0;min-height:0;display:flex;align-items:center;
  justify-content:center;width:100%;border-radius:6px;
  font-size:clamp(8px,1.15vh,12px);font-weight:700;line-height:1;
  color:rgba(187,214,238,.69);
}
.gl-root .gl-alphabet-rail-letter.gl-alphabet-current {
  color:#041a2b;background:#5ad6ff;
  box-shadow:0 0 10px rgba(30,186,249,.6);
}
.gl-root .gl-alphabet-popup {
  position:absolute;right:57px;top:53%;z-index:3;
  width:clamp(72px,9vw,110px);height:clamp(72px,9vw,110px);
  display:flex;align-items:center;justify-content:center;
  transform:translateY(-50%) scale(.94);opacity:0;
  color:#f4faff;font-size:clamp(45px,6vw,76px);
  line-height:1;font-weight:800;
  border:1px solid rgba(97,222,255,.86);border-radius:19px;
  background:linear-gradient(145deg,rgba(19,80,123,.94),rgba(6,24,48,.97));
  box-shadow:0 0 25px rgba(20,185,246,.34),inset 0 0 20px rgba(48,170,250,.18);
  pointer-events:none;user-select:none;
  transition:opacity 160ms ease,transform 160ms ease;
}
.gl-root .gl-alphabet-popup.gl-alphabet-popup-visible {
  opacity:1;transform:translateY(-50%) scale(1);
}
@media(max-height:650px) {
  .gl-root .gl-grid-page.gl-alphabet-enabled .gl-alphabet-rail {
    top:70px;bottom:30px;width:26px;padding:4px 1px;
  }
  .gl-root .gl-grid-page.gl-alphabet-enabled > .gl-full-grid-scroll {
    margin-right:29px;
  }
}
@media(prefers-reduced-motion:reduce) {
  .gl-root .gl-alphabet-popup {transition:none;}
}

/* v0.5.9-test.12 — controller focus for the existing Library alphabet rail.
 * Keep its footprint, grid width, native Steam UI and Phase 1 popup intact. */
.gl-root .gl-grid-page.gl-alphabet-enabled .gl-alphabet-rail.gl-alphabet-focused,
.gl-root .gl-grid-page.gl-alphabet-enabled .gl-alphabet-rail:focus-visible {
  outline:2px solid #e5f8ff;
  outline-offset:2px;
  border-color:#b8eaff;
  box-shadow:0 0 0 2px rgba(42,170,246,.35),0 0 20px rgba(42,178,255,.48);
}
.gl-root .gl-alphabet-rail-letter.gl-alphabet-unavailable {
  color:rgba(168,186,206,.23);
}
.gl-root .gl-alphabet-rail.gl-alphabet-choosing .gl-alphabet-current {
  color:#051e35;
  background:#d2f4ff;
  box-shadow:0 0 0 1px #e5faff,0 0 12px rgba(45,202,255,.76);
}

/* v0.5.9-test.13 — touchable alphabet rail, scoped to Library only.
 * Wider target for handheld fingertips; vertical gesture belongs to this
 * rail, not the grid scroll. Preserve the Phase 2 gamepad focus states. */
.gl-root .gl-grid-page.gl-alphabet-enabled .gl-alphabet-rail {
  width:42px;
  pointer-events:auto;
  touch-action:none;
  -webkit-user-select:none;
  user-select:none;
  cursor:pointer;
}
.gl-root .gl-grid-page.gl-alphabet-enabled > .gl-full-grid-scroll {
  margin-right:47px;
}
.gl-root .gl-grid-page.gl-alphabet-enabled .gl-alphabet-rail-letter {
  pointer-events:none;
}
.gl-root .gl-grid-page.gl-alphabet-enabled .gl-alphabet-popup {
  right:66px;
}
@media(max-height:650px){
  .gl-root .gl-grid-page.gl-alphabet-enabled .gl-alphabet-rail {width:40px;}
  .gl-root .gl-grid-page.gl-alphabet-enabled > .gl-full-grid-scroll {margin-right:45px;}
}

/* v0.5.9-test.15 — Library card visual alignment hotfix (native size source unchanged).
 * v0.5.9-test.14 — Library SIZE / estimated Steam Store minimum.
 * Only dedicated Library cards; Home strip and Search grid are untouched.
 * Keep native card dimensions, gamepad focus and Phase 1-3 alphabet rail. */
.gl-root .gl-full-grid .gl-poster[data-size-active="true"]::after {
  content:"";
  /* The original .gl-poster::after has inset:0. Override its TOP
   * explicitly, otherwise the fixed-height overlay starts at the cover top. */
  position:absolute;inset:auto 0 0;height:32%;
  pointer-events:none;
  background:linear-gradient(0deg,rgba(3,8,18,.98) 0%,rgba(3,8,18,.78) 36%,transparent 100%);
  z-index:0;
}
.gl-root .gl-full-grid .gl-poster[data-size-active="true"] .gl-poster-name {
  bottom:28px;
  left:10px;right:10px;z-index:1;
  font-size:clamp(12px,1vw,14px);
  line-height:1.16;
  display:-webkit-box;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:2;
  overflow:hidden;
  max-height:2.4em;
}
/* v0.5.9-test.19: compact two-metric row, no textual SIZE / EST labels. */
.gl-root .gl-full-grid .gl-poster-meta {
  position:absolute;left:9px;right:9px;bottom:9px;
  z-index:2;display:flex;align-items:center;justify-content:space-between;
  gap:5px;min-width:0;
  color:#f0f5fb;white-space:nowrap;
  font-variant-numeric:tabular-nums;
  pointer-events:none;
  text-shadow:0 1px 3px rgba(0,0,0,.85);
}
.gl-root .gl-full-grid .gl-poster-size,
.gl-root .gl-full-grid .gl-poster-hltb {
  display:flex;align-items:center;gap:3px;min-width:0;
}
.gl-root .gl-full-grid .gl-poster-size svg,
.gl-root .gl-full-grid .gl-poster-hltb svg {
  width:13px;height:13px;flex:none;opacity:.87;
}
.gl-root .gl-full-grid .gl-poster-size strong,
.gl-root .gl-full-grid .gl-poster-hltb strong {
  margin-left:1px;
  flex:0 0 auto;
  font-size:clamp(10px,.9vw,12px);font-weight:700;
}
@media(max-height:650px) {
  .gl-root .gl-full-grid .gl-poster-meta {bottom:5px;left:6px;right:6px;gap:3px;}
  .gl-root .gl-full-grid .gl-poster-size,
  .gl-root .gl-full-grid .gl-poster-hltb {gap:2px;}
  .gl-root .gl-full-grid .gl-poster-size strong,
  .gl-root .gl-full-grid .gl-poster-hltb strong {font-size:10px;}
  .gl-root .gl-full-grid .gl-poster[data-size-active="true"] .gl-poster-name {
    bottom:25px;font-size:11px;left:7px;right:7px;
  }
}


/* 0.6.0 — independent Game Library tab management, no native Steam changes. */
.gl-root .gl-manage-tabs-trigger {flex:0 0 auto;gap:5px;}
.gl-root .gl-tab-manager {
  position:fixed;inset:0;z-index:21000;
  display:flex;align-items:center;justify-content:center;
  padding:22px;box-sizing:border-box;
  background:rgba(3,9,18,.86);
  backdrop-filter:blur(12px);
  color:#f0f5fd;
}
.gl-root .gl-tab-manager * {box-sizing:border-box;}
.gl-root .gl-tab-manager-shell {
  width:min(1060px,100%);height:min(760px,95vh);
  min-height:0;display:flex;flex-direction:column;
  background:#0b1725;border:1px solid #27445e;
  border-radius:16px;overflow:hidden;box-shadow:0 18px 65px #0009;
}
.gl-root .gl-tab-manager-header {
  display:flex;align-items:center;gap:20px;
  padding:17px 23px;border-bottom:1px solid #20374a;flex:none;
}
.gl-root .gl-tab-manager-header h2 {
  font-size:22px;margin:0 0 2px;font-weight:800;
}
.gl-root .gl-tab-manager-header p,
.gl-root .gl-tab-manager-editor > p {
  font-size:12px;color:#a3bdd2;margin:0;
}
.gl-root .gl-tab-manager-layout {
  display:grid;grid-template-columns:minmax(220px,42%) minmax(0,58%);
  flex:1;min-height:0;overflow:hidden;
}
.gl-root .gl-tab-manager-list {
  display:flex;flex-direction:column;gap:6px;
  overflow-y:auto;min-height:0;padding:20px;
  background:#0e2032;border-right:1px solid #20374a;
}
.gl-root .gl-tab-manager-editor {
  padding:20px 24px;overflow-y:auto;min-height:0;
}
.gl-root .gl-tab-manager-caption {
  display:block;color:#85b8d6;letter-spacing:.12em;
  font-size:10px;font-weight:800;margin-bottom:12px;
}
.gl-root .gl-tab-manager-editor h3 {
  font-size:20px;font-weight:760;margin:0 0 3px;
}
.gl-root .gl-tab-manager-row {
  display:flex;flex-direction:column;gap:3px;
  padding:10px 14px;flex:none;min-height:56px;
  border-radius:8px;background:#132b40;
  border:1px solid transparent;cursor:pointer;
}
.gl-root .gl-tab-manager-row strong {font-size:14px;font-weight:700;}
.gl-root .gl-tab-manager-row span {font-size:11px;color:#a2bed1;}
.gl-root .gl-tab-manager-row.gl-tab-manager-selected {
  border-color:#3b87b7;background:#1a3b56;
}
.gl-root .gl-tab-manager-actions {
  display:flex;flex-wrap:wrap;gap:8px;margin:18px 0;
}
.gl-root .gl-tab-manager-action {
  display:inline-flex;align-items:center;justify-content:center;gap:7px;
  padding:10px 13px;background:#183249;border:1px solid #30506a;
  border-radius:8px;font-size:12px;line-height:1.2;font-weight:700;
  color:#eff7ff;cursor:pointer;min-height:38px;
}
.gl-root .gl-tab-manager-action svg {width:15px;height:15px;flex:none;}
.gl-root .gl-tab-manager-action.gl-tab-manager-primary {
  background:#1e527a;border-color:#4a99c7;
}
.gl-root .gl-tab-manager-action.gl-tab-manager-danger {
  border-color:#844052;color:#ffcdd5;
}
.gl-root .gl-tab-manager-action:is(.gl-focused,.gpfocus,:focus-visible),
.gl-root .gl-tab-manager-row:is(.gl-focused,.gpfocus,:focus-visible) {
  outline:2px solid #e6f9ff;outline-offset:1px;
  box-shadow:0 0 0 4px #1d82b8;
}
.gl-root .gl-tab-manager-create {
  border-top:1px solid #27465c;padding-top:17px;
  display:flex;flex-wrap:wrap;gap:9px;align-items:center;
}
.gl-root .gl-tab-manager-create .gl-tab-manager-caption {flex:0 0 100%;margin:0;}
.gl-root .gl-tab-manager-create > div:has(input) {flex:1 1 100%;min-width:0;}
.gl-root .gl-tab-manager-note,
.gl-root .gl-tab-manager-error {
  font-size:11px;line-height:1.5;margin:12px 0;color:#9eb9ca;
}
.gl-root .gl-tab-manager-error {color:#ffc1cc;}
@media(max-width:680px){
  .gl-root .gl-tab-manager {padding:7px;}
  .gl-root .gl-tab-manager-shell {height:98vh;border-radius:10px;}
  .gl-root .gl-tab-manager-layout {grid-template-columns:38% 62%;}
  .gl-root .gl-tab-manager-list {padding:9px;}
  .gl-root .gl-tab-manager-editor {padding:11px;}
  .gl-root .gl-tab-manager-header {padding:8px 12px;}
  .gl-root .gl-tab-manager-header h2 {font-size:17px;}
  .gl-root .gl-tab-manager-action {padding:8px;min-height:34px;}
  .gl-root .gl-tab-manager-actions {gap:5px;margin:8px 0;}
}


/* Game Library 0.6.1: dedicated rail pages and manual membership picker. */
.gl-root .gl-main > .gl-tab-manager-page {
  position:relative;inset:auto;z-index:2;flex:1;width:100%;height:100%;
  padding:0 16px 18px;min-width:0;min-height:0;
  background:transparent;backdrop-filter:none;align-items:stretch;
  justify-content:stretch;
}
.gl-root .gl-tab-manager-page .gl-tab-manager-shell {
  width:100%;height:100%;min-height:0;max-height:none;
  border-radius:12px;background:#0b1725;
}
.gl-root .gl-tab-manager-page .gl-tab-manager-layout {min-height:0;}
.gl-root .gl-tab-game-picker {
  flex:1;display:flex;flex-direction:column;min-height:0;padding:16px 20px;
  overflow:hidden;background:#0d1c2c;
}
.gl-root .gl-tab-picker-toolbar {
  display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding-bottom:10px;
}
.gl-root .gl-tab-picker-toolbar .gl-tab-manager-note {margin:0 0 0 auto;}
.gl-root .gl-tab-picker-search {
  display:flex;align-items:center;gap:10px;padding:9px 0 12px;
}
.gl-root .gl-tab-picker-search > svg {font-size:22px;flex:none;color:#89b8db;}
.gl-root .gl-tab-picker-search > div:has(input) {flex:1;min-width:0;}
.gl-root .gl-tab-picker-list {
  flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;
  gap:5px;padding:5px 9px 8px 4px;scrollbar-color:#45657e transparent;
}
.gl-root .gl-tab-picker-game {
  display:flex;flex:none;align-items:center;gap:11px;min-height:60px;
  padding:6px 12px 6px 8px;border:1px solid #28455e;background:#132b40;
  border-radius:9px;cursor:pointer;color:#edf6ff;
}
.gl-root .gl-tab-picker-game.gl-tab-picker-checked {background:#1c3f56;border-color:#4384af;}
.gl-root .gl-tab-picker-game > img,
.gl-root .gl-tab-picker-no-cover {
  width:33px;height:46px;object-fit:cover;border-radius:4px;flex:none;
  background:#203b52;
}
.gl-root .gl-tab-picker-no-cover {display:flex;align-items:center;justify-content:center;}
.gl-root .gl-tab-picker-game-text {flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
.gl-root .gl-tab-picker-game-text strong {
  font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.gl-root .gl-tab-picker-game-text span {font-size:11px;color:#a0bfd4;}
.gl-root .gl-tab-picker-check {font-size:23px;color:#6fc9f3;flex:none;}
.gl-root .gl-tab-picker-game:not(.gl-tab-picker-checked) .gl-tab-picker-check {color:#698297;}
.gl-root .gl-tab-picker-game:is(.gl-focused,.gpfocus,:focus-visible) {
  outline:2px solid #e6f9ff;outline-offset:1px;box-shadow:0 0 0 4px #1d82b8;
}
.gl-root .gl-tab-picker-more {width:100%;margin:8px 0;}
.gl-root .gl-tab-picker-empty {
  text-align:center;padding:28px 10px;color:#9ab6cb;font-size:14px;
}
.gl-root .gl-tab-picker-footer {
  padding:10px 0 0;font-size:11px;color:#8fb1c9;border-top:1px solid #254156;
}
.gl-root .gl-plugin-settings {
  width:100%;height:100%;overflow-y:auto;min-height:0;
  color:#eaf6ff;background:#081725;padding:0 22px 30px;
}
.gl-root .gl-plugin-settings-body {
  max-width:870px;margin:22px auto 0;display:flex;flex-direction:column;gap:10px;
}
.gl-root .gl-settings-title {display:flex;flex-wrap:wrap;align-items:center;gap:9px 15px;padding-bottom:14px;}
.gl-root .gl-settings-title h2 {font-size:23px;font-weight:800;margin:0;}
.gl-root .gl-settings-title p {width:100%;font-size:12px;margin:0;color:#adc4d5;}
.gl-root .gl-plugin-setting-row {
  display:flex;align-items:center;gap:14px;
  min-height:70px;padding:13px 20px;
  background:#132b40;border:1px solid #294965;border-radius:10px;
  color:#edf7ff;cursor:pointer;
}
.gl-root .gl-plugin-setting-row > svg {font-size:24px;flex:none;color:#8bbbd9;}
.gl-root .gl-plugin-setting-row > div {flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;}
.gl-root .gl-plugin-setting-row strong {font-size:15px;font-weight:750;}
.gl-root .gl-plugin-setting-row span {font-size:11px;color:#9ab9d1;line-height:1.4;}
.gl-root .gl-plugin-setting-row svg.gl-setting-toggle-on {color:#66c5ec;}
.gl-root .gl-plugin-setting-row:is(.gl-focused,.gpfocus,:focus-visible) {
  outline:2px solid #fff;outline-offset:2px;box-shadow:0 0 0 5px #1b82b5;
}
.gl-root .gl-plugin-settings .gl-tab-manager-caption {margin:12px 0 2px;}
@media(max-width:680px) {
  .gl-root .gl-main > .gl-tab-manager-page {padding:0 6px 8px;}
  .gl-root .gl-tab-game-picker {padding:9px;}
  .gl-root .gl-tab-picker-toolbar .gl-tab-manager-note {display:none;}
  .gl-root .gl-tab-picker-search {flex-wrap:wrap;}
  .gl-root .gl-tab-picker-search > div:has(input) {flex-basis:65%;}
  .gl-root .gl-plugin-settings {padding:0 8px 14px;}
  .gl-root .gl-plugin-setting-row {padding:10px;min-height:58px;gap:9px;}
}


/* 0.6.2 - original Smart Tab rules designer. */
.gl-root .gl-tab-manager-rule-preview{
  flex:1 1 100%;padding:8px 2px;color:#9fbcd0;font-size:12px;
  border-top:1px solid #27465c;margin:2px 0 0;
}
.gl-root .gl-tab-smart-editor{
  display:flex;flex-direction:column;min-height:0;height:100%;
  background:#0c1a2b;color:#f2f8ff;
}
.gl-root .gl-tab-smart-heading{
  display:flex;flex:none;align-items:center;gap:16px;
  padding:15px 22px;border-bottom:1px solid #29465b;
}
.gl-root .gl-tab-smart-heading > div{
  flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;
}
.gl-root .gl-tab-smart-heading h3{margin:0;font-size:22px;font-weight:800;}
.gl-root .gl-tab-smart-heading p{
  margin:0;font-size:12px;color:#a2c0d3;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.gl-root .gl-tab-smart-body{
  flex:1;display:flex;flex-direction:column;align-items:flex-start;
  gap:13px;min-height:0;overflow-y:auto;padding:20px 24px;
}
.gl-root .gl-tab-smart-summary{
  display:flex;align-items:center;gap:14px;
  border:1px solid #31556d;background:#17334a;border-radius:10px;
  padding:14px 16px;width:100%;
}
.gl-root .gl-tab-smart-summary > svg{width:25px;height:25px;color:#82c9ed;flex:none;}
.gl-root .gl-tab-smart-summary > div{display:flex;flex-direction:column;gap:4px;}
.gl-root .gl-tab-smart-summary strong{font-size:18px;color:#eff9ff;}
.gl-root .gl-tab-smart-summary span{font-size:12px;color:#a4bed0;}
.gl-root .gl-tab-smart-join{
  display:flex;flex-wrap:wrap;align-items:center;gap:9px;width:100%;
  border-bottom:1px solid #25445a;padding-bottom:13px;
}
.gl-root .gl-tab-smart-join .gl-tab-manager-caption{
  margin:0;flex:1 1 100%;
}
.gl-root .gl-tab-smart-choice{
  cursor:pointer;border-radius:8px;
  padding:10px 16px;background:#152c40;border:1px solid #32536b;
  color:#cce1f2;font-size:13px;font-weight:750;
}
.gl-root .gl-tab-smart-choice-active{
  background:#20557b;border-color:#61afe0;color:#fff;
}
.gl-root .gl-tab-smart-rules{width:100%;display:flex;flex-direction:column;gap:8px;}
.gl-root .gl-tab-smart-rule{
  width:100%;display:flex;gap:8px;align-items:center;flex-wrap:wrap;
  padding:8px 10px;background:#12293c;border:1px solid #2b4d66;border-radius:9px;
}
.gl-root .gl-tab-smart-options{
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
  gap:6px;width:100%;flex:1 1 100%;
  border-top:1px solid #2e4d63;padding-top:8px;
}
.gl-root .gl-tab-smart-option{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  cursor:pointer;border-radius:7px;background:#1a3951;border:1px solid #345874;
  padding:9px 11px;color:#d4edfa;font-size:12px;font-weight:650;
}
.gl-root .gl-tab-smart-option-current{
  border-color:#64afdc;background:#245477;color:#ffffff;
}
.gl-root .gl-tab-smart-option svg{flex:none;}
.gl-root .gl-tab-smart-option:is(.gl-focused,.gpfocus,:focus-visible){
  outline:2px solid #effaff;outline-offset:2px;box-shadow:0 0 0 3px #2385b4;
}
.gl-root .gl-tab-smart-rule-number{
  width:23px;height:23px;flex:none;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  color:#a8d1e9;background:#274962;font-size:12px;font-weight:700;
}
.gl-root .gl-tab-smart-rule-picker{
  display:flex;flex:1;align-items:center;gap:6px;cursor:pointer;
  border-radius:6px;padding:8px 12px;min-width:0;background:#19364d;
}
.gl-root .gl-tab-smart-rule-picker strong{
  font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.gl-root .gl-tab-smart-rule-picker span{color:#92afc3;font-size:11px;margin-left:auto;}
.gl-root .gl-tab-smart-rule-picker svg{font-size:20px;flex:none;color:#7cc4eb;}
.gl-root .gl-tab-smart-empty{
  color:#9eafc0;font-size:12px;padding:20px 16px;
  border:1px dashed #36556d;border-radius:9px;
}
.gl-root .gl-tab-smart-choice:is(.gl-focused,.gpfocus,:focus-visible),
.gl-root .gl-tab-smart-rule-picker:is(.gl-focused,.gpfocus,:focus-visible){
  outline:2px solid #e9f8ff;outline-offset:2px;box-shadow:0 0 0 4px #197eaf;
}
@media(max-width:680px){
  .gl-root .gl-tab-smart-heading{padding:8px;gap:6px;}
  .gl-root .gl-tab-smart-heading h3{font-size:17px;}
  .gl-root .gl-tab-smart-body{padding:12px;gap:9px;}
  .gl-root .gl-tab-smart-rule{padding:5px;gap:5px;}
  .gl-root .gl-tab-smart-rule-picker{padding:7px;}
  .gl-root .gl-tab-smart-rule-picker span{display:none;}
  .gl-root .gl-tab-smart-rule .gl-tab-manager-action{padding:7px;}
}


/* v0.6.4: Theme Hub is visual-only; provider tools live in Plugin Settings. */
.gl-root .gl-theme-hub-planned{
  opacity:.65;
  border-style:dashed;
}
.gl-root .gl-theme-hub-planned .gl-appearance-card-heading{
  cursor:default;
}
.gl-root .gl-theme-hub-soon{
  margin-left:auto;padding:5px 10px;
  flex:none;border:1px solid #436276;border-radius:100px;
  color:#b2c8db;background:#1a344a;
  font-size:11px;font-weight:700;
}
.gl-root .gl-plugin-settings-tool{
  flex:1;min-height:0;overflow-y:auto;
}
.gl-root .gl-plugin-settings-tool-content{
  min-width:0;padding:8px 14px 28px;
  border:1px solid #294965;border-radius:12px;
  background:#11263a;
}
.gl-root .gl-plugin-settings-tool-content :is(input,button){
  max-width:100%;
}
@media(max-width:680px){
  .gl-root .gl-theme-hub-soon{padding:4px 6px;font-size:10px;}
  .gl-root .gl-plugin-settings-tool-content{padding:6px;}
}

/* Independent read-only GOG library: styled within our route, never Steam DOM. */
.gl-root .gl-gog-library{display:flex;flex:1;min-height:0;flex-direction:column;gap:12px;padding:10px 0 4px;}
.gl-root .gl-gog-header{display:flex;align-items:center;justify-content:space-between;gap:20px;}
.gl-root .gl-gog-controls{display:flex;gap:10px;align-items:center;}
.gl-root .gl-gog-controls .gl-grid-back{display:flex;align-items:center;gap:7px;white-space:nowrap;}
.gl-root .gl-gog-search{display:flex;align-items:flex-end;gap:20px;min-height:56px;}
.gl-root .gl-gog-search>div{max-width:420px;flex:1;}
.gl-root .gl-gog-search span{font-size:13px;opacity:.8;padding-bottom:10px;}
.gl-root .gl-gog-search input{width:100%;}
.gl-root .gl-gog-details{display:flex;align-items:center;gap:14px;flex-wrap:wrap;
  padding:11px 16px;border:1px solid #264c6c;background:#0c233a;border-radius:10px;}
.gl-root .gl-gog-details strong{font-size:15px;}
.gl-root .gl-gog-details>span:last-child{font-size:12px;color:#9bb4cb;}
.gl-root .gl-gog-owned{color:#b8f0d1;font-size:12px;display:flex;align-items:center;gap:4px;}
.gl-root .gl-gog-empty{display:flex;flex:1;flex-direction:column;justify-content:center;
  align-items:center;gap:14px;text-align:center;min-height:140px;}
.gl-root .gl-gog-empty h2{font-size:20px;margin:0;}
.gl-root .gl-gog-empty p{color:#a8c1d5;font-size:14px;max-width:500px;}
.gl-root .gl-gog-empty .gl-button{flex:none;}
@media(max-width:690px){
 .gl-root .gl-gog-header{align-items:flex-start;}
 .gl-root .gl-gog-controls{gap:5px;}
 .gl-root .gl-gog-controls .gl-grid-back{padding:6px;font-size:12px;}
}

/* GOG account status is a single green success marker, not a decorative badge. */
.gl-root .gl-plugin-setting-row > svg.gl-gog-connected-check {
  color:#57d993;font-size:24px;filter:drop-shadow(0 0 5px rgba(45,194,119,.20));
}

/* Portraits come from GOG first; SteamGridDB is only used on visible tiles
   when native artwork is absent or its image load fails. */
.gl-root .gl-gog-artwork{position:absolute;inset:0;overflow:hidden;pointer-events:none;}
.gl-root .gl-gog-artwork img{width:100%;height:100%;object-fit:cover;display:block;}
.gl-root .gl-gog-detail-screen{display:flex;flex:1;min-height:0;flex-direction:column;gap:18px;
  padding:4px 12px 12px;overflow:auto;}
.gl-root .gl-gog-detail-top{display:flex;justify-content:space-between;align-items:center;gap:12px;}
.gl-root .gl-gog-detail-back{display:flex;align-items:center;gap:8px;}
.gl-root .gl-gog-detail-content{flex:1;display:flex;align-items:center;justify-content:center;
  gap:clamp(24px,5vw,66px);min-height:210px;padding:10px 12px;}
.gl-root .gl-gog-detail-cover{flex:0 0 clamp(160px,20vw,260px);height:clamp(245px,31vw,378px);
  background:linear-gradient(135deg,#16436a,#081423);border-radius:14px;
  overflow:hidden;position:relative;box-shadow:0 15px 42px rgba(0,0,0,.40);}
.gl-root .gl-gog-detail-info{max-width:560px;flex:1;min-width:0;}
.gl-root .gl-gog-detail-store{display:flex;align-items:center;gap:7px;font-size:13px;
  font-weight:750;color:#93c7e7;letter-spacing:.05em;}
.gl-root .gl-gog-detail-info h2{font-size:clamp(22px,3vw,39px);line-height:1.18;
  margin:14px 0 18px;font-weight:850;}
.gl-root .gl-gog-detail-info p{font-size:15px;color:#b5d9d1;}
.gl-root .gl-gog-detail-info .gl-gog-detail-footnote{color:#9ab4c9;font-size:13px;
  line-height:1.65;margin-top:25px;}
@media(max-width:680px){
  .gl-root .gl-gog-detail-content{gap:15px;align-items:flex-start;}
  .gl-root .gl-gog-detail-cover{flex-basis:120px;height:180px;}
  .gl-root .gl-gog-detail-info h2{font-size:21px;}
  .gl-root .gl-gog-detail-info .gl-gog-detail-footnote{font-size:11px;}
}

/* Common Dashboard poster: subtle store identity, no separate GOG layout. */
.gl-root .gl-poster .gl-gog-store-marker {
  position:absolute;bottom:9px;left:9px;z-index:3;pointer-events:none;
  padding:3px 7px;border-radius:5px;background:rgba(3,12,26,.83);
  color:#c4f5e0;font-size:10px;font-weight:800;line-height:1.2;
  letter-spacing:.055em;box-shadow:0 0 0 1px rgba(151,211,182,.28);
}

/* GOG reuses Steam's actual Game Details composition, without borrowing
   Steam's app IDs or pretending a GOG install can run before gogdl exists. */
.gl-root .gl-details-gog-poster{position:relative;}
.gl-root .gl-details-gog-poster .gl-gog-artwork{inset:0;}
.gl-root .gl-gog-install-pending{
  display:inline-flex;align-items:center;gap:8px;
  opacity:.58;cursor:default;user-select:none;
  pointer-events:none;
}
.gl-root .gl-gog-steam-details .gl-details-context>svg{
  flex:none;font-size:23px;color:#89c7e8;
}
/* Separate compact game-details option under the existing Theme choices. */
.gl-root .gl-appearance-compact-option {
  display:flex;width:100%;margin-top:12px;min-height:62px;
  background:linear-gradient(100deg,#0b2944,#0c223b);
  border:1px solid rgba(85,158,217,.32);
}
.gl-root .gl-appearance-compact-option .gl-appearance-card-icon {
  color:#61caff;font-size:25px;flex-shrink:0;
}
.gl-root .gl-appearance-compact-option.gl-focused {
  outline:2px solid #d8f5ff;outline-offset:-2px;
  box-shadow:0 0 13px rgba(41,174,239,.37);
}
.gl-root .gl-appearance-option-off {
  font-size:12px;font-weight:700;color:#a8bcd0;padding:2px 8px;
}


/* v0.6.11-test.22 — Own Game Details screen. Scoped to the custom
 * .gl-root, not to Steam's native Game Details DOM. Inherits the same
 * Midnight variables as Home, Library, Search and the sidebar. */
.gl-root .gl-main.gl-main-details{
  padding:0 !important;min-height:0;overflow:hidden;
}
.gl-root .gl-game-details{
  width:100%;height:100%;min-height:0;flex:1;position:relative;
  background:var(--gl-bg);color:var(--gl-text);isolation:isolate;
}
.gl-root .gl-details-scroller{
  width:100%;height:100%;overflow-y:auto;overflow-x:hidden;
  scrollbar-width:thin;scrollbar-color:#214966 transparent;
  padding:0 clamp(17px,2.8vw,43px) 16px;
  position:relative;display:flex;flex-direction:column;
}
.gl-root .gl-details-top,.gl-root .gl-details-intro{flex-shrink:0;}
.gl-root .gl-details-hero{
  position:absolute;top:0;left:0;right:0;height:clamp(245px,44vh,450px);
  overflow:hidden;pointer-events:none;background:#07182c;z-index:0;
}
.gl-root .gl-details-hero .gl-hero{
  width:100%;height:100%;object-fit:cover;object-position:58% 33%;
  opacity:.98;
}
/* A portrait GOG card stretched to fill the hero when no widescreen artwork
   exists. Keep its aspect ratio; subtle blur hides low-res upscaling. */
.gl-root .gl-gog-steam-details .gl-hero.gl-hero-card-fallback{
  object-fit:cover;object-position:center 38%;
  transform:scale(1.08);
  filter:blur(5px) brightness(.82);
}
.gl-root .gl-details-hero-shade{
  position:absolute;inset:0;
  background:
    linear-gradient(90deg,rgba(2,8,18,.94) 0%,rgba(3,12,25,.77) 23%,rgba(3,12,25,.32) 53%,transparent 90%),
    linear-gradient(180deg,rgba(2,8,20,.46) 0%,rgba(3,10,20,.1) 27%,rgba(3,10,20,.32) 62%,var(--gl-bg) 100%);
}
.gl-root .gl-details-hero-logo{
  position:absolute;right:clamp(20px,4vw,62px);top:74px;
  width:min(27vw,275px);max-height:120px;
  display:flex;align-items:center;justify-content:flex-end;
  opacity:.87;filter:drop-shadow(0 6px 14px rgba(0,0,0,.7));
}
.gl-root .gl-details-hero-logo .gl-game-logo{
  position:static;width:auto;height:auto;max-width:100%;max-height:100px;
  object-fit:contain;transform:none;
}
.gl-root .gl-details-top{
  position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;
  height:65px;gap:16px;
}
.gl-root .gl-details-top .gl-topbar-status{
  max-width:64%;padding:4px 9px;border-radius:999px;
  border:1px solid rgba(149,205,248,.2);background:rgba(4,15,29,.72);
  backdrop-filter:blur(9px);
}
.gl-root .gl-details-back{
  display:inline-flex;align-items:center;justify-content:center;gap:9px;
  flex:none;min-width:132px;min-height:38px;padding:7px 13px;
  border-radius:10px;color:var(--gl-text);
  border:1px solid rgba(92,192,245,.54);
  background:rgba(4,20,39,.68);
  font-size:12px;font-weight:760;
}
.gl-root .gl-details-back svg{font-size:16px;}
.gl-root .gl-details-intro{
  position:relative;z-index:2;display:grid;
  grid-template-columns:clamp(205px,22vw,290px) minmax(0,1fr);
  align-items:center;column-gap:clamp(18px,2.6vw,35px);row-gap:8px;
  margin-top:clamp(76px,10vh,118px);
}
.gl-root .gl-details-poster{
  width:100%;aspect-ratio:2/3;align-self:end;min-height:0;overflow:hidden;
  border-radius:13px;background:linear-gradient(125deg,#1a4063,#071324);
  box-shadow:0 15px 30px rgba(0,0,0,.45),0 0 0 1px rgba(173,211,235,.26);
}
.gl-root .gl-details-poster img{width:100%;height:100%;object-fit:cover;display:block;}
.gl-root .gl-details-poster-fallback{
  display:flex;height:100%;padding:15px;flex-direction:column;gap:12px;
  align-items:center;justify-content:center;text-align:center;
  font-weight:800;font-size:15px;color:#d9eafa;
}
.gl-root .gl-details-poster-fallback svg{font-size:47px;color:var(--gl-blue);}
.gl-root .gl-details-intro-copy{min-width:0;display:flex;flex-direction:column;align-items:stretch;justify-content:center;}
.gl-root .gl-details-source{
  display:flex;align-items:center;gap:14px;min-height:26px;flex-wrap:wrap;
  font-size:11px;color:#b6cde1;font-weight:750;
}
.gl-root .gl-details-source>span{display:flex;align-items:center;gap:5px;letter-spacing:.03em;}
.gl-root .gl-details-source>span svg{font-size:17px;}
.gl-root .gl-details-source .gl-proton-row{margin:0;padding:0;}
.gl-root .gl-details-source .gl-proton-badge{padding:4px 8px;font-size:11px;min-height:25px;}
.gl-root .gl-details-intro h1{
  margin:6px 0 5px;font-size:clamp(25px,3vw,38px);font-weight:830;
  line-height:1.12;letter-spacing:-.023em;text-shadow:0 4px 22px #020915cc;
  overflow-wrap:anywhere;
}
.gl-root .gl-details-ownership{
  display:flex;gap:8px;align-items:center;color:var(--gl-muted);
  font-size:12px;font-weight:600;min-height:22px;
}
.gl-root .gl-details-ownership svg{color:#59d7ac;font-size:15px;}
.gl-root .gl-details-dot{color:#618faf;}
.gl-root .gl-details-hltb{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;
  margin-top:13px;
}
.gl-root .gl-details-hltb.gl-details-metrics{
  grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:17px;
}
.gl-root .gl-details-meta-cell{
  display:flex;align-items:center;justify-content:center;
  min-width:0;min-height:78px;padding:8px 10px;gap:10px;
  border:1px solid rgba(101,158,205,.24);border-radius:10px;
  background:linear-gradient(145deg,rgba(13,38,64,.84),rgba(10,27,48,.80));
  color:#f5fbff;
}
.gl-root .gl-details-meta-cell>svg{flex:none;color:#a1d5ef;font-size:23px;}
.gl-root .gl-details-meta-cell>div{
  min-width:0;display:flex;flex-direction:column;gap:4px;
}
.gl-root .gl-details-meta-cell small{
  color:#a1bdd5;font-size:10px;font-weight:780;white-space:nowrap;
}
.gl-root .gl-details-meta-cell strong{
  color:#f5fbff;font-size:clamp(12px,1.1vw,16px);font-weight:790;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.gl-root .gl-details-metrics .gl-achievement-card{
  height:auto;max-height:none;min-height:78px;min-width:0;
  margin:0;flex:auto;padding:8px 10px;gap:9px;
}
.gl-root .gl-details-metrics .gl-achievement-icon{font-size:23px;color:#a1d5ef;}
.gl-root .gl-details-metrics .gl-achievement-content{gap:4px;}
.gl-root .gl-details-metrics .gl-achievement-stats{
  display:flex;flex-direction:column;align-items:stretch;gap:6px;
}
.gl-root .gl-details-metrics .gl-achievement-stats strong{font-size:13px;}
.gl-root .gl-details-metrics .gl-achievement-track{
  width:100%;max-width:none;min-width:0;flex:none;height:5px;
}
.gl-root .gl-details-empty-progress{
  width:100%;height:5px;min-width:42px;border-radius:99px;
  background:rgba(146,191,221,.18);
}
.gl-root .gl-details-hltb-cell{
  min-width:0;min-height:78px;padding:9px 6px;
  border:1px solid rgba(101,158,205,.21);border-radius:10px;
  background:linear-gradient(145deg,rgba(13,38,64,.84),rgba(10,27,48,.80));
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;gap:3px;
}
.gl-root .gl-details-hltb-cell strong{
  font-size:clamp(14px,1.5vw,19px);font-weight:820;color:#f5fbff;white-space:nowrap;
}
.gl-root .gl-details-hltb-cell span{
  font-size:clamp(8px,.8vw,10px);font-weight:700;color:#a1bdd5;
  letter-spacing:.025em;white-space:nowrap;
}
.gl-root .gl-details-action-row{
  grid-column:1/-1;display:flex;align-items:center;gap:9px;margin-top:4px;
  padding:9px 0 8px;border-top:0;
  border-bottom:1px solid rgba(157,202,230,.2);
  min-width:0;
}
.gl-root .gl-details-primary,.gl-root .gl-details-secondary,.gl-root .gl-details-icon-button{
  display:inline-flex;align-items:center;justify-content:center;
  gap:7px;white-space:nowrap;flex:none;min-height:39px;
  border-radius:10px;font-size:12px;font-weight:760;
  outline:none;box-shadow:none;
}
.gl-root .gl-details-primary{
  width:clamp(126px,17vw,211px);border:1px solid #67e4f4;
  color:#031a2b;background:linear-gradient(110deg,#76e7fa,#38cbe9);
  font-size:15px;
}
.gl-root .gl-details-primary svg{font-size:23px;}
.gl-root .gl-details-space{
  flex:1;min-width:70px;display:flex;flex-direction:column;gap:2px;
  margin:0 5px;
}
.gl-root .gl-details-space span{
  font-size:9px;color:#a6bbcf;font-weight:780;letter-spacing:.04em;
}
.gl-root .gl-details-space strong{
  font-size:14px;color:#eff9ff;white-space:nowrap;
}
.gl-root .gl-details-secondary{
  border:1px solid rgba(72,194,237,.66);
  color:#7de1f5;background:rgba(10,35,57,.65);padding:7px 12px;
}
.gl-root .gl-details-secondary svg{font-size:14px;}
.gl-root .gl-details-icon-button{
  width:41px;padding:0;font-size:21px;border:1px solid rgba(132,189,226,.27);
  color:#d5f0ff;background:rgba(16,42,66,.71);
}
.gl-root .gl-details-icon-button svg{font-size:22px;}
.gl-root .gl-details-install-help{
  grid-column:1/-1;font-size:10px;color:#a9c4d8;padding:2px 4px 0;line-height:1.3;
}
.gl-root .gl-details-download{
  grid-column:1/-1;margin-top:10px;max-width:680px;padding:1px 4px 0;
}
.gl-root .gl-details-download-header{
  display:flex;align-items:center;justify-content:space-between;
  flex-wrap:wrap;gap:6px 14px;min-width:0;
}
.gl-root .gl-details-download-caption{
  display:flex;align-items:center;
  gap:10px;margin-bottom:0;font-size:11px;color:#b9d4e6;
  white-space:nowrap;
}
.gl-root .gl-details-download-caption strong{
  color:#dffaff;font-variant-numeric:tabular-nums;font-size:12px;
}
.gl-root .gl-details-download-main{
  display:flex;align-items:center;flex-wrap:wrap;
  gap:9px 13px;margin-top:9px;
}
.gl-root .gl-details-download-track{
  height:6px;flex:1 1 230px;max-width:340px;
  min-width:140px;overflow:hidden;border-radius:999px;
  background:rgba(146,191,221,.19);
}
.gl-root .gl-details-download-fill{
  height:100%;border-radius:inherit;background:#54d9ee;
  transition:width 350ms ease;
}
.gl-root .gl-details-download-metrics{
  display:flex;align-items:center;flex-wrap:wrap;
  gap:4px 14px;margin-top:7px;
  color:#cadde9;font-size:10px;line-height:1.4;
  font-variant-numeric:tabular-nums;
}
.gl-root .gl-details-download-metrics span{
  white-space:nowrap;
}
.gl-root .gl-details-download-metrics b{
  color:#91b7d0;font-weight:650;margin-right:3px;
}
.gl-root .gl-details-download-controls{
  display:flex;align-items:center;flex-wrap:wrap;
  gap:7px;margin-top:0;
}
.gl-root .gl-details-download-control{
  display:inline-flex;align-items:center;justify-content:center;
  gap:5px;min-height:30px;padding:5px 11px;
  border:1px solid rgba(99,194,229,.45);border-radius:7px;
  color:#b8ebfa;background:rgba(14,45,71,.6);
  font-size:11px;font-weight:710;cursor:pointer;white-space:nowrap;
}
.gl-root .gl-details-download-control svg{font-size:16px;}
.gl-root .gl-details-download-cancel{
  border-color:rgba(232,125,134,.45);color:#ffc6cc;
  background:rgba(66,25,43,.35);
}
.gl-root .gl-details-download-feedback{
  grid-column:1/-1;margin:8px 4px 0;padding:8px 11px;
  max-width:680px;border:1px solid rgba(86,177,212,.28);
  border-radius:7px;background:rgba(10,37,57,.6);
  font-size:11px;line-height:1.5;color:#d1e7f2;
  white-space:normal;overflow-wrap:anywhere;
}
.gl-root .gl-details-download-fallback{
  display:inline-flex;align-items:center;justify-content:center;
  margin-top:7px;padding:6px 10px;max-width:100%;
  border:1px solid rgba(94,191,235,.5);border-radius:7px;
  background:rgba(18,70,100,.6);color:#d2f3ff;
  font-size:11px;font-weight:700;cursor:pointer;
  white-space:normal;overflow-wrap:anywhere;
}
.gl-root .gl-details-download-diagnostics{
  margin-top:16px;padding:10px 12px;
  border:1px solid rgba(127,184,217,.2);
  border-radius:8px;color:#a7bdd0;
  background:rgba(13,35,55,.38);
  font-size:11px;line-height:1.6;overflow-wrap:anywhere;
}
.gl-root .gl-details-footer{
  position:relative;z-index:2;padding:8px 0 1px;margin-top:auto;
  font-size:10px;color:#90a9c0;text-align:center;
}
.gl-root .gl-details-focus:is(.gl-focused,.gpfocus,.gpfocuswithin,:focus-visible){
  outline:2px solid #c5f3ff !important;
  outline-offset:2px;box-shadow:0 0 0 4px rgba(51,181,235,.22),0 0 16px rgba(55,186,244,.38);
  filter:brightness(1.15);
}
@media(max-width:1180px),(max-height:760px){
  .gl-root .gl-details-scroller{padding-left:22px;padding-right:22px;}
  .gl-root .gl-details-intro{column-gap:18px;row-gap:6px;margin-top:66px;grid-template-columns:clamp(185px,22vw,248px) minmax(0,1fr);}
  .gl-root .gl-details-hero{height:295px;}
  .gl-root .gl-details-hltb.gl-details-metrics{margin-top:12px;gap:6px;}
  .gl-root .gl-details-hltb-cell{min-height:70px;padding:6px 3px;}
  .gl-root .gl-details-meta-cell,.gl-root .gl-details-metrics .gl-achievement-card{min-height:70px;padding:6px;}
  .gl-root .gl-details-action-row{gap:6px;margin-top:6px;padding:7px 0;}
  .gl-root .gl-details-primary{width:138px;}
  .gl-root .gl-details-secondary{padding:6px 9px;font-size:11px;}
  .gl-root .gl-details-icon-button{width:36px;min-height:37px;}
}
@media(max-width:850px){
  .gl-root .gl-details-intro{grid-template-columns:clamp(145px,25vw,200px) minmax(0,1fr);column-gap:12px;}
  .gl-root .gl-details-intro h1{font-size:24px;}
  .gl-root .gl-details-hero-logo{max-width:170px;top:70px;}
  .gl-root .gl-details-hero{height:275px;}
  .gl-root .gl-details-hltb-cell,.gl-root .gl-details-meta-cell,.gl-root .gl-details-metrics .gl-achievement-card{min-height:62px;}
  .gl-root .gl-details-meta-cell{gap:5px;}
  .gl-root .gl-details-meta-cell>svg{font-size:18px;}
  .gl-root .gl-details-meta-cell small{font-size:8px;}
  .gl-root .gl-details-meta-cell strong{font-size:11px;}
  .gl-root .gl-details-metrics .gl-achievement-stats strong{font-size:11px;}
  .gl-root .gl-details-action-row{flex-wrap:wrap;}
  .gl-root .gl-details-primary{width:130px;}
  .gl-root .gl-details-hltb-cell strong{font-size:12px;}
  .gl-root .gl-details-hltb-cell span{font-size:8px;}
  .gl-root .gl-details-top .gl-topbar-status{max-width:70%;}
}
@media(max-width:650px){
  .gl-root .gl-details-intro{margin-top:22px;grid-template-columns:110px minmax(0,1fr);}
  .gl-root .gl-details-hero{height:230px;}
  .gl-root .gl-details-hltb.gl-details-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}
  .gl-root .gl-details-hltb-cell,.gl-root .gl-details-meta-cell,.gl-root .gl-details-metrics .gl-achievement-card{min-height:55px;}
  .gl-root .gl-details-info-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
}

/* v0.6.11-test.50 — Steam and GOG installation-first Game Details.
 * Layout reference: 3 compact installation metadata tiles above actions,
 * a stable progress slot below actions, and 4 HLTB tiles below the poster.
 * Keep all rules scoped to our own Game Library, never native Steam UI. */
.gl-root .gl-game-details .gl-details-intro{
  grid-template-columns:clamp(190px,21vw,265px) minmax(0,1fr);
  align-items:start;column-gap:clamp(18px,2.1vw,28px);row-gap:0;
  margin-top:clamp(62px,8vh,92px);
}
.gl-root .gl-game-details .gl-details-poster{
  align-self:start;aspect-ratio:2/3;border-radius:14px;
}
.gl-root .gl-game-details .gl-details-intro-copy{
  justify-content:flex-start;min-width:0;
  padding-top:3px;
}
/* v0.6.11-test.52: double the hero backdrop height without moving content. */
.gl-root .gl-game-details .gl-details-hero{
  height:clamp(440px,62vh,660px);
}
.gl-root .gl-game-details .gl-details-summary{
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
  gap:9px;min-width:0;margin-top:14px;
}
.gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell{
  justify-content:flex-start;min-width:0;min-height:69px;
  padding:9px clamp(7px,.9vw,12px);gap:9px;
}
.gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell>svg{
  font-size:21px;
}
.gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell small{
  font-size:9px;line-height:1.15;
}
.gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell strong{
  font-size:clamp(11px,1.15vw,15px);
}
.gl-root .gl-game-details .gl-details-summary .gl-achievement-card{
  height:auto;min-height:69px;max-height:none;
  margin:0;flex:auto;min-width:0;
}
.gl-root .gl-game-details .gl-details-summary .gl-achievement-card .gl-achievement-stats{
  display:flex;flex-direction:column;align-items:stretch;
  gap:6px;width:100%;
}
.gl-root .gl-game-details .gl-details-summary .gl-achievement-card .gl-achievement-stats strong{
  font-size:clamp(11px,1.1vw,14px);line-height:1.15;
}
.gl-root .gl-game-details .gl-details-summary .gl-achievement-card .gl-achievement-track{
  flex:none;width:100%;min-width:0;max-width:none;height:5px;
}
.gl-root .gl-game-details .gl-details-summary .gl-achievement-card .gl-achievement-content{
  min-width:0;gap:4px;
}
.gl-root .gl-game-details .gl-details-action-row{
  grid-column:auto;display:flex;align-items:center;flex-wrap:wrap;
  border:0;padding:0;margin-top:14px;margin-bottom:0;gap:7px;
}
.gl-root .gl-game-details .gl-details-progress-slot{
  display:block;box-sizing:border-box;height:124px;
  min-height:124px;max-height:124px;flex:none;
  overflow-y:auto;overflow-x:hidden;
  scrollbar-width:thin;scrollbar-color:#214966 transparent;
  padding-top:11px;
}
.gl-root .gl-game-details .gl-details-progress-slot .gl-details-download{
  margin:0;max-width:none;padding:0;
}
.gl-root .gl-game-details .gl-details-progress-slot .gl-details-install-help{
  padding:2px 0;max-width:100%;
}
.gl-root .gl-game-details .gl-details-progress-slot .gl-details-download-feedback{
  max-width:none;
}
.gl-root .gl-game-details .gl-details-hltb.gl-details-hltb-strip{
  position:relative;z-index:2;flex:none;
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px;margin-top:clamp(12px,2vh,21px);min-width:0;
}
.gl-root .gl-game-details .gl-details-hltb-strip .gl-details-hltb-cell{
  min-height:80px;padding:10px 7px;
}
.gl-root .gl-game-details .gl-details-hltb-strip .gl-details-hltb-cell strong{
  font-size:clamp(16px,1.6vw,22px);
}
.gl-root .gl-game-details .gl-details-hltb-strip .gl-details-hltb-cell span{
  font-size:clamp(9px,.85vw,11px);
}
@media(max-width:1180px),(max-height:760px){
  .gl-root .gl-game-details .gl-details-intro{
    grid-template-columns:clamp(175px,22vw,235px) minmax(0,1fr);
    margin-top:clamp(51px,7.4vh,70px);column-gap:17px;
  }
  .gl-root .gl-game-details .gl-details-summary{gap:7px;margin-top:12px;}
  .gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell{
    min-height:59px;padding:7px;gap:6px;
  }
  .gl-root .gl-game-details .gl-details-summary .gl-achievement-card{min-height:59px;}
  .gl-root .gl-game-details .gl-details-progress-slot{
    height:108px;min-height:108px;max-height:108px;padding-top:8px;
  }
  .gl-root .gl-game-details .gl-details-hltb-strip .gl-details-hltb-cell{
    min-height:70px;
  }
  .gl-root .gl-game-details .gl-details-hltb.gl-details-hltb-strip{gap:8px;margin-top:13px;}
}
@media(max-width:850px){
  .gl-root .gl-game-details .gl-details-intro{
    grid-template-columns:clamp(125px,23vw,185px) minmax(0,1fr);
    column-gap:12px;margin-top:48px;
  }
  .gl-root .gl-game-details .gl-details-summary{gap:6px;margin-top:9px;}
  .gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell{
    min-height:56px;padding:5px;gap:5px;
  }
  .gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell>svg{font-size:18px;}
  .gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell small{font-size:8px;}
  .gl-root .gl-game-details .gl-details-summary .gl-achievement-card{min-height:56px;}
  .gl-root .gl-game-details .gl-details-action-row{gap:6px;margin-top:10px;}
  .gl-root .gl-game-details .gl-details-progress-slot{
    height:104px;min-height:104px;max-height:104px;
  }
  .gl-root .gl-game-details .gl-details-hltb-strip .gl-details-hltb-cell{min-height:63px;}
}
@media(max-width:650px){
  .gl-root .gl-game-details .gl-details-intro{
    grid-template-columns:105px minmax(0,1fr);margin-top:24px;column-gap:11px;
  }
  .gl-root .gl-game-details .gl-details-summary{
    grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;
  }
  .gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell>svg{display:none;}
  .gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell{
    justify-content:center;min-height:51px;
  }
  .gl-root .gl-game-details .gl-details-progress-slot{
    height:98px;min-height:98px;max-height:98px;
  }
  .gl-root .gl-game-details .gl-details-hltb.gl-details-hltb-strip{
    grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;
  }
  .gl-root .gl-game-details .gl-details-hltb-strip .gl-details-hltb-cell{
    min-height:55px;padding:4px 2px;
  }
  .gl-root .gl-game-details .gl-details-hltb-strip .gl-details-hltb-cell strong{font-size:11px;}
  .gl-root .gl-game-details .gl-details-hltb-strip .gl-details-hltb-cell span{
    font-size:7px;white-space:normal;
  }
}


/* v0.6.11-test.51 — bottom-anchored details and separated native action groups.
 * One content block moves as a unit; Steam's download slot remains the same
 * height in every install state and Game Mode focusables remain unchanged. */
.gl-root .gl-game-details .gl-details-scroller{
  display:flex;flex-direction:column;
}
.gl-root .gl-game-details .gl-details-content-block{
  position:relative;z-index:2;display:flex;flex-direction:column;
  flex:0 0 auto;min-width:0;margin-top:auto;padding-bottom:4px;
}
.gl-root .gl-game-details .gl-details-content-block .gl-details-intro{
  margin-top:0;
}
.gl-root .gl-game-details .gl-details-footer{
  margin-top:0;flex:0 0 auto;padding-top:6px;
}
.gl-root .gl-game-details .gl-details-summary{
  margin-top:16px;gap:10px;
}
.gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell,
.gl-root .gl-game-details .gl-details-summary .gl-achievement-card{
  min-height:76px;padding:10px 12px;
}
.gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell strong{
  font-size:clamp(12px,1.25vw,17px);
}
.gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell small{
  font-size:10px;
}
.gl-root .gl-game-details .gl-details-action-row{
  display:flex;align-items:center;justify-content:space-between;
  width:100%;flex-wrap:wrap;column-gap:14px;row-gap:9px;
  margin-top:16px;padding:0;border:0;
}
.gl-root .gl-game-details .gl-details-action-row .gl-details-primary{
  flex:0 0 auto;width:clamp(180px,18vw,232px);min-height:55px;
  padding:0 18px;font-size:19px;border-radius:12px;
}
.gl-root .gl-game-details .gl-details-action-tools{
  display:flex;align-items:center;justify-content:flex-end;
  gap:10px;min-width:0;flex:0 1 auto;flex-wrap:nowrap;
  margin-left:auto;
}
.gl-root .gl-game-details .gl-details-action-tools .gl-details-secondary{
  min-height:50px;padding:0 16px;font-size:14px;
  border-radius:11px;
}
.gl-root .gl-game-details .gl-details-action-tools .gl-details-icon-button{
  min-height:50px;width:50px;border-radius:11px;
}
.gl-root .gl-game-details .gl-details-action-tools .gl-details-icon-button svg{
  font-size:24px;
}
/* Narrow layouts can wrap the two action groups, but the secondary group
 * remains right-aligned and never overlaps the installation button. */
@media(max-width:1100px){
  .gl-root .gl-game-details .gl-details-action-row .gl-details-primary{
    min-height:48px;width:clamp(156px,18vw,200px);font-size:17px;
  }
  .gl-root .gl-game-details .gl-details-action-tools{gap:7px;}
  .gl-root .gl-game-details .gl-details-action-tools .gl-details-secondary{
    min-height:44px;padding:0 11px;font-size:12px;
  }
  .gl-root .gl-game-details .gl-details-action-tools .gl-details-icon-button{
    min-height:44px;width:44px;
  }
}
@media(max-width:850px){
  .gl-root .gl-game-details .gl-details-summary{margin-top:12px;gap:6px;}
  .gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell,
  .gl-root .gl-game-details .gl-details-summary .gl-achievement-card{
    min-height:58px;padding:6px;
  }
  .gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell small{
    font-size:8px;
  }
  .gl-root .gl-game-details .gl-details-summary .gl-details-meta-cell strong{
    font-size:12px;
  }
  .gl-root .gl-game-details .gl-details-action-row{
    gap:7px;margin-top:12px;
  }
  .gl-root .gl-game-details .gl-details-action-row .gl-details-primary{
    min-height:43px;width:clamp(135px,20vw,170px);font-size:15px;
  }
  .gl-root .gl-game-details .gl-details-action-tools{gap:6px;}
  .gl-root .gl-game-details .gl-details-action-tools .gl-details-secondary{
    min-height:40px;padding:0 8px;font-size:11px;
  }
  .gl-root .gl-game-details .gl-details-action-tools .gl-details-icon-button{
    min-height:40px;width:40px;
  }
}
@media(max-width:650px){
  .gl-root .gl-game-details .gl-details-action-row{
    align-items:stretch;
  }
  .gl-root .gl-game-details .gl-details-action-tools{
    max-width:100%;flex-wrap:wrap;justify-content:flex-end;
  }
  .gl-root .gl-game-details .gl-details-action-row .gl-details-primary{
    width:140px;
  }
}


/* v0.6.11-test.54: GOG-native installer controls reuse the Steam Game Details
 * focus and download presentation without relying on Steam's queue. */
.gl-root .gl-gog-steam-details .gl-gog-install-chooser,
.gl-root .gl-gog-steam-details .gl-gog-install-progress{
  display:flex;flex-direction:column;gap:7px;
  color:#d7eafa;font-size:12px;
}
.gl-root .gl-gog-steam-details .gl-gog-install-locations{
  display:flex;gap:7px;flex-wrap:wrap;
}
.gl-root .gl-gog-steam-details .gl-gog-storage-choice,
.gl-root .gl-gog-steam-details .gl-gog-install-confirm,
.gl-root .gl-gog-steam-details .gl-gog-install-dismiss,
.gl-root .gl-gog-steam-details .gl-gog-install-cancel{
  display:inline-flex;align-items:center;justify-content:center;
  border:1px solid #447496;border-radius:9px;background:#102b43dc;
  color:#e3f7ff;min-height:30px;min-width:0;
  padding:5px 10px;cursor:pointer;font-size:11px;font-weight:750;
}
.gl-root .gl-gog-steam-details .gl-gog-storage-choice.selected{
  border-color:#48d9ed;box-shadow:inset 0 0 0 1px #48d9ed;
}
.gl-root .gl-gog-steam-details .gl-gog-install-confirm{
  width:160px;background:#48d9ed;color:#00233c;
}
.gl-root .gl-gog-steam-details .gl-gog-install-dismiss{
  position:absolute;bottom:5px;right:5px;
}
.gl-root .gl-gog-steam-details .gl-gog-install-progress
.gl-details-download-track{width:100%;height:7px;border-radius:10px;}
.gl-root .gl-gog-steam-details .gl-gog-install-progress-footer{
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:11px;
}
.gl-root .gl-gog-steam-details .gl-gog-install-cancel{
  margin-left:auto;border-color:#865c69;color:#ffccd1;
}


/* v0.6.11-test.55 — Steam-like GOG install dialog is rendered by Decky's
 * own modal host, outside Game Library's .gl-root. Keep selectors unique. */
.gl-gog-install-dialog{
  width:min(580px,85vw);max-width:100%;max-height:75vh;overflow-y:auto;
  display:flex;flex-direction:column;gap:12px;
  padding:14px 18px 16px;color:#e7f4fc;box-sizing:border-box;
}
.gl-gog-install-dialog h2{font-size:22px;margin:0;font-weight:790;color:#f4fbff;}
.gl-gog-install-dialog h3{font-size:13px;margin:5px 0 0;color:#a6c6db;}
.gl-gog-dialog-lead{margin:0;color:#b5cadc;font-size:13px;}
.gl-gog-dialog-size{
  display:grid;grid-template-columns:1fr auto;gap:7px;
  font-size:12px;padding:11px 14px;border-radius:10px;
  background:rgba(16,43,67,.7);color:#a6c6d8;
}
.gl-gog-dialog-size strong{color:#eefbff;text-align:right;font-weight:740;}
.gl-gog-dialog-drives{display:flex;flex-direction:column;gap:8px;}
.gl-gog-dialog-drive{
  display:flex;align-items:center;gap:14px;padding:12px 15px;
  background:rgba(17,45,70,.85);border:1px solid rgba(103,169,210,.32);
  border-radius:10px;cursor:pointer;min-height:51px;
}
.gl-gog-dialog-drive>svg:first-child{font-size:24px;color:#80b9e0;flex-shrink:0;}
.gl-gog-dialog-drive>div{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;}
.gl-gog-dialog-drive strong{font-size:14px;color:#f0fbff;}
.gl-gog-dialog-drive span{font-size:11px;color:#b2ccdf;}
.gl-gog-dialog-drive.is-selected,.gl-gog-dialog-strategy.is-selected{
  border-color:#47d4ed;background:rgba(19,85,108,.64);
}
.gl-gog-drive-selected{color:#56ebf2;font-size:21px;}
.gl-gog-dialog-existing{
  padding:10px 12px;border:1px solid rgba(107,164,205,.3);
  border-radius:10px;background:rgba(18,43,66,.62);
  display:flex;flex-direction:column;gap:8px;
}
.gl-gog-dialog-existing-title{
  display:flex;align-items:center;gap:7px;font-weight:750;font-size:12px;color:#eaf9ff;
}
.gl-gog-dialog-existing p{margin:0;font-size:11px;line-height:1.45;color:#a8c8de;}
.gl-gog-dialog-strategy{
  padding:9px 11px;border:1px solid rgba(102,173,209,.35);
  border-radius:8px;display:flex;gap:8px;align-items:center;
  font-size:12px;font-weight:700;cursor:pointer;color:#e4f4ff;
}
.gl-gog-dialog-strategy svg{font-size:17px;flex-shrink:0;}
.gl-gog-dialog-existing .gl-gog-dialog-note{color:#a2dceb;font-size:11px;}
.gl-gog-dialog-error{
  padding:8px 10px;border:1px solid rgba(240,123,132,.5);
  background:rgba(80,23,41,.4);color:#ffccd3;
  font-size:12px;border-radius:8px;
}
.gl-gog-dialog-actions{
  display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:7px;
}
.gl-gog-dialog-confirm,.gl-gog-dialog-cancel{
  min-height:40px;padding:9px 20px;border-radius:9px;
  display:flex;align-items:center;justify-content:center;gap:8px;
  font-size:14px;font-weight:740;cursor:pointer;
}
.gl-gog-dialog-confirm{border:1px solid #5de4f2;color:#052538;background:#54d9ee;}
.gl-gog-dialog-cancel{border:1px solid rgba(132,187,221,.35);color:#d4edf8;background:#193950;}
.gl-gog-install-dialog :is(.gpfocus,.gl-focused,:focus-visible){
  outline:2px solid #bcf3ff!important;outline-offset:2px;
  box-shadow:0 0 11px rgba(78,214,245,.55);
}
/* Same progress anatomy as Steam: horizontal track + action row.
 * The former GOG track lived in a flex column and inherited a 230px
 * flex-basis, which was interpreted as a huge vertical bar. */
.gl-root .gl-gog-steam-details .gl-gog-install-progress .gl-details-download-main{
  display:flex;flex-direction:row;align-items:center;flex-wrap:wrap;
  gap:9px 13px;margin-top:9px;min-height:30px;
}
.gl-root .gl-gog-steam-details .gl-gog-install-progress .gl-details-download-track{
  display:block;height:6px!important;min-height:6px!important;
  max-height:6px!important;flex:1 1 200px;max-width:340px;
  min-width:140px;overflow:hidden;border-radius:999px;
}
.gl-root .gl-gog-steam-details .gl-gog-install-progress .gl-details-download-fill{
  display:block;height:100%;min-height:0;border-radius:inherit;
}
.gl-root .gl-gog-steam-details .gl-gog-install-progress .gl-details-download-controls{
  display:flex;align-items:center;
}
.gl-root .gl-gog-steam-details .gl-gog-install-progress .gl-details-download-metrics{
  margin-top:7px;
}


/* GOG Galaxy achievement completion; source is authenticated GOG data. */
.gl-root .gl-details-meta-achievements .gl-details-empty-progress{
  overflow:hidden;position:relative;
}
.gl-root .gl-details-meta-achievements .gl-details-achievement-progress-fill{
  display:block;height:100%;min-height:0;border-radius:inherit;
  background:linear-gradient(90deg,#39c7e3,#42e9f2);
  transition:width .25s ease;
}

`;
