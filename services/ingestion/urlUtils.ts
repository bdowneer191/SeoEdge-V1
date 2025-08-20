/**
 * Normalizes a given URL string according to specific SEO rules.
 * The normalization process includes:
 * 1. Stripping all UTM query parameters.
 * 2. Enforcing a lowercase hostname.
 * 3. Ensuring a consistent trailing slash.
 *
 * @param pageUrl The original URL to be normalized.
 * @returns The normalized URL string. Returns the original string if it's not a valid URL.
 */
export function normalizeUrl(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);

    // 1. Enforce a lowercase hostname.
    url.hostname = url.hostname.toLowerCase();

    // 2. Strip all UTM query parameters.
    const paramsToDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      if (key.startsWith('utm_')) {
        paramsToDelete.push(key);
      }
    });
    paramsToDelete.forEach(key => url.searchParams.delete(key));

    // 3. Ensure a consistent trailing slash.
    if (url.pathname !== '/' && !url.pathname.endsWith('/')) {
      url.pathname += '/';
    }

    return url.toString();
  } catch (error) {
    console.warn(`Could not normalize invalid URL: ${pageUrl}`);
    return pageUrl;
  }
}
