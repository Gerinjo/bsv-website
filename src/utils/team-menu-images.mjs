import {optimizedImageUrl,imageKey,imageFresh} from './optimized-images.mjs';
export function updateTeamMenuImages(root,feed){
 let updated=0;
 root.querySelectorAll('[data-menu-team-path]').forEach(link=>{
  if(!feed?.photos?.has(link.dataset.menuTeamPath))return;
  const photo=feed.photos.get(link.dataset.menuTeamPath),image=optimizedImageUrl(photo?.previewImage||photo?.image||'',900);
  if(link.dataset.menuImage&&imageKey(link.dataset.menuImage)===imageKey(image)&&imageFresh(link.dataset.menuImage))return;
  link.dataset.menuImage=/^\/(?!\/)/.test(image)?(root.dataset.basePath||'').replace(/\/$/,'')+image:image;
  updated++;
 });return updated;
}
