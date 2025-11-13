// src/components/GameCanvas.tsx
// PixiJS 기반 전투 보드 + 유닛 스프라이트 렌더러
import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameStore } from "../state/gameStore";
import type { UnitEnt, ProjectileEnt } from "../state/gameStore";
import { GameBase } from "./GameBase";
import {
    createUnitSprite,
    setUnitAnimation,
    unitKindFromDiff,
    type AnimName,
    preloadUnitAnims,
} from "../gfx/unitAnims";

/** 유닛별 시각 상태(애니메이션 안정화용) */
type UnitVisualState = {
    spawnTime: number;          // 스폰된 시각
    focus: "base" | "unit";     // 기본 타겟 (기지 vs 유닛)
    lastHp: number;             // 이전 프레임 HP (피격 감지)
    lastAnim: AnimName;         // 현재 유지 중인 애니메이션
    lockUntil: number;          // 이 시각까지는 애니메이션 변경 금지 (잔상 방지)
    hitTimer: number;           //  피격 시 남은 점멸 시간(초)
};

/**
 * 메인 전투 캔버스
 * - 양쪽 기지 HP UI
 * - 중앙 PixiJS 라인 / 유닛 렌더링
 */
export function GameCanvas() {
    const wrapRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);

    const laneCount = useGameStore((s) => s.laneCount ?? 3);
    const projectiles = useGameStore((s) => s.projectiles as ProjectileEnt[]);

    // ★ 투사체 레이어 & 스프라이트/텍스처 참조
    const projectileLayerRef = useRef<PIXI.Container | null>(null);
    const projectileSpritesRef = useRef<Map<string, PIXI.Sprite>>(new Map());
    const arrowTexRef = useRef<PIXI.Texture | null>(null);

    useEffect(() => {
        // 경로는 실제 배치한 위치에 맞게 수정: 예) "/assets/Arrow.png"
        arrowTexRef.current = PIXI.Texture.from("/assets/Arrow.png");
    }, []);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;

        let destroyed = false;

        // 기존 앱 정리 (laneCount가 바뀌면 재생성)
        if (appRef.current) {
            appRef.current.destroy(true);
            appRef.current = null;
        }

        const app = new PIXI.Application();
        appRef.current = app;

        // 유닛 스프라이트 캐시 + 시각 상태
        const spriteMap = new Map<string, PIXI.AnimatedSprite>();
        const visualState = new Map<string, UnitVisualState>();

        let lanesLayer: PIXI.Container | null = null;
        let unitsLayer: PIXI.Container | null = null;
        let resizeObserver: ResizeObserver | null = null;

        // 내부 시간(초) – 애니메이션 락/스폰 딜레이 계산용
        let timeSec = 0;

        /**
         * 유닛 애니메이션 선택
         * - 적이 없으면 적 기지를 향해 전진 (기지 타겟)
         * - 공격 받으면 focus를 unit으로 전환 (유닛 타겟)
         * - Run <-> Attack 전환에 락 타임을 둬서 잔상/지터링 완화
         */
        function pickAnimForUnit(
            u: UnitEnt,
            vs: UnitVisualState,
            idToUnit: Map<string, UnitEnt>,
            stageWidth: number,
            dtSec: number
        ): AnimName {
            // 0) 피격 감지 → focus를 unit으로 전환
            vs.hitTimer = Math.max(0, vs.hitTimer - dtSec);
            
            if (u.hp < vs.lastHp) {
                vs.focus = "unit";
                vs.hitTimer = 0.12;  // 0.12초 동안 빨간 점멸
            }
            vs.lastHp = u.hp;

            // 1) 스폰 직후 딜레이: 일정 시간 동안은 idle 고정
            const SPAWN_DELAY = 0.25; // 0.25초
            if (timeSec - vs.spawnTime < SPAWN_DELAY) {
                return "idle";
            }

            const moving = (u as any).moving as boolean | undefined;
            const targetId = (u as any).targetId as string | undefined;
            const target = targetId ? idToUnit.get(targetId) : undefined;

            let desired: AnimName = "idle";

            // 2) 유닛 타겟이 있는 경우
            if (target) {
                vs.focus = "unit";

                const dx = target.x - u.x;
                const dy = target.y - u.y;
                const dist = Math.hypot(dx, dy);

                if (dist <= u.range + 4) {
                    // 사거리 안 → 공격
                    desired = "attack";
                } else if (moving) {
                    // 아직 사거리 밖 → 이동
                    desired = "run";
                } else {
                    desired = "idle";
                }
            } else {
                // 3) 유닛 타겟이 없다면 → 기본은 적 기지 타겟
                vs.focus = "base";

                const BASE_MARGIN = 40; // 기지 앞 거리 여유
                const enemyBaseX =
                    u.side === "ally"
                        ? stageWidth - BASE_MARGIN
                        : BASE_MARGIN;
                const distToBase = Math.abs(enemyBaseX - u.x);

                if (distToBase <= u.range * 0.9) {
                    // 기지 앞 → 공격 모션
                    desired = "attack";
                } else if (moving) {
                    desired = "run";
                } else {
                    desired = "idle";
                }
            }

            // 4) 애니메이션 락: 너무 자주 바뀌면 잔상이 생기니 잠시 동안 유지
            if (desired !== vs.lastAnim) {
                // 아직 락 타임 안 끝났으면 이전 애니메이션 유지
                if (timeSec < vs.lockUntil) {
                    return vs.lastAnim;
                }
                // 락 타임 갱신
                vs.lastAnim = desired;
                vs.lockUntil = timeSec + 0.18; // 0.18초 동안 상태 유지
            }

            return vs.lastAnim;
        }

        // 보드 라인/배경 다시 그리기
        function redrawLanes() {
            if (!lanesLayer || !app.renderer) return;

            lanesLayer.removeChildren();

            const w = app.renderer.width;
            const h = app.renderer.height;

            drawBoardFrame(lanesLayer, w, h);
            drawLanes(lanesLayer, w, h, laneCount);

            // Stage 사이즈를 전역으로도 저장 (물리 계산 등에서 사용할 때)
            (window as any)._LB_STAGE_W = w;
            (window as any)._LB_STAGE_H = h;
        }

        // 게임 루프 (Pixi ticker -> zustand advance + 스프라이트 동기화)
        const tick: PIXI.TickerCallback<PIXI.Ticker> = (ticker) => {
            if (destroyed || !app.renderer || !unitsLayer) return;

            const dtSec = ticker.deltaTime / 60;
            timeSec += dtSec;

            const state = useGameStore.getState() as any;

            if (typeof state.advance === "function") {
                state.advance(dtSec, app.renderer.width, app.renderer.height);
            }

            const units: UnitEnt[] = (state.units ?? []) as UnitEnt[];
            const idToUnit = new Map<string, UnitEnt>();
            for (const u of units) idToUnit.set(u.id, u);

            // 1) 없어질 유닛 제거 + 시각 상태 제거
            for (const [id, sprite] of spriteMap.entries()) {
                if (!idToUnit.has(id)) {
                    sprite.parent?.removeChild(sprite);
                    sprite.destroy();
                    spriteMap.delete(id);
                    visualState.delete(id);
                }
            }

            // 2) 유닛별 스프라이트 생성/업데이트
            for (const u of units) {
                const kind = unitKindFromDiff(u.diff);
                let sprite = spriteMap.get(u.id);

                if (!sprite) {
                    const created = createUnitSprite(kind, "idle");
                    if (!created) continue;
                    sprite = created;
                    spriteMap.set(u.id, sprite);

                    // 시각 상태 초기화
                    visualState.set(u.id, {
                        spawnTime: timeSec,
                        focus: "base",
                        lastHp: u.hp,
                        lastAnim: "idle",
                        lockUntil: timeSec,
                        hitTimer: 0,
                    });

                    // 레인에 따라 약간 zIndex 변화 (위쪽 레인이 뒤에 보이도록)
                    sprite.zIndex = 10 + u.lane;
                    unitsLayer.addChild(sprite);
                }

                const vs =
                    visualState.get(u.id) ??
                    (() => {
                        const v: UnitVisualState = {
                            spawnTime: timeSec,
                            focus: "base",
                            lastHp: u.hp,
                            lastAnim: "idle",
                            lockUntil: timeSec,
                            hitTimer: 0,
                        };
                        visualState.set(u.id, v);
                        return v;
                    })();

                // 위치/방향/정렬
                sprite.position.set(u.x, u.y);
                const baseScale = 0.7;
                const dir = u.side === "ally" ? 1 : -1;
                sprite.scale.set(baseScale * dir, baseScale);
                sprite.zIndex = u.y + u.lane * 1000;

                // 피격 붉은 점멸
                if (vs.hitTimer > 0) {
                    sprite.tint = 0xff6666;    // 살짝 밝은 빨강
                } else {
                    sprite.tint = 0xffffff;    // 원래 색
                }

                // 애니메이션 상태 선택
                const desiredAnim = pickAnimForUnit(
                    u,
                    vs,
                    idToUnit,
                    app.renderer.width,
                    dtSec
                );
                setUnitAnimation(sprite, kind, desiredAnim);

            }
        };

        // Pixi Application 초기화 (v8 스타일)
        app.init({
            resizeTo: wrap,
            backgroundColor: 0x020617,
            antialias: true,
            autoDensity: true,
        }).then(async () => {
            if (destroyed) {
                app.destroy(true);
                return;
            }

            await preloadUnitAnims();

            // 기존 DOM 정리 후 Pixi 캔버스 붙이기
            wrap.innerHTML = "";
            wrap.appendChild(app.canvas);

            const root = app.stage;
            root.removeChildren();

            lanesLayer = new PIXI.Container();
            unitsLayer = new PIXI.Container();
            unitsLayer.sortableChildren = true;

            // ★ 투사체 레이어 생성
            const projectileLayer = new PIXI.Container();
            projectileLayerRef.current = projectileLayer;

            // 레이어 추가 순서: 보드 → 유닛 → 투사체(제일 위)
            root.addChild(lanesLayer);
            root.addChild(unitsLayer);
            root.addChild(projectileLayer);

            redrawLanes();

            resizeObserver = new ResizeObserver(() => {
                if (destroyed) return;
                redrawLanes();
            });
            resizeObserver.observe(wrap);

            app.ticker.add(tick);
        });

        return () => {
            destroyed = true;

            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }

            app.ticker.remove(tick);

            // 스프라이트/상태 정리
            for (const sprite of spriteMap.values()) {
                sprite.parent?.removeChild(sprite);
                sprite.destroy();
            }
            spriteMap.clear();
            visualState.clear();

            // ★ 투사체 스프라이트 정리
            for (const spr of projectileSpritesRef.current.values()) {
                spr.parent?.removeChild(spr);
                spr.destroy();
            }
            projectileSpritesRef.current.clear();
            projectileLayerRef.current = null;

            app.destroy(true);
            appRef.current = null;

        };
    }, [laneCount]);

    // ★ 투사체 렌더링: projectiles → Arrow 스프라이트
    useEffect(() => {
        const layer = projectileLayerRef.current;
        const tex = arrowTexRef.current;
        if (!layer || !tex) return;

        const spriteMap = projectileSpritesRef.current;

        const aliveIds = new Set<string>();
        for (const p of projectiles) {
            aliveIds.add(p.id);
            let spr = spriteMap.get(p.id);
            if (!spr) {
                spr = new PIXI.Sprite(tex);
                spr.anchor.set(0.5, 0.5);
                spr.zIndex = 9999; // 유닛보다 위에 (layer 자체가 위라 사실 상관없음)
                layer.addChild(spr);
                spriteMap.set(p.id, spr);
            }
            spr.position.set(p.x, p.y);
            spr.rotation = Math.atan2(p.vy, p.vx);
            spr.scale.set(0.8, 0.8);
        }

        // 안 남은 투사체 제거
        for (const [id, spr] of spriteMap.entries()) {
            if (!aliveIds.has(id)) {
                spr.parent?.removeChild(spr);
                spr.destroy();
                spriteMap.delete(id);
            }
        }
    }, [projectiles]);


    return (
        <div
            className="canvas-wrap"
            style={{
                // 폭/높이는 CSS에서 제어하고,
                // 여기서는 위치/그림자만 담당
                position: "relative",
                boxShadow: "0 8px 24px rgba(15,23,42,0.6)",
            }}
        >
            {/* Pixi 캔버스 컨테이너 (resizeTo 대상) */}
            <div
                ref={wrapRef}
                style={{
                    width: "100%",
                    height: "100%",
                }}
            />

            {/* 기지: 보드 높이 기준 세로 중앙, 좌우에 배치 */}
            <GameBase side="ally" />
            <GameBase side="enemy" />
        </div>
    );

}

/**
 * 보드 바깥 테두리 등 기본 프레임
 */
function drawBoardFrame(layer: PIXI.Container, w: number, h: number) {
    const g = new PIXI.Graphics();

    const padding = 24;
    const rectW = Math.max(0, w - padding * 2);
    const rectH = Math.max(0, h - padding * 2);

    g.rect(padding, padding, rectW, rectH)
        .fill({ color: 0x020617, alpha: 1 })
        .stroke({ width: 2, color: 0x1f2937, alignment: 0 });

    // 중앙 세로 라인 (양 진영 경계 느낌)
    const midX = padding + rectW / 2;
    g.moveTo(midX, padding)
        .lineTo(midX, padding + rectH)
        .stroke({ width: 1, color: 0x111827, alpha: 0.7 });

    layer.addChild(g);
}

/**
 * 레인 구분선
 */
function drawLanes(
    layer: PIXI.Container,
    w: number,
    h: number,
    laneCount: number
) {
    const g = new PIXI.Graphics();

    const padding = 24;
    const rectW = Math.max(0, w - padding * 2);
    const rectH = Math.max(0, h - padding * 2);

    if (laneCount <= 0) return;

    const laneHeight = rectH / laneCount;

    for (let i = 1; i < laneCount; i++) {
        const y = padding + laneHeight * i;
        g.moveTo(padding, y)
            .lineTo(padding + rectW, y)
            .stroke({ width: 1, color: 0x111827, alpha: 0.7 });
    }

    layer.addChild(g);
}
