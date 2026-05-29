import { NextResponse } from 'next/server';
import { generateVideoScript } from '@/lib/video/generateScript';
import { generateVoiceover } from '@/lib/video/generateVoiceover';

export async function GET() {
	console.log({
		type: 'service_account',
		project_id: 'gen-lang-client-0649109308',
		private_key_id: 'd0b1665268f5a4052fc67ab850a042d305cc1c40',
		private_key:
			'-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCufFCNLhanB1Y9\n9Di3mpnkONBWKppALnG5ObKGIHsJVbZ52aaCo2D9270y9F21mB9qlNU2KNUl5jeM\nAodK5DHUWrcqFtGH8AQ8GMg4WqhB5a1h918znV9bzIlqdMgnjt6HM0LROg8HOyQl\nU1wFJ51gS1N7YZRUGgfoyhhTUsnSs73ldi/vMrsp/AOIasJtCTWVMXgGzg3bYxGP\nCqhy6fKJns/UraePfRjB5qFGBAD/rFM6B5YGnAxV1m6y8G+2I/IYUkf/jsfL5YID\nYC7sujDbX8NEOD/PqHp9oO7YeETO/x9kgoxIhA2+nnt8qAf1wzOdF/z2cGVhmvYo\nvJXusxpzAgMBAAECggEAIpwfADoFnUD7ztMsEuM0JkxMquLNcPCldyemLSuxLANX\n7CiLejs9CG23RC2rjtMrXCFEf3cu/FMDbp6rxmOoLKaH0W3wRuYJeQAzatY0rMmJ\nkDaYqCzNlvBly3t5njsdEbVNyiGZjIYjH9I+nPkkIs8eMomC+gGl0vuPQqvXw5a2\ntfmBDbVP74esz9t7xvKYfRlUkNam/eo923TA8vWUcogUsudt1QyZo01sLZa1GiSe\n6A1w5EjGZL8INYvNvlHxNt1vNNmI66zEz+yvtyWeLDg1tKDF5DIy/MYnIIHp646g\nsjG7Jn5uRjSrx0xybgjMULAo8eb3e36v8uFWWS5R2QKBgQDXoq9/hSNYRQFwiaRF\nHXgHsWImkasAZNoNoZJKrkoWaTzeccBqMq6PEivd6OjRVBLaslWNT6ReDWg+3HNI\nKp/gJwWB596t5v5sOMOnZXv3JkDMHBdr3E5nreT4FovoHNIIq4j351L737KaGj2j\nIzwVhob5dAuPKbgaiUWqC3UGSQKBgQDPJbb7vHBXn47+fTqCL6q2awanB8v2niSp\n+cQtNesHtwOoZ3uvUR7LEcAmSqVtgm0/wupd/bit3nQikrH8OkdB2YmLkal4F4AS\nKgO34000nrt1Nxrwd32Tkzl6xtN4szqQTRuLGYv1NvXYbLhxW30TuFNmvdHH9haa\nQB1r+xjq2wKBgAkbhe4M4YFI6Nan+ZgxtnAcvdiDLoXFvK/2swcUdWyc5UU/6LCT\nk2vXiKLGw46TzngOMC7Xvkl6p3yAMx5JLpd5DnJ+KJmPuA86Folrb+DwbKwyQ4r6\nsxUN8y3HRgF3tidHl3FhA9A/knuPwCqzwkXmeKzwicxyJqR4R8j20uqBAoGBALok\nDuD5PQ5QEAO5bjkMMmAHnou7otmy1Al1qoZh3BgrqfrLOsaYo44hHkSKcUsNl7Rj\nJ41ccHa03jEvFwcrK1sN6t5i/yEuJOStone8pmTxekvjP670AQD6m/0q616b17VR\nxL1jMHQidhqL39XlO2jcCv3Y9siz5y2nDYk5svNfAoGBAJyhOjrngU56pxOx4dSR\nLGqIb2Ov5nryjSC0RqsDAdC9SQ1w6sCbMjc8xRX+BPm0Yf5Yur/lGGquYaz/YgfS\ndLon68dobcjN/PWYoKmCwCgJA+7NJUjuCo7HlrWDs9Il7y0aXmdIgGDJnWILOOOE\nO4qpYC2QBmtFS9W3W7Vwpbho\n-----END PRIVATE KEY-----\n',
		client_email:
			'ari-tts@gen-lang-client-0649109308.iam.gserviceaccount.com',
		client_id: '110195470482390092774',
		auth_uri: 'https://accounts.google.com/o/oauth2/auth',
		token_uri: 'https://oauth2.googleapis.com/token',
		auth_provider_x509_cert_url:
			'https://www.googleapis.com/oauth2/v1/certs',
		client_x509_cert_url:
			'https://www.googleapis.com/robot/v1/metadata/x509/ari-tts%40gen-lang-client-0649109308.iam.gserviceaccount.com',
		universe_domain: 'googleapis.com',
	});
	const script = await generateVideoScript({
		domain: 'slavo.io',
		clarityScore: 45,
		aiScore: 50,
		overallScore: 48,
		firstImpression:
			'A web development mentorship site that feels vague on specifics.',
		audience: 'Beginner developers and career switchers',
		topIssue: 'Vague value proposition',
		actionTitle: 'Rewrite the headline',
		actionDetails: 'Make your offering clear in the first 5 words',
		suggestedHeadline:
			'Transform Your Career with Structured Web Dev Mentorship',
		suggestedCta: 'Start Free Today',
		style: 'bold',
	});

	const audio = await generateVoiceover({
		scenes: script.scenes,
		style: 'bold',
	});

	return new Response(new Uint8Array(audio), {
		headers: {
			'Content-Type': 'audio/mpeg',
			'Content-Disposition': 'attachment; filename=voiceover.mp3',
		},
	});
}
