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
.gl-pagination { flex:0 0 24px; text-align:center; font-size:12px; color:#7c9ab9; }
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
`;
