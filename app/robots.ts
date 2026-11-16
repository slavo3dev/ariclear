import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Every crawler, AI search and answer bots included, may read the public
// site. Signed-in areas, APIs and individual scan reports are excluded (they
// also require a session, and send noindex).
export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: ['/api/', '/dashboard', '/history', '/scan/', '/billing/'],
			},
		],
		sitemap: `${SITE_URL}/sitemap.xml`,
		host: SITE_URL,
	};
}
