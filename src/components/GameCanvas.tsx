// src/components/GameCanvas.tsx
// PixiJS 기반 전투 보드 + 유닛 스프라이트 렌더러
import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameStore } from "../state/gameStore";
import type { UnitEnt } from "../state/gameStore";
import { GameBase } from "./GameBase";
import {
    createUnitSprite,
    setUnitAnimation,
    unitKindFromDiff,
    type AnimName,
    preloadUnitAnims,
} from "../gfx/unitAnims";

/**
 * 메인 전투 캔버스
 * - 상단에 아군/적 기지 HP UI
 * - 중앙에는 PixiJS로 라인 / 유닛 렌더링
 */
export function GameCanvas() {
    const wrapRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);

    const laneCount = useGameStore((s) => s.laneCount ?? 3);

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

        // 유닛 스프라이트 캐시
        const spriteMap = new Map<string, PIXI.AnimatedSprite>();
        let lanesLayer: PIXI.Container | null = null;
        let unitsLayer: PIXI.Container | null = null;
        let resizeObserver: ResizeObserver | null = null;

        // 유닛 애니메이션 선택
        function pickAnimForUnit(u: UnitEnt, idToUnit: Map<string, UnitEnt>): AnimName {
            if ((u as any).moving) {
                return "run";
            }

            if ((u as any).targetId) {
                const t = idToUnit.get((u as any).targetId);
                if (t) {
                    const dx = t.x - u.x;
                    const dy = t.y - u.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist <= u.range + 4) {
                        return "attack";
                    }
                }
            }
            return "idle";
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
            const state = useGameStore.getState() as any;

            if (typeof state.advance === "function") {
                state.advance(dtSec, app.renderer.width, app.renderer.height);
            }

            const units: UnitEnt[] = (state.units ?? []) as UnitEnt[];
            const idToUnit = new Map<string, UnitEnt>();
            for (const u of units) idToUnit.set(u.id, u);

            // 1) 없어질 유닛 제거
            for (const [id, sprite] of spriteMap.entries()) {
                if (!idToUnit.has(id)) {
                    sprite.parent?.removeChild(sprite);
                    sprite.destroy();
                    spriteMap.delete(id);
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

                    // 레인에 따라 약간 zIndex 변화 (위쪽 레인이 뒤에 보이도록)
                    sprite.zIndex = 10 + u.lane;
                    unitsLayer.addChild(sprite);
                }

                // 위치 / zIndex 업데이트
                sprite.position.set(u.x, u.y);
                sprite.zIndex = 10 + u.lane;

                // 애니메이션 상태 선택
                const desiredAnim = pickAnimForUnit(u, idToUnit);
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

            root.addChild(lanesLayer);
            root.addChild(unitsLayer);

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

            // 스프라이트 정리
            for (const sprite of spriteMap.values()) {
                sprite.parent?.removeChild(sprite);
                sprite.destroy();
            }
            spriteMap.clear();

            app.destroy(true);
            appRef.current = null;
        };
    }, [laneCount]);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: "#020617",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(15,23,42,0.6)",
            }}
        >
            {/* Pixi 캔버스 컨테이너 */}
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
function drawLanes(layer: PIXI.Container, w: number, h: number, laneCount: number) {
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
