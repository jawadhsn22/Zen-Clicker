
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { ThemeConfig } from '../types';
import { Copy, Check, Globe, Loader2, Zap, Trophy, Link as LinkIcon, AlertCircle, Wifi } from 'lucide-react';
import { playSound } from '../utils/sound';

interface OnlineDuelProps {
  initialRoomId?: string | null;
  onClose: () => void;
  theme: ThemeConfig;
  onMatchComplete: (won: boolean) => void;
}

type GamePhase = 'INIT' | 'LOBBY' | 'CONNECTING' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';

interface PlayerState {
  peerId: string;
  score: number;
  color: string;
  label: string;
  isMe: boolean;
  isHost: boolean;
}

interface GameMessage {
  type: 'HELLO' | 'LOBBY_UPDATE' | 'START_REQ' | 'START_CONFIRM' | 'CLICK' | 'GAME_UPDATE' | 'GAME_OVER' | 'REMATCH';
  payload?: any;
}

const GAME_DURATION = 10;
const MAX_PLAYERS = 4;
// Rate limit: Max 20 clicks per second (50ms interval) to prevent macro spam
const MIN_CLICK_INTERVAL_MS = 50; 

const PLAYER_COLORS = [
  'text-red-500',    // P1
  'text-blue-500',   // P2
  'text-green-500',  // P3
  'text-yellow-500'  // P4
];

const OnlineDuel: React.FC<OnlineDuelProps> = ({ initialRoomId, onClose, theme, onMatchComplete }) => {
  const [phase, setPhase] = useState<GamePhase>('INIT');
  const [myId, setMyId] = useState<string>('');
  const [hostId, setHostId] = useState<string>('');
  
  // Players state - managed by Host, synced to Guests
  const [players, setPlayers] = useState<PlayerState[]>([]);
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingForConfirm, setWaitingForConfirm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isHost, setIsHost] = useState(!initialRoomId);

  // Game state
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

  // Refs
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]); // For Host: Array of guest connections
  const hostConnRef = useRef<DataConnection | null>(null); // For Guest: Connection to host
  const timerRef = useRef<number | null>(null);
  const handshakeTimeoutRef = useRef<number | null>(null);
  
  // Rate Limiting Refs (Host Side)
  const lastClickTimeRef = useRef<Record<string, number>>({});

  // --- Initialization ---

  useEffect(() => {
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
        // GUEST LOGIC
        setPhase('CONNECTING');
        connectToHost(peer, initialRoomId);
      } else {
        // HOST LOGIC
        setPhase('LOBBY');
        setPlayers([{
          peerId: id,
          score: 0,
          color: PLAYER_COLORS[0],
          label: 'Player 1 (Host)',
          isMe: true,
          isHost: true
        }]);
        setIsConnected(true); // Host is connected to themselves essentially
      }
    });

    // HOST: Handle incoming connections
    peer.on('connection', (conn) => {
      if (!initialRoomId) {
         handleHostIncomingConnection(conn);
      }
    });

    peer.on('error', (err) => {
      console.error(err);
      setError("Connection error. Refresh to try again.");
      setIsConnected(false);
    });

    return () => {
      peer.destroy();
      cleanupTimers();
    };
  }, []);

  const cleanupTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (handshakeTimeoutRef.current) clearTimeout(handshakeTimeoutRef.current);
  };

  // --- Host Logic ---

  const handleHostIncomingConnection = (conn: DataConnection) => {
    conn.on('open', () => {
      // Check limits
      if (connectionsRef.current.length >= MAX_PLAYERS - 1) {
        conn.close();
        return;
      }

      connectionsRef.current.push(conn);
      playSound('success');

      // Add new player locally
      setPlayers(prev => {
        const newPlayerIdx = prev.length;
        const newPlayers = [
          ...prev, 
          {
            peerId: conn.peer,
            score: 0,
            color: PLAYER_COLORS[newPlayerIdx],
            label: `Player ${newPlayerIdx + 1}`,
            isMe: false,
            isHost: false
          }
        ];
        
        // Broadcast new list to EVERYONE
        broadcastToGuests({
          type: 'LOBBY_UPDATE',
          payload: newPlayers
        });
        
        return newPlayers;
      });
    });

    conn.on('data', (data: any) => handleHostDataReceived(data, conn.peer));
    
    conn.on('close', () => {
      // Remove player
      connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
      setPlayers(prev => {
        const remaining = prev.filter(p => p.peerId !== conn.peer && p.peerId !== myId);
        // Rebuild list to keep colors consistent (Host always 0)
        const hostPlayer = prev.find(p => p.isHost)!;
        const newList = [hostPlayer, ...remaining].map((p, i) => ({
           ...p,
           color: PLAYER_COLORS[i],
           label: i === 0 ? 'Player 1 (Host)' : `Player ${i + 1}`
        }));
        
        broadcastToGuests({ type: 'LOBBY_UPDATE', payload: newList });
        return newList;
      });
    });
  };

  const handleHostDataReceived = (data: GameMessage, senderId: string) => {
    switch (data.type) {
      case 'START_CONFIRM':
        // Handshake received
        break;
      
      case 'CLICK':
        // RATE LIMITING CHECK
        const now = Date.now();
        const lastClick = lastClickTimeRef.current[senderId] || 0;
        if (now - lastClick < MIN_CLICK_INTERVAL_MS) {
            // Ignored - too fast (likely bot/script)
            return;
        }
        lastClickTimeRef.current[senderId] = now;

        // Update score for specific player
        setPlayers(prev => {
          const next = prev.map(p => {
             if (p.peerId === senderId) return { ...p, score: p.score + 1 };
             return p;
          });
          // Broadcast update immediately (authoritative state)
          broadcastToGuests({ type: 'GAME_UPDATE', payload: next });
          return next;
        });
        break;

      case 'REMATCH':
         // If a guest requests rematch, we reset.
         resetGame();
         broadcastToGuests({ type: 'REMATCH' });
         break;
    }
  };

  const broadcastToGuests = (msg: GameMessage) => {
    connectionsRef.current.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  };

  // --- Guest Logic ---

  const connectToHost = (peer: Peer, id: string) => {
    setHostId(id);
    const conn = peer.connect(id);
    hostConnRef.current = conn;
    
    conn.on('open', () => {
      setIsConnected(true);
      setError(null);
      setPhase('LOBBY');
      playSound('success');
      // Host will send us the player list shortly
    });

    conn.on('data', (data: any) => handleGuestDataReceived(data));
    
    conn.on('close', () => {
      setIsConnected(false);
      setError("Host disconnected.");
      setPhase('INIT');
    });

    conn.on('error', () => {
      setIsConnected(false);
      setError("Connection to host failed.");
    });
  };

  const handleGuestDataReceived = (data: GameMessage) => {
    switch (data.type) {
      case 'LOBBY_UPDATE':
        // Payload is the full list of players from host
        const lobbyList: PlayerState[] = data.payload;
        setPlayers(lobbyList.map(p => ({
          ...p,
          isMe: p.peerId === peerRef.current?.id
        })));
        break;

      case 'START_REQ':
         // Host starting game
         if (hostConnRef.current?.open) {
             hostConnRef.current.send({ type: 'START_CONFIRM' }); // Ack
         }
         startCountdown();
         break;

      case 'GAME_UPDATE':
         // Authoritative state from host
         const gameList: PlayerState[] = data.payload;
         setPlayers(gameList.map(p => ({
           ...p,
           isMe: p.peerId === peerRef.current?.id
         })));
         break;
      
      case 'GAME_OVER':
         setPhase('FINISHED');
         break;

      case 'REMATCH':
         resetGame();
         break;
    }
  };

  // --- Shared Game Logic ---

  const startCountdown = () => {
    setPhase('COUNTDOWN');
    // Reset scores
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
    setTimeLeft(GAME_DURATION);
    lastClickTimeRef.current = {}; // Reset limiters
    
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
    // Only Host manages the timer logic that ends the game
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (isHost) {
             endGameHost();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGameHost = () => {
    cleanupTimers();
    broadcastToGuests({ type: 'GAME_OVER' });
    setPhase('FINISHED');
    playSound('success');
    
    // Determine winner
    const winner = [...players].sort((a,b) => b.score - a.score)[0];
    onMatchComplete(winner.isMe);
  };

  useEffect(() => {
    if (phase === 'FINISHED') {
        cleanupTimers();
        if (!isHost) playSound('success');
    }
  }, [phase, isHost]);

  const handleHostStart = () => {
    // Strict check: Must be host, have players, and connection must be open (Host is always connected locally)
    if (isHost && connectionsRef.current.length > 0 && isConnected) {
      setWaitingForConfirm(true);
      broadcastToGuests({ type: 'START_REQ' });
      
      // Start locally after delay
      setTimeout(() => {
        setWaitingForConfirm(false);
        startCountdown();
      }, 500);
    }
  };

  const handleClick = () => {
    if (phase !== 'PLAYING') return;
    playSound('click');

    if (isHost) {
        // Host updates self locally then broadcasts
        setPlayers(prev => {
            const next = prev.map(p => p.isMe ? { ...p, score: p.score + 1 } : p);
            broadcastToGuests({ type: 'GAME_UPDATE', payload: next });
            return next;
        });
    } else {
        // Guest sends click to host
        if (hostConnRef.current?.open) {
            hostConnRef.current.send({ type: 'CLICK' });
        }
        // Optimistic update
        setPlayers(prev => prev.map(p => p.isMe ? { ...p, score: p.score + 1 } : p));
    }
  };

  const handleRematch = () => {
    if (isHost) {
        resetGame();
        broadcastToGuests({ type: 'REMATCH' });
    } else {
        if (hostConnRef.current?.open) {
            hostConnRef.current.send({ type: 'REMATCH' });
        }
    }
  };

  const resetGame = () => {
    setPhase('LOBBY');
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
    setTimeLeft(GAME_DURATION);
  };

  // --- Utils ---

  const getInviteUrl = useCallback(() => {
    if (!myId) return 'Generating...';
    try {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      const path = url.pathname;
      const lastSegment = path.split('/').pop();
      const looksLikeFile = lastSegment && lastSegment.includes('.');
      if (!path.endsWith('/') && !looksLikeFile) {
        url.pathname = path + '/';
      }
      url.searchParams.set('room', myId);
      return url.toString();
    } catch (e) {
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

  // --- Render ---

  const renderLobby = () => (
    <div className="flex flex-col items-center gap-6 animate-slide-in w-full max-w-md relative">
       {/* Connection Status Indicator */}
       <div className="absolute top-0 right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-md z-10">
          <Wifi size={12} className={isConnected ? "text-emerald-500" : "text-red-500"} />
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
            {isConnected ? 'Signal Stable' : 'Connecting...'}
          </span>
       </div>

       <div className={`relative p-4 rounded-full bg-white/5 ${theme.colors.accent} mt-8`}>
         <Globe size={48} className={isHost && players.length < 2 ? "animate-pulse" : ""} />
       </div>

       <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-2">
             {isHost ? 'Lobby' : 'Joined Lobby'}
          </h3>
          <p className="text-zinc-400 text-sm">
             {players.length} / {MAX_PLAYERS} Players Ready
          </p>
       </div>

       {/* Player List */}
       <div className="w-full grid grid-cols-2 gap-2">
          {players.map((p, i) => (
             <div key={p.peerId} className={`
                flex items-center gap-2 p-3 rounded-xl border bg-black/40
                ${p.isMe ? 'border-white/20' : 'border-transparent'}
             `}>
                <div className={`w-3 h-3 rounded-full ${p.color.replace('text-', 'bg-')}`} />
                <span className={`text-sm ${p.isMe ? 'font-bold text-white' : 'text-zinc-400'}`}>
                    {p.label} {p.isMe && '(You)'}
                </span>
             </div>
          ))}
          {/* Empty Slots */}
          {Array.from({ length: MAX_PLAYERS - players.length }).map((_, i) => (
             <div key={i} className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-white/10 text-zinc-600">
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
                <span className="text-sm">Empty</span>
             </div>
          ))}
       </div>

       {isHost && (
         <div className="w-full mt-4">
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${theme.colors.border} bg-black/20`}>
                <LinkIcon size={16} className="text-zinc-500 shrink-0" />
                <input 
                  readOnly 
                  value={getInviteUrl()} 
                  onClick={(e) => e.currentTarget.select()}
                  className="bg-transparent border-none text-xs text-zinc-300 w-full focus:outline-none font-mono truncate cursor-pointer"
                />
                <button onClick={copyInviteLink} className={`p-2 hover:bg-white/10 rounded ${copySuccess ? 'text-green-400' : 'text-white'}`}>
                   {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                </button>
            </div>
            
            <button 
               onClick={handleHostStart}
               disabled={players.length < 2 || waitingForConfirm || !isConnected}
               className={`
                  w-full mt-6 py-4 rounded-xl font-bold text-lg uppercase tracking-widest
                  bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
                  text-white shadow-lg shadow-violet-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all
               `}
            >
               {waitingForConfirm ? <Loader2 className="animate-spin mx-auto" /> : 'Start Match'}
            </button>
         </div>
       )}

       {!isHost && (
          <div className="flex items-center gap-3 text-zinc-400 bg-white/5 px-6 py-3 rounded-full mt-4">
             <Loader2 size={18} className="animate-spin" />
             <span>Waiting for host...</span>
          </div>
       )}
    </div>
  );

  const renderGame = () => {
    const gridClass = players.length <= 2 ? 'grid-rows-2 md:grid-rows-1 md:grid-cols-2' : 'grid-cols-2 grid-rows-2';

    return (
      <div className="flex-1 w-full h-full relative flex flex-col">
         {/* Timer Overlay */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            {phase === 'COUNTDOWN' ? (
                <div className="text-6xl font-black text-white animate-scale-bounce">Ready</div>
            ) : (
                <div className={`text-6xl font-mono font-bold ${timeLeft <= 3 ? 'text-red-500' : 'text-white'} drop-shadow-2xl`}>
                {timeLeft}
                </div>
            )}
         </div>

         <div className={`flex-1 grid ${gridClass} w-full h-full`}>
            {players.map((p, i) => (
                <div key={p.peerId} className={`relative border border-white/5 ${i % 2 === 0 ? 'bg-black/20' : 'bg-transparent'}`}>
                    {p.isMe ? (
                         <button
                            onPointerDown={(e) => { e.preventDefault(); handleClick(); }}
                            disabled={phase !== 'PLAYING'}
                            className={`w-full h-full flex flex-col items-center justify-center active:bg-white/5 transition-colors`}
                         >
                            <span className="text-xs uppercase tracking-widest text-zinc-500 mb-2">{p.label} (You)</span>
                            <span className={`text-6xl font-black ${p.color} drop-shadow-xl`}>{p.score}</span>
                            <span className="mt-4 text-xs text-zinc-600">TAP HERE</span>
                         </button>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            <span className="text-xs uppercase tracking-widest text-zinc-600 mb-2">{p.label}</span>
                            <span className="text-6xl font-black text-zinc-700 drop-shadow-xl">{p.score}</span>
                        </div>
                    )}
                </div>
            ))}
         </div>
      </div>
    );
  };

  const renderResults = () => {
    const sorted = [...players].sort((a,b) => b.score - a.score);
    const winner = sorted[0];
    const amIWinner = winner.isMe;
    const isTie = sorted[0].score === sorted[1]?.score;

    return (
        <div className="flex flex-col items-center justify-center gap-6 animate-slide-in">
           <Trophy size={80} className={`${amIWinner ? 'text-yellow-400' : 'text-zinc-600'} drop-shadow-2xl`} />
           
           <h2 className="text-4xl font-bold text-white uppercase tracking-tighter">
              {amIWinner ? 'Victory!' : isTie ? 'Tie Game' : 'Defeat'}
           </h2>

           <div className="w-full max-w-sm space-y-3">
               {sorted.map((p, i) => (
                   <div key={p.peerId} className={`flex justify-between items-center p-3 rounded-lg ${p.isMe ? 'bg-white/10' : 'bg-black/20'}`}>
                       <div className="flex items-center gap-3">
                           <span className="font-mono text-zinc-500">#{i+1}</span>
                           <span className={p.isMe ? 'text-white font-bold' : 'text-zinc-400'}>{p.label}</span>
                       </div>
                       <span className={`font-mono font-bold ${p.color}`}>{p.score}</span>
                   </div>
               ))}
           </div>

           <button 
             onClick={handleRematch}
             className="mt-4 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
           >
             {isHost ? 'Play Again' : 'Waiting for Host...'}
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

        {/* Content */}
        <div className="w-full h-full flex flex-col items-center justify-center pt-14 pb-4">
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
