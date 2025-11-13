// src/components/GameOverModal.tsx
import React, { useEffect, useRef } from "react";
import { useGameStore } from "../state/gameStore";
import { MATCH_SEC } from "../config/balance";
import { useUiStore } from "../state/uiStore";

export const GameOverModal: React.FC = () => {
    const {
        ended,
        baseAlly,
        baseEnemy,
        scoreAlly,
        scoreEnemy,
        timeSec,
        maxSec,
        resetMatch,
    } = useGameStore((s) => ({
        ended: s.ended,
        baseAlly: s.baseAlly,
        baseEnemy: s.baseEnemy,
        scoreAlly: s.scoreAlly,
        scoreEnemy: s.scoreEnemy,
        timeSec: s.timeSec,
        maxSec: s.maxSec,
        resetMatch: s.resetMatch,
    }));

    const { scene, currentStageId, completeStage } = useUiStore((s) => ({
        scene: s.scene,
        currentStageId: s.currentStageId,
        completeStage: s.completeStage,
    }));

    // 전투가 끝나지 않았으면 모달도 안 보임
    if (!ended) return null;

    // HP 기준 우선 판정
    const hpResult =
        baseAlly <= 0 && baseEnemy <= 0
            ? "draw"
            : baseAlly <= 0
                ? "lose"
                : baseEnemy <= 0
                    ? "win"
                    : null;

    const timeUp = timeSec >= maxSec;

    let title = "무승부";
    let reasonText = "";

    if (hpResult === "win") {
        title = "승리!";
        reasonText = "적 기지를 파괴했습니다.";
    } else if (hpResult === "lose") {
        title = "패배...";
        reasonText = "우리 기지가 파괴되었습니다.";
    } else if (hpResult === "draw") {
        title = "무승부";
        reasonText = "양쪽 기지가 동시에 파괴되었습니다.";
    } else if (timeUp) {
        if (scoreAlly > scoreEnemy) {
            title = "승리!";
            reasonText = "시간 종료 시 점수 우위로 승리했습니다.";
        } else if (scoreAlly < scoreEnemy) {
            title = "패배...";
            reasonText = "시간 종료 시 점수 열세로 패배했습니다.";
        } else {
            title = "무승부";
            reasonText = "시간 종료, 점수가 같습니다.";
        }
    }

    // "우리 편 승리" 여부만 따로 계산 (HP/시간 모두 포함)
    const isWin =
        hpResult === "win" ||
        (!hpResult && timeUp && scoreAlly > scoreEnemy);

    // ✅ 승리 시: 한 번만 스테이지 클리어 처리 + StageSelect로 복귀
    const handledRef = useRef(false);
    useEffect(() => {
        // 전투 씬이 아닐 땐 처리 초기화
        if (scene !== "battle") {
            handledRef.current = false;
            return;
        }
        if (!ended) return;
        if (!currentStageId) return;
        if (!isWin) return;        // 패배/무승부는 여기서 막음
        if (handledRef.current) return;

        completeStage(currentStageId, true); // 스테이지 클리어 + 다음 스테이지 + 캐릭터 해금
        handledRef.current = true;
    }, [scene, ended, currentStageId, isWin, completeStage]);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 50,
            }}
        >
            <div
                style={{
                    background: "#0f172a",
                    borderRadius: 12,
                    padding: 24,
                    minWidth: 280,
                    maxWidth: 360,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
                    color: "#e5e7eb",
                }}
            >
                <h2
                    style={{
                        fontSize: 24,
                        marginBottom: 12,
                        textAlign: "center",
                    }}
                >
                    {title}
                </h2>
                <p
                    style={{
                        fontSize: 13,
                        opacity: 0.9,
                        textAlign: "center",
                        marginBottom: 16,
                    }}
                >
                    {reasonText}
                </p>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 16,
                    }}
                >
                    <div>
                        <div>우리 점수: {scoreAlly}</div>
                        <div>우리 기지 HP: {baseAlly}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div>적 점수: {scoreEnemy}</div>
                        <div>적 기지 HP: {baseEnemy}</div>
                    </div>
                </div>

                {/* 패배/무승부일 때 다시 하기용 버튼 (승리 시엔 바로 StageSelect로 넘어가서 거의 안 보임) */}
                <button
                    type="button"
                    onClick={() => resetMatch(MATCH_SEC)}
                    style={{
                        width: "100%",
                        padding: "8px 0",
                        borderRadius: 6,
                        border: "none",
                        background: "#22c55e",
                        color: "#052e16",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    다시 하기
                </button>
            </div>
        </div>
    );
};
