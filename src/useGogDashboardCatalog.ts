import {useEffect,useState} from "react";
import {callable} from "@decky/api";
import type {GogOwnedGame} from "./GogArtwork";

type LibraryReply={
  ok:boolean;games:GogOwnedGame[];needs_art_refresh?:boolean;reason?:string;
};
type SyncReply={ok:boolean;reason?:string};
const readGogLibrary=callable<[string],LibraryReply>("get_gog_library");
const syncGogLibrary=callable<[string],SyncReply>("sync_gog_library");

/** One provider cache read per Dashboard route, with a slow local-cache poll
 * to reflect refreshed libraries. No OAuth secrets or logins cross the UI. */
export function useGogDashboardCatalog(accountId:string,enabled:boolean){
  const [games,setGames]=useState<GogOwnedGame[]>([]);
  const [status,setStatus]=useState<"idle"|"loading"|"ready"|"disconnected"|"error">("idle");

  useEffect(()=>{
    let live=true,refreshingLegacyArt=false,started=false;
    if(!enabled||!accountId){
      setGames([]);
      setStatus("idle");
      return;
    }
    const load=async()=>{
      try{
        if(!started){started=true;setStatus("loading");}
        const reply=await readGogLibrary(accountId);
        if(!live)return;
        if(!reply.ok){
          setGames([]);
          setStatus("disconnected");
          return;
        }
        setGames(Array.isArray(reply.games)?reply.games:[]);
        setStatus("ready");
        if(reply.needs_art_refresh&&!refreshingLegacyArt){
          refreshingLegacyArt=true;
          // A successful owned-catalog refresh also replaces legacy entries
          // whose GOG image hashes were discarded in early test builds.
          const result=await syncGogLibrary(accountId);
          if(!live)return;
          if(result.ok){
            const updated=await readGogLibrary(accountId);
            if(live&&updated.ok&&Array.isArray(updated.games))
              setGames(updated.games);
          }
        }
      }catch{
        if(live)setStatus("error");
        // Keep a previously complete local snapshot if one poll fails.
      }
    };
    void load();
    const timer=window.setInterval(()=>{void load();},30000);
    return ()=>{live=false;window.clearInterval(timer);};
  },[accountId,enabled]);

  return {games,status};
}
