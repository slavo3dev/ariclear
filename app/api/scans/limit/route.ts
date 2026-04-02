 
import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";
import { NextResponse } from 'next/server';

// GET /api/scans/limit - Check the current user's website limit and usage
export async function GET() {
  try {
    const supabase = await supabaseAriClearServer();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('tier, websites_limit, trial_expires_at')
      .eq('user_id', user.id)
      .single();

    // Get current website count
    const { count } = await supabase
      .from('user_websites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const current = count || 0;

    // No subscription yet — treat as free tier, limit 1
    if (!subscription) {
      return NextResponse.json({
        tier: 'free',
        limit: 1,
        current,
        limitReached: current >= 1,
        trialExpired: false,
      });
    }

    // Check if trial has expired
    let trialExpired = false;
    if (subscription.tier === 'trial' && subscription.trial_expires_at) {
      trialExpired = new Date() > new Date(subscription.trial_expires_at);
    }

    const limit = subscription.websites_limit ?? 1;
    const limitReached = trialExpired || current >= limit;

    return NextResponse.json({
      tier: trialExpired ? 'trial_expired' : subscription.tier,
      limit,
      current,
      limitReached,
      trialExpired,
    });
  } catch (error) {
    console.error('Error checking scan limit:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}