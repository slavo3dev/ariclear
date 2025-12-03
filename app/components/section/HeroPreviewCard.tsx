
export function HeroPreviewCard() {
  return (
    <div className="flex-1">
      <div className="mx-auto max-w-md rounded-2xl bg-choco-900 p-5 text-cream-50 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-choco-700">
              <span className="text-lg font-semibold">🐶</span>
            </div>
            <div className="leading-tight">
              <p className="text-xs text-choco-100">Ari</p>
              <p className="text-sm font-medium">Clarity Companion</p>
            </div>
          </div>
          <span className="rounded-full bg-choco-700 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-choco-100">
            preview
          </span>
        </div>

        <div className="space-y-3 rounded-xl bg-choco-800/70 p-4">
          <div className="rounded-lg bg-choco-900/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-choco-200">
              Clarity score
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="text-3xl font-semibold">68 / 100</p>
              <span className="rounded-full bg-choco-700 px-2 py-1 text-[11px] text-choco-100">
                Needs work
              </span>
            </div>
            <p className="mt-2 text-xs text-choco-100">
              A new visitor will notice your design and vibe, but it takes
              effort to understand what you actually do.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-choco-200">
              Ari&apos;s quick read
            </p>
            <ul className="space-y-1 text-xs text-choco-50">
              <li>• Headline sounds nice but doesn&apos;t say what you are.</li>
              <li>• No clear target audience in the hero.</li>
              <li>• Primary CTA is visually weak compared to other links.</li>
            </ul>
          </div>

          <div className="space-y-2 rounded-lg bg-choco-900/60 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-choco-200">
              Suggested hero copy
            </p>
            <p className="text-sm font-semibold">
              Project management for remote teams, in one simple dashboard.
            </p>
            <p className="text-xs text-choco-100">
              Assign tasks, track deadlines and see your team&apos;s workload at
              a glance — without 10 different tools.
            </p>
            <div className="mt-2 flex gap-2">
              <span className="rounded-full bg-choco-700 px-3 py-1 text-[11px]">
                Start free trial
              </span>
              <span className="rounded-full border border-choco-600 px-3 py-1 text-[11px] text-choco-100">
                Watch 2-min demo
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-choco-200">
          This is a mock preview. The real AriClear will analyze your actual
          homepage once early access launches.
        </p>
      </div>
    </div>
  );
}
