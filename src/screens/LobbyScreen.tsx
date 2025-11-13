// src/screens/LobbyScreen.tsx
import React from "react";
import { useUiStore } from "../state/uiStore";

export function LobbyScreen() {
    const gotoTitle = useUiStore((s) => s.gotoTitle);
    const gotoStageSelect = useUiStore((s) => s.gotoStageSelect);
    const unlockedCharCount = useUiStore((s) => s.unlockedCharCount);

    return (
        <div className="screen screen-lobby">
            <header className="screen-header">
                <button className="btn btn-ghost" onClick={gotoTitle}>
                    ← 타이틀
                </button>
                <h2>로비</h2>
            </header>

            <main className="screen-body">
                <section className="lobby-section">
                    <div className="lobby-card">
                        <div className="lobby-card__title">해금된 캐릭터</div>
                        <div className="lobby-card__value">
                            {unlockedCharCount} / 6
                        </div>
                        <div className="lobby-card__desc">
                            스테이지를 클리어할 때마다 새로운 캐릭터가 1명씩 해금됩니다.
                        </div>
                    </div>
                </section>

                <section className="lobby-actions">
                    <button className="btn btn-primary" onClick={gotoStageSelect}>
                        싱글 스테이지
                    </button>
                    <button className="btn btn-disabled" disabled>
                        멀티 (준비 중)
                    </button>
                </section>
            </main>
        </div>
    );
}
