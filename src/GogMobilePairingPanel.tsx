import {useEffect,useRef,useState} from "react";
import {callable} from "@decky/api";
import {ButtonItem,PanelSectionRow} from "@decky/ui";

export type GogPhoneStatus={
  ok:boolean;phase?:"idle"|"waiting"|"error"|"exchanging"|"connected"|"expired"|"cancelled";
  message?:string;reason?:string;url?:string;qr?:string;expires_at?:number;count?:number;
};
const startPairing=callable<[string],GogPhoneStatus>("start_gog_phone_pairing");
const readPairing=callable<[string],GogPhoneStatus>("get_gog_phone_status");
const cancelPairing=callable<[string],{ok:boolean;reason?:string}>("cancel_gog_phone_pairing");

const isActive=(value:GogPhoneStatus)=>value.phase==="waiting"||
  value.phase==="error"||value.phase==="exchanging";

/** The QR is rendered locally by our Python QR encoder; it is never sent to
 * a third-party hosted QR service. The pairing endpoint handles
 * an authorization code only, not the user's GOG credentials. */
export function GogMobilePairingPanel({accountId,onConnected}:{
  accountId:string;onConnected:()=>void;
}){
  const [pair,setPair]=useState<GogPhoneStatus>({ok:true,phase:"idle"});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [showDetails,setShowDetails]=useState(false);
  const lastPhase=useRef("");
  useEffect(()=>{
    let active=true;
    lastPhase.current="";
    const poll=()=>{
      if(!accountId)return;
      void readPairing(accountId).then(value=>{
        if(!active)return;
        if(value.ok){
          setPair(value);
          if(value.phase==="connected"&&lastPhase.current!=="connected")onConnected();
          lastPhase.current=value.phase||"";
        }else{
          setError(value.reason||"Could not read phone pairing status.");
        }
      }).catch(()=>{
        if(active)setError("Could not reach the Game Library pairing service.");
      });
    };
    poll();
    const timer=window.setInterval(poll,1700);
    return ()=>{active=false;window.clearInterval(timer);};
  },[accountId,onConnected]);

  const start=()=>{
    if(!accountId||busy)return;
    setBusy(true);setError("");setShowDetails(false);
    const prepare=pair.phase==="error"||pair.phase==="expired"||
      pair.phase==="cancelled" ? cancelPairing(accountId) : Promise.resolve({ok:true});
    void prepare.then(()=>startPairing(accountId)).then(value=>{
      if(!value.ok)throw new Error(value.reason||"Could not create a mobile pairing link.");
      setPair(value);
      lastPhase.current=value.phase||"";
    }).catch(e=>setError(e instanceof Error?e.message:"Could not start mobile pairing."))
      .finally(()=>setBusy(false));
  };
  const cancel=()=>{
    if(!accountId||busy)return;
    setBusy(true);setError("");
    void cancelPairing(accountId).then(value=>{
      if(!value.ok)throw new Error(value.reason||"Could not cancel mobile pairing.");
      setPair({ok:true,phase:"idle"});lastPhase.current="";
    }).catch(e=>setError(e instanceof Error?e.message:"Could not cancel mobile pairing."))
      .finally(()=>setBusy(false));
  };

  return <>
    <PanelSectionRow>
      <div style={{fontSize:13,lineHeight:1.55}}>
        <strong>Connect with your phone</strong>
        <div>Sign in to GOG in your phone's regular browser, not the SteamOS
          browser. No keyboard or copied code is needed on your handheld.</div>
      </div>
    </PanelSectionRow>
    {!isActive(pair)&&pair.phase!=="connected"&&
      <PanelSectionRow><ButtonItem layout="below" disabled={!accountId||busy} onClick={start}>
        {busy?"Preparing…":"Connect GOG with phone (QR)"}
      </ButtonItem></PanelSectionRow>}
    {isActive(pair)&&<>
      {pair.url&&pair.qr&&<PanelSectionRow>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,
          border:"1px solid #32618d",background:"#102c47",padding:"18px 14px",borderRadius:12}}>
          <img src={"data:image/svg+xml;base64,"+pair.qr} alt="Scan on your phone to connect GOG"
            style={{width:224,height:224,maxWidth:"100%",background:"white",
              borderRadius:9,padding:7,imageRendering:"pixelated"}}/>
          <div style={{fontSize:13,textAlign:"center",lineHeight:1.5}}>
            Scan this QR code using your phone camera.
            <div style={{opacity:.75}}>Both devices must use the same trusted Wi-Fi.</div>
          </div>
          <ButtonItem layout="below" onClick={()=>setShowDetails(v=>!v)}>
            {showDetails?"Hide local URL":"Show local URL if you cannot scan"}
          </ButtonItem>
          {showDetails&&<div style={{maxWidth:"100%",overflowWrap:"anywhere",
            fontSize:12,color:"#e7f4ff"}}>{pair.url}</div>}
        </div>
      </PanelSectionRow>}
      <PanelSectionRow><div style={{fontSize:12,lineHeight:1.6}}>
        On your phone: open the QR link, tap <strong>Open GOG sign-in</strong>,
        log in, copy the final GOG page URL into the local page and tap
        <strong> Connect GOG to Game Library</strong>. Only the one-use
        authorization code is transferred over your local Wi-Fi.
      </div></PanelSectionRow>
      <PanelSectionRow><div style={{fontSize:12,opacity:.85}}>
        Pairing expires after 15 minutes. Use a private network, not public Wi-Fi.
      </div></PanelSectionRow>
      {pair.phase==="error"&&<PanelSectionRow>
        <ButtonItem layout="below" disabled={busy} onClick={start}>Start new pairing</ButtonItem>
      </PanelSectionRow>}
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={cancel}>
        Cancel phone pairing</ButtonItem></PanelSectionRow>
    </>}
    {pair.phase==="connected"&&<PanelSectionRow>
      <div style={{color:"#a1f0c3",fontSize:13}}>
        GOG connected{typeof pair.count==="number"?" · "+pair.count+" games":""}.
      </div></PanelSectionRow>}
    {(pair.phase==="exchanging"||pair.phase==="error"||
      pair.phase==="expired"||pair.phase==="cancelled")&&
      <PanelSectionRow><div role={pair.phase==="error"?"alert":undefined}
        style={{fontSize:12,color:pair.phase==="error"?"#ffc3c3":"#a1e0ff"}}>
        {pair.message||(
          pair.phase==="expired"?"Pairing expired. Start again.":
          pair.phase==="exchanging"?"Connecting to GOG…":"Pairing cancelled.")}
      </div></PanelSectionRow>}
    {error&&<PanelSectionRow><div role="alert" style={{fontSize:12,color:"#ffc3c3"}}>
      {error}</div></PanelSectionRow>}
  </>;
}
