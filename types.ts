export enum ChangeType {
  INSERTION = 'INSERTION',
  DELETION = 'DELETION',
  COMMENT = 'COMMENT'
}

export enum AnalysisStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED', // Insertion present or Deletion absent
  ADDRESSED = 'ADDRESSED', // Comment feedback taken
  NOT_ACTIONED = 'NOT_ACTIONED', // Change rejected or Comment ignored
  NO_LONGER_RELEVANT = 'NO_LONGER_RELEVANT', // Context is gone completely
  UNKNOWN = 'UNKNOWN'
}

export interface ScoringAnalysis {
  implication: 'Clarification' | 'Editorial' | 'Change' | 'Significant Change';
  alignment: number; // 1-5
  feasibility: number; // 1-5
  futureAcceptance: number; // 1-5
  authorAcceptability: number; // 1-5
}

export interface TrackedItem {
  id: string;
  type: ChangeType;
  text: string; // The text being inserted/deleted, or the selected text for a comment
  context: string; // Surrounding text to help AI locate it
  sectionContext?: string; // The chapter/heading this item belongs to
  commentContent?: string; // The actual comment text if type is COMMENT
  author?: string;
  date?: string;
  paragraphIndex?: number; // Approximate location
}

export interface AnalysisResult {
  itemId: string;
  status: AnalysisStatus;
  explanation: string;
  confidence: number;
  scoring?: ScoringAnalysis;
  userNotes?: string; // User added manual note
}

export interface CommentaryAnalysis {
  successPatterns: string;
  toneAnalysis: string;
  contributorInsights: string;
  otherInsights: string;
}

export interface OutstandingIssue {
  issue: string;
  severity: 'High' | 'Medium' | 'Low';
  remediation: string;
}

export interface StakeholderPriority {
  stakeholder: string; // Name of the author/stakeholder
  primaryConcerns: string;
  outcomeSummary: string; // How their concerns were addressed/ignored
  projectedWants: string; // What they might want in the next version
}

export interface IntelligentDiffAnalysis {
  summary: string;
  keyChanges: { title: string; description: string; impact: string }[];
  strategicShifts: string;
  riskProfile: string;
  outstandingIssues: OutstandingIssue[];
  stakeholderPriorities: StakeholderPriority[];
}

export type DiffSection = 'summary' | 'riskProfile' | 'strategicShifts' | 'keyChanges' | 'outstandingIssues' | 'stakeholderPriorities' | 'ALL';

export interface AnalysisContext {
  documentPerspective: string;
  intendedRecipient: string;
  reportStyle: 'High Level' | 'Technical' | 'Balanced';
  focusArea: string;
  generalContext: string;
  stakeholderPriorities?: string;
}

export interface DocxData {
  fullText: string;
  items: TrackedItem[];
}

export interface AppState {
  oldDocText: string;
  newDocText: string;
  stakeholderDocText?: string;
  extractedItems: TrackedItem[];
  analysisResults: [string, AnalysisResult][]; // Array of entries for JSON serialization
  commentaryAnalysis: CommentaryAnalysis | null;
  intelligentDiff: IntelligentDiffAnalysis | null;
  lastUpdated: number;
  context?: AnalysisContext;
}