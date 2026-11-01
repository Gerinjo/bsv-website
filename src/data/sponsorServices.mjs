export function assertUniqueSponsorServices(assignments, label) {
  const keys = assignments.map(item => JSON.stringify([item.audienceSlug, item.sponsorType?.slug ?? null]));
  if (new Set(keys).size !== keys.length) throw new Error(`Sponsorleistungen für ${label} sind doppelt vorhanden.`);
}

// One logo per team partner, while retaining every service and its own text.
export function teamSponsorDetails(assignments, audienceSlug) {
  const matches = assignments.filter(item => item.audienceSlug === audienceSlug);
  if (!matches.length) return null;
  return {
    typeLabel: [...new Set(matches.map(item => item.sponsorType?.label).filter(Boolean))].join(' · ') || undefined,
    description: matches.filter(item => item.description).map(item =>
      matches.length > 1 && item.sponsorType?.label ? `${item.sponsorType.label}: ${item.description}` : item.description,
    ).join(' ') || undefined,
  };
}
