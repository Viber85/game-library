import assert from "node:assert/strict";
import test from "node:test";
import {expandThemeClassAliases} from "../src/themeClassAliases.ts";

test("minified Steam Settings class is matched alongside readable SteamOS class",()=>{
  const css='.BasicUI [class*="gamepadpagedsettings_PagedSettingsDialog_PageContent"] [class*="gamepaddialog_FieldLabel"] { color:white; }';
  const map={
    gamepadpagedsettings:{PagedSettingsDialog_PageContent:"_33vqr13-jdnjTkKKTh414f"},
    gamepaddialog:{FieldLabel:"_2bfUi2zQ7h72RRXDKNu"},
  };
  const mapped=expandThemeClassAliases(css,map);
  assert.ok(mapped.includes(':is([class*="gamepadpagedsettings_PagedSettingsDialog_PageContent"],[class~="_33vqr13-jdnjTkKKTh414f"])'));
  assert.ok(mapped.includes(':is([class*="gamepaddialog_FieldLabel"],[class~="_2bfUi2zQ7h72RRXDKNu"])'));
  assert.ok(mapped.includes("color:white"));
});

test("game detail selectors are rewritten without changing hero style or layout",()=>{
  const css='.BasicUI [class*="appdetailsoverview_ColumnContainer"] {background:#020815!important}';
  const result=expandThemeClassAliases(css,{
    appdetailsoverview:{ColumnContainer:"_2ab12YLMfQ"},
  });
  assert.ok(result.includes('[class~="_2ab12YLMfQ"]'));
  assert.ok(result.includes("background:#020815!important"));
});

test("no matching map leaves legacy readable Steam classes intact",()=>{
  const css='.BasicUI [class*="appdetailsplaysection_PlayBar"] { background:#050a16; }';
  assert.equal(expandThemeClassAliases(css,{}),css);
});

test("rejects unsafe or unexpected CSS class alias strings",()=>{
  const source='[class*="gamepadpagedsettings_PagedSettingsDialog"] {color:white;}';
  for(const bad of ['"; color:red; /*','foo bar', '', 'x'.repeat(160)]){
    assert.equal(expandThemeClassAliases(source,{gamepadpagedsettings:{PagedSettingsDialog:bad}}),source);
  }
});

test("does not match unrelated CSS text, third-party styles, or app artwork",()=>{
  const css='img[src*="appdetails_header_"], .gl-root { color:red; }';
  assert.equal(expandThemeClassAliases(css,{appdetails:{header:"abc123"}}),css);
});
