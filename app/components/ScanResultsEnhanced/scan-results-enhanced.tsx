'use client';

import { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface ScanResult {
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

interface Issue {
  id: string;
  category: 'security' | 'privacy' | 'performance' | 'accessibility';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  fixed: boolean;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  resources: Resource[];
}

interface Resource {
  title: string;
  url: string;
  type: 'documentation' | 'tool' | 'article';
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  issueId?: string;
}

interface ScanResultsEnhancedProps {
  results: ScanResult;
  onPreorderClick?: () => void;
  onCopyPrompt?: (text: string) => void;
}

export function ScanResultsEnhanced({ 
  results, 
  onPreorderClick,
  onCopyPrompt 
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
    const loadingToast = toast.loading('Generating PDF report...');
    
    try {
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      await import('jspdf-autotable');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = new jsPDF() as any;
      let yPos = 20;
      
      // === PAGE 1: COVER PAGE ===
      doc.setFontSize(28);
      doc.setTextColor(41, 28, 16);
      doc.text('AriClear', 105, yPos, { align: 'center' });
      yPos += 10;
      
      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      doc.text('Website Clarity Analysis Report', 105, yPos, { align: 'center' });
      yPos += 25;
      
      // Score box - larger and more prominent
      doc.setFillColor(250, 248, 246);
      doc.setDrawColor(41, 28, 16);
      doc.setLineWidth(3);
      doc.rect(50, yPos, 110, 40, 'FD');
      
      doc.setFontSize(48);
      doc.setTextColor(41, 28, 16);
      doc.text(results.score.toString(), 105, yPos + 28, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text('Overall Score', 105, yPos + 12, { align: 'center' });
      yPos += 50;
      
      // Metadata
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(`Domain: ${results.metadata.domain}`, 105, yPos, { align: 'center' });
      yPos += 7;
      doc.text(`URL: ${results.metadata.url}`, 105, yPos, { align: 'center' });
      yPos += 7;
      doc.text(`Scanned: ${new Date(results.metadata.scannedAt).toLocaleString()}`, 105, yPos, { align: 'center' });
      yPos += 25;
      
      // Key metrics
      const humanScore = results.rawData?.humanClarity.score ?? 0;
      const aiScore = results.rawData?.aiComprehension.score ?? 0;
      
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(1);
      doc.rect(40, yPos, 60, 25, 'FD');
      doc.rect(110, yPos, 60, 25, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Human Clarity', 70, yPos + 8, { align: 'center' });
      doc.text('AI Comprehension', 140, yPos + 8, { align: 'center' });
      
      doc.setFontSize(24);
      doc.setTextColor(41, 28, 16);
      doc.text(`${humanScore}`, 70, yPos + 20, { align: 'center' });
      doc.text(`${aiScore}`, 140, yPos + 20, { align: 'center' });
      yPos += 35;
      
      // Issue summary
      const criticalCount = results.issues.filter(i => i.severity === 'critical').length;
      const highCount = results.issues.filter(i => i.severity === 'high').length;
      const mediumCount = results.issues.filter(i => i.severity === 'medium').length;
      const lowCount = results.issues.filter(i => i.severity === 'low').length;
      
      doc.setFontSize(12);
      doc.setTextColor(41, 28, 16);
      doc.text('Issues Found', 105, yPos, { align: 'center' });
      yPos += 8;
      
      const issueData = [
        ['Critical', criticalCount.toString(), criticalCount > 0 ? '⚠️ Needs Attention' : '✓ All Good'],
        ['High', highCount.toString(), highCount > 0 ? '⚠️ Needs Attention' : '✓ All Good'],
        ['Medium', mediumCount.toString(), mediumCount > 0 ? 'ℹ️ Review' : '✓ All Good'],
        ['Low', lowCount.toString(), lowCount > 0 ? 'ℹ️ Review' : '✓ All Good'],
      ];
      
      if (doc.autoTable) {
        doc.autoTable({
          startY: yPos,
          head: [['Severity', 'Count', 'Status']],
          body: issueData,
          headStyles: { fillColor: [41, 28, 16], textColor: 255, fontSize: 11 },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          styles: { fontSize: 10 },
          margin: { left: 40, right: 40 },
        });
        yPos = doc.lastAutoTable.finalY + 20;
      }
      
      // Report info at bottom
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by AriClear - Professional Website Clarity Analysis', 105, 280, { align: 'center' });
      
      // === PAGE 2: EXECUTIVE SUMMARY ===
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(20);
      doc.setTextColor(41, 28, 16);
      doc.text('Executive Summary', 20, yPos);
      yPos += 12;
      
      // Human Clarity Section
      if (results.rawData?.humanClarity) {
        doc.setFontSize(14);
        doc.setTextColor(30, 64, 175);
        doc.text('Human Clarity Analysis', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.setFont(undefined, 'bold');
        doc.text(`Score: ${results.rawData.humanClarity.score}/100`, 20, yPos);
        yPos += 6;
        
        doc.setFont(undefined, 'normal');
        if (results.rawData.humanClarity.whatItSeemsLike) {
          const whatLines = doc.splitTextToSize(results.rawData.humanClarity.whatItSeemsLike, 170);
          doc.text(whatLines, 20, yPos);
          yPos += whatLines.length * 5 + 5;
        }
        
        if (results.rawData.humanClarity.oneSentenceValueProp) {
          doc.setFont(undefined, 'bold');
          doc.text('Recommended Value Proposition:', 20, yPos);
          yPos += 5;
          doc.setFont(undefined, 'normal');
          const valueLines = doc.splitTextToSize(results.rawData.humanClarity.oneSentenceValueProp, 170);
          doc.text(valueLines, 20, yPos);
          yPos += valueLines.length * 5 + 5;
        }
        
        if (results.rawData.humanClarity.bestGuessAudience) {
          doc.setFont(undefined, 'bold');
          doc.text('Target Audience:', 20, yPos);
          doc.setFont(undefined, 'normal');
          doc.text(results.rawData.humanClarity.bestGuessAudience, 60, yPos);
          yPos += 8;
        }
        
        if (results.rawData.humanClarity.confusions && results.rawData.humanClarity.confusions.length > 0) {
          doc.setFont(undefined, 'bold');
          doc.text('Clarity Issues:', 20, yPos);
          yPos += 5;
          doc.setFont(undefined, 'normal');
          
          results.rawData.humanClarity.confusions.forEach((confusion) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            const confusionLines = doc.splitTextToSize(`• ${confusion}`, 165);
            doc.text(confusionLines, 25, yPos);
            yPos += confusionLines.length * 4 + 2;
          });
        }
        yPos += 10;
      }
      
      // AI Comprehension Section
      if (results.rawData?.aiComprehension) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(30, 64, 175);
        doc.text('AI Comprehension Analysis', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.setFont(undefined, 'bold');
        doc.text(`Score: ${results.rawData.aiComprehension.score}/100`, 20, yPos);
        yPos += 6;
        
        doc.setFont(undefined, 'normal');
        if (results.rawData.aiComprehension.aiSummary) {
          const summaryLines = doc.splitTextToSize(results.rawData.aiComprehension.aiSummary, 170);
          doc.text(summaryLines, 20, yPos);
          yPos += summaryLines.length * 5 + 5;
        }
        
        if (results.rawData.aiComprehension.indexerRead) {
          doc.setFont(undefined, 'bold');
          doc.text('How AI Reads Your Site:', 20, yPos);
          yPos += 5;
          doc.setFont(undefined, 'normal');
          const indexerLines = doc.splitTextToSize(results.rawData.aiComprehension.indexerRead, 170);
          doc.text(indexerLines, 20, yPos);
          yPos += indexerLines.length * 5 + 8;
        }
        
        if (results.rawData.aiComprehension.missingKeywords && results.rawData.aiComprehension.missingKeywords.length > 0) {
          doc.setFont(undefined, 'bold');
          doc.text('Missing/Unclear Keywords:', 20, yPos);
          yPos += 5;
          doc.setFont(undefined, 'normal');
          const keywordsText = results.rawData.aiComprehension.missingKeywords.join(', ');
          const keywordLines = doc.splitTextToSize(keywordsText, 170);
          doc.text(keywordLines, 20, yPos);
          yPos += keywordLines.length * 5;
        }
      }
      
      // === PAGE 3: SUGGESTED HERO COPY ===
      if (results.rawData?.suggestedCopy) {
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(20);
        doc.setTextColor(41, 28, 16);
        doc.text('Suggested Hero Copy', 20, yPos);
        yPos += 15;
        
        // Headline
        if (results.rawData.suggestedCopy.headline) {
          doc.setFillColor(239, 246, 255);
          doc.rect(20, yPos, 170, 0, 'F');
          
          doc.setFontSize(16);
          doc.setTextColor(30, 64, 175);
          doc.setFont(undefined, 'bold');
          doc.text('Headline', 20, yPos);
          yPos += 8;
          
          doc.setFontSize(12);
          doc.setTextColor(41, 28, 16);
          const headlineLines = doc.splitTextToSize(results.rawData.suggestedCopy.headline, 170);
          doc.text(headlineLines, 20, yPos);
          yPos += headlineLines.length * 7 + 10;
        }
        
        // Subheadline
        if (results.rawData.suggestedCopy.subheadline) {
          doc.setFontSize(14);
          doc.setTextColor(30, 64, 175);
          doc.setFont(undefined, 'bold');
          doc.text('Subheadline', 20, yPos);
          yPos += 7;
          
          doc.setFontSize(11);
          doc.setTextColor(50, 50, 50);
          doc.setFont(undefined, 'normal');
          const subheadLines = doc.splitTextToSize(results.rawData.suggestedCopy.subheadline, 170);
          doc.text(subheadLines, 20, yPos);
          yPos += subheadLines.length * 6 + 10;
        }
        
        // CTA
        if (results.rawData.suggestedCopy.cta) {
          doc.setFontSize(14);
          doc.setTextColor(30, 64, 175);
          doc.setFont(undefined, 'bold');
          doc.text('Call to Action', 20, yPos);
          yPos += 7;
          
          doc.setFillColor(41, 28, 16);
          doc.setDrawColor(41, 28, 16);
          doc.roundedRect(20, yPos, 80, 12, 3, 3, 'FD');
          
          doc.setFontSize(11);
          doc.setTextColor(255, 255, 255);
          doc.text(results.rawData.suggestedCopy.cta, 60, yPos + 8, { align: 'center' });
          yPos += 20;
        }
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const noteText = 'Note: This copy is optimized for both human clarity and AI comprehension. Test it with your audience for best results.';
        const noteLines = doc.splitTextToSize(noteText, 170);
        doc.text(noteLines, 20, yPos);
      }
      
      // === PAGE 4+: DETAILED ISSUES ===
      doc.addPage();
      yPos = 20;
      doc.setFontSize(20);
      doc.setTextColor(41, 28, 16);
      doc.text('Detailed Issues', 20, yPos);
      yPos += 12;
      
      if (results.issues.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(34, 139, 34);
        doc.text('🎉 No issues found! Your website is in excellent shape.', 20, yPos);
      } else {
        results.issues.forEach((issue, idx) => {
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }
          
          // Issue box with colored border
          const severityColors: Record<string, number[]> = {
            critical: [220, 38, 38],
            high: [249, 115, 22],
            medium: [234, 179, 8],
            low: [59, 130, 246]
          };
          
          const color = severityColors[issue.severity] || [100, 100, 100];
          doc.setDrawColor(...color);
          doc.setLineWidth(2);
          doc.rect(20, yPos, 170, 0);
          
          doc.setFontSize(13);
          doc.setTextColor(41, 28, 16);
          doc.setFont(undefined, 'bold');
          const titleText = `${idx + 1}. ${issue.title}`;
          doc.text(titleText.substring(0, 70), 20, yPos + 5);
          yPos += 10;
          
          doc.setFontSize(9);
          doc.setTextColor(...color);
          doc.setFont(undefined, 'bold');
          doc.text(`${issue.severity.toUpperCase()}`, 20, yPos);
          doc.setTextColor(100, 100, 100);
          doc.text(`| ${issue.category}`, 45, yPos);
          yPos += 6;
          
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          doc.setFont(undefined, 'normal');
          
          doc.setFont(undefined, 'bold');
          doc.text('Why it hurts:', 20, yPos);
          yPos += 5;
          doc.setFont(undefined, 'normal');
          const descLines = doc.splitTextToSize(issue.description, 165);
          doc.text(descLines, 25, yPos);
          yPos += descLines.length * 4 + 3;
          
          doc.setFont(undefined, 'bold');
          doc.text('How to fix:', 20, yPos);
          yPos += 5;
          doc.setFont(undefined, 'normal');
          const fixLines = doc.splitTextToSize(issue.impact, 165);
          doc.text(fixLines, 25, yPos);
          yPos += fixLines.length * 4 + 8;
        });
      }
      
      // === ACTION PLAN PAGE ===
      if (results.rawData?.actionPlan && results.rawData.actionPlan.length > 0) {
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(20);
        doc.setTextColor(41, 28, 16);
        doc.text('Action Plan', 20, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Follow these steps in order for maximum impact:', 20, yPos);
        yPos += 12;
        
        results.rawData.actionPlan.forEach((step, idx) => {
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }
          
          // Step number circle
          doc.setFillColor(41, 28, 16);
          doc.circle(25, yPos + 3, 4, 'F');
          doc.setFontSize(10);
          doc.setTextColor(255, 255, 255);
          doc.text((idx + 1).toString(), 25, yPos + 4.5, { align: 'center' });
          
          // Step title
          doc.setFontSize(12);
          doc.setTextColor(41, 28, 16);
          doc.setFont(undefined, 'bold');
          doc.text(step.title, 35, yPos + 5);
          yPos += 8;
          
          // Impact & Effort badges
          doc.setFontSize(8);
          const impactColor = step.impact === 'high' ? [220, 38, 38] : step.impact === 'medium' ? [234, 179, 8] : [34, 139, 34];
          doc.setFillColor(...impactColor);
          doc.roundedRect(35, yPos, 18, 5, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.text(`${step.impact} impact`, 44, yPos + 3.5, { align: 'center' });
          
          doc.setFillColor(200, 200, 200);
          doc.roundedRect(55, yPos, 18, 5, 1, 1, 'F');
          doc.setTextColor(50, 50, 50);
          doc.text(`${step.effort} effort`, 64, yPos + 3.5, { align: 'center' });
          yPos += 8;
          
          // Details
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          doc.setFont(undefined, 'normal');
          const detailLines = doc.splitTextToSize(step.details, 155);
          doc.text(detailLines, 35, yPos);
          yPos += detailLines.length * 4 + 10;
        });
      }
      
      // === CHECKLIST PAGE ===
      if (checklist.length > 0) {
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(20);
        doc.setTextColor(41, 28, 16);
        doc.text('Action Checklist', 20, yPos);
        yPos += 12;
        
        const completed = checklist.filter(item => item.checked).length;
        const completionPct = Math.round((completed / checklist.length) * 100);
        
        // Progress bar
        doc.setFillColor(230, 230, 230);
        doc.roundedRect(20, yPos, 170, 8, 2, 2, 'F');
        
        if (completionPct > 0) {
          doc.setFillColor(41, 28, 16);
          doc.roundedRect(20, yPos, 170 * (completionPct / 100), 8, 2, 2, 'F');
        }
        
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`${completionPct}% Complete (${completed}/${checklist.length})`, 105, yPos + 5.5, { align: 'center' });
        yPos += 15;
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Print this page and check off items as you complete them:', 20, yPos);
        yPos += 10;
        
        if (doc.autoTable) {
          doc.autoTable({
            startY: yPos,
            head: [['✓', 'Action Item', 'Status']],
            body: checklist.map(item => [
              item.checked ? '✓' : '☐',
              item.label.substring(0, 80),
              item.checked ? 'Done' : 'Pending'
            ]),
            headStyles: { fillColor: [41, 28, 16], textColor: 255, fontSize: 10 },
            columnStyles: { 
              0: { cellWidth: 10, halign: 'center', fontSize: 12 }, 
              1: { cellWidth: 140 },
              2: { cellWidth: 20, halign: 'center', fontSize: 9 }
            },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            styles: { fontSize: 9 },
          });
        }
      }
      
      // === FINAL PAGE ===
      doc.addPage();
      yPos = 100;
      
      doc.setFontSize(18);
      doc.setTextColor(41, 28, 16);
      doc.text('Next Steps', 105, yPos, { align: 'center' });
      yPos += 15;
      
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      const nextStepsText = [
        '1. Review the priority issues and start with critical items',
        '2. Use the checklist to track your progress',
        '3. Implement the suggested hero copy on your homepage',
        '4. Follow the action plan in order for maximum impact',
        '5. Re-scan your website in 2-4 weeks to measure improvement'
      ];
      
      nextStepsText.forEach((text) => {
        doc.text(text, 105, yPos, { align: 'center' });
        yPos += 8;
      });
      
      yPos += 20;
      
      // Footer
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text('Generated by AriClear', 105, yPos, { align: 'center' });
      yPos += 8;
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text('Professional Website Clarity Analysis', 105, yPos, { align: 'center' });
      yPos += 6;
      doc.text(`Report generated on ${new Date().toLocaleString()}`, 105, yPos, { align: 'center' });
      yPos += 15;
      
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text('Need help implementing these changes? Visit ariclear.com', 105, yPos, { align: 'center' });

      doc.save(`ariclear-report-${Date.now()}.pdf`);
      toast.success('PDF report downloaded!', { id: loadingToast });
      
    } catch (error) {
      console.error('PDF Generation Error:', error);
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
          {results.rawData.suggestedCopy.cta && onPreorderClick && (
            <button
              type="button"
              onClick={onPreorderClick}
              className="mt-3 inline-flex items-center rounded-full bg-choco-900 px-4 py-2 text-[11px] font-medium text-cream-50 transition hover:bg-choco-800 focus:outline-none focus:ring-2 focus:ring-choco-400"
            >
              {results.rawData.suggestedCopy.cta}
            </button>
          )}
          <p className="mt-2 text-[11px] text-choco-500">
            Want a full report (hero + sections + FAQs + metadata + schema)? Join early access.
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