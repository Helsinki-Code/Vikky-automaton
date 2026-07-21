/**
 * Cloudflare API helper — domains + DNS, replacing Conway's registrar.
 *
 * Requires CLOUDFLARE_API_TOKEN (and CLOUDFLARE_ACCOUNT_ID for registrar
 * operations) in the app environment. Tools using this run in the app
 * runtime; the token never enters the sandbox.
 */

const API = "https://api.cloudflare.com/client/v4";

export function cloudflareConfigured(): boolean {
  return !!process.env.CLOUDFLARE_API_TOKEN;
}

export async function cf<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    throw new Error(
      "Cloudflare is not configured. Set CLOUDFLARE_API_TOKEN (and CLOUDFLARE_ACCOUNT_ID) in .env.local.",
    );
  }
  const resp = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await resp.json()) as {
    success: boolean;
    result: T;
    errors?: Array<{ code: number; message: string }>;
  };
  if (!resp.ok || !data.success) {
    const msg = data.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") || resp.statusText;
    throw new Error(`Cloudflare API error (${method} ${path}): ${msg}`);
  }
  return data.result;
}

export function accountId(): string {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!id) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID is not set — required for registrar operations.");
  }
  return id;
}

/** Availability check via public RDAP: a 404 means the domain is unregistered. */
export async function checkAvailability(domain: string): Promise<{ domain: string; registered: boolean | "unknown" }> {
  try {
    const resp = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      redirect: "follow",
    });
    if (resp.status === 404) return { domain, registered: false };
    if (resp.ok) return { domain, registered: true };
    return { domain, registered: "unknown" };
  } catch {
    return { domain, registered: "unknown" };
  }
}
