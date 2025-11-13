// src/controllers/AISpawner.tsx  ★ 전체 교체
import React, { useEffect } from "react";
import { useGameStore } from "../state/gameStore";

function msBetweenSpawns(timeSec: number, twoLanes: boolean) {
    // 0→180s: 3200ms → 1600ms (2레인은 10% 빠름)
    const t = Math.min(1, timeSec / 180);
    const base = 3200 - (3200 - 1600) * t;
    return Math.max(1000, twoLanes ? base * 0.9 : base);
}

function pickDiff(timeSec: number, mode: "ai1" | "ai2") {
    const p = Math.min(1, timeSec / 180);
    const min = mode === "ai1" ? 1 : 2;
    const max = mode === "ai1" ? 5 : 6;
    const bias = Math.floor(min + (max - min) * (p * 0.85));
    const roll = Math.max(min, Math.min(max, bias + (Math.random() < 0.5 ? 0 : 1)));
    return roll;
}

export function AISpawner() {
    const { gameMode, laneCount } = useGameStore();         // ← 의존성 최소화
    const isAI = gameMode === "ai1" || gameMode === "ai2";

    useEffect(() => {
        if (!isAI) return;

        // 스토어 핸들(항상 최신 상태를 직접 읽는다)
        const store = useGameStore.getState();

        // AI 모드 진입 시 자동 시작(편의)
        if (store.timeSec === 0 && store.paused) {
            store.startMatch();
        }

        // 레인별 쿨다운(ms)
        const cd: number[] = Array.from({ length: laneCount }, () => 0);

        let raf = 0;
        let last = performance.now();

        const loop = () => {
            const now = performance.now();
            const dt = now - last; // ms
            last = now;

            const s = useGameStore.getState();
            if (!s.ended && !s.paused) {
                for (let i = 0; i < laneCount; i++) {
                    cd[i] -= dt;
                    if (cd[i] <= 0) {
                        const diff = pickDiff(s.timeSec, gameMode as any);
                        s.spawn(diff, i, "enemy");                         // ← 적 스폰
                        cd[i] = msBetweenSpawns(s.timeSec, laneCount >= 2);
                    }
                }
            }

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [isAI, gameMode, laneCount]);

    return null;
}
