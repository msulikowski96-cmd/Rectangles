import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  Text,
  Platform,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { useColors } from '../hooks/useColors';
import { getRectangleBounds } from '../utils/gameLogic';
import { Rectangle } from '../types/game';

interface GameGridProps {
  cellSize: number;
}

export function GameGrid({ cellSize }: GameGridProps) {
  const { gameState, beginDrawing, updateDrawing, endDrawing } = useGame();
  const colors = useColors();
  const isDrawing = useRef(false);
  const gridRef = useRef<View>(null);
  const gridLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });

  if (!gameState) return null;

  const { puzzle, rectangles, drawingStart, drawingEnd } = gameState;
  const { rows, cols, hints } = puzzle;

  // Label size proportional to cell but capped
  const labelSize = Math.min(Math.round(cellSize * 0.55), 18);

  const getCellFromPosition = useCallback((pageX: number, pageY: number) => {
    const { x, y } = gridLayout.current;
    const localX = pageX - x;
    const localY = pageY - y;
    const col = Math.floor(localX / cellSize);
    const row = Math.floor(localY / cellSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      return { row, col };
    }
    return null;
  }, [cellSize, rows, cols]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !gameState.isComplete,
    onMoveShouldSetPanResponder: () => !gameState.isComplete,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      const { pageX, pageY } = evt.nativeEvent;
      const cell = getCellFromPosition(pageX, pageY);
      if (cell) {
        isDrawing.current = true;
        beginDrawing(cell);
      }
    },
    onPanResponderMove: (evt: GestureResponderEvent) => {
      if (!isDrawing.current) return;
      const { pageX, pageY } = evt.nativeEvent;
      const cell = getCellFromPosition(pageX, pageY);
      if (cell) {
        updateDrawing(cell);
      }
    },
    onPanResponderRelease: () => {
      if (isDrawing.current) {
        isDrawing.current = false;
        endDrawing();
      }
    },
    onPanResponderTerminate: () => {
      isDrawing.current = false;
      endDrawing();
    },
  });

  const drawingBounds = drawingStart && drawingEnd
    ? getRectangleBounds(drawingStart.row, drawingStart.col, drawingEnd.row, drawingEnd.col)
    : null;

  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;

  return (
    <View>
      {/* Top row: corner spacer + column numbers */}
      <View style={[styles.labelsRow, { marginLeft: labelSize + 4 }]}>
        {Array.from({ length: cols }).map((_, col) => (
          <View key={`col-label-${col}`} style={{ width: cellSize, alignItems: 'center' }}>
            <Text style={[styles.axisLabel, { fontSize: labelSize, color: colors.mutedForeground }]}>
              {col + 1}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid body: row numbers + grid */}
      <View style={styles.bodyRow}>
        {/* Row numbers */}
        <View style={[styles.rowLabelsCol, { width: labelSize + 4 }]}>
          {Array.from({ length: rows }).map((_, row) => (
            <View key={`row-label-${row}`} style={{ height: cellSize, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 4 }}>
              <Text style={[styles.axisLabel, { fontSize: labelSize, color: colors.mutedForeground }]}>
                {row + 1}
              </Text>
            </View>
          ))}
        </View>

        {/* The actual grid */}
        <View
          ref={gridRef}
          onLayout={() => {
            gridRef.current?.measureInWindow((x, y, width, height) => {
              gridLayout.current = { x, y, width, height };
            });
          }}
          style={[styles.grid, { width: gridWidth, height: gridHeight, borderColor: colors.gridBorder }]}
          {...panResponder.panHandlers}
        >
          {/* Grid lines */}
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
                  backgroundColor: colors.drawingRect,
                  borderColor: colors.drawingRectBorder,
                },
              ]}
              pointerEvents="none"
            />
          )}

          {/* Hints (numbers) */}
          {hints.map((hint) => (
            <View
              key={`hint-${hint.row}-${hint.col}`}
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
              <Text style={[styles.hintText, { color: colors.hintText, fontSize: cellSize * 0.4 }]}>
                {hint.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function PlacedRect({ rect, cellSize, colors }: { rect: Rectangle; cellSize: number; colors: ReturnType<typeof useColors> }) {
  const bounds = getRectangleBounds(rect.startRow, rect.startCol, rect.endRow, rect.endCol);
  const bg = colors.rectColors[rect.colorIndex % colors.rectColors.length];
  const border = colors.rectBorderColors[rect.colorIndex % colors.rectBorderColors.length];

  return (
    <View
      style={[
        styles.placedRect,
        {
          top: bounds.minRow * cellSize + 2,
          left: bounds.minCol * cellSize + 2,
          width: (bounds.maxCol - bounds.minCol + 1) * cellSize - 4,
          height: (bounds.maxRow - bounds.minRow + 1) * cellSize - 4,
          backgroundColor: bg,
          borderColor: border,
        },
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  labelsRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowLabelsCol: {
    flexDirection: 'column',
  },
  axisLabel: {
    fontWeight: '600',
    textAlign: 'center',
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
    borderWidth: 2,
    borderRadius: 3,
    borderStyle: 'dashed',
    zIndex: 8,
  },
});
