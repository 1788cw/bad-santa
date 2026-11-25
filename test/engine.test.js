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
const Icons = require('../icons');
const Music = require('../music');
const JazzCharts = require('../jazz-charts');

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
  const { gift: g1 } = unwrapGift(state, { title: 'Espresso Frother', icon: 'coffee' });
  assert.equal(g1.ownerNumber, 1);
  assert.equal(g1.icon, 'coffee');
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
  const { gift: g2 } = unwrapGift(state, { title: 'Singing Bass', icon: 'gag' });
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
  const { gift: g3 } = unwrapGift(state, { title: 'Heated Blanket', icon: 'cozy' });
  assert.equal(state.phase, 'final_bonus');
  assert.equal(state.activePlayerNumber, 1);

  // Edit typo and icon mid-game
  editGift(state, { giftId: g3.id, title: 'Heated Sherpa Blanket', icon: 'gem' });
  assert.equal(g3.title, 'Heated Sherpa Blanket');
  assert.equal(g3.icon, 'gem');

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
  assert.ok(view.awards.some((a) => a.id === 'most_wanted' && a.icon === 'flame'));
  assert.ok(view.awards.some((a) => a.id === 'chaos_chain' && a.icon === 'bolt'));
});

test('all gift icon IDs and themes resolve to valid SVG vector graphics', () => {
  assert.equal(Icons.THEMES.length, 4);
  for (const item of Icons.GIFT_ICONS) {
    assert.ok(Icons.SVGS[item.id], `Missing SVG for gift icon: ${item.id}`);
    assert.match(Icons.SVGS[item.id], /^<svg[\s\S]*<\/svg>$/);
  }
  for (const uiId of ['musicNote', 'play', 'pause', 'skipPrev', 'skipNext', 'shuffle']) {
    assert.ok(Icons.SVGS[uiId], `Missing SVG for music UI icon: ${uiId}`);
    assert.match(Icons.SVGS[uiId], /^<svg[\s\S]*<\/svg>$/);
  }
  assert.equal(Icons.resolveIconKey('unknown_legacy_emoji'), 'gift');
});

test('generated Jazz Trio Christmas charts have valid harmony, walking bass, melody, and solo choruses', () => {
  assert.ok(JazzCharts.JAZZ_CHARTS.length >= 8);
  assert.equal(Music.TRACKS.length, JazzCharts.JAZZ_CHARTS.length);
  for (const chart of JazzCharts.JAZZ_CHARTS) {
    assert.ok(chart.id && chart.title && chart.vibe && chart.key, `Missing metadata on ${chart.id}`);
    assert.ok(chart.bpm >= 70 && chart.bpm <= 165, `Unexpected BPM ${chart.bpm} on ${chart.title}`);
    assert.ok(chart.timeSig === 3 || chart.timeSig === 4, `Unexpected timeSig ${chart.timeSig} on ${chart.title}`);
    assert.ok(chart.bars >= 16, `Too few bars on ${chart.title}`);
    assert.ok(chart.chords.length >= chart.bars, `Too few chords on ${chart.title}`);
    assert.ok(chart.bass.length >= chart.bars, `Too few bass notes on ${chart.title}`);
    assert.ok(chart.melody.length >= 16, `Too few melody notes on ${chart.title}`);
    assert.ok(chart.solo.length >= 16, `Too few solo notes on ${chart.title}`);

    for (const ch of chart.chords) {
      assert.ok(ch.bar >= 0 && ch.bar < chart.bars, `Out-of-bounds chord bar on ${chart.title}`);
      assert.ok(ch.beat >= 0 && ch.beat < chart.timeSig, `Out-of-bounds chord beat on ${chart.title}`);
      assert.ok(Array.isArray(ch.notes) && ch.notes.length >= 3, `Invalid chord voicing on ${chart.title}`);
    }
    for (const n of [...chart.melody, ...chart.solo]) {
      assert.ok(n.bar >= 0 && n.bar < chart.bars, `Out-of-bounds lead bar on ${chart.title}`);
      assert.ok(n.beat >= 0 && n.beat < chart.timeSig, `Out-of-bounds lead beat on ${chart.title}`);
      assert.ok(n.midi >= 55 && n.midi <= 88, `Out-of-range lead MIDI ${n.midi} on ${chart.title}`);
    }
  }
});

test('game ends cleanly without bonus turn when disabled', () => {
  let state = startGame(createInitialState(), {
    playerCount: 2,
    settings: { firstPlayerBonusTurn: false }
  });
  unwrapGift(state, { title: 'Candle', icon: 'candle' });
  assert.equal(state.activePlayerNumber, 2);
  unwrapGift(state, { title: 'Mug', icon: 'coffee' });
  assert.equal(state.phase, 'finished');
  assert.equal(state.activePlayerNumber, null);
});
