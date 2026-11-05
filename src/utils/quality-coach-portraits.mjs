import { optimizedImageUrl, imageFresh, imageKey } from './optimized-images.mjs';

export function qualityCoachPortraits(feed) {
  if (!feed) return null;
  const portraits = new Map();
  for (const [path, coaches] of feed) {
    if (!path.startsWith('jugend/')) continue;
    for (const coach of coaches) {
      if (portraits.has(coach.name)) continue;
      const image = coach.image;
      const safe = typeof image === 'string' && (/^https:\/\//.test(image) || /^\/(?!\/)/.test(image));
      portraits.set(coach.name, safe && imageFresh(image) ? optimizedImageUrl(image, 900) : '');
    }
  }
  return portraits;
}

export function updateQualityCoachPortraits(root, feed) {
  const portraits = qualityCoachPortraits(feed);
  if (!portraits) return false;
  for (const portrait of root.querySelectorAll('[data-live-portrait]')) {
    const name = portrait.dataset.livePortrait;
    const source = portraits.get(name);
    const url = source && /^\/(?!\/)/.test(source) ? (root.dataset?.basePath || '').replace(/\/$/, '') + source : source;
    const current = portrait.querySelector('img');
    if (!source) {
      if (current) {
        const initials = portrait.ownerDocument.createElement('span');
        initials.setAttribute('aria-hidden', 'true');
        initials.textContent = name.split(/\s+/).map(part => part[0]).join('').slice(0, 2);
        portrait.replaceChildren(initials);
      }
      continue;
    }
    if (current && imageKey(current.getAttribute('src')) === imageKey(url) && imageFresh(current.getAttribute('src'))) continue;
    const image = portrait.ownerDocument.createElement('img');
    image.src = url;
    image.alt = name;
    image.width = 480; image.height = 600;
    image.loading = 'lazy'; image.decoding = 'async';
    if (source.includes('/transparent/')) image.setAttribute('data-profile-cutout', '');
    portrait.replaceChildren(image);
  }
  return true;
}
