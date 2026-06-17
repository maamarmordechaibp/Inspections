function normalizeBasePath(rawBasePath: string): string {
  const trimmed = (rawBasePath || '').trim();
  if (!trimmed || trimmed === '/') return '';

  // Guard against accidentally passing a domain name via BASE_PATH
  // (e.g. "new.example.com"), which should never be treated as a path.
  if (!trimmed.startsWith('/') && !/^https?:\/\//i.test(trimmed) && trimmed.includes('.')) {
    return '';
  }

  let basePath = trimmed;
  if (/^https?:\/\//i.test(basePath)) {
    try {
      basePath = new URL(basePath).pathname || '';
    } catch {
      basePath = '';
    }
  }

  if (!basePath) return '';
  if (!basePath.startsWith('/')) basePath = `/${basePath}`;
  basePath = basePath.replace(/\/+$|\s+$/g, '');
  if (basePath === '/') return '';
  return basePath;
}

function resolveAuthOrigin(): string {
  const configuredOrigin = (import.meta.env.VITE_AUTH_REDIRECT_ORIGIN as string | undefined)?.trim();
  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      // Fall back to runtime origin if invalid URL is configured.
    }
  }

  return window.location.origin;
}

export function getAuthRedirectUrl(pathname: string): string {
  const safePath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const basePath = normalizeBasePath(__BASE_PATH__);
  return new URL(`${basePath}${safePath}`, resolveAuthOrigin()).toString();
}
