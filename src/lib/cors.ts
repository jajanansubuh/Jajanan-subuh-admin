export async function cors(req: Request): Promise<Record<string, string>> {
  const origin = req.headers.get("origin") || undefined;

  // List of allowed origins (normalize to compare)
  const allowedOrigins = [
    'http://localhost:3001', // Store development
    'http://localhost:3000', // Admin development
    'https://jajanan-subuh.vercel.app', // Store production (legacy)
    'https://jajanan-subuh-store.vercel.app', // Store production (current)
    'https://jajanan-subuh-admin.vercel.app', // Admin production
  ];

  const normalize = (u?: string) => (u || '').toLowerCase().replace(/:\d+$/, '').replace(/\/+$/, '');
  const normalizedOrigin = normalize(origin);
  const normalizedAllowed = allowedOrigins.map(normalize);

  // Set default CORS headers
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    // include common headers used by clients; header names are case-insensitive
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, x-debug, X-Api-Version",
    "Access-Control-Allow-Credentials": "true",
  };

  // Allow browsers to cache preflight for 1 day
  headers["Access-Control-Max-Age"] = "86400";

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
      // In production: origin is not allowed — set explicit error header
      headers["Access-Control-Allow-Origin"] = "";
      headers["Access-Control-Allow-Credentials"] = "false";
      console.warn('[CORS] Request origin not allowed:', origin, 'normalized:', normalizedOrigin);
    }
  } else {
    // No origin header, block by default in production
    if (process.env.NODE_ENV === 'production') {
      headers["Access-Control-Allow-Origin"] = "";
      headers["Access-Control-Allow-Credentials"] = "false";
    }
  }

  return headers;
}