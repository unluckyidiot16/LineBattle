// src/components/UnitBar.tsx
import React, { useState } from "react";
import { useGameStore } from "../state/gameStore";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
function assetPath(rel: string): string {
    const base = BASE_URL.replace(/\/$/, "");
    const clean = rel.replace(/^\/+/, "");
    return `${base}/${clean}`;
}

const RARITIES = [
    { diff: 1, label: "C" },
    { diff: 2, label: "U" },
    { diff: 3, label: "R" },
    { diff: 4, label: "SR" },
    { diff: 5, label: "SSR" },
    { diff: 6, label: "UR" },
];

// 각 유닛의 Idle 스프라이트 정보
type FaceSprite = {
    src: string;
    frameWidth: number;
    frameHeight: number;
    frames: number;
};

// 예시: archer Idle 스프라이트
// public/assets/units/archer/Archer_Idle.png 기준
const archerIdle: FaceSprite = {
    src: assetPath("assets/units/archer/Archer_Idle.png"),
    frameWidth: 192,
    frameHeight: 192,
    frames: 6,
};

// diff별로 어떤 얼굴을 쓸지 매핑
// 지금은 전부 archer로 통일해두고, 나중에 diff별로 바꾸면 됨
const UNIT_FACES: Record<number, FaceSprite> = {
    1: archerIdle,
    2: archerIdle,
    3: archerIdle,
    4: archerIdle,
    5: archerIdle,
    6: archerIdle,
};

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
            {RARITIES.map((r) => {
                const sprite = UNIT_FACES[r.diff];
                const faceStyle = sprite
                    ? {
                        backgroundImage: `url(${sprite.src})`,
                        // 실제 자르는 건 CSS(.unitbar__face)의
                        // background-size: cover + background-position: 0 0 에 맡김
                    }
                    : undefined;

                return (
                    <button
                        key={r.diff}
                        className={`unitbar__btn unitbar__btn--diff${r.diff}`}
                        onClick={() => askLane(r.diff)}
                        disabled={quizOpen}
                    >
                        <div className="unitbar__face" style={faceStyle} />
                        <div className="unitbar__info">
                            <div className="unitbar__label">{r.label}</div>
                            <small className="unitbar__sub">Lv{r.diff}</small>
                        </div>
                    </button>
                );
            })}

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
