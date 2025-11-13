// src/types/quiz.ts
export type QuizChoice = { id: string; text: string };
export type QuizItem = {
    id: string;
    diff_lv: number;            // 1..6
    text: string;
    choices: QuizChoice[];
    answer: string;             // correct choice id
};

export type AssignedQuestion = {
    item: QuizItem;
    token: string;              // 임시 토큰(서버 권위 이전까지 로컬)
    assignedAt: number;         // ms epoch
    ttlMs: number;              // 예: 25000
};
