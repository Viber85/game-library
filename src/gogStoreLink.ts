import {callable} from "@decky/api";

/** GOG numeric product IDs are not store slugs. Resolve via the provider. */
export type GogStoreLinkReply={ok:boolean;url?:string;reason?:string};
const getStoreLink=callable<[string,string],GogStoreLinkReply>("gog_store_link");
export const requestGogStoreLink=(account:string,product:string)=>
  getStoreLink(account,product);

/** Only a verified direct product page can be opened through Steam's browser. */
export const validGogStoreUrl=(url:string):boolean=>
  /^https:\/\/www\.gog\.com\/en\/game\/[a-z0-9][a-z0-9_-]{0,199}$/.test(url);
