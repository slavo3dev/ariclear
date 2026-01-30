import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";
import { NextRequest, NextResponse } from 'next/server';

// GET /api/scans/stats - Get statistics for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAriClearServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all scans for the user
    const { data: scans, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching scans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalScans = scans.length;
    const averageScore = totalScans > 0
      ? Math.round(scans.reduce((acc, s) => acc + s.overall_score, 0) / totalScans)
      : 0;
    const uniqueDomains = new Set(scans.map(s => s.domain)).size;
    const totalIssues = scans.reduce((acc, s) => acc + (s.issues?.length || 0), 0);
    
    // Recent scans (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentScans = scans.filter(s => new Date(s.created_at) > weekAgo).length;

    // Score distribution
    const scoreDistribution = {
      excellent: scans.filter(s => s.overall_score >= 90).length,
      good: scans.filter(s => s.overall_score >= 70 && s.overall_score < 90).length,
      needsImprovement: scans.filter(s => s.overall_score < 70).length,
    };

    return NextResponse.json({
      stats: {
        totalScans,
        averageScore,
        uniqueDomains,
        totalIssues,
        recentScans,
        scoreDistribution,
      },
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}