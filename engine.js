(function initBadSantaEngine(globalScope) {
  const GIFT_ICON_IDS = [
    'gift', 'coffee', 'headphones', 'voucher', 'wine', 'candle', 'chocolate', 'game',
    'controller', 'cozy', 'plant', 'book', 'kitchen', 'music', 'gem', 'gag'
  ];

  const DEFAULT_SETTINGS = {
    maxStealsPerGift: 3, // 0 = unlimited
    allowStealBack: false,
    firstPlayerBonusTurn: true
  };

  class GameError extends Error {
    constructor(message) {
      super(message);
      this.name = 'GameError';
    }
  }

  let idSeq = 0;
  function generateId(prefix = '') {
    idSeq += 1;
    return `${prefix}${Date.now().toString(36)}_${idSeq}_${Math.random().toString(36).slice(2, 6)}`;
  }

  function sanitizeText(value, maxLen = 80) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ').slice(0, maxLen);
  }

  function normalizeIcon(icon) {
    if (typeof icon === 'string' && GIFT_ICON_IDS.includes(icon)) {
      return icon;
    }
    return 'gift';
  }

  function normalizeSettings(input = {}, base = DEFAULT_SETTINGS) {
    const next = { ...base };
    if (input.maxStealsPerGift !== undefined) {
      const num = Number(input.maxStealsPerGift);
      if (!Number.isInteger(num) || num < 0 || num > 10) {
        throw new GameError('Max steals per gift must be an integer between 0 (unlimited) and 10.');
      }
      next.maxStealsPerGift = num;
    }
    if (input.allowStealBack !== undefined) {
      next.allowStealBack = Boolean(input.allowStealBack);
    }
    if (input.firstPlayerBonusTurn !== undefined) {
      next.firstPlayerBonusTurn = Boolean(input.firstPlayerBonusTurn);
    }
    return next;
  }

  function createInitialState({ playerCount = 8, settings = DEFAULT_SETTINGS } = {}) {
    return {
      phase: 'setup', // 'setup' | 'playing' | 'final_bonus' | 'finished'
      playerCount,
      settings: normalizeSettings(settings),
      players: [],
      gifts: [],
      currentTurnNumber: 1,
      activePlayerNumber: null,
      chainStolenGiftIds: [],
      currentChainLength: 0,
      currentChainNumbers: [],
      longestStealChain: { length: 0, playerNumbers: [] },
      eventLog: [],
      lastEvent: null,
      undoStack: [],
      updatedAt: Date.now()
    };
  }

  function createSnapshot(state) {
    return {
      phase: state.phase,
      players: state.players.map((p) => ({ ...p })),
      gifts: state.gifts.map((g) => ({
        ...g,
        history: g.history.map((h) => ({ ...h }))
      })),
      currentTurnNumber: state.currentTurnNumber,
      activePlayerNumber: state.activePlayerNumber,
      chainStolenGiftIds: [...state.chainStolenGiftIds],
      currentChainLength: state.currentChainLength,
      currentChainNumbers: [...state.currentChainNumbers],
      longestStealChain: {
        length: state.longestStealChain.length,
        playerNumbers: [...state.longestStealChain.playerNumbers]
      },
      eventLog: state.eventLog.map((e) => ({ ...e })),
      lastEvent: state.lastEvent ? { ...state.lastEvent } : null
    };
  }

  function pushUndoSnapshot(state) {
    state.undoStack.push(createSnapshot(state));
    if (state.undoStack.length > 60) {
      state.undoStack.shift();
    }
  }

  function addEvent(state, type, message, meta = {}) {
    const evt = {
      id: generateId('evt_'),
      type,
      message,
      meta,
      timestamp: Date.now()
    };
    state.eventLog.push(evt);
    if (state.eventLog.length > 200) {
      state.eventLog.shift();
    }
    state.lastEvent = evt;
    return evt;
  }

  function findPlayer(state, num) {
    return state.players.find((p) => p.number === num) || null;
  }

  function findGift(state, giftId) {
    return state.gifts.find((g) => g.id === giftId) || null;
  }

  function getEligibleStealGiftIds(state) {
    const activeNum = state.activePlayerNumber;
    if (!activeNum) return [];

    if (state.phase === 'playing') {
      return state.gifts
        .filter((g) => {
          if (!g.ownerNumber || g.ownerNumber === activeNum) return false;
          if (g.frozen) return false;
          if (!state.settings.allowStealBack && state.chainStolenGiftIds.includes(g.id)) {
            return false;
          }
          return true;
        })
        .map((g) => g.id);
    }

    if (state.phase === 'final_bonus') {
      return state.gifts
        .filter((g) => g.ownerNumber && g.ownerNumber !== activeNum && !g.frozen)
        .map((g) => g.id);
    }

    return [];
  }

  function startGame(state, { playerCount, settings = {} }) {
    const count = Number(playerCount);
    if (!Number.isInteger(count) || count < 2 || count > 60) {
      throw new GameError('Number of players must be between 2 and 60.');
    }

    const next = createInitialState({
      playerCount: count,
      settings: normalizeSettings(settings, state.settings)
    });

    next.phase = 'playing';
    next.players = Array.from({ length: count }, (_, idx) => ({
      number: idx + 1,
      giftId: null,
      stealsMade: 0,
      timesStolenFrom: 0
    }));
    next.currentTurnNumber = 1;
    next.activePlayerNumber = 1;

    addEvent(next, 'game_started', `Bad Santa started with ${count} players (1–${count}). Player 1 goes first!`, {
      icon: 'tree'
    });
    return next;
  }

  function unwrapGift(state, { title, icon = 'gift' }) {
    if (state.phase !== 'playing') {
      throw new GameError('Can only unwrap gifts during active play.');
    }
    const cleanTitle = sanitizeText(title, 80);
    if (!cleanTitle) {
      throw new GameError('Enter the unwrapped gift name!');
    }
    const cleanIcon = normalizeIcon(icon);
    const activePlayer = findPlayer(state, state.activePlayerNumber);
    if (!activePlayer) {
      throw new GameError('No active player right now.');
    }
    if (state.gifts.length >= state.playerCount) {
      throw new GameError('All gifts have already been unwrapped!');
    }

    pushUndoSnapshot(state);

    const gift = {
      id: generateId('g_'),
      title: cleanTitle,
      icon: cleanIcon,
      ownerNumber: activePlayer.number,
      stealCount: 0,
      frozen: false,
      history: [
        {
          action: 'unwrapped',
          playerNumber: activePlayer.number,
          timestamp: Date.now()
        }
      ]
    };

    state.gifts.push(gift);
    activePlayer.giftId = gift.id;

    state.chainStolenGiftIds = [];
    state.currentChainLength = 0;
    state.currentChainNumbers = [];

    const evt = addEvent(
      state,
      'gift_unwrapped',
      `Player ${activePlayer.number} unwrapped "${gift.title}"`,
      { playerNumber: activePlayer.number, giftId: gift.id, title: gift.title, icon: gift.icon }
    );

    state.currentTurnNumber += 1;
    if (state.currentTurnNumber <= state.playerCount) {
      state.activePlayerNumber = state.currentTurnNumber;
    } else if (state.settings.firstPlayerBonusTurn) {
      state.phase = 'final_bonus';
      state.activePlayerNumber = 1;
      const swappable = getEligibleStealGiftIds(state);
      if (swappable.length === 0) {
        state.phase = 'finished';
        state.activePlayerNumber = null;
        addEvent(state, 'game_finished', 'Every other gift is frozen — Bad Santa is officially over!', {
          icon: 'trophy'
        });
      } else {
        addEvent(
          state,
          'final_bonus_started',
          'Final Bonus Turn: Player 1 may keep their gift or swap with any unfrozen gift!',
          { icon: 'crown' }
        );
      }
    } else {
      state.phase = 'finished';
      state.activePlayerNumber = null;
      addEvent(state, 'game_finished', 'All gifts have been unwrapped — Game Over!', {
        icon: 'trophy'
      });
    }

    state.updatedAt = Date.now();
    return { gift, event: evt };
  }

  function stealGift(state, { giftId }) {
    if (state.phase !== 'playing') {
      throw new GameError('Stealing is only allowed during active play.');
    }
    const activePlayer = findPlayer(state, state.activePlayerNumber);
    if (!activePlayer) {
      throw new GameError('No active player right now.');
    }
    const gift = findGift(state, giftId);
    if (!gift || !gift.ownerNumber) {
      throw new GameError('Gift not found.');
    }
    if (gift.ownerNumber === activePlayer.number) {
      throw new GameError(`Player ${activePlayer.number} already owns that gift!`);
    }
    if (gift.frozen) {
      throw new GameError('That gift is FROZEN and can no longer be stolen!');
    }
    if (!state.settings.allowStealBack && state.chainStolenGiftIds.includes(gift.id)) {
      throw new GameError('No steal-backs! That gift was already stolen on this turn.');
    }

    const victim = findPlayer(state, gift.ownerNumber);
    if (!victim) {
      throw new GameError('Gift owner not found.');
    }

    pushUndoSnapshot(state);

    victim.giftId = null;
    gift.ownerNumber = activePlayer.number;
    activePlayer.giftId = gift.id;

    gift.stealCount += 1;
    let becameFrozen = false;
    if (state.settings.maxStealsPerGift > 0 && gift.stealCount >= state.settings.maxStealsPerGift) {
      gift.frozen = true;
      becameFrozen = true;
    }

    gift.history.push({
      action: 'stolen',
      playerNumber: activePlayer.number,
      fromPlayerNumber: victim.number,
      stealNumber: gift.stealCount,
      frozen: becameFrozen,
      timestamp: Date.now()
    });

    activePlayer.stealsMade += 1;
    victim.timesStolenFrom += 1;

    state.chainStolenGiftIds.push(gift.id);
    state.currentChainLength += 1;
    state.currentChainNumbers.push(activePlayer.number);

    if (state.currentChainLength > state.longestStealChain.length) {
      state.longestStealChain = {
        length: state.currentChainLength,
        playerNumbers: [...state.currentChainNumbers]
      };
    }

    state.activePlayerNumber = victim.number;

    const freezeText = becameFrozen ? ' — FROZEN FOREVER!' : '';
    const evt = addEvent(
      state,
      becameFrozen ? 'gift_frozen' : 'gift_stolen',
      `Player ${activePlayer.number} stole "${gift.title}" from Player ${victim.number}${freezeText}`,
      {
        thiefNumber: activePlayer.number,
        victimNumber: victim.number,
        giftId: gift.id,
        stealCount: gift.stealCount,
        frozen: becameFrozen,
        icon: becameFrozen ? 'freeze' : 'steal'
      }
    );

    state.updatedAt = Date.now();
    return { gift, victim, becameFrozen, event: evt };
  }

  function finalBonusAction(state, { action, targetGiftId }) {
    if (state.phase !== 'final_bonus') {
      throw new GameError('Not currently in the final bonus turn.');
    }
    const playerOne = findPlayer(state, 1);
    if (!playerOne) {
      throw new GameError('Player 1 not found.');
    }

    if (action === 'keep') {
      pushUndoSnapshot(state);
      const held = findGift(state, playerOne.giftId);
      state.phase = 'finished';
      state.activePlayerNumber = null;
      const evt = addEvent(
        state,
        'game_finished',
        `Player 1 kept ${held ? `"${held.title}"` : 'their gift'}. Game Over!`,
        { icon: 'crown' }
      );
      state.updatedAt = Date.now();
      return { event: evt };
    }

    if (action === 'swap') {
      const targetGift = findGift(state, targetGiftId);
      if (!targetGift || !targetGift.ownerNumber) {
        throw new GameError('Target gift not found.');
      }
      if (targetGift.ownerNumber === 1) {
        throw new GameError('Player 1 already owns that gift!');
      }
      if (targetGift.frozen) {
        throw new GameError('That gift is frozen and cannot be swapped!');
      }
      const targetOwner = findPlayer(state, targetGift.ownerNumber);
      const p1Gift = findGift(state, playerOne.giftId);
      if (!targetOwner || !p1Gift) {
        throw new GameError('Could not locate gifts for final swap.');
      }

      pushUndoSnapshot(state);

      playerOne.giftId = targetGift.id;
      targetGift.ownerNumber = 1;

      targetOwner.giftId = p1Gift.id;
      p1Gift.ownerNumber = targetOwner.number;

      targetGift.stealCount += 1;
      if (state.settings.maxStealsPerGift > 0 && targetGift.stealCount >= state.settings.maxStealsPerGift) {
        targetGift.frozen = true;
      }

      targetGift.history.push({
        action: 'final_swap',
        playerNumber: 1,
        fromPlayerNumber: targetOwner.number,
        timestamp: Date.now()
      });
      p1Gift.history.push({
        action: 'final_swap_received',
        playerNumber: targetOwner.number,
        fromPlayerNumber: 1,
        timestamp: Date.now()
      });

      playerOne.stealsMade += 1;
      targetOwner.timesStolenFrom += 1;

      state.phase = 'finished';
      state.activePlayerNumber = null;

      const evt = addEvent(
        state,
        'final_swap',
        `Plot Twist: Player 1 swapped "${p1Gift.title}" for Player ${targetOwner.number}'s "${targetGift.title}"!`,
        { icon: 'crown' }
      );
      state.updatedAt = Date.now();
      return { event: evt };
    }

    throw new GameError('Action must be "keep" or "swap".');
  }

  function editGift(state, { giftId, title, icon }) {
    const gift = findGift(state, giftId);
    if (!gift) {
      throw new GameError('Gift not found.');
    }
    if (title !== undefined) {
      const clean = sanitizeText(title, 80);
      if (!clean) throw new GameError('Gift name cannot be empty.');
      gift.title = clean;
    }
    if (icon !== undefined) {
      gift.icon = normalizeIcon(icon);
    }
    state.updatedAt = Date.now();
    return gift;
  }

  function undoLastAction(state) {
    if (state.undoStack.length === 0) {
      throw new GameError('Nothing left to undo.');
    }
    const snap = state.undoStack.pop();
    state.phase = snap.phase;
    state.players = snap.players;
    state.gifts = snap.gifts;
    state.currentTurnNumber = snap.currentTurnNumber;
    state.activePlayerNumber = snap.activePlayerNumber;
    state.chainStolenGiftIds = snap.chainStolenGiftIds;
    state.currentChainLength = snap.currentChainLength;
    state.currentChainNumbers = snap.currentChainNumbers;
    state.longestStealChain = snap.longestStealChain;
    state.eventLog = snap.eventLog;
    state.lastEvent = addEvent(state, 'undo', 'Undid the last move', { icon: 'undo' });
    state.updatedAt = Date.now();
    return state;
  }

  function computeAwards(state) {
    const awards = [];

    const topGift = [...state.gifts].sort((a, b) => b.stealCount - a.stealCount)[0];
    if (topGift && topGift.stealCount > 0) {
      awards.push({
        id: 'most_wanted',
        icon: 'flame',
        title: 'Most Wanted Gift',
        winner: topGift.title,
        detail: `Stolen ${topGift.stealCount} time${topGift.stealCount === 1 ? '' : 's'}${topGift.frozen ? ' (Frozen)' : ''}`
      });
    }

    const topGrinch = [...state.players].sort((a, b) => b.stealsMade - a.stealsMade)[0];
    if (topGrinch && topGrinch.stealsMade > 0) {
      awards.push({
        id: 'biggest_grinch',
        icon: 'steal',
        title: 'Biggest Bad Santa',
        winner: `Player ${topGrinch.number}`,
        detail: `Pulled off ${topGrinch.stealsMade} ruthless steal${topGrinch.stealsMade === 1 ? '' : 's'}`
      });
    }

    const mostMugged = [...state.players].sort((a, b) => b.timesStolenFrom - a.timesStolenFrom)[0];
    if (mostMugged && mostMugged.timesStolenFrom > 0) {
      awards.push({
        id: 'most_mugged',
        icon: 'robbed',
        title: 'Most Robbed Player',
        winner: `Player ${mostMugged.number}`,
        detail: `Got robbed ${mostMugged.timesStolenFrom} time${mostMugged.timesStolenFrom === 1 ? '' : 's'}`
      });
    }

    if (state.longestStealChain.length >= 2) {
      awards.push({
        id: 'chaos_chain',
        icon: 'bolt',
        title: 'Longest Steal Chain',
        winner: `${state.longestStealChain.length} Steals in a Row`,
        detail: state.longestStealChain.playerNumbers.join(' → ')
      });
    }

    const untouched = state.gifts.find((g) => g.stealCount === 0);
    if (untouched) {
      awards.push({
        id: 'untouchable',
        icon: 'peace',
        title: 'Peaceful Present',
        winner: untouched.title,
        detail: `Stayed safely with Player ${untouched.ownerNumber} (0 steals)`
      });
    }

    return awards;
  }

  function serializeState(state) {
    const eligibleStealGiftIds = getEligibleStealGiftIds(state);
    const wrappedRemaining = Math.max(0, state.playerCount - state.gifts.length);
    const nextScheduledNumber =
      state.phase === 'playing' && state.currentTurnNumber < state.playerCount
        ? state.currentTurnNumber + 1
        : null;

    return {
      phase: state.phase,
      playerCount: state.playerCount,
      settings: { ...state.settings },
      players: state.players.map((p) => ({
        ...p,
        isActive: state.activePlayerNumber === p.number,
        hasGone: p.number < state.currentTurnNumber
      })),
      gifts: state.gifts.map((g) => ({
        ...g,
        icon: normalizeIcon(g.icon),
        protectedThisTurn: !state.settings.allowStealBack && state.chainStolenGiftIds.includes(g.id),
        canBeStolen: eligibleStealGiftIds.includes(g.id)
      })),
      currentTurnNumber: state.currentTurnNumber,
      activePlayerNumber: state.activePlayerNumber,
      nextScheduledNumber,
      eligibleStealGiftIds,
      stats: {
        wrappedRemaining,
        openedCount: state.gifts.length,
        totalPlayers: state.playerCount,
        currentChainLength: state.currentChainLength,
        longestStealChain: state.longestStealChain,
        canUndo: state.undoStack.length > 0
      },
      eventLog: state.eventLog.slice(-40),
      lastEvent: state.lastEvent,
      awards: state.phase === 'finished' ? computeAwards(state) : []
    };
  }

  const BadSantaEngine = {
    GIFT_ICON_IDS,
    DEFAULT_SETTINGS,
    GameError,
    createInitialState,
    startGame,
    unwrapGift,
    stealGift,
    finalBonusAction,
    editGift,
    undoLastAction,
    getEligibleStealGiftIds,
    computeAwards,
    serializeState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadSantaEngine;
  } else {
    globalScope.BadSantaEngine = BadSantaEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
