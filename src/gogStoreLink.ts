import {callable} from "@decky/api";

/** GOG numeric product IDs are not store slugs. Resolve via the provider. */
export type GogStoreLinkReply={ok:boolean;url?:string;reason?:string};
const getStoreLink=callable<[string,string],GogStoreLinkReply>("gog_store_link");
export const requestGogStoreLink=(account:string,product:string)=>
  getStoreLink(account,product);

/** Pure URL validation is also shared by our offline navigation tests. */
export {validGogStoreUrl} from "./gogStoreUrl";
