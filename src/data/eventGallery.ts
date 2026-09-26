import type { ImageMetadata } from 'astro';

export interface EventGalleryImage {
  src: ImageMetadata;
  title: string;
  alt: string;
  fit?: 'contain';
}

export interface EventGallery {
  images: EventGalleryImage[];
  label: string;
  note: string;
}
