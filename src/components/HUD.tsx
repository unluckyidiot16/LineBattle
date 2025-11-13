// src/components/HUD.tsx
import React from "react";
import { useGameStore } from "../state/gameStore";

function fmt(sec: number) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(1,"0")}:${String(r).padStart(2,"0")}`;
}

export function HUD() {
    const {
        timeSec, maxSec, baseAlly, baseEnemy, scoreAlly, scoreEnemy,
        paused, ended, startMatch, resetMatch
    } = useGameStore();

    return (
        <div className="hud">
            <div className="hud__row">
                <div className="hud__block">
                    <div className="hud__label">TIME</div>
                    <div className="hud__value">{fmt(maxSec - timeSec)}</div>
                </div>
                <div className="hud__block">
                    <div className="hud__label">ALLY</div>
                    <div className="hud__value">{scoreAlly}</div>
                    <div className="hud__hp"><span style={{width:`${(baseAlly/200)*100}%`}}/></div>
                </div>
                <div className="hud__block">
                    <div className="hud__label">ENEMY</div>
                    <div className="hud__value">{scoreEnemy}</div>
                    <div className="hud__hp"><span style={{width:`${(baseEnemy/200)*100}%`}}/></div>
                </div>
                <div className="hud__block">
                    {!ended ? (
                        <button onClick={() => startMatch()} disabled={!paused && timeSec>0}>Start</button>
                    ) : (
                        <button onClick={() => resetMatch()}>Reset</button>
                    )}
                </div>
            </div>
            {ended && (
                <div className="hud__banner">
                    {baseEnemy<=0 ? "🎉 승리!" : baseAlly<=0 ? "💥 패배" : "⏱ 시간 종료"}
                </div>
            )}
        </div>
    );
}
