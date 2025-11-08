import { NextResponse } from "next/server";

export async function cors(req: Request) {
  const origin = req.headers.get("origin");
  
  // List of allowed origins
  const allowedOrigins = [
    'http://localhost:3001',    // Store development
    'http://localhost:3000',    // Admin development
    process.env.STORE_URL,      // Store production
    process.env.ADMIN_URL,      // Admin production
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return NextResponse.json({}, { headers });
    }

    return headers;
  }

  // If origin is not allowed
  return NextResponse.json({ error: "Not allowed" }, { status: 403 });
}