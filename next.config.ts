import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	async redirects() {
		return [
			// One scan detail page: the old History view now lives at /scan/[id].
			{ source: '/history/:id', destination: '/scan/:id', permanent: true },
		];
	},
};

export default nextConfig;
