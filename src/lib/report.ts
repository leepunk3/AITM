import type { ReviewResult, RiskLevel } from "./types";

export const riskLabelMap: Record<RiskLevel, string> = {
  HIGH: "고위험",
  MEDIUM: "중위험",
  LOW: "낮은 위험",
  REVIEW_NEEDED: "추가 검토 필요",
};

export const riskBadgeClass = (risk: RiskLevel) => {
  switch (risk) {
    case "HIGH":
      return "bg-red-50 text-red-700 border-red-200";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "LOW":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "REVIEW_NEEDED":
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export function formatGroundTitle(article: string, title: string) {
  return `${article} ${title}`;
}

export function buildExpertReportMarkdown(result: ReviewResult) {
  return `# 상표 절대적 부등록사유 검토 리포트

## 1. 종합 의견
- 종합 위험도: ${riskLabelMap[result.summary.overallRisk]}
- 최종 의견: ${result.summary.finalOpinion}
- 권장 조치: ${result.summary.recommendedAction}

## 2. 표장 분석
- 원표장: ${result.markAnalysis.originalMark}
- 정규화 표장: ${result.markAnalysis.normalizedMark}
- 언어: ${result.markAnalysis.detectedLanguage.join(", ")}
- 구조: ${result.markAnalysis.structure}
- 의미 메모: ${result.markAnalysis.semanticNotes.join(" / ")}

## 3. 물품·서비스 분석
- 입력 물품/서비스: ${result.goodsAnalysis.inputGoodsServices}
- 추정 카테고리: ${result.goodsAnalysis.categoryGuess.join(", ")}
- 성질요소: ${result.goodsAnalysis.descriptiveElements.join(", ")}

## 4. 조문별 검토
${result.grounds
  .map(
    (g, i) =>
      `### ${i + 1}. ${g.article} ${g.title}\n- 위험도: ${riskLabelMap[g.risk]}\n- 결론: ${g.conclusion}\n- 이유: ${g.reason}`,
  )
  .join("\n\n")}

## 5. 실무 검토 의견
${result.reportBody.executiveSummary}

${result.reportBody.legalAssessment}

${result.reportBody.practicalComment}

${result.reportBody.filingStrategy}
`;
}
