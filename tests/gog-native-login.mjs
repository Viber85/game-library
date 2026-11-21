import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  extractGogCallbackCode,isGogLoginURL,startNativeGogLogin,
} from "../src/gogNativeLogin.ts";

const url="https://auth.gog.com/auth?client_id=46899977096215655"+
  "&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient"+
  "&response_type=code&layout=client2";
const success="https://embed.gog.com/on_login_success?origin=client&code=abcdefghijklmnopqrstuv";

test("GOG auth URL is limited to its official HTTPS entry point",()=>{
  assert.equal(isGogLoginURL(url),true);
  assert.equal(isGogLoginURL("https://evil.example/auth?response_type=code"),false);
  assert.equal(isGogLoginURL("http://auth.gog.com/auth?response_type=code"),false);
  assert.equal(isGogLoginURL(url.replace("origin%3Dclient","origin%3Devil")),false);
});

test("GOG authorization code capture is exact-origin, one-use and rejects forged URLs",()=>{
  assert.equal(extractGogCallbackCode(success),"abcdefghijklmnopqrstuv");
  assert.equal(extractGogCallbackCode("https://www.gog.com/on_login_success?code=abcdefghijklmnopqrstuv"),
    "abcdefghijklmnopqrstuv");
  for(const candidate of [
    "https://embed.gog.com.evil.example/on_login_success?origin=client&code=abcdefghijklmnopqrstuv",
    "http://embed.gog.com/on_login_success?origin=client&code=abcdefghijklmnopqrstuv",
    "https://embed.gog.com/on_login_success?origin=bad&code=abcdefghijklmnopqrstuv",
    "https://embed.gog.com/on_login_success?origin=client&code=short",
    success+"&code=othercode12345",
    "https://embed.gog.com@evil.example/on_login_success?origin=client&code=abcdefghijklmnopqrstuv",
    "https://embed.gog.com/not-login-success?origin=client&code=abcdefghijklmnopqrstuv",
  ])assert.equal(extractGogCallbackCode(candidate),null,candidate);
});

test("Steam's native popup delivers only verified callback code and closes itself",()=>{
  const before=globalThis.window;
  const listeners=new Map();
  let destroys=0,closes=0;
  const browser={
    on:(event,callback)=>listeners.set(event,callback),
    off:(event)=>listeners.delete(event),
    SetFocus:()=>{},
    SetVisible:()=>{},
  };
  const popup={closed:false,close(){closes++;this.closed=true;}};
  const host={
    CreatePopup:({strInitialURL})=>{
      assert.equal(strInitialURL,url);
      return {strCreateURL:"steam-browser-view://gog",browserView:browser};
    },
    Destroy:()=>{destroys++;},
  };
  globalThis.window={
    SteamClient:{BrowserView:host},
    open:(value)=>{assert.equal(value,"steam-browser-view://gog");return popup;},
    setTimeout:()=>1,clearTimeout:()=>{},
    setInterval:()=>2,clearInterval:()=>{},
  };
  try{
    let captured="",closed=0;
    const result=startNativeGogLogin(url,code=>{captured=code;},()=>closed++);
    assert.equal(result.ok,true);
    listeners.get("start-request")("https://evil.example/on_login_success?code=abcdefghijklmnopqrstuv");
    assert.equal(captured,"");
    listeners.get("start-request")(success);
    assert.equal(captured,"abcdefghijklmnopqrstuv");
    assert.equal(closed,0);
    assert.equal(destroys,1);
    assert.equal(closes,1);
    assert.equal(listeners.size,0);
    if(result.ok)result.session.cancel();
    assert.equal(destroys,1);
  }finally{globalThis.window=before;}
});

test("Missing native Steam popup does not silently fall back to an untracked browser",()=>{
  const before=globalThis.window;
  globalThis.window={SteamClient:{BrowserView:{}}};
  try{
    const result=startNativeGogLogin(url,()=>assert.fail("unexpected auth"),()=>{});
    assert.equal(result.ok,false);
    assert.match(result.reason,/native browser/);
  }finally{globalThis.window=before;}
});

test("manual code field remains opt-in and native flow never reads another plugin",()=>{
  const frontend=readFileSync(new URL("../src/GogIntegrationPanel.tsx",import.meta.url),"utf8");
  const native=readFileSync(new URL("../src/gogNativeLogin.ts",import.meta.url),"utf8");
  assert.match(frontend,/Connect GOG automatically/);
  assert.match(frontend,/Manual sign-in \(fallback\)/);
  assert.match(frontend,/startNativeGogLogin\(account\.login_url/);
  assert.doesNotMatch(native,/Unifideck|unifideck|gogdl|fs\.|readFile/);
  assert.doesNotMatch(native,/window\.location\.href\s*=|<iframe|document\.cookie/);
});
