export type TileType = 0 | 1 | 2;

export interface Position {
  x: number;
  y: number;
}

// 追加: 味方ユニットの定義
export interface Minion {
  id: string;
  pos: Position;
}

export interface Enemy {
  id: string;
  pos: Position;
  parasiteLevel: number;
  isDead: boolean;
}