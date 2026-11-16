// lib/domain.ts
// One site = one domain, whatever the visitor typed. "WWW.Example.com.",
// "www.example.com" and "example.com" all count as the same site for plan
// limits and history. Must match normalize_domain() in SQL.

export function normalizeDomain(hostOrUrl: string): string {
	let host = hostOrUrl.trim();
	try {
		if (/^[a-z][a-z0-9+.-]*:\/\//i.test(host)) host = new URL(host).hostname;
	} catch {
		// Not a URL: treat it as a host name.
	}
	return host.toLowerCase().replace(/\.+$/, '').replace(/^www\./, '');
}
