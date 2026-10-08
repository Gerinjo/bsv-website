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

export const getTrainerEmailMode = (readValue, globalMode) =>
  readValue('TRAINER_ONBOARDING_MAIL_MODE')?.trim().toLowerCase() === 'live' && globalMode === 'live' ? 'live' : 'test';
