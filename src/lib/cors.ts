export async function cors(req: Request): Promise<Record<string, string>> {
  const origin = req.headers.get("origin") || undefined;

  // List of allowed origins (normalize to compare)
  const allowedOrigins = [
    'http://localhost:3001', // Store development
    'http://localhost:3000', // Admin development
    'https://jajanan-subuh.vercel.app', // Store production
    'https://jajanan-subuh-admin.vercel.app', // Admin production
  ];

  const normalize = (u?: string) => (u || '').toLowerCase().replace(/:\d+$/, '').replace(/\/+$/, '');
  const normalizedOrigin = normalize(origin);
  const normalizedAllowed = allowedOrigins.map(normalize);

  // Set default CORS headers
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  // Always set Vary: Origin so CDNs/cache won't wrongly cache wildcard responses
  headers['Vary'] = 'Origin';

  if (origin) {
    // If origin matches allowlist, set it explicitly
    if (normalizedAllowed.includes(normalizedOrigin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    } else if (process.env.NODE_ENV !== 'production') {
      // In development allow the incoming origin for easier debugging
      headers["Access-Control-Allow-Origin"] = origin;
    } else {
      // In production: origin is not allowed — do not set wildcard; log a warning
      console.warn('[CORS] Request origin not allowed:', origin);
      // Optionally you could set headers["Access-Control-Allow-Origin"] = origin;
      // but it's safer to NOT allow unknown origins in production.
    }
  }

  return headers;
}