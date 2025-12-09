export interface PreorderPayload {
  email: string;
  url?: string;
}

export async function preorderRequest({ email, url }: PreorderPayload) {
  const sourceURL =
    typeof window !== "undefined" ? window.location.href : "unknown";

  const res = await fetch("/api/preorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      url,
      sourceURL,
    }),
  });

  let json = null;

  try {
    json = await res.json();
    if (res.status === 409) {
      return { ok: false, duplicate: true, error: json.error };
    }
  } catch (e) {
    console.error("Invalid JSON response from preorder API");
  }

  if (!res.ok) {
    return { ok: false, error: json?.error || "Request failed" };
  }

  return { ok: true, data: json };
}
