const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GameError,
  createInitialState,
  startGame,
  unwrapGift,
  stealGift,
  finalBonusAction,
  editGift,
  undoLastAction,
  serializeState
} = require('../engine');

test('full numbered-player Bad Santa flow: unwrap, steal chain, no steal-back, freeze, undo, final swap', () => {
  let state = createInitialState();
  state = startGame(state, {
    playerCount: 3,
    settings: {
      maxStealsPerGift: 2,
      allowStealBack: false,
      firstPlayerBonusTurn: true
    }
  });

  assert.equal(state.phase, 'playing');
  assert.equal(state.activePlayerNumber, 1);

  // Turn 1: #1 unwraps "Espresso Frother"
  const { gift: g1 } = unwrapGift(state, { title: 'Espresso Frother', emoji: '☕' });
  assert.equal(g1.ownerNumber, 1);
  assert.equal(state.activePlayerNumber, 2);
  assert.equal(state.currentTurnNumber, 2);

  // Turn 2: #2 steals g1 from #1 (steal #1)
  stealGift(state, { giftId: g1.id });
  assert.equal(g1.ownerNumber, 2);
  assert.equal(g1.stealCount, 1);
  assert.equal(g1.frozen, false);
  assert.equal(state.activePlayerNumber, 1);

  // #1 cannot immediately steal g1 back on the same turn
  assert.throws(
    () => stealGift(state, { giftId: g1.id }),
    (err) => err instanceof GameError && /No steal-backs/.test(err.message)
  );

  // #1 unwraps "Singing Bass" -> Turn 2 ends, Turn 3 (#3) starts
  const { gift: g2 } = unwrapGift(state, { title: 'Singing Bass', emoji: '🐟' });
  assert.equal(g2.ownerNumber, 1);
  assert.equal(state.activePlayerNumber, 3);
  assert.equal(state.currentTurnNumber, 3);

  // Turn 3: #3 steals g1 from #2 -> 2nd steal hits maxStealsPerGift=2 -> FROZEN!
  const stealRes = stealGift(state, { giftId: g1.id });
  assert.equal(stealRes.becameFrozen, true);
  assert.equal(g1.frozen, true);
  assert.equal(state.activePlayerNumber, 2);

  // Undo rewinds #3's steal cleanly
  undoLastAction(state);
  assert.equal(state.activePlayerNumber, 3);
  const g1Rewound = state.gifts.find((g) => g.id === g1.id);
  assert.equal(g1Rewound.frozen, false);
  assert.equal(g1Rewound.ownerNumber, 2);

  // Re-apply #3 stealing g1 (freezes g1), then #2 steals g2 from #1 (chain of 2!)
  stealGift(state, { giftId: g1.id });
  stealGift(state, { giftId: g2.id });
  assert.equal(state.activePlayerNumber, 1);
  assert.equal(state.currentChainLength, 2);
  assert.equal(state.longestStealChain.length, 2);

  // #1 cannot steal frozen g1 or chain-protected g2
  assert.throws(() => stealGift(state, { giftId: g1.id }), /FROZEN/);
  assert.throws(() => stealGift(state, { giftId: g2.id }), /No steal-backs/);

  // #1 unwraps final gift -> enters final_bonus for #1
  const { gift: g3 } = unwrapGift(state, { title: 'Heated Blanket', emoji: '🧣' });
  assert.equal(state.phase, 'final_bonus');
  assert.equal(state.activePlayerNumber, 1);

  // Edit typo mid-game
  editGift(state, { giftId: g3.id, title: 'Heated Sherpa Blanket' });
  assert.equal(g3.title, 'Heated Sherpa Blanket');

  // #1 cannot swap for frozen g1, CAN swap for #2's unfrozen g2
  assert.throws(
    () => finalBonusAction(state, { action: 'swap', targetGiftId: g1.id }),
    /frozen/
  );
  finalBonusAction(state, { action: 'swap', targetGiftId: g2.id });
  assert.equal(state.phase, 'finished');

  const view = serializeState(state);
  assert.equal(view.players.find((p) => p.number === 1).giftId, g2.id);
  assert.equal(view.players.find((p) => p.number === 2).giftId, g3.id);
  assert.equal(view.players.find((p) => p.number === 3).giftId, g1.id);
  assert.ok(view.awards.some((a) => a.id === 'most_wanted'));
  assert.ok(view.awards.some((a) => a.id === 'chaos_chain'));
});

test('game ends cleanly without bonus turn when disabled', () => {
  let state = startGame(createInitialState(), {
    playerCount: 2,
    settings: { firstPlayerBonusTurn: false }
  });
  unwrapGift(state, { title: 'Candle' });
  assert.equal(state.activePlayerNumber, 2);
  unwrapGift(state, { title: 'Mug' });
  assert.equal(state.phase, 'finished');
  assert.equal(state.activePlayerNumber, null);
});
