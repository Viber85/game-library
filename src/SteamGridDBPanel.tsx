import {useEffect,useState} from "react";
import {callable} from "@decky/api";
import {
  ButtonItem,Navigation,PanelSection,PanelSectionRow,TextField,ToggleField,
} from "@decky/ui";
import {clearArtworkLookupCache} from "./steamGridArtwork";

type ProviderSettings={enabled:boolean;has_key:boolean};
const readSettings=callable<[],ProviderSettings>("get_steamgriddb_settings");
const saveKey=callable<[string],{ok:boolean;reason:string}>("set_steamgriddb_key");
const clearKey=callable<[],boolean>("clear_steamgriddb_key");
const setEnabled=callable<[boolean],boolean>("set_steamgriddb_enabled");

const KEY_URL="https://www.steamgriddb.com/profile/preferences/api";

/** Artwork is optional: nothing contacts SteamGridDB before a key is saved. */
export function SteamGridDBPanel(){
  const [settings,setSettings]=useState<ProviderSettings|null>(null);
  const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{
    let mounted=true;
    void readSettings().then(value=>{if(mounted)setSettings(value);})
      .catch(()=>{if(mounted)setError("Artwork settings unavailable");});
    return ()=>{mounted=false;};
  },[]);
  const update=async()=>{
    const next=await readSettings();
    setSettings(next);
    clearArtworkLookupCache();
  };
  const save=()=>{
    if(busy||!draft.trim())return;
    setBusy(true);setError("");setNotice("");
    void saveKey(draft.trim()).then(async answer=>{
      if(!answer.ok)throw new Error(answer.reason||"Unable to save API key");
      setDraft("");
      await update();
      setNotice("Key saved locally. Missing Steam covers and heroes will be filled automatically.");
    }).catch(()=>setError("Unable to save key. Check its format and retry."))
      .finally(()=>setBusy(false));
  };
  const remove=()=>{
    if(busy)return;
    setBusy(true);setError("");setNotice("");
    void clearKey().then(async ok=>{
      if(!ok)throw new Error("Remove refused");
      setDraft("");
      await update();
      setNotice("API key removed. Existing Steam artwork is unchanged.");
    }).catch(()=>setError("Unable to remove API key."))
      .finally(()=>setBusy(false));
  };
  const toggle=(next:boolean)=>{
    if(busy||!settings?.has_key)return;
    setBusy(true);setError("");setNotice("");
    void setEnabled(next).then(async ok=>{
      if(!ok)throw new Error("Save failed");
      await update();
    }).catch(()=>setError("Unable to save artwork preference."))
      .finally(()=>setBusy(false));
  };

  return <PanelSection title="Game Library · SteamGridDB Artwork">
    <PanelSectionRow>
      <ToggleField
        label="Auto-fill missing Steam cover and hero"
        description="Only when Steam's existing image is unavailable. Search by exact game name; custom and native artwork always take priority."
        checked={settings?.enabled===true&&settings.has_key}
        disabled={busy||!settings?.has_key}
        onChange={toggle}
      />
    </PanelSectionRow>
    <PanelSectionRow>
      <div style={{fontSize:12,opacity:.82,lineHeight:1.5}}>
        {settings?.has_key ? "Personal API key saved locally (hidden)." :
          "Requires a free personal SteamGridDB API key."}
        {" "}Game titles are sent to SteamGridDB only after you add a key and enable this feature.
        Artwork appears in Game Library only; Steam's own library files are not changed.
      </div>
    </PanelSectionRow>
    <PanelSectionRow>
      <TextField label="SteamGridDB API key" value={draft} bIsPassword
        disabled={busy} onChange={event=>setDraft(event.target.value)}/>
    </PanelSectionRow>
    <PanelSectionRow>
      <ButtonItem layout="below" disabled={busy||draft.trim().length<20}
        onClick={save}>Save API key</ButtonItem>
    </PanelSectionRow>
    {settings?.has_key&&<PanelSectionRow>
      <ButtonItem layout="below" disabled={busy} onClick={remove}>
        Remove saved API key
      </ButtonItem>
    </PanelSectionRow>}
    <PanelSectionRow>
      <ButtonItem layout="below" onClick={()=>{
        Navigation.NavigateToExternalWeb(KEY_URL);
        Navigation.CloseSideMenus();
      }}>Get SteamGridDB API key</ButtonItem>
    </PanelSectionRow>
    {notice&&<PanelSectionRow><div style={{fontSize:12,color:"#bbebd3"}}>{notice}</div></PanelSectionRow>}
    {error&&<PanelSectionRow><div style={{fontSize:12,color:"#ffb1b9"}}>{error}</div></PanelSectionRow>}
  </PanelSection>;
}
