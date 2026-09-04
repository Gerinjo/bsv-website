import type { AdvertisingPartnerAudienceAssignment } from './advertisingPartners';

export const sponsorAreaOptions = [
  { value: 'all', label: 'Alle Bereiche' },
  { value: 'gesamtverein', label: 'Gesamtverein' },
  { value: 'fussballabteilung', label: 'Fußballabteilung' },
  { value: 'aktive-herren', label: 'Aktive Herren' },
  { value: 'aktive-damen', label: 'Aktive Damen' },
  { value: 'jugendabteilung', label: 'Jugendabteilung' },
  { value: 'alte-herren', label: 'Alte Herren' },
  { value: 'bogensport', label: 'Bogensport' },
  { value: 'gymnastik', label: 'Gymnastik' },
  { value: 'wandergruppe', label: 'Wandergruppe' },
] as const;

export function sponsorAreaKeys(assignment: AdvertisingPartnerAudienceAssignment): string[] {
  const keys = new Set<string>(['all']);

  if (assignment.audienceSlug === 'gesamtverein' || assignment.audienceSlug === 'alle-abteilungen') keys.add('gesamtverein');
  if (assignment.audienceSlug === 'fussballabteilung') keys.add('fussballabteilung');
  if (assignment.audienceGroup === 'mens_team' && assignment.audienceSlug !== 'alte-herren') keys.add('aktive-herren');
  if (assignment.audienceGroup === 'womens_team') keys.add('aktive-damen');
  if (assignment.audienceGroup === 'youth_department' || assignment.audienceGroup === 'youth_team') keys.add('jugendabteilung');
  if (assignment.audienceSlug === 'alte-herren') keys.add('alte-herren');
  if (assignment.audienceGroup === 'department') keys.add(assignment.audienceSlug);

  return [...keys];
}

export function isYouthSponsorAssignment(assignment: AdvertisingPartnerAudienceAssignment): boolean {
  return sponsorAreaKeys(assignment).includes('jugendabteilung');
}
