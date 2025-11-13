// src/components/StageSelectScreen.tsx
import React from "react";
import { useUiStore } from "../state/uiStore";
import { STAGES } from "../state/uiStore";

export function StageSelectScreen() {
    const unlockedStageIds = useUiStore((s) => s.unlockedStageIds);
    const clearedStageIds = useUiStore((s) => s.clearedStageIds);
    const startStage = useUiStore((s) => s.startStage);
    const gotoLobby = useUiStore((s) => s.gotoLobby);

    return (
        <div className="screen screen-stage-select">
            <header className="screen-header">
                <button className="btn btn-ghost" onClick={gotoLobby}>
                    ← 로비
                </button>
                <h2>스테이지 선택</h2>
            </header>

            <div className="stage-grid">
                {STAGES.map((stage) => {
                    const unlocked = unlockedStageIds.includes(stage.id);
                    const cleared = clearedStageIds.includes(stage.id);

                    return (
                        <button
                            key={stage.id}
                            className={`stage-card ${
                                !unlocked ? "stage-locked" : cleared ? "stage-cleared" : ""
                            }`}
                            disabled={!unlocked}
                            onClick={() => startStage(stage.id)}
                        >
                            <div className="stage-label">{stage.shortLabel}</div>
                            <div className="stage-name">{stage.name}</div>
                            {!unlocked && <div className="stage-status">잠김</div>}
                            {unlocked && !cleared && <div className="stage-status">도전 가능</div>}
                            {cleared && <div className="stage-status">클리어!</div>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
