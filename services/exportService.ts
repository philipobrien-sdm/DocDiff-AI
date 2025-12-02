import { TrackedItem, AnalysisResult, AnalysisStatus, CommentaryAnalysis, IntelligentDiffAnalysis } from "../types";

export const generateHtmlReport = (
  oldFileName: string,
  newFileName: string,
  oldText: string,
  newText: string,
  items: TrackedItem[],
  results: Map<string, AnalysisResult>,
  commentary: CommentaryAnalysis | null,
  intelligentDiff: IntelligentDiffAnalysis | null
) => {
  const data = {
    items: items.map(i => ({
      ...i,
      result: results.get(i.id)
    })),
    oldText,
    newText,
    commentary,
    intelligentDiff
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DocDiff AI Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
        .accordion-content { transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out; max-height: 0; opacity: 0; overflow: hidden; }
        .accordion-content.open { max-height: 20000px; opacity: 1; }
    </style>
</head>
<body class="p-8 max-w-7xl mx-auto">
    <header class="mb-8 border-b border-slate-200 pb-6">
        <div class="flex justify-between items-start mb-4">
            <div>
                <h1 class="text-3xl font-bold text-slate-900">DocDiff AI Analysis Report</h1>
                <p class="text-slate-500 mt-1">Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="text-sm font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">DocDiff AI v1.0</div>
        </div>
        <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-900 text-sm leading-relaxed">
            <strong>Report Overview:</strong> This document contains a comprehensive AI analysis of the changes between the provided file versions (${oldFileName} vs ${newFileName}). It includes a strategic summary of shifts in the document's purpose and a prioritized grid of specific tracked changes.
        </div>
    </header>

    <!-- ACCORDION WRAPPER -->
    <div class="space-y-4">

        <!-- 1. INTELLIGENT DIFF (STRATEGIC ANALYSIS) -->
        ${intelligentDiff ? `
        <div class="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
            <button onclick="toggleAccordion('int-diff')" class="w-full px-6 py-4 text-left font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 flex justify-between items-center transition-colors">
                <span class="flex items-center gap-2">
                    <span class="bg-purple-100 text-purple-600 p-1 rounded">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
                    </span>
                    1. Intelligent Diff & Strategic Analysis
                </span>
                <span id="icon-int-diff" class="transform transition-transform text-slate-400 rotate-180">▼</span>
            </button>
            <div id="acc-int-diff" class="accordion-content open">
                <div class="p-6 space-y-6">
                    <!-- Exec Summary & Risk -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2 bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <h3 class="text-lg font-bold text-slate-800 mb-3">Executive Summary</h3>
                            <p class="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">${intelligentDiff.summary}</p>
                        </div>
                        <div class="bg-white rounded-xl p-6 border border-slate-200 flex flex-col justify-center shadow-sm">
                             <h3 class="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <span class="text-orange-500">⚠</span> Risk Profile Shift
                             </h3>
                             <p class="text-slate-700 font-medium whitespace-pre-wrap">${intelligentDiff.riskProfile}</p>
                        </div>
                    </div>

                    <!-- Strategic Shifts -->
                    <div class="bg-gradient-to-r from-slate-50 to-white rounded-xl p-6 border border-slate-200">
                         <h3 class="text-lg font-bold text-slate-800 mb-3">Strategic Direction</h3>
                         <p class="text-slate-600 leading-relaxed italic border-l-4 border-purple-200 pl-4 text-sm whitespace-pre-wrap">
                            ${intelligentDiff.strategicShifts}
                         </p>
                    </div>

                    <!-- Stakeholder Analysis -->
                    ${intelligentDiff.stakeholderPriorities && intelligentDiff.stakeholderPriorities.length > 0 ? `
                        <div class="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                            <div class="p-6 bg-indigo-50/50 border-b border-indigo-100">
                                <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                    Implied Stakeholder Priorities Analysis
                                </h3>
                                <p class="text-sm text-slate-500 mt-1">Breakdown of key stakeholder concerns and predicted demands.</p>
                            </div>
                            <div class="divide-y divide-slate-100">
                                ${intelligentDiff.stakeholderPriorities.map(c => `
                                    <div class="p-6">
                                        <h4 class="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                                            <span class="bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm border border-slate-200">${c.stakeholder}</span>
                                        </h4>
                                        <div class="grid md:grid-cols-3 gap-6">
                                            <div>
                                                <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Primary Concerns & Evidence</div>
                                                <p class="text-sm text-slate-700 whitespace-pre-wrap">${c.primaryConcerns}</p>
                                            </div>
                                            <div>
                                                <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-500 mb-2">Outcome</div>
                                                <p class="text-sm text-slate-700 whitespace-pre-wrap">${c.outcomeSummary}</p>
                                            </div>
                                            <div>
                                                <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-500 mb-2">Next Version Wants</div>
                                                <p class="text-sm text-slate-700 italic whitespace-pre-wrap">${c.projectedWants}</p>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Outstanding Risks & Remediation -->
                    ${intelligentDiff.outstandingIssues && intelligentDiff.outstandingIssues.length > 0 ? `
                        <div class="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                           <div class="p-6 bg-red-50/50 border-b border-red-100">
                               <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                                 <span class="text-red-500">⚠</span>
                                 Outstanding Risks & Concerns
                               </h3>
                               <p class="text-sm text-slate-500 mt-1">Based on unresolved comments and contentious changes.</p>
                           </div>
                           <div class="divide-y divide-slate-100">
                               ${intelligentDiff.outstandingIssues.map(issue => `
                                   <div class="p-6 hover:bg-slate-50 transition-colors">
                                       <div class="flex items-start justify-between mb-2">
                                           <h4 class="font-bold text-slate-900 text-sm flex-1 mr-4">${issue.issue}</h4>
                                           <span class="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide border 
                                            ${issue.severity.toLowerCase() === 'high' ? 'bg-red-100 text-red-700 border-red-200' : 
                                              (issue.severity.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                              'bg-blue-100 text-blue-700 border-blue-200')}">
                                               ${issue.severity}
                                           </span>
                                       </div>
                                       <div class="mt-3 bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-600">
                                           <strong class="block text-slate-800 text-xs uppercase tracking-wide mb-1">Recommended Action</strong>
                                           ${issue.remediation}
                                       </div>
                                   </div>
                               `).join('')}
                           </div>
                        </div>
                    ` : ''}

                    <!-- Key Changes Grid -->
                    <div>
                        <h3 class="text-lg font-bold text-slate-800 mb-4">Key Provisions & Impact</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${intelligentDiff.keyChanges.map(change => `
                                <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                                    <h4 class="font-bold text-slate-900 mb-2 text-sm">${change.title}</h4>
                                    <div class="mb-3 text-xs text-slate-600">
                                        <span class="font-semibold text-[10px] uppercase tracking-wide text-slate-400 block mb-1">Change</span>
                                        ${change.description}
                                    </div>
                                    <div class="pt-3 border-t border-slate-50 text-xs text-slate-600 bg-slate-50/50 -mx-5 -mb-5 p-5 rounded-b-xl">
                                        <span class="font-semibold text-[10px] uppercase tracking-wide text-blue-500 block mb-1">Impact</span>
                                        ${change.impact}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- 2. GRID VIEW -->
        <div class="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
            <button onclick="toggleAccordion('grid')" class="w-full px-6 py-4 text-left font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 flex justify-between items-center transition-colors">
                <span class="flex items-center gap-2">
                    <span class="bg-blue-100 text-blue-600 p-1 rounded">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                    </span>
                    2. Prioritized Analysis Grid
                </span>
                <span id="icon-grid" class="transform transition-transform text-slate-400 rotate-180">▼</span>
            </button>
            <div id="acc-grid" class="accordion-content open">
                <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="grid-container">
                    <!-- JS Injected -->
                </div>
            </div>
        </div>

    </div>

    <script>
        // DATA
        const REPORT_DATA = ${JSON.stringify(data)};
        
        // ACCORDION LOGIC
        function toggleAccordion(id) {
            const content = document.getElementById('acc-' + id);
            const icon = document.getElementById('icon-' + id);
            
            if (content.classList.contains('open')) {
                content.classList.remove('open');
                icon.style.transform = 'rotate(0deg)';
            } else {
                content.classList.add('open');
                icon.style.transform = 'rotate(180deg)';
            }
        }

        // RENDER HELPERS
        const getStatusColor = (status) => {
             if(status === 'ACCEPTED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
             if(status === 'ADDRESSED') return 'bg-blue-100 text-blue-700 border-blue-200';
             if(status === 'NOT_ACTIONED') return 'bg-rose-100 text-rose-700 border-rose-200';
             return 'bg-slate-100 text-slate-600 border-slate-200';
        };

        const renderCard = (item) => {
            const status = item.result ? item.result.status : 'UNKNOWN';
            const explanation = item.result ? item.result.explanation : '';
            const userNotes = item.result ? item.result.userNotes : null;
            const section = item.sectionContext || '';
            const scoring = item.result ? item.result.scoring : null;

            // Render Score Bar Helper
            const renderScoreBar = (label, score) => {
                let color = 'bg-slate-300';
                if(score >= 4) color = 'bg-emerald-400';
                else if(score >= 3) color = 'bg-blue-400';
                
                return \`
                  <div class="flex flex-col gap-0.5">
                      <div class="flex justify-between items-end">
                          <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">\${label}</span>
                          <span class="text-[9px] text-slate-600 font-bold">\${score}/5</span>
                      </div>
                      <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div class="h-full rounded-full \${color}" style="width: \${(score / 5) * 100}%"></div>
                      </div>
                  </div>
                \`;
            };

            const getImplicationColor = (imp) => {
              if(imp === 'Significant Change') return 'bg-purple-100 text-purple-700 border-purple-200';
              if(imp === 'Change') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
              if(imp === 'Editorial') return 'bg-slate-100 text-slate-700 border-slate-200';
              return 'bg-slate-50 text-slate-500 border-slate-200';
            };

            // Layout matching app
            return \`
            <div class="bg-white rounded border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                \${section ? '<div class="flex items-center gap-1.5 text-slate-400 mb-2"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg><span class="text-[10px] font-bold uppercase tracking-wider truncate">' + section + '</span></div>' : ''}

                <div class="flex justify-between mb-3">
                    <div class="flex items-center gap-2">
                         <span class="text-xs font-bold uppercase tracking-wide text-slate-500">\${item.type}</span>
                    </div>
                    <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border \${getStatusColor(status)}">\${status}</span>
                </div>

                <div class="bg-slate-50 rounded p-2 border border-slate-100 mb-3">
                   <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tracked Content</div>
                   <div class="text-sm font-medium text-slate-900 break-words font-serif">
                      \${item.type === 'DELETION' ? '<span class="line-through text-slate-400">' + item.text + '</span>' : item.text}
                      \${item.commentContent ? '<div class="italic text-slate-700">"' + item.commentContent + '"</div>' : ''}
                   </div>
                </div>

                <div class="text-xs text-slate-500 mb-3">
                   <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Context</div>
                   <div class="pl-2 border-l-2 border-slate-200 italic line-clamp-3">
                      "\${item.context}"
                   </div>
                </div>

                \${scoring ? \`
                  <div class="mt-3 pt-3 border-t border-slate-100">
                     <div class="flex items-center justify-between mb-2">
                         <div class="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Impact Analysis
                         </div>
                         <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border \${getImplicationColor(scoring.implication)}">
                             \${scoring.implication}
                         </span>
                     </div>
                     <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                         \${renderScoreBar("Alignment", scoring.alignment)}
                         \${renderScoreBar("Feasibility", scoring.feasibility)}
                         \${renderScoreBar("Future Accept.", scoring.futureAcceptance)}
                         \${renderScoreBar("Author Accept.", scoring.authorAcceptability)}
                     </div>
                  </div>
                \` : ''}

                \${explanation ? '<div class="pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed"><strong class="block mb-1 text-slate-400">AI Analysis:</strong>' + explanation + '</div>' : ''}
                \${userNotes ? 
                    '<div class="mt-3 pt-2 border-t border-amber-100 bg-amber-50 rounded p-2 text-sm italic text-slate-800"><span class="font-bold text-xs text-amber-700 uppercase mr-1">User Note:</span>' + userNotes + '</div>' 
                    : ''
                }
            </div>
            \`;
        };

        // INIT GRID
        const gridContainer = document.getElementById('grid-container');
        REPORT_DATA.items.forEach(item => {
            gridContainer.innerHTML += renderCard(item);
        });

    </script>
</body>
</html>
`;
  return html;
};