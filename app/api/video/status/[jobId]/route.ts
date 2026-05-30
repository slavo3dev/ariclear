// app/api/video/status/[jobId]/route.ts
// Polled by VideoPlayer every 5s to check render progress.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@ariclear/lib/supabase/auth/server';

export async function GET(
	_request: NextRequest,
	segmentData: { params: Promise<{ jobId: string }> },
) {
	const supabase = await supabaseAriClearServer();
	const params = await segmentData.params;
	const { jobId } = params;

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data: job, error } = await supabase
		.from('video_jobs')
		.select('id, status, cloudinary_url, error_message')
		.eq('id', jobId)
		.eq('user_id', user.id)
		.single();

	if (error || !job) {
		return NextResponse.json({ error: 'Job not found' }, { status: 404 });
	}

	return NextResponse.json({ job });
}
