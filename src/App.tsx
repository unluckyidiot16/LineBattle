// src/App.tsx
import React, { useEffect, useRef, useState } from "react";

import { useUiStore, StageId } from "./state/uiStore";
import { useGameStore, GameMode } from "./state/gameStore";

import { TitleScreen } from "./screens/TitleScreen";
import { LobbyScreen } from "./screens/LobbyScreen";
import { StageSelectScreen } from "./screens/StageSelectScreen";

import { GameCanvas } from "./components/GameCanvas";
import { HUD } from "./components/HUD";
import { UnitBar } from "./components/UnitBar";
import { QuizModal } from "./components/QuizModal";
import { AISpawner } from "./controllers/AISpawner";
import { GameOverModal } from "./components/GameOverModal";

export default function App() {
    const scene = useUiStore((s) => s.scene);
    const currentStageId = useUiStore((s) => s.currentStageId);
    const completeStage = useUiStore((s) => s.completeStage);

    const {
        ended,
        winner,
        resetMatch,
        setGameMode,
    } = useGameStore();

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

    // ============================
    // 전투 진입 시: GameMode / match 초기화
    // ============================
    const lastStageRef = useRef<StageId | null>(null);

    useEffect(() => {
        if (scene !== "battle") return;
        if (!currentStageId) return;
        if (lastStageRef.current === currentStageId) return;

        const mapStageToMode = (id: StageId): GameMode => {
            if (id === "tutorial") return "tutorial1";
            // 지금은 전부 1레인 AI 스테이지로 통일
            return "ai1";
        };

        const mode = mapStageToMode(currentStageId);
        setGameMode(mode);
        resetMatch();

        lastStageRef.current = currentStageId;
    }, [scene, currentStageId, resetMatch, setGameMode]);

    // ============================
    // 전투 종료 감지 → 스테이지 클리어 처리
    // ============================
    const handledResultRef = useRef(false);

    useEffect(() => {
        if (scene !== "battle") {
            handledResultRef.current = false;
            return;
        }
        if (!currentStageId) return;
        if (!ended || !winner) return;
        if (handledResultRef.current) return;

        const win = winner === "ally";
        completeStage(currentStageId, win);
        handledResultRef.current = true;
    }, [scene, currentStageId, ended, winner, completeStage]);

    // ============================
    // 씬 분기
    // ============================

    if (scene === "title") {
        return <TitleScreen />;
    }

    if (scene === "lobby") {
        return <LobbyScreen />;
    }

    if (scene === "stageSelect") {
        return <StageSelectScreen />;
    }

    // battle
    if (scene === "battle") {
        return (
            <div className="app app--battle">
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

                    {/* 하단 퀴즈 영역 */}
                    <QuizModal />

                    {/* 나머지 컨트롤러 / 모달 */}
                    <AISpawner />
                    <GameOverModal />
                </main>
            </div>
        );
    }

    // 혹시 모를 fallback
    return null;
}
