import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  extractGogCallbackCode,isGogLoginURL,startNativeGogLogin,
  getGogLoginState,cancelGogLogin,markGogReturn,consumeGogReturn,
} from "../src/gogNativeLogin.ts";

const url="https://auth.gog.com/auth?client_id=46899977096215655"+
  "&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient"+
  "&response_type=code&layout=client2";
const success="https://embed.gog.com/on_login_success?origin=client&code=abcdefghijklmnopqrstuv";

function fakeSteam(initialURL=url){
  const callbacks=new Map();
  const view={
    on:(type,callback)=>callbacks.set(type,callback),
    off:(type,callback)=>{if(callbacks.get(type)===callback)callbacks.delete(type);},
  };
  const browser={
    name:"ExternalWeb",m_URLRequested:initialURL,URL:initialURL,DisplayURL:initialURL,
    History:{index:0,entries:[{url:initialURL}]},
    GetBrowser:()=>view,
  };
  let activeBrowser=null,tick=()=>{},timeout=()=>{};
  let clears=0;
  const environment={
    SteamUIStore:{WindowStore:{GamepadUIMainWindowInstance:{
      HeaderStore:{GetCurrentBrowserAndBackstack:()=>({browser:activeBrowser})},
    }}},
    setInterval:fn=>{tick=fn;return 1;},
    clearInterval:()=>{clears++;},
    setTimeout:fn=>{timeout=fn;return 2;},
    clearTimeout:()=>{clears++;},
  };
  return {
    browser,callbacks,environment,
    navigate:()=>{activeBrowser=browser;},
    tick:()=>tick(),timeout:()=>timeout(),clears:()=>clears,
  };
}

test("GOG auth entry URL requires exact official HTTPS client and redirect",()=>{
  assert.equal(isGogLoginURL(url),true);
  assert.equal(isGogLoginURL("https://evil.example/auth?response_type=code"),false);
  assert.equal(isGogLoginURL("http://auth.gog.com/auth?response_type=code"),false);
  assert.equal(isGogLoginURL(url.replace("origin%3Dclient","origin%3Devil")),false);
  assert.equal(isGogLoginURL(url.replace("46899977096215655","987")),false);
});

test("Callback capture requires GOG's exact HTTPS host and one opaque code",()=>{
  assert.equal(extractGogCallbackCode(success),"abcdefghijklmnopqrstuv");
  for(const candidate of [
    "https://www.gog.com/on_login_success?origin=client&code=abcdefghijklmnopqrstuv",
    "https://embed.gog.com.evil.example/on_login_success?origin=client&code=abcdefghijklmnopqrstuv",
    "http://embed.gog.com/on_login_success?origin=client&code=abcdefghijklmnopqrstuv",
    "https://embed.gog.com/on_login_success?origin=bad&code=abcdefghijklmnopqrstuv",
    "https://embed.gog.com/on_login_success?origin=client&code=short",
    success+"&code=othercode12345",
    "https://embed.gog.com@evil.example/on_login_success?origin=client&code=abcdefghijklmnopqrstuv",
  ])assert.equal(extractGogCallbackCode(candidate),null,candidate);
});

test("Steam-owned ExternalWeb is visible and its redirect is captured once without popups",async()=>{
  cancelGogLogin();
  const fake=fakeSteam();
  let navigated=0,exchangeCount=0,finishedCount=0;
  const result=startNativeGogLogin({
    url,accountId:"12345",environment:fake.environment,
    navigate:target=>{assert.equal(target,url);navigated++;fake.navigate();},
    exchange:async(account,code)=>{
      assert.equal(account,"12345");
      assert.equal(code,"abcdefghijklmnopqrstuv");
      exchangeCount++;
      return {ok:true};
    },
    finished:ok=>{assert.equal(ok,true);finishedCount++;},
  });
  assert.equal(result.ok,true);
  fake.tick(); // observes Steam's own ExternalWeb instance and initial auth URL
  assert.equal(navigated,1);
  assert.equal(getGogLoginState().phase,"waiting");
  fake.callbacks.get("start-request")("https://evil.example/on_login_success?code=abcdefghijklmnopqrstuv");
  assert.equal(exchangeCount,0);
  fake.callbacks.get("start-request")(success);
  await new Promise(setImmediate);
  assert.equal(exchangeCount,1);
  assert.equal(finishedCount,1);
  assert.equal(getGogLoginState().phase,"connected");
  assert.equal(fake.callbacks.size,0);
  assert.ok(fake.clears()>0);
  cancelGogLogin();
});

test("Never consume GOG callback unless the actual Steam browser visited our auth page",async()=>{
  cancelGogLogin();
  const fake=fakeSteam("https://example.com/");
  let calls=0;
  const result=startNativeGogLogin({
    url,accountId:"54321",environment:fake.environment,
    navigate:()=>fake.navigate(),
    exchange:async()=>{calls++;return {ok:true};},
    finished:()=>{},
  });
  assert.equal(result.ok,true);
  fake.tick();
  fake.callbacks.get("start-request")(success);
  await new Promise(setImmediate);
  assert.equal(calls,0);
  fake.callbacks.get("start-request")(url);
  fake.callbacks.get("finished-request")(success);
  await new Promise(setImmediate);
  assert.equal(calls,1);
  cancelGogLogin();
});

test("Plugin cannot claim an invisible popup success when Steam browser manager is unavailable",()=>{
  cancelGogLogin();
  let navigated=false;
  const reply=startNativeGogLogin({
    url,accountId:"123",environment:{},
    navigate:()=>{navigated=true;},
    exchange:async()=>({ok:true}),finished:()=>{},
  });
  assert.equal(reply.ok,false);
  assert.equal(navigated,false);
  assert.match(reply.reason,/browser manager/);
});

test("Timeout and cancellation release only our event subscriptions, not Steam-owned views",()=>{
  cancelGogLogin();
  const fake=fakeSteam();
  let finished=0;
  const reply=startNativeGogLogin({
    url,accountId:"123",environment:fake.environment,
    navigate:()=>fake.navigate(),
    exchange:async()=>({ok:true}),finished:()=>finished++,
  });
  assert.equal(reply.ok,true);
  fake.tick();
  assert.ok(fake.callbacks.size>=3);
  fake.timeout();
  assert.equal(getGogLoginState().phase,"error");
  assert.equal(fake.callbacks.size,0);
  assert.equal(finished,0);
  cancelGogLogin();
  assert.equal(getGogLoginState().phase,"idle");
  markGogReturn();
  assert.equal(consumeGogReturn(),true);
  assert.equal(consumeGogReturn(),false);
});

test("Native sign-in survives Settings route unmount and keeps manual fallback optional",()=>{
  const frontend=readFileSync(new URL("../src/GogIntegrationPanel.tsx",import.meta.url),"utf8");
  const native=readFileSync(new URL("../src/gogNativeLogin.ts",import.meta.url),"utf8");
  const settings=readFileSync(new URL("../src/PluginSettingsPage.tsx",import.meta.url),"utf8");
  assert.match(frontend,/Navigation\.NavigateToExternalWeb\(url\)/);
  assert.match(frontend,/Manual sign-in \(fallback\)/);
  assert.match(frontend,/startNativeGogLogin\(\{/);
  assert.match(settings,/consumeGogReturn\(\)\?"gog":null/);
  assert.doesNotMatch(frontend,/useEffect\(\(\)=>\(\)=>\{nativeSession/);
  assert.doesNotMatch(native,/CreatePopup|window\.open\(|SetBounds|SetVisible|Unifideck|unifideck/);
  assert.doesNotMatch(native,/document\.cookie|<iframe|localStorage|readFile/);
});
