// src/components/GameCanvas.tsx
// PixiJS 기반 전투 보드 + 유닛 스프라이트 렌더러
import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameStore } from "../state/gameStore";
import type { UnitEnt, ProjectileEnt } from "../state/gameStore";
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
    // ★ 힐 감지용 플래그
    justHealed: boolean;        // 이번 프레임에 힐을 받았는지 여부
    lastHealFxTime: number;     // 마지막 힐 이펙트 시각
};

type TileNinePatch = {
    center: PIXI.Texture;
    top: PIXI.Texture;
    bottom: PIXI.Texture;
    left: PIXI.Texture;
    right: PIXI.Texture;
    topLeft: PIXI.Texture;
    topRight: PIXI.Texture;
    bottomLeft: PIXI.Texture;
    bottomRight: PIXI.Texture;
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

    // ★ 힐 이펙트 레이어 & 프레임 텍스처
    const healFramesRef = useRef<PIXI.Texture[] | null>(null);
    const healLayerRef = useRef<PIXI.Container | null>(null);

    // ★ 성(본진) 스프라이트 & 텍스처
    const castleAllyRef = useRef<PIXI.Sprite | null>(null);
    const castleEnemyRef = useRef<PIXI.Sprite | null>(null);

    const tileTexturesRef = useRef<TileNinePatch | null>(null);
    
    // 성의 "기본 위치" (흔들기 전 기준점)
    const castleBasePosRef = useRef({
        allyX: 0,
        allyY: 0,
        enemyX: 0,
        enemyY: 0,
    });

    const castleTexturesRef = useRef<{
        ally?: PIXI.Texture;
        enemy?: PIXI.Texture;
        destroyed?: PIXI.Texture;
    }>({});

    // HP 비교 / 흔들기용 상태
    const castleHitRef = useRef<{
        inited: boolean;
        prevAllyHp: number;
        prevEnemyHp: number;
        allyHitTimer: number;
        enemyHitTimer: number;
    }>({
        inited: false,
        prevAllyHp: 0,
        prevEnemyHp: 0,
        allyHitTimer: 0,
        enemyHitTimer: 0,
    });

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                // 경로는 실제 위치에 맞게 수정
                const tex = await PIXI.Assets.load("assets/Arrow.png");
                if (!cancelled) {
                    arrowTexRef.current = tex;
                }
            } catch (err) {
                console.error("[Arrow] texture load failed", err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadHealFrames() {
            // /public/assets/Heal_Effect.png 기준
            const tex = (await PIXI.Assets.load("assets/Heal_Effect.png")) as PIXI.Texture;
            if (cancelled) return;

            const source = tex.source;           // v8 기준 baseTexture 대신 source 사용
            const frameCount = 11;
            const frameW = tex.width / frameCount;
            const frameH = tex.height;

            const frames: PIXI.Texture[] = [];
            for (let i = 0; i < frameCount; i++) {
                const rect = new PIXI.Rectangle(i * frameW, 0, frameW, frameH);
                frames.push(
                    new PIXI.Texture({
                        source,
                        frame: rect,
                    })
                );
            }

            healFramesRef.current = frames;
        }

        loadHealFrames();

        return () => {
            cancelled = true;
            const frames = healFramesRef.current;
            healFramesRef.current = null;
            if (frames) {
                frames.forEach((t) => t.destroy(true));
            }
        };
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

        // ★ 힐 이펙트 스프라이트 모음
        const healSprites = new Set<PIXI.AnimatedSprite>();

        let lanesLayer: PIXI.Container | null = null;
        let unitsLayer: PIXI.Container | null = null;
        let resizeObserver: ResizeObserver | null = null;

// ★ 힐 이펙트 생성 함수 (유닛 전체를 받도록 변경)
        function spawnHealEffect(u: UnitEnt) {
            const layer = healLayerRef.current;
            const frames = healFramesRef.current;
            if (!layer || !frames || frames.length === 0) return;

            const spr = new PIXI.AnimatedSprite(frames);

            // Pixi 스프라이트 앵커: 스프라이트 중앙
            spr.anchor.set(0.5, 0.5);

            // 유닛 좌표 기준으로 살짝 위쪽에만 올리기 (고정 값)
            const px = u.x;
            const py = u.y - 24; // 필요하면 16~32 사이에서 감으로 조절

            spr.position.set(px, py);
            spr.zIndex = py + 6000;
            spr.scale.set(0.7);
            spr.animationSpeed = 0.4;
            spr.loop = false;

            spr.onComplete = () => {
                spr.parent?.removeChild(spr);
                spr.destroy();
                healSprites.delete(spr);
            };

            healSprites.add(spr);
            layer.addChild(spr);
            spr.play();
        }




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
            // 🔹 0) 1프레임짜리 플래그 초기화 (힐 FX용)
            vs.justHealed = false;

            // 0-1) 피격 감지 → focus를 unit으로 전환
            vs.hitTimer = Math.max(0, vs.hitTimer - dtSec);

            const HP_DELTA_EPS = 0.1;
            const deltaHp = u.hp - vs.lastHp;

            // 1) 피격: HP 감소
            if (deltaHp < -HP_DELTA_EPS) {
                vs.focus = "unit";
                vs.hitTimer = 0.12; // 피격 시 빨간 점멸
            }

            // 2) 힐: HP 증가
            if (deltaHp > HP_DELTA_EPS) {
                const HEAL_FX_INTERVAL = 1; // 최소 1초 간격으로만 FX
                if (timeSec - vs.lastHealFxTime > HEAL_FX_INTERVAL) {
                    vs.justHealed = true;
                    vs.lastHealFxTime = timeSec;
                }
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
            
            drawLanes(lanesLayer, w, h, laneCount, tileTexturesRef.current);
            
            // ★ 게임 시뮬레이션 쪽에서 참조하는 전역 스테이지 크기
            (window as any)._LB_STAGE_W = w;
            (window as any)._LB_STAGE_H = h;

            // ★ 성(본진) 기본 위치 업데이트
            // gameSim.ts에서 margin = 24, baseAllyX = margin, baseEnemyX = stageWidth - margin 을 쓰지만
            // 여기서는 "성 스프라이트가 맵 안쪽에 완전히 들어오도록" 절반만큼 안쪽으로 밀어준다.
            const margin = 24;
            const centerY = h / 2;

            const sprAlly = castleAllyRef.current;
            const sprEnemy = castleEnemyRef.current;

            // 기본값(텍스처 없을 때 대비)
            let allyX = margin;
            let enemyX = w - margin;

            // 스프라이트 폭 기준으로 절반만큼 안쪽으로 이동
            if (sprAlly) {
                const allyHalfW =
                    (sprAlly.width * Math.abs(sprAlly.scale.x || 1)) * 0.5;
                allyX = margin + allyHalfW;
            }

            if (sprEnemy) {
                const enemyHalfW =
                    (sprEnemy.width * Math.abs(sprEnemy.scale.x || 1)) * 0.5;
                enemyX = w - margin - enemyHalfW;
            }

            const basePos = castleBasePosRef.current;
            basePos.allyX = allyX;
            basePos.allyY = centerY;
            basePos.enemyX = enemyX;
            basePos.enemyY = centerY;

            // 실제 위치 반영
            if (sprAlly) {
                sprAlly.position.set(basePos.allyX, basePos.allyY);
            }
            if (sprEnemy) {
                sprEnemy.position.set(basePos.enemyX, basePos.enemyY);
            }

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

            // ★ 성 HP 변화 감지 → 흔들기 타이머 갱신
            const baseAlly: number = state.baseAlly ?? 0;
            const baseEnemy: number = state.baseEnemy ?? 0;

            const hit = castleHitRef.current;
            const HIT_SHAKE_TIME = 0.15; // 흔들리는 시간(초)

            if (!hit.inited) {
                hit.prevAllyHp = baseAlly;
                hit.prevEnemyHp = baseEnemy;
                hit.inited = true;
            } else {
                if (baseAlly < hit.prevAllyHp) {
                    hit.allyHitTimer = HIT_SHAKE_TIME;
                }
                if (baseEnemy < hit.prevEnemyHp) {
                    hit.enemyHitTimer = HIT_SHAKE_TIME;
                }
                hit.prevAllyHp = baseAlly;
                hit.prevEnemyHp = baseEnemy;
            }

            // 타이머 감소
            hit.allyHitTimer = Math.max(0, hit.allyHitTimer - dtSec);
            hit.enemyHitTimer = Math.max(0, hit.enemyHitTimer - dtSec);


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
                        justHealed: false,
                        lastHealFxTime: -999,
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
                            
                            justHealed: false,
                            lastHealFxTime: -999,
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

                // 힐 이펙트: 이번 프레임에 힐 판정이 났으면 머리 위에 이펙트 1회
                if (vs.justHealed) {
                    spawnHealEffect(u);
                }
            }

            // ------------------------------------------------
            // 5) 캐슬 흔들기 + 파괴 텍스처 적용
            // ------------------------------------------------
            const basePos = castleBasePosRef.current;
            const sprAlly = castleAllyRef.current;
            const sprEnemy = castleEnemyRef.current;
            const tex = castleTexturesRef.current;

            if (basePos) {
                const SHAKE_BASE = 4; // 흔들리는 최대 픽셀 정도 (필요하면 조정)

                // ─ ally 캐슬 ─
                if (sprAlly) {
                    let offX = 0;
                    let offY = 0;

                    if (castleHitRef.current.allyHitTimer > 0) {
                        const t = castleHitRef.current.allyHitTimer / HIT_SHAKE_TIME; // 0~1
                        const mag = SHAKE_BASE * t;
                        offX = (Math.random() - 0.5) * mag;
                        offY = (Math.random() - 0.5) * mag;
                    }

                    sprAlly.position.set(
                        basePos.allyX + offX,
                        basePos.allyY + offY
                    );

                    // HP 0 이하 → 파괴 텍스처
                    if (state.baseAlly <= 0 && tex.destroyed) {
                        sprAlly.texture = tex.destroyed;
                    }
                }

                // ─ enemy 캐슬 ─
                if (sprEnemy) {
                    let offX = 0;
                    let offY = 0;

                    if (castleHitRef.current.enemyHitTimer > 0) {
                        const t = castleHitRef.current.enemyHitTimer / HIT_SHAKE_TIME;
                        const mag = SHAKE_BASE * t;
                        offX = (Math.random() - 0.5) * mag;
                        offY = (Math.random() - 0.5) * mag;
                    }

                    sprEnemy.position.set(
                        basePos.enemyX + offX,
                        basePos.enemyY + offY
                    );

                    if (state.baseEnemy <= 0 && tex.destroyed) {
                        sprEnemy.texture = tex.destroyed;
                    }
                }
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

            // ★ 타일맵 3x3 로드 (64x64 타일)
            try {
                const tileTex = await PIXI.Assets.load("assets/Tilemap_Flat-green.png") as PIXI.Texture;
                const source = tileTex.source;
                const TILE = 64;

                const makeTile = (col: number, row: number) =>
                    new PIXI.Texture({
                        source,
                        frame: new PIXI.Rectangle(col * TILE, row * TILE, TILE, TILE),
                    });

                tileTexturesRef.current = {
                    topLeft: makeTile(0, 0),
                    top: makeTile(1, 0),
                    topRight: makeTile(2, 0),
                    left: makeTile(0, 1),
                    center: makeTile(1, 1),
                    right: makeTile(2, 1),
                    bottomLeft: makeTile(0, 2),
                    bottom: makeTile(1, 2),
                    bottomRight: makeTile(2, 2),
                };
            } catch (err) {
                console.error("[Tiles] failed to load Tilemap_Flat-green.png", err);
            }
            
            // 기존 DOM 정리 후 Pixi 캔버스 붙이기
            wrap.innerHTML = "";
            wrap.appendChild(app.canvas);

            const root = app.stage;
            root.removeChildren();

            lanesLayer = new PIXI.Container();
            unitsLayer = new PIXI.Container();
            unitsLayer.sortableChildren = true;

            // ★ 힐 이펙트 레이어
            const healLayer = new PIXI.Container();
            healLayer.sortableChildren = true;
            healLayerRef.current = healLayer;

            // ★ 투사체 레이어 생성
            const projectileLayer = new PIXI.Container();
            projectileLayerRef.current = projectileLayer;

            // 레이어 추가 순서: 보드 → 유닛 → 힐 → 투사체(제일 위)
            root.addChild(lanesLayer);
            root.addChild(unitsLayer);
            root.addChild(healLayer);
            root.addChild(projectileLayer);

            // ★ 성(본진) 텍스처 로드 + 스프라이트 생성
            try {
                const [texAlly, texEnemy, texDestroyed] = await Promise.all([
                    PIXI.Assets.load("assets/Castle_Blue.png") as Promise<PIXI.Texture>,
                    PIXI.Assets.load("assets/Castle_Red.png") as Promise<PIXI.Texture>,
                    PIXI.Assets.load("assets/Castle_Destroyed.png") as Promise<PIXI.Texture>,
                ]);

                castleTexturesRef.current = {
                    ally: texAlly,
                    enemy: texEnemy,
                    destroyed: texDestroyed,
                };

                const sprAlly = new PIXI.Sprite(texAlly);
                const sprEnemy = new PIXI.Sprite(texEnemy);

                // 가운데 기준 (이미지 자체에서 위치 잡기)
                sprAlly.anchor.set(0.5, 0.5);
                sprEnemy.anchor.set(0.5, 0.5);

                // 유닛보다 약간 뒤에 보이도록 (필요시 조절)
                sprAlly.zIndex = -10;
                sprEnemy.zIndex = -10;

                castleAllyRef.current = sprAlly;
                castleEnemyRef.current = sprEnemy;

                unitsLayer.addChild(sprAlly);
                unitsLayer.addChild(sprEnemy);
            } catch (err) {
                console.error("[Castle] failed to load castle textures", err);
            }

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

            // ★ 힐 이펙트 정리
            for (const spr of healSprites) {
                spr.parent?.removeChild(spr);
                spr.destroy();
            }
            healSprites.clear();
            healLayerRef.current = null;

            // ★ 투사체 스프라이트 정리
            for (const spr of projectileSpritesRef.current.values()) {
                spr.parent?.removeChild(spr);
                spr.destroy();
            }
            projectileSpritesRef.current.clear();
            projectileLayerRef.current = null;

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

            {/* 본진 네모 UI 제거: 성 스프라이트만 사용 */}
            {/* <GameBase side="ally" />
        <GameBase side="enemy" /> */}
        </div>
    );


}

/**
 * 보드 바깥 테두리 등 기본 프레임
 */
// ★ 전장 배경은 CSS / 타일맵으로 처리할 예정 → 보드용 사각형은 그리지 않음
function drawBoardFrame(layer: PIXI.Container, w: number, h: number) {
    // no-op (이전 사각 렌더러 제거)
}


/**
 * 레인 타일 + 구분선 그리기
 */
function drawLanes(
    layer: PIXI.Container,
    w: number,
    h: number,
    laneCount: number,
    tiles?: TileNinePatch | null
) {
    const padding = 24;
    const rectW = Math.max(0, w - padding * 2);
    const rectH = Math.max(0, h - padding * 2);

    if (laneCount <= 0 || rectW <= 0 || rectH <= 0) return;

    const laneHeight = rectH / laneCount;

    // =============================
    // 1) 타일맵으로 바닥 깔기 (가로/세로 중앙 정렬)
    // =============================
    if (tiles && tiles.center) {
        const TILE = 64;
        const cols = Math.ceil(rectW / TILE);
        const rows = Math.ceil(rectH / TILE);

        const usedW = cols * TILE;
        const usedH = rows * TILE;

        // rect 영역 안에서 타일 전체가 "중앙"에 오도록 시작 위치 조정
        const xStart = padding + (rectW - usedW) * 0.5;
        const yStart = padding + (rectH - usedH) * 0.5;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const isTop = row === 0;
                const isBottom = row === rows - 1;
                const isLeft = col === 0;
                const isRight = col === cols - 1;

                let tex: PIXI.Texture = tiles.center;

                if (isTop && isLeft) tex = tiles.topLeft;
                else if (isTop && isRight) tex = tiles.topRight;
                else if (isBottom && isLeft) tex = tiles.bottomLeft;
                else if (isBottom && isRight) tex = tiles.bottomRight;
                else if (isTop) tex = tiles.top;
                else if (isBottom) tex = tiles.bottom;
                else if (isLeft) tex = tiles.left;
                else if (isRight) tex = tiles.right;

                const spr = new PIXI.Sprite(tex);
                spr.anchor.set(0, 0);
                spr.position.set(
                    xStart + col * TILE,
                    yStart + row * TILE
                );
                spr.zIndex = -20; // 유닛/성보다 뒤쪽
                layer.addChild(spr);
            }
        }
    } else {
        // (체크 패턴 fallback 부분은 그대로 둬도 됨)
        // ...
    }

    // =============================
    // 2) 레인 경계선 + 상하 테두리 (기존 그대로)
    // =============================
    const gLines = new PIXI.Graphics();

    // 레인 사이 구분선
    for (let i = 1; i < laneCount; i++) {
        const y = padding + laneHeight * i;
        gLines.moveTo(padding, y).lineTo(padding + rectW, y);
    }

    // 위/아래 테두리
    gLines.moveTo(padding, padding).lineTo(padding + rectW, padding);
    gLines
        .moveTo(padding, padding + rectH)
        .lineTo(padding + rectW, padding + rectH);

    gLines.stroke({
        width: 1,
        color: 0x111827,
        alpha: 0.9,
    });

    layer.addChild(gLines);
}

