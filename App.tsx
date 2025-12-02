import React, { useState, useMemo, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { ChangeCard } from './components/ChangeCard';
import { TimelineView } from './components/TimelineView';
import { DocumentView } from './components/DocumentView';
import { CommentaryAnalysisView } from './components/CommentaryAnalysisView';
import { IntelligentDiffView } from './components/IntelligentDiffView';
import { TrackedItem, AnalysisResult, DocxData, AnalysisStatus, CommentaryAnalysis, IntelligentDiffAnalysis, AnalysisContext, DiffSection } from './types';
import { parseDocx } from './services/docxService';
import { extractTextFromFile } from './services/fileParsingService';
import { analyzeChanges, analyzeCommentary, analyzeIntelligentDiff, askAiGuidance, refineIntelligentDiff } from './services/geminiService';
import { generateHtmlReport } from './services/exportService';
import { saveToLocalStorage, loadFromLocalStorage, exportSessionJson, importSessionJson, clearLocalStorage } from './services/storageService';
import { Activity, FileText, CheckCheck, AlertCircle, Loader2, LayoutGrid, Clock, BookOpen, Filter, X, MessageSquare, Download, Upload, Save, RotateCcw, Search, Scale, Settings2, RefreshCw, AlertTriangle } from 'lucide-react';

const IMPLICATION_WEIGHT: Record<string, number> = {
  'Significant Change': 4,
  'Change': 3,
  'Editorial': 2,
  'Clarification': 1
};

const App: React.FC = () => {
  const [resetKey, setResetKey] = useState(0); // Used to force re-mount of uploaders
  const [showResetModal, setShowResetModal] = useState(false); // Custom modal state
  
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [stakeholderFile, setStakeholderFile] = useState<File | null>(null);
  
  const [oldDocText, setOldDocText] = useState<string>('');
  const [newDocText, setNewDocText] = useState<string>('');
  const [stakeholderDocText, setStakeholderDocText] = useState<string>('');
  
  const [extractedItems, setExtractedItems] = useState<TrackedItem[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Map<string, AnalysisResult>>(new Map());
  const [commentaryAnalysis, setCommentaryAnalysis] = useState<CommentaryAnalysis | null>(null);
  const [intelligentDiff, setIntelligentDiff] = useState<IntelligentDiffAnalysis | null>(null);
  
  // Context State
  const [docPerspective, setDocPerspective] = useState('');
  const [intendedRecipient, setIntendedRecipient] = useState('');
  const [reportStyle, setReportStyle] = useState<'High Level' | 'Technical' | 'Balanced'>('Balanced');
  const [focusArea, setFocusArea] = useState('');
  const [generalContext, setGeneralContext] = useState('');

  const [status, setStatus] = useState<'IDLE' | 'PARSING' | 'ANALYZING' | 'DONE' | 'ERROR'>('IDLE');
  const [isRefining, setIsRefining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [progressMsg, setProgressMsg] = useState<string>('');

  const [viewMode, setViewMode] = useState<'GRID' | 'TIMELINE' | 'DOCUMENT' | 'COMMENTARY' | 'DIFF'>('GRID');
  const [filters, setFilters] = useState<Set<AnalysisStatus>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Init from Local Storage
  useEffect(() => {
    const savedState = loadFromLocalStorage();
    if (savedState) {
      setOldDocText(savedState.oldDocText);
      setNewDocText(savedState.newDocText);
      setExtractedItems(savedState.extractedItems);
      setAnalysisResults(new Map(savedState.analysisResults));
      setCommentaryAnalysis(savedState.commentaryAnalysis);
      setIntelligentDiff(savedState.intelligentDiff);
      
      if(savedState.context) {
          setDocPerspective(savedState.context.documentPerspective);
          setIntendedRecipient(savedState.context.intendedRecipient);
          setReportStyle(savedState.context.reportStyle);
          setFocusArea(savedState.context.focusArea || '');
          setGeneralContext(savedState.context.generalContext || '');
      }

      if(savedState.stakeholderDocText) {
          setStakeholderDocText(savedState.stakeholderDocText);
      }

      if (savedState.extractedItems.length > 0) {
        setStatus('DONE');
      }
    }
  }, []);

  // Auto-save to Local Storage on change
  useEffect(() => {
    if (status === 'DONE') {
      const context: AnalysisContext = {
          documentPerspective: docPerspective,
          intendedRecipient: intendedRecipient,
          reportStyle: reportStyle,
          focusArea: focusArea,
          generalContext: generalContext,
          stakeholderPriorities: stakeholderDocText
      };
      saveToLocalStorage(oldDocText, newDocText, stakeholderDocText, extractedItems, analysisResults, commentaryAnalysis, intelligentDiff, context);
    }
  }, [oldDocText, newDocText, stakeholderDocText, extractedItems, analysisResults, commentaryAnalysis, intelligentDiff, status, docPerspective, intendedRecipient, reportStyle, focusArea, generalContext]);

  const toggleFilter = (s: AnalysisStatus) => {
    const newFilters = new Set(filters);
    if (newFilters.has(s)) newFilters.delete(s);
    else newFilters.add(s);
    setFilters(newFilters);
  };

  const handleUpdateNote = (id: string, note: string) => {
    const newResults = new Map(analysisResults);
    const item = newResults.get(id);
    if (item) {
      // Use Object.assign to avoid "Spread types may only be created from object types" error
      const updatedItem = Object.assign({}, item, { userNotes: note });
      newResults.set(id, updatedItem);
      setAnalysisResults(newResults);
    }
  };
  
  const handleAskAi = async (item: TrackedItem, query: string): Promise<string> => {
      const context: AnalysisContext = {
          documentPerspective: docPerspective || 'General Document',
          intendedRecipient: intendedRecipient || 'Reviewer',
          reportStyle: reportStyle,
          focusArea: focusArea || 'All',
          generalContext: generalContext || '',
          stakeholderPriorities: stakeholderDocText
      };
      return await askAiGuidance(item, query, context);
  };

  const handleUpdateIntelligentDiff = (updatedDiff: IntelligentDiffAnalysis) => {
    setIntelligentDiff(updatedDiff);
  };
  
  const handleRefineDiff = async (instruction: string, section: DiffSection) => {
      if(!intelligentDiff) return;
      setIsRefining(true);
      try {
          const updatedParts = await refineIntelligentDiff(
              oldDocText, 
              newDocText, 
              extractedItems, 
              intelligentDiff, 
              instruction, 
              section
          );
          
          setIntelligentDiff(prev => {
              if(!prev) return null;
              return { ...prev, ...updatedParts };
          });
      } catch (err) {
          console.error("Refine failed", err);
          alert("Failed to refine analysis. Please try again.");
      } finally {
          setIsRefining(false);
      }
  };

  const handleUpdateCommentary = (updatedCommentary: CommentaryAnalysis) => {
    setCommentaryAnalysis(updatedCommentary);
  };

  const handleResetClick = () => {
    setShowResetModal(true);
  };

  const performReset = () => {
      console.log("DEBUG: Resetting state...");
      
      // 1. Clear Storage
      clearLocalStorage();
      
      // 2. Reset Files
      setOldFile(null);
      setNewFile(null);
      setResponseFile(null);
      setStakeholderFile(null);
      
      // 3. Reset Data
      setOldDocText('');
      setNewDocText('');
      setStakeholderDocText('');
      setExtractedItems([]);
      setAnalysisResults(new Map());
      setCommentaryAnalysis(null);
      setIntelligentDiff(null);
      
      // 4. Reset Context
      setDocPerspective('');
      setIntendedRecipient('');
      setReportStyle('Balanced');
      setFocusArea('');
      setGeneralContext('');
      
      // 5. Reset UI State
      setErrorMsg('');
      setProgressMsg('');
      setFilters(new Set());
      setSearchQuery('');
      setIsRefining(false);
      setStatus('IDLE');
      setShowResetModal(false);

      // 6. Force Remount of Uploaders (clears internal file inputs)
      setResetKey(prev => prev + 1);
  };

  const filteredItems = useMemo(() => {
    let items = extractedItems;

    // 1. Status Filter
    if (filters.size > 0) {
      items = items.filter(item => {
        const result = analysisResults.get(item.id);
        return result && filters.has(result.status);
      });
    }

    // 2. Text Search Filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      items = items.filter(item => {
        const result = analysisResults.get(item.id);
        
        const textMatch = item.text.toLowerCase().includes(lowerQuery);
        const contextMatch = item.context.toLowerCase().includes(lowerQuery);
        const commentMatch = item.commentContent?.toLowerCase().includes(lowerQuery);
        const explanationMatch = result?.explanation.toLowerCase().includes(lowerQuery);
        const notesMatch = result?.userNotes?.toLowerCase().includes(lowerQuery);

        return textMatch || contextMatch || commentMatch || explanationMatch || notesMatch;
      });
    }

    return items;
  }, [extractedItems, analysisResults, filters, searchQuery]);

  const sortedGridItems = useMemo(() => {
    // Sort logic for Grid View: Importance -> Document Order
    return [...filteredItems].sort((a, b) => {
        const resA = analysisResults.get(a.id);
        const resB = analysisResults.get(b.id);
        
        const weightA = resA?.scoring?.implication ? (IMPLICATION_WEIGHT[resA.scoring.implication] || 0) : 0;
        const weightB = resB?.scoring?.implication ? (IMPLICATION_WEIGHT[resB.scoring.implication] || 0) : 0;

        // Descending weight
        if (weightB !== weightA) {
            return weightB - weightA;
        }
        
        // Fallback: Document Order
        return (a.paragraphIndex || 0) - (b.paragraphIndex || 0);
    });
  }, [filteredItems, analysisResults]);

  const handleAnalyze = async () => {
    if (!oldFile || !newFile) return;

    setStatus('PARSING');
    setProgressMsg('Reading documents...');
    setErrorMsg('');
    setExtractedItems([]);
    setAnalysisResults(new Map());
    setCommentaryAnalysis(null);
    setIntelligentDiff(null);

    // Parse Stakeholder File if present
    let finalStakeholderText = stakeholderDocText;
    if (stakeholderFile) {
        try {
            // Using new generic text extractor
            finalStakeholderText = await extractTextFromFile(stakeholderFile);
            setStakeholderDocText(finalStakeholderText);
        } catch (e: any) {
            console.error("Failed to parse stakeholder file", e);
            setErrorMsg(`Error reading Priorities File: ${e.message}`);
            setStatus('ERROR');
            return;
        }
    }

    const context: AnalysisContext = {
        documentPerspective: docPerspective || 'General Document',
        intendedRecipient: intendedRecipient || 'Reviewer',
        reportStyle: reportStyle,
        focusArea: focusArea || 'All',
        generalContext: generalContext || '',
        stakeholderPriorities: finalStakeholderText
    };

    try {
      const oldDocData: DocxData = await parseDocx(oldFile);
      setOldDocText(oldDocData.fullText);
      setExtractedItems(oldDocData.items);

      if (oldDocData.items.length === 0) {
        setErrorMsg("No tracked changes or comments found in the previous version file.");
        setStatus('ERROR');
        return;
      }

      const newDocData: DocxData = await parseDocx(newFile);
      setNewDocText(newDocData.fullText);

      // Optional 3rd file
      let responseDocText = "";
      if (responseFile) {
        // Using new generic text extractor
        responseDocText = await extractTextFromFile(responseFile);
      }

      setStatus('ANALYZING');
      setProgressMsg('Step 1/2: Analyzing individual changes & scores...');

      // Step 1: Analyze individual items (Status + Scoring)
      const results = await analyzeChanges(newDocData.fullText, oldDocData.items);
      const resultsMap = new Map<string, AnalysisResult>();
      results.forEach(r => resultsMap.set(r.itemId, r));
      setAnalysisResults(resultsMap);

      setProgressMsg('Step 2/2: Generating Intelligent Strategic Diff...');

      // Step 2: Use items AND scores AND context for high-level analysis
      const [diffAnalysis, commAnalysis] = await Promise.all([
        analyzeIntelligentDiff(oldDocData.fullText, newDocData.fullText, oldDocData.items, resultsMap, context),
        responseDocText ? analyzeCommentary(responseDocText) : Promise.resolve(null)
      ]);
      
      setIntelligentDiff(diffAnalysis);
      setCommentaryAnalysis(commAnalysis);
      
      setStatus('DONE');

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "An error occurred during analysis.");
      setStatus('ERROR');
    }
  };

  const handleExportHtml = () => {
    // Sort all items for export based on importance, regardless of current view filters
    const allSortedItems = [...extractedItems].sort((a, b) => {
        const resA = analysisResults.get(a.id);
        const resB = analysisResults.get(b.id);
        
        const weightA = resA?.scoring?.implication ? (IMPLICATION_WEIGHT[resA.scoring.implication] || 0) : 0;
        const weightB = resB?.scoring?.implication ? (IMPLICATION_WEIGHT[resB.scoring.implication] || 0) : 0;

        if (weightB !== weightA) return weightB - weightA;
        return (a.paragraphIndex || 0) - (b.paragraphIndex || 0);
    });

    const htmlContent = generateHtmlReport(
      oldFile?.name || "Previous Version",
      newFile?.name || "New Version",
      oldDocText,
      newDocText,
      allSortedItems, // Pass sorted items
      analysisResults,
      commentaryAnalysis,
      intelligentDiff
    );
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docdiff-analysis-report.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveSession = () => {
    const context: AnalysisContext = {
          documentPerspective: docPerspective,
          intendedRecipient: intendedRecipient,
          reportStyle: reportStyle,
          focusArea: focusArea,
          generalContext: generalContext,
          stakeholderPriorities: stakeholderDocText
      };
    exportSessionJson(oldDocText, newDocText, stakeholderDocText, extractedItems, analysisResults, commentaryAnalysis, intelligentDiff, context);
  };

  const handleLoadSession = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      importSessionJson(e.target.files[0])
        .then(state => {
          setOldDocText(state.oldDocText);
          setNewDocText(state.newDocText);
          setStakeholderDocText(state.stakeholderDocText || '');
          setExtractedItems(state.extractedItems);
          setAnalysisResults(new Map(state.analysisResults));
          setCommentaryAnalysis(state.commentaryAnalysis);
          setIntelligentDiff(state.intelligentDiff);
          if(state.context) {
             setDocPerspective(state.context.documentPerspective);
             setIntendedRecipient(state.context.intendedRecipient);
             setReportStyle(state.context.reportStyle);
             setFocusArea(state.context.focusArea || '');
             setGeneralContext(state.context.generalContext || '');
          }
          setStatus('DONE');
        })
        .catch(err => {
          setErrorMsg("Failed to load session file. " + err.message);
        });
    }
  };

  const getSummaryStats = () => {
    if (status !== 'DONE') return null;
    let accepted = 0, addressed = 0, notActioned = 0, irrelevant = 0;
    
    analysisResults.forEach((v) => {
      if (v.status === AnalysisStatus.ACCEPTED) accepted++;
      else if (v.status === AnalysisStatus.ADDRESSED) addressed++;
      else if (v.status === AnalysisStatus.NOT_ACTIONED) notActioned++;
      else if (v.status === AnalysisStatus.NO_LONGER_RELEVANT) irrelevant++;
    });

    return { accepted, addressed, notActioned, irrelevant, total: analysisResults.size };
  };

  const stats = getSummaryStats();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Activity size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">DocDiff AI</h1>
          </div>
          <div className="flex items-center gap-2">
             {status === 'DONE' && (
               <>
                 <button 
                  type="button"
                  onClick={handleResetClick}
                  className="flex items-center gap-2 bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
                  title="Start New Analysis"
                 >
                   <RotateCcw size={16} /> <span className="hidden sm:inline">New</span>
                 </button>

                 <button 
                  type="button"
                  onClick={handleSaveSession}
                  className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  title="Save Session JSON"
                 >
                   <Save size={16} /> <span className="hidden sm:inline">Save Session</span>
                 </button>
                 
                 <button 
                  type="button"
                  onClick={handleExportHtml}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                 >
                   <Download size={16} /> Export Report
                 </button>
               </>
             )}
             
             {/* Load Session Button (Always visible mostly) */}
             {status !== 'DONE' && (
                 <div className="relative">
                    <input type="file" accept=".json" onChange={handleLoadSession} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button type="button" className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                      <Upload size={16} /> <span className="hidden sm:inline">Load Session</span>
                    </button>
                 </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Intro / Upload Section */}
        {status !== 'DONE' && (
          <section className="mb-12">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Smart Document Review</h2>
              <p className="text-slate-600 text-lg">
                Compare tracked changes, comments, and contributor feedback documents instantly using AI.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <FileUploader key={`uploader-old-${resetKey}`} label="1. Previous Version (Tracked)" file={oldFile} onFileSelect={setOldFile} accept=".docx" />
              <FileUploader key={`uploader-new-${resetKey}`} label="2. New Version (Clean)" file={newFile} onFileSelect={setNewFile} accept=".docx" />
              <FileUploader key={`uploader-resp-${resetKey}`} label="3. Response Doc (Optional)" file={responseFile} onFileSelect={setResponseFile} accept=".docx,.csv,.xlsx,.xls" />
              <FileUploader key={`uploader-stake-${resetKey}`} label="4. Priorities (Optional)" file={stakeholderFile} onFileSelect={setStakeholderFile} accept=".docx,.csv,.xlsx,.xls" />
            </div>

            {/* AI Context Settings */}
            <div className="max-w-3xl mx-auto mt-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                 <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-100 pb-2">
                     <Settings2 size={18} className="text-blue-500" />
                     <h3>Context for AI Analysis</h3>
                 </div>
                 <div className="grid md:grid-cols-2 gap-4">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Document Perspective (e.g. Vendor)</label>
                         <input 
                           type="text" 
                           className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                           placeholder="Who is submitting this? (e.g. Vendor)"
                           value={docPerspective}
                           onChange={(e) => setDocPerspective(e.target.value)}
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Intended Recipient (e.g. Legal)</label>
                         <input 
                           type="text" 
                           className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                           placeholder="Who will read the report? (e.g. Legal)"
                           value={intendedRecipient}
                           onChange={(e) => setIntendedRecipient(e.target.value)}
                         />
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">What to focus on</label>
                         <input 
                           type="text" 
                           className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                           placeholder="Please specify either All or specific area(s) (e.g. Liability Caps, Indemnity)"
                           value={focusArea}
                           onChange={(e) => setFocusArea(e.target.value)}
                         />
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">General Background / Context</label>
                         <textarea 
                           className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-20 resize-none" 
                           placeholder="Provide any general context for the AI (e.g. 'This is a renewal agreement for an existing client', 'We are pushing back on IP rights')."
                           value={generalContext}
                           onChange={(e) => setGeneralContext(e.target.value)}
                         />
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Report Style</label>
                         <div className="flex gap-4">
                             {(['High Level', 'Balanced', 'Technical'] as const).map(style => (
                                 <label key={style} className="flex items-center gap-2 cursor-pointer">
                                     <input 
                                       type="radio" 
                                       name="reportStyle" 
                                       value={style} 
                                       checked={reportStyle === style}
                                       onChange={() => setReportStyle(style)}
                                       className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                     />
                                     <span className="text-sm text-slate-700">{style}</span>
                                 </label>
                             ))}
                         </div>
                     </div>
                 </div>
            </div>

            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!oldFile || !newFile || status === 'PARSING' || status === 'ANALYZING'}
                className={`
                  px-8 py-4 rounded-full font-semibold text-lg flex items-center gap-3 transition-all transform hover:scale-105 shadow-lg
                  ${(!oldFile || !newFile) 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                  }
                `}
              >
                {status === 'PARSING' || status === 'ANALYZING' ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span className="flex flex-col items-start text-sm">
                       <span>{status === 'PARSING' ? 'Processing...' : 'AI Analyzing...'}</span>
                       {progressMsg && <span className="text-xs font-normal opacity-80">{progressMsg}</span>}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCheck />
                    Start Analysis
                  </>
                )}
              </button>
            </div>
            
            {errorMsg && (
              <div className="mt-6 mx-auto max-w-lg flex flex-col items-center gap-4">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 w-full">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm">{errorMsg}</p>
                  </div>
                  
                  {status === 'ERROR' && (
                      <button 
                        type="button"
                        onClick={handleResetClick}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
                      >
                          <RefreshCw size={16} />
                          Reset & Start Over
                      </button>
                  )}
              </div>
            )}
          </section>
        )}

        {/* Results Section */}
        {(status === 'DONE' && extractedItems.length > 0) && (
          <section className="animate-fade-in-up">
            
            {/* Top Toolbar */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 gap-6">
              
              <div className="flex items-center gap-4 flex-wrap">
                {/* View Switcher */}
                <div className="bg-slate-200 p-1 rounded-lg flex items-center">
                  <button onClick={() => setViewMode('GRID')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <LayoutGrid size={16} /> Grid
                  </button>
                  <button onClick={() => setViewMode('TIMELINE')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'TIMELINE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Clock size={16} /> Timeline
                  </button>
                  <button onClick={() => setViewMode('DOCUMENT')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'DOCUMENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <BookOpen size={16} /> Document
                  </button>
                  {intelligentDiff && (
                    <button onClick={() => setViewMode('DIFF')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'DIFF' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Scale size={16} /> Intelligent Diff
                    </button>
                  )}
                  {commentaryAnalysis && (
                    <button onClick={() => setViewMode('COMMENTARY')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'COMMENTARY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <MessageSquare size={16} /> Insights
                    </button>
                  )}
                </div>
              </div>

              {/* Filters & Search */}
              {viewMode !== 'COMMENTARY' && viewMode !== 'DIFF' && (
                <div className="flex flex-wrap items-center gap-2">
                   {/* Search Input */}
                   <div className="relative group mr-2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={14} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search changes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-8 py-1.5 text-sm rounded-full border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-40 sm:w-64 transition-all"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                   </div>
                   {/* Filters... */}
                   <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
                   <div className="flex items-center gap-2 text-slate-400 mr-2">
                      <Filter size={16} />
                      <span className="text-sm font-medium hidden sm:inline">Filter:</span>
                   </div>
                   {/* ... Filter buttons ... */}
                   {[
                     { s: AnalysisStatus.ACCEPTED, label: 'Accepted', color: 'text-emerald-700 bg-emerald-100 border-emerald-200' },
                     { s: AnalysisStatus.ADDRESSED, label: 'Addressed', color: 'text-blue-700 bg-blue-100 border-blue-200' },
                     { s: AnalysisStatus.NOT_ACTIONED, label: 'Not Actioned', color: 'text-rose-700 bg-rose-100 border-rose-200' },
                     { s: AnalysisStatus.NO_LONGER_RELEVANT, label: 'Irrelevant', color: 'text-slate-600 bg-slate-100 border-slate-200' }
                   ].map(f => (
                     <button
                       key={f.s}
                       onClick={() => toggleFilter(f.s)}
                       className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                         filters.has(f.s) 
                           ? f.color + ' ring-2 ring-offset-1 ring-current'
                           : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                       }`}
                     >
                       {f.label}
                     </button>
                   ))}
                   {filters.size > 0 && (
                     <button onClick={() => setFilters(new Set())} className="ml-2 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                       <X size={12} /> Clear
                     </button>
                   )}
                </div>
              )}
            </div>

            {/* Stats Summary */}
            {stats && viewMode !== 'COMMENTARY' && viewMode !== 'DIFF' && (
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-emerald-700">{stats.accepted}</div>
                    <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Accepted Changes</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-blue-700">{stats.addressed}</div>
                    <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Addressed Comments</div>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-rose-700">{stats.notActioned}</div>
                    <div className="text-xs text-rose-600 font-medium uppercase tracking-wide">Not Actioned</div>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-slate-700">{stats.irrelevant}</div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">No Longer Relevant</div>
                  </div>
               </div>
            )}

            {/* Main Content Area */}
            {viewMode === 'GRID' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedGridItems.map((item) => (
                  <ChangeCard 
                    key={item.id} 
                    item={item} 
                    result={analysisResults.get(item.id)} 
                    onUpdateNote={handleUpdateNote}
                    onAskAi={handleAskAi}
                  />
                ))}
                {sortedGridItems.length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-400">
                    No items match the selected filters or search query.
                  </div>
                )}
              </div>
            )}

            {viewMode === 'TIMELINE' && (
              <TimelineView 
                items={filteredItems} 
                results={analysisResults} 
                onUpdateNote={handleUpdateNote}
              />
            )}

            {viewMode === 'DOCUMENT' && (
               <DocumentView 
                 fullText={newDocText} 
                 items={filteredItems} 
                 results={analysisResults} 
                 onUpdateNote={handleUpdateNote}
               />
            )}
            
            {viewMode === 'DIFF' && intelligentDiff && (
               <IntelligentDiffView 
                 diff={intelligentDiff} 
                 onUpdate={handleUpdateIntelligentDiff}
                 onRefine={handleRefineDiff}
                 isRefining={isRefining}
               />
            )}

            {viewMode === 'COMMENTARY' && commentaryAnalysis && (
              <CommentaryAnalysisView 
                 analysis={commentaryAnalysis} 
                 onUpdate={handleUpdateCommentary}
              />
            )}

          </section>
        )}

      </main>

      {/* CUSTOM RESET CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200" onClick={() => setShowResetModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Start New Analysis?</h3>
                    <p className="text-sm text-slate-500">
                        This will clear all current data and unsaved progress. Are you sure you want to continue?
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowResetModal(false)}
                        className="flex-1 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={performReset}
                        className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                    >
                        Start New
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;