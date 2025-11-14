export async function cors(req: Request): Promise<Record<string, string>> {
  const origin = req.headers.get("origin");
  
  // List of allowed origins
  const allowedOrigins = [
    'http://localhost:3001',    // Store development
    'http://localhost:3000',    // Admin development
    'https://jajanan-subuh.vercel.app',  // Store production
    'https://jajanan-subuh-admin.vercel.app', // Admin production
  ];

  // Set default CORS headers
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
  
  // Set Access-Control-Allow-Origin if origin is allowed, or allow all in development
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    } else if (process.env.NODE_ENV !== 'production') {
      // Allow all origins in development for easier debugging
      headers["Access-Control-Allow-Origin"] = origin;
    }
  }

  return headers;
}