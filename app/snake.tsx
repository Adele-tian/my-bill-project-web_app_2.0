import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createInitialSnakeGame,
  DEFAULT_SNAKE_BOARD,
  queueDirection,
  SnakeCell,
  SnakeDirection,
  SnakeGameState,
  stepSnakeGame,
  togglePaused,
} from '@/utils/snake';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, Pause, Play, RotateCcw } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BOARD = DEFAULT_SNAKE_BOARD;
const TICK_MS = 180;
const BOARD_PADDING = 12;

function randomValue() {
  return Math.random();
}

export default function SnakeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();
  const [game, setGame] = useState<SnakeGameState>(() => createInitialSnakeGame(BOARD, randomValue));

  const boardSize = Math.min(width - 40, 360);
  const cellSize = (boardSize - BOARD_PADDING * 2) / BOARD.columns;

  const resetGame = useCallback(() => {
    setGame(createInitialSnakeGame(BOARD, randomValue));
  }, []);

  const handleDirectionChange = useCallback((direction: SnakeDirection) => {
    setGame((currentGame) => queueDirection(currentGame, direction));
  }, []);

  const handleTogglePause = useCallback(() => {
    setGame((currentGame) => togglePaused(currentGame));
  }, []);

  useEffect(() => {
    if (game.status !== 'running') {
      return;
    }

    const timer = setInterval(() => {
      setGame((currentGame) => stepSnakeGame(currentGame, BOARD, randomValue));
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [game.status]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') {
        event.preventDefault();
        handleDirectionChange('up');
      } else if (key === 'arrowdown' || key === 's') {
        event.preventDefault();
        handleDirectionChange('down');
      } else if (key === 'arrowleft' || key === 'a') {
        event.preventDefault();
        handleDirectionChange('left');
      } else if (key === 'arrowright' || key === 'd') {
        event.preventDefault();
        handleDirectionChange('right');
      } else if (key === ' ' || key === 'p') {
        event.preventDefault();
        handleTogglePause();
      } else if (key === 'enter' || key === 'r') {
        event.preventDefault();
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDirectionChange, handleTogglePause, resetGame]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setGame((currentGame) =>
          currentGame.status === 'running' ? { ...currentGame, status: 'paused' } : currentGame
        );
      };
    }, [])
  );

  const segments = useMemo(() => {
    const mapped = new Map<string, SnakeCell>();
    game.snake.forEach((segment) => {
      mapped.set(`${segment.x},${segment.y}`, segment);
    });
    return mapped;
  }, [game.snake]);
  const headKey = `${game.snake[0].x},${game.snake[0].y}`;

  const statusText =
    game.status === 'game-over'
      ? '游戏结束'
      : game.status === 'paused'
        ? '已暂停'
        : game.status === 'ready'
          ? '按方向键开始'
          : '进行中';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }]} onPress={() => router.back()}>
              <ChevronLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>经典小游戏</Text>
              <Text style={[styles.title, { color: colors.text }]}>贪吃蛇</Text>
            </View>
          </View>

          <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
            <View style={styles.statBlock}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>得分</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{game.score}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.statBlock}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>状态</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{statusText}</Text>
            </View>
          </View>

          <View style={[styles.boardCard, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.board,
                {
                  width: boardSize,
                  height: boardSize,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  padding: BOARD_PADDING,
                },
              ]}>
              {Array.from({ length: BOARD.rows * BOARD.columns }, (_, index) => {
                const x = index % BOARD.columns;
                const y = Math.floor(index / BOARD.columns);
                const key = `${x},${y}`;
                const isFood = game.food.x === x && game.food.y === y;
                const isHead = headKey === key;
                const isSnake = segments.has(key);

                return (
                  <View
                    key={key}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        borderColor: colors.border,
                        backgroundColor: isFood
                          ? colors.expense
                          : isHead
                            ? colors.primary
                            : isSnake
                              ? colors.primaryLight
                              : 'transparent',
                      },
                    ]}
                  />
                );
              })}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primaryLight }]}
                onPress={handleTogglePause}>
                {game.status === 'paused' ? (
                  <Play size={16} color={colors.primary} />
                ) : (
                  <Pause size={16} color={colors.primary} />
                )}
                <Text style={[styles.actionText, { color: colors.primary }]}>
                  {game.status === 'paused' ? '继续' : '暂停'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primaryLight }]}
                onPress={resetGame}>
                <RotateCcw size={16} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>重新开始</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.instructionsCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.instructionsTitle, { color: colors.text }]}>操作方式</Text>
            <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
              键盘支持方向键和 WASD，空格或 P 可暂停，Enter 或 R 可重新开始。
            </Text>
          </View>

          <View style={styles.controls}>
            <ControlButton label="上" color={colors.primaryLight} textColor={colors.primary} onPress={() => handleDirectionChange('up')} />
            <View style={styles.controlsRow}>
              <ControlButton label="左" color={colors.primaryLight} textColor={colors.primary} onPress={() => handleDirectionChange('left')} />
              <ControlButton label="下" color={colors.primaryLight} textColor={colors.primary} onPress={() => handleDirectionChange('down')} />
              <ControlButton label="右" color={colors.primaryLight} textColor={colors.primary} onPress={() => handleDirectionChange('right')} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

type ControlButtonProps = {
  label: string;
  color: string;
  textColor: string;
  onPress: () => void;
};

function ControlButton({ label, color, textColor, onPress }: ControlButtonProps) {
  return (
    <Pressable style={[styles.controlButton, { backgroundColor: color }]} onPress={onPress}>
      <Text style={[styles.controlButtonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  subtitle: { fontSize: 14 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  statsCard: { borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  divider: { width: 1, alignSelf: 'stretch', marginHorizontal: 16 },
  boardCard: { borderRadius: 16, padding: 20, alignItems: 'center' },
  board: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
  },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionButton: {
    minWidth: 120,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  actionText: { fontSize: 14, fontWeight: '600' },
  instructionsCard: { borderRadius: 16, padding: 20 },
  instructionsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  instructionsText: { fontSize: 14, lineHeight: 20 },
  controls: { alignItems: 'center', gap: 12 },
  controlsRow: { flexDirection: 'row', gap: 12 },
  controlButton: {
    width: 72,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: { fontSize: 16, fontWeight: '600' },
});
