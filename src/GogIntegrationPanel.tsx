import {useCallback,useEffect,useState} from "react";
import {callable} from "@decky/api";
import {ButtonItem,Navigation,PanelSection,PanelSectionRow,TextField} from "@decky/ui";
import {getActiveUserId} from "./steam";
import {GogMobilePairingPanel} from "./GogMobilePairingPanel";

export type GogAccount={
  ok:boolean;connected:boolean;username?:string;count?:number;
  synced_at?:number;login_url?:string;reason?:string;
};
type Reply={ok:boolean;reason?:string;warning?:string;count?:number};
const readAccount=callable<[string],GogAccount>("get_gog_account");
const connect=callable<[string,string],Reply>("connect_gog_account");
const synchronize=callable<[string],Reply>("sync_gog_library");
const disconnect=callable<[string],Reply>("disconnect_gog_account");
const cancelMobile=callable<[string],{ok:boolean}>("cancel_gog_phone_pairing");

export function GogIntegrationPanel(){
  const [account,setAccount]=useState<GogAccount|null>(null);
  const [draft,setDraft]=useState("");
  const [manual,setManual]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const steamId=getActiveUserId()||"";

  const reload=useCallback(async()=>{
    if(!steamId)return;
    const current=await readAccount(steamId);
    setAccount(current);
    if(!current.ok)throw new Error(current.reason||"Unable to load account.");
  },[steamId]);

  useEffect(()=>{
    let active=true;
    if(!steamId){
      setError("Sign in to Steam before connecting GOG.");return;
    }
    void readAccount(steamId).then(value=>{
      if(active){setAccount(value);if(!value.ok)setError(value.reason||"GOG account is unavailable.");}
    }).catch(()=>{if(active)setError("Could not read GOG account settings.");});
    return ()=>{active=false;};
  },[steamId]);

  const manualConnect=()=>{
    if(busy||!steamId||draft.trim().length<12)return;
    const value=draft.trim();
    setDraft("");setBusy(true);setError("");setNotice("");
    void connect(steamId,value).then(async reply=>{
      if(!reply.ok)throw new Error(reply.reason||"GOG authorization failed.");
      await reload();
      setManual(false);
      setNotice(reply.warning||"GOG account connected.");
    }).catch(e=>setError(e instanceof Error?e.message:"GOG connection failed."))
      .finally(()=>setBusy(false));
  };
  const sync=()=>{
    if(busy||!steamId)return;
    setBusy(true);setError("");setNotice("");
    void synchronize(steamId).then(async reply=>{
      if(!reply.ok)throw new Error(reply.reason||"GOG library sync failed.");
      await reload();
      setNotice("Synced "+(reply.count??0)+" owned GOG games.");
    }).catch(e=>setError(e instanceof Error?e.message:"GOG library sync failed."))
      .finally(()=>setBusy(false));
  };
  const signOut=()=>{
    if(busy||!steamId)return;
    setBusy(true);setError("");setNotice("");
    void cancelMobile(steamId).then(()=>disconnect(steamId)).then(async reply=>{
      if(!reply.ok)throw new Error(reply.reason||"GOG disconnect failed.");
      await reload();
      setNotice("Disconnected. Our saved GOG credentials and library cache were deleted.");
    }).catch(e=>setError(e instanceof Error?e.message:"GOG disconnect failed."))
      .finally(()=>setBusy(false));
  };

  return <PanelSection title="Game Library · GOG Account">
    <PanelSectionRow><div style={{fontSize:13,lineHeight:1.55}}>
      {account?.connected?
        <><strong>Connected{account.username?" as "+account.username:""}</strong>
          <div>{account.count??0} owned games
            {account.synced_at?" · Last sync "+new Date(account.synced_at*1000).toLocaleString():
              " · Not synced yet"}</div></>:
        <><strong>Not connected</strong>
          <div>Sign in directly to GOG and synchronize your purchased games.</div></>}
    </div></PanelSectionRow>
    {!account?.connected&&<>
      <GogMobilePairingPanel accountId={steamId} onConnected={()=>{
        void reload().catch(()=>setError("GOG connected, but account status could not refresh."));
      }}/>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={busy} onClick={()=>setManual(value=>!value)}>
          {manual?"Hide manual authorization":"Manual authorization (advanced)"}
        </ButtonItem>
      </PanelSectionRow>
      {manual&&<>
        <PanelSectionRow><div style={{fontSize:12,opacity:.85,lineHeight:1.5}}>
          Alternative for desktop browsers only. Use a regular browser where
          you can copy the full GOG login-success URL containing <code>code=</code>.
          The Steam Game Mode browser may prevent typing and copying.
          Do not enter your GOG password into this plugin.
        </div></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={busy||!account?.login_url}
          onClick={()=>{
            if(account?.login_url)Navigation.NavigateToExternalWeb(account.login_url);
          }}>Open GOG login in Steam browser (advanced)</ButtonItem></PanelSectionRow>
        <PanelSectionRow><TextField label="One-time GOG login URL or code" bIsPassword
          value={draft} disabled={busy} onChange={event=>setDraft(event.target.value)}/>
        </PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below"
          disabled={busy||!steamId||draft.trim().length<12} onClick={manualConnect}>
          {busy?"Connecting…":"Connect with code"}</ButtonItem></PanelSectionRow>
      </>}
    </>}
    {account?.connected&&<>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={sync}>
        {busy?"Synchronizing…":"Refresh GOG library"}</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy}
        onClick={()=>Navigation.Navigate("/game-library/library")}>Open Library</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={signOut}>
        Disconnect GOG and delete local credentials</ButtonItem></PanelSectionRow>
    </>}
    <PanelSectionRow><div style={{fontSize:12,opacity:.78,lineHeight:1.5}}>
      Independent GOG connection. The phone-pairing page runs briefly on your
      handheld's private Wi-Fi address. Authentication is performed by GOG in
      your phone browser; the one-use authorization code is sent over that
      local network. Game Library never asks for or receives your password.
      Installation and launching come in a later phase.
    </div></PanelSectionRow>
    {notice&&<PanelSectionRow><div style={{color:"#b9ebd2",fontSize:12}}>{notice}</div></PanelSectionRow>}
    {error&&<PanelSectionRow><div role="alert" style={{color:"#ffafb8",fontSize:12}}>{error}</div></PanelSectionRow>}
  </PanelSection>;
}
