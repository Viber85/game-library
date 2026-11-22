import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Steam download actions share the status header above the shortened progress track",()=>{
  const source=read("src/SteamGameDetails.tsx");
  const start=source.indexOf('          {installMode==="transfer"&&nativeDownload.transfer&&');
  const end=source.indexOf('          {installMode==="preparing"&&',start);
  assert.ok(start>0&&end>start);
  const part=source.slice(start,end);
  const header=part.indexOf('className="gl-details-download-header"');
  const caption=part.indexOf('className="gl-details-download-caption"');
  const controls=part.indexOf('className="gl-details-download-controls"');
  const pause=part.indexOf('onAction("download-toggle")');
  const cancel=part.indexOf('onAction("download-cancel")');
  const headerEnd=part.indexOf('className="gl-details-download-track"');
  const metrics=part.indexOf('className="gl-details-download-metrics"');
  assert.ok(header>=0&&header<caption&&caption<controls);
  assert.ok(controls<pause&&pause<cancel&&cancel<headerEnd,
    "Pause and Cancel must be beside download status, not below the progress bar");
  assert.ok(headerEnd<metrics,
    "Download size and time should remain below the progress bar");
  assert.equal(part.match(/className="gl-details-download-controls"/g)?.length,1);
  assert.match(part,/aria-valuenow=\{nativeDownload\.transfer\.percent\?\?undefined\}/);
});

test("the shortened progress track and inline controls use compact responsive CSS",()=>{
  const css=read("src/theme.ts");
  const style=(selector)=>{
    const start=css.indexOf(selector+"{");
    assert.ok(start>=0,"missing CSS: "+selector);
    return css.slice(start,css.indexOf("}",start)+1);
  };
  assert.match(style(".gl-root .gl-details-download-track"),/max-width:340px/);
  assert.match(style(".gl-root .gl-details-download-header"),/display:flex/);
  assert.match(style(".gl-root .gl-details-download-header"),/flex-wrap:wrap/);
  assert.match(style(".gl-root .gl-details-download-controls"),/margin-top:0/);
  assert.match(style(".gl-root .gl-details-download-control"),/min-height:30px/);
});
