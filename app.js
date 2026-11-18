/* ============================================================
   COACHER — Signal Trainer
   Pure static JavaScript. No frameworks, no external requests.
   ============================================================ */

(() => {
  'use strict';

  /* ---------- constants ---------- */

  const ACTIONS = {
    crossover: { name: '体前变向', color: '#e8c87a' },
    between:   { name: '胯下运球', color: '#5aa9ff' },
    behind:    { name: '背后运球', color: '#5ee08a' },
    double:    { name: '双变向组合', color: '#f472b6' },
    retreat:   { name: '后撤步', color: '#ffc44d' },
    shoot:     { name: '急停投篮', color: '#ff6b6b' },
    left:      { name: '左侧变向', color: '#b58cff' },
    right:     { name: '右侧变向', color: '#5ee0d6' },
    push:      { name: '向前推进', color: '#c6e85e' },
  };

  const COLOR_HEX = {
    green: '#5ee08a',
    red: '#ff6b6b',
    blue: '#5aa9ff',
    amber: '#ffc44d',
  };

  const COLOR_NAME = { green: '绿', red: '红', blue: '蓝', amber: '黄' };
  const ARROW_NAME = { up: '上', right: '右', down: '下', left: '左' };
  const ARROW_GLYPH = { up: '↑', right: '→', down: '↓', left: '←' };
  const KIND_NAME = { number: '数字', gesture: '手势', color: '颜色', arrow: '方向', math: '心算' };

  const GESTURE_ACTIONS = { 1: 'crossover', 2: 'between', 3: 'behind', 4: 'double', 5: 'retreat' };
  const COLOR_ACTIONS = { green: 'crossover', red: 'between', blue: 'behind', amber: 'double' };
  const ARROW_ACTIONS = { up: 'push', right: 'right', down: 'retreat', left: 'left' };

  const PACES = {
    slow:   { name: '慢', interval: 3000 },
    normal: { name: '标准', interval: 2000 },
    fast:   { name: '快', interval: 1300 },
    pro:    { name: '极限', interval: 850 },
  };

  const HISTORY_KEY = 'coacher.history.v1';
  const ARROW_SVG = `
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M60 104V30" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
      <path d="M34 58L60 32l26 26" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  /* ---------- helpers ---------- */

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const pad2 = (value) => String(value).padStart(2, '0');

  function formatClock(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
  }

  function formatInterval(ms) {
    return (ms / 1000).toFixed(ms % 1000 === 0 ? 1 : 2);
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  /* ---------- modes ---------- */

  const MODES = {
    number: {
      name: '数字 · 奇偶',
      tag: '奇偶',
      idle: '0 背后 · 偶数胯下 · 奇数变向',
      note: '0 = 背后运球，偶数 = 胯下运球，奇数 = 体前变向。数字不会按顺序出现，别猜下一个。',
      entries: [
        { type: 'text', label: '0', action: 'behind' },
        { type: 'text', label: '偶数', action: 'between' },
        { type: 'text', label: '奇数', action: 'crossover' },
      ],
      generate() {
        const value = Math.random() < 0.12 ? 0 : randomInt(1, 9);
        const action = value === 0 ? 'behind' : (value % 2 === 0 ? 'between' : 'crossover');
        return { kind: 'number', value, action };
      },
    },

    gesture: {
      name: '手势 · 指数',
      tag: '1–5 指',
      idle: '看到几根手指，就换对应动作',
      note: '1 指变向，2 指胯下，3 指背后，4 指双变向，5 指后撤步。手只亮一下。',
      entries: [1, 2, 3, 4, 5].map((n) => ({
        type: 'text',
        label: `${n} 指`,
        action: GESTURE_ACTIONS[n],
      })),
      generate() {
        const value = randomInt(1, 5);
        return { kind: 'gesture', value, action: GESTURE_ACTIONS[value] };
      },
    },

    color: {
      name: '颜色 · 灯光',
      tag: '四色',
      idle: '颜色亮起，立刻换动作',
      note: '绿 = 变向，红 = 胯下，蓝 = 背后，黄 = 双变向。颜色随机亮起。',
      entries: [
        { type: 'color', value: 'green', label: '绿', action: 'crossover' },
        { type: 'color', value: 'red', label: '红', action: 'between' },
        { type: 'color', value: 'blue', label: '蓝', action: 'behind' },
        { type: 'color', value: 'amber', label: '黄', action: 'double' },
      ],
      generate() {
        const keys = Object.keys(COLOR_ACTIONS);
        const value = keys[randomInt(0, keys.length - 1)];
        return { kind: 'color', value, action: COLOR_ACTIONS[value] };
      },
    },

    arrow: {
      name: '方向 · 箭头',
      tag: '四向',
      idle: '箭头指哪，身体去哪',
      note: '上 = 向前推进，下 = 后撤步，左 / 右 = 对应方向变向。',
      entries: [
        { type: 'arrow', value: 'up', label: '↑', action: 'push' },
        { type: 'arrow', value: 'right', label: '→', action: 'right' },
        { type: 'arrow', value: 'down', label: '↓', action: 'retreat' },
        { type: 'arrow', value: 'left', label: '←', action: 'left' },
      ],
      generate() {
        const keys = Object.keys(ARROW_ACTIONS);
        const value = keys[randomInt(0, keys.length - 1)];
        return { kind: 'arrow', value, action: ARROW_ACTIONS[value] };
      },
    },

    math: {
      name: '心算 · 两数之和',
      tag: '两数之和',
      idle: '先算，再动',
      note: '先算和：3 的倍数 → 背后；否则偶数 → 急停投篮；奇数 → 体前变向。',
      entries: [
        { type: 'text', label: '3 的倍数', action: 'behind' },
        { type: 'text', label: '偶数', action: 'shoot' },
        { type: 'text', label: '奇数', action: 'crossover' },
      ],
      generate() {
        const a = randomInt(1, 9);
        const b = randomInt(1, 9);
        const sum = a + b;
        let action;
        if (sum % 3 === 0) action = 'behind';
        else if (sum % 2 === 0) action = 'shoot';
        else action = 'crossover';
        return { kind: 'math', value: { a, b }, sum, action };
      },
    },
  };

  MODES.mix = {
    name: '混合 · 混沌',
    tag: '全信号',
    idle: '数字、手势、颜色、方向随机切换',
    note: '数字、手势、颜色和方向随机切换。没有规律，也不给预判。',
    entries: [
      ...MODES.number.entries,
      ...MODES.gesture.entries,
      ...MODES.color.entries,
      ...MODES.arrow.entries,
    ],
    generate() {
      const pool = [MODES.number, MODES.gesture, MODES.color, MODES.arrow];
      return pool[randomInt(0, pool.length - 1)].generate();
    },
  };

  /* ---------- DOM ---------- */

  const stage = $('#stage');
  const stageIdle = $('#stageIdle');
  const idleHint = $('#idleHint');
  const signalSlot = $('#signalSlot');
  const stageClock = $('#stageClock');
  const stageModeLabel = $('#stageModeLabel');
  const stagePaceLabel = $('#stagePaceLabel');
  const progressFill = $('#progressFill');
  const signalCount = $('#signalCount');
  const countdown = $('#countdown');
  const countdownValue = $('#countdownValue');

  const startBtn = $('#startBtn');
  const stopBtn = $('#stopBtn');
  const paceControl = $('#paceControl');
  const durationControl = $('#durationControl');
  const soundToggle = $('#soundToggle');
  const flashToggle = $('#flashToggle');
  const voiceToggle = $('#voiceToggle');
  const fullscreenBtn = $('#fullscreenBtn');
  const installBtn = $('#installBtn');

  const legend = $('#legend');
  const legendTag = $('#legendTag');
  const legendNote = $('#legendNote');

  const liveTag = $('#liveTag');
  const liveSignals = $('#liveSignals');
  const liveElapsed = $('#liveElapsed');
  const distribution = $('#distribution');
  const distEmpty = $('#distEmpty');

  const summaryModal = $('#summaryModal');
  const summarySignals = $('#summarySignals');
  const summaryMeta = $('#summaryMeta');
  const summaryDist = $('#summaryDist');
  const modalClose = $('#modalClose');
  const againBtn = $('#againBtn');
  const adjustBtn = $('#adjustBtn');

  const historyList = $('#historyList');
  const historyEmpty = $('#historyEmpty');
  const clearHistoryBtn = $('#clearHistory');
  const toast = $('#toast');

  /* ---------- state ---------- */

  const state = {
    mode: 'number',
    pace: 'normal',
    duration: 60,
    sound: true,
    flash: true,
    voice: false,
    phase: 'idle', // idle | countdown | running | paused | done
    elapsed: 0,
    total: 0,
    counts: {},
    recent: [],
    lastSignal: null,
    nextSignalAt: 0,
    lastTick: 0,
    loopTimer: null,
    flashTimer: null,
    countdownTimer: null,
    countdownGo: null,
  };

  let audioCtx = null;
  let toastTimer = null;
  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  /* ---------- rendering ---------- */

  function handSVG(n) {
    const fingers = [
      { x: 58, y: 44, h: 96 },
      { x: 85, y: 28, h: 112 },
      { x: 112, y: 38, h: 102 },
      { x: 139, y: 58, h: 82 },
    ];
    const raised = n === 5 ? 4 : n;
    const thumbClass = n === 5 ? 'is-raised' : 'is-folded';
    const markup = fingers.map((finger, index) => (
      `<rect class="finger ${index < raised ? 'is-raised' : 'is-folded'}" x="${finger.x}" y="${finger.y}" width="24" height="${finger.h}" rx="12"/>`
    )).join('');

    return `<svg viewBox="0 0 220 260" class="hand" role="img" aria-label="${n} 指">
      <rect class="hand-palm" x="50" y="110" width="120" height="100" rx="42"/>
      <rect class="hand-palm" x="66" y="196" width="88" height="52" rx="22"/>
      ${markup}
      <rect class="finger ${thumbClass}" x="18" y="116" width="26" height="76" rx="13" transform="rotate(-32 31 154)"/>
    </svg>`;
  }

  function chipMarkup(entry) {
    if (entry.type === 'color') {
      return `<span class="chip"><i class="chip-dot" style="background:${COLOR_HEX[entry.value]}"></i>${entry.label}</span>`;
    }
    if (entry.type === 'arrow') {
      return `<span class="chip chip--arrow" title="${ARROW_NAME[entry.value]}">${ARROW_GLYPH[entry.value]}</span>`;
    }
    return `<span class="chip">${entry.label}</span>`;
  }

  function renderLegend() {
    const mode = MODES[state.mode];
    const groups = new Map();

    mode.entries.forEach((entry) => {
      if (!groups.has(entry.action)) groups.set(entry.action, []);
      groups.get(entry.action).push(entry);
    });

    legend.innerHTML = Array.from(groups.entries()).map(([action, entries]) => `
      <div class="legend-row">
        <div class="legend-signals">${entries.map(chipMarkup).join('')}</div>
        <span class="legend-action">
          <i class="action-dot" style="background:${ACTIONS[action].color}"></i>${ACTIONS[action].name}
        </span>
      </div>
    `).join('');

    legendTag.textContent = mode.tag;
    legendNote.textContent = mode.note;
  }

  function renderSignal(signal) {
    let figure = '';

    if (signal.kind === 'number') {
      figure = `<span class="sig-number">${signal.value}</span>`;
    } else if (signal.kind === 'gesture') {
      figure = `<div class="sig-hand">${handSVG(signal.value)}</div>`;
    } else if (signal.kind === 'color') {
      figure = `<div class="sig-color sig-color--${signal.value}" role="img" aria-label="${COLOR_NAME[signal.value]}灯"></div>`;
    } else if (signal.kind === 'arrow') {
      figure = `<div class="sig-arrow sig-arrow--${signal.value}" role="img" aria-label="向${ARROW_NAME[signal.value]}">${ARROW_SVG}</div>`;
    } else if (signal.kind === 'math') {
      figure = `<div class="sig-math" role="img" aria-label="${signal.value.a} 加 ${signal.value.b}">
        <span>${signal.value.a}</span><span class="op">+</span><span>${signal.value.b}</span>
      </div>`;
    }

    const source = state.mode === 'mix'
      ? `<span class="signal-source">${KIND_NAME[signal.kind] || ''}</span>`
      : '';

    signalSlot.innerHTML = `<div class="signal-figure">${figure}</div>${source}`;
    signalSlot.classList.remove('is-dimmed');
  }

  function distributionMarkup(counts) {
    const entries = Object.entries(counts).filter(([, count]) => count > 0);
    if (!entries.length) return '';

    const max = Math.max(...entries.map(([, count]) => count));
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([action, count]) => `
        <div class="dist-row">
          <div class="dist-label">
            <span><i class="action-dot" style="background:${ACTIONS[action].color}"></i>${ACTIONS[action].name}</span>
            <b>${count}</b>
          </div>
          <div class="dist-bar"><i style="width:${(count / max) * 100}%;background:${ACTIONS[action].color}"></i></div>
        </div>
      `).join('');
  }

  function updateDistribution() {
    const markup = distributionMarkup(state.counts);
    if (!markup) {
      distribution.hidden = true;
      distEmpty.hidden = false;
      return;
    }
    distribution.innerHTML = markup;
    distribution.hidden = false;
    distEmpty.hidden = true;
  }

  function updateMetrics() {
    liveSignals.textContent = state.total;
    liveElapsed.innerHTML = `${(state.elapsed / 1000).toFixed(1)}<span>s</span>`;
    signalCount.textContent = state.total;
    updateDistribution();
  }

  function updateTimeUI() {
    const durationMs = state.duration * 1000;
    const ratio = durationMs > 0 ? Math.min(1, state.elapsed / durationMs) : 0;
    progressFill.style.width = `${ratio * 100}%`;
    stageClock.textContent = formatClock(durationMs - state.elapsed);
    liveElapsed.innerHTML = `${(state.elapsed / 1000).toFixed(1)}<span>s</span>`;
  }

  function updateLiveTag() {
    const map = {
      idle: ['待机', ''],
      countdown: ['准备', 'is-live'],
      running: ['进行中', 'is-live'],
      paused: ['暂停', 'is-paused'],
      done: ['完成', 'is-done'],
    };
    const [label, className] = map[state.phase] || map.idle;
    liveTag.textContent = label;
    liveTag.className = `tag${className ? ` ${className}` : ''}`;
  }

  function updateStageLabels() {
    stageModeLabel.textContent = MODES[state.mode].name;
    stagePaceLabel.textContent = `${PACES[state.pace].name} · ${formatInterval(PACES[state.pace].interval)}s`;
    idleHint.textContent = MODES[state.mode].idle;
    if (state.phase === 'idle') {
      stageClock.textContent = formatClock(state.duration * 1000);
    }
  }

  function syncPaceUI() {
    $$('#paceControl button').forEach((button) => {
      const active = button.dataset.pace === state.pace;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function syncDurationUI() {
    $$('#durationControl button').forEach((button) => {
      const active = Number(button.dataset.duration) === state.duration;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setControls() {
    const locked = state.phase === 'countdown' || state.phase === 'running' || state.phase === 'paused';
    const labels = {
      idle: '开始训练',
      countdown: '准备…',
      running: '暂停',
      paused: '继续',
      done: '再来一组',
    };

    startBtn.textContent = labels[state.phase] || labels.idle;
    startBtn.disabled = state.phase === 'countdown';
    stopBtn.disabled = state.phase === 'idle' || state.phase === 'done';
    stage.classList.toggle('is-idle', state.phase === 'idle' || state.phase === 'done');

    $$('.mode-tab').forEach((tab) => { tab.disabled = locked; });
    $$('#paceControl button, #durationControl button').forEach((button) => { button.disabled = locked; });

    updateLiveTag();
  }

  /* ---------- audio / voice ---------- */

  function beep(freq = 880, duration = 0.04, volume = 0.035) {
    if (!state.sound) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = audioCtx || new AudioContextClass();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration + 0.02);
    } catch (error) {
      /* audio is a nice-to-have */
    }
  }

  function speak(text) {
    if (!state.voice || !canSpeak || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.16;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      /* speech is a nice-to-have */
    }
  }

  function signalSpeech(signal) {
    switch (signal.kind) {
      case 'number':
        return String(signal.value);
      case 'gesture':
        return `${signal.value} 指`;
      case 'color':
        return COLOR_NAME[signal.value];
      case 'arrow':
        return ARROW_NAME[signal.value];
      case 'math':
        return `${signal.value.a} 加 ${signal.value.b}`;
      default:
        return '';
    }
  }

  /* ---------- signal generation ---------- */

  function sameSignal(a, b) {
    if (!a || !b || a.kind !== b.kind) return false;
    if (a.kind === 'math') {
      return a.value.a === b.value.a && a.value.b === b.value.b;
    }
    return a.value === b.value;
  }

  function nextSignal() {
    let signal = MODES[state.mode].generate();

    for (let attempt = 0; attempt < 14; attempt += 1) {
      const candidate = MODES[state.mode].generate();
      const repeated = sameSignal(candidate, state.lastSignal);
      const triple = state.recent.length >= 2
        && state.recent[0] === candidate.action
        && state.recent[1] === candidate.action;

      signal = candidate;
      if (!repeated && !triple) break;
    }

    state.lastSignal = signal;
    state.recent.unshift(signal.action);
    state.recent = state.recent.slice(0, 2);
    return signal;
  }

  function emitSignal() {
    const signal = nextSignal();

    state.total += 1;
    state.counts[signal.action] = (state.counts[signal.action] || 0) + 1;

    renderSignal(signal);
    updateMetrics();

    if (state.voice) {
      speak(signalSpeech(signal));
    } else if (state.sound) {
      beep(1180, 0.035, 0.03);
    }

    if (state.flash) {
      clearTimeout(state.flashTimer);
      const visibleMs = Math.min(620, PACES[state.pace].interval * 0.42);
      state.flashTimer = setTimeout(() => {
        if (state.phase === 'running') signalSlot.classList.add('is-dimmed');
      }, visibleMs);
    }
  }

  /* ---------- session lifecycle ---------- */

  function clearSessionTimers() {
    clearInterval(state.loopTimer);
    clearTimeout(state.flashTimer);
    clearInterval(state.countdownTimer);
    clearTimeout(state.countdownGo);
    state.loopTimer = null;
    state.flashTimer = null;
    state.countdownTimer = null;
    state.countdownGo = null;
  }

  function showCountdown(value) {
    countdown.hidden = false;
    countdownValue.textContent = value;
    countdownValue.style.animation = 'none';
    void countdownValue.offsetWidth;
    countdownValue.style.animation = '';
  }

  function hideCountdown() {
    countdown.hidden = true;
  }

  function resetStage() {
    clearSessionTimers();
    hideCountdown();

    state.phase = 'idle';
    state.elapsed = 0;
    state.total = 0;
    state.counts = {};
    state.recent = [];
    state.lastSignal = null;
    state.nextSignalAt = 0;

    stageIdle.hidden = false;
    signalSlot.innerHTML = '';
    signalSlot.classList.remove('is-dimmed');
    progressFill.style.width = '0%';

    updateStageLabels();
    updateMetrics();
    setControls();
  }

  function startSession() {
    if (state.phase === 'running') {
      pauseSession();
      return;
    }
    if (state.phase === 'paused') {
      resumeSession();
      return;
    }
    if (state.phase === 'countdown') return;

    resetStage();
    state.phase = 'countdown';
    stageIdle.hidden = true;
    setControls();
    startCountdown();
  }

  function startCountdown() {
    let count = 3;
    showCountdown(count);
    beep(620, 0.07, 0.04);

    state.countdownTimer = setInterval(() => {
      count -= 1;

      if (count > 0) {
        showCountdown(count);
        beep(620 + (3 - count) * 90, 0.07, 0.04);
        return;
      }

      showCountdown('GO');
      beep(1040, 0.12, 0.05);
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;

      state.countdownGo = setTimeout(() => {
        hideCountdown();
        beginRunning();
      }, 520);
    }, 720);
  }

  function beginRunning() {
    state.phase = 'running';
    state.lastTick = performance.now();
    state.nextSignalAt = 0;
    stageIdle.hidden = true;

    setControls();
    emitSignal();
    state.nextSignalAt = PACES[state.pace].interval;

    clearInterval(state.loopTimer);
    state.loopTimer = setInterval(tick, 50);
  }

  function tick() {
    if (state.phase !== 'running') return;

    const now = performance.now();
    let delta = now - state.lastTick;
    state.lastTick = now;
    if (delta > 500) delta = 500;

    state.elapsed += delta;
    const durationMs = state.duration * 1000;

    if (state.elapsed >= durationMs) {
      state.elapsed = durationMs;
      updateTimeUI();
      finishSession();
      return;
    }

    if (state.elapsed >= state.nextSignalAt) {
      emitSignal();
      state.nextSignalAt += PACES[state.pace].interval;
      if (state.nextSignalAt < state.elapsed) {
        state.nextSignalAt = state.elapsed + PACES[state.pace].interval;
      }
    }

    updateTimeUI();
  }

  function pauseSession() {
    if (state.phase !== 'running') return;

    state.phase = 'paused';
    clearInterval(state.loopTimer);
    clearTimeout(state.flashTimer);
    state.loopTimer = null;
    state.flashTimer = null;

    signalSlot.classList.remove('is-dimmed');
    if (state.voice && canSpeak) window.speechSynthesis.cancel();

    setControls();
  }

  function resumeSession() {
    if (state.phase !== 'paused') return;

    state.phase = 'running';
    state.lastTick = performance.now();
    state.nextSignalAt = state.elapsed + 350;

    clearInterval(state.loopTimer);
    state.loopTimer = setInterval(tick, 50);

    setControls();
  }

  function finishSession() {
    if (state.phase === 'idle' || state.phase === 'done') return;

    clearSessionTimers();
    state.phase = 'done';
    signalSlot.classList.remove('is-dimmed');
    stageIdle.hidden = true;

    updateTimeUI();
    updateMetrics();
    setControls();

    if (state.voice && canSpeak) window.speechSynthesis.cancel();

    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        try {
          const result = exit.call(document);
          if (result && result.catch) result.catch(() => {});
        } catch (error) {
          /* ignore */
        }
      }
    }

    saveHistory();
    openSummary();
  }

  function stopSession() {
    if (state.phase === 'countdown') {
      resetStage();
      return;
    }
    if (state.phase === 'running' || state.phase === 'paused') {
      finishSession();
    }
  }

  /* ---------- configuration ---------- */

  function setMode(mode) {
    if (!MODES[mode] || state.phase === 'countdown' || state.phase === 'running' || state.phase === 'paused') return;

    state.mode = mode;
    $$('.mode-tab').forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    renderLegend();
    resetStage();
  }

  function setPace(pace) {
    if (!PACES[pace] || state.phase === 'countdown' || state.phase === 'running' || state.phase === 'paused') return;

    state.pace = pace;
    syncPaceUI();
    resetStage();
  }

  function setDuration(duration) {
    if (!Number.isFinite(duration) || state.phase === 'countdown' || state.phase === 'running' || state.phase === 'paused') return;

    state.duration = duration;
    syncDurationUI();
    resetStage();
  }

  /* ---------- summary ---------- */

  function openSummary() {
    summarySignals.textContent = state.total;

    summaryMeta.innerHTML = `
      <span>${MODES[state.mode].name}</span>
      <span>${PACES[state.pace].name} · ${formatInterval(PACES[state.pace].interval)}s</span>
      <span>${(state.elapsed / 1000).toFixed(1)} 秒</span>
    `;

    const markup = distributionMarkup(state.counts);
    summaryDist.innerHTML = markup || '<p class="dist-empty">这一组没有发出信号。</p>';

    summaryModal.hidden = false;
    document.body.style.overflow = 'hidden';
    modalClose.focus({ preventScroll: true });
  }

  function closeSummary() {
    summaryModal.hidden = true;
    document.body.style.overflow = '';
    startBtn.focus({ preventScroll: true });
  }

  /* ---------- history ---------- */

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory() {
    if (state.total === 0) return;

    const entry = {
      ts: Date.now(),
      mode: state.mode,
      pace: state.pace,
      duration: state.duration,
      elapsed: Math.round((state.elapsed / 1000) * 10) / 10,
      signals: state.total,
      counts: { ...state.counts },
    };

    const list = [entry, ...loadHistory()].slice(0, 12);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch (error) {
      /* storage can be unavailable in private mode */
    }
    renderHistory();
  }

  function renderHistory() {
    const list = loadHistory();
    historyEmpty.hidden = list.length > 0;
    clearHistoryBtn.disabled = list.length === 0;

    if (!list.length) {
      historyList.innerHTML = '';
      return;
    }

    historyList.innerHTML = `
      <div class="history-row head">
        <span>时间</span><span>模式</span><span>节奏</span><span>时长</span><span class="right">信号</span>
      </div>
      ${list.map((entry) => `
        <div class="history-row">
          <span class="num">${formatDate(entry.ts)}</span>
          <span>${MODES[entry.mode] ? MODES[entry.mode].name : entry.mode}</span>
          <span>${PACES[entry.pace] ? PACES[entry.pace].name : entry.pace}</span>
          <span class="num">${entry.elapsed != null ? `${entry.elapsed}s` : `${entry.duration}s`}</span>
          <span class="signals">${entry.signals}</span>
        </div>
      `).join('')}
    `;
  }

  /* ---------- toast ---------- */

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2200);
  }

  /* ---------- PWA install ---------- */

  const standaloneMode = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  let deferredInstallPrompt = null;

  if (installBtn) {
    if (standaloneMode) installBtn.hidden = true;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installBtn.hidden = false;
    });

    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;

      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      installBtn.hidden = true;
      promptEvent.prompt();

      try {
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') showToast('正在安装 COACHER…');
      } catch (error) {
        /* the prompt can be dismissed by the browser */
      }
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      installBtn.hidden = true;
      showToast('已安装到主屏幕');
    });
  }

  /* ---------- events ---------- */

  startBtn.addEventListener('click', startSession);
  stopBtn.addEventListener('click', stopSession);

  stage.addEventListener('click', (event) => {
    if (event.target.closest('.stage-fs')) return;
    if (state.phase === 'idle' || state.phase === 'done') startSession();
  });

  $$('.mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  paceControl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-pace]');
    if (!button || button.disabled) return;
    setPace(button.dataset.pace);
  });

  durationControl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-duration]');
    if (!button || button.disabled) return;
    setDuration(Number(button.dataset.duration));
  });

  soundToggle.addEventListener('change', () => {
    state.sound = soundToggle.checked;
    if (state.sound) beep(880, 0.05, 0.03);
  });

  flashToggle.addEventListener('change', () => {
    state.flash = flashToggle.checked;
    if (!state.flash) signalSlot.classList.remove('is-dimmed');
  });

  voiceToggle.addEventListener('change', () => {
    state.voice = voiceToggle.checked;

    if (state.voice && !canSpeak) {
      state.voice = false;
      voiceToggle.checked = false;
      showToast('当前浏览器不支持语音合成');
      return;
    }

    if (state.voice) {
      speak('语音已开启');
    } else if (canSpeak) {
      window.speechSynthesis.cancel();
    }
  });

  fullscreenBtn.addEventListener('click', () => {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;

    if (!fullscreenElement) {
      const request = stage.requestFullscreen || stage.webkitRequestFullscreen;
      if (!request) {
        showToast('当前浏览器不支持全屏');
        return;
      }
      try {
        const result = request.call(stage);
        if (result && result.catch) {
          result.catch(() => showToast('全屏请求被浏览器拦截'));
        }
      } catch (error) {
        showToast('当前浏览器不支持全屏');
      }
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        try {
          const result = exit.call(document);
          if (result && result.catch) result.catch(() => {});
        } catch (error) {
          /* ignore */
        }
      }
    }
  });

  function syncFullscreenUI() {
    const isFullscreen = (document.fullscreenElement || document.webkitFullscreenElement) === stage;
    fullscreenBtn.setAttribute('aria-label', isFullscreen ? '退出全屏' : '全屏显示信号');
    fullscreenBtn.title = isFullscreen ? '退出全屏' : '全屏显示信号';
  }

  document.addEventListener('fullscreenchange', syncFullscreenUI);
  document.addEventListener('webkitfullscreenchange', syncFullscreenUI);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === 'running') pauseSession();
  });

  $$('[data-preset]').forEach((card) => {
    card.addEventListener('click', () => {
      if (state.phase === 'countdown' || state.phase === 'running' || state.phase === 'paused') {
        resetStage();
      }

      setMode(card.dataset.mode);
      setPace(card.dataset.pace);
      setDuration(Number(card.dataset.duration));

      $('#trainer').scrollIntoView({ behavior: 'smooth', block: 'start' });

      const title = card.querySelector('h3');
      showToast(`已载入：${title ? title.textContent : '训练'}`);
    });
  });

  modalClose.addEventListener('click', closeSummary);
  $('[data-close]', summaryModal).addEventListener('click', closeSummary);

  againBtn.addEventListener('click', () => {
    closeSummary();
    startSession();
  });

  adjustBtn.addEventListener('click', () => {
    closeSummary();
    $('#trainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    const activeTab = $('.mode-tab.is-active');
    if (activeTab) activeTab.focus({ preventScroll: true });
  });

  clearHistoryBtn.addEventListener('click', () => {
    if (!loadHistory().length) {
      showToast('还没有训练记录');
      return;
    }
    if (!window.confirm('清除本机保存的全部训练记录？')) return;

    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      /* ignore */
    }
    renderHistory();
    showToast('记录已清除');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !summaryModal.hidden) {
      closeSummary();
      return;
    }

    if (event.code !== 'Space') return;

    const target = event.target;
    const tagName = (target.tagName || '').toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'button' || target.isContentEditable) {
      return;
    }

    event.preventDefault();
    if (summaryModal.hidden) startSession();
  });

  /* ---------- boot ---------- */

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* offline cache is optional; the app still works online */
      });
    });
  }

  renderLegend();
  syncPaceUI();
  syncDurationUI();
  updateStageLabels();
  resetStage();
  renderHistory();
})();
