// Confirmed by Jérôme Ernsberger on 25 October 2026 for tournament fees paid to the youth treasury.
export const YOUTH_TREASURY = Object.freeze({
  accountHolder: 'BSV Nordstern e.V. Radolfzell',
  bank: 'Sparkasse Hegau-Bodensee',
  iban: 'DE77692500350004103677',
  bic: 'SOLADES1SNG',
});

export function tournamentPayment({ event, clubName, reference, amount }) {
  const suffix = ` / ${reference}`;
  const prefix = `${event.name ?? event.title} / ${clubName}`;
  return {
    ...YOUTH_TREASURY,
    amount,
    // SEPA remittance information is limited to 140 characters; retain the full registration reference.
    purpose: `${prefix.slice(0, Math.max(0, 140 - suffix.length)).trim()}${suffix}`,
  };
}
