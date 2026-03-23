import type { ReviewInput, ReviewResult, SavedReviewRow } from "./types";

export async function requestTrademarkReview(input: any) {
  const res = await fetch("/api/review-trademark", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
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
