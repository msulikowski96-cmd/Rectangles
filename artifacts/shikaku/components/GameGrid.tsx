import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  Text,
  Platform,
  Animated,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { useColors } from '../hooks/useColors';
import { getRectangleBounds, hintsInRectangle, validateRectangle } from '../utils/gameLogic';
import { Rectangle } from '../types/game';

interface GameGridProps {
  cellSize: number;
}

export function GameGrid({ cellSize }: GameGridProps) {
  const { gameState, beginDrawing, updateDrawing, endDrawing } = useGame();
  const colors = useColors();
  const isDrawing = useRef(false);
  const startCellRef = useRef<{ row: number; col: number } | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const lastErrorRef = useRef(0);

  // Trigger shake on error
  useEffect(() => {
    if (!gameState) return;
    if (gameState.lastErrorAt && gameState.lastErrorAt !== lastErrorRef.current) {
      lastErrorRef.current = gameState.lastErrorAt;
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [gameState?.lastErrorAt]);

  if (!gameState) return null;

  const { puzzle, rectangles, drawingStart, drawingEnd } = gameState;
  const { rows, cols, hints } = puzzle;

  const labelSize = Math.min(Math.round(cellSize * 0.45), 18);

  const clampCell = useCallback((row: number, col: number) => ({
    row: Math.max(0, Math.min(rows - 1, row)),
    col: Math.max(0, Math.min(cols - 1, col)),
  }), [rows, cols]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !gameState.isComplete,
    onMoveShouldSetPanResponder: (_evt, gs) =>
      !gameState.isComplete && (Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2),
    onStartShouldSetPanResponderCapture: () => !gameState.isComplete,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      const { locationX, locationY } = evt.nativeEvent;
      const cell = clampCell(
        Math.floor(locationY / cellSize),
        Math.floor(locationX / cellSize),
      );
      isDrawing.current = true;
      startCellRef.current = cell;
      beginDrawing(cell);
    },
    onPanResponderMove: (_evt, gs) => {
      if (!isDrawing.current || !startCellRef.current) return;
      // Use start cell center + cumulative delta — no dependency on absolute
      // screen position, so scrolling/layout shifts don't break it.
      const startX = startCellRef.current.col * cellSize + cellSize / 2;
      const startY = startCellRef.current.row * cellSize + cellSize / 2;
      const cell = clampCell(
        Math.floor((startY + gs.dy) / cellSize),
        Math.floor((startX + gs.dx) / cellSize),
      );
      updateDrawing(cell);
    },
    onPanResponderRelease: () => {
      if (isDrawing.current) {
        isDrawing.current = false;
        startCellRef.current = null;
        endDrawing();
      }
    },
    onPanResponderTerminate: () => {
      if (isDrawing.current) {
        isDrawing.current = false;
        startCellRef.current = null;
        endDrawing();
      }
    },
  });

  const drawingBounds = drawingStart && drawingEnd
    ? getRectangleBounds(drawingStart.row, drawingStart.col, drawingEnd.row, drawingEnd.col)
    : null;

  // Live validation while drawing
  let liveDrawingState: {
    width: number;
    height: number;
    area: number;
    matches: boolean;
    hasHint: boolean;
    multipleHints: boolean;
    targetValue: number | null;
    overlap: boolean;
  } | null = null;

  if (drawingBounds && drawingStart && drawingEnd) {
    const width = drawingBounds.maxCol - drawingBounds.minCol + 1;
    const height = drawingBounds.maxRow - drawingBounds.minRow + 1;
    const area = width * height;
    const containedHints = hintsInRectangle(
      drawingStart.row, drawingStart.col, drawingEnd.row, drawingEnd.col, hints,
    );
    const validation = validateRectangle(
      drawingStart.row, drawingStart.col, drawingEnd.row, drawingEnd.col,
      hints, rectangles,
    );
    liveDrawingState = {
      width,
      height,
      area,
      matches: validation.valid,
      hasHint: containedHints.length > 0,
      multipleHints: containedHints.length > 1,
      targetValue: containedHints.length === 1 ? containedHints[0].value : null,
      overlap: validation.reason === 'overlap',
    };
  }

  const drawingValid = liveDrawingState?.matches === true;
  const drawingInvalidReason = liveDrawingState && !liveDrawingState.matches;
  const drawingBg = drawingValid
    ? 'rgba(52, 199, 89, 0.25)'
    : drawingInvalidReason
      ? 'rgba(255, 59, 48, 0.18)'
      : colors.drawingRect;
  const drawingBorder = drawingValid
    ? '#34c759'
    : drawingInvalidReason
      ? '#ff3b30'
      : colors.drawingRectBorder;

  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;

  // Highlighted hint (single hint inside current drawing)
  const highlightedHintKey = liveDrawingState && !liveDrawingState.multipleHints && liveDrawingState.hasHint && drawingStart && drawingEnd
    ? (() => {
        const h = hintsInRectangle(drawingStart.row, drawingStart.col, drawingEnd.row, drawingEnd.col, hints)[0];
        return `${h.row}-${h.col}`;
      })()
    : null;

  return (
    <View>
      {/* Top column numbers */}
      <View style={[styles.labelsRow, { marginLeft: labelSize + 8 }]}>
        {Array.from({ length: cols }).map((_, col) => {
          const isHighlighted =
            drawingBounds && col >= drawingBounds.minCol && col <= drawingBounds.maxCol;
          return (
            <View key={`col-label-${col}`} style={{ width: cellSize, alignItems: 'center' }}>
              <Text
                style={[
                  styles.axisLabel,
                  {
                    fontSize: labelSize,
                    color: isHighlighted ? colors.primary : colors.mutedForeground,
                    fontWeight: isHighlighted ? '700' : '600',
                  },
                ]}
              >
                {col + 1}
              </Text>
            </View>
          );
        })}
      </View>

      <Animated.View style={[styles.bodyRow, { transform: [{ translateX: shakeAnim }] }]}>
        {/* Row numbers */}
        <View style={[styles.rowLabelsCol, { width: labelSize + 8 }]}>
          {Array.from({ length: rows }).map((_, row) => {
            const isHighlighted =
              drawingBounds && row >= drawingBounds.minRow && row <= drawingBounds.maxRow;
            return (
              <View key={`row-label-${row}`} style={{ height: cellSize, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 }}>
                <Text
                  style={[
                    styles.axisLabel,
                    {
                      fontSize: labelSize,
                      color: isHighlighted ? colors.primary : colors.mutedForeground,
                      fontWeight: isHighlighted ? '700' : '600',
                    },
                  ]}
                >
                  {row + 1}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Grid */}
        <View
          style={[styles.grid, { width: gridWidth, height: gridHeight, borderColor: colors.gridBorder }]}
          {...panResponder.panHandlers}
        >
          {/* Cell grid */}
          {Array.from({ length: rows }).map((_, row) =>
            Array.from({ length: cols }).map((_, col) => (
              <View
                key={`cell-${row}-${col}`}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    top: row * cellSize,
                    left: col * cellSize,
                    borderColor: colors.gridLine,
                  },
                ]}
              />
            ))
          )}

          {/* Placed rectangles */}
          {rectangles.map((rect) => (
            <PlacedRect key={rect.id} rect={rect} cellSize={cellSize} colors={colors} />
          ))}

          {/* Drawing preview */}
          {drawingBounds && (
            <View
              style={[
                styles.drawingRect,
                {
                  top: drawingBounds.minRow * cellSize + 2,
                  left: drawingBounds.minCol * cellSize + 2,
                  width: (drawingBounds.maxCol - drawingBounds.minCol + 1) * cellSize - 4,
                  height: (drawingBounds.maxRow - drawingBounds.minRow + 1) * cellSize - 4,
                  backgroundColor: drawingBg,
                  borderColor: drawingBorder,
                },
              ]}
              pointerEvents="none"
            >
              {liveDrawingState && (
                <View style={styles.dimensionsBadge}>
                  <Text
                    style={[
                      styles.dimensionsText,
                      {
                        color: drawingValid ? '#fff' : drawingInvalidReason ? '#fff' : '#fff',
                        backgroundColor: drawingValid ? '#34c759' : drawingInvalidReason ? '#ff3b30' : colors.primary,
                      },
                    ]}
                  >
                    {liveDrawingState.width}×{liveDrawingState.height} = {liveDrawingState.area}
                    {liveDrawingState.targetValue !== null && liveDrawingState.targetValue !== liveDrawingState.area
                      ? ` / ${liveDrawingState.targetValue}`
                      : ''}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Hints */}
          {hints.map((hint) => {
            const key = `${hint.row}-${hint.col}`;
            const isHighlighted = highlightedHintKey === key;
            return (
              <View
                key={`hint-${key}`}
                style={[
                  styles.hintContainer,
                  {
                    top: hint.row * cellSize,
                    left: hint.col * cellSize,
                    width: cellSize,
                    height: cellSize,
                  },
                ]}
                pointerEvents="none"
              >
                <View
                  style={[
                    styles.hintCircle,
                    {
                      width: cellSize * 0.7,
                      height: cellSize * 0.7,
                      borderRadius: cellSize * 0.35,
                      backgroundColor: isHighlighted
                        ? (drawingValid ? '#34c759' : drawingInvalidReason ? '#ff3b30' : colors.primary)
                        : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.hintText,
                      {
                        color: isHighlighted ? '#fff' : colors.hintText,
                        fontSize: Math.round(cellSize * 0.55),
                      },
                    ]}
                  >
                    {hint.value}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

function PlacedRect({ rect, cellSize, colors }: { rect: Rectangle; cellSize: number; colors: ReturnType<typeof useColors> }) {
  const bounds = getRectangleBounds(rect.startRow, rect.startCol, rect.endRow, rect.endCol);
  const bg = colors.rectColors[rect.colorIndex % colors.rectColors.length];
  const border = colors.rectBorderColors[rect.colorIndex % colors.rectBorderColors.length];
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.placedRect,
        {
          top: bounds.minRow * cellSize + 2,
          left: bounds.minCol * cellSize + 2,
          width: (bounds.maxCol - bounds.minCol + 1) * cellSize - 4,
          height: (bounds.maxRow - bounds.minRow + 1) * cellSize - 4,
          backgroundColor: bg,
          borderColor: border,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  labelsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowLabelsCol: {
    flexDirection: 'column',
  },
  axisLabel: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  grid: {
    position: 'relative',
    borderWidth: 2,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  cell: {
    position: 'absolute',
    borderWidth: 0.5,
  },
  hintContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  hintCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
  },
  placedRect: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 3,
    zIndex: 5,
  },
  drawingRect: {
    position: 'absolute',
    borderWidth: 2.5,
    borderRadius: 4,
    borderStyle: 'dashed',
    zIndex: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimensionsBadge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{ translateX: -40 }],
  },
  dimensionsText: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
});
