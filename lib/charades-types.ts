// Charades / Silent Cinema Game Types and State Machine
// This file defines the authoritative game state structure

export type GamePhase = 
  | 'waiting'           // Lobby waiting for players
  | 'waiting_for_start' // Waiting for narrator to press "Start" button (manual start)
  | 'playing'           // Active gameplay - narrator is acting
  | 'time_up'           // Timer expired, waiting for narrator to continue
  | 'reveal'            // Showing correct answer after guess (intermission)
  | 'finished'          // Game completed normally
  | 'canceled';         // Game was disbanded/canceled

export type LobbyStatus = 'waiting' | 'playing' | 'finished';

export interface Turn {
  narratorId: string;
  taskId: string;
  taskContent: string;
}

export interface GameState {
  phase: GamePhase;
  
  // Player order - randomized once at game start
  // Each player narrates their tasks consecutively
  playerOrder: string[];
  
  // Lobby settings
  tasksPerPlayer: number;
  roundDurationSec: number;
  
  // Current turn info
  turn: {
    narratorId: string;
    narratorIndex: number;           // Index in playerOrder (0..playerOrder.length-1)
    wordIndexInBlock: number;        // 0..tasksPerPlayer-1 (current word within narrator's block)
    globalTurnIndex: number;         // Overall turn counter for UI
    taskId: string;
    taskContent: string;
  };
  
  // All tasks assigned to the game (for reference)
  taskQueue: Turn[];
  
  // Timer state
  timer: {
    startedAtMs: number | null;      // When current turn started (playing phase)
    durationSec: number;
    pausedAtMs: number | null;       // If paused, when it was paused
  };
  
  // Reveal/intermission state (after correct guess)
  reveal?: {
    taskContent: string;
    correctPlayerId: string;
    correctPlayerName: string;
    endsAtMs: number;                // When reveal phase ends
  };
  
  // State version for optimistic concurrency control
  version: number;
  
  // Last action timestamp for debugging
  lastActionAt: number;
  lastActionBy: string;
}

export interface Lobby {
  id: string;
  code: string;
  host_id: string;
  status: LobbyStatus;
  round_time_seconds: number;
  tasks_per_player: number;
  selected_categories: string[];
  current_game_state: GameState | null;
  created_at?: string;
}

export interface Player {
  id: string;
  nickname: string;
}

export interface LobbyPlayer {
  id: string;
  lobby_id: string;
  player_id: string;
  score: number;
  is_active: boolean;   // For tracking if player is still in game
  joined_at?: string;
}

export interface CharadesTask {
  id: string;
  content: string;
  category?: string;
}

// Helper to create initial game state
export function createInitialGameState(
  playerOrder: string[],
  taskQueue: Turn[],
  tasksPerPlayer: number,
  roundDurationSec: number,
  hostId: string
): GameState {
  const firstTask = taskQueue[0];
  
  return {
    phase: 'waiting_for_start', // Start with waiting phase - narrator must press button to start
    playerOrder,
    tasksPerPlayer,
    roundDurationSec,
    turn: {
      narratorId: firstTask.narratorId,
      narratorIndex: 0,
      wordIndexInBlock: 0,
      globalTurnIndex: 0,
      taskId: firstTask.taskId,
      taskContent: firstTask.taskContent,
    },
    taskQueue,
    timer: {
      startedAtMs: null, // Timer doesn't start until narrator presses button
      durationSec: roundDurationSec,
      pausedAtMs: null,
    },
    version: 1,
    lastActionAt: Date.now(),
    lastActionBy: hostId,
  };
}

// Helper to get next turn info
export function getNextTurnInfo(
  currentState: GameState
): { isGameOver: boolean; nextTurn?: GameState['turn'] } {
  const { turn, taskQueue, playerOrder, tasksPerPlayer } = currentState;
  const nextGlobalIndex = turn.globalTurnIndex + 1;
  
  // Check if game is over
  if (nextGlobalIndex >= taskQueue.length) {
    return { isGameOver: true };
  }
  
  const nextTask = taskQueue[nextGlobalIndex];
  const nextNarratorIndex = playerOrder.indexOf(nextTask.narratorId);
  
  // Calculate word index within narrator's block
  let wordIndexInBlock = 0;
  if (nextTask.narratorId === turn.narratorId) {
    // Same narrator, increment word index
    wordIndexInBlock = turn.wordIndexInBlock + 1;
  } else {
    // New narrator, reset to 0
    wordIndexInBlock = 0;
  }
  
  return {
    isGameOver: false,
    nextTurn: {
      narratorId: nextTask.narratorId,
      narratorIndex: nextNarratorIndex,
      wordIndexInBlock,
      globalTurnIndex: nextGlobalIndex,
      taskId: nextTask.taskId,
      taskContent: nextTask.taskContent,
    },
  };
}

// Helper to build task queue with consecutive tasks per player
export function buildTaskQueue(
  playerOrder: string[],
  tasks: CharadesTask[],
  tasksPerPlayer: number
): Turn[] {
  const shuffledTasks = [...tasks].sort(() => Math.random() - 0.5);
  const queue: Turn[] = [];
  let taskIndex = 0;
  
  // Each player gets `tasksPerPlayer` consecutive tasks
  for (const playerId of playerOrder) {
    for (let i = 0; i < tasksPerPlayer; i++) {
      if (taskIndex < shuffledTasks.length) {
        queue.push({
          narratorId: playerId,
          taskId: shuffledTasks[taskIndex].id,
          taskContent: shuffledTasks[taskIndex].content,
        });
        taskIndex++;
      }
    }
  }
  
  return queue;
}

// Translations for game messages
export const gameTranslations = {
  tr: {
    timeUp: "Süre Doldu!",
    continueNext: "Devam Et",
    waitingForNarrator: "Anlatıcı devam etmesini bekliyor...",
    correct: "Doğru!",
    guessedCorrectly: "doğru bildi!",
    skipWord: "Kelimeyi Geç",
    whoGuessed: "Kim Bildi?",
    yourWord: "Senin Kelimen",
    narrator: "Anlatıcı",
    guessNow: "TAHMİN ET!",
    gameOver: "Oyun Bitti!",
    scoreTable: "Skor Tablosu",
    turn: "Tur",
    leaveLobby: "Lobiden Çık",
    leaveGame: "Oyundan Çık",
    disbandLobby: "Lobiyi Dağıt",
    lobbyDisbanded: "Bu lobi yöneticisi tarafından dağıtıldı.",
    lobbyDisbandedShort: "Lobi dağıtıldı",
    confirmDisband: "Lobiyi dağıtmak istediğinizden emin misiniz? Tüm oyuncular çıkarılacak.",
    confirmLeave: "Oyundan ayrılmak istediğinizden emin misiniz?",
    connectionLost: "Bağlantı kesildi. Yeniden bağlanılıyor...",
    reconnected: "Bağlantı yeniden sağlandı!",
    playerLeft: "oyundan ayrıldı",
    narratorLeft: "Anlatıcı ayrıldı, sıra atlıyoruz...",
    notEnoughTasks: "Yeterli görev yok!",
    gameProgress: "Oyun İlerlemesi",
    remainingTime: "Kalan Süre",
    points: "puan",
    home: "Ana Sayfa",
    newGame: "Yeni Oyun",
    players: "Oyuncular",
    startGame: "Oyunu Başlat",
    deliverTaskStart: "Görevi ver ve başlat",
    deliverNextTask: "Sonraki görevi ver",
    deliverMyTurn: "Görevi ver ve sıramı başlat",
    waitingForNarratorStart: "Anlatıcının başlatmasını bekliyor...",
  },
  en: {
    timeUp: "Time's Up!",
    continueNext: "Continue",
    waitingForNarrator: "Waiting for narrator to continue...",
    correct: "Correct!",
    guessedCorrectly: "guessed correctly!",
    skipWord: "Skip Word",
    whoGuessed: "Who Guessed?",
    yourWord: "Your Word",
    narrator: "Narrator",
    guessNow: "GUESS NOW!",
    gameOver: "Game Over!",
    scoreTable: "Leaderboard",
    turn: "Turn",
    leaveLobby: "Leave Lobby",
    leaveGame: "Leave Game",
    disbandLobby: "Disband Lobby",
    deliverTaskStart: "Deliver task and start",
    deliverNextTask: "Deliver next task",
    deliverMyTurn: "Deliver task and start my turn",
    waitingForNarratorStart: "Waiting for narrator to start...",
    lobbyDisbanded: "This lobby was disbanded by the host.",
    lobbyDisbandedShort: "Lobby disbanded",
    confirmDisband: "Are you sure you want to disband? All players will be removed.",
    confirmLeave: "Are you sure you want to leave the game?",
    connectionLost: "Connection lost. Reconnecting...",
    reconnected: "Reconnected!",
    playerLeft: "left the game",
    narratorLeft: "Narrator left, skipping turn...",
    notEnoughTasks: "Not enough tasks!",
    gameProgress: "Game Progress",
    remainingTime: "Time Remaining",
    points: "pts",
    home: "Home",
    newGame: "New Game",
    players: "Players",
    startGame: "Start Game",
  },
};

export type GameTranslationKey = keyof typeof gameTranslations.tr;
