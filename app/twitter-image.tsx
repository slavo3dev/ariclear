// Default X/Twitter card image for every page (1200x630 PNG), generated at build
// time. Next adds the twitter:image tags.
import { OG_ALT, renderOgCard } from '@/lib/seo/ogCard';

export const alt = OG_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
	return renderOgCard(size);
}
