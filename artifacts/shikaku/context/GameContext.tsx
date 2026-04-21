import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Puzzle, Rectangle, Cell, GameState } from '../types/game';
import {
  validateRectangle,
  checkPuzzleComplete,
  generateRectId,
  getRectangleBounds,
} from '../utils/gameLogic';
import { generateLevelPuzzle } from '../utils/puzzleGenerator';

interface CompletedLevel {
  level: number;
  time: number;
  moves: number;
}

interface ExtendedGameState extends GameState {
  level: number;
  history: Rectangle[][];
  lastErrorAt: number;
}

interface GameContextType {
  gameState: ExtendedGameState | null;
  startLevel: (level: number) => void;
  beginDrawing: (cell: Cell) => void;
  updateDrawing: (cell: Cell) => void;
  endDrawing: () => void;
  deleteRectangle: (id: string) => void;
  resetGame: () => void;
  undo: () => void;
  canUndo: boolean;
  completedLevels: Record<number, CompletedLevel>;
  highestLevelReached: number; // next level the player should play
}

const GameContext = createContext<GameContextType | null>(null);

const STORAGE_LEVELS = 'completedLevels';
const STORAGE_PROGRESS = 'highestLevelReached';

function triggerHaptic(type: 'light' | 'medium' | 'success' | 'error') {
  if (Platform.OS === 'web') return;
  try {
    if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<ExtendedGameState | null>(null);
  const [completedLevels, setCompletedLevels] = useState<Record<number, CompletedLevel>>({});
  const [highestLevelReached, setHighestLevelReached] = useState<number>(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_LEVELS);
        if (data) setCompletedLevels(JSON.parse(data));
      } catch {}
      try {
        const lvl = await AsyncStorage.getItem(STORAGE_PROGRESS);
        if (lvl) setHighestLevelReached(Math.max(1, parseInt(lvl, 10) || 1));
      } catch {}
    })();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const persistCompleted = (next: Record<number, CompletedLevel>) => {
    AsyncStorage.setItem(STORAGE_LEVELS, JSON.stringify(next)).catch(() => {});
  };
  const persistHighest = (lvl: number) => {
    AsyncStorage.setItem(STORAGE_PROGRESS, String(lvl)).catch(() => {});
  };

  const saveCompletedLevel = (level: number, time: number, moves: number) => {
    setCompletedLevels(prev => {
      const existing = prev[level];
      if (existing && existing.time <= time) return prev;
      const updated = { ...prev, [level]: { level, time, moves } };
      persistCompleted(updated);
      return updated;
    });
    setHighestLevelReached(prev => {
      const next = Math.max(prev, level + 1);
      if (next !== prev) persistHighest(next);
      return next;
    });
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

  const startLevel = useCallback((level: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const puzzle: Puzzle = generateLevelPuzzle(level);
    const now = Date.now();
    setGameState({
      puzzle,
      level,
      rectangles: [],
      selectedCell: null,
      drawingStart: null,
      drawingEnd: null,
      isComplete: false,
      moves: 0,
      startTime: now,
      elapsedTime: 0,
      history: [],
      lastErrorAt: 0,
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
      if (prev.drawingEnd && prev.drawingEnd.row === cell.row && prev.drawingEnd.col === cell.col) {
        return prev;
      }
      return { ...prev, drawingEnd: cell };
    });
  }, []);

  const endDrawing = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.drawingStart || !prev.drawingEnd) return prev;

      const { drawingStart, drawingEnd, puzzle, rectangles, history } = prev;
      const { minRow, maxRow, minCol, maxCol } = getRectangleBounds(
        drawingStart.row, drawingStart.col, drawingEnd.row, drawingEnd.col
      );

      // Single-tap on existing rect → delete
      if (minRow === maxRow && minCol === maxCol) {
        const existingRect = rectangles.find(r => {
          const rb = getRectangleBounds(r.startRow, r.startCol, r.endRow, r.endCol);
          return drawingStart.row >= rb.minRow && drawingStart.row <= rb.maxRow &&
                 drawingStart.col >= rb.minCol && drawingStart.col <= rb.maxCol;
        });
        if (existingRect) {
          triggerHaptic('light');
          const newRects = rectangles.filter(r => r.id !== existingRect.id);
          return {
            ...prev,
            rectangles: newRects,
            drawingStart: null,
            drawingEnd: null,
            history: [...history, rectangles],
          };
        }
      }

      const validation = validateRectangle(
        drawingStart.row, drawingStart.col,
        drawingEnd.row, drawingEnd.col,
        puzzle.hints,
        rectangles,
      );

      if (!validation.valid) {
        triggerHaptic('error');
        return { ...prev, drawingStart: null, drawingEnd: null, lastErrorAt: Date.now() };
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

      const filteredRects = rectangles.filter(r => !(r.hintRow === hint.row && r.hintCol === hint.col));
      const newRects = [...filteredRects, newRect];
      const isComplete = checkPuzzleComplete(puzzle, newRects);

      if (isComplete) {
        if (timerRef.current) clearInterval(timerRef.current);
        triggerHaptic('success');
        const time = Math.floor((Date.now() - prev.startTime) / 1000);
        const moves = prev.moves + 1;
        saveCompletedLevel(prev.level, time, moves);
        return {
          ...prev,
          rectangles: newRects,
          drawingStart: null,
          drawingEnd: null,
          isComplete: true,
          moves,
          history: [...history, rectangles],
        };
      }

      triggerHaptic('medium');
      return {
        ...prev,
        rectangles: newRects,
        drawingStart: null,
        drawingEnd: null,
        moves: prev.moves + 1,
        history: [...history, rectangles],
      };
    });
  }, []);

  const deleteRectangle = useCallback((id: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== id),
        history: [...prev.history, prev.rectangles],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.history.length === 0 || prev.isComplete) return prev;
      triggerHaptic('light');
      const previousState = prev.history[prev.history.length - 1];
      return {
        ...prev,
        rectangles: previousState,
        history: prev.history.slice(0, -1),
        drawingStart: null,
        drawingEnd: null,
      };
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
        history: [],
        lastErrorAt: 0,
      };
    });
  }, []);

  return (
    <GameContext.Provider value={{
      gameState,
      startLevel,
      beginDrawing,
      updateDrawing,
      endDrawing,
      deleteRectangle,
      resetGame,
      undo,
      canUndo: !!gameState && gameState.history.length > 0 && !gameState.isComplete,
      completedLevels,
      highestLevelReached,
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
