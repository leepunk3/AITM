export type RiskLevel = "HIGH" | "MEDIUM" | "LOW" | "REVIEW_NEEDED";

export interface ReviewInput {
  markText: string;
  goodsServices: string;
  notes?: string;
  reviewer?: string;
}

export interface GroundItem {
  article: string;
  title: string;
  risk: RiskLevel;
  conclusion: string;
  reason: string;
}

export interface ReviewResult {
  summary: {
    overallRisk: RiskLevel;
    finalOpinion: string;
    keyIssues: string[];
    recommendedAction: string;
  };
  markAnalysis: {
    originalMark: string;
    normalizedMark: string;
    detectedLanguage: string[];
    structure: string;
    semanticNotes: string[];
  };
  goodsAnalysis: {
    inputGoodsServices: string;
    categoryGuess: string[];
    descriptiveElements: string[];
  };
  grounds: GroundItem[];
  reportBody: {
    executiveSummary: string;
    legalAssessment: string;
    practicalComment: string;
    filingStrategy: string;
  };
}

export interface SavedReviewRow {
  id: string;
  createdAt: string;
  reviewer: string;
  markText: string;
  goodsServices: string;
  overallRisk: RiskLevel;
  finalOpinion: string;
}
