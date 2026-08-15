export const LIVE_EMAIL_CONFIRMATION = 'SEND_BSV_EMAILS_TO_REAL_RECIPIENTS';

export function resolveEmailMode(readValue) {
  const requestedMode = String(readValue('EMAIL_DELIVERY_MODE') ?? 'test').trim().toLowerCase();
  const liveConfirmed = readValue('EMAIL_LIVE_CONFIRMATION') === LIVE_EMAIL_CONFIRMATION;
  const live = requestedMode === 'live' && liveConfirmed;
  return {
    mode: live ? 'live' : 'test',
    testMode: !live,
    requestedMode,
    liveBlocked: requestedMode === 'live' && !liveConfirmed,
  };
}
