import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';

interface HowToPlayProps {
  visible: boolean;
  onClose: () => void;
}

export function HowToPlay({ visible, onClose }: HowToPlayProps) {
  const colors = useColors();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>How to Play</Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
            <Feather name="x" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Objective</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              Divide the grid into rectangles. Each rectangle must contain exactly one number, and that number must equal the area of the rectangle.
            </Text>
          </View>

          {[
            {
              step: '1',
              title: 'Find the clues',
              desc: 'Numbers on the grid tell you the size of the rectangle that must contain them.',
            },
            {
              step: '2',
              title: 'Draw rectangles',
              desc: 'Touch and drag to draw a rectangle. The rectangle must have exactly the area shown by the number it contains.',
            },
            {
              step: '3',
              title: 'Remove rectangles',
              desc: 'Tap on a single cell inside a rectangle to remove it and try again.',
            },
            {
              step: '4',
              title: 'Complete the grid',
              desc: 'Fill every cell with exactly one rectangle. No gaps, no overlaps!',
            },
          ].map(({ step, title, desc }) => (
            <View key={step} style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.stepNum, { color: colors.primaryForeground }]}>{step}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>{title}</Text>
                <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{desc}</Text>
              </View>
            </View>
          ))}

          <View style={[styles.card, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
            <Text style={[styles.tipTitle, { color: colors.primary }]}>Pro Tip</Text>
            <Text style={[styles.body, { color: colors.foreground }]}>
              Start with the numbers that have only one possible rectangle shape. For example, a "2" can only be 1×2 or 2×1.
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.gotItBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.gotItText, { color: colors.primaryForeground }]}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    paddingTop: 56,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNum: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  gotItBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  gotItText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
