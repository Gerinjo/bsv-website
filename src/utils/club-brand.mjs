// This public feed contains colors only; no Suite member or account data.
export const CLUB_BRAND_URL='https://maejihwjzxkmthjavgnx.supabase.co/rest/v1/social_brand_settings?select=color_scheme&id=eq.true';
export const CLUB_BRAND_PUBLIC_KEY='sb_publishable_a3DnmtbBycRR4mWV4Jmz-w_RJobGli9';
export const CLUB_BRAND_DEFAULT={background:'#071f16',panel:'#164f32',primary:'#91c82f',accent:'#f4d638',muted:'#a8cbb4',surface:'#f4f1e8',ink:'#10251a'};
export function clubBrandColors(value){
 if(!value||Object.keys(CLUB_BRAND_DEFAULT).some(key=>!/^#[a-f\d]{6}$/i.test(value[key]||'')))return null;
 return Object.fromEntries(Object.keys(CLUB_BRAND_DEFAULT).map(key=>[key,value[key].toLowerCase()]));
}
export function clubBrandVariables(colors){
 const c=clubBrandColors(colors)||CLUB_BRAND_DEFAULT;
 const mix=(hex,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-t)).toString(16).padStart(2,'0')).join('');
 return {'--bsv-green':c.panel,'--bsv-green-dark':mix(c.panel,.4),'--bsv-green-light':c.panel,'--bsv-background':c.background,'--bsv-primary':c.primary,'--bsv-yellow':c.accent,'--bsv-muted':c.muted,'--bsv-cream':c.surface,'--bsv-ink':c.ink};
}
let brandPromise;
export function loadClubBrand(){
 return brandPromise ||= fetch(CLUB_BRAND_URL,{headers:{apikey:CLUB_BRAND_PUBLIC_KEY},signal:AbortSignal.timeout(4000)})
 .then(async response=>response.ok?clubBrandColors((await response.json())[0]?.color_scheme):null)
 .then(colors=>colors||CLUB_BRAND_DEFAULT).catch(()=>CLUB_BRAND_DEFAULT);
}
