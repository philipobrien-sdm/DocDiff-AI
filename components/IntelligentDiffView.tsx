import React, { useState } from 'react';
import { IntelligentDiffAnalysis, DiffSection } from '../types';
import { Scale, ShieldAlert, Zap, BookOpenCheck, AlertTriangle, Users, Target, HelpCircle, Sparkles, RefreshCcw, X, Send } from 'lucide-react';

interface IntelligentDiffViewProps {
  diff: IntelligentDiffAnalysis;
  onUpdate?: (diff: IntelligentDiffAnalysis) => void;
  onRefine?: (instruction: string, section: DiffSection) => Promise<void>;
  isRefining?: boolean;
}

export const IntelligentDiffView: React.FC<IntelligentDiffViewProps> = ({ diff, onUpdate, onRefine, isRefining }) => {
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineSection, setRefineSection] = useState<DiffSection>('ALL');

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleTextChange = (field: keyof IntelligentDiffAnalysis, value: string) => {
    if (onUpdate) {
      onUpdate({
        ...diff,
        [field]: value
      });
    }
  };

  const handleRefineSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (onRefine && refineInstruction.trim()) {
          await onRefine(refineInstruction, refineSection);
          setShowRefineModal(false);
          setRefineInstruction('');
          setRefineSection('ALL');
      }
  };

  return (
    <div className="space-y-8 relative">
      
      {/* Global Refine Button */}
      {onRefine && (
        <div className="flex justify-end mb-4">
             <button 
               onClick={() => setShowRefineModal(true)}
               disabled={isRefining}
               className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium shadow-md hover:bg-indigo-700 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
             >
                {isRefining ? <RefreshCcw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isRefining ? 'Refining Analysis...' : 'Refine Analysis with AI'}
             </button>
        </div>
      )}

      {/* Executive Summary & Risk Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative group flex flex-col min-h-[400px]">
          <div className="flex items-center gap-3 mb-4 shrink-0">
             <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <BookOpenCheck size={24} />
             </div>
             <h3 className="text-xl font-bold text-slate-800">Executive Summary</h3>
          </div>
          <textarea
            value={diff.summary}
            onChange={(e) => handleTextChange('summary', e.target.value)}
            className="w-full flex-1 text-slate-600 leading-relaxed text-base bg-transparent border-none resize-none focus:ring-2 focus:ring-blue-200 focus:bg-blue-50/20 rounded p-2 -ml-2"
            placeholder="Executive summary will appear here..."
          />
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
           <div className="flex items-center gap-3 mb-4 shrink-0">
             <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <ShieldAlert size={24} />
             </div>
             <h3 className="text-lg font-bold text-slate-800">Risk Profile Shift</h3>
          </div>
          <textarea
            value={diff.riskProfile}
            onChange={(e) => handleTextChange('riskProfile', e.target.value)}
            className="w-full flex-1 text-slate-700 font-medium bg-transparent border-none resize-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50/20 rounded p-2 -ml-2"
            placeholder="Risk profile analysis..."
          />
        </div>
      </div>

      {/* Strategic Shifts */}
      <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Scale size={24} />
             </div>
             <h3 className="text-lg font-bold text-slate-800">Strategic Direction & Purpose</h3>
          </div>
          <div className="border-l-4 border-purple-200 pl-4">
            <textarea
              value={diff.strategicShifts}
              onChange={(e) => handleTextChange('strategicShifts', e.target.value)}
              className="w-full text-slate-600 italic bg-transparent border-none resize-none focus:ring-2 focus:ring-purple-200 focus:bg-purple-50/20 rounded p-2 -ml-2 min-h-[120px]"
              rows={4}
              placeholder="Strategic shifts analysis..."
            />
          </div>
      </div>

      {/* Implied Stakeholder Priorities Analysis */}
      {diff.stakeholderPriorities && diff.stakeholderPriorities.length > 0 && (
         <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                <div className="p-6 bg-indigo-50/50 border-b border-indigo-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" />
                        Implied Stakeholder Priorities Analysis
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Breakdown of tracked concerns and predicted demands by author.
                    </p>
                </div>
                <div className="divide-y divide-slate-100">
                    {diff.stakeholderPriorities.map((stakeholder, idx) => (
                        <div key={idx} className="p-6">
                            <h4 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm border border-slate-200">
                                  {stakeholder.stakeholder}
                                </span>
                            </h4>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                                        <Target size={12} /> Primary Concerns
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed">{stakeholder.primaryConcerns}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-500 mb-2">
                                        <BookOpenCheck size={12} /> Outcome
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed">{stakeholder.outcomeSummary}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-500 mb-2">
                                        <HelpCircle size={12} /> Next Version Wants
                                    </div>
                                    <p className="text-sm text-slate-700 italic leading-relaxed">{stakeholder.projectedWants}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
         </div>
      )}

      {/* Outstanding Risks & Remediation */}
      {diff.outstandingIssues && diff.outstandingIssues.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
           <div className="p-6 bg-red-50/50 border-b border-red-100">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <AlertTriangle size={20} className="text-red-500" />
                 Outstanding Risks & Concerns
               </h3>
               <p className="text-sm text-slate-500 mt-1">
                 Based on unresolved comments and contentious changes.
               </p>
           </div>
           <div className="divide-y divide-slate-100">
               {diff.outstandingIssues.map((issue, idx) => (
                   <div key={idx} className="p-6 hover:bg-slate-50 transition-colors">
                       <div className="flex items-start justify-between mb-2">
                           <h4 className="font-bold text-slate-900 text-sm flex-1 mr-4">{issue.issue}</h4>
                           <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getSeverityColor(issue.severity)}`}>
                               {issue.severity}
                           </span>
                       </div>
                       <div className="mt-3 bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-600">
                           <strong className="block text-slate-800 text-xs uppercase tracking-wide mb-1">Recommended Action</strong>
                           {issue.remediation}
                       </div>
                   </div>
               ))}
           </div>
        </div>
      )}

      {/* Key Changes Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Zap size={20} className="text-amber-500"/>
          Key Provisions & Impact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {diff.keyChanges.map((change, idx) => (
            <div key={idx} className="bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-300 transition-colors shadow-sm">
              <h4 className="font-bold text-slate-900 mb-2">{change.title}</h4>
              <div className="mb-3 text-sm text-slate-600">
                <span className="font-semibold text-xs uppercase tracking-wide text-slate-400 block mb-1">Change</span>
                {change.description}
              </div>
              <div className="pt-3 border-t border-slate-50 text-sm text-slate-600 bg-slate-50/50 -mx-5 -mb-5 p-5 rounded-b-xl">
                 <span className="font-semibold text-xs uppercase tracking-wide text-blue-500 block mb-1">Impact</span>
                 {change.impact}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REFINE MODAL */}
      {showRefineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="text-indigo-600" size={24} />
                        Refine Analysis
                    </h3>
                    <button onClick={() => setShowRefineModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-sm text-slate-500 mb-6">
                    Provide instructions to the AI to redo the analysis. You can target specific sections or the entire report.
                </p>

                <form onSubmit={handleRefineSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Scope of Refinement</label>
                        <select 
                            value={refineSection} 
                            onChange={(e) => setRefineSection(e.target.value as DiffSection)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                            <option value="ALL">Entire Analysis</option>
                            <option value="summary">Executive Summary</option>
                            <option value="riskProfile">Risk Profile</option>
                            <option value="strategicShifts">Strategic Shifts</option>
                            <option value="keyChanges">Key Changes</option>
                            <option value="outstandingIssues">Outstanding Issues</option>
                            <option value="stakeholderPriorities">Stakeholder Priorities</option>
                        </select>
                    </div>

                    <div className="mb-6">
                         <label className="block text-sm font-bold text-slate-700 mb-2">Instructions / Clarification</label>
                        <textarea 
                            value={refineInstruction}
                            onChange={(e) => setRefineInstruction(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-32 resize-none"
                            placeholder="e.g. Please focus more on the liability caps, or simplify the language for a non-technical audience."
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowRefineModal(false)}
                            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={!refineInstruction.trim()}
                            className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <RefreshCcw size={16} />
                            Redo Analysis
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};