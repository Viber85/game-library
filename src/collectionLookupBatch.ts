/** Cache Steam collection lookups only during ONE TabMaster tab sweep.
 * Do not persist across refreshes: UnifiedDeck can rebuild Epic/GOG membership
 * while Steam's CAppOverview remains identical.
 */
export type CollectionLookup={
  native:(id:string,name?:string)=>ReadonlySet<number>|null;
  unified:(store:"Epic"|"GOG")=>ReadonlySet<number>|null;
};

export function createCollectionLookupBatch(source:CollectionLookup):CollectionLookup{
  const natives=new Map<string,ReadonlySet<number>|null>();
  const unified=new Map<"Epic"|"GOG",ReadonlySet<number>|null>();
  return {
    native(id,name){
      const key=JSON.stringify([id,name??null]);
      if(!natives.has(key))natives.set(key,source.native(id,name));
      return natives.get(key)??null;
    },
    unified(store){
      if(!unified.has(store))unified.set(store,source.unified(store));
      return unified.get(store)??null;
    },
  };
}
