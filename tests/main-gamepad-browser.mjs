import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {GAME_DETAILS_ROUTE} from "../src/gameDetailsRoute.ts";
import {openBrowserFromMainGameDetails} from "../src/mainGamepadBrowser.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

function fixture(mainRoute=GAME_DETAILS_ROUTE){
  const mainCalls=[],controllerCalls=[];
  const main={
    m_locationPathname:mainRoute,
    m_Navigator:{
      SteamWeb(url){mainCalls.push(["store",url,this]);},
      ExternalWeb(url){mainCalls.push(["hltb",url,this]);}
    }
  };
  const oldController={
    m_locationPathname:"/app/1091500/controllerconfigurator/main",
    m_Navigator:{
      SteamWeb(url){controllerCalls.push(["store",url]);},
      ExternalWeb(url){controllerCalls.push(["hltb",url]);}
    }
  };
  return {
    main,oldController,mainCalls,controllerCalls,
    store:{
      WindowStore:{GamepadUIMainWindowInstance:main},
      GetFocusedWindowInstance:()=>oldController
    }
  };
}

test("HLTB always navigates from main Game Mode even when controller window is focused",()=>{
  const {store,main,mainCalls,controllerCalls}=fixture();
  const url="https://howlongtobeat.com/game/1091500";
  assert.deepEqual(openBrowserFromMainGameDetails("hltb",url,store),
    {opened:true,target:"main"});
  assert.equal(mainCalls.length,1);
  assert.deepEqual(mainCalls[0].slice(0,2),["hltb",url]);
  assert.equal(mainCalls[0][2],main.m_Navigator,"preserve native Steam navigator this binding");
  assert.deepEqual(controllerCalls,[],"must NEVER reopen controller options history");
});

test("Steam Store uses main SteamWeb, not the stale Controller Settings SteamWeb",()=>{
  const {store,mainCalls,controllerCalls}=fixture();
  const url="steam://store/1091500";
  assert.deepEqual(openBrowserFromMainGameDetails("store",url,store),
    {opened:true,target:"main"});
  assert.deepEqual(mainCalls[0].slice(0,2),["store",url]);
  assert.deepEqual(controllerCalls,[]);
});

test("refuses wrong main route rather than opening from focused native controller menu",()=>{
  const {store,mainCalls,controllerCalls}=fixture("/library/app/1091500");
  assert.deepEqual(openBrowserFromMainGameDetails("store","steam://store/1091500",store),{
    opened:false,reason:"wrong-route",currentRoute:"/library/app/1091500"
  });
  assert.deepEqual(mainCalls,[]);
  assert.deepEqual(controllerCalls,[]);
});

test("fails closed when no main window or browser action is exposed",()=>{
  assert.deepEqual(openBrowserFromMainGameDetails("hltb","https://howlongtobeat.com/game/12",{}),{
    opened:false,reason:"no-main"
  });
  const {store,mainCalls,controllerCalls,main}=fixture();
  main.m_Navigator={SteamWeb(){}};
  assert.deepEqual(openBrowserFromMainGameDetails("hltb","https://howlongtobeat.com/game/12",store),{
    opened:false,reason:"no-api",currentRoute:GAME_DETAILS_ROUTE
  });
  assert.deepEqual(mainCalls,[]);
  assert.deepEqual(controllerCalls,[]);
});

test("accepts normal Steam main window navigator alias for supported clients",()=>{
  const calls=[];
  const main={m_locationPathname:GAME_DETAILS_ROUTE,Navigator:{SteamWeb:u=>calls.push(u)}};
  assert.deepEqual(openBrowserFromMainGameDetails("store","steam://store/730",{
    WindowStore:{GamepadUIMainWindowInstance:main}
  }),{opened:true,target:"main"});
  assert.deepEqual(calls,["steam://store/730"]);
});

test("never leaks original Decky focused-window browser routing back into custom Details",()=>{
  const dashboard=read("src/Dashboard.tsx");
  const source=read("src/mainGamepadBrowser.ts");
  const block=dashboard.slice(dashboard.indexOf("if(detailRouteSession){",dashboard.indexOf("const openGameDetailsWeb=")),
    dashboard.indexOf("const target=steamReturnTarget.current;",dashboard.indexOf("const openGameDetailsWeb=")));
  assert.match(block,/openBrowserFromMainGameDetails\(kind,url\)/);
  assert.doesNotMatch(block,/Navigation\.NavigateToExternalWeb|Navigation\.NavigateToSteamWeb/);
  assert.match(source,/WindowStore\?\.GamepadUIMainWindowInstance/);
  assert.doesNotMatch(source,/GetFocusedWindowInstance\(\)/);
});
