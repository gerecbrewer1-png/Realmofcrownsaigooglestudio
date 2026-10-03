import React, { useState, useEffect } from 'react';

interface BoardingEnemy {
  id: string;
  name: string;
  hull: number;
  hullMax: number;
  crew: number;
  rank: number;
  faction?: string;
}

export interface DeckBoardingModalProps {
  enemy: BoardingEnemy;
  playerCrew: number;
  onResolve: (result: 'plunder' | 'capture' | 'disengage', loot?: { gold: number; goods: string }, remainingPlayerCrew?: number) => void;
}

export const DeckBoardingModal: React.FC<DeckBoardingModalProps> = ({ enemy, playerCrew, onResolve }) => {
  const [currentEnemyCrew, setCurrentEnemyCrew] = useState(enemy.crew);
  const [currentPlayerCrew, setCurrentPlayerCrew] = useState(playerCrew);
  const [enemyMorale, setEnemyMorale] = useState(100);
  const [playerMorale, setPlayerMorale] = useState(100);
  const [logs, setLogs] = useState<string[]>([`Grappling hooks secured! Prepare for boarding ${enemy.name}!`]);
  const [musketCooldown, setMusketCooldown] = useState(0);

  useEffect(() => {
    if (musketCooldown > 0) {
      const timer = setTimeout(() => setMusketCooldown(m => m - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [musketCooldown]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const handleCutlassCharge = () => {
    const enemyLoss = Math.floor(Math.random() * 5 + 3 + (100 - enemyMorale) * 0.1);
    const playerLoss = Math.floor(Math.random() * 3 + 1 + (100 - playerMorale) * 0.05);
    
    setCurrentEnemyCrew(c => Math.max(0, c - enemyLoss));
    setCurrentPlayerCrew(c => Math.max(0, c - playerLoss));
    setEnemyMorale(m => Math.max(0, m - 5));
    addLog(`Cutlass Charge! We lost ${playerLoss} men, they lost ${enemyLoss}.`);
  };

  const handleMusketVolley = () => {
    if (musketCooldown > 0) return;
    const enemyLoss = Math.floor(Math.random() * 4 + 2);
    setCurrentEnemyCrew(c => Math.max(0, c - enemyLoss));
    setEnemyMorale(m => Math.max(0, m - 15));
    setMusketCooldown(3);
    addLog(`Musket Volley! ${enemyLoss} enemy crew down. Their morale drops!`);
  };

  const handleRally = () => {
    setPlayerMorale(m => Math.min(100, m + 20));
    addLog(`Rallied the crew! Morale restored.`);
  };

  const handleDisengage = () => {
    onResolve('disengage', undefined, currentPlayerCrew);
  };

  const handlePlunder = () => {
    const gold = Math.floor(500 * enemy.rank + Math.random() * 300);
    const goodsTypes = ['Spices', 'Silk', 'Timber', 'Iron'];
    const goods = goodsTypes[Math.floor(Math.random() * goodsTypes.length)];
    onResolve('plunder', { gold, goods }, currentPlayerCrew);
  };

  const handleCapture = () => {
    onResolve('capture', undefined, currentPlayerCrew);
  };

  const isVictory = currentEnemyCrew <= 0 || enemyMorale <= 0;
  const isDefeat = currentPlayerCrew <= 0 || playerMorale <= 0;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: 'serif'
    }}>
      <div style={{
        background: 'linear-gradient(to bottom, #2a1f1a, #1a100c)',
        border: '2px solid #8b5a2b', borderRadius: '8px', padding: '24px', width: '500px',
        boxShadow: '0 0 20px rgba(0,0,0,0.8)'
      }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 16px 0', color: '#fbbf24' }}>Boarding Action: {enemy.name}</h2>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ width: '45%' }}>
            <h3 style={{ color: '#60a5fa', margin: '0 0 8px 0' }}>Our Crew</h3>
            <div>Men: {currentPlayerCrew}</div>
            <div>Morale: {playerMorale}%</div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#333', marginTop: '4px' }}>
               <div style={{ width: `${Math.max(0, playerMorale)}%`, height: '100%', backgroundColor: '#60a5fa' }} />
            </div>
          </div>
          <div style={{ width: '45%', textAlign: 'right' }}>
            <h3 style={{ color: '#ef4444', margin: '0 0 8px 0' }}>Enemy Crew</h3>
            <div>Men: {currentEnemyCrew}</div>
            <div>Morale: {enemyMorale}%</div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#333', marginTop: '4px' }}>
               <div style={{ width: `${Math.max(0, enemyMorale)}%`, height: '100%', backgroundColor: '#ef4444', float: 'right' }} />
            </div>
          </div>
        </div>

        <div style={{ height: '100px', backgroundColor: '#000', padding: '8px', marginBottom: '24px', overflowY: 'auto', fontSize: '0.9em', color: '#a3a3a3', border: '1px solid #333' }}>
          {logs.map((log, i) => <div key={i} style={{ opacity: 1 - i * 0.2, marginBottom: '4px' }}>{log}</div>)}
        </div>

        {!isVictory && !isDefeat && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button onClick={handleCutlassCharge} style={btnStyle('#b91c1c')}>Cutlass Charge</button>
            <button onClick={handleMusketVolley} disabled={musketCooldown > 0} style={btnStyle(musketCooldown > 0 ? '#555' : '#4338ca')}>
              Musket Volley {musketCooldown > 0 ? `(${musketCooldown}s)` : ''}
            </button>
            <button onClick={handleRally} style={btnStyle('#047857')}>Rally Crew / First Aid</button>
            <button onClick={handleDisengage} style={btnStyle('#4b5563')}>Cut Grapples</button>
          </div>
        )}

        {isVictory && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#fbbf24' }}>Victory! The enemy strikes their colors!</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
              <button onClick={handlePlunder} style={btnStyle('#b91c1c')}>Plunder & Scuttle</button>
              <button onClick={handleCapture} style={btnStyle('#047857')}>Capture Vessel</button>
            </div>
          </div>
        )}

        {isDefeat && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#ef4444' }}>Defeat! Our attack has been repelled!</h3>
            <button onClick={handleDisengage} style={{ ...btnStyle('#4b5563'), marginTop: '16px' }}>Retreat!</button>
          </div>
        )}
      </div>
    </div>
  );
};

const btnStyle = (bg: string) => ({
  backgroundColor: bg, color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', cursor: 'pointer', fontWeight: 'bold' as any, borderRadius: '4px'
});
