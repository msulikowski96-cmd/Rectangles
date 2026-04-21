import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Puzzle, Rectangle, Cell, GameState, Difficulty } from '../types/game';
import {
  validateRectangle,
  checkPuzzleComplete,
  generateRectId,
  getRectangleBounds,
} from '../utils/gameLogic';

interface CompletedPuzzle {
  id: string;
  time: number;
  moves: number;
}

interface GameContextType {
  gameState: GameState | null;
  startGame: (puzzle: Puzzle) => void;
  beginDrawing: (cell: Cell) => void;
  updateDrawing: (cell: Cell) => void;
  endDrawing: () => void;
  deleteRectangle: (id: string) => void;
  resetGame: () => void;
  completedPuzzles: Record<string, CompletedPuzzle>;
  selectedDifficulty: Difficulty;
  setSelectedDifficulty: (d: Difficulty) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [completedPuzzles, setCompletedPuzzles] = useState<Record<string, CompletedPuzzle>>({});
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadCompletedPuzzles();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadCompletedPuzzles = async () => {
    try {
      const data = await AsyncStorage.getItem('completedPuzzles');
      if (data) setCompletedPuzzles(JSON.parse(data));
    } catch {}
  };

  const saveCompletedPuzzle = async (id: string, time: number, moves: number) => {
    const updated = { ...completedPuzzles, [id]: { id, time, moves } };
    setCompletedPuzzles(updated);
    try {
      await AsyncStorage.setItem('completedPuzzles', JSON.stringify(updated));
    } catch {}
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (!prev || prev.isComplete) return prev;
        return { ...prev, elapsedTime: Math.floor((Date.now() - prev.startTime) / 1000) };
      });
    }, 1000);
  };

  const startGame = useCallback((puzzle: Puzzle) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const now = Date.now();
    setGameState({
      puzzle,
      rectangles: [],
      selectedCell: null,
      drawingStart: null,
      drawingEnd: null,
      isComplete: false,
      moves: 0,
      startTime: now,
      elapsedTime: 0,
    });
    setTimeout(startTimer, 100);
  }, []);

  const beginDrawing = useCallback((cell: Cell) => {
    setGameState(prev => {
      if (!prev || prev.isComplete) return prev;
      return { ...prev, drawingStart: cell, drawingEnd: cell };
    });
  }, []);

  const updateDrawing = useCallback((cell: Cell) => {
    setGameState(prev => {
      if (!prev || !prev.drawingStart) return prev;
      return { ...prev, drawingEnd: cell };
    });
  }, []);

  const endDrawing = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.drawingStart || !prev.drawingEnd) return prev;

      const { drawingStart, drawingEnd, puzzle, rectangles } = prev;

      // Check if drawing over existing rectangle to delete it
      const { minRow, maxRow, minCol, maxCol } = getRectangleBounds(
        drawingStart.row, drawingStart.col, drawingEnd.row, drawingEnd.col
      );

      // If it's a single cell tap, check if there's a rectangle there to delete
      if (minRow === maxRow && minCol === maxCol) {
        const existingRect = rectangles.find(r => {
          const rb = getRectangleBounds(r.startRow, r.startCol, r.endRow, r.endCol);
          return drawingStart.row >= rb.minRow && drawingStart.row <= rb.maxRow &&
                 drawingStart.col >= rb.minCol && drawingStart.col <= rb.maxCol;
        });
        if (existingRect) {
          const newRects = rectangles.filter(r => r.id !== existingRect.id);
          return { ...prev, rectangles: newRects, drawingStart: null, drawingEnd: null };
        }
      }

      const validation = validateRectangle(
        drawingStart.row, drawingStart.col,
        drawingEnd.row, drawingEnd.col,
        puzzle.hints,
        rectangles,
      );

      if (!validation.valid) {
        return { ...prev, drawingStart: null, drawingEnd: null };
      }

      const hint = validation.containedHint!;
      const newRect: Rectangle = {
        id: generateRectId(),
        startRow: minRow,
        startCol: minCol,
        endRow: maxRow,
        endCol: maxCol,
        hintRow: hint.row,
        hintCol: hint.col,
        colorIndex: prev.rectangles.length % 8,
        isCorrect: true,
      };

      // Remove any existing rect that covered this hint
      const filteredRects = rectangles.filter(r => !(r.hintRow === hint.row && r.hintCol === hint.col));
      const newRects = [...filteredRects, newRect];

      const isComplete = checkPuzzleComplete(puzzle, newRects);

      if (isComplete) {
        if (timerRef.current) clearInterval(timerRef.current);
        const time = Math.floor((Date.now() - prev.startTime) / 1000);
        const moves = prev.moves + 1;
        saveCompletedPuzzle(puzzle.id, time, moves);
        return { ...prev, rectangles: newRects, drawingStart: null, drawingEnd: null, isComplete: true, moves };
      }

      return {
        ...prev,
        rectangles: newRects,
        drawingStart: null,
        drawingEnd: null,
        moves: prev.moves + 1,
      };
    });
  }, []);

  const deleteRectangle = useCallback((id: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      return { ...prev, rectangles: prev.rectangles.filter(r => r.id !== id) };
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      if (timerRef.current) clearInterval(timerRef.current);
      const now = Date.now();
      setTimeout(startTimer, 100);
      return {
        ...prev,
        rectangles: [],
        drawingStart: null,
        drawingEnd: null,
        isComplete: false,
        moves: 0,
        startTime: now,
        elapsedTime: 0,
      };
    });
  }, []);

  return (
    <GameContext.Provider value={{
      gameState,
      startGame,
      beginDrawing,
      updateDrawing,
      endDrawing,
      deleteRectangle,
      resetGame,
      completedPuzzles,
      selectedDifficulty,
      setSelectedDifficulty,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
