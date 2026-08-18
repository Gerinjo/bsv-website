const websiteId = import.meta.env.PUBLIC_UMAMI_WEBSITE_ID?.trim() ?? '';
const configuredScriptUrl = import.meta.env.PUBLIC_UMAMI_SCRIPT_URL?.trim() ?? '';
const scriptUrl = configuredScriptUrl || 'https://bsv-nordstern-umami.vercel.app/script.js';

export const umami = {
	enabled: websiteId.length > 0 && scriptUrl.length > 0,
	websiteId,
	scriptUrl,
};
