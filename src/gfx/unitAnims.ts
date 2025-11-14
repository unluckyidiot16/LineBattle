// src/gfx/unitAnims.ts ★ 전체 교체 (Pixi v8 대응 + 6종 유닛)

import * as PIXI from "pixi.js";

// 전투에서 사용할 유닛 종류
export type UnitKind =
    | "warrior"
    | "lancer"
    | "archer"
    | "healer"
    | "pawn"
    | "pawnArcher";

// 현재는 idle / run / attack 3가지만 사용
export type AnimName = "idle" | "attack" | "run";

export type AnimSheetDef = {
    /** 스프라이트 시트 경로 (Vite 기준: public/ 이하 또는 정적 경로) */
    src: string;
    /** 한 프레임의 픽셀 너비 */
    frameWidth: number;
    /** 한 프레임의 픽셀 높이 */
    frameHeight: number;
    /** 사용할 프레임 개수 */
    frames: number;
    /** 초당 재생 프레임 수 (12~16 정도 추천) */
    fps: number;
    /** 반복 여부 */
    loop: boolean;
};

// 내부: 모든 애니메이션 정의를 모아두는 리스트 (preload용)
const ALL_DEFS: AnimSheetDef[] = [];

function collect(def: AnimSheetDef): AnimSheetDef {
    ALL_DEFS.push(def);
    return def;
}

/**
 * 유닛별 애니메이션 메타데이터
 * - 실제 PNG 파일은 public/assets/units/... 등 원하는 위치에 두고,
 *   src 경로만 맞춰주면 됩니다.
 *
 * ⚠️ 파일 이름/경로는 프로젝트 실제 구조에 맞게 수정해 주세요.
 */
export const UNIT_ANIMS: Record<
    UnitKind,
    Partial<Record<AnimName, AnimSheetDef>>
> = {
    // Warrior (192x192, Idle 8 / Run 6 / Attack 4)
    warrior: {
        idle: collect({
            src: "assets/units/warrior/Warrior_Idle.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 8,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: "assets/units/warrior/Warrior_Run.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: "assets/units/warrior/Warrior_Attack.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 4,
            fps: 12,
            loop: true,
        }),
    },

    // Lancer (320x320, Idle 12 / Run 6 / Attack 3)
    lancer: {
        idle: collect({
            src: "assets/units/lancer/Lancer_Idle.png",
            frameWidth: 320,
            frameHeight: 320,
            frames: 12,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: "assets/units/lancer/Lancer_Run.png",
            frameWidth: 320,
            frameHeight: 320,
            frames: 6,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: "assets/units/lancer/Lancer_Attack.png",
            frameWidth: 320,
            frameHeight: 320,
            frames: 3,
            fps: 12,
            loop: true,
        }),
    },

    // Archer (192x192, Idle 6 / Run 4 / Attack 8)
    archer: {
        idle: collect({
            src: "assets/units/archer/Archer_Idle.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: "assets/units/archer/Archer_Run.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 4,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: "assets/units/archer/Archer_Attack.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 8,
            fps: 12,
            loop: true,
        }),
    },

    // Healer (192x192, Idle 6 / Run 4 / Attack 11) - 공격 대신 힐 연출
    healer: {
        idle: collect({
            src: "assets/units/healer/Healer_Idle.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: "assets/units/healer/Healer_Run.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 4,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: "assets/units/healer/Healer_Attack.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 11,
            fps: 12,
            loop: true,
        }),
    },

    // Pawn (192x192, Idle 6 / Run 6 / Attack 6)
    pawn: {
        idle: collect({
            src: "assets/units/pawn/Pawn_Idle.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: "assets/units/pawn/Pawn_Run.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: "assets/units/pawn/Pawn_Attack.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 12,
            loop: true,
        }),
    },

    // PawnArcher (192x192, Idle 6 / Run 6 / Attack 8)
    pawnArcher: {
        idle: collect({
            src: "assets/units/pawnArcher/PawnArcher_Idle.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: "assets/units/pawnArcher/PawnArcher_Run.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: "assets/units/pawnArcher/PawnArcher_Attack.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 8,
            fps: 12,
            loop: true,
        }),
    },
};

/** 내부: 시트 → 텍스처 배열 캐시 */
const textureCache = new Map<string, PIXI.Texture[]>();

let assetsInitialized = false;  // ★ 추가

function makeKey(def: AnimSheetDef): string {
    return `${def.src}|${def.frameWidth}x${def.frameHeight}|${def.frames}`;
}

/**
 * Pixi v8에서는 Texture.from이 로딩을 하지 않기 때문에,
 * 반드시 Assets.load(...)로 미리 로딩된 텍스처를 사용해야 한다.
 */
function getTextures(def: AnimSheetDef): PIXI.Texture[] | null {
    const key = makeKey(def);
    const cached = textureCache.get(key);
    if (cached) return cached;

    const baseTex = PIXI.Assets.get(def.src) as PIXI.Texture | undefined;
    if (!baseTex) {
        // 아직 로딩 안 된 경우: null 반환 (다음 프레임에 다시 시도)
        console.warn("[unitAnims] texture not loaded yet:", def.src);
        return null;
    }

    const list: PIXI.Texture[] = [];

    for (let i = 0; i < def.frames; i++) {
        list.push(
            new PIXI.Texture({
                source: baseTex.source,
                frame: new PIXI.Rectangle(
                    i * def.frameWidth,
                    0,
                    def.frameWidth,
                    def.frameHeight
                ),
            })
        );
    }

    textureCache.set(key, list);
    return list;
}

function resolveAnimDef(kind: UnitKind, anim: AnimName): AnimSheetDef | null {
    const table = UNIT_ANIMS[kind];
    if (!table) return null;

    // 우선 순위: 요청 anim → idle → run → attack
    const direct = table[anim];
    if (direct) return direct;
    if (anim !== "idle" && table.idle) return table.idle;
    if (anim !== "run" && table.run) return table.run;
    if (anim !== "attack" && table.attack) return table.attack;
    return null;
}

/**
 * 유닛 스프라이트 시트 전부 미리 로딩
 * - GameCanvas에서 app.init() 이후에 한 번만 호출해 주세요.
 */
export async function preloadUnitAnims(): Promise<void> {
    const ids = Array.from(new Set(ALL_DEFS.map((d) => d.src)));
    if (!ids.length) return;

    // ★ 한 번만 Pixi Assets basePath 설정
    if (!assetsInitialized) {
        const basePath = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/+$/, "") + "/";
        await PIXI.Assets.init({
            basePath,  // 예: http://localhost:5173/  또는 https://unluckyidiot16.github.io/LineBattle/
        });
        assetsInitialized = true;
    }

    await PIXI.Assets.load(ids);
}

/**
 * 새 유닛 스프라이트 생성 (기본 anchor는 중앙)
 */
export function createUnitSprite(
    kind: UnitKind,
    anim: AnimName = "idle"
): PIXI.AnimatedSprite | null {
    const def = resolveAnimDef(kind, anim);
    if (!def) return null;

    const tex = getTextures(def);
    if (!tex || tex.length === 0) return null;

    const sprite = new PIXI.AnimatedSprite(tex);
    sprite.loop = def.loop;
    sprite.animationSpeed = def.fps > 0 ? def.fps / 60 : 0;
    sprite.anchor.set(0.5, 0.5);

    if (def.fps > 0) {
        sprite.play();
    } else {
        sprite.gotoAndStop(0);
    }

    (sprite as any)._unitKind = kind;
    (sprite as any)._animName = anim;

    return sprite;
}

/**
 * 기존 스프라이트의 애니메이션을 교체
 */
export function setUnitAnimation(
    sprite: PIXI.AnimatedSprite,
    kind: UnitKind,
    anim: AnimName
) {
    const currentKind = (sprite as any)._unitKind as UnitKind | undefined;
    const currentAnim = (sprite as any)._animName as AnimName | undefined;

    if (currentKind === kind && currentAnim === anim) return;

    const def = resolveAnimDef(kind, anim);
    if (!def) return;

    const tex = getTextures(def);
    if (!tex || tex.length === 0) return;

    sprite.textures = tex;
    sprite.loop = def.loop;
    sprite.animationSpeed = def.fps > 0 ? def.fps / 60 : 0;

    if (def.fps > 0) {
        sprite.gotoAndPlay(0);
    } else {
        sprite.gotoAndStop(0);
    }

    (sprite as any)._unitKind = kind;
    (sprite as any)._animName = anim;
}

/**
 * diff(난이도)를 임시로 유닛 종류에 매핑
 * - 나중에는 UnitEnt 안에 kind 필드를 추가해서 교체하면 됩니다.
 */
export function unitKindFromDiff(diff: number): UnitKind {
    const d = Math.max(1, Math.min(6, diff));

    if (d === 1) return "pawn";
    if (d === 2) return "pawnArcher";
    if (d === 3) return "warrior";
    if (d === 4) return "lancer";
    if (d === 5) return "archer";
    return "healer";
}
