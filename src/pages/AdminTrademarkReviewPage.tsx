import { useEffect, useMemo, useState } from "react";
import { FileText, Save, Search, Sheet, Sparkles } from "lucide-react";
import { listSavedReviews, requestTrademarkReview, saveTrademarkReview } from "../lib/api";
import type { ReviewInput, ReviewResult, SavedReviewRow } from "../lib/types";
import { buildExpertReportMarkdown, formatGroundTitle, riskBadgeClass, riskLabelMap } from "../lib/report";

const initialForm: ReviewInput = {
  markText: "",
  goodsServices: "",
  notes: "",
  reviewer: "대표변리사",
};

type TabKey = "dashboard" | "report" | "history";

export default function AdminTrademarkReviewPage() {
  const [form, setForm] = useState<ReviewInput>(initialForm);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [expertReport, setExpertReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [history, setHistory] = useState<SavedReviewRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const overallRiskLabel = useMemo(() => {
    return result ? riskLabelMap[result.summary.overallRisk] : "미분석";
  }, [result]);

  const keyIssueCount = result?.summary.keyIssues.length ?? 0;
  const highRiskGroundCount = result?.grounds.filter((g) => g.risk === "HIGH").length ?? 0;

  async function handleReview() {
    setError("");
    setSaveMessage("");

    if (!form.markText.trim() || !form.goodsServices.trim()) {
      setError("상표명과 물품/서비스는 반드시 입력해야 합니다.");
      return;
    }

    try {
      setLoading(true);
      const review = await requestTrademarkReview(form);
      setResult(review);
      setExpertReport(buildExpertReportMarkdown(review));
      setActiveTab("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "검토 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) {
      setError("먼저 검토를 실행한 뒤 저장하세요.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await saveTrademarkReview({
        input: form,
        result,
        expertReport,
      });
      setSaveMessage(`시트 저장 완료: ${response.id}`);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "시트 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      const rows = await listSavedReviews();
      setHistory(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이력 조회 중 오류가 발생했습니다.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="page-shell">
      <div className="page-wrap">
        <div className="topbar">
          <div className="brandbox">
            <div className="eyebrow">Trademark Review Admin</div>
            <div className="title">상표 절대적 부등록사유 자동검토 관리자</div>
            <div className="subtitle">
              상표명과 물품·서비스를 입력하면 관리자용 대시보드와 전문가 리포트 형식으로 결과를 정리합니다.
            </div>
          </div>
        </div>

        <div className="grid-main">
          <div className="card card-pad">
            <h2 className="section-title">검토 입력</h2>
            <p className="section-desc">
              관리자 화면에서 직접 입력하고, AI 검토 후 결과를 시트에 저장합니다. 저장된 결과는 나중에 다시 검토 이력으로 확인할 수 있습니다.
            </p>

            <div className="field">
              <label className="label">상표명</label>
              <input
                className="input"
                value={form.markText}
                onChange={(e) => setForm((prev) => ({ ...prev, markText: e.target.value }))}
                placeholder="예: BIO TOUCH"
              />
            </div>

            <div className="field">
              <label className="label">물품 / 서비스</label>
              <textarea
                className="textarea"
                value={form.goodsServices}
                onChange={(e) => setForm((prev) => ({ ...prev, goodsServices: e.target.value }))}
                placeholder="예: 샴푸, 헤어컨디셔너, 두피케어용 화장품"
              />
            </div>

            <div className="field">
              <label className="label">검토 메모</label>
              <textarea
                className="textarea"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="예: 출원 전 예비검토, 사용의사 있음, 35류 추가 검토 예정"
              />
            </div>

            <div className="field">
              <label className="label">검토자</label>
              <input
                className="input"
                value={form.reviewer || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, reviewer: e.target.value }))}
                placeholder="예: 이광진 변리사"
              />
            </div>

            <div className="button-row">
              <button className="btn btn-primary" onClick={handleReview} disabled={loading}>
                <Sparkles size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
                {loading ? "검토 중..." : "AI 검토 실행"}
              </button>
              <button className="btn btn-secondary" onClick={handleSave} disabled={saving || !result}>
                <Save size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
                {saving ? "저장 중..." : "Google Sheets 저장"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setForm(initialForm);
                  setResult(null);
                  setExpertReport("");
                  setError("");
                  setSaveMessage("");
                }}
              >
                초기화
              </button>
            </div>

            {error ? <div className="error-box">{error}</div> : null}
            {saveMessage ? (
              <div style={{ marginTop: 12 }} className="muted">
                {saveMessage}
              </div>
            ) : null}
          </div>

          <div className="card card-pad">
            <div className="kpi-row">
              <div className="kpi">
                <div className="kpi-label">종합 위험도</div>
                <div className="kpi-value">{overallRiskLabel}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">핵심 이슈 수</div>
                <div className="kpi-value">{keyIssueCount}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">고위험 조문 수</div>
                <div className="kpi-value">{highRiskGroundCount}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">검토 이력</div>
                <div className="kpi-value">{history.length}</div>
              </div>
            </div>

            <div className="tabs">
              <button className={`tab ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
                <Search size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                관리자 결과
              </button>
              <button className={`tab ${activeTab === "report" ? "active" : ""}`} onClick={() => setActiveTab("report")}>
                <FileText size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                전문가 리포트
              </button>
              <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
                <Sheet size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                저장 이력
              </button>
            </div>

            {activeTab === "dashboard" && <DashboardView result={result} form={form} />}
            {activeTab === "report" && <ExpertReportView result={result} expertReport={expertReport} />}
            {activeTab === "history" && <HistoryView history={history} loading={historyLoading} onReload={loadHistory} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ result, form }: { result: ReviewResult | null; form: ReviewInput }) {
  if (!result) {
    return (
      <div className="report-box">
        <h3>검토 결과 대시보드</h3>
        <p className="muted">아직 검토 결과가 없습니다. 좌측 입력창에서 상표명과 물품/서비스를 입력한 뒤 AI 검토를 실행하세요.</p>
      </div>
    );
  }

  return (
    <div className="list-col">
      <div className="report-box">
        <h3>검토 개요</h3>
        <p>
          <strong>상표명:</strong> {form.markText}
        </p>
        <p>
          <strong>물품/서비스:</strong> {form.goodsServices}
        </p>
        <p>
          <strong>종합 의견:</strong> {result.summary.finalOpinion}
        </p>
        <p>
          <strong>권장 조치:</strong> {result.summary.recommendedAction}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {(result.summary.keyIssues || []).map((issue, idx) => (
            <span key={idx} className="badge bg-slate-100 text-slate-700 border-slate-200">
              {issue}
            </span>
          ))}
        </div>
      </div>

      <div className="report-box">
        <h3>표장 및 물품 분석</h3>
        <p>
          <strong>정규화 표장:</strong> {result.markAnalysis.normalizedMark}
        </p>
        <p>
          <strong>언어:</strong> {(result.markAnalysis.detectedLanguage || []).join(", ")}
        </p>
        <p>
          <strong>구조:</strong> {result.markAnalysis.structure}
        </p>
        <p>
          <strong>의미 메모:</strong> {(result.markAnalysis.detectedLanguage || []).join(", ")}
        </p>
        <p>
          <strong>카테고리 추정:</strong> {(result.goodsAnalysis.categoryGuess || []).join(", ")}
        </p>
        <p>
          <strong>성질요소:</strong> {(result.goodsAnalysis.descriptiveElements || []).join(", ")}
        </p>
      </div>

      <div className="list-col">
        {(result.summary.keyIssues || []).map((issue, idx) => (
          <div className="ground-card" key={`${ground.article}-${index}`}>
            <div className="ground-top">
              <div className="ground-title">{formatGroundTitle(ground.article, ground.title)}</div>
              <span className={`badge ${riskBadgeClass(ground.risk)}`}>{riskLabelMap[ground.risk]}</span>
            </div>
            <p className="ground-text">
              <strong>결론:</strong> {ground.conclusion}
            </p>
            <p className="ground-text">
              <strong>이유:</strong> {ground.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpertReportView({ result, expertReport }: { result: ReviewResult | null; expertReport: string }) {
  if (!result) {
    return (
      <div className="report-box">
        <h3>전문가 리포트</h3>
        <p className="muted">검토 실행 후 리포트가 생성됩니다.</p>
      </div>
    );
  }

  return (
    <div className="report-box">
      <h3>전문가 검토 리포트</h3>
      <p className="muted">대외 회신 전 내부 검토용 문안입니다. 변리사가 검토 후 직접 수정할 수 있습니다.</p>

      <h4>1. Executive Summary</h4>
      <p>{result.reportBody.executiveSummary}</p>

      <h4>2. Legal Assessment</h4>
      <p>{result.reportBody.legalAssessment}</p>

      <h4>3. Practical Comment</h4>
      <p>{result.reportBody.practicalComment}</p>

      <h4>4. Filing Strategy</h4>
      <p>{result.reportBody.filingStrategy}</p>

      <h4>5. 전체 리포트 원문</h4>
      <textarea className="textarea" value={expertReport} readOnly style={{ minHeight: 340 }} />
    </div>
  );
}

function HistoryView({
  history,
  loading,
  onReload,
}: {
  history: SavedReviewRow[];
  loading: boolean;
  onReload: () => void;
}) {
  return (
    <div className="report-box">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ marginBottom: 0 }}>저장된 검토 이력</h3>
        <button className="btn btn-secondary" onClick={onReload}>
          새로고침
        </button>
      </div>

      {loading ? (
        <p className="muted">불러오는 중...</p>
      ) : history.length === 0 ? (
        <p className="muted">아직 저장된 검토 이력이 없습니다.</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>일시</th>
              <th>검토자</th>
              <th>상표명</th>
              <th>물품/서비스</th>
              <th>위험도</th>
              <th>최종 의견</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id}>
                <td>{row.createdAt}</td>
                <td>{row.reviewer}</td>
                <td>{row.markText}</td>
                <td>{row.goodsServices}</td>
                <td>{riskLabelMap[row.overallRisk]}</td>
                <td>{row.finalOpinion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
