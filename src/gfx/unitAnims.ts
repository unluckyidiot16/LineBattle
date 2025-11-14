// src/gfx/unitAnims.ts ★ 전체 교체 (Pixi v8 대응 + Vite BASE_URL 대응)

import * as PIXI from "pixi.js";

// === Vite BASE_URL 기반 경로 헬퍼 ==========================
// dev  : BASE_URL = "/"          → "/assets/..."
//
// build: BASE_URL = "/LineBattle/"
//        (vite.config.ts의 base 설정)
//        → "/LineBattle/assets/..."
const BASE_URL = (import.meta as any).env?.BASE_URL ?? "/";

function assetPath(rel: string): string {
    const base = BASE_URL.replace(/\/$/, "");          // 끝 슬래시 제거
    const clean = rel.replace(/^\/+/, "");             // 앞 슬래시 제거
    return `${base}/${clean}`;                         // "/LineBattle/assets/..." 또는 "/assets/..."
}

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
    /** 스프라이트 시트 경로 */
    src: string;
    frameWidth: number;
    frameHeight: number;
    frames: number;
    fps: number;
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
 * - 실제 PNG 파일은 public/assets/units/... 에 두고,
 *   src 경로는 assetPath("assets/units/...") 로 생성합니다.
 */
export const UNIT_ANIMS: Record<
    UnitKind,
    Partial<Record<AnimName, AnimSheetDef>>
> = {
    // Warrior (192x192, Idle 8 / Run 6 / Attack 4)
    warrior: {
        idle: collect({
            src: assetPath("assets/units/warrior/Warrior_Idle.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 8,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: assetPath("assets/units/warrior/Warrior_Run.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: assetPath("assets/units/warrior/Warrior_Attack.png"),
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
            src: assetPath("assets/units/lancer/Lancer_Idle.png"),
            frameWidth: 320,
            frameHeight: 320,
            frames: 12,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: assetPath("assets/units/lancer/Lancer_Run.png"),
            frameWidth: 320,
            frameHeight: 320,
            frames: 6,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: assetPath("assets/units/lancer/Lancer_Attack.png"),
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
            src: assetPath("assets/units/archer/Archer_Idle.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: assetPath("assets/units/archer/Archer_Run.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 4,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: assetPath("assets/units/archer/Archer_Attack.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 8,
            fps: 12,
            loop: true,
        }),
    },

    // Healer (192x192, Idle 6 / Run 4 / Attack 11)
    healer: {
        idle: collect({
            src: assetPath("assets/units/healer/Healer_Idle.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: assetPath("assets/units/healer/Healer_Run.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 4,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: assetPath("assets/units/healer/Healer_Attack.png"),
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
            src: assetPath("assets/units/pawn/Pawn_Idle.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: assetPath("assets/units/pawn/Pawn_Run.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: assetPath("assets/units/pawn/Pawn_Attack.png"),
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
            src: assetPath("assets/units/pawnArcher/PawnArcher_Idle.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        }),
        run: collect({
            src: assetPath("assets/units/pawnArcher/PawnArcher_Run.png"),
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 10,
            loop: true,
        }),
        attack: collect({
            src: assetPath("assets/units/pawnArcher/PawnArcher_Attack.png"),
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

function makeKey(def: AnimSheetDef): string {
    return `${def.src}|${def.frameWidth}x${def.frameHeight}|${def.frames}`;
}

/** 시트에서 잘라낸 텍스처 배열 반환 */
function getTextures(def: AnimSheetDef): PIXI.Texture[] | null {
    const key = makeKey(def);
    const cached = textureCache.get(key);
    if (cached) return cached;

    const baseTex = PIXI.Assets.get(def.src) as PIXI.Texture | undefined;
    if (!baseTex) {
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

    const direct = table[anim];
    if (direct) return direct;
    if (anim !== "idle" && table.idle) return table.idle;
    if (anim !== "run" && table.run) return table.run;
    if (anim !== "attack" && table.attack) return table.attack;
    return null;
}

/** 유닛 스프라이트 전부 미리 로딩 */
export async function preloadUnitAnims(): Promise<void> {
    const ids = Array.from(new Set(ALL_DEFS.map((d) => d.src)));
    if (!ids.length) return;
    await PIXI.Assets.load(ids);
}

/** 새 유닛 스프라이트 생성 */
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

/** 기존 스프라이트 애니메이션 교체 */
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

/** diff -> 유닛 종류 매핑 (임시) */
export function unitKindFromDiff(diff: number): UnitKind {
    const d = Math.max(1, Math.min(6, diff));
    if (d === 1) return "pawn";
    if (d === 2) return "pawnArcher";
    if (d === 3) return "warrior";
    if (d === 4) return "lancer";
    if (d === 5) return "archer";
    return "healer";
}
