import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-choco-100 bg-cream-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-choco-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">

        {/* LEFT SIDE */}
        <p className="flex flex-wrap items-center gap-1">
          © {year}{" "}
          <a
            href="https://www.prototypenext.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-choco-800 underline-offset-2 hover:underline"
          >
            Prototype.NEXT
          </a>
          {" • "}
          <a
            href="https://www.slavo.io"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-choco-800 underline-offset-2 hover:underline"
          >
            slavo.io
          </a>
        </p>

        {/* MIDDLE: legal */}
        <nav aria-label="Legal" className="flex flex-wrap items-center gap-3">
          <Link href="/terms" className="hover:text-choco-900 hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-choco-900 hover:underline">
            Privacy
          </Link>
          <Link href="/refund" className="hover:text-choco-900 hover:underline">
            Refunds
          </Link>
        </nav>

        {/* RIGHT SIDE */}
        <p className="text-[11px] text-choco-700">
          Ari helps humans and AI understand your website.
        </p>
      </div>
    </footer>
  );
}
