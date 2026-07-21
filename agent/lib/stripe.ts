/**
 * Stripe API helper — the automaton's real-money rails.
 *
 * Requires STRIPE_SECRET_KEY in the app environment. Uses Stripe's REST API
 * directly (form-encoded) — no SDK dependency. Runs only in the app runtime;
 * the key never enters the sandbox and card data never touches the agent.
 */

const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function encodeForm(params: Record<string, string | number | undefined>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    parts.push(`${encodeURIComponent(prefix ? `${prefix}[${key}]` : key)}=${encodeURIComponent(String(value))}`);
  }
  return parts;
}

export async function stripe<T = Record<string, unknown>>(
  method: "GET" | "POST",
  path: string,
  form?: string[],
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local.");
  }
  const resp = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: method === "POST" && form ? form.join("&") : undefined,
  });
  const data = (await resp.json()) as T & { error?: { message?: string } };
  if (!resp.ok) {
    throw new Error(`Stripe API error (${method} ${path}): ${data.error?.message || resp.statusText}`);
  }
  return data;
}

export { encodeForm };
