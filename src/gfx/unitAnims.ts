// src/gfx/unitAnims.ts
import * as PIXI from "pixi.js";

// 전투에서 사용할 유닛 종류 (6종)
export type UnitKind =
    | "archer"
    | "healer"
    | "lancer"
    | "pawn"
    | "pawnArcher"
    | "warrior";

// 현재는 idle / run / attack 3가지 상태만 사용
export type AnimName = "idle" | "run" | "attack";

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

/**
 * 유닛별 애니메이션 메타데이터
 * - 실제 PNG 파일은 public/assets/units/... 등 원하는 위치에 두고,
 *   src 경로만 맞춰주면 됩니다.
 *
 * ★ 해상도
 *   - Lancer: 320 x 320
 *   - 나머지: 192 x 192
 *
 * ★ 프레임 수
 *   Archer      [Idle: 6 | Run: 4 | Attack: 8]
 *   Healer      [Idle: 6 | Run: 4 | Attack: 11]
 *   Lancer      [Idle:12 | Run: 6 | Attack: 3]
 *   Pawn        [Idle: 6 | Run: 6 | Attack: 6]
 *   PawnArcher  [Idle: 6 | Run: 6 | Attack: 8]
 *   Warrior     [Idle: 8 | Run: 6 | Attack: 4]
 */
export const UNIT_ANIMS: Record<
    UnitKind,
    Partial<Record<AnimName, AnimSheetDef>>
> = {
    archer: {
        idle: {
            src: "/assets/units/archer/Archer_Idle.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        },
        run: {
            src: "/assets/units/archer/Archer_Run.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 4,
            fps: 10,
            loop: true,
        },
        attack: {
            // 업로드된 시트: Archer_Attack.png (192 x 1536 → 8프레임)
            src: "/assets/units/archer/Archer_Attack.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 8,
            fps: 12,
            loop: true,
        },
    },

    healer: {
        idle: {
            src: "/assets/units/healer/Healer_Idle.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        },
        run: {
            src: "/assets/units/healer/Healer_Run.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 4,
            fps: 10,
            loop: true,
        },
        attack: {
            // 업로드된 시트: Attack.png (186 x 2048 → 11프레임)
            // 힐 연출을 attack 상태로 사용
            src: "/assets/units/healer/Attack.png",
            frameWidth: 186,
            frameHeight: 186,
            frames: 11,
            fps: 12,
            loop: true,
        },
    },

    lancer: {
        idle: {
            src: "/assets/units/lancer/Lancer_Idle.png",
            frameWidth: 320,
            frameHeight: 320,
            frames: 12,
            fps: 6,
            loop: true,
        },
        run: {
            src: "/assets/units/lancer/Lancer_Run.png",
            frameWidth: 320,
            frameHeight: 320,
            frames: 6,
            fps: 10,
            loop: true,
        },
        attack: {
            // 업로드된 시트: Lancer_Attack.png (320 x 960 → 3프레임)
            src: "/assets/units/lancer/Lancer_Attack.png",
            frameWidth: 320,
            frameHeight: 320,
            frames: 3,
            fps: 12,
            loop: true,
        },
    },

    pawn: {
        idle: {
            src: "/assets/units/pawn/Pawn_Idle.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        },
        run: {
            src: "/assets/units/pawn/Pawn_Run.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 10,
            loop: true,
        },
        attack: {
            // 업로드된 시트: Pawn_Attack.png (192 x 1152 → 6프레임)
            src: "/assets/units/pawn/Pawn_Attack.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 12,
            loop: true,
        },
    },

    pawnArcher: {
        idle: {
            src: "/assets/units/pawnArcher/PawnArcher_Idle.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 6,
            loop: true,
        },
        run: {
            src: "/assets/units/pawnArcher/PawnArcher_Run.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 10,
            loop: true,
        },
        attack: {
            // 업로드된 시트: PawnArcher_Attack.png (192 x 1536 → 8프레임)
            src: "/assets/units/pawnArcher/PawnArcher_Attack.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 8,
            fps: 12,
            loop: true,
        },
    },

    warrior: {
        idle: {
            src: "/assets/units/warrior/Warrior_Idle.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 8,
            fps: 6,
            loop: true,
        },
        run: {
            src: "/assets/units/warrior/Warrior_Run.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 6,
            fps: 10,
            loop: true,
        },
        attack: {
            // 업로드된 시트: Warrior_Attack.png (192 x 768 → 4프레임)
            src: "/assets/units/warrior/Warrior_Attack.png",
            frameWidth: 192,
            frameHeight: 192,
            frames: 4,
            fps: 12,
            loop: true,
        },
    },
};

/** 내부: 시트 → 텍스처 배열 캐시 */
const textureCache = new Map<string, PIXI.Texture[]>();

function makeKey(def: AnimSheetDef): string {
    return `${def.src}|${def.frameWidth}x${def.frameHeight}|${def.frames}`;
}

function getTextures(def: AnimSheetDef): PIXI.Texture[] {
    const key = makeKey(def);
    const cached = textureCache.get(key);
    if (cached) return cached;

    const base = PIXI.BaseTexture.from(def.src);
    const list: PIXI.Texture[] = [];

    for (let i = 0; i < def.frames; i++) {
        list.push(
            new PIXI.Texture({
                baseTexture: base,
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

    // 우선 순위: 요청 anim → idle → attack → run
    const direct = table[anim];
    if (direct) return direct;

    if (anim !== "idle" && table.idle) return table.idle;
    if (anim !== "attack" && table.attack) return table.attack;
    if (anim !== "run" && table.run) return table.run;

    return null;
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
    const sprite = new PIXI.AnimatedSprite(tex);
    sprite.loop = def.loop;
    sprite.animationSpeed = def.fps > 0 ? def.fps / 60 : 0; // 60fps 기준
    sprite.anchor.set(0.5, 0.5);
    if (def.fps > 0) sprite.play();

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
 * diff(난이도)를 유닛 종류에 매핑
 * - 추후 UnitEnt 안에 kind 필드를 직접 넣는 방식으로 교체 예정.
 */
export function unitKindFromDiff(diff: number): UnitKind {
    const d = Math.max(1, Math.min(6, diff));
    if (d === 1) return "pawn";
    if (d === 2) return "pawnArcher";
    if (d === 3) return "warrior";
    if (d === 4) return "lancer";
    if (d === 5) return "archer";
    return "healer"; // d === 6
}
