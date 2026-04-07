interface PersonaCardProps {
	icon: string;
	title: string;
	pain: string;
	win: string;
}

function PersonaCard({ icon, title, pain, win }: PersonaCardProps) {
	return (
		<div className='flex flex-col gap-4 rounded-2xl border border-choco-100 bg-white/80 p-6 transition-shadow hover:shadow-sm'>
			<div className='flex items-start gap-3'>
				<span className='text-2xl leading-none'>{icon}</span>
				<h3 className='text-sm font-semibold leading-snug text-choco-900'>
					{title}
				</h3>
			</div>
			<div className='space-y-3'>
				<div>
					<p className='mb-1 text-[10px] font-semibold uppercase tracking-widest text-choco-400'>
						The problem
					</p>
					<p className='text-xs leading-relaxed text-choco-700'>
						{pain}
					</p>
				</div>
				<div>
					<p className='mb-1 text-[10px] font-semibold uppercase tracking-widest text-choco-400'>
						How AriClear helps
					</p>
					<p className='text-xs leading-relaxed text-choco-700'>
						{win}
					</p>
				</div>
			</div>
		</div>
	);
}

export function WhoItsForSection() {
	return (
		<section id='who-its-for' className='bg-cream-50'>
			<div className='mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8'>
				<h2 className='text-2xl font-semibold text-choco-900 sm:text-3xl'>
					Who it&apos;s built for
				</h2>
				<p className='mt-2 max-w-2xl text-sm text-choco-700'>
					If AI can&apos;t understand what you do in five seconds,
					neither can your visitors. AriClear is for anyone who ships
					websites and needs both humans and AI to get the message.
				</p>

				<div className='mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4'>
					<PersonaCard
						icon='🚀'
						title='Indie hackers & micro-SaaS founders'
						pain='Your landing page makes perfect sense to you — but AI tools like ChatGPT describe your product in the wrong category, or not at all.'
						win='Scan before you launch. See exactly how AI classifies your product and fix the copy that causes misidentification.'
					/>
					<PersonaCard
						icon='✍️'
						title='Copywriters & content marketers'
						pain='You craft messaging for clients but have no fast way to stress-test clarity before it goes live — or to show clients why a rewrite was needed.'
						win='Run a scan pre- and post-rewrite. The clarity score gives you an objective before/after that clients immediately understand.'
					/>
					<PersonaCard
						icon='🔍'
						title='SEO specialists going GEO'
						pain='Traditional SEO tools tell you about keywords and backlinks — but not whether AI engines can actually extract and cite your brand correctly.'
						win="Layer AriClear's AI-SEO score on top of your existing workflow as a GEO readiness check — no new process required."
					/>
					<PersonaCard
						icon='📦'
						title='Freelancers & small agencies'
						pain="Clients ask 'why isn't our site showing up in AI results?' and you need a clear, visual answer to show in a discovery call or audit report."
						win='Generate a shareable PDF report in seconds. Use it as a lead magnet, an audit deliverable, or the opening slide of a proposal.'
					/>
				</div>
			</div>
		</section>
	);
}
