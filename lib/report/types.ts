// lib/report/types.ts
// Shape of a scan report as shown on screen and in the PDF.
// Built from a fresh /api/analyze result (fromAnalyze) or a saved scan (fromScan).

export interface ScanReport {
  score: number;
  issues: Issue[];
  suggestions: Suggestion[];
  metadata: {
    scannedAt: string;
    url: string;
    domain: string;
  };
  rawData?: {
    humanClarity: {
      score: number;
      whatItSeemsLike?: string;
      oneSentenceValueProp?: string;
      bestGuessAudience?: string;
      confusions?: string[];
    };
    aiComprehension: {
      score: number;
      aiSummary?: string;
      indexerRead?: string;
      missingKeywords?: string[];
    };
    suggestedCopy?: {
      headline?: string;
      subheadline?: string;
      cta?: string;
    };
    actionPlan?: Array<{
      title: string;
      impact: "high" | "medium" | "low";
      effort: "low" | "medium" | "high";
      details: string;
    }>;
    prompt?: string;
  };
}

export interface Issue {
  id: string;
  category: 'security' | 'privacy' | 'performance' | 'accessibility';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  fixed: boolean;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  resources: Resource[];
}

export interface Resource {
  title: string;
  url: string;
  type: 'documentation' | 'tool' | 'article';
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  issueId?: string;
}
