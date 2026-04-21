import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  ScrollView,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { useColors } from '../hooks/useColors';
import { HowToPlay } from '../components/HowToPlay';
import { ALL_PUZZLES } from '../data/puzzles';
import { Difficulty } from '../types/game';
import { Puzzle } from '../types/game';
import { formatTime } from '../utils/gameLogic';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: '5×5 grid',
  medium: '7×7 grid',
  hard: '9×9 grid',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#34c759',
  medium: '#ff9500',
  hard: '#ff3b30',
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { startGame, completedPuzzles, selectedDifficulty, setSelectedDifficulty } = useGame();
  const [showHelp, setShowHelp] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const puzzles = ALL_PUZZLES[selectedDifficulty];

  const handlePlay = (puzzle: Puzzle) => {
    startGame(puzzle);
    router.push('/game');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.appName, { color: colors.foreground }]}>Shikaku</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Rectangle Puzzle</Text>
        </View>
        <TouchableOpacity
          style={[styles.helpBtn, { backgroundColor: colors.muted }]}
          onPress={() => setShowHelp(true)}
          activeOpacity={0.7}
        >
          <Feather name="help-circle" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Difficulty Selector */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Difficulty</Text>
        <View style={[styles.difficultyRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {((['easy', 'medium', 'hard'] as Difficulty[])).map(d => (
            <TouchableOpacity
              key={d}
              style={[
                styles.difficultyTab,
                selectedDifficulty === d && { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
              ]}
              onPress={() => setSelectedDifficulty(d)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.difficultyLabel,
                  { color: selectedDifficulty === d ? DIFFICULTY_COLORS[d] : colors.mutedForeground },
                ]}
              >
                {DIFFICULTY_LABELS[d]}
              </Text>
              <Text style={[styles.difficultyDesc, { color: colors.mutedForeground }]}>
                {DIFFICULTY_DESC[d]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Puzzle List */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Select Puzzle</Text>
        <View style={styles.puzzleList}>
          {puzzles.map((puzzle, idx) => {
            const completed = completedPuzzles[puzzle.id];
            return (
              <TouchableOpacity
                key={puzzle.id}
                style={[styles.puzzleCard, { backgroundColor: colors.card, borderColor: completed ? DIFFICULTY_COLORS[selectedDifficulty] + '60' : colors.border }]}
                onPress={() => handlePlay(puzzle)}
                activeOpacity={0.75}
              >
                <View style={[styles.puzzleNumber, { backgroundColor: completed ? DIFFICULTY_COLORS[selectedDifficulty] + '20' : colors.muted }]}>
                  <Text style={[styles.puzzleNumText, { color: completed ? DIFFICULTY_COLORS[selectedDifficulty] : colors.mutedForeground }]}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={styles.puzzleInfo}>
                  <Text style={[styles.puzzleName, { color: colors.foreground }]}>{puzzle.name}</Text>
                  <Text style={[styles.puzzleMeta, { color: colors.mutedForeground }]}>
                    {puzzle.rows}×{puzzle.cols} · {puzzle.hints.length} clues
                  </Text>
                </View>
                <View style={styles.puzzleRight}>
                  {completed ? (
                    <View style={styles.completedBadge}>
                      <Feather name="check-circle" size={18} color={DIFFICULTY_COLORS[selectedDifficulty]} />
                      <Text style={[styles.completedTime, { color: colors.mutedForeground }]}>
                        {formatTime(completed.time)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.playBtn, { backgroundColor: DIFFICULTY_COLORS[selectedDifficulty] }]}>
                      <Feather name="play" size={14} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats summary */}
        {Object.keys(completedPuzzles).length > 0 && (
          <View style={[styles.statsCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.statsTitle, { color: '#ffffff' }]}>
              {Object.keys(completedPuzzles).length} puzzle{Object.keys(completedPuzzles).length !== 1 ? 's' : ''} solved
            </Text>
            <Feather name="award" size={20} color={colors.primary} />
          </View>
        )}
      </ScrollView>

      <HowToPlay visible={showHelp} onClose={() => setShowHelp(false)} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 13,
    marginTop: 1,
  },
  helpBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: -4,
  },
  difficultyRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    gap: 2,
  },
  difficultyTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  difficultyDesc: {
    fontSize: 11,
  },
  puzzleList: {
    gap: 10,
  },
  puzzleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  puzzleNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puzzleNumText: {
    fontSize: 16,
    fontWeight: '700',
  },
  puzzleInfo: {
    flex: 1,
    gap: 3,
  },
  puzzleName: {
    fontSize: 16,
    fontWeight: '600',
  },
  puzzleMeta: {
    fontSize: 13,
  },
  puzzleRight: {
    alignItems: 'center',
  },
  completedBadge: {
    alignItems: 'center',
    gap: 2,
  },
  completedTime: {
    fontSize: 11,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
});
