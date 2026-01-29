/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { 
  Navbar, 
  SiteFooter, 
  useAuth,
  ScanResultsEnhanced 
} from "@ariclear/components";

// In Next.js 15, params is a Promise
export default function ScanDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Unwrap the params Promise
  const { id } = use(params);
  
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
    if (id) {
      fetchScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, id]);

  const fetchScan = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching scan with ID:', id); // Debug log
      
      const res = await fetch(`/api/scans/${id}`);
      
      if (!res.ok) {
        throw new Error('Scan not found');
      }
      
      const data = await res.json();
      setScan(data.scan);
    } catch (error) {
      console.error('Error fetching scan:', error);
      toast.error('Scan not found');
      router.push('/history');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 bg-cream-50 flex items-center justify-center">
          <div className="text-center">
            <div className="relative h-16 w-16 mx-auto mb-4 overflow-hidden rounded-xl bg-choco-800 shadow-soft animate-pulse">
              <Image
                src="/branding/arilogo-optimized.png"
                alt="Loading"
                fill
                priority
                sizes="64px"
                className="object-contain p-2"
              />
            </div>
            <p className="text-sm text-choco-700">Loading scan details...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 bg-cream-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-choco-900 mb-2">Scan not found</h3>
            <p className="text-sm text-choco-600">This scan may have been deleted.</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Transform scan data to match ScanResultsEnhanced format
  const categorizeIssue = (issueText: string): 'security' | 'privacy' | 'performance' | 'accessibility' => {
    const text = issueText.toLowerCase();
    
    if (text.includes('speed') || text.includes('load') || text.includes('performance') || 
        text.includes('slow') || text.includes('seo') || text.includes('keyword')) {
      return 'performance';
    }
    
    if (text.includes('privacy') || text.includes('gdpr') || text.includes('cookie')) {
      return 'privacy';
    }
    
    if (text.includes('security') || text.includes('ssl') || text.includes('https')) {
      return 'security';
    }
    
    return 'accessibility';
  };

  const transformedResults = {
    score: scan.overall_score,
    metadata: {
      scannedAt: scan.created_at,
      url: scan.url,
      domain: scan.domain,
    },
    issues: (scan.issues || []).map((issue: any, idx: number) => {
      const category = categorizeIssue(issue.issue);
      return {
        id: issue.id || `issue-${idx}`,
        category,
        severity: idx === 0 ? 'critical' as const : 
                  idx === 1 ? 'high' as const : 
                  idx === 2 ? 'medium' as const : 'low' as const,
        title: issue.issue,
        description: issue.whyItHurts,
        impact: issue.fix,
        fixed: false,
      };
    }),
    suggestions: (scan.action_plan || []).map((step: any, idx: number) => ({
      id: `suggestion-${idx}`,
      title: step.title,
      description: step.details,
      priority: step.impact,
      estimatedTime: step.effort === 'low' ? '1-2 hours' : 
                     step.effort === 'medium' ? '2-4 hours' : '4-8 hours',
      resources: [],
    })),
    rawData: {
      humanClarity: {
        score: scan.human_score,
        whatItSeemsLike: scan.human_clarity_description,
        oneSentenceValueProp: scan.human_value_prop,
        bestGuessAudience: scan.human_audience,
        confusions: scan.human_confusions || [],
      },
      aiComprehension: {
        score: scan.ai_score,
        aiSummary: scan.ai_comprehension,
        indexerRead: scan.ai_indexer_read,
        missingKeywords: scan.ai_missing_keywords || [],
      },
      suggestedCopy: {
        headline: scan.suggested_headline,
        subheadline: scan.suggested_subheadline,
        cta: scan.suggested_cta,
      },
      actionPlan: scan.action_plan || [],
      prompt: scan.ai_prompt,
    },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      <main className="flex-1 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <ScanResultsEnhanced 
            results={transformedResults}
            onCopyPrompt={copyToClipboard}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}