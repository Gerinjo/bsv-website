const configuredBase = import.meta.env.BASE_URL || '/';
const baseSegment = configuredBase.replace(/^\/+|\/+$/g, '');

export const BASE_URL = baseSegment ? `/${baseSegment}/` : '/';

const absoluteUrlPattern = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;
const legacyPathAliases: Record<string, string> = {
  '/j4/docs/BSV%20Nordstern%20Vereinssatzung%20Stand%2031.01.2023.pdf': '/dokumente/bsv-nordstern-satzung-2023.pdf',
  '/neuigkeiten': '/#neuigkeiten',
  '/spielberichte-juniorinnen': '/jugend/juniorinnen/spielberichte',
};

export const withBase = (path: string) => {
  if (!path || absoluteUrlPattern.test(path)) return path;

  const baseWithoutTrailingSlash = BASE_URL === '/' ? '' : BASE_URL.slice(0, -1);
  if (baseWithoutTrailingSlash && (path === baseWithoutTrailingSlash || path.startsWith(`${baseWithoutTrailingSlash}/`))) {
    return path;
  }

  return `${BASE_URL}${path.replace(/^\/+/, '')}`;
};

export const withBaseInHtml = (html: string) => html.replace(
  /\b(href|src|poster|action)=(['"])(\/(?!\/)[^'"]*)\2/gi,
  (_match, attribute: string, quote: string, path: string) => {
    const pathWithoutQuery = path.split(/[?#]/, 1)[0];
    const normalizedPath = legacyPathAliases[pathWithoutQuery] ?? path;
    return `${attribute}=${quote}${withBase(normalizedPath)}${quote}`;
  },
);
