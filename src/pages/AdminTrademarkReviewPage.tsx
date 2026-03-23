import { useState } from "react";
import { requestTrademarkReview } from "../lib/api";

export default function AdminTrademarkReviewPage() {
  const [markText, setMarkText] = useState("");
  const [goodsServices, setGoodsServices] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleReview() {
    setError("");
    setLoading(true);

    try {
      const res = await requestTrademarkReview({
        markText,
        goodsServices,
      });

      console.log("AI 결과:", res); // 🔥 디버깅 핵심

      setResult(res);
    } catch (err: any) {
      setError(err.message || "오류 발생");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>상표 자동 검토</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="상표명"
          value={markText}
          onChange={(e) => setMarkText(e.target.value)}
          style={{ width: 300, marginRight: 10 }}
        />

        <input
          placeholder="물품/서비스"
          value={goodsServices}
          onChange={(e) => setGoodsServices(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      <button onClick={handleReview}>
        {loading ? "검토 중..." : "AI 검토 실행"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* 결과 출력 */}
      {result && (
        <div style={{ marginTop: 30 }}>
          <h2>결과</h2>

          <p>
            <b>종합 위험도:</b>{" "}
            {result?.summary?.overallRisk || "-"}
          </p>

          <p>
            <b>최종 의견:</b>{" "}
            {result?.summary?.finalOpinion || "-"}
          </p>

          <p>
            <b>권장 조치:</b>{" "}
            {result?.summary?.recommendedAction || "-"}
          </p>

          <h3>조문별 검토</h3>

          {(result?.grounds || []).map((g: any, i: number) => (
            <div key={i} style={{ border: "1px solid #ddd", padding: 10, marginBottom: 10 }}>
              <p><b>{g.article} {g.title}</b></p>
              <p>위험도: {g.risk}</p>
              <p>결론: {g.conclusion}</p>
              <p>이유: {g.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
