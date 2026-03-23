import { useEffect, useState, useMemo } from "react";
import { Search, Save, History, AlertCircle, CheckCircle2, Loader2, FileText, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ReviewInput, ReviewResult, SavedReviewRow } from "../lib/types";
import { requestTrademarkReview, saveTrademarkReview, listSavedReviews } from "../lib/api";
import { riskLabelMap, riskBadgeClass, buildExpertReportMarkdown } from "../lib/report";

export default function AdminTrademarkReviewPage() {
  const [input, setInput] = useState<ReviewInput>({
    markText: "",
    goodsServices: "",
    notes: "",
    reviewer: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedReviewRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [view, setView] = useState<"review" | "history">("review");

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await listSavedReviews();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (view === "history") {
      loadHistory();
    }
  }, [view]);

  const handleReview = async () => {
    if (!input.markText || !input.goodsServices) {
      setError("상표명과 물품/서비스를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await requestTrademarkReview(input);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검토 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setLoading(true);
    try {
      const report = buildExpertReportMarkdown(result);
      await saveTrademarkReview({ input, result, expertReport: report });
      alert("성공적으로 저장되었습니다.");
      loadHistory();
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">상표 검토 관리자</h1>
            <p className="text-slate-500 mt-1">AI 기반 상표 절대적 부등록사유 심층 검토 시스템</p>
          </div>
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
            <button
              onClick={() => setView("review")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "review" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              신규 검토
            </button>
            <button
              onClick={() => setView("history")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "history" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              검토 이력
            </button>
          </div>
        </header>

        <main>
          <AnimatePresence mode="wait">
            {view === "review" ? (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Input Section */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Search className="w-5 h-5 text-slate-400" />
                      검토 정보 입력
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">상표명 (Mark Text)</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                          placeholder="예: APPLE, 삼성전자"
                          value={input.markText}
                          onChange={(e) => setInput({ ...input, markText: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">지정상품/서비스</label>
                        <textarea
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all min-h-[100px]"
                          placeholder="예: 스마트폰, 컴퓨터 소프트웨어"
                          value={input.goodsServices}
                          onChange={(e) => setInput({ ...input, goodsServices: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">검토자 (Reviewer)</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                            placeholder="성함 입력"
                            value={input.reviewer}
                            onChange={(e) => setInput({ ...input, reviewer: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">추가 메모 (선택)</label>
                        <textarea
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                          placeholder="특이사항 입력"
                          value={input.notes}
                          onChange={(e) => setInput({ ...input, notes: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={handleReview}
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        AI 검토 시작
                      </button>
                    </div>
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Result Section */}
                <div className="lg:col-span-8">
                  {result ? (
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-slate-900">검토 결과 리포트</h2>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={loading}
                              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 text-sm font-medium"
                            >
                              <Save className="w-4 h-4" />
                              저장하기
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">종합 위험도</span>
                            <div className={`mt-1 inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${riskBadgeClass(result.summary.overallRisk)}`}>
                              {riskLabelMap[result.summary.overallRisk]}
                            </div>
                          </div>
                          <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">최종 의견</span>
                            <p className="mt-1 text-slate-700 font-medium">{result.summary.finalOpinion}</p>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <section>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-slate-400" />
                              표장 및 상품 분석
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border border-slate-100 bg-white">
                                <h4 className="text-sm font-bold text-slate-500 mb-2">표장 분석</h4>
                                <ul className="text-sm space-y-2 text-slate-600">
                                  <li><span className="font-medium">정규화:</span> {result.markAnalysis.normalizedMark}</li>
                                  <li><span className="font-medium">언어:</span> {result.markAnalysis.detectedLanguage.join(", ")}</li>
                                  <li><span className="font-medium">구조:</span> {result.markAnalysis.structure}</li>
                                </ul>
                              </div>
                              <div className="p-4 rounded-xl border border-slate-100 bg-white">
                                <h4 className="text-sm font-bold text-slate-500 mb-2">상품 분석</h4>
                                <ul className="text-sm space-y-2 text-slate-600">
                                  <li><span className="font-medium">카테고리:</span> {result.goodsAnalysis.categoryGuess.join(", ")}</li>
                                  <li><span className="font-medium">성질표시:</span> {result.goodsAnalysis.descriptiveElements.join(", ")}</li>
                                </ul>
                              </div>
                            </div>
                          </section>

                          <section>
                            <h3 className="text-lg font-bold text-slate-900 mb-4">조문별 상세 검토</h3>
                            <div className="space-y-4">
                              {result.grounds.map((ground, idx) => (
                                <div key={idx} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-slate-800">{ground.article} {ground.title}</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskBadgeClass(ground.risk)}`}>
                                      {riskLabelMap[ground.risk]}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed">{ground.reason}</p>
                                  <div className="mt-3 pt-3 border-top border-slate-200 text-xs font-semibold text-slate-400">
                                    결론: <span className="text-slate-700">{ground.conclusion}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>

                          <section className="pt-6 border-t border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">실무 검토 의견 (Draft)</h3>
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">1. Executive Summary</h4>
                                <p className="text-slate-700 leading-relaxed">{result.reportBody.executiveSummary}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">2. Legal Assessment</h4>
                                <p className="text-slate-700 leading-relaxed">{result.reportBody.legalAssessment}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">3. Practical Comment</h4>
                                <p className="text-slate-700 leading-relaxed">{result.reportBody.practicalComment}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">4. Filing Strategy</h4>
                                <p className="text-slate-700 leading-relaxed">{result.reportBody.filingStrategy}</p>
                              </div>
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 p-8 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">검토 결과가 여기에 표시됩니다</h3>
                      <p className="max-w-xs mt-2">상표명과 지정상품을 입력하고 검토 시작 버튼을 눌러주세요.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-400" />
                    저장된 검토 이력
                  </h3>
                  <button
                    onClick={loadHistory}
                    disabled={historyLoading}
                    className="text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
                  >
                    <Loader2 className={`w-4 h-4 ${historyLoading ? "animate-spin" : ""}`} />
                    새로고침
                  </button>
                </div>
                <div className="overflow-x-auto">
                  {historyLoading ? (
                    <div className="p-12 text-center text-slate-400">불러오는 중...</div>
                  ) : history.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">아직 저장된 검토 이력이 없습니다.</div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">일시</th>
                          <th className="px-6 py-4">검토자</th>
                          <th className="px-6 py-4">상표명</th>
                          <th className="px-6 py-4">물품/서비스</th>
                          <th className="px-6 py-4">위험도</th>
                          <th className="px-6 py-4">최종 의견</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-medium text-slate-900">{row.reviewer}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{row.markText}</td>
                            <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]">{row.goodsServices}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskBadgeClass(row.overallRisk)}`}>
                                {riskLabelMap[row.overallRisk]}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{row.finalOpinion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
