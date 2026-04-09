interface StepCardProps {
	number: string;
	title: string;
	description: string;
	tag: string;
	tagVariant: 'neutral' | 'human' | 'ai';
}

function StepCard({
	number,
	title,
	description,
	tag,
	tagVariant,
}: StepCardProps) {
	const tagStyles = {
		neutral: 'bg-choco-50 text-choco-500',
		human: 'bg-green-50 text-green-700',
		ai: 'bg-blue-50 text-blue-700',
	};

	return (
		<div className='flex flex-col gap-3 rounded-2xl border border-choco-100 bg-white p-5 shadow-soft'>
			<span className='text-[10px] font-semibold uppercase tracking-[0.16em] text-choco-400'>
				{number}
			</span>
			<h3 className='text-sm font-semibold leading-snug text-choco-900'>
				{title}
			</h3>
			<p className='text-xs leading-relaxed text-choco-700'>
				{description}
			</p>
			<span
				className={`self-start rounded-md px-2 py-1 text-[10px] font-semibold ${tagStyles[tagVariant]}`}>
				{tag}
			</span>
		</div>
	);
}

export function HowItWorksSection() {
	return (
		<section
			id='how-it-works'
			className='border-y border-choco-100 bg-white/80'>
			<div className='mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8'>
				<h2 className='text-2xl font-semibold text-choco-900 sm:text-3xl'>
					How AriClear works
				</h2>
				<p className='mt-2 max-w-2xl text-sm text-choco-700'>
					Paste a URL. In under 10 seconds you get two scores and a
					clear action plan — no setup, no agency required.
				</p>

				<div className='mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4'>
					<StepCard
						number='01'
						title='Paste your URL and your goal'
						description='Drop in your homepage — or any landing page. Optionally tell Ari who your audience is and what action you want visitors to take: start a trial, book a demo, buy.'
						tag='~10 seconds to scan'
						tagVariant='neutral'
					/>
					<StepCard
						number='02'
						title='Human clarity check'
						description='Ari reads your hero section like a first-time visitor with 10 seconds to spare. It scores whether your headline, value prop, and CTA land clearly — and flags every point of confusion.'
						tag='Clarity score'
						tagVariant='human'
					/>
					<StepCard
						number='03'
						title='AI-SEO check'
						description='Ari also reads your page as an AI indexer would — testing whether ChatGPT, Perplexity, and similar tools can correctly classify your business and cite you in relevant answers.'
						tag='AI-SEO score'
						tagVariant='ai'
					/>
					<StepCard
						number='04'
						title='Specific fixes, not generic tips'
						description='You get rewritten headline and CTA suggestions, keyword gaps, structured data quick-wins, and a copy-paste prompt to feed your AI tool of choice — all referencing your actual page content.'
						tag='PDF report included'
						tagVariant='neutral'
					/>
				</div>
			</div>
		</section>
	);
}
c;
