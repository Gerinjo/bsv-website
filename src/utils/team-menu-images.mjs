export function updateTeamMenuImages(root,feed){
 let updated=0;
 root.querySelectorAll('[data-menu-team-path]').forEach(link=>{
  if(!feed?.photos?.has(link.dataset.menuTeamPath))return;
  const photo=feed.photos.get(link.dataset.menuTeamPath),image=photo?.image||'';
  link.dataset.menuImage=/^\/(?!\/)/.test(image)?(root.dataset.basePath||'').replace(/\/$/,'')+image:image;
  updated++;
 });return updated;
}
