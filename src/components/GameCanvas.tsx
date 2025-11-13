// src/components/GameCanvas.tsx
// ★ 애니메이션 스프라이트 버전
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
} from "../gfx/unitAnims";

export function GameCanvas() {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);

    // 레인 수 변화에만 반응, 나머지 상태는 store.getState 로 직접 읽음
    const laneCount = useGameStore((s) => s.laneCount);

    useEffect(() => {
        let destroyed = false;

        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return;

        const app = new PIXI.Application({
            view: canvas,
            resizeTo: wrap,
            backgroundColor: 0x020617,
            antialias: true,
            autoDensity: true,
        });

        appRef.current = app;

        const root = app.stage;
        root.removeChildren();

        const lanesLayer = new PIXI.Container();
        const unitsLayer = new PIXI.Container();
        unitsLayer.sortableChildren = true;

        root.addChild(lanesLayer);
        root.addChild(unitsLayer);

        // 유닛별 스프라이트 캐시
        const spriteMap = new Map<string, PIXI.AnimatedSprite>();

        // 전역 스테이지 사이즈 초기화 (spawn에서 사용)
        (globalThis as any)._stageWidth = wrap.clientWidth;
        (globalThis as any)._stageHeight = wrap.clientHeight;

        // 레인/가이드라인 그리기
        function redrawLanes() {
            lanesLayer.removeChildren();
            const w = app.renderer.width;
            const h = app.renderer.height;

            drawBoardFrame(lanesLayer, w, h);
            drawLanes(lanesLayer, w, h, laneCount);
        }

        // 처음 1회 + 리사이즈 때마다 갱신
        redrawLanes();

        const resizeObserver = new ResizeObserver(() => {
            if (destroyed) return;
            app.renderer.resize(wrap.clientWidth, wrap.clientHeight);
            redrawLanes();

            // 전역 스테이지 사이즈 → gameStore.spawn에서 참고
            (globalThis as any)._stageWidth = wrap.clientWidth;
            (globalThis as any)._stageHeight = wrap.clientHeight;
        });

        resizeObserver.observe(wrap);

        // PIXI ticker
        const tick: PIXI.TickerCallback<PIXI.Ticker> = (ticker) => {
            if (destroyed) return;

            const dtSec = ticker.deltaTime / 60;

            const state = useGameStore.getState();
            const { advance, paused } = state as any;

            const stageWidth = app.renderer.width;
            const stageHeight = app.renderer.height;

            if (!paused && typeof advance === "function") {
                advance(dtSec, stageWidth, stageHeight);
            }

            const units = (useGameStore.getState().units ?? []) as UnitEnt[];
            const idToUnit = new Map<string, UnitEnt>();
            for (const u of units) idToUnit.set(u.id, u);

            // 정렬 기준: lane -> y -> x
            const sorted = [...units].sort((a, b) => {
                if (a.lane !== b.lane) return a.lane - b.lane;
                if (a.y !== b.y) return a.y - b.y;
                return a.x - b.x;
            });

            const alive = new Set(sorted.map((u) => u.id));

            // 생성/업데이트
            sorted.forEach((u) => {
                let sprite = spriteMap.get(u.id);
                const kind = unitKindFromDiff(u.diff);

                if (!sprite) {
                    const created = createUnitSprite(kind, "idle");
                    if (!created) return;
                    sprite = created;
                    unitsLayer.addChild(sprite);
                    spriteMap.set(u.id, sprite);
                }

                // 애니메이션 상태 선택
                const anim = pickAnimForUnit(u, idToUnit);
                setUnitAnimation(sprite, kind, anim);

                // 위치/방향/정렬
                sprite.position.set(u.x, u.y);
                const baseScale = 0.7;
                const dir = u.side === "ally" ? 1 : -1;
                sprite.scale.set(baseScale * dir, baseScale);

                // zIndex: 레인/세로 기준으로 자연스럽게 앞뒤가 갈리게
                sprite.zIndex = u.y + u.lane * 1000;
            });

            // 제거된 유닛 스프라이트 정리
            for (const [id, sprite] of spriteMap) {
                if (!alive.has(id)) {
                    sprite.destroy(true);
                    spriteMap.delete(id);
                }
            }
        };

        app.ticker.add(tick);

        return () => {
            destroyed = true;
            app.ticker.remove(tick);
            spriteMap.forEach((s) => s.destroy(true));
            spriteMap.clear();
            resizeObserver.disconnect();
            app.destroy(true);
            appRef.current = null;
        };
    }, [laneCount]);

    return (
        <GameBase>
            <div
                ref={wrapRef}
                style={{ width: "100%", height: "100%", position: "relative" }}
            >
                <canvas ref={canvasRef} />
            </div>
        </GameBase>
    );
}

/** 보드 외곽선 */
function drawBoardFrame(layer: PIXI.Container, w: number, h: number) {
    const g = new PIXI.Graphics();
    g.roundRect(4, 4, w - 8, h - 8, 12).stroke({ color: 0x0f172a, width: 2 });
    layer.addChild(g);
}

/** 레인 가이드 */
function drawLanes(
    layer: PIXI.Container,
    w: number,
    h: number,
    lanes: number
) {
    const L = Math.max(1, Math.floor(lanes));
    for (let i = 0; i < L; i++) {
        const y0 = (h / L) * i;
        const y1 = (h / L) * (i + 1);
        const gh = new PIXI.Graphics();
        gh.rect(8, y0 + 8, w - 16, y1 - y0 - 16).stroke({
            color: 0x1e293b,
            width: 1,
            alpha: 0.7,
        });
        layer.addChild(gh);
    }
}

/**
 * 유닛 상태(이동/공격)에 따라 어떤 애니메이션을 쓸지 간단히 결정
 * - targetId가 있고 사거리 안이면 attack
 * - 나머지는 idle
 */
function pickAnimForUnit(u: UnitEnt, idToUnit: Map<string, UnitEnt>): AnimName {
    if (u.targetId) {
        const t = idToUnit.get(u.targetId);
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
