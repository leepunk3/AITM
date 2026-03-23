import type { Handler } from "@netlify/functions";

const GOOGLE_SHEETS_WEBAPP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL;

export const handler: Handler = async (event) => {
  if (!GOOGLE_SHEETS_WEBAPP_URL) {
    return {
      statusCode: 500,
      body: "GOOGLE_SHEETS_WEBAPP_URL이 설정되지 않았습니다.",
    };
  }

  try {
    const response = await fetch(`${GOOGLE_SHEETS_WEBAPP_URL}?mode=list`);
    const text = await response.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: text,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
