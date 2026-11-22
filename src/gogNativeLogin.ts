/** GOG sign-in using the browser rendered by Steam's own Game Mode UI.
 *
 * A BrowserView made with SteamClient.BrowserView.CreatePopup() is NOT rendered
 * by SteamUI's ExternalWeb route on the Deck. The visible browser must be
 * opened with Navigation.NavigateToExternalWeb(), then watched through the
 * main window's HeaderStore (which owns that exact ExternalWeb browser).
 *
 * This module never opens popups, injects scripts, reads page contents or
 * touches unrelated browser tabs or another plugin's credentials.
 *
 * The session persists across React route unmounts while Steam displays GOG.
 * Only the selected, exact GOG callback URL can complete authentication.
 */
import {stabilizeGogKeyboardFocus,type FocusGuard} from "./gogKeyboardFocus";

type BrowserEvents={
  SetFocus?:(value:boolean)=>void;
  on?:(event:string,listener:(...args:any[])=>void)=>void;
  off?:(event:string,listener:(...args:any[])=>void)=>void;
};
type BrowserInfo={
  name?:string;
  URL?:string;
  DisplayURL?:string;
  m_URLRequested?:string;
  History?:{index?:number;entries?:Array<{url?:string}>};
  GetBrowser?:()=>BrowserEvents|null;
};
type BrowserHeader={
  GetCurrentBrowserAndBackstack?:()=>{browser?:BrowserInfo|null}|null;
};
type SteamRoot={
  SteamUIStore?:{
    WindowStore?:{GamepadUIMainWindowInstance?:{HeaderStore?:BrowserHeader}};
  };
  setInterval?:(fn:()=>void,ms:number)=>number;
  clearInterval?:(id:number)=>void;
  setTimeout?:(fn:()=>void,ms:number)=>number;
  clearTimeout?:(id:number)=>void;
};
export type GogLoginState={
  phase:"idle"|"opening"|"waiting"|"exchanging"|"connected"|"error";
  message:string;
};
export type GogLoginAnswer={ok:boolean;reason?:string;warning?:string};
export type GogLoginOptions={
  url:string;
  accountId:string;
  navigate:(url:string)=>void;
  exchange:(accountId:string,oneUseCode:string)=>Promise<GogLoginAnswer>;
  finished:(ok:boolean)=>void;
  environment?:SteamRoot;
};
export type GogLoginResult={ok:true}|{ok:false;reason:string};

const listeners=new Set<(value:GogLoginState)=>void>();
let state:GogLoginState={phase:"idle",message:""};
let cleanupActive:(()=>void)|null=null;
let generation=0;
let returnToGogSettings=false;
const setState=(value:GogLoginState)=>{
  state=value;
  for(const listener of listeners)try{listener(value);}catch{/* subscriber unmounted */}
};
export const getGogLoginState=()=>state;
export const subscribeGogLogin=(fn:(value:GogLoginState)=>void)=>{
  listeners.add(fn);
  return ()=>{listeners.delete(fn);};
};
export function markGogReturn(){returnToGogSettings=true;}
export function consumeGogReturn(){
  const value=returnToGogSettings;returnToGogSettings=false;return value;
}
export function cancelGogLogin(){
  generation++;
  cleanupActive?.();
  cleanupActive=null;
  setState({phase:"idle",message:"Sign-in cancelled."});
}
export function stopGogLogin(){
  cancelGogLogin();
  listeners.clear();
  returnToGogSettings=false;
}

/** Only this explicit public Galaxy authorization entry point is accepted. */
export function isGogLoginURL(value:string):boolean{
  try{
    const address=new URL(value);
    return address.protocol==="https:"&&address.hostname==="auth.gog.com"&&
      address.pathname==="/auth"&&!address.username&&!address.password&&!address.port&&
      address.searchParams.get("response_type")==="code"&&
      address.searchParams.get("client_id")==="46899977096215655"&&
      address.searchParams.get("redirect_uri")==="https://embed.gog.com/on_login_success?origin=client";
  }catch{return false;}
}

/** Match only the exact GOG success path and a single opaque code. */
export function extractGogCallbackCode(value:string):string|null{
  if(typeof value!=="string"||value.length>2048)return null;
  try{
    const address=new URL(value);
    if(address.protocol!=="https:"||
       address.hostname!=="embed.gog.com"||
       address.pathname!=="/on_login_success"||
       address.username||address.password||address.port||
       address.searchParams.get("origin")!=="client")return null;
    const codes=address.searchParams.getAll("code");
    if(codes.length!==1)return null;
    return /^[A-Za-z0-9_-]{12,1024}$/.test(codes[0])?codes[0]:null;
  }catch{return null;}
}

function steamHeader(root:SteamRoot):BrowserHeader|null{
  const header=root.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance?.HeaderStore;
  return typeof header?.GetCurrentBrowserAndBackstack==="function"?header:null;
}

/** Browser is owned by Steam, so never destroy, navigate or hide it ourselves.
 * We only subscribe to its URL events, then navigate back through SteamUI.
 */
export function startNativeGogLogin(options:GogLoginOptions):GogLoginResult{
  const {url,accountId,navigate,exchange,finished}=options;
  if(!isGogLoginURL(url))
    return {ok:false,reason:"GOG returned an invalid authorization URL."};
  if(!/^[1-9][0-9]{0,11}$/.test(accountId))
    return {ok:false,reason:"Sign in to Steam before connecting GOG."};
  const root=options.environment??(window as unknown as SteamRoot);
  if(!steamHeader(root)||typeof root.setInterval!=="function"||
     typeof root.clearInterval!=="function"||
     typeof root.setTimeout!=="function"||
     typeof root.clearTimeout!=="function")
    return {ok:false,reason:"The Steam Game Mode browser manager is unavailable."};

  cancelGogLogin();
  const session=++generation;
  let closed=false;
  let sawLoginPage=false;
  let trackedBrowser:BrowserInfo|null=null;
  let trackedView:BrowserEvents|null=null;
  let keyboardFocusGuard:FocusGuard|null=null;
  let events:Array<[string,(...args:any[])=>void]>=[];
  let pollId:number|undefined;
  let timeoutId:number|undefined;
  let firstBrowserSeen=false;
  const cleanup=()=>{
    if(closed)return;
    closed=true;
    if(pollId!==undefined)root.clearInterval?.(pollId);
    if(timeoutId!==undefined)root.clearTimeout?.(timeoutId);
    keyboardFocusGuard?.dispose();
    keyboardFocusGuard=null;
    if(trackedView){
      for(const [name,listener] of events)
        try{trackedView.off?.(name,listener);}catch{/* Steam view may be gone. */}
    }
    events=[];
    trackedView=null;
    trackedBrowser=null;
    if(cleanupActive===cleanup)cleanupActive=null;
  };
  cleanupActive=cleanup;

  const fail=(message:string)=>{
    if(closed||generation!==session)return;
    cleanup();
    setState({phase:"error",message});
  };
  const complete=(code:string)=>{
    if(closed||generation!==session||!sawLoginPage)return;
    cleanup();
    // Keep the opaque code out of React state, log messages, clipboard and UI.
    setState({phase:"exchanging",message:"GOG authorized. Connecting account and synchronizing…"});
    void exchange(accountId,code).then(answer=>{
      if(generation!==session)return;
      if(!answer.ok){
        setState({phase:"error",message:answer.reason||"GOG rejected the authorization code."});
      }else{
        setState({phase:"connected",message:answer.warning||
          "GOG account connected. Open Library → GOG to view purchased games."});
      }
      finished(answer.ok);
    }).catch(()=>{
      if(generation!==session)return;
      setState({phase:"error",message:"GOG sign-in finished, but the account connection failed."});
      finished(false);
    });
  };
  const processURL=(value:unknown)=>{
    if(closed||typeof value!=="string"||generation!==session)return;
    if(isGogLoginURL(value)){
      sawLoginPage=true;
      setState({phase:"waiting",message:"GOG sign-in is open in Steam. Complete login there."});
      return;
    }
    const code=extractGogCallbackCode(value);
    if(code&&sawLoginPage)complete(code);
  };
  const observe=(browser:BrowserInfo)=>{
    if(trackedBrowser===browser)return;
    // Steam alone creates and renders this view as ExternalWeb.
    if(browser.name!=="ExternalWeb")return;
    keyboardFocusGuard?.dispose();
    keyboardFocusGuard=null;
    if(trackedView){
      for(const [name,listener] of events)
        try{trackedView.off?.(name,listener);}catch{/* Steam view replaced */}
    }
    events=[];trackedBrowser=browser;
    const view=browser.GetBrowser?.();
    trackedView=view??null;
    firstBrowserSeen=true;
    // Only for this explicitly user-initiated GOG login: prevent Steam's
    // synchronous focus false/true cycle after each virtual keyboard key.
    keyboardFocusGuard=stabilizeGogKeyboardFocus(view);
    if(!keyboardFocusGuard.installed){
      console.warn("[game-library] Steam did not permit the GOG keyboard focus workaround.");
    }
    const attach=(name:string,handler:(...args:any[])=>void)=>{
      if(typeof view?.on!=="function")return;
      view.on(name,handler);
      events.push([name,handler]);
    };
    attach("start-request",processURL);
    attach("start-loading",processURL);
    attach("finished-request",processURL);
    attach("load-error",(_err:unknown,failedURL:unknown)=>processURL(failedURL));
    attach("history-changed",(value:unknown)=>{
      const history=value as BrowserInfo["History"];
      if(!history||!Array.isArray(history.entries))return;
      processURL(history.entries[history.index??history.entries.length-1]?.url);
    });
    // If a previously signed-in account redirected before our subscription,
    // first observe the actual GOG auth URL in the current browser history.
    const entries=browser.History?.entries??[];
    if(entries.some(entry=>typeof entry?.url==="string"&&isGogLoginURL(entry.url)))
      sawLoginPage=true;
    processURL(browser.m_URLRequested);
    processURL(browser.DisplayURL);
    processURL(browser.URL);
    const index=browser.History?.index;
    if(index!==undefined)processURL(entries[index]?.url);
  };
  let checks=0;
  const poll=()=>{
    if(closed||generation!==session)return;
    const browser=steamHeader(root)?.GetCurrentBrowserAndBackstack?.()?.browser;
    if(browser?.name==="ExternalWeb"){
      observe(browser);
      processURL(browser.m_URLRequested);
      processURL(browser.DisplayURL);
      processURL(browser.URL);
      const history=browser.History;
      if(Array.isArray(history?.entries)){
        const current=history.entries[history.index??history.entries.length-1];
        processURL(current?.url);
      }
    }
    if(++checks>=80&&!firstBrowserSeen)
      fail("Steam did not show its monitored browser. Try again or use manual sign-in.");
  };
  setState({phase:"opening",message:"Opening the visible Steam browser for GOG sign-in…"});
  pollId=root.setInterval(poll,125);
  timeoutId=root.setTimeout(()=>fail("GOG sign-in timed out. Retry from Settings."),10*60*1000);
  // Called inside a real user click; SteamUI itself owns the visible page.
  try{
    navigate(url);
    poll();
    return {ok:true};
  }catch{
    fail("Steam could not open the GOG sign-in page.");
    return {ok:false,reason:"Steam could not open the GOG sign-in page."};
  }
}
