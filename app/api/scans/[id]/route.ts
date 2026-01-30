import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";
import { NextRequest, NextResponse } from 'next/server';

// GET /api/scans/[id] - Get a single scan
export async function GET(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    console.log('API: GET /api/scans/[id] called'); // Debug
    
    const supabase = await supabaseAriClearServer();
    const params = await segmentData.params; // MUST await in Next.js 16
    const { id } = params;
    
    console.log('API: Fetching scan with ID:', id); // Debug
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('API: User ID:', user?.id); // Debug
    console.log('API: Auth error:', authError); // Debug
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    console.log('API: Scan found:', !!data); // Debug
    console.log('API: Error:', error); // Debug

    if (error || !data) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ scan: data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/scans/[id] - Update a scan (e.g., checklist)
export async function PATCH(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseAriClearServer();
    const params = await segmentData.params; // MUST await in Next.js 16
    const { id } = params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { checklist } = body;

    if (!checklist) {
      return NextResponse.json(
        { error: 'Missing checklist data' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('scans')
      .update({ checklist })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update scan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ scan: data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/scans/[id] - Delete a scan
export async function DELETE(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseAriClearServer();
    const params = await segmentData.params; // MUST await in Next.js 16
    const { id } = params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('scans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting scan:', error);
      return NextResponse.json(
        { error: 'Failed to delete scan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}