// src/App.tsx
import React, { useRef, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { useGameStore, GameMode } from "./state/gameStore";
import { supa } from "./lib/supabaseClient";
import { UnitBar } from "./components/UnitBar";
import { QuizModal } from "./components/QuizModal";
import { HUD } from "./components/HUD";
import { AISpawner } from "./controllers/AISpawner";
import { GameOverModal } from "./components/GameOverModal";

export default function App() {
    const { paused, setPaused, tick, gameMode, setGameMode, laneCount, lastResult } = useGameStore();

    const setMode = (m: GameMode) => () => setGameMode(m);

    // ===== 전장 드래그 스크롤 상태 =====
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [dragging, setDragging] = useState(false);
    const dragStartXRef = useRef(0);
    const dragStartScrollLeftRef = useRef(0);

    const handleMouseDownBattle = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!scrollRef.current) return;
        setDragging(true);
        dragStartXRef.current = e.clientX;
        dragStartScrollLeftRef.current = scrollRef.current.scrollLeft;
        e.preventDefault(); // 텍스트 선택 방지
    };

    const handleMouseMoveBattle = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragging || !scrollRef.current) return;
        const dx = e.clientX - dragStartXRef.current;
        scrollRef.current.scrollLeft = dragStartScrollLeftRef.current - dx;
    };

    const handleMouseUpOrLeaveBattle = () => {
        if (dragging) setDragging(false);
    };

    const handleTouchStartBattle = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!scrollRef.current) return;
        setDragging(true);
        dragStartXRef.current = e.touches[0]?.clientX ?? 0;
        dragStartScrollLeftRef.current = scrollRef.current.scrollLeft;
    };

    const handleTouchMoveBattle = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!dragging || !scrollRef.current) return;
        const x = e.touches[0]?.clientX ?? dragStartXRef.current;
        const dx = x - dragStartXRef.current;
        scrollRef.current.scrollLeft = dragStartScrollLeftRef.current - dx;
    };

    const handleTouchEndBattle = () => {
        if (dragging) setDragging(false);
    };


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
                        <button onClick={() => setPaused(!paused)}>{paused ? "▶ 재생" : "⏸ 일시정지"}</button>
                        <button onClick={tick}>틱 +1 (디버그)</button>
                        <button
                            onClick={async () => {
                                const { error } = await supa.from("_health").select("*").limit(1);
                                alert(error ? `Supabase 연결 실패: ${error.message}` : "Supabase OK (테이블 없으면 무시)");
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
                                    {" "}| 최근 결과: <b>{lastResult.correct ? "정답" : "오답"}</b>
                                    {" "}(Lv{lastResult.diff}, lane {lastResult.lane + 1})
                                </>
                            )}
                        </small>
                    </div>
                </div>
            </header>

            <main className="app__main">
                {/* 전투 필드: 가로 스크롤 컨테이너 */}
                <div
                    className="battle-scroll"
                    ref={scrollRef}
                    onMouseDown={handleMouseDownBattle}
                    onMouseMove={handleMouseMoveBattle}
                    onMouseUp={handleMouseUpOrLeaveBattle}
                    onMouseLeave={handleMouseUpOrLeaveBattle}
                    onTouchStart={handleTouchStartBattle}
                    onTouchMove={handleTouchMoveBattle}
                    onTouchEnd={handleTouchEndBattle}
                    style={{ cursor: dragging ? "grabbing" : "grab" }}
                >
                    <GameCanvas />
                </div>

                {/* HUD / 유닛바: 화면 위에 오버레이 */}
                <HUD />
                <UnitBar />

                {/* 하단 퀴즈 영역(퀴즈 없을 때는 '대기 중' 안내 표시) */}
                <QuizModal />

                {/* 나머지 컨트롤러 / 모달 */}
                <AISpawner />
                <GameOverModal />
            </main>
        </div>
    );
}
