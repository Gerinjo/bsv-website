import {suiteBrandTheme} from './brand-themes.mjs';
// This public feed contains design settings only; no Suite member or account data.
export const CLUB_BRAND_URL='https://maejihwjzxkmthjavgnx.supabase.co/rest/v1/social_brand_settings?select=color_scheme,theme_key&id=eq.true';
export const CLUB_BRAND_PUBLIC_KEY='sb_publishable_a3DnmtbBycRR4mWV4Jmz-w_RJobGli9';
export const CLUB_BRAND_DEFAULT={background:'#071f16',panel:'#164f32',primary:'#91c82f',accent:'#f4d638',muted:'#a8cbb4',surface:'#f4f1e8',ink:'#10251a'};
export function clubBrandColors(value){
 if(!value||Object.keys(CLUB_BRAND_DEFAULT).some(key=>!/^#[a-f\d]{6}$/i.test(value[key]||'')))return null;
 return Object.fromEntries(Object.keys(CLUB_BRAND_DEFAULT).map(key=>[key,value[key].toLowerCase()]));
}
// Same seven-color CSD proposal as the Suite; custom colors remain independent.
export const CLUB_BRAND_PRIDE={background:'#171a36',panel:'#293777',primary:'#28b678',accent:'#ffd447',muted:'#c6d5ff',surface:'#fff8f1',ink:'#17213a'};
export function clubBrandRibbon(value){
 const c=clubBrandColors(value);
 return c&&Object.keys(CLUB_BRAND_DEFAULT).every(key=>c[key]===CLUB_BRAND_PRIDE[key])?['#e40303','#ff8c00','#ffed00','#008026','#004dff','#750787']:[];
}
export function clubBrandVariables(colors){
 const c=clubBrandColors(colors)||CLUB_BRAND_DEFAULT,ribbon=clubBrandRibbon(c);
 const light=parseInt(c.background.slice(1,3),16)*.2126+parseInt(c.background.slice(3,5),16)*.7152+parseInt(c.background.slice(5,7),16)*.0722>128;
 const hero={ink:light?c.ink:'#ffffff',muted:light?c.panel:'#d2e3d8',accent:light?c.panel:c.accent};
 const mix=(hex,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-t)).toString(16).padStart(2,'0')).join('');
 return {'--bsv-hero-ink':hero.ink,'--bsv-hero-muted':hero.muted,'--bsv-hero-accent':hero.accent,'--bsv-hero-rgb':(light?c.panel:'#ffffff').slice(1).match(/../g).map(v=>parseInt(v,16)).join(' '),'--bsv-ribbon':ribbon.length?`linear-gradient(90deg,${ribbon.map((color,i)=>`${color} ${i*100/6}% ${(i+1)*100/6}%`).join(',')})`:'none','--bsv-ribbon-height':ribbon.length?'6px':'0px','--bsv-green':c.panel,'--bsv-green-dark':mix(c.panel,.4),'--bsv-green-light':c.panel,'--bsv-background':c.background,'--bsv-primary':c.primary,'--bsv-yellow':c.accent,'--bsv-accent-rgb':[1,3,5].map(i=>parseInt(c.accent.slice(i,i+2),16)).join(' '),'--bsv-accent-dark':mix(c.accent,.23),'--bsv-muted':c.muted,'--bsv-cream':c.surface,'--bsv-ink':c.ink};
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
