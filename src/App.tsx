// src/App.tsx
import React from "react";
import { GameCanvas } from "./components/GameCanvas";
import { useGameStore, GameMode } from "./state/gameStore";
import { supa } from "./lib/supabaseClient";
import { UnitBar } from "./components/UnitBar";
import { QuizModal } from "./components/QuizModal";
import { HUD } from "./components/HUD";
import { AISpawner } from "./controllers/AISpawner";
import { GameOverModal } from "./components/GameOverModal";

export default function App() {
    const {
        paused,
        setPaused,
        tick,
        gameMode,
        setGameMode,
        laneCount,
        lastResult,
    } = useGameStore();

    const setMode = (m: GameMode) => () => setGameMode(m);

    return (
        <div className="app">
            <header className="app__header">
                <h1>Quiz Line Battle — MVP</h1>

                <div className="app__controls" style={{ flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={setMode("tutorial1")} disabled={gameMode === "tutorial1"}>
                            튜토리얼 (1레인)
                        </button>
                        <button onClick={setMode("ai1")} disabled={gameMode === "ai1"}>
                            AI 대전 (1레인)
                        </button>
                        <button onClick={setMode("ai2")} disabled={gameMode === "ai2"}>
                            AI 대전 (2레인)
                        </button>
                        <button onClick={setMode("pvp2")} disabled={gameMode === "pvp2"}>
                            온라인 배틀 (2레인)
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setPaused(!paused)}>
                            {paused ? "▶ 재생" : "⏸ 일시정지"}
                        </button>
                        <button onClick={tick}>틱 +1 (디버그)</button>
                        <button
                            onClick={async () => {
                                const { error } = await supa
                                    .from("_health")
                                    .select("*")
                                    .limit(1);
                                alert(
                                    error
                                        ? `Supabase 연결 실패: ${error.message}`
                                        : "Supabase OK (테이블 없으면 무시)"
                                );
                            }}
                        >
                            Supabase 체크
                        </button>
                    </div>

                    <div style={{ opacity: 0.85 }}>
                        <small>
                            mode: <b>{gameMode}</b> · lanes: <b>{laneCount}</b>
                            {lastResult && (
                                <>
                                    {" "}
                                    | 최근 결과:{" "}
                                    <b>{lastResult.correct ? "정답" : "오답"}</b>{" "}
                                    (Lv{lastResult.diff}, lane {lastResult.lane + 1})
                                </>
                            )}
                        </small>
                    </div>
                </div>
            </header>

            <main className="app__main">
                {/* 상단: 전투 필드 (스크롤 뷰 + 오버레이 HUD/UnitBar) */}
                <div className="app__battle">
                    <div className="battle-scroll">
                        {/* 이 안이 가로로 길어지고, 좌우 스크롤/드래그 가능 */}
                        <GameCanvas />
                    </div>
                    <HUD />
                    <UnitBar />
                </div>

                {/* 하단: 퀴즈 도크 (모달 대신) */}
                <div className="app__quiz">
                    <QuizModal />
                </div>

                {/* 게임 로직 컨트롤러 */}
                <AISpawner />
                <GameOverModal />
            </main>
        </div>
    );
}
