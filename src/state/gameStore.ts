import { create } from "zustand";
import { BASE_HP, MATCH_SEC, SCORE_BY_DIFF } from "../config/balance";
import { stepGame } from "./gameSim";
import { getUnitTemplateForDiff } from "../config/unitTemplates";

export type GameMode = "tutorial1" | "ai1" | "ai2" | "pvp2";
export type QuizPending = { diff: number; lane: number } | null;
export type QuizResult = {
    correct: boolean;
    diff: number;
    lane: number;
    questionId: string;
};
export type Side = "ally" | "enemy";
export type ProjectileKind = "arrow";

export type ProjectileEnt = {
    id: string;
    side: Side;
    kind: ProjectileKind;

    x: number;
    y: number;
    vx: number;
    vy: number;

    life: number;     // 살아온 시간(sec)
    maxLife: number;  // 수명(sec)
};

export type UnitRole = "melee" | "ranged" | "healer";

export type UnitEnt = {
    id: string;
    diff: number;
    lane: number;
    side: Side;

    x: number;
    y: number;
    zOrder: number;
    speed: number;   // 기본 이동 속도 (ally: +, enemy: -)
    moving: boolean; // 이동 중인지 여부

    radius: number; // 충돌 박스 반쪽 (AABB 용)
    range: number;  // 공격 사거리(원형)
    radar: number;  // 탐지 사거리(원형, 넉넉하게)

    hp: number;
    atk: number;    // 초당 공격력

    // AI용 필드
    targetId: string | null;
    scanCd: number; // 레이더 스캔까지 남은 시간(sec)

    // ★ 원거리 투사체 쿨다운 (sec)
    projCd: number;

    role: UnitRole;
    
    // ★ 기지를 공격 중인지 여부
    attackingBase: boolean;
};

export type GameState = {
    // core
    paused: boolean;
    tickCount: number;
    gameMode: GameMode;
    laneCount: number;

    // match
    baseAlly: number;
    baseEnemy: number;
    scoreAlly: number;
    scoreEnemy: number;
    timeSec: number;
    maxSec: number;
    ended: boolean;

    // quiz
    quizOpen: boolean;
    pending: QuizPending;
    lastResult: QuizResult | null;

    // units
    units: UnitEnt[];

    // ★ 발사체
    projectiles: ProjectileEnt[];
    
    // actions
    setPaused: (v: boolean) => void;
    tick: () => void;
    setGameMode: (m: GameMode) => void;
    setLaneCount: (n: number) => void;

    openQuiz: (diff: number, lane: number) => void;
    closeQuiz: () => void;
    onQuizResult: (r: QuizResult) => void;

    startMatch: (maxSec?: number) => void;
    resetMatch: (maxSec?: number) => void;
    endMatch: () => void;

    spawn: (diff: number, lane: number, side?: Side) => void;
    advance: (dtSec: number, stageWidth: number, stageHeight: number) => void;
};

function lanesForMode(m: GameMode): number {
    switch (m) {
        case "tutorial1":
        case "ai1":
            return 1;
        case "ai2":
        case "pvp2":
            return 2;
    }
}

function clampDiff(diff: number): number {
    return Math.max(1, Math.min(6, diff));
}


let gSpawnSeq = 0;

export const useGameStore = create<GameState>((set, get) => ({
    // core
    paused: false,
    tickCount: 0,
    gameMode: "tutorial1",
    laneCount: 1,

    // match
    baseAlly: BASE_HP,
    baseEnemy: BASE_HP,
    scoreAlly: 0,
    scoreEnemy: 0,
    timeSec: 0,
    maxSec: MATCH_SEC,
    ended: false,

    // quiz
    quizOpen: false,
    pending: null,
    lastResult: null,

    // units
    units: [],

    // projectiles
    projectiles: [],

    // ===== core actions =====
    setPaused: (v) => set({ paused: v }),
    tick: () => set((s) => ({ tickCount: s.tickCount + 1 })),

    setGameMode: (m) =>
        set(() => ({
            gameMode: m,
            laneCount: lanesForMode(m),
            quizOpen: false,
            pending: null,
        })),

    setLaneCount: (n) => set({ laneCount: Math.max(1, Math.floor(n)) }),

    // ===== quiz actions =====
    openQuiz: (diff, lane) => set({ quizOpen: true, pending: { diff, lane } }),
    closeQuiz: () => set({ quizOpen: false, pending: null }),

    onQuizResult: (r) => {
        if (r.correct) {
            get().spawn(r.diff, r.lane, "ally");
        }
        return set({ lastResult: r, quizOpen: false, pending: null });
    },

    // ===== match lifecycle =====
    startMatch: (maxSec) =>
        set({
            paused: false,
            ended: false,
            timeSec: 0,
            maxSec: typeof maxSec === "number" ? maxSec : MATCH_SEC,
        }),

    resetMatch: (maxSec) =>
        set({
            paused: false,
            ended: false,
            timeSec: 0,
            maxSec: typeof maxSec === "number" ? maxSec : MATCH_SEC,
            baseAlly: BASE_HP,
            baseEnemy: BASE_HP,
            scoreAlly: 0,
            scoreEnemy: 0,
            units: [],
            projectiles: [],
        }),

    endMatch: () => set({ paused: true, ended: true }),

    // ===== unit spawn =====
    // 점수: 소환 시 확정, 위치: 레인 안에서 Y 랜덤
    spawn: (diff, lane, side = "ally") =>
        set((s) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const d = clampDiff(diff);
            const tpl = getUnitTemplateForDiff(d);

            const {
                maxHp,
                atkPerSec,
                radius,
                range,
                radar,
                moveSpeed,
                role,
                healPerSec,
                healRange,
            } = tpl;

            const speed = side === "ally" ? moveSpeed : -moveSpeed;

            // ★ Pixi가 기록한 실제 전장 크기 사용
            const stageWidth =
                typeof (globalThis as any)._LB_STAGE_W === "number"
                    ? (globalThis as any)._LB_STAGE_W
                    : 800;

            const stageHeight =
                typeof (globalThis as any)._LB_STAGE_H === "number"
                    ? (globalThis as any)._LB_STAGE_H
                    : 400;

            const L = Math.max(1, s.laneCount || 1);
            const laneIdx = Math.max(0, Math.min(L - 1, lane));
            const laneH = stageHeight / L;

            const y0 = laneH * laneIdx;
            const y1 = laneH * (laneIdx + 1);

            const midY = (y0 + y1) / 2;
            const jitterRange = laneH * 0.4;
            let y = midY + (Math.random() - 0.5) * jitterRange;

            // 레인 안쪽으로 클램프
            const innerTop = y0 + 8 + radius;
            const innerBottom = y1 - 8 - radius;
            if (innerBottom > innerTop) {
                y = Math.max(innerTop, Math.min(innerBottom, y));
            }

            // ★ 스폰 위치: 기지에서 SPAWN_OFFSET 만큼 떨어진 곳
            const SPAWN_OFFSET = 60;
            const startX =
                side === "ally"
                    ? SPAWN_OFFSET
                    : stageWidth - SPAWN_OFFSET;

            // 소환 시점 점수
            const idx = d - 1;
            const sc = SCORE_BY_DIFF[idx];
            const scoreAlly = side === "ally" ? s.scoreAlly + sc : s.scoreAlly;
            const scoreEnemy = side === "enemy" ? s.scoreEnemy + sc : s.scoreEnemy;

            const u: UnitEnt = {
                id,
                diff: d,
                lane: laneIdx,
                side,
                x: startX,
                y,
                zOrder: gSpawnSeq++,
                speed,
                moving: true,
                radius,
                range,
                radar,
                // 스탯
                hp: maxHp,
                atk: atkPerSec,
                // AI 필드
                targetId: null,
                scanCd: 0,
                projCd: 0,
                // 역할 정보 (템플릿에서 가져온 값)
                role,
                // 기지 공격 상태
                attackingBase: false,
            };


            return {
                units: [...s.units, u],
                scoreAlly,
                scoreEnemy,
            };
        }),

    // ===== advance: 순수 시뮬레이션 함수 호출 =====
    advance: (dtSec, stageWidth, stageHeight) =>
        set((s) => stepGame(s, dtSec, stageWidth, stageHeight)),
}));
