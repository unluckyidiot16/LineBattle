// src/state/uiStore.ts
import { create } from "zustand";

export type Scene = "title" | "lobby" | "stageSelect" | "battle";

export type StageId =
    | "tutorial"
    | "stage1"
    | "stage2"
    | "stage3"
    | "stage4"
    | "stage5"
    | "stage6";

export type StageMeta = {
    id: StageId;
    name: string;
    shortLabel: string;
    order: number;
    isTutorial?: boolean;
};

export const STAGES: StageMeta[] = [
    { id: "tutorial", name: "튜토리얼", shortLabel: "T", order: 0, isTutorial: true },
    { id: "stage1", name: "Stage 1", shortLabel: "1", order: 1 },
    { id: "stage2", name: "Stage 2", shortLabel: "2", order: 2 },
    { id: "stage3", name: "Stage 3", shortLabel: "3", order: 3 },
    { id: "stage4", name: "Stage 4", shortLabel: "4", order: 4 },
    { id: "stage5", name: "Stage 5", shortLabel: "5", order: 5 },
    { id: "stage6", name: "Stage 6", shortLabel: "6", order: 6 },
];

type UiState = {
    scene: Scene;
    currentStageId: StageId | null;

    // 진행도
    clearedStageIds: StageId[];
    unlockedStageIds: StageId[];

    // 캐릭터 해금 수 (총 6마리 가정)
    unlockedCharCount: number;

    // 씬 전환
    gotoTitle: () => void;
    gotoLobby: () => void;
    gotoStageSelect: () => void;

    // 전투 시작 / 종료
    startStage: (id: StageId) => void;
    completeStage: (id: StageId, win: boolean) => void;
};

export const useUiStore = create<UiState>((set, get) => ({
    scene: "title",
    currentStageId: null,

    clearedStageIds: [],
    // 처음에는 튜토리얼 + 1스테지만 오픈
    unlockedStageIds: ["tutorial", "stage1"],

    // 튜토리얼용 기본 캐릭터 1마리
    unlockedCharCount: 1,

    gotoTitle: () =>
        set({
            scene: "title",
            currentStageId: null,
        }),

    gotoLobby: () =>
        set({
            scene: "lobby",
            currentStageId: null,
        }),

    gotoStageSelect: () =>
        set({
            scene: "stageSelect",
            currentStageId: null,
        }),

    startStage: (id) => {
        const { unlockedStageIds } = get();
        if (!unlockedStageIds.includes(id)) return; // 잠긴 스테이지는 무시

        set({
            scene: "battle",
            currentStageId: id,
        });
    },

    completeStage: (id, win) => {
        const state = get();

        // 패배면 그냥 스테이지 선택으로 복귀 (해금 X)
        if (!win) {
            set({
                scene: "stageSelect",
                currentStageId: null,
            });
            return;
        }

        const alreadyCleared = state.clearedStageIds.includes(id);
        const clearedStageIds = alreadyCleared
            ? state.clearedStageIds
            : [...state.clearedStageIds, id];

        // 다음 스테이지 자동 해금 (튜토리얼 포함 순서대로)
        const ordered = [...STAGES].sort((a, b) => a.order - b.order);
        const idx = ordered.findIndex((s) => s.id === id);

        const unlocked = new Set<StageId>([
            ...state.unlockedStageIds,
            ...clearedStageIds,
        ]);

        if (idx >= 0 && idx + 1 < ordered.length) {
            unlocked.add(ordered[idx + 1].id);
        }

        // 튜토리얼 제외, 일반 스테이지 클리어 개수만큼 캐릭터 해금
        const clearedNormalCount = clearedStageIds.filter(
            (sid) => sid !== "tutorial"
        ).length;

        const TOTAL_CHAR_SLOTS = 6;
        const unlockedCharCount = Math.min(
            TOTAL_CHAR_SLOTS,
            1 + clearedNormalCount, // 기본 1마리 + 스테이지 클리어 수
        );

        set({
            scene: "stageSelect",
            currentStageId: null,
            clearedStageIds,
            unlockedStageIds: Array.from(unlocked),
            unlockedCharCount,
        });
    },
}));

export function getStageMeta(id: StageId): StageMeta {
    const found = STAGES.find((s) => s.id === id);
    if (!found) throw new Error(`Unknown stage id: ${id}`);
    return found;
}
