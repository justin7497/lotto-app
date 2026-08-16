import { getEbayApiBase } from "./config.mjs";

/** @param {{ accessToken: string; env: "sandbox" | "production" }} session */
export function createEbayClient(session) {
  const baseUrl = getEbayApiBase(session.env);

  async function request(method, path, { body, headers } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Content-Language": "en-US",
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!res.ok) {
      const message =
        data?.errors?.map((e) => e.message || e.longMessage).join("; ") ||
        data?.error_description ||
        data?.message ||
        `eBay API ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.details = data;
      throw err;
    }

    return data ?? {};
  }

  return {
    get: (path, opts) => request("GET", path, opts),
    post: (path, body, opts) => request("POST", path, { body, ...opts }),
    put: (path, body, opts) => request("PUT", path, { body, ...opts }),
    delete: (path, opts) => request("DELETE", path, opts),
  };
}
