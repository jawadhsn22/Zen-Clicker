import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Peer } from 'peerjs';
import { ThemeConfig } from '../types';
import { Copy, Check, Globe, Loader2, Zap, Trophy, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { playSound } from '../utils/sound';

interface OnlineDuelProps {
  initialRoomId?: string | null;
  onClose: () => void;
  theme: ThemeConfig;
  onMatchComplete: (won: boolean) => void;
}

type GamePhase = 'INIT' | 'LOBBY' | 'CONNECTING' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';

interface GameMessage {
  type: 'HELLO' | 'START_REQ' | 'START_CONFIRM' | 'CLICK' | 'GAME_OVER' | 'REMATCH' | 'SYNC';
  payload?: any;
}

const GAME_DURATION = 10;

const OnlineDuel: React.FC<OnlineDuelProps> = ({ initialRoomId, onClose, theme, onMatchComplete }) => {
  const [phase, setPhase] = useState<GamePhase>('INIT');
  const [myId, setMyId] = useState<string>('');
  const [hostId, setHostId] = useState<string>('');
  const [conn, setConn] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitingForConfirm, setWaitingForConfirm] = useState(false);
  
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isHost, setIsHost] = useState(!initialRoomId);

  const peerRef = useRef<Peer | null>(null);
  const timerRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<number | null>(null);

  // Initialize Peer
  useEffect(() => {
    // Explicit STUN configuration for better NAT traversal
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ]
      }
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      setMyId(id);
      if (initialRoomId) {
        setPhase('CONNECTING');
        connectToHost(peer, initialRoomId);
      } else {
        setPhase('LOBBY');
      }
    });

    peer.on('connection', (connection) => {
      setupConnection(connection);
    });

    peer.on('error', (err) => {
      console.error(err);
      setError("Connection error. Please refresh and try again.");
    });

    return () => {
      peer.destroy();
      if (timerRef.current) clearInterval(timerRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  const connectToHost = (peer: Peer, id: string) => {
    setHostId(id);
    const connection = peer.connect(id);
    setupConnection(connection);
  };

  const setupConnection = (connection: any) => {
    setConn(connection);
    
    connection.on('open', () => {
      setError(null);
      connection.send({ type: 'HELLO' });
      // Only set to lobby if we haven't already started (reconnection logic could go here)
      setPhase('LOBBY');
      playSound('success');
    });

    connection.on('data', (data: GameMessage) => {
      handleData(data, connection);
    });

    connection.on('close', () => {
      setError("Opponent disconnected.");
      setPhase('INIT');
    });
  };

  const handleData = (data: GameMessage, connection: any) => {
    switch (data.type) {
      case 'HELLO':
        // Connection established handshake
        break;
      case 'START_REQ':
        // Host requested start. Guest sends confirmation then starts countdown.
        if (connection && connection.open) {
            connection.send({ type: 'START_CONFIRM' });
            startCountdown();
        }
        break;
      case 'START_CONFIRM':
        // Host receives confirmation from guest.
        setWaitingForConfirm(false);
        startCountdown();
        break;
      case 'CLICK':
        // Immediate visual update
        setOpponentScore(data.payload);
        break;
      case 'SYNC':
        // Periodic consistency check - take the max to be safe
        setOpponentScore(prev => Math.max(prev, data.payload));
        break;
      case 'GAME_OVER':
        setPhase('FINISHED');
        break;
      case 'REMATCH':
        resetGame();
        break;
    }
  };

  const startCountdown = () => {
    setPhase('COUNTDOWN');
    setMyScore(0);
    setOpponentScore(0);
    setTimeLeft(GAME_DURATION);
    
    let count = 3;
    const countTimer = setInterval(() => {
      playSound('click');
      count--;
      if (count <= 0) {
        clearInterval(countTimer);
        setPhase('PLAYING');
        playSound('pop');
        startGameTimer();
      }
    }, 1000);
  };

  const startGameTimer = () => {
    // Game countdown timer
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Score synchronization timer (every 2s)
    syncIntervalRef.current = window.setInterval(() => {
      setMyScore(currentScore => {
        // We use the functional update to get the latest score value to send
        if (conn && conn.open) {
          conn.send({ type: 'SYNC', payload: currentScore });
        }
        return currentScore;
      });
    }, 2000);
  };

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    setPhase('FINISHED');
    playSound('success');
    onMatchComplete(myScore > opponentScore);
  };

  const handleHostStart = () => {
    if (conn && conn.open) {
      setWaitingForConfirm(true);
      conn.send({ type: 'START_REQ' });
    } else {
        setError("Connection lost. Cannot start.");
    }
  };

  const handleClick = () => {
    if (phase !== 'PLAYING') return;
    const newScore = myScore + 1;
    setMyScore(newScore);
    playSound('click');
    if (conn && conn.open) {
      conn.send({ type: 'CLICK', payload: newScore });
    }
  };

  const handleRematch = () => {
    resetGame();
    if (conn && conn.open) conn.send({ type: 'REMATCH' });
  };

  const resetGame = () => {
    setPhase('LOBBY');
    setMyScore(0);
    setOpponentScore(0);
    setTimeLeft(GAME_DURATION);
  };

  const getInviteUrl = useCallback(() => {
    if (!myId) return 'Generating...';
    try {
      const url = new URL(window.location.href);
      
      // Remove any existing query params or hash
      url.search = '';
      url.hash = '';

      // Fix for "Server Not Found" on static hosts:
      const path = url.pathname;
      const lastSegment = path.split('/').pop();
      const looksLikeFile = lastSegment && lastSegment.includes('.');
      
      if (!path.endsWith('/') && !looksLikeFile) {
        url.pathname = path + '/';
      }

      url.searchParams.set('room', myId);
      return url.toString();
    } catch (e) {
      console.error('URL generation failed:', e);
      return `${window.location.origin}${window.location.pathname}?room=${myId}`;
    }
  }, [myId]);

  const copyInviteLink = () => {
    const url = getInviteUrl();
    if (url !== 'Generating...') {
      navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Render Helpers
  const renderLobby = () => (
    <div className="flex flex-col items-center gap-6 animate-slide-in w-full max-w-md">
      <div className={`p-4 rounded-full bg-white/5 ${theme.colors.accent}`}>
        <Globe size={48} />
      </div>
      
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">
          {conn ? 'Opponent Connected!' : isHost ? 'Waiting for Player...' : 'Connecting to Host...'}
        </h3>
        <p className="text-zinc-400 text-sm">
          {conn ? 'Ready to duel.' : isHost ? 'Share the link below to invite a friend.' : 'Establishing secure connection.'}
        </p>
      </div>

      {isHost && !conn && (
        <div className="w-full">
           <div className={`flex items-center gap-2 p-3 rounded-xl border ${theme.colors.border} bg-black/20`}>
              <LinkIcon size={16} className="text-zinc-500 shrink-0" />
              <input 
                readOnly 
                value={getInviteUrl()} 
                onClick={(e) => e.currentTarget.select()}
                className="bg-transparent border-none text-xs text-zinc-300 w-full focus:outline-none font-mono truncate cursor-pointer"
              />
              <button 
                onClick={copyInviteLink}
                className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${copySuccess ? 'text-green-400' : 'text-white'}`}
              >
                {copySuccess ? <Check size={18} /> : <Copy size={18} />}
              </button>
           </div>
           <p className="text-center text-xs text-zinc-500 mt-2">Only share with people you trust.</p>
        </div>
      )}

      {conn && isHost && (
        <button 
          onClick={handleHostStart}
          disabled={waitingForConfirm}
          className={`
            w-full py-4 rounded-xl font-bold text-lg uppercase tracking-widest
            bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
            text-white shadow-lg shadow-violet-500/20
            animate-pulse-slow
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {waitingForConfirm ? (
            <div className="flex items-center justify-center gap-2">
                 <Loader2 size={20} className="animate-spin" />
                 <span>Syncing...</span>
            </div>
          ) : 'Start Duel'}
        </button>
      )}

      {conn && !isHost && (
        <div className="flex items-center gap-3 text-zinc-400 bg-white/5 px-6 py-3 rounded-full">
          <Loader2 size={18} className="animate-spin" />
          <span>Waiting for host to start...</span>
        </div>
      )}
    </div>
  );

  const renderGame = () => (
    <div className="flex-1 w-full flex flex-col relative">
       {/* Timer */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          {phase === 'COUNTDOWN' ? (
             <div className="text-6xl font-black text-white animate-scale-bounce">Ready</div>
          ) : (
            <div className={`text-5xl font-mono font-bold ${timeLeft <= 3 ? 'text-red-500' : 'text-white'} drop-shadow-lg`}>
              {timeLeft}
            </div>
          )}
       </div>

       <div className="flex-1 flex flex-col md:flex-row h-full">
          {/* My Side */}
          <div className="flex-1 relative border-b md:border-b-0 md:border-r border-white/10">
            <button
                onPointerDown={(e) => {
                    e.preventDefault(); 
                    handleClick();
                }}
                disabled={phase !== 'PLAYING'}
                className={`w-full h-full flex flex-col items-center justify-center transition-all ${phase === 'PLAYING' ? 'active:bg-white/5 cursor-pointer' : 'cursor-default'}`}
            >
                <span className="text-sm uppercase tracking-widest text-zinc-500 mb-4">You</span>
                <span className={`text-8xl font-black ${theme.colors.accent} drop-shadow-2xl transition-all ${phase === 'PLAYING' ? 'scale-100' : 'opacity-50'}`}>
                    {myScore}
                </span>
                <span className="mt-8 text-zinc-500 text-xs uppercase">Tap to click</span>
            </button>
          </div>

          {/* Opponent Side */}
          <div className="flex-1 flex flex-col items-center justify-center bg-black/20">
             <span className="text-sm uppercase tracking-widest text-zinc-600 mb-4">Opponent</span>
             <span className="text-8xl font-black text-zinc-700 drop-shadow-2xl">
                 {opponentScore}
             </span>
          </div>
       </div>
    </div>
  );

  const renderResults = () => {
    const won = myScore > opponentScore;
    const tie = myScore === opponentScore;

    return (
      <div className="flex flex-col items-center justify-center gap-6 animate-slide-in">
        <div className="relative">
             <Trophy size={80} className={`${won ? 'text-yellow-400' : tie ? 'text-zinc-400' : 'text-zinc-700'} drop-shadow-2xl`} />
             {won && <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20" />}
        </div>
        
        <h2 className="text-5xl font-bold text-white uppercase tracking-tighter">
            {won ? 'Victory!' : tie ? 'Draw' : 'Defeat'}
        </h2>
        
        <div className="flex items-end gap-8 text-2xl font-mono">
            <div className="text-center">
                <div className="text-xs text-zinc-500 uppercase mb-1">You</div>
                <div className={won ? 'text-green-400' : 'text-white'}>{myScore}</div>
            </div>
            <div className="text-zinc-600 font-light">:</div>
            <div className="text-center">
                <div className="text-xs text-zinc-500 uppercase mb-1">Opponent</div>
                <div className={!won && !tie ? 'text-red-400' : 'text-white'}>{opponentScore}</div>
            </div>
        </div>

        <button 
          onClick={handleRematch}
          className="mt-8 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
        >
          Play Again
        </button>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-black/20 border-b border-white/5 z-20">
         <div className="flex items-center gap-2">
            <Zap size={18} className={theme.colors.accent} />
            <span className="font-bold text-white tracking-wide">Online Duel</span>
         </div>
         <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-sm">
            Leave Match
         </button>
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex flex-col items-center justify-center pt-16 pb-4">
        {error ? (
          <div className="text-center p-8 animate-slide-in">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <p className="text-red-200 mb-4">{error}</p>
            <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20">Close</button>
          </div>
        ) : (
          <>
            {(phase === 'INIT' || phase === 'LOBBY' || phase === 'CONNECTING') && renderLobby()}
            {(phase === 'COUNTDOWN' || phase === 'PLAYING') && renderGame()}
            {phase === 'FINISHED' && renderResults()}
          </>
        )}
      </div>
    </div>
  );
};

export default OnlineDuel;