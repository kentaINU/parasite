import React, { useRef, useEffect, useState } from 'react';
import { GRID_SIZE, COLS, ROWS, PARASITE_INCREMENT } from './constants/settings';
import { TileType, Enemy, Position, Minion } from './types/game';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [player, setPlayer] = useState<Position>({ x: 1, y: 1 });
  const [minions, setMinions] = useState<Minion[]>([]); // 味方リスト
  const [map, setMap] = useState<TileType[][]>(() => {
    const grid = Array(ROWS).fill(0).map(() => Array(COLS).fill(1));
    grid[1][1] = 0;
    return grid;
  });

  const [enemy, setEnemy] = useState<Enemy>({
    id: 'hero-1',
    pos: { x: 15, y: 10 }, // 少し遠くに配置
    parasiteLevel: 0,
    isDead: false
  });

  // --- ゲームループ（味方の移動と攻撃） ---
  useEffect(() => {
    if (enemy.isDead) return;

    const interval = setInterval(() => {
      setMinions(currentMinions => {
        return currentMinions.map(m => {
          const dx = enemy.pos.x - m.pos.x;
          const dy = enemy.pos.y - m.pos.y;
          
          // 敵に隣接しているか？
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
            // 自動攻撃
            setEnemy(prev => ({
              ...prev,
              parasiteLevel: Math.min(prev.parasiteLevel + 2, 100),
              isDead: prev.parasiteLevel + 2 >= 100
            }));
            return m; // その場に留まる
          }

          // 敵の方へ一歩近づく (簡易AI)
          const nextPos = { ...m.pos };
          if (Math.abs(dx) > Math.abs(dy)) {
            nextPos.x += dx > 0 ? 1 : -1;
          } else {
            nextPos.y += dy > 0 ? 1 : -1;
          }

          // 通路(0)か養分(2)なら移動可能
          if (map[nextPos.y][nextPos.x] !== 1) {
            return { ...m, pos: nextPos };
          }
          return m;
        });
      });
    }, 500); // 0.5秒ごとに思考

    return () => clearInterval(interval);
  }, [enemy.pos, enemy.isDead, map]);

  // --- 描画処理 ---
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, COLS * GRID_SIZE, ROWS * GRID_SIZE);
    
    // マップ描画
    map.forEach((row, y) => {
      row.forEach((tile, x) => {
        ctx.fillStyle = tile === 1 ? '#5D4037' : tile === 2 ? '#4CAF50' : '#1A1A1A';
        ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      });
    });

    // 味方（ミニ寄生体）描画
    minions.forEach(m => {
      ctx.fillStyle = '#FF80AB';
      ctx.beginPath();
      ctx.arc(m.pos.x * GRID_SIZE + GRID_SIZE/2, m.pos.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/4, 0, Math.PI*2);
      ctx.fill();
    });

    // 敵描画
    if (!enemy.isDead) {
      const r = Math.floor(100 + (enemy.parasiteLevel * 1.55));
      ctx.fillStyle = `rgb(${r}, 50, 50)`;
      ctx.fillRect(enemy.pos.x * GRID_SIZE + 4, enemy.pos.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8);
      ctx.fillStyle = '#F00';
      ctx.fillRect(enemy.pos.x * GRID_SIZE, enemy.pos.y * GRID_SIZE - 10, (enemy.parasiteLevel / 100) * GRID_SIZE, 5);
    }

    // プレイヤー描画
    ctx.fillStyle = '#E91E63';
    ctx.beginPath();
    ctx.arc(player.x * GRID_SIZE + GRID_SIZE/2, player.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/3, 0, Math.PI*2);
    ctx.fill();

    canvasRef.current?.focus();
  }, [map, player, enemy, minions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(e.key)) {
      e.preventDefault();
    }

    let { x, y } = player;
    if (e.key === 'ArrowUp') y--;
    if (e.key === 'ArrowDown') y++;
    if (e.key === 'ArrowLeft') x--;
    if (e.key === 'ArrowRight') x++;

    // 召喚アクション (Enterキー)
    if (e.key === 'Enter' && map[player.y][player.x] === 2) {
      setMap(current => {
        const newMap = current.map(row => [...row]);
        newMap[player.y][player.x] = 0; // 養分を消費
        return newMap;
      });
      setMinions(prev => [...prev, { id: Date.now().toString(), pos: { x: player.x, y: player.y } }]);
      return;
    }

    // 寄生攻撃 (Spaceキー) - 既存のロジック
    if (e.key === ' ') {
      const isAdjacent = Math.abs(player.x - enemy.pos.x) <= 1 && Math.abs(player.y - enemy.pos.y) <= 1;
      if (isAdjacent && !enemy.isDead) {
        setEnemy(prev => {
          const nextLevel = prev.parasiteLevel + PARASITE_INCREMENT;
          const isNowDead = nextLevel >= 100;
          if (isNowDead) {
            setMap(currentMap => {
              const newMap = currentMap.map(row => [...row]);
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const ny = enemy.pos.y + dy; const nx = enemy.pos.x + dx;
                  if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && newMap[ny][nx] === 1) newMap[ny][nx] = 2;
                }
              }
              return newMap;
            });
          }
          return { ...prev, parasiteLevel: Math.min(nextLevel, 100), isDead: isNowDead };
        });
      }
      return;
    }

    // 移動と掘削
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
      setPlayer({ x, y });
      if (map[y][x] === 1) {
        const newMap = [...map];
        newMap[y] = [...newMap[y]];
        newMap[y][x] = 0;
        setMap(newMap);
      }
    }
  };

  return (
    <div style={{ textAlign: 'center', color: 'white' }}>
      <h1 style={{ color: '#E91E63' }}>PARASITE: SWARM</h1>
      <canvas ref={canvasRef} width={COLS * GRID_SIZE} height={ROWS * GRID_SIZE} tabIndex={0} onKeyDown={handleKeyDown} style={{ border: '4px solid #333', outline: 'none' }} />
      <div style={{ color: '#888', marginTop: '10px' }}>
        <p>【操作】 矢印: 移動 | スペース: 攻撃 | <b>Enter: 養分の上で召喚</b></p>
        <p>召喚したミニ寄生体は、自動で敵を追跡して寄生します。</p>
      </div>
    </div>
  );
};

export default App;