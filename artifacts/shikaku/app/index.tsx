import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { useColors } from '../hooks/useColors';
import { HowToPlay } from '../components/HowToPlay';
import { formatTime } from '../utils/gameLogic';
import { levelConfig } from '../utils/puzzleGenerator';

const LEVEL_COLOR = '#5856d6';

function difficultyLabel(level: number): string {
  const cfg = levelConfig(level);
  if (cfg.maxArea <= 5) return 'Łatwy';
  if (cfg.maxArea <= 7) return 'Średni';
  if (cfg.maxArea <= 9) return 'Trudny';
  return 'Ekspert';
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { startLevel, completedLevels, highestLevelReached } = useGame();
  const [showHelp, setShowHelp] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const nextLevel = highestLevelReached;
  const nextCfg = levelConfig(nextLevel);
  const completedCount = Object.keys(completedLevels).length;

  const handlePlay = (level: number) => {
    startLevel(level);
    router.push('/game');
  };

  // Build the list of levels to show: all completed + the next one to play
  const completedSorted = Object.values(completedLevels).sort((a, b) => b.level - a.level);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.appName, { color: colors.foreground }]}>Shikaku</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Łamigłówka prostokątów</Text>
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
        {/* Hero card: next level to play */}
        <TouchableOpacity
          style={[styles.heroCard, { backgroundColor: LEVEL_COLOR }]}
          onPress={() => handlePlay(nextLevel)}
          activeOpacity={0.85}
        >
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Następny poziom</Text>
            <Text style={styles.heroLevel}>Poziom {nextLevel}</Text>
            <Text style={styles.heroMeta}>
              {nextCfg.rows}×{nextCfg.cols} · {difficultyLabel(nextLevel)}
            </Text>
          </View>
          <View style={styles.heroPlay}>
            <Feather name="play" size={28} color={LEVEL_COLOR} />
          </View>
        </TouchableOpacity>

        {/* Stats */}
        {completedCount > 0 && (
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{completedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>ukończone</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{nextLevel - 1}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>najwyższy</Text>
            </View>
          </View>
        )}

        {/* Past levels — replayable */}
        {completedSorted.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Twoje poziomy</Text>
            <View style={styles.levelList}>
              {completedSorted.map(c => {
                const cfg = levelConfig(c.level);
                return (
                  <TouchableOpacity
                    key={c.level}
                    style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handlePlay(c.level)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.levelNumber, { backgroundColor: LEVEL_COLOR + '20' }]}>
                      <Text style={[styles.levelNumText, { color: LEVEL_COLOR }]}>
                        {c.level}
                      </Text>
                    </View>
                    <View style={styles.levelInfo}>
                      <Text style={[styles.levelName, { color: colors.foreground }]}>
                        Poziom {c.level}
                      </Text>
                      <Text style={[styles.levelMeta, { color: colors.mutedForeground }]}>
                        {cfg.rows}×{cfg.cols} · {difficultyLabel(c.level)}
                      </Text>
                    </View>
                    <View style={styles.levelRight}>
                      <Feather name="check-circle" size={18} color={LEVEL_COLOR} />
                      <Text style={[styles.levelTime, { color: colors.mutedForeground }]}>
                        {formatTime(c.time)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {completedSorted.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="award" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Zacznij od poziomu 1</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Każdy następny poziom będzie trudniejszy od poprzedniego.
            </Text>
          </View>
        )}
      </ScrollView>

      <HowToPlay visible={showHelp} onClose={() => setShowHelp(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  appName: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  tagline: { fontSize: 13, marginTop: 1 },
  helpBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 20,
    shadowColor: LEVEL_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroLeft: { flex: 1, gap: 4 },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroLevel: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  heroMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  heroPlay: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
  },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, marginVertical: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: -4,
  },
  levelList: { gap: 10 },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  levelNumber: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  levelNumText: { fontSize: 16, fontWeight: '700' },
  levelInfo: { flex: 1, gap: 2 },
  levelName: { fontSize: 16, fontWeight: '600' },
  levelMeta: { fontSize: 13 },
  levelRight: { alignItems: 'center', gap: 2 },
  levelTime: { fontSize: 11 },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
