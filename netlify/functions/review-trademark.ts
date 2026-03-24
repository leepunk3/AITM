import type { Handler } from "@netlify/functions";
import { REVIEW_GUIDE } from "../../src/config/reviewGuide";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * 프롬프트 생성
 */
function buildPrompt(markText: string, goodsServices: string, notes?: string) {
  return `
상표명: ${markText}
물품/서비스: ${goodsServices}
검토 메모: ${notes || "없음"}

아래 심사기준에 따라 한국 상표법상 절대적 부등록사유를 예비검토하라.

${REVIEW_GUIDE}

[중요]
- 반드시 JSON만 출력하라
- 설명문, 마크다운, 코드블록 금지
- risk 값은 HIGH, MEDIUM, LOW, REVIEW_NEEDED 중 하나만 사용

출력 형식:
{
  "summary": {
    "overallRisk": "HIGH | MEDIUM | LOW | REVIEW_NEEDED",
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
      "risk": "HIGH | MEDIUM | LOW | REVIEW_NEEDED",
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
`;
}

/**
 * JSON 안전 파싱 (Gemini가 가끔 텍스트 섞어서 줄 때 대응)
 */
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

/**
 * 응답 구조 강제 정규화 (프론트 깨짐 방지 핵심)
 */
function normalizeReviewResult(raw: any, markText: string, goodsServices: string) {
  return {
    summary: {
      overallRisk: raw?.summary?.overallRisk || "REVIEW_NEEDED",
      finalOpinion: raw?.summary?.finalOpinion || "검토 결과 요약 없음",
      keyIssues: Array.isArray(raw?.summary?.keyIssues) ? raw.summary.keyIssues : [],
      recommendedAction:
        raw?.summary?.recommendedAction || "변리사 검토 후 출원 전략 재정리 권장",
    },

    markAnalysis: {
      originalMark: raw?.markAnalysis?.originalMark || markText,
      normalizedMark: raw?.markAnalysis?.normalizedMark || markText,
      detectedLanguage: Array.isArray(raw?.markAnalysis?.detectedLanguage)
        ? raw.markAnalysis.detectedLanguage
        : [],
      structure: raw?.markAnalysis?.structure || "",
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
      executiveSummary: raw?.reportBody?.executiveSummary || "",
      legalAssessment: raw?.reportBody?.legalAssessment || "",
      practicalComment: raw?.reportBody?.practicalComment || "",
      filingStrategy: raw?.reportBody?.filingStrategy || "",
    },
  };
}

/**
 * Netlify Function Handler
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: "GEMINI_API_KEY가 설정되지 않았습니다.",
    };
  }

  try {
    const { markText, goodsServices, notes } = JSON.parse(event.body || "{}");

    if (!markText || !goodsServices) {
      return {
        statusCode: 400,
        body: "상표명과 물품/서비스는 필수 입력값입니다.",
      };
    }

    const prompt = buildPrompt(markText, goodsServices, notes);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        body: "AI 응답이 비어 있습니다.",
      };
    }

    const raw = extractJson(text);
    const normalized = normalizeReviewResult(raw, markText, goodsServices);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(normalized),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
