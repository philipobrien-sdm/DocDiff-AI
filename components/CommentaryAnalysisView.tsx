import React from 'react';
import { CommentaryAnalysis } from '../types';
import { CheckCircle2, MessageCircle, Users, Lightbulb } from 'lucide-react';

interface CommentaryAnalysisViewProps {
  analysis: CommentaryAnalysis;
  onUpdate?: (analysis: CommentaryAnalysis) => void;
}

export const CommentaryAnalysisView: React.FC<CommentaryAnalysisViewProps> = ({ analysis, onUpdate }) => {
  const handleTextChange = (field: keyof CommentaryAnalysis, value: string) => {
    if (onUpdate) {
      onUpdate({
        ...analysis,
        [field]: value
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <div className="bg-white rounded-xl p-6 border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Success Patterns</h3>
        </div>
        <textarea
          value={analysis.successPatterns}
          onChange={(e) => handleTextChange('successPatterns', e.target.value)}
          className="w-full text-slate-600 leading-relaxed text-sm bg-transparent border-none resize-none focus:ring-2 focus:ring-indigo-200 focus:bg-indigo-50/20 rounded p-1 -ml-1"
          rows={6}
        />
      </div>

      <div className="bg-white rounded-xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
            <MessageCircle size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Tone Analysis</h3>
        </div>
        <textarea
          value={analysis.toneAnalysis}
          onChange={(e) => handleTextChange('toneAnalysis', e.target.value)}
          className="w-full text-slate-600 leading-relaxed text-sm bg-transparent border-none resize-none focus:ring-2 focus:ring-teal-200 focus:bg-teal-50/20 rounded p-1 -ml-1"
          rows={6}
        />
      </div>

      <div className="bg-white rounded-xl p-6 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <Users size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Contributor Insights</h3>
        </div>
        <textarea
          value={analysis.contributorInsights}
          onChange={(e) => handleTextChange('contributorInsights', e.target.value)}
          className="w-full text-slate-600 leading-relaxed text-sm bg-transparent border-none resize-none focus:ring-2 focus:ring-amber-200 focus:bg-amber-50/20 rounded p-1 -ml-1"
          rows={6}
        />
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Lightbulb size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Other Insights</h3>
        </div>
        <textarea
          value={analysis.otherInsights}
          onChange={(e) => handleTextChange('otherInsights', e.target.value)}
          className="w-full text-slate-600 leading-relaxed text-sm bg-transparent border-none resize-none focus:ring-2 focus:ring-slate-200 focus:bg-slate-50/50 rounded p-1 -ml-1"
          rows={6}
        />
      </div>

    </div>
  );
};