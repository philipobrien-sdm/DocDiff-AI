import { AppState, TrackedItem, AnalysisResult, CommentaryAnalysis, IntelligentDiffAnalysis, AnalysisContext } from "../types";

const STORAGE_KEY = "docdiff_autosave_v1";

export const clearLocalStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear local storage", e);
  }
};

export const saveToLocalStorage = (
  oldDocText: string,
  newDocText: string,
  stakeholderDocText: string | undefined,
  extractedItems: TrackedItem[],
  analysisResults: Map<string, AnalysisResult>,
  commentaryAnalysis: CommentaryAnalysis | null,
  intelligentDiff: IntelligentDiffAnalysis | null,
  context?: AnalysisContext
) => {
  try {
    const state: AppState = {
      oldDocText,
      newDocText,
      stakeholderDocText,
      extractedItems,
      analysisResults: Array.from(analysisResults.entries()), // Convert Map to Array for JSON
      commentaryAnalysis,
      intelligentDiff,
      lastUpdated: Date.now(),
      context
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save to local storage", e);
  }
};

export const loadFromLocalStorage = (): AppState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch (e) {
    console.error("Failed to load from local storage", e);
    return null;
  }
};

export const exportSessionJson = (
  oldDocText: string,
  newDocText: string,
  stakeholderDocText: string | undefined,
  extractedItems: TrackedItem[],
  analysisResults: Map<string, AnalysisResult>,
  commentaryAnalysis: CommentaryAnalysis | null,
  intelligentDiff: IntelligentDiffAnalysis | null,
  context?: AnalysisContext
) => {
  const state: AppState = {
    oldDocText,
    newDocText,
    stakeholderDocText,
    extractedItems,
    analysisResults: Array.from(analysisResults.entries()),
    commentaryAnalysis,
    intelligentDiff,
    lastUpdated: Date.now(),
    context
  };
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `docdiff-session-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importSessionJson = async (file: File): Promise<AppState> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const state = JSON.parse(json) as AppState;
        // Basic validation
        if (!state.extractedItems || !state.analysisResults) {
          throw new Error("Invalid session file format");
        }
        resolve(state);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};