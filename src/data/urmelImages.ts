import gruppenfoto from '../../public/images/events/urmel/2026/08-gruppenfoto.webp';
import spielszene from '../../public/images/events/urmel/2026/01-spielszene.webp';
import torschuss from '../../public/images/events/urmel/2026/02-torschuss.webp';
import medaillen from '../../public/images/events/urmel/2026/05-medaillen.webp';
import siegerehrung from '../../public/images/events/urmel/2026/06-siegerehrung.webp';
import type { EventGallery } from './eventGallery';

export const urmelGallery: EventGallery = {
  label: 'Fünf Eindrücke vom URMEL-Cup 2026',
  note: 'Echte Erinnerungen an den URMEL-Cup am 01.05.2026.',
  images: [
    { src: torschuss, title: 'Kleine Kicker in Aktion', alt: 'Torschuss beim URMEL Bambini Spieltag 2026' },
    { src: spielszene, title: 'Gemeinsam auf dem Platz', alt: 'Spielszene beim URMEL Bambini Spieltag 2026' },
    { src: medaillen, title: 'Eine Medaille für die Erinnerung', alt: 'Medaillen für die Kinder beim URMEL-Cup 2026' },
    { src: siegerehrung, title: 'Ein schöner Abschluss', alt: 'Kinder erhalten ihre Medaillen bei der Siegerehrung des URMEL-Cups 2026' },
    { src: gruppenfoto, title: 'Kids spielen für Kids', alt: 'Großes Gruppenfoto mit Kindern und Trainerteam beim URMEL-Cup 2026', fit: 'contain' },
  ],
};
