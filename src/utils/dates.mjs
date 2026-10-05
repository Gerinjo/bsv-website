// Use explicit fields: locale defaults can omit leading zeroes or spell out months.
export const germanDateFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin',
});

export const germanDateTimeFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
});

export const formatDate = (value) => germanDateFormat.format(new Date(value));
export const formatDateTime = (value) => germanDateTimeFormat.format(new Date(value));
