const TAB_KEY='monochrome.auth-tab';
/** Distinct SDK storage/BroadcastChannel keys keep tabs separate, including window.open clones. */
export function createTabAuthOptions(options={}){
 try{const storage=options.storage??globalThis.sessionStorage,navigationType=options.navigationType??globalThis.performance?.getEntriesByType?.('navigation')?.[0]?.type,randomUUID=options.randomUUID??(()=>crypto.randomUUID());if(!storage)return {auth:{persistSession:false},restoreSession:false};const old=navigationType==='reload'?storage.getItem(TAB_KEY):null,key=old??`monochrome.auth.${randomUUID()}`;storage.setItem(TAB_KEY,key);return {auth:{persistSession:true,storageKey:key,storage},restoreSession:!!old};}catch{return {auth:{persistSession:false},restoreSession:false};}
}
