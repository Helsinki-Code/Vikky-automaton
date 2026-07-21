/**
 * Proxies browser calls to /eve/v1/* and injects real Basic Auth
 * credentials server-side, so the browser never needs to store or send
 * ROUTE_AUTH_USERNAME/PASSWORD itself.
 *
 * Why this exists: the dashboard's session cookie (proxy.ts) gates every
 * page, but eve's own channel auth (agent/channels/eve.ts's httpBasic())
 * is a *separate* check on /eve/v1/* requests, previously satisfied by
 * stashing the raw username/password in the browser's sessionStorage after
 * login (app/lib/client-auth.ts). sessionStorage is per-tab — a tab opened
 * with an already-valid session cookie (e.g. a bookmark, or a tab restored
 * by the OS) has a valid cookie but empty sessionStorage, so chat calls to
 * /eve/v1/session failed with 401 while every other page loaded fine. This
 * proxy sits behind the same cookie gate as everything else and adds the
 * real credential itself, so there's only one source of truth for "is this
 * browser allowed in" — the session cookie.
 */
import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}
export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}
export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

async function proxy(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const username = process.env.ROUTE_AUTH_USERNAME;
  const password = process.env.ROUTE_AUTH_PASSWORD;
  if (!username || !password) {
    return NextResponse.json({ error: "Route auth is not configured." }, { status: 500 });
  }

  const { path } = await ctx.params;
  const targetUrl = new URL(`/${path.join("/")}${request.nextUrl.search}`, request.nextUrl.origin);

  const headers = new Headers(request.headers);
  headers.set("authorization", `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`);
  headers.delete("cookie");
  headers.delete("host");

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    // @ts-expect-error -- Node's fetch requires this when streaming a request body.
    duplex: "half",
    redirect: "manual",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}
