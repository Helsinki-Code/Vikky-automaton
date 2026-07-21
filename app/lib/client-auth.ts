"use client";

/**
 * Bridges the dashboard's own login to the eve HTTP channel's httpBasic()
 * auth (agent/channels/eve.ts's creatorAuth()). The dashboard's session
 * cookie (app/lib/session.ts) protects Next.js *pages*; it does not
 * authenticate the browser's direct calls to /eve/v1/* made by useEveAgent.
 * On localhost, eve's localDev() covers those calls for free — but on a
 * real deployment only vercelOidc() or this same httpBasic() credential
 * does, and useEveAgent needs an explicit Authorization header for that.
 *
 * Session-storage only (cleared when the tab closes), same-origin only.
 */
const KEY = "automaton_basic_auth";

export function storeBasicAuth(username: string, password: string): void {
  sessionStorage.setItem(KEY, btoa(`${username}:${password}`));
}

export function clearBasicAuth(): void {
  sessionStorage.removeItem(KEY);
}

export function basicAuthHeader(): Record<string, string> {
  const encoded = sessionStorage.getItem(KEY);
  return encoded ? { authorization: `Basic ${encoded}` } : {};
}
