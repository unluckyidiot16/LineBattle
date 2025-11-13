// src/screens/StageSelectScreen.tsx
import React from "react";
import { STAGES, useUiStore } from "../state/uiStore";

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

            <main className="screen-body">
                <div className="stage-grid">
                    {STAGES.map((stage) => {
                        const unlocked = unlockedStageIds.includes(stage.id);
                        const cleared = clearedStageIds.includes(stage.id);

                        return (
                            <button
                                key={stage.id}
                                disabled={!unlocked}
                                onClick={() => startStage(stage.id)}
                                className={[
                                    "stage-card",
                                    !unlocked
                                        ? "stage-card--locked"
                                        : cleared
                                            ? "stage-card--cleared"
                                            : "stage-card--available",
                                ].join(" ")}
                            >
                                <div className="stage-card__label">
                                    {stage.shortLabel}
                                </div>
                                <div className="stage-card__name">
                                    {stage.name}
                                </div>
                                <div className="stage-card__status">
                                    {!unlocked && "잠김"}
                                    {unlocked && !cleared && "도전 가능"}
                                    {cleared && "클리어!"}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
