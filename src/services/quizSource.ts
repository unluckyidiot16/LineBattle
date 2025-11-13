// src/services/quizSource.ts  ★ 전체 교체
import type { QuizItem, AssignedQuestion } from "../types/quiz";
// JSON이 없거나 비어도 안전하게
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import rawData from "../data/sampleQuiz.json";

const byLevel = new Map<number, QuizItem[]>();
const ptr = new Map<number, number>();

type RawJsonItem = {
    id?: string;
    question?: string;
    text?: string;
    options?: string[];
    choices?: { id: string; text: string }[];
    answer?: number | string;
    difficulty?: string;
    diff_lv?: number;
    reward?: number;
    time?: number;
};

function shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function clampLevel(lv: number | undefined | null): number {
    const n = typeof lv === "number" && Number.isFinite(lv) ? Math.floor(lv) : 1;
    return Math.max(1, Math.min(6, n));
}

// difficulty 태그 → 1~6 레벨 매핑
function diffFromDifficultyTag(tag: string | undefined | null, index = 0): number {
    const t = (tag ?? "").toLowerCase();
    switch (t) {
        case "easy":
            // 1~2 번갈아 사용
            return 1 + (index % 2);
        case "medium":
            // 3~4 번갈아 사용
            return 3 + (index % 2);
        case "hard":
            // 5~6 번갈아 사용
            return 5 + (index % 2);
        default:
            return 2;
    }
}

// raw JSON(현재 sampleQuiz.json) → QuizItem으로 정규화
function toQuizItem(raw: RawJsonItem, index: number): QuizItem {
    // 이미 QuizItem 형태(text + choices)가 들어온 경우
    if (raw && typeof raw.text === "string" && Array.isArray(raw.choices)) {
        const lv = clampLevel(raw.diff_lv ?? diffFromDifficultyTag(raw.difficulty, index));
        return {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - QuizItem에 reward/time 등이 없어도 무시
            ...raw,
            id: raw.id ?? `q-${index}`,
            diff_lv: lv,
        } as QuizItem;
    }

    // sampleQuiz.json 형태(question/options/answer/difficulty)를 QuizItem으로 변환
    const options = Array.isArray(raw.options) ? raw.options : [];
    const choices = options.map((opt, i) => ({
        id: String.fromCharCode("A".charCodeAt(0) + i), // "A", "B", "C", "D"...
        text: String(opt),
    }));

    let answerId = "A";
    if (typeof raw.answer === "number") {
        const idx = Math.max(0, Math.min(options.length - 1, raw.answer));
        answerId = String.fromCharCode("A".charCodeAt(0) + idx);
    } else if (typeof raw.answer === "string") {
        // "A"~"D" 같은 형태면 그대로 사용
        answerId = raw.answer;
    }

    const lv = clampLevel(raw.diff_lv ?? diffFromDifficultyTag(raw.difficulty, index));

    return {
        id: raw.id ?? `q-${index}`,
        diff_lv: lv,
        text: raw.question ?? raw.text ?? "",
        choices,
        answer: answerId,
    } as QuizItem;
}

// 레벨별 fallback(산수) 생성기
function genFallbackForLevel(lv: number, n = 6): QuizItem[] {
    // 간단 산술문제 생성기(레벨에 따라 난이도 소폭 증가)
    const out: QuizItem[] = [];
    for (let i = 0; i < n; i++) {
        const a = 2 + lv + i;
        const b = 1 + ((lv * 3 + i) % 7);
        const ans = a + b;
        const wrong1 = ans + (lv % 2 ? 1 : -1);
        const wrong2 = ans + (lv % 3 ? 2 : -2);
        out.push({
            id: `auto-${lv}-${i}`,
            diff_lv: lv,
            text: `${a} + ${b} = ?`,
            choices: [
                { id: "A", text: String(wrong1) },
                { id: "B", text: String(ans) },
                { id: "C", text: String(wrong2) },
            ],
            answer: "B",
        } as QuizItem);
    }
    return out;
}

export function initQuizSource() {
    const rawList: RawJsonItem[] = Array.isArray(rawData) ? (rawData as RawJsonItem[]) : [];
    const list: QuizItem[] = rawList.map(toQuizItem);

    const levels = new Map<number, QuizItem[]>();

    // 1) JSON에서 채우기
    list.forEach((q) => {
        const lv = clampLevel((q as any).diff_lv);
        const arr = levels.get(lv) ?? [];
        arr.push(q);
        levels.set(lv, arr);
    });

    // 2) 비어있는 레벨은 자동 생성으로 채우기
    for (let lv = 1; lv <= 6; lv++) {
        if (!levels.get(lv) || levels.get(lv)!.length === 0) {
            console.warn(`[quiz] level ${lv} is empty → generate fallback items`);
            levels.set(lv, genFallbackForLevel(lv));
        }
    }

    // 3) 셔플 & 저장
    byLevel.clear();
    ptr.clear();
    for (const [lv, arr] of levels) {
        byLevel.set(lv, shuffle(arr.slice()));
        ptr.set(lv, 0);
    }
}

function ensureReady() {
    if (!byLevel.size) initQuizSource();
}

export function getNextQuestion(diff_lv: number, ttlMs = 25_000): AssignedQuestion {
    ensureReady();
    const lv = clampLevel(diff_lv);
    let arr = byLevel.get(lv) ?? [];
    if (arr.length === 0) {
        // 레벨별로도 마지막 안전장치
        arr = genFallbackForLevel(lv);
        byLevel.set(lv, arr);
        ptr.set(lv, 0);
    }
    const i = ptr.get(lv) ?? 0;
    ptr.set(lv, (i + 1) % arr.length);
    const item = arr[i];
    const assignedAt = Date.now();
    const token = `${item.id}:${assignedAt}:${Math.random().toString(36).slice(2, 8)}`;
    return { item, token, assignedAt, ttlMs } as AssignedQuestion;
}
