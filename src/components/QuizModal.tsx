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

    // 타이머 틱
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(id);
    }, []);

    // 문제 로드
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

    const canCancel = useMemo(() => {
        if (!aq) return true;
        return now - aq.assignedAt >= CANCEL_DELAY_MS;
    }, [aq, now]);

    const remainMs = useMemo(() => {
        if (!aq) return 0;
        return Math.max(0, aq.ttlMs - (now - aq.assignedAt));
    }, [aq, now]);

    const remainSec = Math.ceil(remainMs / 1000);

    // 타임아웃 자동 오답 처리
    useEffect(() => {
        if (!quizOpen) return;
        if (!aq) return;
        if (!pending) return;
        if (remainMs <= 0) {
            onQuizResult({
                correct: false,
                diff: pending.diff,
                lane: pending.lane,
                questionId: aq.item.id,
            });
        }
    }, [quizOpen, aq, remainMs, onQuizResult, pending]);

    const submit = () => {
        if (!pending) return;
        const correct = aq && choice != null && choice === aq.item.answer;
        onQuizResult({
            correct: !!correct,
            diff: pending.diff,
            lane: pending.lane,
            questionId: aq?.item.id ?? "unknown",
        });
    };

    const hasActiveQuiz = quizOpen && !!pending;

    return (
        <div className={`quizdock ${!hasActiveQuiz ? "quizdock--idle" : ""}`}>
            {/* 헤더 */}
            <div className="quizdock__header">
                <span className="quizdock__title">
                    {hasActiveQuiz && pending
                        ? `퀴즈 — 난이도 Lv${pending.diff}`
                        : "퀴즈 대기 중"}
                </span>
                {hasActiveQuiz && aq && (
                    <span className="quizdock__timer">{remainSec}s</span>
                )}
            </div>

            {/* 바디 */}
            <div className="quizdock__body">
                {!hasActiveQuiz || !pending ? (
                    <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
                        아래 소환 버튼을 눌러 유닛을 소환하면 퀴즈가 출제됩니다.
                    </div>
                ) : loadErr ? (
                    <div
                        style={{
                            padding: 12,
                            background: "#111827",
                            border: "1px solid #334155",
                            borderRadius: 8,
                            fontSize: 13,
                        }}
                    >
                        <p style={{ margin: 0 }}>⚠️ {loadErr}</p>
                        <p
                            style={{
                                margin: "6px 0 0",
                                opacity: 0.8,
                                fontSize: 12,
                            }}
                        >
                            <code>src/data/sampleQuiz.json</code>을 확인하거나,
                            서버 퀴즈 소스로 전환하세요.
                        </p>
                    </div>
                ) : !aq ? (
                    <p style={{ opacity: 0.8, fontSize: 13 }}>문제를 불러오는 중…</p>
                ) : (
                    <>
                        <p className="quizdock__qtext">{aq.item.text}</p>
                        <div className="quizdock__choices">
                            {aq.item.choices.map((c) => (
                                <label
                                    key={c.id}
                                    className={`quizdock__choice ${
                                        choice === c.id ? "on" : ""
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="ans"
                                        value={c.id}
                                        checked={choice === c.id}
                                        onChange={() => setChoice(c.id)}
                                    />
                                    <span className="quizdock__choice-id">
                                        {c.id}.
                                    </span>
                                    {c.text}
                                </label>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* 푸터 */}
            <div className="quizdock__footer">
                {hasActiveQuiz && pending && (
                    <>
                        <button
                            className="quizdock__btn"
                            disabled={!canCancel}
                            onClick={closeQuiz}
                        >
                            취소
                            {!canCancel && aq
                                ? ` (${Math.ceil(
                                    (CANCEL_DELAY_MS - (now - aq.assignedAt)) /
                                    1000
                                )}s)`
                                : ""}
                        </button>
                        {!loadErr && aq && (
                            <button
                                className="quizdock__btn"
                                disabled={!choice}
                                onClick={submit}
                            >
                                제출
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
