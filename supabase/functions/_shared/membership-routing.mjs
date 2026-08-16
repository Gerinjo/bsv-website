export const INTERNAL_MEMBERSHIP_ROUTING_KEYS = ['membership', 'passwesen'];

const teamRoutingKeyPattern = /^team--[a-z0-9-]+(?:--[a-z0-9-]+)+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getMembershipRoutingKeys = (messageType, routingKey = '') => {
  if (messageType === 'internal') return INTERNAL_MEMBERSHIP_ROUTING_KEYS;
  if (messageType === 'team' && teamRoutingKeyPattern.test(routingKey)) return [routingKey];
  return null;
};

export const collectRecipientEmails = (rows) => {
  const addresses = rows.flatMap((row) => [
    row?.email,
    ...(Array.isArray(row?.weitere_emails) ? row.weitere_emails : []),
  ]);

  const normalized = addresses
    .filter((address) => typeof address === 'string')
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);

  if (normalized.some((address) => !emailPattern.test(address))) return null;
  return [...new Set(normalized)];
};
