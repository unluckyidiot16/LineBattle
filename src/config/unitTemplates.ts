// src/config/unitTemplates.ts
import { DMG_BY_DIFF, RANGE_BY_DIFF, MOVE_SPEED_BY_DIFF } from "./balance";

export type UnitRole = "melee" | "ranged" | "healer";

export type UnitTemplate = {
    role: UnitRole;
    diff: number;
    maxHp: number;
    atkPerSec: number;
    moveSpeed: number;
    range: number;
    radar: number;
    radius: number;

    // 힐러 전용 옵션
    healPerSec?: number;
    healRange?: number;
};

const DEFAULT_RADAR = 1200;
const DEFAULT_RADIUS = 14;

function clampDiff(diff: number): number {
    return Math.max(1, Math.min(6, Math.floor(diff)));
}

export function getUnitTemplateForDiff(diff: number): UnitTemplate {
    const d = clampDiff(diff);
    const idx = d - 1;

    const maxHp = 60 + d * 30;
    let atkPerSec = DMG_BY_DIFF[idx] ?? (8 + d * 4);
    const moveSpeed = MOVE_SPEED_BY_DIFF[idx] ?? (90 + d * 18);
    const range = RANGE_BY_DIFF[idx] ?? 80;
    const radar = DEFAULT_RADAR;

    let role: UnitRole = "melee";
    let healPerSec: number | undefined;
    let healRange: number | undefined;

    // ★ 임시 매핑: diff 2 = 힐러
    // 필요하면 나중에 "diff 3이 힐러" 이런 식으로 이 조건만 바꿔주면 됨
    if (d === 6) {
        role = "healer";
        healPerSec = DMG_BY_DIFF[idx] ?? 12; // 초당 힐량
        healRange = range * 1.2;             // 공격 사거리보다 약간 넓게

        // 힐러는 공격력은 약하게
        atkPerSec = DMG_BY_DIFF[0];
    } else if (range >= 100) {
        role = "ranged";
    } else {
        role = "melee";
    }

    return {
        role,
        diff: d,
        maxHp,
        atkPerSec,
        moveSpeed,
        range,
        radar,
        radius: DEFAULT_RADIUS,
        healPerSec,
        healRange,
    };
}
