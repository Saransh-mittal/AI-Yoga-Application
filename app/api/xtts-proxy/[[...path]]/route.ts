import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { getXttsBackendUrl } from "@/lib/config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { type: "error", message: "Unauthorized" },
      { status: 401 }
    );
  }

  // Rate limiting for proxy (e.g. 10 requests per minute per user)
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const rateLimitResult = rateLimit(
    `${session.user?.email || ip}-xtts-proxy`,
    10,
    60 * 1000
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { type: "error", message: "Too many requests" },
      { status: 429 }
    );
  }

  const { path } = await params;
  const backendPath = path ? path.join("/") : "";
  const backendUrl = getXttsBackendUrl();
  const url = `${backendUrl}/api/voice-packs${backendPath ? `/${backendPath}` : ""}`;

  try {
    // Clone headers, avoiding host headers that might cause issues
    const proxyHeaders = new Headers();
    request.headers.forEach((value, key) => {
      if (
        key.toLowerCase() !== "host" &&
        key.toLowerCase() !== "connection" &&
        key.toLowerCase() !== "content-length"
      ) {
        proxyHeaders.set(key, value);
      }
    });

    const response = await fetch(url, {
      method: "POST",
      headers: proxyHeaders,
      body: await request.blob(), // Pass the raw body (e.g. FormData) along
    });

    // Create a new response with the backend's status and headers
    const data = await response.blob();
    const proxyResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy backend headers to the response
    response.headers.forEach((value, key) => {
      proxyResponse.headers.set(key, value);
    });

    return proxyResponse;
  } catch (error) {
    console.error("XTTS Proxy Error:", error);
    return NextResponse.json(
      { type: "error", message: "Internal server error connecting to XTTS backend" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  // All proxy endpoints require authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { type: "error", message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { path } = await params;
  const backendPath = path ? path.join("/") : "";

  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const backendUrl = getXttsBackendUrl();
  const url = `${backendUrl}/api/voice-packs${backendPath ? `/${backendPath}` : ""}${queryString}`;

  try {
     const proxyHeaders = new Headers();
     request.headers.forEach((value, key) => {
      if (
        key.toLowerCase() !== "host" &&
        key.toLowerCase() !== "connection"
      ) {
        proxyHeaders.set(key, value);
      }
    });

    const response = await fetch(url, {
        method: "GET",
        headers: proxyHeaders,
        cache: "no-store"
    });

    // Handle SSE streams differently
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
        // Return a readable stream directly
        return new NextResponse(response.body, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        });
    }

    const data = await response.blob();
    const proxyResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    });

    response.headers.forEach((value, key) => {
      proxyResponse.headers.set(key, value);
    });

    return proxyResponse;
  } catch (error) {
    console.error("XTTS Proxy Error:", error);
    return NextResponse.json(
      { type: "error", message: "Internal server error connecting to XTTS backend" },
      { status: 500 }
    );
  }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
  ) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { type: "error", message: "Unauthorized" },
        { status: 401 }
      );
    }
  
    const { path } = await params;
    const backendPath = path ? path.join("/") : "";
    const backendUrl = getXttsBackendUrl();
    const url = `${backendUrl}/api/voice-packs${backendPath ? `/${backendPath}` : ""}`;
  
    try {
      const response = await fetch(url, {
        method: "DELETE",
      });
  
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      console.error("XTTS Proxy Error:", error);
      return NextResponse.json(
        { type: "error", message: "Internal server error connecting to XTTS backend" },
        { status: 500 }
      );
    }
  }
