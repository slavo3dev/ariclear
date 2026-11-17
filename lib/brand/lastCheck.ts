// lib/brand/lastCheck.ts
// CLIENT ONLY. The latest brand check, kept in this browser so the page can
// show it again and the dashboard can show its score. A convenience only:
// nothing breaks when storage is unavailable (private mode, blocked).

import type { BrandCheckResult, PlatformInput, PlatformKey } from '@/lib/brand/alignment';

const KEY = 'ariclear.brandCheck.v1';

export type LastBrandCheck = {
	websiteUrl: string;
	businessName: string;
	platforms: Partial<Record<PlatformKey, PlatformInput>>;
	result: BrandCheckResult;
	checkedAt: string;
};

export function loadLastBrandCheck(): LastBrandCheck | null {
	try {
		const raw = window.localStorage.getItem(KEY);
		if (!raw) return null;
		const v = JSON.parse(raw) as LastBrandCheck;
		return v && v.result && Array.isArray(v.result.platforms) ? v : null;
	} catch {
		return null;
	}
}

export function saveLastBrandCheck(v: LastBrandCheck): void {
	try {
		window.localStorage.setItem(KEY, JSON.stringify(v));
	} catch {
		// Storage unavailable: the result still shows on the page.
	}
}

export function clearLastBrandCheck(): void {
	try {
		window.localStorage.removeItem(KEY);
	} catch {
		// ignore
	}
}
