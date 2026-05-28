import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	serverExternalPackages: [
		'@remotion/bundler',
		'@remotion/renderer',
		'@remotion/cli',
		'esbuild',
		'webpack',
	],
};
export default nextConfig;
