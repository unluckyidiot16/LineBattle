// src/components/QuizModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../state/gameStore";
import { AssignedQuestion } from "../types/quiz";
import { getNextQuestion } from "../services/quizSource";

const CANCEL_DELAY_MS = 5_000;

export function QuizModal() {
    const { quizOpen, pending, closeQuiz, onQuizResult } = useGameStore();
    const [aq, setAQ] = useState<AssignedQuestion | null>(null);
    const [choice, setChoice] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [loadErr, setLoadErr] = useState<string | null>(null);

    // 1) 타이머 틱 훅 (항상 선언)
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(id);
    }, []);

    // 2) 문제 로드 훅 (항상 선언)
    useEffect(() => {
        if (!quizOpen || !pending) {
            setAQ(null);
            setChoice(null);
            setLoadErr(null);
            return;
        }
        try {
            const q = getNextQuestion(pending.diff, 25_000);
            setAQ(q);
            setChoice(null);
            setLoadErr(null);
        } catch (e: any) {
            console.error(e);
            setAQ(null);
            setLoadErr(e?.message ?? "문제를 불러오지 못했습니다.");
        }
    }, [quizOpen, pending]);

    // 3) 파생값 훅(항상 선언)
    const canCancel = useMemo(() => {
        if (!aq) return true; // 에러/미로딩 시 즉시 취소 허용
        return now - aq.assignedAt >= CANCEL_DELAY_MS;
    }, [aq, now]);

    const remainMs = useMemo(() => {
        if (!aq) return 0;
        return Math.max(0, aq.ttlMs - (now - aq.assignedAt));
    }, [aq, now]);

    const remainSec = Math.ceil(remainMs / 1000);

    // 4) 타임아웃 자동 제출 훅(항상 선언)
    useEffect(() => {
        if (!quizOpen) return;
        if (!aq) return;
        if (remainMs <= 0) {
            onQuizResult({
                correct: false,
                diff: pending!.diff,
                lane: pending!.lane,
                questionId: aq.item.id,
            });
        }
    }, [quizOpen, aq, remainMs, onQuizResult, pending]);

    // === 여기서부터는 렌더 분기 ===
    if (!quizOpen || !pending) return null;

    const submit = (from: "user" | "timeout") => {
        const correct = aq && choice != null && choice === aq.item.answer && from !== "timeout";
        onQuizResult({
            correct: !!correct,
            diff: pending.diff,
            lane: pending.lane,
            questionId: aq?.item.id ?? "unknown",
        });
    };

    return (
        <div className="modal__backdrop">
            <div className="modal">
                <header className="modal__header">
                    <b>퀴즈 — 난이도 Lv{pending.diff}</b>
                    {aq && <span className="modal__timer">{remainSec}s</span>}
                </header>

                <div className="modal__body">
                    {loadErr ? (
                        <div style={{ padding: 12, background: "#111827", border: "1px solid #334155", borderRadius: 8 }}>
                            <p style={{ margin: 0 }}>⚠️ {loadErr}</p>
                            <p style={{ margin: "6px 0 0", opacity: 0.8, fontSize: 13 }}>
                                <code>src/data/sampleQuiz.json</code>을 확인하거나, 서버 퀴즈 소스로 전환하세요.
                            </p>
                        </div>
                    ) : aq ? (
                        <>
                            <p className="qtext">{aq.item.text}</p>
                            <div className="choices">
                                {aq.item.choices.map((c) => (
                                    <label key={c.id} className={`choice ${choice === c.id ? "on" : ""}`}>
                                        <input
                                            type="radio"
                                            name="ans"
                                            value={c.id}
                                            checked={choice === c.id}
                                            onChange={() => setChoice(c.id)}
                                        />
                                        <span className="choice__id">{c.id}.</span> {c.text}
                                    </label>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p style={{ opacity: 0.8 }}>문제를 불러오는 중…</p>
                    )}
                </div>

                <footer className="modal__footer">
                    <button className="btn--cancel" disabled={!canCancel} onClick={closeQuiz}>
                        취소{!canCancel && aq ? ` (${Math.ceil((CANCEL_DELAY_MS - (now - aq.assignedAt)) / 1000)}s)` : ""}
                    </button>
                    {!loadErr && aq && (
                        <button className="btn--submit" disabled={!choice} onClick={() => submit("user")}>
                            제출
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
