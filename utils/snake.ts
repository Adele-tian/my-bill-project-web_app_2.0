export type SnakeCell = {
  x: number;
  y: number;
};

export type SnakeDirection = 'up' | 'down' | 'left' | 'right';

export type SnakeStatus = 'ready' | 'running' | 'paused' | 'game-over';

export type SnakeGameState = {
  snake: SnakeCell[];
  direction: SnakeDirection;
  nextDirection: SnakeDirection;
  food: SnakeCell;
  score: number;
  status: SnakeStatus;
};

export type SnakeBoard = {
  rows: number;
  columns: number;
};

export const DEFAULT_SNAKE_BOARD: SnakeBoard = {
  rows: 14,
  columns: 14,
};

const INITIAL_SNAKE: SnakeCell[] = [
  { x: 2, y: 7 },
  { x: 1, y: 7 },
  { x: 0, y: 7 },
];

const OPPOSITE_DIRECTION: Record<SnakeDirection, SnakeDirection> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const DIRECTION_OFFSET: Record<SnakeDirection, SnakeCell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function createInitialSnakeGame(
  board: SnakeBoard = DEFAULT_SNAKE_BOARD,
  random: () => number = Math.random
): SnakeGameState {
  const snake = INITIAL_SNAKE.map((segment) => ({ ...segment }));

  return {
    snake,
    direction: 'right',
    nextDirection: 'right',
    food: createFood(board, snake, random),
    score: 0,
    status: 'ready',
  };
}

export function queueDirection(game: SnakeGameState, direction: SnakeDirection): SnakeGameState {
  const currentDirection = game.nextDirection;

  if (game.snake.length > 1 && OPPOSITE_DIRECTION[currentDirection] === direction) {
    return game;
  }

  if (currentDirection === direction) {
    return game;
  }

  return {
    ...game,
    nextDirection: direction,
    status: game.status === 'ready' ? 'running' : game.status,
  };
}

export function stepSnakeGame(
  game: SnakeGameState,
  board: SnakeBoard = DEFAULT_SNAKE_BOARD,
  random: () => number = Math.random
): SnakeGameState {
  if (game.status === 'paused' || game.status === 'game-over') {
    return game;
  }

  const direction = game.nextDirection;
  const head = game.snake[0];
  const offset = DIRECTION_OFFSET[direction];
  const nextHead = { x: head.x + offset.x, y: head.y + offset.y };
  const willEatFood = isSameCell(nextHead, game.food);
  const bodyToCheck = willEatFood ? game.snake : game.snake.slice(0, -1);

  if (isOutsideBoard(nextHead, board) || bodyToCheck.some((segment) => isSameCell(segment, nextHead))) {
    return {
      ...game,
      direction,
      status: 'game-over',
    };
  }

  const nextSnake = [nextHead, ...game.snake];
  if (!willEatFood) {
    nextSnake.pop();
  }

  return {
    snake: nextSnake,
    direction,
    nextDirection: direction,
    food: willEatFood ? createFood(board, nextSnake, random) : game.food,
    score: willEatFood ? game.score + 1 : game.score,
    status: 'running',
  };
}

export function createFood(
  board: SnakeBoard,
  snake: SnakeCell[],
  random: () => number = Math.random
): SnakeCell {
  const freeCells: SnakeCell[] = [];

  for (let y = 0; y < board.rows; y += 1) {
    for (let x = 0; x < board.columns; x += 1) {
      const occupied = snake.some((segment) => segment.x === x && segment.y === y);
      if (!occupied) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) {
    return snake[0];
  }

  const index = Math.min(freeCells.length - 1, Math.floor(random() * freeCells.length));
  return freeCells[index];
}

export function togglePaused(game: SnakeGameState): SnakeGameState {
  if (game.status === 'game-over' || game.status === 'ready') {
    return game;
  }

  return {
    ...game,
    status: game.status === 'paused' ? 'running' : 'paused',
  };
}

function isSameCell(left: SnakeCell, right: SnakeCell): boolean {
  return left.x === right.x && left.y === right.y;
}

function isOutsideBoard(cell: SnakeCell, board: SnakeBoard): boolean {
  return cell.x < 0 || cell.y < 0 || cell.x >= board.columns || cell.y >= board.rows;
}
