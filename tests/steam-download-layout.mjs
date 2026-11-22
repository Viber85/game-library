import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Steam download controls share the same centered row as the progress track",()=>{
  const source=read("src/SteamGameDetails.tsx");
  const start=source.indexOf('          {installMode==="transfer"&&nativeDownload.transfer&&');
  const end=source.indexOf('          {installMode==="preparing"&&',start);
  assert.ok(start>0&&end>start);
  const part=source.slice(start,end);
  const caption=part.indexOf('className="gl-details-download-caption"');
  const main=part.indexOf('className="gl-details-download-main"');
  const track=part.indexOf('className="gl-details-download-track"');
  const controls=part.indexOf('className="gl-details-download-controls"');
  const pause=part.indexOf('onAction("download-toggle")');
  const cancel=part.indexOf('onAction("download-cancel")');
  const metrics=part.indexOf('className="gl-details-download-metrics"');
  assert.ok(caption<main&&main<track&&track<controls&&controls<pause&&
    pause<cancel&&cancel<metrics,"Track and controls must be in the same row");
  assert.equal(part.match(/className="gl-details-download-main"/g)?.length,1);
  assert.equal(part.match(/className="gl-details-download-controls"/g)?.length,1);
  assert.match(part,/aria-valuenow=\{nativeDownload\.transfer\.percent\?\?undefined\}/);
});

test("340px progress and actions are vertically aligned; inline feedback fits the viewport",()=>{
  const css=read("src/theme.ts");
  const block=(selector)=>{
    const start=css.indexOf(selector+"{");
    assert.ok(start>=0,"Missing CSS: "+selector);
    return css.slice(start,css.indexOf("}",start)+1);
  };
  assert.match(block(".gl-root .gl-details-download-track"),/max-width:340px/);
  assert.match(block(".gl-root .gl-details-download-main"),/display:flex/);
  assert.match(block(".gl-root .gl-details-download-main"),/align-items:center/);
  assert.match(block(".gl-root .gl-details-download-main"),/flex-wrap:wrap/);
  assert.match(block(".gl-root .gl-details-download-controls"),/margin-top:0/);
  assert.match(block(".gl-root .gl-details-download-control"),/min-height:30px/);
  assert.match(block(".gl-root .gl-details-download-feedback"),/overflow-wrap:anywhere/);
});
