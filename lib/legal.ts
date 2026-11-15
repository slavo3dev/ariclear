// lib/legal.ts
// Facts used by /terms, /privacy and /refund. Confirm every value, then set
// LEGAL_REVIEWED = true to remove the "draft" notice from those pages.

export const LEGAL = {
	/** Legal name of the business that sells AriClear. */
	operator: 'Prototype.NEXT',
	/** Where support and legal requests go. */
	contactEmail: 'hello@ariclear.com',
	/** Governing law, e.g. "the State of Delaware, USA". */
	governingLaw: 'the jurisdiction where the operator is registered',
	/** Days after purchase in which a full refund can be requested. */
	refundDays: 14,
	/** Shown at the top of every legal page. */
	lastUpdated: 'November 15, 2026',
} as const;

export const LEGAL_REVIEWED = false;
