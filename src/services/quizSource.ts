// src/services/quizSource.ts  ★ 전체 교체
import type { QuizItem, AssignedQuestion } from "../types/quiz";
// JSON이 없거나 비어도 안전하게
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import rawData from "../data/sampleQuiz.json";

const byLevel = new Map<number, QuizItem[]>();
const ptr = new Map<number, number>();

function shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

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
        });
    }
    return out;
}

export function initQuizSource() {
    const list: QuizItem[] = Array.isArray(rawData) ? (rawData as QuizItem[]) : [];
    const levels = new Map<number, QuizItem[]>();

    // 1) JSON에서 채우기
    for (const q of list) {
        const lv = Math.max(1, Math.min(6, Math.floor((q as any).diff_lv)));
        const arr = levels.get(lv) ?? [];
        arr.push(q);
        levels.set(lv, arr);
    }

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
    const lv = Math.max(1, Math.min(6, Math.floor(diff_lv)));
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
    return { item, token, assignedAt, ttlMs };
}
