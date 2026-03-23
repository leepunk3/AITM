import type { ReviewInput, ReviewResult, SavedReviewRow } from "./types";

// Gemini API call logic moved to frontend as per guidelines
export async function requestTrademarkReview(input: ReviewInput): Promise<ReviewResult> {
  const response = await fetch("/api/review-trademark", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  
  const prompt = `
당신은 대한민국 상표법 전문 변리사입니다. 
다음 상표와 지정상품에 대해 '절대적 부등록사유(상표법 제33조)'를 중심으로 심층 검토 리포트를 작성해주세요.

[검토 대상]
- 상표명: ${input.markText}
- 지정상품/서비스: ${input.goodsServices}
${input.notes ? `- 추가 참고사항: ${input.notes}` : ""}

[출력 형식]
반드시 다음 구조의 JSON 형식으로만 답변하세요.

{
  "summary": {
    "overallRisk": "HIGH" | "MEDIUM" | "LOW" | "REVIEW_NEEDED",
    "finalOpinion": "한 줄 요약 의견",
    "keyIssues": ["주요 쟁점 1", "주요 쟁점 2"],
    "recommendedAction": "권장 조치 (예: 출원 강행, 표장 수정, 불사용 취소심판 검토 등)"
  },
  "markAnalysis": {
    "originalMark": "${input.markText}",
    "normalizedMark": "정규화된 표장",
    "detectedLanguage": ["언어1", "언어2"],
    "structure": "표장의 구성 구조 설명",
    "semanticNotes": ["의미 분석 1", "의미 분석 2"]
  },
  "goodsAnalysis": {
    "inputGoodsServices": "${input.goodsServices}",
    "categoryGuess": ["추정 카테고리"],
    "descriptiveElements": ["상품 성질 표시 요소"]
  },
  "grounds": [
    {
      "article": "제33조 제1항 제n호",
      "title": "조문 제목",
      "risk": "HIGH" | "MEDIUM" | "LOW" | "REVIEW_NEEDED",
      "conclusion": "해당 여부 결론",
      "reason": "상세 검토 이유"
    }
  ],
  "reportBody": {
    "executiveSummary": "전문가 요약",
    "legalAssessment": "법적 판단 상세",
    "practicalComment": "실무적 조언",
    "filingStrategy": "출원 전략"
  }
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-latest",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("AI 응답이 비어있습니다.");
  
  return JSON.parse(text);
}

export async function saveTrademarkReview(payload: {
  input: ReviewInput;
  result: ReviewResult;
  expertReport: string;
}) {
  const response = await fetch("/api/save-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "시트 저장 중 오류가 발생했습니다.");
  }

  return response.json();
}

export async function listSavedReviews(): Promise<SavedReviewRow[]> {
  const response = await fetch("/api/list-reviews");

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "검토 목록 불러오기 중 오류가 발생했습니다.");
  }

  return response.json();
}
