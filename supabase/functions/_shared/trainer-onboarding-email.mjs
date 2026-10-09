export const TRAINER_TEST_RECIPIENT = 'jerome.ernsberger@gmail.com';
const types = ['trainer-onboarding', 'trainer-membership', 'trainer-keys', 'trainer-dfbnet', 'trainer-welcome'];
export const isTrainerEmail = (type) => types.includes(type);

// These destinations are controlled on the server, never by form fields.
export const getTrainerEmailRecipient = (type, applicantAddress = '') => ({
  'trainer-membership': 'verwaltung@bsvnordstern.de',
  'trainer-keys': 'Markus.Mossbrugger@bsvnordstern.de',
  'trainer-dfbnet': 'dfbnet@bsvnordstern.de',
  'trainer-welcome': applicantAddress,
})[type] ?? null;

export const getTrainerEmailMode = (readValue, globalMode, serverMode = '') => {
  // Only the authenticated PHP server supplies this override. Browser fields
  // never select delivery mode. The central live confirmation still applies.
  const requested = ['live', 'test'].includes(serverMode)
    ? serverMode : readValue('TRAINER_ONBOARDING_MAIL_MODE')?.trim().toLowerCase();
  return requested === 'live' && globalMode === 'live' ? 'live' : 'test';
};
