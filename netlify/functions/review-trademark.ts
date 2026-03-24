import type { Handler } from "@netlify/functions";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function buildPrompt(markText: string, goodsServices: string, notes?: string) {
  return `너는 한국 상표법상 절대적 부등록사유를 예비 검토하는 상표 심사 보조 엔진이다.

입력값:
- 상표명: ${markText}
- 물품/서비스: ${goodsServices}
- 검토 메모: ${notes || "없음"}

반드시 아래 기준으로 판단하라.

[공통 판단 기준]
1. 상표명과 물품/서비스의 관계를 기준으로 판단한다.
2. 제33조 제1항 제1호(보통명칭), 제2호(관용상표), 제3호(성질표시), 제4호(현저한 지리적 명칭), 제5호(흔한 성 또는 명칭), 제6호(간단하고 흔한 표장), 제7호(기타 식별력 없음)를 평가하라.
3. 필요하면 제34조 제1항 제1호, 제3호, 제4호, 제6호도 함께 평가하라.

[기술적 표장 세부 기준]
1. 상표가 상품 또는 서비스의 품질, 효능, 용도, 원재료, 생산방법, 가공방법, 제공방법, 기술적 특성, 기능, 성분, 규격, 수량, 형상, 가격, 사용시기 등을 직접적으로 나타내는 경우 제33조 제1항 제3호 위험을 높게 평가하라.
2. 특히 업계에서 흔히 쓰이는 기술 용어, 품질표시, 성능표시, 재질표시, 기능설명 용어는 기술적 표장 여부를 엄격하게 검토하라.
3. 영문 약어, 외국어 표현, 업계 약칭이라도 일반 수요자 또는 거래자가 상품의 성질이나 기술적 특성을 바로 이해할 수 있으면 성질표시 위험을 높게 평가하라.
4. 두 개 이상의 설명적 단어가 결합된 경우에도 전체적으로 새로운 관념이 생기지 않고 기술적 의미만 전달하면 제33조 제1항 제3호 해당 가능성을 높게 평가하라.
5. 예를 들어 ECO, BIO, ORGANIC, SOFT, STRONG, LIGHT, PREMIUM, NATURAL, SMART, AI, 3D, ULTRA, PRO, TECH 등은 지정상품과 결합하여 기술적 의미나 성질을 직접 전달하는지 검토하라.
6. 상표가 상품의 성능, 사용 목적, 대상 고객, 품질 수준을 설명하는 광고문구 또는 일반 설명문처럼 보이면 제33조 제1항 제7호도 함께 검토하라.
7. 상표가 단순히 암시적인 수준인지, 아니면 상품의 성질을 직접적으로 직감시키는지 구분하라.
8. 직접적·즉각적인 이해가 가능하면 HIGH 또는 MEDIUM 위험으로 평가하고, 다단계 추론이 필요하면 LOW 또는 REVIEW_NEEDED로 평가하라.

[출력 규칙]
1. 결과는 반드시 JSON으로만 출력하라.
2. risk 값은 HIGH, MEDIUM, LOW, REVIEW_NEEDED 중 하나만 사용하라.
3. grounds는 article, title, risk, conclusion, reason 필드를 가져야 한다.
4. summary, markAnalysis, goodsAnalysis, grounds, reportBody 구조를 반드시 지켜라.
5. 기술적 표장 또는 성질표시와 관련된 경우 grounds에 반드시 별도 항목으로 명시하라.

반드시 아래 JSON 형식으로만 답하라.
절대로 설명문, 코드블록, 마크다운을 덧붙이지 마라.

출력 JSON 스키마:
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
