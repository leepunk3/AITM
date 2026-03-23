import type { Handler } from "@netlify/functions";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: "GEMINI_API_KEY가 설정되지 않았습니다." };
  }

  try {
    const { markText, goodsServices, notes } = JSON.parse(event.body || "{}");

    const prompt = `상표명: ${markText}
물품/서비스: ${goodsServices}
검토메모: ${notes || ""}

한국 상표법상 절대적 부등록사유를 JSON 형식으로 예비검토하라.`;

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
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: text || "{}",
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
