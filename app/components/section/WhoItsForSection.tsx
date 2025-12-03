interface PersonaCardProps {
  title: string;
  description: string;
}

function PersonaCard({ title, description }: PersonaCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-choco-100 bg-white/80 p-5">
      <h3 className="text-sm font-semibold text-choco-900">{title}</h3>
      <p className="text-xs leading-relaxed text-choco-700">{description}</p>
    </div>
  );
}

export function WhoItsForSection() {
  return (
    <section id="who-its-for" className="bg-cream-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-choco-900 sm:text-3xl">
          Built for people who care about clarity
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-choco-700">
          AriClear is not another generic SEO tool. It&apos;s a clarity
          companion for people obsessed with better messaging.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <PersonaCard
            title="Founders & indie hackers"
            description="Validate that your landing page explains your product before you ship new features or run paid ads."
          />
          <PersonaCard
            title="Marketers & growth teams"
            description="Use clarity scores as a quick pre-flight check before campaigns, landing page tests or redesigns."
          />
          <PersonaCard
            title="Copywriters & agencies"
            description="Add AriClear reports to your audit deliverables and show clients exactly where they confuse visitors."
          />
        </div>
      </div>
    </section>
  );
}
