import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const ui=source("src/Dashboard.tsx");
const css=source("src/theme.ts");
const service=source("src/sortMetadata.ts");

test("Sort metadata has legible title, real completion count, progress track and clear missing-data explanation",()=>{
  assert.match(ui,/function SortProgressNotice\(/);
  assert.match(ui,/HOWLONGTOBEAT · MAIN \+ EXTRAS/);
  assert.match(ui,/className="gl-sort-progress-count">\{done\} \/ \{total\}/);
  assert.match(ui,/Math\.round\(done\/total\*100\)/);
  assert.match(ui,/className="gl-sort-progress-track" role="progressbar"/);
  assert.match(ui,/aria-valuemax=\{total\} aria-valuenow=\{done\}/);
  assert.match(ui,/className="gl-sort-progress-fill" style=\{\{width:percent\+"%"\}\}/);
  assert.match(ui,/Sorting as data loads · Games without data appear last/);
});

test("Grid status appears in a dedicated row ABOVE the scrolling game covers and B footer",()=>{
  const page=ui.indexOf('className="gl-grid-page"');
  const header=ui.indexOf('className="gl-grid-heading"',page);
  const slot=ui.indexOf('className="gl-sort-progress-slot gl-sort-progress-grid"',page);
  const scroll=ui.indexOf('className="gl-full-grid-scroll"',page);
  const hint=ui.indexOf('className="gl-grid-hint"',page);
  assert.ok(page>=0&&header>page&&slot>header&&scroll>slot&&hint>scroll);
  assert.match(css,/\.gl-root \.gl-sort-progress-grid \{[\s\S]*?flex:0 0 auto;/);
  assert.match(css,/\.gl-root \.gl-sort-progress-grid \{[\s\S]*?justify-content:flex-end;/);
});

test("Notification also works when loading external sorting metadata in Home carousel",()=>{
  assert.match(ui,/!viewAll && sortKind && metaProgress/);
  assert.match(ui,/gl-sort-progress-slot gl-sort-progress-home/);
  assert.match(css,/\.gl-root \.gl-sort-progress-home \{[\s\S]*?top:132px;/);
  assert.match(css,/\.gl-root \.gl-sort-progress-home \{[\s\S]*?right:22px;/);
});

test("No progress overlay across native Steam footer; subtle but visible Midnight styling",()=>{
  const match=css.match(/\.gl-root \.gl-sort-progress \{([^}]+)\}/);
  assert.ok(match);
  assert.doesNotMatch(match[1],/position:absolute|bottom:35px|max-width:52%/);
  assert.match(match[1],/border-left:3px solid #59d8ff;/);
  assert.match(match[1],/background:linear-gradient/);
  assert.match(match[1],/box-shadow:/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});

test("Metadata fetching logic and B/Y/Start controller actions remain unchanged",()=>{
  assert.match(service,/result\?\.data\?\.extras/);
  assert.match(service,/const count=kind==="hltb"\?1/);
  assert.match(service,/map\.set\(g\.id,value\)/);
  assert.match(ui,/onSort=\{showSortMenu\}/);
  assert.match(ui,/showNativeGameOptions\(game\.id,e\.currentTarget\)/);
  assert.match(ui,/onCancelButton=\{onCancel\}/);
});
