// src/config/balance.ts
export const SCORE_BY_DIFF = [10, 20, 35, 55, 80, 110]; // C..UR

// ★ diff별 기본 공격력(DPS) — 초당 데미지로 사용
export const DMG_BY_DIFF   = [10, 12, 16, 22, 30, 40];

export const BASE_HP       = 200;
export const MATCH_SEC     = 180; // 3분(원하면 300으로)

// ★ diff별 기본 공격 사거리(px)
// 1,2: 근접 / 3,4: 중거리 / 5,6: 장거리
export const RANGE_BY_DIFF = [
    50,   // diff 1
    70,   // diff 2
    110,  // diff 3
    140,  // diff 4
    170,  // diff 5
    220,  // diff 6
];

// ★ diff별 기본 이동 속도(px/sec)
// 기존: 90 + diff * 18 → [108, 126, 144, 162, 180, 198]
export const MOVE_SPEED_BY_DIFF = [
    108, // diff 1
    126, // diff 2
    144, // diff 3
    162, // diff 4
    180, // diff 5
    198, // diff 6
];
