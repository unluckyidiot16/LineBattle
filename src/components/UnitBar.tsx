// src/components/UnitBar.tsx
import React, { useState } from "react";
import { useGameStore } from "../state/gameStore";

const RARITIES = [
    { diff: 1, label: "C" },
    { diff: 2, label: "U" },
    { diff: 3, label: "R" },
    { diff: 4, label: "SR" },
    { diff: 5, label: "SSR" },
    { diff: 6, label: "UR" },
];

export function UnitBar() {
    const [pick, setPick] = useState<{ diff: number } | null>(null);
    const { laneCount, openQuiz, quizOpen } = useGameStore();

    const askLane = (diff: number) => {
        if (laneCount === 1) {
            openQuiz(diff, 0);
        } else {
            setPick({ diff });
        }
    };

    return (
        <div className="unitbar">
            {RARITIES.map((r) => (
                <button
                    key={r.diff}
                    className={`unitbar__btn unitbar__btn--diff${r.diff}`}
                    onClick={() => askLane(r.diff)}
                    disabled={quizOpen}
                >
                    {/* 얼굴 슬롯 */}
                    <div className="unitbar__face" />

                    <div className="unitbar__info">
                        <div className="unitbar__label">{r.label}</div>
                        <small className="unitbar__sub">Lv{r.diff}</small>
                    </div>
                </button>
            ))}

            {pick && laneCount > 1 && (
                <div className="unitbar__lane">
                    <span>레인 선택:</span>
                    {Array.from({ length: laneCount }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => openQuiz(pick.diff, i)}
                            className="lane-btn"
                        >
                            {i === 0 ? "Left" : i === 1 ? "Right" : `Lane ${i + 1}`}
                        </button>
                    ))}
                    <button className="lane-cancel" onClick={() => setPick(null)}>
                        취소
                    </button>
                </div>
            )}
        </div>
    );
}
