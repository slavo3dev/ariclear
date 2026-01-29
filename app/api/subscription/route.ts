import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";
import { NextRequest, NextResponse } from 'next/server';

// GET /api/subscription - Get user's subscription info
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAriClearServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get subscription info
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier, websites_limit, trial_expires_at, trial_websites_requested')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Count websites
    const { count } = await supabase
      .from('user_websites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const websitesUsed = count || 0;

    // Check if trial is expired
    let isTrialExpired = false;
    if (subscription.tier === 'trial' && subscription.trial_expires_at) {
      const now = new Date();
      const expiresAt = new Date(subscription.trial_expires_at);
      isTrialExpired = now > expiresAt;
    }

    return NextResponse.json({
      tier: subscription.tier,
      websites_limit: subscription.websites_limit,
      websites_used: websitesUsed,
      websites_remaining: Math.max(0, subscription.websites_limit - websitesUsed),
      trial_expires_at: subscription.trial_expires_at,
      trial_websites_requested: subscription.trial_websites_requested,
      is_trial_expired: isTrialExpired,
      can_scan: !isTrialExpired && websitesUsed < subscription.websites_limit
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}