// src/components/GameBase.tsx
import React from "react";
import { BASE_HP } from "../config/balance";
import { Side, useGameStore } from "../state/gameStore";

type Props = {
    side: Side;
};

export const GameBase: React.FC<Props> = ({ side }) => {
    const hp = useGameStore((s) => (side === "ally" ? s.baseAlly : s.baseEnemy));
    const maxHp = BASE_HP;

    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const label = side === "ally" ? "우리 기지" : "적 기지";

    const align: React.CSSProperties =
        side === "ally"
            ? { left: 24, alignItems: "flex-start" }
            : { right: 24, alignItems: "flex-end" };

    return (
        <div
            style={{
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                pointerEvents: "none",
                ...align,
            }}
        >
            {/* 실제 기지 건물 */}
            <div
                style={{
                    width: 40,
                    height: 64,
                    borderRadius: 4,
                    border: "2px solid #e5e7eb",
                    background: side === "ally" ? "#1d4ed8" : "#b91c1c",
                    boxShadow: "0 0 8px rgba(0,0,0,0.35)",
                }}
            />

            {/* HP 바 */}
            <div
                style={{
                    width: 80,
                    height: 8,
                    borderRadius: 999,
                    background: "#111827",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: `${ratio * 100}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: side === "ally" ? "#60a5fa" : "#f97373",
                        transition: "width 0.2s ease-out",
                    }}
                />
            </div>

            {/* 텍스트 */}
            <div
                style={{
                    fontSize: 10,
                    color: "#e5e7eb",
                    textShadow: "0 1px 2px rgba(0,0,0,0.75)",
                }}
            >
                {label} {hp}/{maxHp}
            </div>
        </div>
    );
};
