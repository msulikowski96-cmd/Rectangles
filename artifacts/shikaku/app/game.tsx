import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { useColors } from '../hooks/useColors';
import { GameGrid } from '../components/GameGrid';
import { CompletionModal } from '../components/CompletionModal';
import { formatTime } from '../utils/gameLogic';
import { ALL_PUZZLES } from '../data/puzzles';
import { generateRandomPuzzle } from '../utils/puzzleGenerator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 32;

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { gameState, resetGame, startGame, selectedDifficulty, undo, canUndo } = useGame();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const cellSize = useMemo(() => {
    if (!gameState) return 56;
    const available = Math.min(SCREEN_WIDTH - GRID_PADDING * 2, 560);
    const minCell = 44;
    return Math.max(minCell, Math.floor(available / gameState.puzzle.cols));
  }, [gameState?.puzzle.cols]);

  const handleBack = () => {
    router.back();
  };

  const handleReset = () => {
    if (Platform.OS === 'web') {
      resetGame();
    } else {
      Alert.alert('Reset Puzzle', 'Clear all rectangles and start over?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetGame },
      ]);
    }
  };

  const handleNext = () => {
    if (!gameState) return;
    const puzzles = ALL_PUZZLES[selectedDifficulty];
    const currentIdx = puzzles.findIndex(p => p.id === gameState.puzzle.id);
    const nextPuzzle = puzzles[currentIdx + 1];
    if (nextPuzzle) {
      startGame(nextPuzzle);
    } else {
      // Past the curated list — generate an endless fresh puzzle
      startGame(generateRandomPuzzle(selectedDifficulty));
    }
  };

  if (!gameState) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>No puzzle selected</Text>
          <TouchableOpacity onPress={handleBack} style={[styles.goHomeBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.goHomeBtnText, { color: '#fff' }]}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { puzzle, isComplete, elapsedTime, moves, rectangles } = gameState;
  const progress = rectangles.length > 0
    ? Math.round((rectangles.length / puzzle.hints.length) * 100)
    : 0;

  const hasNext = true; // endless puzzles via the generator

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.puzzleTitle, { color: colors.foreground }]}>{puzzle.name}</Text>
          <Text style={[styles.puzzleSize, { color: colors.mutedForeground }]}>
            {puzzle.rows}×{puzzle.cols}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: colors.muted, opacity: canUndo ? 1 : 0.4 },
            ]}
            onPress={undo}
            disabled={!canUndo}
            activeOpacity={0.7}
          >
            <Feather name="rotate-ccw" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Feather name="refresh-cw" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.muted }]}>
        <View style={styles.statItem}>
          <Feather name="clock" size={14} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.foreground }]}>{formatTime(elapsedTime)}</Text>
        </View>
        <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.statItem}>
          <Feather name="edit-2" size={14} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.foreground }]}>{moves}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.gridContainer, { paddingBottom: bottomPad + 16 }]}>
        <GameGrid cellSize={cellSize} />

        {/* Hint */}
        <View style={[styles.hintBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.hintBarText, { color: colors.mutedForeground }]}>
            Drag to draw · Tap cell to erase
          </Text>
        </View>
      </View>

      {/* Completion Modal */}
      <CompletionModal
        visible={isComplete}
        time={elapsedTime}
        moves={moves}
        onPlayAgain={resetGame}
        onGoHome={() => router.back()}
        onNext={hasNext ? handleNext : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  puzzleTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  puzzleSize: {
    fontSize: 13,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 56,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  gridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: GRID_PADDING,
  },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  hintBarText: {
    fontSize: 13,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
  },
  goHomeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  goHomeBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  backBtn: {
    padding: 16,
  },
});
