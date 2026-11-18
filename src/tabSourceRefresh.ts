/**
 * Sequenced, observable async source refresh.
 *
 * Separate from React so Decky QAM navigation cannot accidentally stop
 * automatic TabMaster discovery. In-flight calls are never allowed to
 * overwrite a newer refresh after a Decky enable/disable event.
 */
export function createSourceRefresh<T>(
  load:()=>Promise<T>,
  initial:T,
  fingerprint:(value:T)=>string,
) {
  let active=false;
  let generation=0;
  let busy=false;
  let rerun=false;
  let current=initial;
  let signature=fingerprint(initial);
  const listeners=new Set<(value:T)=>void>();

  const refresh=async():Promise<void>=>{
    if(!active)return;
    if(busy){rerun=true;return;}
    busy=true;
    const epoch=generation;
    try{
      const value=await load();
      // If a newer refresh was requested while an older backend request
      // was in-flight, ignore the stale response entirely.
      if(active&&epoch===generation&&!rerun){
        const next=fingerprint(value);
        if(next!==signature){
          current=value;
          signature=next;
          for(const listener of Array.from(listeners)){
            try{listener(value);}catch(error){console.warn("[game-library] tab subscriber failed",error);}
          }
        }
      }
    }catch(error){
      // A temporary backend timeout should not erase last known-good tabs.
      console.warn("[game-library] tab refresh failed",error);
    }finally{
      busy=false;
      if(active&&epoch===generation&&rerun){
        rerun=false;
        void refresh();
      }
    }
  };
  return {
    start(){
      if(active)return;
      active=true;
      generation++;
      void refresh();
    },
    stop(){
      active=false;
      generation++;
      rerun=false;
    },
    refresh,
    subscribe(listener:(value:T)=>void){
      listeners.add(listener);
      return ()=>{listeners.delete(listener);};
    },
    getSnapshot(){return current;},
    isActive(){return active;},
  };
}
