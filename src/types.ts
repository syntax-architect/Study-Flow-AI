export type TabType = 'hub' | 'chat' | 'vault' | 'analytics' | 'review' | 'intervention' | 'study-room';

export interface ChatMessage {
  id: string;
  chat_id?: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  is_pinned?: boolean;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  is_pinned?: boolean;
}

export interface TopicMastery {
  id: string;
  unit: string;
  title: string;
  subtitle: string;
  status: 'VERIFIED' | 'FLAGGED' | 'PENDING';
  auditDetails: string;
  masteryScore: number;
}

export interface SolverStep {
  stepNumber: number;
  title: string;
  description: string;
  verified: boolean;
  mathBlock?: string;
  criticFeedback?: string; // Critic AI line-by-line commentary
}

export interface Citation {
  textbook: string;
  chapter: string;
  notes: string;
  ncertPage?: string;
}

export interface DualAiPipelineLog {
  solverDraftSummary: string;
  criticVerificationPassed: boolean;
  ncertSourceMatch: string;
  criticWarnings?: string[];
}

export interface StepVerdict {
  stepNumber: number;
  verified: boolean;
  criticFeedback?: string;
}

export interface SolverResult {
  id: string;
  query: string;
  subject: string;
  title: string;
  summary: string;
  steps: SolverStep[];
  finalEquation: string;
  citation: Citation;
  timestamp: string;
  criticAuditStatus: 'VERIFIED' | 'FLAGGED';
  criticAuditNotes?: string;
  confidenceScore?: number;
  stepVerdicts?: StepVerdict[];
  pipelineLog?: DualAiPipelineLog;
  isOutOfScope?: boolean;
  studentMastery?: boolean;
  suggestedFollowUps?: string[];
  explanationComplexity?: 'ELI5' | 'Standard' | 'Advanced';
  intervention?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface VaultProblem {
  id: string;
  problemNumber: string;
  category: string;
  title: string;
  question: string;
  reference: {
    textbook: string;
    chapter: string;
    page: string;
  };
  factCheck?: string;
  solution: SolverResult;
  params: {
    mass: number;
    velocity: number;
    radius: number;
    mu: number;
  };
}

export interface CohortMetric {
  cohortId: string;
  meanScore: number;
  variance: number;
  participation: number;
}

export interface UnitOverview {
  id: string;
  name: string;
  course: string;
  overallMastery: number;
  masteryDelta: number;
  totalTimeHours: number;
  totalTimeMinutes: number;
  questionsCompleted: number;
  questionsTotal: number;
  topics: TopicMastery[];
}

export interface FlaggedTopic {
  topicId: string;
  title: string;
  flaggedCount: number;
  verifiedCount: number;
}

export interface FlaggedStudent {
  userId: string;
  name: string;
  riskScore: number;
  failedTopics: FlaggedTopic[];
}

export interface StudyRoomMessage {
  id: string;
  user_id: string;
  name: string;
  content: string;
  timestamp: string;
  isAI?: boolean;
}
