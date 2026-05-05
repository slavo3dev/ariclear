'use client';

// app/ask-ari/page.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth, Navbar, SiteFooter } from '@ariclear/components';
import { supabaseAriClear } from '@ariclear/lib';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionStatus = 'waiting' | 'answered';

interface Comment {
	id: string;
	question_id: string;
	author_id: string;
	author_name: string;
	content: string;
	is_expert: boolean;
	created_at: string;
}

interface Question {
	id: string;
	user_id: string;
	user_email?: string;
	title: string;
	url: string | null;
	message: string;
	status: QuestionStatus;
	created_at: string;
	comments: Comment[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function getInitials(name: string) {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

async function checkIsAdmin(): Promise<boolean> {
	try {
		const res = await fetch('/api/ask-ari/check-admin');
		if (!res.ok) return false;
		const { isAdmin } = await res.json();
		return !!isAdmin;
	} catch {
		return false;
	}
}

async function toggleQuestionStatus(
	questionId: string,
	current: QuestionStatus,
): Promise<boolean> {
	const newStatus = current === 'answered' ? 'waiting' : 'answered';
	try {
		const res = await fetch('/api/admin/ask-ari/status', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				question_id: questionId,
				status: newStatus,
			}),
		});
		return res.ok;
	} catch {
		return false;
	}
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: QuestionStatus }) {
	if (status === 'answered') {
		return (
			<span className='inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200'>
				<span className='w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block' />
				Answered
			</span>
		);
	}
	return (
		<span className='inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200'>
			<span className='w-1.5 h-1.5 rounded-full bg-amber-400 inline-block' />
			Awaiting reply
		</span>
	);
}

function Avatar({
	name,
	isExpert = false,
	size = 'sm',
}: {
	name: string;
	isExpert?: boolean;
	size?: 'sm' | 'md';
}) {
	const dim = size === 'md' ? 'w-8 h-8 text-[12px]' : 'w-6 h-6 text-[10px]';
	const colors = isExpert
		? 'bg-emerald-100 text-emerald-700'
		: 'bg-choco-100 text-choco-600';
	return (
		<div
			className={`${dim} ${colors} rounded-full flex items-center justify-center font-medium flex-shrink-0`}>
			{isExpert ? 'Ari' : getInitials(name)}
		</div>
	);
}

function ExpertReply({ comment }: { comment: Comment }) {
	return (
		<div className='border-l-2 border-emerald-500 pl-3.5 py-3 bg-emerald-50/40 rounded-r-lg'>
			<div className='flex items-center gap-2 mb-2 flex-wrap'>
				<div className='w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0'>
					<span className='text-[9px] font-bold text-emerald-700'>
						Ari
					</span>
				</div>
				<span className='text-[13px] font-semibold text-emerald-800'>
					{comment.author_name}
				</span>
				<span className='inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full'>
					<span className='w-1 h-1 rounded-full bg-white inline-block' />
					Expert answer
				</span>
				<span className='text-[11px] text-gray-400'>
					{formatDate(comment.created_at)}
				</span>
			</div>
			<p className='text-[13px] text-gray-700 leading-relaxed'>
				{comment.content}
			</p>
		</div>
	);
}

function CommentItem({ comment }: { comment: Comment }) {
	return (
		<div className='flex gap-2.5'>
			<Avatar
				name={comment.author_name}
				isExpert={comment.is_expert}
				size='sm'
			/>
			<div className='flex-1 min-w-0'>
				<div className='flex items-center gap-2 mb-0.5 flex-wrap'>
					<span className='text-[12px] font-medium text-gray-900'>
						{comment.author_name}
					</span>
					{comment.is_expert && (
						<span className='inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full'>
							<span className='w-1 h-1 rounded-full bg-emerald-500 inline-block' />
							Expert
						</span>
					)}
					<span className='text-[11px] text-gray-400'>
						{formatDate(comment.created_at)}
					</span>
				</div>
				<p className='text-[13px] text-gray-700 leading-relaxed'>
					{comment.content}
				</p>
			</div>
		</div>
	);
}

function WaitingBanner() {
	return (
		<div className='flex items-start gap-2.5 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5'>
			<svg
				className='w-3.5 h-3.5 flex-shrink-0 mt-0.5'
				viewBox='0 0 14 14'
				fill='none'
				stroke='currentColor'
				strokeWidth='1.2'
				strokeLinecap='round'>
				<circle cx='7' cy='7' r='6' />
				<path d='M7 4v3.5l2 1.5' />
			</svg>
			<span>
				Our expert will review this and reply within{' '}
				<strong>24–48 hours</strong>. You&apos;ll see the answer appear
				right here — no email needed.
			</span>
		</div>
	);
}

function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<label className='block text-[12px] font-semibold text-gray-700 mb-1.5'>
				{label}
			</label>
			{children}
			{hint && (
				<p className='text-[11px] text-gray-400 mt-1.5 leading-relaxed'>
					{hint}
				</p>
			)}
		</div>
	);
}

// ─── Admin reply input ────────────────────────────────────────────────────────

function AdminReplyInput({
	questionId,
	onSent,
}: {
	questionId: string;
	onSent: (comment: Comment) => void;
}) {
	const [value, setValue] = useState('');
	const [submitting, setSubmitting] = useState(false);

	async function handleSend() {
		const text = value.trim();
		if (!text || submitting) return;
		setSubmitting(true);
		try {
			const res = await fetch('/api/ask-ari/reply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					question_id: questionId,
					content: text,
				}),
			});
			if (!res.ok) throw new Error('Failed');
			const data = await res.json();
			onSent(data.comment);
			setValue('');
		} catch (err) {
			console.error(err);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className='flex gap-2 mt-3'>
			<input
				type='text'
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={(e) => e.key === 'Enter' && handleSend()}
				placeholder='Reply as Ari…'
				className='flex-1 text-[13px] border border-emerald-200 rounded-lg px-3 py-2 bg-emerald-50/30 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors'
			/>
			<button
				onClick={handleSend}
				disabled={!value.trim() || submitting}
				className='px-4 py-2 text-[12px] font-medium rounded-lg bg-emerald-600 text-white disabled:opacity-30 hover:bg-emerald-700 transition-colors flex-shrink-0'>
				{submitting ? '…' : 'Reply as Ari'}
			</button>
		</div>
	);
}

// ─── Thread card ──────────────────────────────────────────────────────────────

function ThreadCard({
	question,
	isOpen,
	isAdmin,
	adminView,
	userName,
	onToggle,
	onCommentAdded,
	onStatusChanged,
}: {
	question: Question;
	isOpen: boolean;
	isAdmin: boolean;
	adminView: boolean;
	userName: string;
	onToggle: () => void;
	onCommentAdded: (qId: string, comment: Comment) => void;
	onStatusChanged?: (qId: string, status: QuestionStatus) => void;
}) {
	const [togglingStatus, setTogglingStatus] = useState(false);
	const expertReply = question.comments.find((c) => c.is_expert);
	const threadComments = question.comments.filter((c) => !c.is_expert);
	const commentCount = question.comments.length;
	const displayName = adminView
		? (question.user_email ?? userName)
		: userName;

	async function handleStatusToggle(e: React.MouseEvent) {
		e.stopPropagation();
		setTogglingStatus(true);
		const ok = await toggleQuestionStatus(question.id, question.status);
		if (ok)
			onStatusChanged?.(
				question.id,
				question.status === 'answered' ? 'waiting' : 'answered',
			);
		setTogglingStatus(false);
	}

	return (
		<div
			className={`bg-white border rounded-xl overflow-hidden transition-all duration-150 ${isOpen ? 'border-gray-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
			<button
				onClick={onToggle}
				className='w-full flex items-center gap-3 px-4 py-3.5 text-left'>
				<Avatar name={displayName} size='md' />
				<div className='flex-1 min-w-0'>
					<p className='text-[14px] font-medium text-gray-900 truncate'>
						{question.title}
					</p>
					<div className='flex items-center gap-2 mt-0.5 flex-wrap'>
						<StatusBadge status={question.status} />
						<span className='text-[11px] text-gray-400'>
							{formatDate(question.created_at)}
						</span>
						{adminView && question.user_email && (
							<span className='text-[11px] text-gray-400 truncate max-w-[180px]'>
								{question.user_email}
							</span>
						)}
						{commentCount > 0 && (
							<span className='text-[11px] text-gray-400'>
								{commentCount} comment
								{commentCount !== 1 ? 's' : ''}
							</span>
						)}
					</div>
				</div>
				<svg
					className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
					viewBox='0 0 16 16'
					fill='none'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
					strokeLinejoin='round'>
					<path d='M4 6l4 4 4-4' />
				</svg>
			</button>

			{isOpen && (
				<div className='border-t border-gray-100 px-4 pb-4 pt-3 space-y-3'>
					<div className='bg-gray-50 rounded-lg px-3.5 py-3 space-y-1.5'>
						{question.url && (
							<a
								href={question.url}
								target='_blank'
								rel='noopener noreferrer'
								className='flex items-center gap-1.5 text-[11px] text-emerald-600 hover:text-emerald-800 transition-colors break-all'>
								<svg
									className='w-3 h-3 flex-shrink-0'
									viewBox='0 0 12 12'
									fill='none'
									stroke='currentColor'
									strokeWidth='1.2'
									strokeLinecap='round'>
									<path d='M4.5 7.5L7.5 4.5M5 3H3a2 2 0 000 4h1M7 9h2a2 2 0 000-4H8' />
								</svg>
								{question.url}
							</a>
						)}
						<p className='text-[13px] text-gray-700 leading-relaxed'>
							{question.message}
						</p>
					</div>

					{expertReply ? (
						<ExpertReply comment={expertReply} />
					) : (
						<WaitingBanner />
					)}

					{threadComments.length > 0 && (
						<div className='space-y-3 pt-1'>
							<div className='h-px bg-gray-100' />
							{threadComments.map((c) => (
								<CommentItem key={c.id} comment={c} />
							))}
						</div>
					)}

					{/* Admin-only: reply box + status toggle */}
					{isAdmin && adminView && (
						<>
							<AdminReplyInput
								questionId={question.id}
								onSent={(comment) =>
									onCommentAdded(question.id, comment)
								}
							/>
							<div className='flex justify-end pt-1'>
								<button
									onClick={handleStatusToggle}
									disabled={togglingStatus}
									className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
										question.status === 'answered'
											? 'border-amber-200 text-amber-700 hover:bg-amber-50'
											: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
									}`}>
									{togglingStatus
										? '…'
										: question.status === 'answered'
											? 'Mark as open'
											: 'Mark as answered'}
								</button>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}

// ─── New question form ────────────────────────────────────────────────────────

function NewQuestionForm({
	userId,
	onCreated,
	onCancel,
}: {
	userId: string;
	onCreated: (q: Question) => void;
	onCancel: () => void;
}) {
	const [title, setTitle] = useState('');
	const [url, setUrl] = useState('');
	const [message, setMessage] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit() {
		setError(null);
		if (!title.trim()) {
			setError('Please add a question title.');
			return;
		}
		if (!message.trim()) {
			setError('Please describe your question.');
			return;
		}
		setSubmitting(true);
		try {
			const res = await fetch('/api/ask-ari/question', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					url: url.trim() || null,
					message: message.trim(),
				}),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error ?? 'Failed');
			}
			const { question } = await res.json();
			onCreated({ ...question, comments: [] });
		} catch (err: unknown) {
			console.error(err);
			setError('Failed to submit your question. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className='bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm'>
			<div className='flex items-center gap-2 mb-5'>
				<div className='w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0'>
					<svg
						className='w-3 h-3 text-emerald-600'
						viewBox='0 0 12 12'
						fill='none'
						stroke='currentColor'
						strokeWidth='1.8'
						strokeLinecap='round'>
						<path d='M6 1v10M1 6h10' />
					</svg>
				</div>
				<h2 className='text-[15px] font-semibold text-gray-900'>
					Ask a new question
				</h2>
			</div>
			<div className='space-y-4'>
				<Field
					label='Question title *'
					hint='Keep it short and specific. E.g. "Why is my AI clarity score low despite clear headings?"'>
					<input
						type='text'
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder='e.g. Why is my AI clarity score showing 42 despite good content?'
						className='w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors'
					/>
				</Field>
				<Field
					label='Website URL'
					hint='Paste the specific page you want reviewed. Leave blank if your question is general.'>
					<input
						type='url'
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder='https://yourwebsite.com/homepage'
						className='w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors'
					/>
				</Field>
				<Field
					label='Describe your question *'
					hint="Include what you expected, what you saw, and anything you've already tried.">
					<textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder={
							'Tell us what\'s happening.\n• "My scan shows a low structure score but I have clear H1/H2 headings — what am I missing?"\n• "Can you explain what \'AI extractability\' means and how to fix it on my site?"'
						}
						rows={5}
						className='w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors resize-y'
					/>
				</Field>
				{error && (
					<p className='text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
						{error}
					</p>
				)}
				<div className='flex items-center justify-between pt-1'>
					<p className='text-[11px] text-gray-400'>
						* Required. Expert reply within 24–48 hours.
					</p>
					<div className='flex items-center gap-2'>
						<button
							onClick={onCancel}
							className='px-4 py-2 text-[13px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'>
							Cancel
						</button>
						<button
							onClick={handleSubmit}
							disabled={submitting}
							className='px-5 py-2 text-[13px] font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
							{submitting ? 'Submitting…' : 'Submit question'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AskAriPage() {
	const { user: authUser, loading: authLoading } = useAuth();
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(false);
	const [openIds, setOpenIds] = useState<Set<string>>(new Set());
	const [showForm, setShowForm] = useState(false);
	const [activeTab, setActiveTab] = useState<'all' | 'open' | 'answered'>(
		'all',
	);
	const [isAdmin, setIsAdmin] = useState(false);
	const [adminView, setAdminView] = useState(false);
	const [search, setSearch] = useState('');
	const channelRef = useRef<RealtimeChannel | null>(null);

	const user = authUser
		? {
				id: authUser.id,
				email: authUser.email ?? '',
				name:
					authUser.user_metadata?.full_name ??
					authUser.user_metadata?.name ??
					authUser.email?.split('@')[0] ??
					'User',
			}
		: null;

	useEffect(() => {
		if (!authUser) {
			setIsAdmin(false);
			return;
		}
		checkIsAdmin().then(setIsAdmin);
	}, [authUser]);

	const fetchQuestions = useCallback(async () => {
		if (!authUser?.id) return;
		setLoading(true);
		try {
			const endpoint = adminView
				? '/api/admin/ask-ari/questions'
				: '/api/ask-ari/questions';
			const res = await fetch(endpoint);
			if (!res.ok) throw new Error('Failed to fetch');
			const { questions: data } = await res.json();
			const normalised = (data ?? []).map((q: Question) => ({
				...q,
				comments: (q.comments ?? []).sort(
					(a: Comment, b: Comment) =>
						new Date(a.created_at).getTime() -
						new Date(b.created_at).getTime(),
				),
			}));
			setQuestions(normalised);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [authUser?.id, adminView]);

	useEffect(() => {
		fetchQuestions();
	}, [fetchQuestions]);

	// Reset state when switching views
	useEffect(() => {
		setOpenIds(new Set());
		setSearch('');
		setActiveTab('all');
		setShowForm(false);
	}, [adminView]);

	useEffect(() => {
		if (!authUser?.id) return;
		channelRef.current = supabaseAriClear
			.channel('ask-ari-realtime')
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'questions' },
				(payload) => {
					const newQ = payload.new as Question;
					setQuestions((prev) => {
						if (prev.find((q) => q.id === newQ.id)) return prev;
						return [{ ...newQ, comments: [] }, ...prev];
					});
				},
			)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'questions' },
				(payload) => {
					const updated = payload.new as Question;
					setQuestions((prev) =>
						prev.map((q) =>
							q.id === updated.id
								? { ...q, status: updated.status }
								: q,
						),
					);
				},
			)
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'comments' },
				(payload) => {
					const newComment = payload.new as Comment;
					setQuestions((prev) =>
						prev.map((q) =>
							q.id === newComment.question_id
								? {
										...q,
										status: newComment.is_expert
											? 'answered'
											: 'waiting',
										comments: q.comments.find(
											(c) => c.id === newComment.id,
										)
											? q.comments
											: [...q.comments, newComment],
									}
								: q,
						),
					);
				},
			)
			.subscribe();
		return () => {
			channelRef.current?.unsubscribe();
		};
	}, [authUser?.id]);

	function toggleThread(id: string) {
		setOpenIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	function handleCommentAdded(questionId: string, comment: Comment) {
		setQuestions((prev) =>
			prev.map((q) =>
				q.id === questionId
					? {
							...q,
							status: comment.is_expert ? 'answered' : 'waiting',
							comments: q.comments.find(
								(c) => c.id === comment.id,
							)
								? q.comments
								: [...q.comments, comment],
						}
					: q,
			),
		);
	}

	function handleStatusChanged(
		questionId: string,
		newStatus: QuestionStatus,
	) {
		setQuestions((prev) =>
			prev.map((q) =>
				q.id === questionId ? { ...q, status: newStatus } : q,
			),
		);
	}

	function handleNewQuestion(q: Question) {
		setQuestions((prev) => [q, ...prev]);
		setOpenIds((prev) => new Set([...prev, q.id]));
		setShowForm(false);
		setActiveTab('all');
	}

	const filtered = questions.filter((q) => {
		const matchesTab =
			activeTab === 'all' ||
			(activeTab === 'open' && q.status !== 'answered') ||
			(activeTab === 'answered' && q.status === 'answered');
		const matchesSearch =
			!search ||
			q.title.toLowerCase().includes(search.toLowerCase()) ||
			q.message.toLowerCase().includes(search.toLowerCase()) ||
			(q.user_email ?? '').toLowerCase().includes(search.toLowerCase());
		return matchesTab && matchesSearch;
	});

	const answeredCount = questions.filter(
		(q) => q.status === 'answered',
	).length;
	const openCount = questions.filter((q) => q.status !== 'answered').length;

	if (authLoading) {
		return (
			<div className='min-h-screen bg-cream-50'>
				<Navbar />
				<div className='max-w-2xl mx-auto px-4 py-10 space-y-3'>
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className='bg-white border border-gray-200 rounded-xl h-16 animate-pulse'
						/>
					))}
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className='min-h-screen bg-cream-50'>
				<Navbar />
				<div
					className='flex items-center justify-center'
					style={{ minHeight: 'calc(100vh - 64px)' }}>
					<div className='text-center'>
						<div className='w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3'>
							<svg
								className='w-6 h-6 text-emerald-600'
								viewBox='0 0 16 16'
								fill='currentColor'>
								<path d='M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM8 12c-1.67 0-3.14-.85-4-2.14.02-1.33 2.67-2.06 4-2.06s3.98.73 4 2.06A4.77 4.77 0 018 12z' />
							</svg>
						</div>
						<p className='text-[15px] font-medium text-gray-900'>
							Sign in to use Ask Ari
						</p>
						<p className='text-[13px] text-gray-500 mt-1'>
							Get expert answers to your website clarity
							questions.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-cream-50'>
			<Navbar />
			<div className='max-w-2xl mx-auto px-4 py-8 sm:py-10'>
				{/* Page header */}
				<div className='flex items-start justify-between mb-6'>
					<div>
						<div className='flex items-center gap-2.5 mb-1'>
							<div className='w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0'>
								<svg
									className='w-4 h-4 text-white'
									viewBox='0 0 16 16'
									fill='currentColor'>
									<path d='M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM8 12c-1.67 0-3.14-.85-4-2.14.02-1.33 2.67-2.06 4-2.06s3.98.73 4 2.06A4.77 4.77 0 018 12z' />
								</svg>
							</div>
							<h1 className='text-[20px] font-semibold text-gray-900'>
								Ask Ari
								{adminView && (
									<span className='ml-2 text-[12px] font-medium text-choco-500 bg-choco-100 px-2 py-0.5 rounded-full align-middle'>
										Admin
									</span>
								)}
							</h1>
						</div>
						<p className='text-[13px] text-gray-500 pl-[42px]'>
							{adminView
								? 'All user questions · Replying as Ari'
								: 'Ask anything about your website scores or strategy. Expert reply within 24–48 hours.'}
						</p>
					</div>

					<div className='flex items-center gap-2 flex-shrink-0 ml-4'>
						{/* Admin view toggle — DB-confirmed admins only */}
						{isAdmin && (
							<button
								onClick={() => setAdminView((v) => !v)}
								className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${
									adminView
										? 'bg-choco-800 text-cream-50 border-choco-800'
										: 'bg-white text-choco-700 border-choco-200 hover:bg-choco-50'
								}`}>
								{adminView ? '★ Admin' : 'Admin'}
							</button>
						)}
						{!adminView && (
							<button
								onClick={() => {
									setShowForm(true);
									setActiveTab('all');
								}}
								className='flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors'>
								<svg
									className='w-3 h-3'
									viewBox='0 0 12 12'
									fill='none'
									stroke='currentColor'
									strokeWidth='2'
									strokeLinecap='round'>
									<path d='M6 1v10M1 6h10' />
								</svg>
								New question
							</button>
						)}
					</div>
				</div>

				{/* Admin search */}
				{adminView && (
					<div className='mb-4'>
						<input
							type='text'
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder='Search questions or user emails…'
							className='w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-choco-400 focus:ring-1 focus:ring-choco-400 transition-colors'
						/>
					</div>
				)}

				{/* New question form */}
				{showForm && !adminView && (
					<NewQuestionForm
						userId={user.id}
						onCreated={handleNewQuestion}
						onCancel={() => setShowForm(false)}
					/>
				)}

				{/* Tabs */}
				<div className='flex items-center gap-1 mb-4'>
					{(['all', 'open', 'answered'] as const).map((tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors border ${
								activeTab === tab
									? 'bg-white border-gray-300 text-gray-900 shadow-sm'
									: 'border-transparent text-gray-500 hover:text-gray-700'
							}`}>
							{tab === 'all'
								? 'All'
								: tab === 'open'
									? 'Open'
									: 'Answered'}
							{tab === 'all' && questions.length > 0 && (
								<span className='w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-medium'>
									{questions.length}
								</span>
							)}
							{tab === 'open' && openCount > 0 && (
								<span className='w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] flex items-center justify-center font-medium'>
									{openCount}
								</span>
							)}
							{tab === 'answered' && answeredCount > 0 && (
								<span className='w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-medium'>
									{answeredCount}
								</span>
							)}
						</button>
					))}
				</div>

				{/* Thread list */}
				{loading ? (
					<div className='space-y-3'>
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className='bg-white border border-gray-200 rounded-xl h-16 animate-pulse'
							/>
						))}
					</div>
				) : filtered.length === 0 ? (
					<div className='text-center py-14'>
						<div className='w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4'>
							<svg
								className='w-7 h-7 text-emerald-500'
								viewBox='0 0 24 24'
								fill='none'
								stroke='currentColor'
								strokeWidth='1.5'
								strokeLinecap='round'
								strokeLinejoin='round'>
								<path d='M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' />
							</svg>
						</div>
						{activeTab === 'all' && !adminView ? (
							<>
								<p className='text-[16px] font-semibold text-gray-900 mb-1'>
									Talk to an expert — it&apos;s free
								</p>
								<p className='text-[13px] text-gray-500 max-w-sm mx-auto leading-relaxed mb-6'>
									Get a real human answer on your clarity
									score, AI visibility, homepage copy, or
									anything about your website strategy.
								</p>
								<div className='flex flex-col items-center gap-2 mb-6'>
									{[
										'Why is my AI clarity score lower than expected?',
										"How do I improve my site's structure for AI tools?",
										'Can you review my homepage and suggest improvements?',
										'What does "AI extractability" mean for my business?',
									].map((example) => (
										<div
											key={example}
											className='flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2 max-w-sm w-full text-left text-gray-500 text-[12px]'>
											<span className='text-emerald-400 flex-shrink-0'>
												→
											</span>
											<span>{example}</span>
										</div>
									))}
								</div>
								<button
									onClick={() => setShowForm(true)}
									className='inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors'>
									<svg
										className='w-3.5 h-3.5'
										viewBox='0 0 12 12'
										fill='none'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'>
										<path d='M6 1v10M1 6h10' />
									</svg>
									Ask your first question
								</button>
								<p className='text-[11px] text-gray-400 mt-3'>
									Expert reply within 24–48 hours
								</p>
							</>
						) : (
							<>
								<p className='text-[15px] font-semibold text-gray-800 mb-1'>
									{search
										? 'No matching questions'
										: activeTab === 'open'
											? 'All caught up!'
											: `No ${activeTab} questions`}
								</p>
								<p className='text-[13px] text-gray-400'>
									{search
										? 'Try a different search term.'
										: 'Switch tabs to see other questions.'}
								</p>
							</>
						)}
					</div>
				) : (
					<div className='space-y-2'>
						{filtered.map((q) => (
							<ThreadCard
								key={q.id}
								question={q}
								isOpen={openIds.has(q.id)}
								isAdmin={isAdmin}
								adminView={adminView}
								userName={user.name}
								onToggle={() => toggleThread(q.id)}
								onCommentAdded={handleCommentAdded}
								onStatusChanged={handleStatusChanged}
							/>
						))}
					</div>
				)}
			</div>
			<SiteFooter />
		</div>
	);
}
