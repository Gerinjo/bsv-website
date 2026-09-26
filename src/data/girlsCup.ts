import { GIRLS_CUP_EVENT, GIRLS_CUP_FEE_LABEL } from '../../supabase/functions/_shared/girls-cup-event.mjs';

export const girlsCup = {
  ...GIRLS_CUP_EVENT,
  id: 'bodensee-indoor-girls-cup',
  href: '/erlebnis/bodensee-indoor-girls-cup',
  fee: GIRLS_CUP_FEE_LABEL,
  artwork: '/images/events/bodensee-indoor-girls-cup-2027.svg',
  rulesUrl: 'https://www.sbfv.de/fileadmin/user_upload/Nav_SBFV/ab/AB11_Futsal_0.pdf',
  rulesOverviewUrl: 'https://www.sbfv.de/sbfv/ausfuehrungsbestimmungen',
  rules: [
    { division: 'E-Juniorinnen', players: '5 Feldspielerinnen + 1 Torhüterin', ball: 'Futsal-Lightball, Größe 3 oder 4 (bis 340 g)', maxMinutes: 75 },
    { division: 'D-Juniorinnen', players: '4 Feldspielerinnen + 1 Torhüterin', ball: 'Futsal-Lightball, Größe 4', maxMinutes: 90 },
    { division: 'C-Juniorinnen', players: '4 Feldspielerinnen + 1 Torhüterin', ball: 'Futsalball, Größe 4 (400–440 g)', maxMinutes: 105 },
    { division: 'B-Juniorinnen', players: '4 Feldspielerinnen + 1 Torhüterin', ball: 'Futsalball, Größe 4 (400–440 g)', maxMinutes: 120 },
  ],
} as const;
