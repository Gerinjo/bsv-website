import {optimizedImageUrl,imageKey,imageFresh} from './optimized-images.mjs';

const safeImage=value=>typeof value==='string'&&(/^https:\/\//.test(value)||/^\/(?!\/)/.test(value))?value:'';
export const CLUB_HEADER_IMAGE='/images/fussball/sportplaetze/bd41b6f7d7-hauptplatz-hp.png';

export function chooseHeaderPhoto(profiles,feed,{teamPath='',scope='',currentPath='',exclude=[],random=Math.random}={}){
 const available=profiles.flatMap(profile=>{
  const image=safeImage(feed?.photos?.has(profile.path)?feed.photos.get(profile.path)?.image:profile.image);
  return image&&!exclude.includes(imageKey(optimizedImageUrl(image)))?[{path:profile.path,name:profile.name,image}]:[];
 });
 const own=available.find(photo=>photo.path===teamPath);
 if(own)return {...own,fallback:false};
 const relevant=available.filter(photo=>!scope||photo.path.startsWith(scope+'/'));
 const choices=relevant.length?relevant:available;
 const selected=choices.find(photo=>photo.path===currentPath)||choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
 return selected?{...selected,fallback:!!teamPath}:{path:'',name:'Sportplatz des BSV Nordstern',image:CLUB_HEADER_IMAGE,fallback:true};
}

export function applyHeaderPhoto(root,photo){
 const image=root.querySelector('[data-header-image]');
 const source=optimizedImageUrl(photo.image);
 const url=/^\/(?!\/)/.test(source)?(root.dataset.basePath||'').replace(/\/$/,'')+source:source;
 const old=image.getAttribute('src');
 if(!old||imageKey(old)!==imageKey(url)||!imageFresh(old))image.setAttribute('src',url);
 image.alt=photo.path?'Mannschaftsbild '+photo.name:photo.name;
 image.dataset.teamPhotoFallback=String(photo.fallback);
 image.dataset.originalSrc=photo.image;
 root.dataset.currentTeamPath=photo.path;
 root.dataset.fullImage=url;
 root.dataset.headerLabel=photo.name;
 const label=root.querySelector('[data-header-label]');if(label)label.textContent=photo.name;
 const button=root.querySelector('[data-header-photo-open]');if(button)button.setAttribute('aria-label',image.alt+' vergrößern');
}
