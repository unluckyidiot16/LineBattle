// gameSim.ts
import type { GameState, UnitEnt } from "./gameStore";

// AI 설정
const AI_SCAN_INTERVAL = 0.25; // 타겟 없을 때 레이더 스캔 주기(초)
const KNOCKBACK_PER_SEC = 40;  // 피격 시 초당 넉백 거리(px)

// 충돌 범위 가로 축소 (스프라이트 절반 느낌)
const COLL_WIDTH_FACTOR = 0.5; // 0.5면 실제 스프라이트의 절반 정도만 가로 충돌

// 대각선 이동 시 수직 속도 비율 (가로 속도와 크게 차이 안 나게)
const VERT_CHASE_RATIO = 0.35; // 0.0~1.0 사이: 0.35면 가로는 그대로, 세로는 35% 정도

function clampDiff(diff: number): number {
    return Math.max(1, Math.min(6, diff));
}

/**
 * 순수 시뮬레이션 함수:
 * - 입력: 이전 GameState, dtSec, 스테이지 크기
 * - 출력: 다음 GameState
 */
export function stepGame(
    prev: GameState,
    dtSec: number,
    stageWidth: number,
    stageHeight: number
): GameState {
    // 이미 끝난 매치면 그대로 반환
    if (prev.ended) return prev;

    // 1) 시간 경과
    const timeSec = prev.paused ? prev.timeSec : prev.timeSec + dtSec;

    // 시간 초과 → 즉시 종료
    if (timeSec >= prev.maxSec) {
        return {
            ...prev,
            timeSec: prev.maxSec,
            paused: true,
            ended: true,
            units: [],
        };
    }

    const margin = 24;
    const baseAllyX = margin;
    const baseEnemyX = stageWidth - margin;

    const L = Math.max(1, prev.laneCount || 1);
    const laneH = stageHeight > 0 ? stageHeight / L : 0;

    const moved: UnitEnt[] = [];
    let baseEnemy = prev.baseEnemy;
    let baseAlly = prev.baseAlly;
    let scoreAlly = prev.scoreAlly;
    let scoreEnemy = prev.scoreEnemy;

    // 2) 이동 + 기지(사거리) 도달 처리 (X, Y 모두 기지 방향으로 이동)
    for (const u of prev.units) {
        let nx = u.x;
        let ny = u.y;

        if (u.moving && !u.attackingBase) {
            // ★ 기지 좌표 계산
            const isAlly = u.side === "ally";
            const baseX = isAlly ? baseEnemyX : baseAllyX;

            let baseY = ny;
            if (laneH > 0) {
                const laneIdx = Math.max(0, Math.min(L - 1, u.lane));
                const y0 = laneH * laneIdx;
                const y1 = laneH * (laneIdx + 1);
                baseY = (y0 + y1) * 0.5; // 레인 중앙을 기지 Y로 사용
            }

            const dx = baseX - nx;
            const dy = baseY - ny;
            const dist = Math.hypot(dx, dy);
            const range = u.range ?? 0;

            if (dist > range) {
                // ★ 사거리 밖 → 기지 쪽으로 대각선 이동
                const baseSpeed = Math.max(40, Math.abs(u.speed));
                if (dist > 1e-4) {
                    const ux = dx / dist;
                    const uy = dy / dist;

                    nx += baseSpeed * dtSec * ux;
                    ny += baseSpeed * dtSec * uy;

                    // speed는 x축 속도로 유지(기존 로직 호환용)
                    u.speed = baseSpeed * ux;
                }
            } else {
                // ★ 기지 사거리 안 → 멈추고 기지 공격 모드
                u.moving = false;
                u.speed = 0;
                u.attackingBase = true;
            }
        }

        // 화면 밖으로 너무 멀리 나가면 제거
        if (nx > -margin && nx < stageWidth + margin) {
            moved.push({
                ...u,
                x: nx,
                y: ny,
            });
        }
    }

    // 3) 레인별 그룹핑
    const laneUnits: UnitEnt[][] = Array.from({ length: L }, () => []);
    for (const u of moved) {
        const laneIdx = Math.max(0, Math.min(L - 1, u.lane));
        laneUnits[laneIdx].push(u);
    }

    // id → 유닛 매핑
    const idMap: Record<string, UnitEnt> = {};
    for (const u of moved) idMap[u.id] = u;

    // 4) 충돌/AI/교전
    const dmgMap: Record<string, number> = {};
    const knockMap: Record<string, number> = {};

    for (let lane = 0; lane < L; lane++) {
        const arr = laneUnits[lane];
        const n = arr.length;
        if (n <= 1) continue;

        // 4-1) AABB 충돌 처리
        for (let i = 0; i < n; i++) {
            const u = arr[i];

            for (let j = i + 1; j < n; j++) {
                const v = arr[j];

                const dx = v.x - u.x;
                const dy = v.y - u.y;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);

                // ★ 가로 충돌 범위를 축소해서 약간 겹쳐 보이게
                const halfW = (u.radius + v.radius) * COLL_WIDTH_FACTOR;
                const halfH = u.radius + v.radius;

                if (absDx < halfW && absDy < halfH) {
                    // 겹침 발생
                    if (u.side !== v.side) {
                        // 적과 부딪히면 → 서로 멈추고 제자리에서 싸움
                        u.moving = false;
                        v.moving = false;
                    } else {
                        // 같은 편끼리 겹칠 때만 살짝 떼어내기
                        const overlapX = halfW - absDx;
                        const overlapY = halfH - absDy;

                        if (overlapX > 0 && overlapY > 0) {
                            const moveU = u.moving;
                            const moveV = v.moving;

                            if (!moveU && !moveV) {
                                continue;
                            }

                            if (overlapX < overlapY) {
                                const dir = dx >= 0 ? 1 : -1;

                                if (moveU && moveV) {
                                    u.x -= dir * overlapX * 0.5;
                                    v.x += dir * overlapX * 0.5;
                                } else if (moveU && !moveV) {
                                    u.x -= dir * overlapX;
                                } else if (!moveU && moveV) {
                                    v.x += dir * overlapX;
                                }
                            } else {
                                const dir = dy >= 0 ? 1 : -1;

                                if (moveU && moveV) {
                                    u.y -= dir * overlapY * 0.5;
                                    v.y += dir * overlapY * 0.5;
                                } else if (moveU && !moveV) {
                                    u.y -= dir * overlapY;
                                } else if (!moveU && moveV) {
                                    v.y += dir * overlapY;
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4-2) 레이더 AI + 2D 추격/공격
        for (const u of arr) {
            let targetId = u.targetId;
            let scanCd = u.scanCd ?? 0;

            // 1) 타겟이 없으면 일정 주기로 레이더 스캔
            if (!targetId) {
                scanCd -= dtSec;
                if (scanCd <= 0) {
                    const radarRange = u.radar;
                    const radarR2 = radarRange * radarRange;
                    let bestId: string | null = null;
                    let bestDist2 = Number.POSITIVE_INFINITY;

                    for (const v of arr) {
                        if (v.side === u.side) continue;
                        const dx = v.x - u.x;
                        const dy = v.y - u.y;
                        const dist2 = dx * dx + dy * dy;
                        if (dist2 <= radarR2 && dist2 < bestDist2) {
                            bestDist2 = dist2;
                            bestId = v.id;
                        }
                    }

                    targetId = bestId;
                    scanCd = AI_SCAN_INTERVAL;
                }
            }

            if (targetId) {
                const t = idMap[targetId];
                const radarRange = u.radar;

                if (!t || t.side === u.side) {
                    // 대상이 죽었거나 같은 편이면 타겟 해제
                    targetId = null;
                } else {
                    const dx = t.x - u.x;
                    const dy = t.y - u.y;
                    const dist = Math.hypot(dx, dy); // 실제 2D 거리

                    if (dist > radarRange) {
                        // 레이더 범위 밖으로 나가면 타겟 해제
                        targetId = null;
                    } else if (dist > u.range) {
                        // ★ 사거리 밖 → 타겟 방향으로 추격
                        if (!u.attackingBase) {
                            // 기지 수비 중인 유닛은 멀리 추격하지 않는다
                            u.moving = true;

                            const baseSpeed = Math.max(40, Math.abs(u.speed));

                            const dirX = dx >= 0 ? 1 : -1;
                            const dirY = dy >= 0 ? 1 : -1;

                            const vx = dirX * baseSpeed;
                            const vy = dirY * baseSpeed * VERT_CHASE_RATIO;

                            u.speed = vx;

                            if (Math.abs(dy) > 2) {
                                u.y += vy * dtSec;
                            }
                        } else {
                            // 기지에 붙어 있는 유닛은 멀리 있는 타겟은 무시
                            targetId = null;
                        }
                    } else {
                        // ★ 사거리 안 → 이동 멈추고 제자리에서 공격
                        u.moving = false;
                        u.speed = 0;

                        // 데미지 누적
                        dmgMap[t.id] = (dmgMap[t.id] || 0) + u.atk * dtSec;

                        // 넉백 (진행 방향 반대로)
                        const kb = KNOCKBACK_PER_SEC * dtSec;
                        const dir = t.side === "ally" ? -1 : 1;
                        knockMap[t.id] = (knockMap[t.id] || 0) + dir * kb;
                    }
                }
            }

            u.targetId = targetId;
            u.scanCd = scanCd;
        }
    }

    // 5) Y 좌표를 레인 안으로 클램프
    if (laneH > 0) {
        for (const u of moved) {
            const laneIdx = Math.max(0, Math.min(L - 1, u.lane));
            const y0 = laneH * laneIdx;
            const y1 = laneH * (laneIdx + 1);
            const innerTop = y0 + 8 + u.radius;
            const innerBottom = y1 - 8 - u.radius;
            if (innerBottom > innerTop) {
                if (u.y < innerTop) u.y = innerTop;
                if (u.y > innerBottom) u.y = innerBottom;
            }
        }
    }

    // 6) 데미지/넉백 적용 + 사망 유닛 제거 + 기지 데미지
    const finalUnits: UnitEnt[] = [];
    for (const u of moved) {
        const taken = dmgMap[u.id] ?? 0;
        const knock = knockMap[u.id] ?? 0;
        const hp = u.hp - taken;
        if (hp > 0) {
            const nu: UnitEnt = {
                ...u,
                hp,
                x: u.x + knock,
            };

            // ★ 기지 사거리 안(attackingBase)이고 타겟이 없으면 기지를 공격
            if (nu.attackingBase && !nu.targetId) {
                if (nu.side === "ally") {
                    baseEnemy = Math.max(0, baseEnemy - nu.atk * dtSec);
                } else {
                    baseAlly = Math.max(0, baseAlly - nu.atk * dtSec);
                }
            }

            finalUnits.push(nu);
        }
    }

    // 7) 기지 파괴 체크
    const baseBroken = baseAlly <= 0 || baseEnemy <= 0;
    const ended = baseBroken || prev.ended;

    return {
        ...prev,
        timeSec,
        baseAlly,
        baseEnemy,
        scoreAlly,
        scoreEnemy,
        units: ended ? [] : finalUnits,
        ended,
        paused: ended ? true : prev.paused,
    };
}
