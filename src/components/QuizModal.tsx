// src/components/QuizModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../state/gameStore";
import { AssignedQuestion } from "../types/quiz";
import { getNextQuestion } from "../services/quizSource";

const CANCEL_DELAY_MS = 5_000;

type RevealState = {
    pickedId: string;
    isCorrect: boolean;
};

export function QuizModal() {
    const { quizOpen, pending, closeQuiz, onQuizResult } = useGameStore();
    const [aq, setAQ] = useState<AssignedQuestion | null>(null);
    const [choice, setChoice] = useState<string | null>(null);
    const [reveal, setReveal] = useState<RevealState | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [loadErr, setLoadErr] = useState<string | null>(null);

    // 1) 타이머 틱
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(id);
    }, []);

    // 2) 문제 로드
    useEffect(() => {
        if (!quizOpen || !pending) {
            setAQ(null);
            setChoice(null);
            setReveal(null);
            setLoadErr(null);
            return;
        }
        try {
            const q = getNextQuestion(pending.diff, 25_000);
            setAQ(q);
            setChoice(null);
            setReveal(null);
            setLoadErr(null);
        } catch (e: any) {
            console.error(e);
            setAQ(null);
            setReveal(null);
            setLoadErr(e?.message ?? "문제를 불러오지 못했습니다.");
        }
    }, [quizOpen, pending]);

    // 3) 파생값들
    const canCancel = useMemo(() => {
        if (!aq) return true;
        return now - aq.assignedAt >= CANCEL_DELAY_MS;
    }, [aq, now]);

    const cancelRemainSec = useMemo(() => {
        if (!aq) return 0;
        const remain = CANCEL_DELAY_MS - (now - aq.assignedAt);
        return Math.max(0, Math.ceil(remain / 1000));
    }, [aq, now]);

    const remainMs = useMemo(() => {
        if (!aq) return 0;
        return Math.max(0, aq.ttlMs - (now - aq.assignedAt));
    }, [aq, now]);

    const remainSec = Math.ceil(remainMs / 1000);

    // 4) 타임아웃 자동 오답 처리
    useEffect(() => {
        if (!quizOpen) return;
        if (!aq) return;
        if (remainMs <= 0 && pending) {
            onQuizResult({
                correct: false,
                diff: pending.diff,
                lane: pending.lane,
                questionId: aq.item.id,
            });
        }
    }, [quizOpen, aq, remainMs, onQuizResult, pending]);

    const hasQuiz = quizOpen && !!pending;

    // 5) 보기 클릭 시 즉시 채점
    const handleChoiceClick = (choiceId: string) => {
        if (!hasQuiz || !pending || !aq) return;
        if (reveal) return; // 이미 제출한 뒤에는 무시

        setChoice(choiceId);
        const isCorrect = choiceId === aq.item.answer;
        setReveal({ pickedId: choiceId, isCorrect });

        // 잠깐 테두리 보여준 뒤 실제 결과 처리
        setTimeout(() => {
            onQuizResult({
                correct: isCorrect,
                diff: pending.diff,
                lane: pending.lane,
                questionId: aq.item.id,
            });
        }, 500);
    };

    return (
        <section className="quizdock">
            <header className="quizdock__header">
                <b>
                    {hasQuiz && pending
                        ? `퀴즈 — 난이도 Lv${pending.diff}`
                        : "퀴즈 대기 중"}
                </b>

                {hasQuiz && aq && (
                    <div className="quizdock__header-right">
                        <span className="quizdock__timer">{remainSec}s</span>
                        <button
                            className="btn--cancel"
                            disabled={!canCancel}
                            onClick={closeQuiz}
                        >
                            취소
                            {!canCancel && cancelRemainSec > 0
                                ? ` (${cancelRemainSec}s)`
                                : ""}
                        </button>
                    </div>
                )}
            </header>

            <div className="quizdock__body">
                {!hasQuiz ? (
                    <p className="quizdock__placeholder">
                        아래 소환 버튼을 눌러 유닛을 소환하면 퀴즈가 출제됩니다.
                    </p>
                ) : loadErr ? (
                    <div
                        style={{
                            padding: 12,
                            background: "#111827",
                            border: "1px solid #334155",
                            borderRadius: 8,
                        }}
                    >
                        <p style={{ margin: 0 }}>⚠️ {loadErr}</p>
                        <p
                            style={{
                                margin: "6px 0 0",
                                opacity: 0.8,
                                fontSize: 13,
                            }}
                        >
                            <code>src/data/sampleQuiz.json</code>을 확인하거나,
                            서버 퀴즈 소스로 전환하세요.
                        </p>
                    </div>
                ) : aq ? (
                    <>
                        <p className="qtext">{aq.item.text}</p>
                        <div className="choices">
                            {aq.item.choices.map((c) => {
                                const isPicked = choice === c.id;
                                const isCorrectChoice =
                                    aq.item.answer === c.id;
                                const showResult = !!reveal;
                                const isWrongPicked =
                                    showResult &&
                                    reveal!.pickedId === c.id &&
                                    !reveal!.isCorrect;
                                const isCorrectMarked =
                                    showResult && isCorrectChoice;

                                const classNames = ["choice"];
                                if (isPicked) classNames.push("on");
                                if (isCorrectMarked)
                                    classNames.push("choice--correct");
                                else if (isWrongPicked)
                                    classNames.push("choice--wrong");

                                return (
                                    <label
                                        key={c.id}
                                        className={classNames.join(" ")}
                                        onClick={() =>
                                            handleChoiceClick(c.id)
                                        }
                                    >
                                        <input
                                            type="radio"
                                            name="ans"
                                            value={c.id}
                                            checked={isPicked}
                                            readOnly
                                        />
                                        <span className="choice__id">
                                            {c.id}.
                                        </span>{" "}
                                        {c.text}
                                    </label>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <p style={{ opacity: 0.8 }}>문제를 불러오는 중…</p>
                )}
            </div>
        </section>
    );
}
