(() => {
  const Engine = window.BadSantaEngine;
  const STORAGE_KEY = 'badsanta_browser_game_v1';

  const appEl = document.getElementById('app');
  const headerPills = document.getElementById('game-header-pills');
  const pillRemaining = document.getElementById('pill-remaining');
  const pillOpened = document.getElementById('pill-opened');
  const pillRule = document.getElementById('pill-rule');
  const headerUndoBtn = document.getElementById('header-undo-btn');
  const toggleLogBtn = document.getElementById('toggle-log-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const newGameBtn = document.getElementById('new-game-btn');
  const toastContainer = document.getElementById('toast-container');

  // Edit gift modal
  const editModal = document.getElementById('edit-gift-modal');
  const editForm = document.getElementById('edit-gift-form');
  const editGiftId = document.getElementById('edit-gift-id');
  const editGiftName = document.getElementById('edit-gift-name');
  const editGiftEmojiGrid = document.getElementById('edit-gift-emoji-grid');

  // Optional same-browser cross-tab sync (great for laptop + extended TV browser window!)
  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('badsanta_tv_sync') : null;

  const ui = {
    rawState: null,
    view: null,
    lastEventId: null,
    showLog: false,
    unwrapEmoji: '🎁',
    showEmojiPicker: false,
    editEmoji: '🎁',
    expandedHistoryIds: new Set()
  };

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.phase === 'string') {
          if (!Array.isArray(parsed.undoStack)) parsed.undoStack = [];
          return parsed;
        }
      }
    } catch {
      // ignore corrupted storage
    }
    return Engine.createInitialState();
  }

  function savePersistedState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message, variant = 'default', duration = 3800) {
    const div = document.createElement('div');
    div.className = `toast ${variant !== 'default' ? `toast-${variant}` : ''}`;
    div.textContent = message;
    toastContainer.appendChild(div);
    setTimeout(() => {
      div.style.opacity = '0';
      div.style.transition = 'opacity 0.25s ease';
      setTimeout(() => div.remove(), 260);
    }, duration);
  }

  function commitState(nextRawState, highlightEvent = null, { broadcast = true } = {}) {
    const prevPhase = ui.view?.phase || null;
    ui.rawState = nextRawState;
    ui.view = Engine.serializeState(nextRawState);

    if (broadcast) {
      savePersistedState(nextRawState);
      if (channel) {
        try {
          channel.postMessage({ type: 'state', rawState: nextRawState, highlightEvent });
        } catch {
          // ignore
        }
      }
    }

    const evt = highlightEvent || ui.view.lastEvent;
    if (evt && evt.id && evt.id !== ui.lastEventId) {
      const wasInitial = ui.lastEventId === null;
      ui.lastEventId = evt.id;

      if (!wasInitial) {
        if (evt.type === 'gift_stolen') {
          showToast(evt.message, 'steal', 4400);
          window.BadSantaSound?.steal();
        } else if (evt.type === 'gift_frozen') {
          showToast(evt.message, 'frost', 4800);
          window.BadSantaSound?.freeze();
        } else if (evt.type === 'gift_unwrapped') {
          showToast(evt.message, 'default', 3600);
          window.BadSantaSound?.unwrap();
        } else if (evt.type === 'final_swap' || evt.type === 'game_finished') {
          showToast(evt.message, 'default', 5000);
          window.BadSantaSound?.fanfare();
        } else if (evt.type === 'game_started' || evt.type === 'final_bonus_started') {
          showToast(evt.message, 'default', 4000);
          window.BadSantaSound?.chime();
        }
      }
    }

    if (prevPhase !== 'finished' && ui.view.phase === 'finished') {
      window.BadSantaSound?.fanfare();
    }

    render();
  }

  if (channel) {
    channel.onmessage = (e) => {
      if (e.data && e.data.type === 'state' && e.data.rawState) {
        commitState(e.data.rawState, e.data.highlightEvent || null, { broadcast: false });
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        commitState(parsed, parsed.lastEvent || null, { broadcast: false });
      } catch {
        // ignore
      }
    }
  });

  function updateHeader() {
    const s = ui.view;
    const inGame = s && (s.phase === 'playing' || s.phase === 'final_bonus');
    const isFinished = s && s.phase === 'finished';

    headerPills.classList.toggle('hidden', !inGame);
    headerUndoBtn.classList.toggle('hidden', !(inGame || isFinished));
    toggleLogBtn.classList.toggle('hidden', !inGame);
    newGameBtn.classList.toggle('hidden', !(inGame || isFinished));

    if (s) {
      pillRemaining.textContent = `🎁 ${s.stats.wrappedRemaining} Left`;
      pillOpened.textContent = `✨ ${s.stats.openedCount} Opened`;
      pillRule.textContent =
        s.settings.maxStealsPerGift > 0
          ? `❄️ Freezes at ${s.settings.maxStealsPerGift} steals`
          : '🔥 Unlimited steals';
      headerUndoBtn.disabled = !s.stats.canUndo;
      toggleLogBtn.textContent = ui.showLog ? '📺 Hide Log' : '📜 Show Log';
    }
  }

  function render() {
    updateHeader();
    if (!ui.view) return;

    if (ui.view.phase === 'setup') {
      renderSetup();
    } else if (ui.view.phase === 'playing' || ui.view.phase === 'final_bonus') {
      renderGameBoard();
    } else {
      renderFinale();
    }
  }

  // ==================== SETUP SCREEN ====================
  function renderSetup() {
    const s = ui.view;
    const initialCount = s.playerCount || 8;
    const presets = [6, 8, 10, 12, 15, 20];

    appEl.innerHTML = `
      <div class="setup-wrap">
        <div class="setup-hero">
          <h1>🎅 <span class="accent">Bad Santa</span></h1>
          <p>Everyone grabs a number <strong>1 to X</strong>. Track unwrapped gifts and steals live on the TV.</p>
        </div>

        <section class="card">
          <form id="setup-form" class="form-stack">
            <div class="count-box">
              <div style="font-size:1.05rem;font-weight:800;color:var(--gold-soft)">
                How many people are playing?
              </div>
              <div class="count-controls">
                <button type="button" id="count-minus" class="count-step-btn" aria-label="Decrease">−</button>
                <input type="number" id="player-count-input" class="count-input" min="2" max="60" value="${initialCount}" required />
                <button type="button" id="count-plus" class="count-step-btn" aria-label="Increase">+</button>
              </div>
              <div class="preset-row">
                ${presets
                  .map(
                    (n) =>
                      `<button type="button" class="preset-btn ${n === initialCount ? 'active' : ''}" data-preset="${n}">${n} people</button>`
                  )
                  .join('')}
              </div>
              <div id="range-label" style="margin-top:0.65rem;font-size:0.88rem;color:var(--text-muted)">
                Turns will run from <strong>#1</strong> to <strong>#${initialCount}</strong>
              </div>
            </div>

            <label class="field">
              <span>Max Steals Per Gift</span>
              <select id="setup-max-steals">
                <option value="2" ${s.settings.maxStealsPerGift === 2 ? 'selected' : ''}>2 steals (Fast — freezes on 2nd steal)</option>
                <option value="3" ${s.settings.maxStealsPerGift === 3 ? 'selected' : ''}>3 steals (Classic — freezes on 3rd steal)</option>
                <option value="4" ${s.settings.maxStealsPerGift === 4 ? 'selected' : ''}>4 steals (Spicy — freezes on 4th steal)</option>
                <option value="0" ${s.settings.maxStealsPerGift === 0 ? 'selected' : ''}>Unlimited (Never freezes)</option>
              </select>
            </label>

            <label class="checkbox-row">
              <div>
                <div class="checkbox-title">Block Steal-Backs on the Same Turn</div>
                <div class="checkbox-sub">If someone steals your gift, you can't immediately steal it right back</div>
              </div>
              <input type="checkbox" id="setup-block-stealback" ${!s.settings.allowStealBack ? 'checked' : ''} />
            </label>

            <label class="checkbox-row">
              <div>
                <div class="checkbox-title">Player #1 Final Bonus Turn</div>
                <div class="checkbox-sub">After the last person goes, #1 can keep their gift or swap with any unfrozen gift</div>
              </div>
              <input type="checkbox" id="setup-bonus-turn" ${s.settings.firstPlayerBonusTurn ? 'checked' : ''} />
            </label>

            <button type="submit" class="btn btn-gold btn-xl btn-block">
              🎄 Start Bad Santa (#1 Goes First!)
            </button>
          </form>
        </section>
      </div>
    `;

    const countInput = document.getElementById('player-count-input');
    const rangeLabel = document.getElementById('range-label');

    const updateCountUI = (val) => {
      const clamped = Math.max(2, Math.min(60, Number(val) || 2));
      countInput.value = clamped;
      rangeLabel.innerHTML = `Turns will run from <strong>#1</strong> to <strong>#${clamped}</strong>`;
      document.querySelectorAll('.preset-btn').forEach((btn) =>
        btn.classList.toggle('active', Number(btn.dataset.preset) === clamped)
      );
    };

    countInput.addEventListener('input', () => {
      const raw = Number(countInput.value);
      if (raw >= 2 && raw <= 60) {
        rangeLabel.innerHTML = `Turns will run from <strong>#1</strong> to <strong>#${raw}</strong>`;
        document.querySelectorAll('.preset-btn').forEach((btn) =>
          btn.classList.toggle('active', Number(btn.dataset.preset) === raw)
        );
      }
    });
    countInput.addEventListener('blur', () => updateCountUI(countInput.value));

    document.getElementById('count-minus').addEventListener('click', () => updateCountUI(Number(countInput.value) - 1));
    document.getElementById('count-plus').addEventListener('click', () => updateCountUI(Number(countInput.value) + 1));
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => updateCountUI(Number(btn.dataset.preset)));
    });

    document.getElementById('setup-form').addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const playerCount = Math.max(2, Math.min(60, Number(countInput.value) || 2));
        const next = Engine.startGame(ui.rawState, {
          playerCount,
          settings: {
            maxStealsPerGift: Number(document.getElementById('setup-max-steals').value),
            allowStealBack: !document.getElementById('setup-block-stealback').checked,
            firstPlayerBonusTurn: document.getElementById('setup-bonus-turn').checked
          }
        });
        ui.unwrapEmoji = '🎁';
        ui.showEmojiPicker = false;
        commitState(next, next.lastEvent);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // ==================== LIVE TV GAME BOARD ====================
  function renderGameBoard() {
    const s = ui.view;
    const activeNum = s.activePlayerNumber;
    const isBonus = s.phase === 'final_bonus';
    const isRobbed = s.stats.currentChainLength > 0 && !isBonus;
    const canStealAny = s.eligibleStealGiftIds.length > 0;

    const spotlightCls = isBonus
      ? 'tv-spotlight bonus'
      : isRobbed
      ? 'tv-spotlight robbed'
      : 'tv-spotlight';

    const onDeckText = isBonus
      ? 'Final decision of the game!'
      : s.nextScheduledNumber
      ? `Up next: #${s.nextScheduledNumber}`
      : s.settings.firstPlayerBonusTurn
      ? 'After this turn: 👑 #1 Final Bonus Turn!'
      : 'Final turn of the game!';

    appEl.innerHTML = `
      <section class="${spotlightCls}">
        <div class="spotlight-who">
          <div class="giant-number">#${activeNum}</div>
          <div>
            <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap">
              ${
                isBonus
                  ? `<span class="pill pill-gold">👑 FINAL BONUS TURN</span>`
                  : isRobbed
                  ? `<span class="pill pill-crimson">😈 ROBBED! STRIKE BACK</span>
                     <span class="pill pill-gold">🔥 Chain ×${s.stats.currentChainLength}</span>`
                  : `<span class="pill pill-gold">🎯 TURN ${s.currentTurnNumber} OF ${s.playerCount}</span>`
              }
              <span class="pill pill-muted">${escapeHtml(onDeckText)}</span>
            </div>
            <h1 class="spotlight-title">
              ${isBonus ? 'Player #1 — Keep or Swap?' : isRobbed ? `Player #${activeNum} Got Robbed!` : `Player #${activeNum}'s Turn`}
            </h1>
            <p class="spotlight-sub">
              ${
                isBonus
                  ? 'Keep your current gift — OR click Swap on any unfrozen gift below!'
                  : canStealAny
                  ? 'Type a newly unwrapped gift below, OR click 😈 Steal on any open gift!'
                  : 'Unwrap a new gift from the pile and type what it is!'
              }
            </p>
          </div>
        </div>

        ${
          isBonus
            ? `
            <div>
              <button id="bonus-keep-btn" class="btn btn-gold btn-xl" type="button">
                ✅ #1 Keeps Gift &amp; Finish
              </button>
            </div>`
            : `
            <form id="unwrap-form" class="unwrap-bar">
              <div class="unwrap-form-row">
                <button type="button" id="emoji-toggle-btn" class="emoji-trigger-btn" title="Pick gift icon">${escapeHtml(ui.unwrapEmoji)}</button>
                <input
                  type="text"
                  id="unwrap-title-input"
                  class="unwrap-input"
                  maxlength="80"
                  required
                  autocomplete="off"
                  placeholder="Type unwrapped gift for #${activeNum}..."
                />
                <button type="submit" class="btn btn-gold btn-lg">🎁 Unwrap</button>
              </div>
              ${
                ui.showEmojiPicker
                  ? `
                  <div class="inline-emoji-bar" id="inline-emoji-bar">
                    ${Engine.GIFT_EMOJIS
                      .map(
                        (em) =>
                          `<button type="button" class="emoji-choice ${em === ui.unwrapEmoji ? 'selected' : ''}" data-emoji="${em}">${em}</button>`
                      )
                      .join('')}
                  </div>`
                  : ''
              }
            </form>`
        }
      </section>

      <section class="number-strip" aria-label="Players 1 to ${s.playerCount}">
        ${s.players
          .map((p) => {
            const held = p.giftId ? s.gifts.find((g) => g.id === p.giftId) : null;
            const tileCls = p.isActive
              ? isRobbed
                ? 'num-tile active robbed'
                : 'num-tile active'
              : 'num-tile';
            return `
              <div class="${tileCls}" title="${held ? `#${p.number}: ${escapeHtml(held.title)}` : `#${p.number}`}">
                <span class="num-tile-id">#${p.number}</span>
                <span class="num-tile-gift">${held ? escapeHtml(held.emoji) : p.isActive ? '🎯' : '·'}</span>
              </div>`;
          })
          .join('')}
      </section>

      <div class="board-layout ${ui.showLog ? '' : 'wide'}">
        <section>
          ${
            s.gifts.length === 0
              ? `
              <div class="empty-stage">
                <div style="font-size:3.2rem;margin-bottom:0.4rem">🎄🎁</div>
                <h2 style="margin:0 0 0.35rem;font-size:1.45rem">Waiting for #1 to Unwrap the First Gift!</h2>
                <p style="margin:0;color:var(--text-muted);font-size:1.02rem">
                  Type the gift name in the box above and press <strong>Enter</strong>.
                </p>
              </div>`
              : `
              <div class="gifts-grid">
                ${s.gifts
                  .map((g) => {
                    const maxSteals = s.settings.maxStealsPerGift;
                    const pipsHtml =
                      maxSteals > 0
                        ? Array.from({ length: maxSteals }, (_, i) => {
                            const cls = g.frozen
                              ? 'pip frozen'
                              : i < g.stealCount
                              ? 'pip filled'
                              : 'pip';
                            return `<span class="${cls}"></span>`;
                          }).join('')
                        : '';
                    const showHistory = ui.expandedHistoryIds.has(g.id);

                    return `
                      <article class="gift-card ${g.canBeStolen ? 'stealable' : ''} ${g.frozen ? 'frozen' : ''}">
                        <div class="gift-card-top">
                          <div class="gift-emoji-box">${escapeHtml(g.emoji || '🎁')}</div>
                          <div style="flex:1;min-width:0">
                            <h3 class="gift-title">${escapeHtml(g.title)}</h3>
                          </div>
                          <button class="icon-btn edit-gift-btn" data-gift-id="${escapeHtml(g.id)}" title="Edit gift name or icon" type="button">✏️</button>
                        </div>

                        <div class="owner-banner">
                          <span>Held by <span class="owner-num-badge">#${g.ownerNumber}</span></span>
                          ${
                            g.frozen
                              ? `<span class="pill pill-frost">❄️ FROZEN</span>`
                              : g.protectedThisTurn
                              ? `<span class="pill pill-muted">🛡️ Safe This Turn</span>`
                              : ''
                          }
                        </div>

                        <div class="steal-meta">
                          <div class="steal-pips">
                            ${pipsHtml}
                            <span>${maxSteals > 0 ? `${g.stealCount} / ${maxSteals} steals` : `${g.stealCount} steal${g.stealCount === 1 ? '' : 's'}`}</span>
                          </div>
                          <button class="btn btn-ghost btn-sm history-toggle-btn" data-gift-id="${escapeHtml(g.id)}" type="button" style="padding:0.2rem 0.52rem;font-size:0.76rem">
                            📜 ${g.history.length}
                          </button>
                        </div>

                        ${
                          showHistory
                            ? `
                            <ul class="history-list">
                              ${g.history
                                .map((h) => {
                                  if (h.action === 'unwrapped') {
                                    return `<li>🎁 Unwrapped by <strong>#${h.playerNumber}</strong></li>`;
                                  }
                                  if (h.action === 'stolen') {
                                    return `<li>😈 Stolen by <strong>#${h.playerNumber}</strong> from #${h.fromPlayerNumber}${h.frozen ? ' ❄️' : ''}</li>`;
                                  }
                                  return `<li>👑 Final swap with <strong>#${h.playerNumber}</strong></li>`;
                                })
                                .join('')}
                            </ul>`
                            : ''
                        }

                        ${
                          g.canBeStolen
                            ? `<button class="btn ${isBonus ? 'btn-gold' : 'btn-primary'} btn-block steal-btn" data-gift-id="${escapeHtml(g.id)}" type="button">
                                 ${isBonus ? `👑 Swap with #${g.ownerNumber}` : `😈 Steal for #${activeNum}`}
                               </button>`
                            : ''
                        }
                      </article>`;
                  })
                  .join('')}
              </div>`
          }
        </section>

        ${
          ui.showLog
            ? `
            <aside class="card feed-card">
              <h3 style="margin:0 0 0.7rem;font-size:1rem">📜 Play-by-Play</h3>
              <div class="feed-list">
                ${[...s.eventLog]
                  .reverse()
                  .map(
                    (evt) =>
                      `<div class="feed-item type-${escapeHtml(evt.type)}">${escapeHtml(evt.message)}</div>`
                  )
                  .join('')}
              </div>
            </aside>`
            : ''
        }
      </div>
    `;

    const unwrapInput = document.getElementById('unwrap-title-input');
    if (unwrapInput && editModal.classList.contains('hidden')) {
      unwrapInput.focus();
    }

    document.getElementById('emoji-toggle-btn')?.addEventListener('click', () => {
      const currentVal = document.getElementById('unwrap-title-input')?.value || '';
      ui.showEmojiPicker = !ui.showEmojiPicker;
      renderGameBoard();
      const input = document.getElementById('unwrap-title-input');
      if (input) {
        input.value = currentVal;
        input.focus();
      }
    });

    document.getElementById('inline-emoji-bar')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-emoji]');
      if (!btn) return;
      const currentVal = document.getElementById('unwrap-title-input')?.value || '';
      ui.unwrapEmoji = btn.dataset.emoji;
      ui.showEmojiPicker = false;
      renderGameBoard();
      const input = document.getElementById('unwrap-title-input');
      if (input) {
        input.value = currentVal;
        input.focus();
      }
    });

    document.getElementById('unwrap-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('unwrap-title-input').value.trim();
      if (!title) return;
      try {
        const { event } = Engine.unwrapGift(ui.rawState, { title, emoji: ui.unwrapEmoji });
        ui.unwrapEmoji = '🎁';
        ui.showEmojiPicker = false;
        commitState(ui.rawState, event);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    document.querySelectorAll('.steal-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const giftId = btn.dataset.giftId;
        try {
          const { event } = isBonus
            ? Engine.finalBonusAction(ui.rawState, { action: 'swap', targetGiftId: giftId })
            : Engine.stealGift(ui.rawState, { giftId });
          commitState(ui.rawState, event);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    document.getElementById('bonus-keep-btn')?.addEventListener('click', () => {
      try {
        const { event } = Engine.finalBonusAction(ui.rawState, { action: 'keep' });
        commitState(ui.rawState, event);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    document.querySelectorAll('.edit-gift-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const g = s.gifts.find((gift) => gift.id === btn.dataset.giftId);
        if (g) openEditModal(g);
      });
    });

    document.querySelectorAll('.history-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.giftId;
        if (ui.expandedHistoryIds.has(id)) ui.expandedHistoryIds.delete(id);
        else ui.expandedHistoryIds.add(id);
        renderGameBoard();
      });
    });
  }

  // ==================== FINALE SCREEN ====================
  function renderFinale() {
    const s = ui.view;
    appEl.innerHTML = `
      <section class="finale-hero">
        <div style="font-size:3.2rem;margin-bottom:0.35rem">🎉🎅🎁</div>
        <h1 style="margin:0 0 0.4rem;font-size:clamp(2rem,4vw,2.8rem)">That's a Wrap!</h1>
        <p style="margin:0 0 1.25rem;color:var(--text-muted);font-size:1.08rem">
          All ${s.playerCount} gifts have found their final owners. Happy Holidays!
        </p>
        <button id="finale-new-game-btn" class="btn btn-gold btn-xl" type="button">🔄 Start a New Game</button>
      </section>

      ${
        s.awards.length > 0
          ? `
        <section style="margin-bottom:1.5rem">
          <h2 style="margin:0 0 0.85rem;font-size:1.3rem">🏆 Bad Santa Superlatives</h2>
          <div class="awards-grid">
            ${s.awards
              .map(
                (a) => `
                <div class="award-card">
                  <div class="award-icon">${escapeHtml(a.icon)}</div>
                  <div class="award-title">${escapeHtml(a.title)}</div>
                  <div class="award-winner">${escapeHtml(a.winner)}</div>
                  <div class="award-detail">${escapeHtml(a.detail)}</div>
                </div>`
              )
              .join('')}
          </div>
        </section>`
          : ''
      }

      <section class="card">
        <h2 style="margin:0 0 0.85rem;font-size:1.3rem">🎁 Final Ownership (#1 – #${s.playerCount})</h2>
        <div class="results-table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Final Gift</th>
                <th>Times Stolen</th>
              </tr>
            </thead>
            <tbody>
              ${s.players
                .map((p) => {
                  const g = s.gifts.find((gift) => gift.id === p.giftId);
                  return `
                    <tr>
                      <td><span class="owner-num-badge">#${p.number}</span></td>
                      <td>
                        ${g ? `<strong>${escapeHtml(g.emoji || '🎁')} ${escapeHtml(g.title)}</strong>` : '—'}
                      </td>
                      <td>
                        ${
                          g
                            ? `<span class="pill ${g.frozen ? 'pill-frost' : g.stealCount > 0 ? 'pill-crimson' : 'pill-muted'}">
                                 ${g.stealCount} ${g.frozen ? '❄️ Frozen' : ''}
                               </span>`
                            : '—'
                        }
                      </td>
                    </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;

    document.getElementById('finale-new-game-btn').addEventListener('click', resetGame);
  }

  // ==================== EDIT GIFT MODAL ====================
  function openEditModal(gift) {
    editGiftId.value = gift.id;
    editGiftName.value = gift.title;
    ui.editEmoji = gift.emoji || '🎁';
    editGiftEmojiGrid.innerHTML = Engine.GIFT_EMOJIS
      .map(
        (em) =>
          `<button type="button" class="emoji-choice ${em === ui.editEmoji ? 'selected' : ''}" data-emoji="${em}">${em}</button>`
      )
      .join('');
    editModal.classList.remove('hidden');
    setTimeout(() => {
      editGiftName.focus();
      editGiftName.select();
    }, 30);
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
  }

  editGiftEmojiGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-emoji]');
    if (!btn) return;
    ui.editEmoji = btn.dataset.emoji;
    editGiftEmojiGrid.querySelectorAll('.emoji-choice').forEach((b) =>
      b.classList.toggle('selected', b === btn)
    );
  });

  editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editGiftId.value;
    const title = editGiftName.value.trim();
    if (!id || !title) return;
    try {
      Engine.editGift(ui.rawState, { giftId: id, title, emoji: ui.editEmoji });
      closeEditModal();
      commitState(ui.rawState);
      showToast('💾 Gift updated!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('edit-gift-close').addEventListener('click', closeEditModal);
  document.getElementById('edit-gift-cancel').addEventListener('click', closeEditModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEditModal();
  });

  // ==================== HEADER ACTIONS ====================
  headerUndoBtn.addEventListener('click', () => {
    try {
      Engine.undoLastAction(ui.rawState);
      commitState(ui.rawState, ui.rawState.lastEvent);
      showToast('⏪ Undid last move!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  toggleLogBtn.addEventListener('click', () => {
    ui.showLog = !ui.showLog;
    render();
  });

  function resetGame() {
    if (ui.view && ui.view.phase !== 'finished') {
      if (!window.confirm('End the current game and start a new one?')) return;
    }
    const fresh = Engine.createInitialState({
      playerCount: ui.rawState?.playerCount || 8,
      settings: ui.rawState?.settings
    });
    ui.expandedHistoryIds.clear();
    ui.lastEventId = null;
    commitState(fresh);
  }

  newGameBtn.addEventListener('click', resetGame);

  const updateSoundBtn = () => {
    soundToggleBtn.textContent = window.BadSantaSound?.isEnabled() ? '🔊 Sound' : '🔇 Muted';
  };
  soundToggleBtn.addEventListener('click', () => {
    window.BadSantaSound?.toggle();
    updateSoundBtn();
  });

  const updateFullscreenBtn = () => {
    fullscreenBtn.textContent = document.fullscreenElement ? '✕ Exit Fullscreen' : '⛶ Fullscreen';
  };
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });
  document.addEventListener('fullscreenchange', updateFullscreenBtn);

  // ==================== BOOT ====================
  updateSoundBtn();
  updateFullscreenBtn();
  const initial = loadPersistedState();
  ui.lastEventId = initial.lastEvent ? initial.lastEvent.id : null;
  commitState(initial, null, { broadcast: false });
})();
