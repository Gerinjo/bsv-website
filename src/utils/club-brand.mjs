import {suiteBrandTheme} from './brand-themes.mjs';
// This public feed contains design settings only; no Suite member or account data.
export const CLUB_BRAND_URL='https://maejihwjzxkmthjavgnx.supabase.co/rest/v1/social_brand_settings?select=color_scheme,theme_key&id=eq.true';
export const CLUB_BRAND_PUBLIC_KEY='sb_publishable_a3DnmtbBycRR4mWV4Jmz-w_RJobGli9';
export const CLUB_BRAND_DEFAULT={background:'#071f16',panel:'#164f32',primary:'#91c82f',accent:'#f4d638',muted:'#a8cbb4',surface:'#f4f1e8',ink:'#10251a'};
export function clubBrandColors(value){
 if(!value||Object.keys(CLUB_BRAND_DEFAULT).some(key=>!/^#[a-f\d]{6}$/i.test(value[key]||'')))return null;
 return Object.fromEntries(Object.keys(CLUB_BRAND_DEFAULT).map(key=>[key,value[key].toLowerCase()]));
}
export function clubBrandVariables(colors){
 const c=clubBrandColors(colors)||CLUB_BRAND_DEFAULT;
 const mix=(hex,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-t)).toString(16).padStart(2,'0')).join('');
 return {'--bsv-green':c.panel,'--bsv-green-dark':mix(c.panel,.4),'--bsv-green-light':c.panel,'--bsv-background':c.background,'--bsv-primary':c.primary,'--bsv-yellow':c.accent,'--bsv-accent-rgb':[1,3,5].map(i=>parseInt(c.accent.slice(i,i+2),16)).join(' '),'--bsv-accent-dark':mix(c.accent,.23),'--bsv-muted':c.muted,'--bsv-cream':c.surface,'--bsv-ink':c.ink};
}
export function clubBrandSettings(value){
 const colors=clubBrandColors(value?.color_scheme)||CLUB_BRAND_DEFAULT;
 let theme='football';try{theme=suiteBrandTheme(value?.theme_key||'football')}catch{}
 return {color_scheme:colors,theme_key:theme};
}
let brandPromise;
export function loadClubBrandSettings(){
 return brandPromise ||= fetch(CLUB_BRAND_URL,{headers:{apikey:CLUB_BRAND_PUBLIC_KEY},signal:AbortSignal.timeout(4000)})
 .then(async response=>response.ok?clubBrandSettings((await response.json())[0]):clubBrandSettings(null))
 .catch(()=>clubBrandSettings(null));
}
export async function loadClubBrand(){return (await loadClubBrandSettings()).color_scheme;}
