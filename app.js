(() => {
  const Engine = window.BadSantaEngine;
  const Icons = window.BadSantaIcons;
  const STORAGE_KEY = 'badsanta_browser_game_v2';
  const THEME_KEY = 'badsanta_theme_v1';

  const appEl = document.getElementById('app');
  const brandLogoEl = document.getElementById('brand-logo');
  const snowCrystalsEl = document.getElementById('snow-crystals');
  const festiveFrameEl = document.getElementById('festive-frame');
  const themeSwitcherEl = document.getElementById('theme-switcher');
  const headerPills = document.getElementById('game-header-pills');
  const pillProgress = document.getElementById('pill-progress');
  const pillRule = document.getElementById('pill-rule');
  const headerUndoBtn = document.getElementById('header-undo-btn');
  const printSheetBtn = document.getElementById('print-sheet-btn');
  const rulesBtn = document.getElementById('rules-btn');
  const toggleLogBtn = document.getElementById('toggle-log-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const newGameBtn = document.getElementById('new-game-btn');
  const toastContainer = document.getElementById('toast-container');

  // Printable number sheet modal
  const printModal = document.getElementById('print-modal');
  const printModalTitle = document.getElementById('print-modal-title');
  const printModalClose = document.getElementById('print-modal-close');
  const printCountInput = document.getElementById('print-count-input');
  const printBwCheckbox = document.getElementById('print-bw-checkbox');
  const triggerPrintBtn = document.getElementById('trigger-print-btn');
  const printSheetArea = document.getElementById('print-sheet-area');

  // Rules popup modal
  const rulesModal = document.getElementById('rules-modal');
  const rulesModalTitle = document.getElementById('rules-modal-title');
  const rulesModalClose = document.getElementById('rules-modal-close');
  const rulesModalBody = document.getElementById('rules-modal-body');
  const rulesModalOk = document.getElementById('rules-modal-ok');

  // Edit gift modal
  const editModal = document.getElementById('edit-gift-modal');
  const editModalTitle = document.getElementById('edit-gift-title');
  const editCloseBtn = document.getElementById('edit-gift-close');
  const editForm = document.getElementById('edit-gift-form');
  const editGiftId = document.getElementById('edit-gift-id');
  const editGiftName = document.getElementById('edit-gift-name');
  const editGiftIconGrid = document.getElementById('edit-gift-icon-grid');

  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('badsanta_tv_sync') : null;

  const ui = {
    theme: loadSavedTheme(),
    rawState: null,
    view: null,
    lastEventId: null,
    lastChangedGiftId: null,
    activeModal: null,
    modalOpener: null,
    showLog: false,
    unwrapIcon: 'gift',
    showIconPicker: false,
    editIcon: 'gift',
    expandedHistoryIds: new Set()
  };

  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }

  function openDialog(modalEl, focusTarget = null) {
    ui.modalOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ui.activeModal = modalEl;
    modalEl.classList.remove('hidden');
    requestAnimationFrame(() => {
      const target = focusTarget || getFocusable(modalEl)[0];
      target?.focus();
    });
  }

  function closeDialog(modalEl) {
    if (modalEl.classList.contains('hidden')) return;
    modalEl.classList.add('hidden');
    if (ui.activeModal === modalEl) {
      ui.activeModal = null;
      const opener = ui.modalOpener;
      ui.modalOpener = null;
      if (opener && document.contains(opener)) {
        opener.focus();
      }
    }
  }

  function icon(key, cls = 'svg-icon') {
    return Icons.renderIcon(key, cls);
  }

  function fmtNum(n) {
    return String(n);
  }

  function loadSavedTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (Icons.THEMES.some((t) => t.id === saved)) return saved;
    } catch {
      // ignore
    }
    return 'evergreen';
  }

  function applyTheme(themeId, { broadcast = true } = {}) {
    if (!Icons.THEMES.some((t) => t.id === themeId)) return;
    ui.theme = themeId;
    document.documentElement.setAttribute('data-theme', themeId);
    try {
      localStorage.setItem(THEME_KEY, themeId);
    } catch {
      // ignore
    }
    if (broadcast && channel) {
      try {
        channel.postMessage({ type: 'theme', theme: themeId });
      } catch {
        // ignore
      }
    }
    renderThemeSwitcher();
    if (ui.view?.phase === 'setup') {
      document.querySelectorAll('.theme-card-btn').forEach((btn) =>
        btn.classList.toggle('active', btn.dataset.themeId === themeId)
      );
    }
  }

  function renderThemeSwitcher() {
    themeSwitcherEl.innerHTML = Icons.THEMES.map(
      (t) => `
        <button
          type="button"
          class="theme-pill-btn ${t.id === ui.theme ? 'active' : ''}"
          data-theme-id="${t.id}"
          aria-pressed="${t.id === ui.theme ? 'true' : 'false'}"
          title="${escapeHtml(t.name)}"
          aria-label="${escapeHtml(t.name)} theme"
        >
          <span class="theme-dots">
            ${t.swatches.map((c) => `<span class="theme-dot" style="background:${c}"></span>`).join('')}
          </span>
        </button>`
    ).join('');
  }

  themeSwitcherEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-id]');
    if (!btn) return;
    applyTheme(btn.dataset.themeId);
    window.BadSantaSound?.chime();
  });

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('badsanta_browser_game_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.phase === 'string') {
          if (!Array.isArray(parsed.undoStack)) parsed.undoStack = [];
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return Engine.createInitialState();
  }

  function savePersistedState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
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

  function showToast(message, variant = 'default', iconKey = 'sparkle', duration = 3800) {
    const div = document.createElement('div');
    div.className = `toast ${variant !== 'default' ? `toast-${variant}` : ''}`;
    div.innerHTML = `${icon(iconKey)}<span>${escapeHtml(message)}</span>`;
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
      ui.lastChangedGiftId = !wasInitial && evt.meta?.giftId ? evt.meta.giftId : null;

      if (!wasInitial) {
        const evtIcon = evt.meta?.icon || 'sparkle';
        if (evt.type === 'gift_stolen') {
          showToast(evt.message, 'steal', 'steal', 4400);
          window.BadSantaSound?.steal();
        } else if (evt.type === 'gift_frozen') {
          showToast(evt.message, 'frost', 'freeze', 4800);
          window.BadSantaSound?.freeze();
        } else if (evt.type === 'gift_unwrapped') {
          showToast(evt.message, 'default', evtIcon, 3600);
          window.BadSantaSound?.unwrap();
        } else if (evt.type === 'final_swap' || evt.type === 'game_finished') {
          showToast(evt.message, 'default', 'crown', 5000);
          window.BadSantaSound?.fanfare();
        } else if (evt.type === 'game_started' || evt.type === 'final_bonus_started') {
          showToast(evt.message, 'default', evtIcon, 4000);
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
      if (e.data?.type === 'state' && e.data.rawState) {
        commitState(e.data.rawState, e.data.highlightEvent || null, { broadcast: false });
      } else if (e.data?.type === 'theme' && e.data.theme) {
        applyTheme(e.data.theme, { broadcast: false });
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
    } else if (e.key === THEME_KEY && e.newValue) {
      applyTheme(e.newValue, { broadcast: false });
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

    headerUndoBtn.innerHTML = icon('undo');
    toggleLogBtn.innerHTML = icon('log');
    toggleLogBtn.classList.toggle('active', ui.showLog);
    toggleLogBtn.setAttribute('aria-pressed', ui.showLog ? 'true' : 'false');
    newGameBtn.innerHTML = icon('refresh');

    if (s) {
      pillProgress.innerHTML = `${icon('gift')}<span>${s.stats.openedCount} / ${s.playerCount}</span>`;
      pillRule.innerHTML =
        s.settings.maxStealsPerGift > 0
          ? `${icon('freeze')}<span>Max ${s.settings.maxStealsPerGift}</span>`
          : `${icon('flame')}<span>∞</span>`;
      headerUndoBtn.disabled = !s.stats.canUndo;
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
    const presets = [6, 8, 10, 12, 16, 20];
    const stealOpts = [
      { v: 2, label: '2' },
      { v: 3, label: '3' },
      { v: 4, label: '4' },
      { v: 0, label: '∞' }
    ];
    let selectedMaxSteals = s.settings.maxStealsPerGift;

    appEl.innerHTML = `
      <div class="setup-wrap">
        <div class="setup-hero">
          <div class="hero-ornament-row">
            <span class="hero-cane">${Icons.SVGS.candyCane}</span>
            <div class="hero-illustration" style="margin:0">${Icons.SVGS.heroGifts}</div>
            <span class="hero-cane right">${Icons.SVGS.candyCane}</span>
          </div>
          <h1><span class="accent">Bad Santa</span></h1>
        </div>

        <section class="card ornament-host" style="margin-top:1.1rem">
          <div class="card-mistletoe-top" aria-hidden="true">${Icons.SVGS.mistletoeSprig}</div>
          <div class="candy-stripe-trim" aria-hidden="true"></div>
          <form id="setup-form" class="form-stack">
            <div class="count-box">
              <div style="font-size:0.95rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">
                Players (1 – <span id="range-max">${initialCount}</span>)
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
                      `<button type="button" class="preset-btn ${n === initialCount ? 'active' : ''}" data-preset="${n}">${n}</button>`
                  )
                  .join('')}
              </div>
              <div style="margin-top:0.8rem">
                <button type="button" id="setup-print-btn" class="btn btn-ghost btn-sm">
                  ${icon('printer')} Print Cards (1–${initialCount})
                </button>
              </div>
            </div>

            <div class="setup-rules-row">
              <span style="font-weight:800;font-size:0.94rem;display:inline-flex;align-items:center;gap:0.4rem">
                ${icon('freeze')} Max Steals
              </span>
              <div class="seg-group" id="setup-max-steals-group" role="group" aria-label="Max steals per gift">
                ${stealOpts
                  .map(
                    (o) =>
                      `<button type="button" class="seg-btn ${o.v === selectedMaxSteals ? 'active' : ''}" data-steals="${o.v}">${o.label}</button>`
                  )
                  .join('')}
              </div>
              <input type="hidden" id="setup-max-steals" value="${selectedMaxSteals}" />
            </div>

            <div class="toggle-chip-row">
              <label class="toggle-chip">
                <span class="inline-heading">${icon('shield')} No Steal-Backs</span>
                <input type="checkbox" id="setup-block-stealback" ${!s.settings.allowStealBack ? 'checked' : ''} />
              </label>
              <label class="toggle-chip">
                <span class="inline-heading">${icon('crown')} Player 1 Bonus</span>
                <input type="checkbox" id="setup-bonus-turn" ${s.settings.firstPlayerBonusTurn ? 'checked' : ''} />
              </label>
            </div>

            <div class="theme-gallery" id="setup-theme-gallery">
              ${Icons.THEMES.map(
                (t) => `
                <button type="button" class="theme-card-btn ${t.id === ui.theme ? 'active' : ''}" data-theme-id="${t.id}">
                  <div class="theme-swatch-bar">
                    ${t.swatches.map((c) => `<span style="background:${c}"></span>`).join('')}
                  </div>
                  <span class="theme-card-name">${escapeHtml(t.name)}</span>
                </button>`
              ).join('')}
            </div>

            <button type="submit" class="btn btn-gold btn-xl btn-block">
              ${icon('tree')} Start Game
            </button>
          </form>
        </section>
      </div>
    `;

    const countInput = document.getElementById('player-count-input');
    const rangeMax = document.getElementById('range-max');
    const setupPrintBtn = document.getElementById('setup-print-btn');
    const maxStealsHidden = document.getElementById('setup-max-steals');

    const updateCountUI = (val) => {
      const clamped = Math.max(2, Math.min(60, Number(val) || 2));
      countInput.value = clamped;
      rangeMax.textContent = String(clamped);
      if (setupPrintBtn) {
        setupPrintBtn.innerHTML = `${icon('printer')} Print Cards (1–${clamped})`;
      }
      document.querySelectorAll('.preset-btn').forEach((btn) =>
        btn.classList.toggle('active', Number(btn.dataset.preset) === clamped)
      );
    };

    countInput.addEventListener('input', () => {
      const raw = Number(countInput.value);
      if (raw >= 2 && raw <= 60) {
        rangeMax.textContent = String(raw);
        if (setupPrintBtn) {
          setupPrintBtn.innerHTML = `${icon('printer')} Print Cards (1–${raw})`;
        }
        document.querySelectorAll('.preset-btn').forEach((btn) =>
          btn.classList.toggle('active', Number(btn.dataset.preset) === raw)
        );
      }
    });
    countInput.addEventListener('blur', () => updateCountUI(countInput.value));
    setupPrintBtn?.addEventListener('click', () => openPrintModal());

    document.getElementById('count-minus').addEventListener('click', () => updateCountUI(Number(countInput.value) - 1));
    document.getElementById('count-plus').addEventListener('click', () => updateCountUI(Number(countInput.value) + 1));
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => updateCountUI(Number(btn.dataset.preset)));
    });

    document.getElementById('setup-max-steals-group').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-steals]');
      if (!btn) return;
      selectedMaxSteals = Number(btn.dataset.steals);
      maxStealsHidden.value = String(selectedMaxSteals);
      document.querySelectorAll('#setup-max-steals-group .seg-btn').forEach((b) =>
        b.classList.toggle('active', b === btn)
      );
    });

    document.getElementById('setup-theme-gallery').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-id]');
      if (!btn) return;
      applyTheme(btn.dataset.themeId);
      window.BadSantaSound?.chime();
    });

    document.getElementById('setup-form').addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const playerCount = Math.max(2, Math.min(60, Number(countInput.value) || 2));
        const next = Engine.startGame(ui.rawState, {
          playerCount,
          settings: {
            maxStealsPerGift: Number(maxStealsHidden.value),
            allowStealBack: !document.getElementById('setup-block-stealback').checked,
            firstPlayerBonusTurn: document.getElementById('setup-bonus-turn').checked
          }
        });
        ui.unwrapIcon = 'gift';
        ui.showIconPicker = false;
        commitState(next, next.lastEvent);
      } catch (err) {
        showToast(err.message, 'error', 'robbed');
      }
    });
  }

  // ==================== LIVE TV GAME BOARD ====================
  function renderGameBoard() {
    const s = ui.view;
    const activeNum = s.activePlayerNumber;
    const isBonus = s.phase === 'final_bonus';
    const isRobbed = s.stats.currentChainLength > 0 && !isBonus;

    const spotlightCls = isBonus
      ? 'tv-spotlight bonus'
      : isRobbed
      ? 'tv-spotlight robbed'
      : 'tv-spotlight';

    const onDeckHtml = isBonus
      ? ''
      : s.nextScheduledNumber
      ? `Next: ${s.nextScheduledNumber}`
      : s.settings.firstPlayerBonusTurn
      ? 'Next: Player 1 Bonus'
      : 'Final Turn';

    appEl.innerHTML = `
      <section class="${spotlightCls} ornament-host" style="margin-top:0.5rem">
        <div class="card-mistletoe-top" aria-hidden="true">${Icons.SVGS.mistletoeSprig}</div>
        <div class="spotlight-who">
          <div class="giant-number">${fmtNum(activeNum)}</div>
          <div>
            <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">
              ${
                isBonus
                  ? `<span class="pill pill-gold">${icon('crown')} FINAL BONUS</span>`
                  : isRobbed
                  ? `<span class="pill pill-crimson">${icon('steal')} ROBBED</span>
                     <span class="pill pill-gold">${icon('flame')} ×${s.stats.currentChainLength}</span>`
                  : ''
              }
              ${onDeckHtml ? `<span class="pill pill-muted">${onDeckHtml}</span>` : ''}
            </div>
            <h1 class="spotlight-title">
              ${isBonus ? 'Keep or Swap?' : isRobbed ? `Player ${activeNum} Strikes Back` : `Player ${activeNum}'s Turn`}
            </h1>
          </div>
        </div>

        ${
          isBonus
            ? `
            <div>
              <button id="bonus-keep-btn" class="btn btn-gold btn-xl" type="button">
                ${icon('check')} Keep Gift
              </button>
            </div>`
            : `
            <form id="unwrap-form" class="unwrap-bar">
              <div class="unwrap-form-row">
                <button
                  type="button"
                  id="icon-toggle-btn"
                  class="icon-trigger-btn"
                  title="Gift icon"
                  aria-label="Choose gift icon"
                  aria-expanded="${ui.showIconPicker ? 'true' : 'false'}"
                >
                  ${Icons.SVGS[Icons.resolveIconKey(ui.unwrapIcon)]}
                </button>
                <input
                  type="text"
                  id="unwrap-title-input"
                  class="unwrap-input"
                  aria-label="Unwrapped gift name"
                  maxlength="80"
                  required
                  autocomplete="off"
                  placeholder="Unwrapped gift..."
                />
                <button type="submit" class="btn btn-gold btn-lg">
                  ${icon('gift')} Unwrap
                </button>
              </div>
              ${
                ui.showIconPicker
                  ? `
                  <div class="inline-icon-bar" id="inline-icon-bar">
                    ${Icons.GIFT_ICONS.map(
                      (item) => `
                      <button
                        type="button"
                        class="icon-choice ${item.id === ui.unwrapIcon ? 'selected' : ''}"
                        data-icon="${item.id}"
                        title="${escapeHtml(item.label)}"
                      >
                        <span class="picker-svg">${Icons.SVGS[item.id]}</span>
                      </button>`
                    ).join('')}
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
              <div class="${tileCls}" title="${held ? `${p.number}: ${escapeHtml(held.title)}` : `Player ${p.number}`}">
                <span class="num-tile-id">${fmtNum(p.number)}</span>
                ${
                  held
                    ? `<span class="tile-svg">${Icons.SVGS[Icons.resolveIconKey(held.icon)]}</span>`
                    : p.isActive
                    ? `<span class="tile-svg" style="color:var(--gold)">${Icons.SVGS.target}</span>`
                    : `<span class="tile-dot"></span>`
                }
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
                <div class="hero-illustration">${Icons.SVGS.heroGifts}</div>
                <h2 style="margin:0;font-size:1.5rem">Player 1 is up first</h2>
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
                        : `<span style="font-size:0.82rem">${g.stealCount}</span>`;
                    const showHistory = ui.expandedHistoryIds.has(g.id);

                    const justUpdated = ui.lastChangedGiftId === g.id;
                    return `
                      <article class="gift-card ${g.canBeStolen ? 'stealable' : ''} ${g.frozen ? 'frozen' : ''} ${justUpdated ? 'just-updated' : ''}">
                        <div class="gift-card-top">
                          <div class="gift-icon-box">${Icons.SVGS[Icons.resolveIconKey(g.icon)]}</div>
                          <div style="flex:1;min-width:0">
                            <h3 class="gift-title">${escapeHtml(g.title)}</h3>
                          </div>
                          <div class="card-corner-actions">
                            <button
                              class="micro-btn history-toggle-btn"
                              data-gift-id="${escapeHtml(g.id)}"
                              title="Steal history"
                              aria-label="Toggle steal history for ${escapeHtml(g.title)}"
                              aria-expanded="${showHistory ? 'true' : 'false'}"
                              type="button"
                            >
                              ${icon('history')} ${g.history.length}
                            </button>
                            <button
                              class="micro-btn edit-gift-btn"
                              data-gift-id="${escapeHtml(g.id)}"
                              title="Edit gift"
                              aria-label="Edit ${escapeHtml(g.title)}"
                              type="button"
                            >
                              ${icon('edit')}
                            </button>
                          </div>
                        </div>

                        <div class="owner-banner">
                          <span class="owner-num-badge">${fmtNum(g.ownerNumber)}</span>
                          <div style="display:flex;align-items:center;gap:0.45rem">
                            ${
                              g.frozen
                                ? `<span class="pill pill-frost">${icon('freeze')} FROZEN</span>`
                                : g.protectedThisTurn
                                ? `<span class="pill pill-muted" title="Protected this turn">${icon('shield')}</span>`
                                : ''
                            }
                            <div class="steal-pips" title="${maxSteals > 0 ? `${g.stealCount} of ${maxSteals} steals` : `${g.stealCount} steals`}">
                              ${pipsHtml}
                            </div>
                          </div>
                        </div>

                        ${
                          showHistory
                            ? `
                            <ul class="history-list">
                              ${g.history
                                .map((h) => {
                                  if (h.action === 'unwrapped') {
                                    return `<li>${icon('gift')}<span><strong>${h.playerNumber}</strong> unwrapped</span></li>`;
                                  }
                                  if (h.action === 'stolen') {
                                    return `<li>${icon(h.frozen ? 'freeze' : 'steal')}<span><strong>${h.playerNumber}</strong> ← ${h.fromPlayerNumber}${h.frozen ? ' (Frozen)' : ''}</span></li>`;
                                  }
                                  return `<li>${icon('crown')}<span><strong>${h.playerNumber}</strong> swapped</span></li>`;
                                })
                                .join('')}
                            </ul>`
                            : ''
                        }

                        ${
                          g.canBeStolen
                            ? `<button class="btn ${isBonus ? 'btn-gold' : 'btn-primary'} btn-block steal-btn" data-gift-id="${escapeHtml(g.id)}" type="button">
                                 ${isBonus ? `${icon('crown')} Swap` : `${icon('steal')} Steal`}
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
              <h3 class="inline-heading" style="margin:0 0 0.7rem;font-size:0.96rem">${icon('log')} Log</h3>
              <div class="feed-list">
                ${[...s.eventLog]
                  .reverse()
                  .map(
                    (evt) =>
                      `<div class="feed-item type-${escapeHtml(evt.type)}">
                         ${icon(evt.meta?.icon || 'sparkle')}
                         <span>${escapeHtml(evt.message)}</span>
                       </div>`
                  )
                  .join('')}
              </div>
            </aside>`
            : ''
        }
      </div>
    `;

    const unwrapInput = document.getElementById('unwrap-title-input');
    if (
      unwrapInput &&
      editModal.classList.contains('hidden') &&
      rulesModal.classList.contains('hidden') &&
      printModal.classList.contains('hidden')
    ) {
      unwrapInput.focus();
    }

    document.getElementById('icon-toggle-btn')?.addEventListener('click', () => {
      const currentVal = document.getElementById('unwrap-title-input')?.value || '';
      ui.showIconPicker = !ui.showIconPicker;
      renderGameBoard();
      const input = document.getElementById('unwrap-title-input');
      if (input) {
        input.value = currentVal;
        input.focus();
      }
    });

    document.getElementById('inline-icon-bar')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-icon]');
      if (!btn) return;
      const currentVal = document.getElementById('unwrap-title-input')?.value || '';
      ui.unwrapIcon = btn.dataset.icon;
      ui.showIconPicker = false;
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
        const { event } = Engine.unwrapGift(ui.rawState, { title, icon: ui.unwrapIcon });
        ui.unwrapIcon = 'gift';
        ui.showIconPicker = false;
        commitState(ui.rawState, event);
      } catch (err) {
        showToast(err.message, 'error', 'robbed');
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
          showToast(err.message, 'error', 'robbed');
        }
      });
    });

    document.getElementById('bonus-keep-btn')?.addEventListener('click', () => {
      try {
        const { event } = Engine.finalBonusAction(ui.rawState, { action: 'keep' });
        commitState(ui.rawState, event);
      } catch (err) {
        showToast(err.message, 'error', 'robbed');
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
      <section class="finale-hero ornament-host" style="margin-top:0.5rem">
        <div class="card-mistletoe-top" aria-hidden="true">${Icons.SVGS.mistletoeSprig}</div>
        <div class="hero-ornament-row">
          <span class="hero-cane">${Icons.SVGS.candyCane}</span>
          <div class="finale-crest" style="margin:0">${Icons.SVGS.finaleCrest}</div>
          <span class="hero-cane right">${Icons.SVGS.candyCane}</span>
        </div>
        <h1 style="margin:0.25rem 0 0.9rem;font-size:clamp(2rem,4vw,2.8rem)">That's a Wrap!</h1>
        <button id="finale-new-game-btn" class="btn btn-gold btn-xl" type="button">
          ${icon('refresh')} New Game
        </button>
      </section>

      ${
        s.awards.length > 0
          ? `
        <section style="margin-bottom:1.5rem">
          <div class="awards-grid">
            ${s.awards
              .map(
                (a) => `
                <div class="award-card">
                  <div class="award-icon">${Icons.SVGS[Icons.resolveIconKey(a.icon)]}</div>
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
        <div class="results-table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Gift</th>
                <th>Steals</th>
              </tr>
            </thead>
            <tbody>
              ${s.players
                .map((p) => {
                  const g = s.gifts.find((gift) => gift.id === p.giftId);
                  return `
                    <tr>
                      <td><span class="owner-num-badge">${fmtNum(p.number)}</span></td>
                      <td>
                        ${
                          g
                            ? `<span class="table-gift-cell">
                                 <span class="table-gift-icon">${Icons.SVGS[Icons.resolveIconKey(g.icon)]}</span>
                                 <strong>${escapeHtml(g.title)}</strong>
                               </span>`
                            : '—'
                        }
                      </td>
                      <td>
                        ${
                          g
                            ? `<span class="pill ${g.frozen ? 'pill-frost' : g.stealCount > 0 ? 'pill-crimson' : 'pill-muted'}">
                                 ${g.frozen ? icon('freeze') : ''}
                                 <span>${g.stealCount}${g.frozen ? ' Frozen' : ''}</span>
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

  // ==================== PRINTABLE NUMBER SHEET MODAL ====================
  function renderPrintSheet(count) {
    const safeCount = Math.max(2, Math.min(60, Number(count) || 8));
    printSheetArea.classList.toggle('ink-saver', Boolean(printBwCheckbox.checked));

    const slipsHtml = Array.from({ length: safeCount }, (_, idx) => {
      const n = idx + 1;
      return `
        <div class="number-slip">
          <div class="slip-stripe-bar"></div>
          <div class="slip-stripe-bottom"></div>
          <span class="slip-corner-tl">${Icons.SVGS.mistletoeCorner}</span>
          <span class="slip-corner-tr">${Icons.SVGS.mistletoeCorner}</span>
          <div class="slip-number-row">
            <span class="slip-cane">${Icons.SVGS.candyCaneMini}</span>
            <div class="number-slip-num">${n}</div>
            <span class="slip-cane right">${Icons.SVGS.candyCaneMini}</span>
          </div>
          <span class="slip-bottom-sprig">${Icons.SVGS.mistletoeSprig}</span>
        </div>`;
    }).join('');

    const pages = Math.ceil(safeCount / 30);
    printSheetArea.innerHTML = `
      <div class="print-sheet-header">
        <span class="print-sheet-title">
          <span style="width:28px;height:24px;display:inline-flex">${Icons.SVGS.crossedCandyCanes}</span>
          1–${safeCount}
        </span>
        <span class="print-sheet-sub">
          ${icon('scissors')} ${pages} page${pages === 1 ? '' : 's'} (up to 30/page)
        </span>
      </div>
      <div class="print-slips-grid">
        ${slipsHtml}
      </div>
    `;
  }

  function openPrintModal() {
    const activeSettings = getActiveRuleSettings();
    printCountInput.value = activeSettings.playerCount;
    renderPrintSheet(activeSettings.playerCount);
    openDialog(printModal, printCountInput);
  }

  function closePrintModal() {
    closeDialog(printModal);
  }

  printSheetBtn.addEventListener('click', openPrintModal);
  printModalClose.addEventListener('click', closePrintModal);
  printModal.addEventListener('click', (e) => {
    if (e.target === printModal) closePrintModal();
  });
  printCountInput.addEventListener('input', () => {
    const v = Number(printCountInput.value);
    if (v >= 2 && v <= 60) renderPrintSheet(v);
  });
  printCountInput.addEventListener('blur', () => {
    const clamped = Math.max(2, Math.min(60, Number(printCountInput.value) || 2));
    printCountInput.value = clamped;
    renderPrintSheet(clamped);
  });
  printBwCheckbox.addEventListener('change', () => renderPrintSheet(printCountInput.value));
  triggerPrintBtn.addEventListener('click', () => {
    renderPrintSheet(printCountInput.value);
    window.print();
  });

  // ==================== RULES POPUP MODAL ====================
  function getActiveRuleSettings() {
    if (ui.view?.phase === 'setup') {
      const countEl = document.getElementById('player-count-input');
      const maxStealsEl = document.getElementById('setup-max-steals');
      const blockStealBackEl = document.getElementById('setup-block-stealback');
      const bonusEl = document.getElementById('setup-bonus-turn');
      return {
        playerCount: countEl ? Math.max(2, Math.min(60, Number(countEl.value) || 8)) : ui.view.playerCount,
        maxStealsPerGift: maxStealsEl ? Number(maxStealsEl.value) : ui.view.settings.maxStealsPerGift,
        allowStealBack: blockStealBackEl ? !blockStealBackEl.checked : ui.view.settings.allowStealBack,
        firstPlayerBonusTurn: bonusEl ? bonusEl.checked : ui.view.settings.firstPlayerBonusTurn
      };
    }
    return {
      playerCount: ui.view?.playerCount || 8,
      maxStealsPerGift: ui.view?.settings?.maxStealsPerGift ?? 3,
      allowStealBack: Boolean(ui.view?.settings?.allowStealBack),
      firstPlayerBonusTurn: ui.view?.settings?.firstPlayerBonusTurn ?? true
    };
  }

  function openRulesModal() {
    const r = getActiveRuleSettings();
    const maxStealText =
      r.maxStealsPerGift > 0
        ? `Locked forever after <strong>${r.maxStealsPerGift} steal${r.maxStealsPerGift === 1 ? '' : 's'}</strong>.`
        : `<strong>Unlimited steals</strong> — nothing freezes.`;

    const stealBackText = r.allowStealBack
      ? `Steal-backs allowed.`
      : `No stealing the same gift twice in one turn.`;

    const bonusText = r.firstPlayerBonusTurn
      ? `After <strong>Player ${r.playerCount}</strong>, <strong>Player 1</strong> may keep or swap with any unfrozen gift.`
      : `Ends right after <strong>Player ${r.playerCount}</strong>'s turn.`;

    rulesModalBody.innerHTML = `
      <div class="rules-active-pills">
        <span class="pill pill-gold">${icon('target')} 1–${r.playerCount}</span>
        <span class="pill pill-frost">${icon('freeze')} ${r.maxStealsPerGift > 0 ? `Max ${r.maxStealsPerGift} steals` : 'Unlimited'}</span>
        <span class="pill pill-muted">${icon('shield')} ${r.allowStealBack ? 'Steal-backs ON' : 'No steal-backs'}</span>
        <span class="pill pill-green">${icon('crown')} ${r.firstPlayerBonusTurn ? 'Player 1 Bonus ON' : 'Player 1 Bonus OFF'}</span>
      </div>

      <div class="rules-grid">
        <div class="rule-card">
          <div class="rule-card-icon">${Icons.SVGS.target}</div>
          <div>
            <h4>1. Order (1–${r.playerCount})</h4>
            <p>Draw numbers <strong>1–${r.playerCount}</strong>. <strong>Player 1</strong> unwraps first, then turns go in order.</p>
          </div>
        </div>

        <div class="rule-card">
          <div class="rule-card-icon">${Icons.SVGS.steal}</div>
          <div>
            <h4>2. Unwrap or Steal</h4>
            <p>Open a new gift OR steal an open one. Robbed players act immediately.</p>
          </div>
        </div>

        <div class="rule-card">
          <div class="rule-card-icon">${Icons.SVGS.freeze}</div>
          <div>
            <h4>3. Freeze Limit</h4>
            <p>${maxStealText} ${stealBackText}</p>
          </div>
        </div>

        <div class="rule-card">
          <div class="rule-card-icon">${Icons.SVGS.crown}</div>
          <div>
            <h4>4. Final Bonus</h4>
            <p>${bonusText}</p>
          </div>
        </div>
      </div>
    `;

    openDialog(rulesModal, rulesModalOk);
  }

  function closeRulesModal() {
    closeDialog(rulesModal);
  }

  rulesBtn.addEventListener('click', openRulesModal);
  rulesModalClose.addEventListener('click', closeRulesModal);
  rulesModalOk.addEventListener('click', closeRulesModal);
  rulesModal.addEventListener('click', (e) => {
    if (e.target === rulesModal) closeRulesModal();
  });

  // ==================== EDIT GIFT MODAL ====================
  function openEditModal(gift) {
    editGiftId.value = gift.id;
    editGiftName.value = gift.title;
    ui.editIcon = Icons.resolveIconKey(gift.icon);
    editGiftIconGrid.innerHTML = Icons.GIFT_ICONS.map(
      (item) => `
        <button
          type="button"
          class="icon-choice ${item.id === ui.editIcon ? 'selected' : ''}"
          data-icon="${item.id}"
          title="${escapeHtml(item.label)}"
        >
          <span class="picker-svg">${Icons.SVGS[item.id]}</span>
        </button>`
    ).join('');
    openDialog(editModal, editGiftName);
    setTimeout(() => editGiftName.select(), 40);
  }

  function closeEditModal() {
    closeDialog(editModal);
  }

  editGiftIconGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-icon]');
    if (!btn) return;
    ui.editIcon = btn.dataset.icon;
    editGiftIconGrid.querySelectorAll('.icon-choice').forEach((b) =>
      b.classList.toggle('selected', b === btn)
    );
  });

  editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editGiftId.value;
    const title = editGiftName.value.trim();
    if (!id || !title) return;
    try {
      Engine.editGift(ui.rawState, { giftId: id, title, icon: ui.editIcon });
      closeEditModal();
      commitState(ui.rawState);
      showToast('Gift updated!', 'default', 'check');
    } catch (err) {
      showToast(err.message, 'error', 'robbed');
    }
  });

  editCloseBtn.addEventListener('click', closeEditModal);
  document.getElementById('edit-gift-cancel').addEventListener('click', closeEditModal);
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && ui.activeModal) {
      const focusables = getFocusable(ui.activeModal);
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (e.key === 'Escape') {
      closeEditModal();
      closeRulesModal();
      closePrintModal();
      return;
    }
    const tag = (e.target && e.target.tagName) || '';
    if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
      if (rulesModal.classList.contains('hidden')) openRulesModal();
      else closeRulesModal();
    }
  });

  // ==================== HEADER ACTIONS ====================
  headerUndoBtn.addEventListener('click', () => {
    try {
      Engine.undoLastAction(ui.rawState);
      commitState(ui.rawState, ui.rawState.lastEvent);
      showToast('Undid last move', 'default', 'undo');
    } catch (err) {
      showToast(err.message, 'error', 'robbed');
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
    const on = window.BadSantaSound?.isEnabled();
    soundToggleBtn.innerHTML = icon(on ? 'soundOn' : 'soundOff');
    soundToggleBtn.title = on ? 'Mute sound' : 'Unmute sound';
  };
  soundToggleBtn.addEventListener('click', () => {
    window.BadSantaSound?.toggle();
    updateSoundBtn();
  });

  const updateFullscreenBtn = () => {
    const fs = Boolean(document.fullscreenElement);
    fullscreenBtn.innerHTML = icon(fs ? 'exitFullscreen' : 'fullscreen');
    fullscreenBtn.title = fs ? 'Exit fullscreen' : 'Fullscreen';
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
  brandLogoEl.innerHTML = Icons.SVGS.badSantaLogo;
  if (snowCrystalsEl) {
    const flakes = [
      { left: 5, size: 18, dur: 15, delay: -2, sway: 4.5, drift: 45 },
      { left: 13, size: 12, dur: 21, delay: -9, sway: 6.2, drift: -35 },
      { left: 22, size: 22, dur: 13, delay: -5, sway: 5.1, drift: 60 },
      { left: 31, size: 14, dur: 19, delay: -14, sway: 4.8, drift: -40 },
      { left: 41, size: 19, dur: 16, delay: -7, sway: 5.7, drift: 50 },
      { left: 50, size: 13, dur: 22, delay: -11, sway: 6.5, drift: -30 },
      { left: 59, size: 21, dur: 14, delay: -3, sway: 4.6, drift: 55 },
      { left: 68, size: 15, dur: 18, delay: -16, sway: 5.4, drift: -45 },
      { left: 77, size: 20, dur: 15, delay: -8, sway: 4.9, drift: 40 },
      { left: 86, size: 13, dur: 20, delay: -12, sway: 6.0, drift: -50 },
      { left: 93, size: 17, dur: 16, delay: -4, sway: 5.2, drift: 30 },
      { left: 18, size: 11, dur: 24, delay: -18, sway: 7.0, drift: 25 },
      { left: 46, size: 16, dur: 17, delay: -1, sway: 5.0, drift: -35 },
      { left: 73, size: 12, dur: 23, delay: -19, sway: 6.4, drift: 35 }
    ];
    snowCrystalsEl.innerHTML = flakes
      .map(
        (f) => `
        <div
          class="snow-crystal"
          style="left:${f.left}%;width:${f.size}px;height:${f.size}px;--fall-dur:${f.dur}s;--fall-delay:${f.delay}s;--sway-dur:${f.sway}s;--drift-x:${f.drift}px"
        >${Icons.SVGS.freeze}</div>`
      )
      .join('');
  }
  if (festiveFrameEl) {
    festiveFrameEl.innerHTML = `
      <div class="frame-corner frame-tl">${Icons.SVGS.mistletoeCorner}</div>
      <div class="frame-corner frame-tr">${Icons.SVGS.mistletoeCorner}</div>
      <div class="frame-cane-bl">${Icons.SVGS.candyCane}</div>
      <div class="frame-cane-br">${Icons.SVGS.candyCane}</div>
    `;
  }
  printSheetBtn.innerHTML = icon('printer');
  printModalTitle.innerHTML = `${icon('printer')}<span>Number Sheet</span>`;
  printModalClose.innerHTML = icon('close');
  triggerPrintBtn.innerHTML = `${icon('printer')}<span>Print</span>`;
  rulesBtn.innerHTML = icon('book');
  rulesModalTitle.innerHTML = `${icon('book')}<span>Rules</span>`;
  rulesModalClose.innerHTML = icon('close');
  editModalTitle.innerHTML = `${icon('edit')}<span>Edit Gift</span>`;
  editCloseBtn.innerHTML = icon('close');

  applyTheme(ui.theme, { broadcast: false });
  updateSoundBtn();
  updateFullscreenBtn();
  const initial = loadPersistedState();
  ui.lastEventId = initial.lastEvent ? initial.lastEvent.id : null;
  commitState(initial, null, { broadcast: false });
})();
