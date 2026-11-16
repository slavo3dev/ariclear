// lib/email/index.ts
// Provider-agnostic email sending. Callers use sendEmail(); which service
// delivers it is chosen by EMAIL_PROVIDER.
//
// Supported today:
//   (unset)  -> nothing is sent; sendEmail() returns 'disabled'
//   log      -> development only: logs the subject (never the address/body)
// A real provider (Resend, Postmark, SES, ...) is added as one more
// EmailProvider below once chosen.

import { createLogger } from '@/lib/logger';

const log = createLogger('email');

export type EmailMessage = {
	to: string;
	subject: string;
	text: string;
	html?: string;
	/** Adds List-Unsubscribe headers where the provider supports them. */
	unsubscribeUrl?: string;
};

export interface EmailProvider {
	readonly name: string;
	send(message: EmailMessage): Promise<void>;
}

const logProvider: EmailProvider = {
	name: 'log',
	async send(message) {
		log.info('email (log provider, not delivered)', {
			subject: message.subject,
			chars: message.text.length,
		});
	},
};

export function emailProvider(): EmailProvider | null {
	switch ((process.env.EMAIL_PROVIDER ?? '').toLowerCase()) {
		case 'log':
			return logProvider;
		case '':
			return null;
		default:
			log.warn('unknown EMAIL_PROVIDER, email disabled', {
				provider: process.env.EMAIL_PROVIDER,
			});
			return null;
	}
}

export type SendResult = 'sent' | 'disabled' | 'failed';

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
	const provider = emailProvider();
	if (!provider) return 'disabled';
	try {
		await provider.send(message);
		return 'sent';
	} catch {
		log.error('send failed', { provider: provider.name });
		return 'failed';
	}
}
