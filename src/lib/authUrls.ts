function normalizeBasePath(rawBasePath: string): string {
  const trimmed = (rawBasePath || '').trim();
  if (!trimmed || trimmed === '/') return '';

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

export function getAuthRedirectUrl(pathname: string): string {
  const safePath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const basePath = normalizeBasePath(__BASE_PATH__);
  return new URL(`${basePath}${safePath}`, window.location.origin).toString();
}
