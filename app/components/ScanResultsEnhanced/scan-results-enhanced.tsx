'use client';

import { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';

import { downloadScanPdf } from '@/lib/report/pdf';
import type { ChecklistItem, ScanReport } from '@/lib/report/types';

interface ScanResultsEnhancedProps {
  results: ScanReport;
  onCopyPrompt?: (text: string) => void;
  /** Paid feature. When false the PDF button shows an upgrade prompt. */
  canDownloadPdf?: boolean;
  onUpgradeClick?: () => void;
}

export function ScanResultsEnhanced({ 
  results,
  onCopyPrompt,
  canDownloadPdf = false,
  onUpgradeClick,
}: ScanResultsEnhancedProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    results.issues.map(issue => ({
      id: issue.id,
      label: issue.title,
      checked: issue.fixed,
      issueId: issue.id,
    }))
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'suggestions'>('overview');
  const [showChecklist, setShowChecklist] = useState(false);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const generatePDFReport = async () => {
    if (!canDownloadPdf) {
      toast('The PDF report is part of Gladiator and Centurion.', { icon: '🔒' });
      onUpgradeClick?.();
      return;
    }
    const loadingToast = toast.loading('Generating PDF report...');
    try {
      await downloadScanPdf(results, checklist);
      toast.success('PDF report downloaded!', { id: loadingToast });
    } catch {
      toast.error('Failed to generate PDF', { id: loadingToast });
    }
  };

  const exportChecklist = () => {
    const text = checklist.map(item => `[${item.checked ? 'x' : ' '}] ${item.label}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checklist-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Checklist exported!');
  };

  const shareResults = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Scan Results', text: `Score: ${results.score}/100`, url });
        toast.success('Shared!');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          toast.success('Link copied!');
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-800 ring-1 ring-red-200';
      case 'high': return 'bg-orange-50 text-orange-800 ring-1 ring-orange-200';
      case 'medium': return 'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200';
      case 'low': return 'bg-cream-50 text-choco-800 ring-1 ring-choco-200';
      default: return 'bg-cream-50 text-choco-800 ring-1 ring-choco-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return '🔒';
      case 'privacy': return '🛡️';
      case 'performance': return '⚡';
      case 'accessibility': return '♿';
      default: return '📋';
    }
  };

  const completionPercentage = checklist.length > 0 
    ? Math.round((checklist.filter(item => item.checked).length / checklist.length) * 100)
    : 0;

  const criticalIssues = results.issues.filter(i => i.severity === 'critical');
  const highIssues = results.issues.filter(i => i.severity === 'high');

  return (
    <div className="mt-6 space-y-4">
      {/* 1. Header with Score */}
      <div className="rounded-2xl border border-choco-100 bg-choco-900 p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-choco-800 shadow-soft">
              <Image
                src="/branding/arilogo-optimized.png"
                alt="AriClear"
                fill
                priority
                sizes="64px"
                className="object-contain p-2"
              />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-cream-50">Scan Complete</h2>
              <p className="mt-1 text-sm text-cream-100">{results.metadata.domain}</p>
              <p className="mt-0.5 text-xs text-choco-300">
                {new Date(results.metadata.scannedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-4xl font-bold text-cream-50">{results.score}</div>
            <div className="text-xs uppercase tracking-[0.12em] text-choco-300">Score</div>
          </div>
        </div>
      </div>

      {/* Rest of the component stays the same... */}
      {/* I'll include the critical parts with the fix for "View all issues" */}

      {/* 2. Quick Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['security', 'privacy', 'performance', 'accessibility'].map(category => {
          const categoryIssues = results.issues.filter(i => i.category === category);
          const criticalCount = categoryIssues.filter(i => i.severity === 'critical').length;
          
          return (
            <div key={category} className="rounded-xl bg-white/80 p-4 ring-1 ring-choco-100 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{getCategoryIcon(category)}</span>
                <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                  {category}
                </h4>
              </div>
              <div className="text-2xl font-semibold text-choco-900 mb-1">
                {categoryIssues.length}
              </div>
              <p className="text-xs text-choco-700">
                {criticalCount > 0 ? (
                  <span className="font-medium text-red-700">{criticalCount} critical</span>
                ) : (
                  'All good'
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* 3. Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={generatePDFReport}
          className="inline-flex items-center gap-2 rounded-full bg-choco-900 px-5 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-choco-800 focus:outline-none focus:ring-2 focus:ring-choco-400"
        >
          <span>📄</span>
          Download PDF Report
        </button>
        <button
          onClick={exportChecklist}
          className="inline-flex items-center gap-2 rounded-full bg-cream-100 px-5 py-2.5 text-sm font-medium text-choco-900 ring-1 ring-choco-200 transition hover:bg-cream-200 focus:outline-none focus:ring-2 focus:ring-choco-400"
        >
          <span>✅</span>
          Export Checklist
        </button>
        <button
          onClick={shareResults}
          className="inline-flex items-center gap-2 rounded-full bg-cream-100 px-5 py-2.5 text-sm font-medium text-choco-900 ring-1 ring-choco-200 transition hover:bg-cream-200 focus:outline-none focus:ring-2 focus:ring-choco-400"
        >
          <span>🔗</span>
          Share Results
        </button>
      </div>

      {/* 4. Detailed Scores */}
      {results.rawData && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Human Clarity Card */}
          <div className="rounded-2xl border border-choco-100 bg-white p-4 shadow-soft">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
              Human Clarity
            </p>
            <p className="mt-2 text-2xl font-semibold text-choco-900">
              {results.rawData.humanClarity.score} / 100
            </p>
            <p className="mt-2 text-sm text-choco-700">
              {results.rawData.humanClarity.whatItSeemsLike}
            </p>

            {results.rawData.humanClarity.oneSentenceValueProp && (
              <div className="mt-4 rounded-xl bg-cream-50 p-3 ring-1 ring-choco-100">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-choco-600">
                  What it should communicate
                </p>
                <p className="mt-1 text-sm font-medium text-choco-900">
                  {results.rawData.humanClarity.oneSentenceValueProp}
                </p>
                {results.rawData.humanClarity.bestGuessAudience && (
                  <p className="mt-1 text-[11px] text-choco-600">
                    Best-guess audience:{" "}
                    <span className="font-medium">
                      {results.rawData.humanClarity.bestGuessAudience}
                    </span>
                  </p>
                )}
              </div>
            )}

            {results.rawData.humanClarity.confusions && 
             results.rawData.humanClarity.confusions.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-4 text-xs text-choco-700">
                {results.rawData.humanClarity.confusions.map((x: string) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </div>

          {/* AI Comprehension Card */}
          <div className="rounded-2xl border border-choco-100 bg-white p-4 shadow-soft">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
              AI Comprehension
            </p>
            <p className="mt-2 text-2xl font-semibold text-choco-900">
              {results.rawData.aiComprehension.score} / 100
            </p>
            <p className="mt-2 text-sm text-choco-700">
              {results.rawData.aiComprehension.aiSummary}
            </p>

            {results.rawData.aiComprehension.indexerRead && (
              <div className="mt-4 rounded-xl bg-cream-50 p-3 ring-1 ring-choco-100">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-choco-600">
                  How AI reads your site
                </p>
                <p className="mt-1 text-sm text-choco-900">
                  {results.rawData.aiComprehension.indexerRead}
                </p>
              </div>
            )}

            {results.rawData.aiComprehension.missingKeywords && 
             results.rawData.aiComprehension.missingKeywords.length > 0 && (
              <>
                <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-choco-600">
                  Missing Keywords
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {results.rawData.aiComprehension.missingKeywords.map((k: string) => (
                    <span
                      key={k}
                      className="rounded-full bg-cream-50 px-3 py-1 text-[11px] text-choco-700 ring-1 ring-choco-100"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. Suggested Copy */}
      {results.rawData?.suggestedCopy && (
        <div className="rounded-2xl border border-choco-100 bg-white p-4 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
            Suggested Hero Copy
          </p>
          <p className="mt-2 text-lg font-semibold text-choco-900">
            {results.rawData.suggestedCopy.headline}
          </p>
          <p className="mt-1 text-sm text-choco-700">
            {results.rawData.suggestedCopy.subheadline}
          </p>
          {results.rawData.suggestedCopy.cta && (
            <span
              aria-label="Suggested button text"
              className="mt-3 inline-flex items-center rounded-full bg-choco-900 px-4 py-2 text-[11px] font-medium text-cream-50"
            >
              {results.rawData.suggestedCopy.cta}
            </span>
          )}
          <p className="mt-2 text-[11px] text-choco-500">
            Paid plans let you score your own rewrite before you publish it.
          </p>
        </div>
      )}

      {/* 6. Priority Issues - FIX FOR "View all issues" LINK */}
      {(criticalIssues.length > 0 || highIssues.length > 0) && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⚠️</span>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-red-900">
              Priority Issues (Fix These First)
            </p>
          </div>

          <div className="space-y-3">
            {[...criticalIssues, ...highIssues].slice(0, 3).map((issue) => (
              <div key={issue.id} className="rounded-xl bg-white p-4 ring-1 ring-red-200">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(issue.category)}</span>
                    <h4 className="text-sm font-semibold text-choco-900">{issue.title}</h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                </div>
                <p className="text-xs text-choco-700 mb-2">{issue.description}</p>
                <div className="rounded-lg bg-yellow-50 p-2 ring-1 ring-yellow-200">
                  <p className="text-xs text-yellow-900">
                    <span className="font-medium">Fix:</span> {issue.impact}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* FIX: Make the button actually work by scrolling to issues tab */}
          {results.issues.length > 3 && (
            <button
              onClick={() => {
                setActiveTab('issues');
                // Scroll to the tabs section
                setTimeout(() => {
                  const tabsElement = document.querySelector('[data-tabs-section]');
                  if (tabsElement) {
                    tabsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              className="mt-3 text-xs text-red-900 hover:text-red-700 font-medium underline cursor-pointer"
            >
              View all {results.issues.length} issues →
            </button>
          )}
        </div>
      )}

      {/* 7. Action Plan */}
      {results.rawData?.actionPlan && results.rawData.actionPlan.length > 0 && (
        <div className="rounded-2xl border border-choco-100 bg-white p-4 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600 mb-4">
            Action Plan (Do These In Order)
          </p>
          <div className="space-y-3">
            {results.rawData.actionPlan.map((step, idx) => (
              <div key={`${step.title}-${idx}`} className="rounded-xl bg-cream-50 p-4 ring-1 ring-choco-100">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-choco-900">
                    {idx + 1}. {step.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      step.impact === 'high' ? 'bg-choco-900 text-cream-50' :
                      step.impact === 'medium' ? 'bg-cream-100 text-choco-900 ring-1 ring-choco-200' :
                      'bg-white text-choco-700 ring-1 ring-choco-200'
                    }`}>
                      {step.impact}
                    </span>
                    <span className="text-[11px] text-choco-600">
                      effort: {step.effort}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-choco-700">{step.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Progress Tracker */}
      {checklist.length > 0 && (
        <div className="rounded-2xl border border-choco-100 bg-white/80 p-4 shadow-soft">
          <div className="flex items-center justify-between gap-4 mb-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
              Completion Progress
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold text-choco-900">{completionPercentage}%</span>
              <button
                onClick={() => setShowChecklist(!showChecklist)}
                className="text-xs text-choco-900 hover:text-choco-700 font-medium underline"
              >
                {showChecklist ? 'Hide' : 'Show'} Checklist
              </button>
            </div>
          </div>
          <div className="w-full h-2 bg-cream-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-choco-900 transition-all duration-500 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-choco-600">
            {checklist.filter(item => item.checked).length} of {checklist.length} items completed
          </p>

          {showChecklist && (
            <div className="mt-4 space-y-2 pt-4 border-t border-choco-100">
              {checklist.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-cream-50 ring-1 ring-choco-100 hover:bg-cream-100 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="w-4 h-4 text-choco-900 border-choco-300 rounded focus:ring-2 focus:ring-choco-400"
                  />
                  <span className={`flex-1 text-sm ${item.checked ? 'line-through text-choco-500' : 'text-choco-900'}`}>
                    {item.label}
                  </span>
                  {item.checked && <span className="text-choco-600">✓</span>}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 9. Detailed Tabs - ADD data-tabs-section attribute */}
      <div data-tabs-section className="rounded-2xl border border-choco-100 bg-white/80 shadow-soft overflow-hidden">
        <div className="flex border-b border-choco-100">
          {(['overview', 'issues', 'suggestions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-cream-50 text-choco-900 border-b-2 border-choco-900'
                  : 'text-choco-600 hover:bg-cream-50/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-cream-50 p-4 ring-1 ring-choco-100">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600 mb-2">
                  Quick Summary
                </p>
                <ul className="space-y-2 text-sm text-choco-700">
                  <li className="flex items-start gap-2">
                    <span className="text-choco-600 mt-0.5">•</span>
                    <span>Found {results.issues.length} issues across {results.metadata.domain}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-choco-600 mt-0.5">•</span>
                    <span>
                      {results.issues.filter(i => i.severity === 'critical').length} critical issues require immediate attention
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-choco-600 mt-0.5">•</span>
                    <span>{results.suggestions.length} actionable suggestions to improve your website</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="space-y-3">
              {results.issues.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎉</div>
                  <h3 className="text-lg font-semibold text-choco-900 mb-1">No Issues Found!</h3>
                  <p className="text-sm text-choco-600">Your website is looking great.</p>
                </div>
              ) : (
                results.issues.map(issue => (
                  <div key={issue.id} className="rounded-xl bg-cream-50 p-4 ring-1 ring-choco-100">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(issue.category)}</span>
                        <div>
                          <h4 className="text-sm font-semibold text-choco-900">{issue.title}</h4>
                          <span className="text-xs text-choco-600 capitalize">{issue.category}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${getSeverityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-sm text-choco-700 mb-2">{issue.description}</p>
                    <div className="rounded-lg bg-yellow-50 p-2 ring-1 ring-yellow-200">
                      <p className="text-xs text-yellow-900">
                        <span className="font-medium">Impact:</span> {issue.impact}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="space-y-3">
              {results.suggestions.map(suggestion => (
                <div key={suggestion.id} className="rounded-xl bg-cream-50 p-4 ring-1 ring-choco-100">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-semibold text-choco-900">{suggestion.title}</h4>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className={`px-2 py-1 rounded-full font-medium ${
                        suggestion.priority === 'high' ? 'bg-choco-900 text-cream-50' :
                        suggestion.priority === 'medium' ? 'bg-cream-100 text-choco-900 ring-1 ring-choco-200' :
                        'bg-white text-choco-700 ring-1 ring-choco-200'
                      }`}>
                        {suggestion.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-choco-600 mb-2">⏱️ {suggestion.estimatedTime}</p>
                  <p className="text-sm text-choco-700">{suggestion.description}</p>
                  
                  {suggestion.resources.length > 0 && (
                    <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-choco-100">
                      <p className="text-xs font-medium text-choco-600 mb-2">Resources</p>
                      <ul className="space-y-1">
                        {suggestion.resources.map((resource, idx) => (
                          <li key={idx}>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-choco-900 hover:text-choco-700 hover:underline"
                            >
                              {resource.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 10. AI Prompt */}
      {results.rawData?.prompt && onCopyPrompt && (
        <div className="rounded-2xl border border-choco-100 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
              Copy/paste prompt (use with any AI)
            </p>
            <button
              type="button"
              onClick={() => onCopyPrompt(results.rawData?.prompt ?? '')}
              className="inline-flex items-center rounded-full bg-choco-900 px-3 py-1.5 text-xs font-medium text-cream-50 transition hover:bg-choco-800 focus:outline-none focus:ring-2 focus:ring-choco-400"
            >
              Copy prompt
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-cream-50 p-4 text-[12px] leading-relaxed text-choco-800 ring-1 ring-choco-100">
            {results.rawData.prompt}
          </pre>
          <p className="mt-2 text-[11px] text-choco-500">
            This prompt helps you rewrite your hero + meta description + headings so humans and AI understand you.
          </p>
        </div>
      )}

      {/* 11. Ready to Take Action */}
      <div className="rounded-2xl border border-choco-100 bg-choco-900 p-6 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-choco-800">
            <Image
              src="/branding/arilogo-optimized.png"
              alt="AriClear"
              fill
              priority
              sizes="48px"
              className="object-contain p-1.5"
            />
          </div>
          <h3 className="text-lg font-semibold text-cream-50">Ready to Take Action?</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-choco-800/60 p-4 ring-1 ring-choco-700">
            <div className="text-2xl mb-2">1️⃣</div>
            <p className="text-sm text-cream-100">Download your PDF report for detailed analysis</p>
          </div>
          <div className="rounded-xl bg-choco-800/60 p-4 ring-1 ring-choco-700">
            <div className="text-2xl mb-2">2️⃣</div>
            <p className="text-sm text-cream-100">Use the checklist to track your progress</p>
          </div>
          <div className="rounded-xl bg-choco-800/60 p-4 ring-1 ring-choco-700">
            <div className="text-2xl mb-2">3️⃣</div>
            <p className="text-sm text-cream-100">Follow our suggestions to improve your score</p>
          </div>
        </div>
      </div>
    </div>
  );
}