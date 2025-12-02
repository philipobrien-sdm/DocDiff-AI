import React, { useState } from 'react';
import { TrackedItem, AnalysisResult, ChangeType, AnalysisStatus } from '../types';
import { MessageSquare, Plus, Trash2, ArrowRight, CheckCircle2, AlertCircle, XCircle, Ban, StickyNote, Save, Quote, FileText, Bookmark, BarChart2, Sparkles, X, Send } from 'lucide-react';

interface ChangeCardProps {
  item: TrackedItem;
  result?: AnalysisResult;
  compact?: boolean;
  onClick?: () => void;
  highlighted?: boolean;
  onUpdateNote?: (id: string, note: string) => void;
  onAskAi?: (item: TrackedItem, query: string) => Promise<string>;
}

export const ChangeCard: React.FC<ChangeCardProps> = ({ item, result, compact = false, onClick, highlighted = false, onUpdateNote, onAskAi }) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(result?.userNotes || '');
  
  // Ask AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleSaveNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateNote) {
      onUpdateNote(item.id, noteText);
    }
    setIsEditingNote(false);
  };

  const handleNoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingNote(true);
  };

  const handleAskAiClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowAiModal(true);
  };

  const handleSubmitAiQuery = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!aiQuery.trim() || !onAskAi) return;

      setIsAiLoading(true);
      try {
          const response = await onAskAi(item, aiQuery);
          
          // Format the new note
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newEntry = `[AI Query ${timestamp}]: ${aiQuery}\n-> ${response}`;
          
          const updatedNote = noteText ? `${noteText}\n\n${newEntry}` : newEntry;
          
          setNoteText(updatedNote);
          if(onUpdateNote) onUpdateNote(item.id, updatedNote);
          
          setAiQuery('');
          setShowAiModal(false);
      } catch (err) {
          console.error("AI Query failed", err);
      } finally {
          setIsAiLoading(false);
      }
  };

  const getIcon = () => {
    switch (item.type) {
      case ChangeType.INSERTION: return <Plus size={16} />;
      case ChangeType.DELETION: return <Trash2 size={16} />;
      case ChangeType.COMMENT: return <MessageSquare size={16} />;
    }
  };

  const getStatusInfo = (status: AnalysisStatus) => {
    switch (status) {
      case AnalysisStatus.ACCEPTED:
        return { label: "Accepted", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 size={14} /> };
      case AnalysisStatus.ADDRESSED:
        return { label: "Addressed", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <CheckCircle2 size={14} /> };
      case AnalysisStatus.NOT_ACTIONED:
        return { label: "Not Actioned", color: "bg-rose-100 text-rose-700 border-rose-200", icon: <XCircle size={14} /> };
      case AnalysisStatus.NO_LONGER_RELEVANT:
        return { label: "Irrelevant", color: "bg-slate-100 text-slate-600 border-slate-200", icon: <Ban size={14} /> };
      default:
        return { label: "Unknown", color: "bg-gray-100 text-gray-700 border-gray-200", icon: <AlertCircle size={14} /> };
    }
  };

  const getImplicationColor = (imp: string) => {
      switch(imp) {
          case 'Significant Change': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'Change': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
          case 'Editorial': return 'bg-slate-100 text-slate-700 border-slate-200';
          default: return 'bg-slate-50 text-slate-500 border-slate-200';
      }
  };

  const renderScoreBar = (label: string, score: number) => (
      <div className="flex flex-col gap-0.5">
          <div className="flex justify-between items-end">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
              <span className="text-[9px] text-slate-600 font-bold">{score}/5</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${score >= 4 ? 'bg-emerald-400' : (score >= 3 ? 'bg-blue-400' : 'bg-slate-300')}`} 
                style={{ width: `${(score / 5) * 100}%` }} 
              />
          </div>
      </div>
  );

  const statusInfo = result ? getStatusInfo(result.status) : null;
  const hasNote = !!result?.userNotes || !!noteText;

  return (
    <>
    <div 
      onClick={onClick}
      className={`
        bg-white rounded-lg border shadow-sm transition-all cursor-default relative group flex flex-col
        ${highlighted ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-slate-200 hover:shadow-md'}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Header */}
      <div className="flex flex-col gap-2 mb-3">
        {/* Section Context Label */}
        {item.sectionContext && (
          <div className="flex items-center gap-1.5 text-slate-400">
             <Bookmark size={12} className="shrink-0" />
             <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-full">
               {item.sectionContext}
             </span>
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-md ${
              item.type === ChangeType.INSERTION ? 'bg-indigo-50 text-indigo-600' :
              item.type === ChangeType.DELETION ? 'bg-orange-50 text-orange-600' :
              'bg-amber-50 text-amber-600'
            }`}>
              {getIcon()}
            </span>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{item.type}</span>
          </div>
          
          <div className="flex items-center gap-2">
             {onAskAi && !compact && (
                 <button 
                  onClick={handleAskAiClick}
                  className="p-1 rounded-full text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Ask AI for Guidance"
                 >
                   <Sparkles size={16} />
                 </button>
             )}

            {onUpdateNote && (
              <button 
                onClick={handleNoteClick}
                className={`p-1 rounded-full transition-colors ${hasNote ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-500'}`}
                title={hasNote ? "Edit Note" : "Add Note"}
              >
                <StickyNote size={16} fill={hasNote ? "currentColor" : "none"} />
              </button>
            )}

            {statusInfo && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${statusInfo.color}`}>
                {statusInfo.icon}
                {statusInfo.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Blocks */}
      <div className="space-y-3 flex-1">
        
        {/* The Change Itself */}
        <div className="bg-slate-50 rounded p-2 border border-slate-100">
           <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
             <FileText size={10} />
             <span>Tracked Content</span>
           </div>
           {item.type === ChangeType.COMMENT ? (
            <div className="text-sm text-slate-800 italic">
              "{item.commentContent}"
            </div>
           ) : (
            <div className="text-sm font-medium text-slate-900 break-words font-serif">
              <span className={item.type === ChangeType.DELETION ? "line-through text-slate-400" : ""}>
                {item.text}
              </span>
            </div>
           )}
        </div>

        {/* The Context */}
        {!compact && (
          <div className="text-xs text-slate-500">
            <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
               <Quote size={10} />
               <span>Context / Original Excerpt</span>
            </div>
            <div className="pl-2 border-l-2 border-slate-200 italic line-clamp-3 leading-relaxed">
              "{item.context}"
            </div>
          </div>
        )}
      </div>

      {/* Scoring Matrix */}
      {result?.scoring && !compact && (
          <div className="mt-3 pt-3 border-t border-slate-100">
             <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                     <BarChart2 size={10} /> Impact Analysis
                 </div>
                 <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getImplicationColor(result.scoring.implication)}`}>
                     {result.scoring.implication}
                 </span>
             </div>
             <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                 {renderScoreBar("Alignment", result.scoring.alignment)}
                 {renderScoreBar("Feasibility", result.scoring.feasibility)}
                 {renderScoreBar("Future Acceptance", result.scoring.futureAcceptance)}
                 {renderScoreBar("Author Accept.", result.scoring.authorAcceptability)}
             </div>
          </div>
      )}

      {/* AI Analysis Result */}
      {result && (
        <div className={`mt-3 pt-3 border-t border-slate-100 ${compact ? 'text-xs' : 'text-sm'}`}>
          <div className="flex items-start gap-2">
            <div className="mt-0.5 text-slate-400 shrink-0">
              <ArrowRight size={14} />
            </div>
            <p className="text-slate-600 leading-relaxed">
              {result.explanation}
            </p>
          </div>
        </div>
      )}

      {/* User Notes Area */}
      {(hasNote || isEditingNote) && (
        <div className="mt-3 pt-2 border-t border-amber-100 bg-amber-50/30 rounded -mx-2 px-2 pb-1">
          {isEditingNote ? (
            <div onClick={e => e.stopPropagation()}>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full text-sm p-2 border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                rows={3}
                placeholder="Add your observation here..."
                autoFocus
              />
              <div className="flex justify-end mt-2 gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditingNote(false); setNoteText(result?.userNotes || ''); }}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveNote}
                  className="flex items-center gap-1 text-xs bg-amber-500 text-white px-3 py-1 rounded hover:bg-amber-600"
                >
                  <Save size={12} /> Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
               <StickyNote size={14} className="text-amber-500 mt-0.5 shrink-0" />
               <p className="text-sm text-slate-800 italic whitespace-pre-wrap">
                 <span className="font-bold text-xs text-amber-700 uppercase mr-1">User Note:</span>
                 {result?.userNotes || noteText}
               </p>
            </div>
          )}
        </div>
      )}
    </div>

    {/* ASK AI MODAL OVERLAY */}
    {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="text-indigo-500" size={20} />
                        Ask AI Guidance
                    </h3>
                    <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <p className="text-sm text-slate-500 mb-4">
                    Ask a "What if" question about this specific item. The result will be saved to your notes.
                </p>

                <div className="bg-slate-50 p-3 rounded mb-4 text-xs text-slate-600 border border-slate-200 line-clamp-3 italic">
                    {item.text || item.commentContent}
                </div>

                <form onSubmit={handleSubmitAiQuery}>
                    <textarea 
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                        placeholder="e.g. What if we reject this change? Is this standard?"
                        rows={3}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button 
                            type="button" 
                            onClick={() => setShowAiModal(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isAiLoading || !aiQuery.trim()}
                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isAiLoading ? <span className="animate-spin">⏳</span> : <Send size={14} />}
                            Ask AI
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )}
    </>
  );
};