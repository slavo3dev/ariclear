interface StepCardProps {
  title: string;
  description: string;
  number?: string;
}

function StepCard({ title, description, number }: StepCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-choco-100 bg-white p-5 shadow-soft">
      {number && (
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-choco-400">
          {number}
        </span>
      )}
      <h3 className="text-sm font-semibold text-choco-900">{title}</h3>
      <p className="text-xs leading-relaxed text-choco-700">{description}</p>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="border-y border-choco-100 bg-white/80"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-choco-900 sm:text-3xl">
          How AriClear will work
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-choco-700">
          AriClear runs your homepage through two lenses: how a real person
          understands it in the first few seconds, and how an AI model reads,
          classifies and uses your content.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <StepCard
            number="01"
            title="Provide your homepage URL"
            description="Paste your main URL and, if you like, add who your product is for and what you want visitors to do (book a demo, start a trial, buy, subscribe, etc.)."
          />
          <StepCard
            number="02"
            title="Human & AI understanding check"
            description="Ari scans your hero section like a first-time visitor and like an AI model—testing what people think you do in ~10 seconds and what AI believes your site is about."
          />
          <StepCard
            number="03"
            title="Suggestions for humans & AI"
            description="You get suggestions to improve human readability, AI optimization and structure: clearer hero copy, better value framing, and more AI-readable wording and prompts so models can actually ‘get’ your site."
          />
        </div>
      </div>
    </section>
  );
}
