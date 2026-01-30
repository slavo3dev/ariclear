/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";
import { NextRequest, NextResponse } from 'next/server';

// GET /api/scans - Get all scans for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAriClearServer();
    
    console.log('GET /api/scans - Starting...');
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('User ID:', user?.id);
    console.log('Auth error:', authError);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters for filtering and sorting
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const sortBy = searchParams.get('sortBy') || 'date';

    let query = supabase
      .from('scans')
      .select('*')
      .eq('user_id', user.id);

    // Apply filters
    if (filter === 'recent') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('created_at', weekAgo.toISOString());
    } else if (filter === 'low-score') {
      query = query.lt('overall_score', 70);
    }

    // Apply sorting
    if (sortBy === 'score') {
      query = query.order('overall_score', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    console.log('Scans found:', data?.length);
    console.log('Query error:', error);

    if (error) {
      console.error('Error fetching scans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scans', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ scans: data || [] });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/scans - Create a new scan WITH WEBSITE LIMIT CHECK
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseAriClearServer();
    
    console.log('POST /api/scans - Starting...');
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('User ID:', user?.id);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { analyzeResult, url } = body;

    console.log('Request URL:', url);

    if (!analyzeResult || !url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate scores
    const humanScore = analyzeResult.human?.clarityScore ?? 0;
    const aiScore = analyzeResult.ai?.aiSeoScore ?? 0;
    const combinedScore = Math.round((humanScore + aiScore) / 2);

    console.log('Scores - Human:', humanScore, 'AI:', aiScore, 'Combined:', combinedScore);

    // Parse domain from URL
    let domain;
    try {
      domain = new URL(url).hostname;
      console.log('Parsed domain:', domain);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // ========================================
    // CHECK WEBSITE LIMIT
    // ========================================
    
    console.log('Checking if website exists...');
    
    // Check if this domain already exists for user
    const { data: existingWebsite, error: websiteCheckError } = await supabase
      .from('user_websites')
      .select('id')
      .eq('user_id', user.id)
      .eq('domain', domain)
      .single();

    console.log('Existing website:', existingWebsite);
    console.log('Website check error:', websiteCheckError);

    // If new website, check if user has reached their limit
    if (!existingWebsite) {
      console.log('New website - checking subscription limits...');
      
      // Get user's subscription info
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('tier, websites_limit, trial_expires_at')
        .eq('user_id', user.id)
        .single();

      console.log('Subscription:', subscription);
      console.log('Subscription error:', subError);

      if (!subscription) {
        console.log('No subscription found - creating default...');
        
        // Create default subscription
        const { error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            tier: 'free',
            websites_limit: 1
          });

        console.log('Insert error:', insertError);
        
        // Use default values
        const defaultSubscription = { tier: 'free', websites_limit: 1, trial_expires_at: null };
        
        // Check limit with default
        const { count } = await supabase
          .from('user_websites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const currentCount = count || 0;
        console.log('Current website count:', currentCount);

        if (currentCount >= 1) {
          return NextResponse.json(
            { 
              error: 'Website limit reached',
              message: `You've reached your limit of 1 website. Request a 60-day trial to track up to 5 websites!`,
              limit: 1,
              current: currentCount,
              tier: 'free',
              requiresUpgrade: true
            },
            { status: 403 }
          );
        }
      } else {
        // Check if trial has expired
        if (subscription.tier === 'trial' && subscription.trial_expires_at) {
          const now = new Date();
          const expiresAt = new Date(subscription.trial_expires_at);
          
          if (now > expiresAt) {
            return NextResponse.json(
              { 
                error: 'Trial expired',
                message: 'Your 60-day trial has expired. Contact us to upgrade and continue tracking websites.',
                requiresUpgrade: true,
                tier: 'trial_expired'
              },
              { status: 403 }
            );
          }
        }

        // Count current websites
        const { count } = await supabase
          .from('user_websites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const currentCount = count || 0;
        console.log('Current website count:', currentCount, 'Limit:', subscription.websites_limit);

        // Check limit
        if (currentCount >= subscription.websites_limit) {
          return NextResponse.json(
            { 
              error: 'Website limit reached',
              message: `You've reached your limit of ${subscription.websites_limit} website${subscription.websites_limit > 1 ? 's' : ''}. ${
                subscription.tier === 'free' 
                  ? 'Request a 60-day trial to track up to 5 websites!' 
                  : 'Contact us to upgrade your plan.'
              }`,
              limit: subscription.websites_limit,
              current: currentCount,
              tier: subscription.tier,
              requiresUpgrade: true
            },
            { status: 403 }
          );
        }
      }

      // Add new website to tracking
      console.log('Adding new website to tracking...');
      
      const { error: websiteError } = await supabase
        .from('user_websites')
        .insert({
          user_id: user.id,
          domain,
          url,
          last_scanned_at: new Date().toISOString()
        });

      console.log('Website insert error:', websiteError);

      if (websiteError) {
        console.error('Error adding website:', websiteError);
        // Continue anyway - don't block the scan
      }
    } else {
      console.log('Existing website - updating last scanned time...');
      
      // Update last scanned time for existing website
      await supabase
        .from('user_websites')
        .update({ last_scanned_at: new Date().toISOString() })
        .eq('id', existingWebsite.id);
    }

    // ========================================
    // SAVE SCAN DATA
    // ========================================
    
    console.log('Preparing scan data...');
    
    const scanData = {
      user_id: user.id,
      domain,
      url,
      overall_score: combinedScore,
      human_score: humanScore,
      ai_score: aiScore,
      human_clarity_description: analyzeResult.human?.whatItSeemsLike || null,
      human_value_prop: analyzeResult.human?.oneSentenceValueProp || null,
      human_audience: analyzeResult.human?.bestGuessAudience || null,
      human_confusions: analyzeResult.human?.confusions || [],
      ai_comprehension: analyzeResult.ai?.aiSummary || null,
      ai_indexer_read: analyzeResult.ai?.indexerRead || null,
      ai_missing_keywords: analyzeResult.ai?.missingKeywords || [],
      suggested_headline: analyzeResult.copy?.suggestedHeadline || null,
      suggested_subheadline: analyzeResult.copy?.suggestedSubheadline || null,
      suggested_cta: analyzeResult.copy?.suggestedCTA || null,
      action_plan: analyzeResult.plan?.nextSteps || [],
      ai_prompt: analyzeResult.prompts?.aiSeoPrompt || null,
      issues: (analyzeResult.human?.topIssues ?? []).map((issue: any, idx: number) => ({
        id: `issue-${idx}`,
        issue: issue.issue,
        whyItHurts: issue.whyItHurts,
        fix: issue.fix,
      })),
      checklist: (analyzeResult.human?.topIssues ?? []).map((issue: any, idx: number) => ({
        id: `issue-${idx}`,
        label: issue.issue,
        checked: false,
      })),
      suggestions: analyzeResult.ai?.structuredDataSuggestions || [],
    };

    console.log('Inserting scan into database...');

    // Insert into database
    const { data, error } = await supabase
      .from('scans')
      .insert(scanData)
      .select()
      .single();

    console.log('Scan inserted:', !!data);
    console.log('Insert error:', error);

    if (error) {
      console.error('Error saving scan:', error);
      return NextResponse.json(
        { error: 'Failed to save scan', details: error.message },
        { status: 500 }
      );
    }

    console.log('Scan saved successfully with ID:', data.id);

    return NextResponse.json({ scan: data }, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}