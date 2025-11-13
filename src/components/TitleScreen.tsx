// src/components/TitleScreen.tsx
import React from "react";
import { useUiStore } from "../state/uiStore";

export function TitleScreen() {
    const gotoLobby = useUiStore((s) => s.gotoLobby);

    return (
        <div className="screen screen-title">
            <div className="screen-inner">
                <h1 className="game-title">퀴즈 라인 배틀</h1>
                <p className="game-subtitle">퀴즈를 맞춰 유닛을 소환해서 라인을 밀어보자!</p>
                <button className="btn btn-primary" onClick={gotoLobby}>
                    시작하기
                </button>
            </div>
        </div>
    );
}
