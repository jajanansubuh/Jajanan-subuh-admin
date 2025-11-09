import { NextResponse } from "next/server";

export async function cors(req: Request) {
  const origin = req.headers.get("origin");
  
  // List of allowed origins
  const allowedOrigins = [
    'http://localhost:3001',    // Store development
    'http://localhost:3000',    // Admin development
    'https://jajanan-subuh.vercel.app',  // Store production
    'https://jajanan-subuh-admin.vercel.app', // Admin production
  ];

  // Always return CORS headers, but only set Allow-Origin for allowed origins
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
  
  // Only set Allow-Origin if the origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return NextResponse.json({}, { headers });
    }

    return headers;
  }

  // If origin is not allowed
  return NextResponse.json({ error: "Not allowed" }, { status: 403 });
}