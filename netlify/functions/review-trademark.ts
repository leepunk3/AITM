import type { Handler } from "@netlify/functions";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function buildPrompt(markText: string, goodsServices: string, notes?: string) {
  return `너는 한국 상표법상 절대적 부등록사유를 예비 검토하는 상표 심사 보조 엔진이다.

입력값:
- 상표명: ${markText}
- 물품/서비스: ${goodsServices}
- 검토 메모: ${notes || "없음"}

반드시 아래 JSON 형식으로만 답하라.
절대로 설명문, 코드블록, 마크다운을 덧붙이지 마라.

{
  "summary": {
    "overallRisk": "HIGH",
    "finalOpinion": "string",
    "keyIssues": ["string"],
    "recommendedAction": "string"
  },
  "markAnalysis": {
    "originalMark": "string",
    "normalizedMark": "string",
    "detectedLanguage": ["string"],
    "structure": "string",
    "semanticNotes": ["string"]
  },
  "goodsAnalysis": {
    "inputGoodsServices": "string",
    "categoryGuess": ["string"],
    "descriptiveElements": ["string"]
  },
  "grounds": [
    {
      "article": "string",
      "title": "string",
      "risk": "HIGH",
      "conclusion": "string",
      "reason": "string"
    }
  ],
  "reportBody": {
    "executiveSummary": "string",
    "legalAssessment": "string",
    "practicalComment": "string",
    "filingStrategy": "string"
  }
}

risk 값은 반드시 HIGH, MEDIUM, LOW, REVIEW_NEEDED 중 하나만 사용하라.`;
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
    }
    return JSON.parse(match[0]);
  }
}

function normalizeReviewResult(raw: any, markText: string, goodsServices: string) {
  return {
    summary: {
      overallRisk: raw?.summary?.overallRisk || "REVIEW_NEEDED",
      finalOpinion: raw?.summary?.finalOpinion || "검토 결과를 요약하지 못했습니다.",
      keyIssues: Array.isArray(raw?.summary?.keyIssues) ? raw.summary.keyIssues : [],
      recommendedAction: raw?.summary?.recommendedAction || "변리사 검토 후 출원 전략을 재정리하세요.",
    },
    markAnalysis: {
      originalMark: raw?.markAnalysis?.originalMark || markText,
      normalizedMark: raw?.markAnalysis?.normalizedMark || markText,
      detectedLanguage: Array.isArray(raw?.markAnalysis?.detectedLanguage)
        ? raw.markAnalysis.detectedLanguage
        : [],
      structure: raw?.markAnalysis?.structure || "분석값 없음",
      semanticNotes: Array.isArray(raw?.markAnalysis?.semanticNotes)
        ? raw.markAnalysis.semanticNotes
        : [],
    },
    goodsAnalysis: {
      inputGoodsServices: raw?.goodsAnalysis?.inputGoodsServices || goodsServices,
      categoryGuess: Array.isArray(raw?.goodsAnalysis?.categoryGuess)
        ? raw.goodsAnalysis.categoryGuess
        : [],
      descriptiveElements: Array.isArray(raw?.goodsAnalysis?.descriptiveElements)
        ? raw.goodsAnalysis.descriptiveElements
        : [],
    },
    grounds: Array.isArray(raw?.grounds)
      ? raw.grounds.map((g: any) => ({
          article: g?.article || "검토항목",
          title: g?.title || "분석",
          risk: g?.risk || "REVIEW_NEEDED",
          conclusion: g?.conclusion || "결론 없음",
          reason: g?.reason || "이유 없음",
        }))
      : [],
    reportBody: {
      executiveSummary: raw?.reportBody?.executiveSummary || "종합 요약 없음",
      legalAssessment: raw?.reportBody?.legalAssessment || "법률 검토 내용 없음",
      practicalComment: raw?.reportBody?.practicalComment || "실무 의견 없음",
      filingStrategy: raw?.reportBody?.filingStrategy || "출원 전략 제안 없음",
    },
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: "GEMINI_API_KEY가 설정되지 않았습니다." };
  }

  try {
    const { markText, goodsServices, notes } = JSON.parse(event.body || "{}");

    if (!markText || !goodsServices) {
      return { statusCode: 400, body: "상표명과 물품/서비스는 필수입니다." };
    }

    const prompt = buildPrompt(markText, goodsServices, notes);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify(data),
      };
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return {
        statusCode: 500,
        body: "AI 검토 결과를 받지 못했습니다.",
      };
    }

    const raw = extractJson(text);
    const normalized = normalizeReviewResult(raw, markText, goodsServices);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
