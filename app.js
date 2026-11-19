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
  const FOOT_NAME = { up: '上步', right: '右跨', down: '后撤', left: '左跨' };
  const KIND_NAME = { number: '数字', gesture: '手势', color: '颜色', foot: '脚步', math: '心算' };

  const GESTURE_ACTIONS = { 1: 'crossover', 2: 'between', 3: 'behind', 4: 'double', 5: 'retreat' };
  const COLOR_ACTIONS = { green: 'crossover', red: 'between', blue: 'behind', amber: 'double' };
  const FOOT_ACTIONS = { up: 'push', right: 'right', down: 'retreat', left: 'left' };

  const PACES = {
    slow:   { name: '慢', interval: 3000 },
    normal: { name: '标准', interval: 2000 },
    fast:   { name: '快', interval: 1300 },
    pro:    { name: '极限', interval: 850 },
  };

  const HISTORY_KEY = 'coacher.history.v1';
  const LEGACY_MODE_NAMES = { arrow: '方向 · 箭头' };

  // Top-down footprint: toes at the top, heel at the bottom.
  const FOOT_SCALE = 0.52;
  const FOOT_TOES = [
    { cx: 33, cy: 52, rx: 13, ry: 14 },
    { cx: 54, cy: 40, rx: 9, ry: 10 },
    { cx: 67, cy: 39, rx: 8, ry: 9 },
    { cx: 78, cy: 43, rx: 7, ry: 8 },
    { cx: 86, cy: 51, rx: 6, ry: 7 },
  ];
  const FOOT_PALM = 'M38 68 C50 68 64 72 74 80 C84 88 88 100 86 112 C84 124 79 132 77 142 C75 152 77 162 80 172 C83 184 76 194 64 196 C52 198 42 192 40 181 C38 171 42 162 44 153 C46 144 44 137 41 129 C38 121 37 112 39 104 C41 96 40 88 36 82 C32 76 34 68 38 68 Z';
  const FOOT_STANCES = {
    up: {
      aria: '上步站位：右脚向前跨出',
      base: { x: 98, y: 132, rot: -2, foot: 'left' },
      lead: { x: 146, y: 60, rot: 4, foot: 'right' },
    },
    right: {
      aria: '右跨站位：右脚向右跨出',
      base: { x: 98, y: 130, rot: -2, foot: 'left' },
      lead: { x: 180, y: 130, rot: 12, foot: 'right' },
    },
    down: {
      aria: '后撤站位：右脚向后撤步',
      base: { x: 98, y: 124, rot: 2, foot: 'left' },
      lead: { x: 146, y: 180, rot: -4, foot: 'right' },
    },
    left: {
      aria: '左跨站位：左脚向左跨出',
      base: { x: 142, y: 130, rot: 2, foot: 'right' },
      lead: { x: 60, y: 130, rot: -12, foot: 'left' },
    },
  };

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

  function modeName(key) {
    if (MODES[key]) return MODES[key].name;
    return LEGACY_MODE_NAMES[key] || key;
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

    foot: {
      name: '脚步 · 站位',
      tag: '四种站位',
      idle: '看到站位，用对应的脚启动',
      note: '上步 → 向前推进；右跨 → 右侧变向；后撤 → 后撤步；左跨 → 左侧变向。先看脚位，再做动作。',
      entries: [
        { type: 'foot', value: 'up', label: '上步', action: 'push' },
        { type: 'foot', value: 'right', label: '右跨', action: 'right' },
        { type: 'foot', value: 'down', label: '后撤', action: 'retreat' },
        { type: 'foot', value: 'left', label: '左跨', action: 'left' },
      ],
      generate() {
        const keys = Object.keys(FOOT_ACTIONS);
        const value = keys[randomInt(0, keys.length - 1)];
        return { kind: 'foot', value, action: FOOT_ACTIONS[value] };
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
    idle: '数字、手势、颜色、站位随机切换',
    note: '数字、手势、颜色和站位随机切换。没有规律，也不给预判。',
    entries: [
      ...MODES.number.entries,
      ...MODES.gesture.entries,
      ...MODES.color.entries,
      ...MODES.foot.entries,
    ],
    generate() {
      const pool = [MODES.number, MODES.gesture, MODES.color, MODES.foot];
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
  const progressTrack = progressFill.parentElement;
  const signalCount = $('#signalCount');
  const countdown = $('#countdown');
  const countdownValue = $('#countdownValue');
  const stagePauseBtn = $('#stagePauseBtn');
  const stageStopBtn = $('#stageStopBtn');

  const startBtn = $('#startBtn');
  const stopBtn = $('#stopBtn');
  const paceControl = $('#paceControl');
  const durationControl = $('#durationControl');
  const soundToggle = $('#soundToggle');
  const flashToggle = $('#flashToggle');
  const voiceToggle = $('#voiceToggle');
  const fullscreenBtn = $('#fullscreenBtn');
  const installBtn = $('#installBtn');
  const installModal = $('#installModal');
  const installClose = $('#installClose');
  const installCloseBtn = $('#installCloseBtn');
  const installUrl = $('#installUrl');
  const copyLinkBtn = $('#copyLinkBtn');
  const browserNotice = $('#browserNotice');
  const browserNoticeBtn = $('#browserNoticeBtn');
  const browserNoticeClose = $('#browserNoticeClose');

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
  let focusModeActive = false;
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

  function footShape(foot) {
    const toes = FOOT_TOES.map((toe) => (
      `<ellipse class="foot-sole" fill="url(#footGold)" cx="${toe.cx}" cy="${toe.cy}" rx="${toe.rx}" ry="${toe.ry}"/>`
    )).join('');
    const shape = `<path class="foot-sole" fill="url(#footGold)" d="${FOOT_PALM}"/>${toes}`;

    return foot === 'left'
      ? `<g transform="translate(119 0) scale(-1 1)">${shape}</g>`
      : shape;
  }

  function footPrint(print, className) {
    return `<g class="foot-print ${className}" transform="translate(${print.x} ${print.y}) rotate(${print.rot}) scale(${FOOT_SCALE}) translate(-59.5 -112)">${footShape(print.foot)}</g>`;
  }

  function footMapSVG(value) {
    const stance = FOOT_STANCES[value];

    return `<svg viewBox="0 0 240 240" class="foot-map" aria-hidden="true">
      <defs>
        <linearGradient id="footGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fbefd2"/>
          <stop offset=".45" stop-color="#f0d79a"/>
          <stop offset="1" stop-color="#b98f44"/>
        </linearGradient>
        <radialGradient id="footGlow">
          <stop offset="0" stop-color="#f0d79a" stop-opacity=".26"/>
          <stop offset=".6" stop-color="#f0d79a" stop-opacity=".07"/>
          <stop offset="1" stop-color="#f0d79a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle class="foot-ring" cx="120" cy="120" r="104"/>
      <path class="foot-axis" d="M20 120H220M120 20V220"/>
      <circle class="foot-center-ring" cx="120" cy="120" r="17"/>
      <circle class="foot-center" cx="120" cy="120" r="4.5"/>
      <circle class="foot-glow" fill="url(#footGlow)" cx="${stance.lead.x}" cy="${stance.lead.y}" r="58"/>
      ${footPrint(stance.base, 'is-base')}
      ${footPrint(stance.lead, 'is-lead')}
    </svg>`;
  }

  function chipMarkup(entry) {
    if (entry.type === 'color') {
      return `<span class="chip"><i class="chip-dot" style="background:${COLOR_HEX[entry.value]}"></i>${entry.label}</span>`;
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
    } else if (signal.kind === 'foot') {
      figure = `<div class="sig-foot sig-foot--${signal.value}" role="img" aria-label="${FOOT_STANCES[signal.value].aria}">${footMapSVG(signal.value)}</div>`;
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
    const unlimited = state.duration === 0;
    const durationMs = state.duration * 1000;

    progressTrack.classList.toggle('is-unlimited', unlimited);

    if (unlimited) {
      stageClock.textContent = '∞';
    } else {
      const ratio = Math.min(1, state.elapsed / durationMs);
      progressFill.style.width = `${ratio * 100}%`;
      stageClock.textContent = formatClock(durationMs - state.elapsed);
    }

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
      stageClock.textContent = state.duration === 0 ? '∞' : formatClock(state.duration * 1000);
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
    updateStageSessionButtons();
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
      case 'foot':
        return `${FOOT_NAME[signal.value]}站位`;
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
    progressTrack.classList.toggle('is-unlimited', state.duration === 0);

    updateStageLabels();
    updateMetrics();
    setControls();
  }

  /* ---------- fullscreen / focus ---------- */

  function isStageFullscreen() {
    return (document.fullscreenElement || document.webkitFullscreenElement) === stage;
  }

  function updateStageSessionButtons() {
    const active = state.phase === 'running' || state.phase === 'paused';
    stagePauseBtn.hidden = !active;
    stagePauseBtn.classList.toggle('is-paused', state.phase === 'paused');
    stagePauseBtn.setAttribute('aria-label', state.phase === 'paused' ? '继续' : '暂停');
    stageStopBtn.hidden = !(active || state.phase === 'countdown');
  }

  function enterCssFocus() {
    if (isStageFullscreen()) return;

    focusModeActive = true;
    stage.classList.add('is-focus');
    document.body.classList.add('is-stage-focus');
    syncFullscreenUI();
  }

  function enterStageFocus() {
    if (isStageFullscreen() || focusModeActive) return;

    const request = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (!request) {
      enterCssFocus();
      return;
    }

    try {
      const result = request.call(stage);
      if (result && typeof result.catch === 'function') {
        result.catch(() => enterCssFocus());
      } else {
        setTimeout(() => {
          if (!isStageFullscreen()) enterCssFocus();
        }, 400);
      }
    } catch (error) {
      enterCssFocus();
    }
  }

  function exitStageFocus() {
    if (isStageFullscreen()) {
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

    if (focusModeActive) {
      focusModeActive = false;
      stage.classList.remove('is-focus');
      document.body.classList.remove('is-stage-focus');
      syncFullscreenUI();
    }
  }

  function shouldAutoExpand() {
    return window.matchMedia('(max-width: 900px)').matches
      || window.matchMedia('(pointer: coarse)').matches;
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

    if (shouldAutoExpand()) enterStageFocus();

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
    const unlimited = state.duration === 0;
    const durationMs = state.duration * 1000;

    if (!unlimited && state.elapsed >= durationMs) {
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

    exitStageFocus();

    saveHistory();
    openSummary();
  }

  function stopSession() {
    if (state.phase === 'countdown') {
      resetStage();
      exitStageFocus();
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
      ${state.duration === 0 ? '<span>无限 · 手动结束</span>' : ''}
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
          <span>${modeName(entry.mode)}</span>
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

  function openInstallHelp() {
    if (!summaryModal.hidden) closeSummary();

    installUrl.textContent = `${location.host}${location.pathname}`;
    installUrl.href = location.href;
    installModal.hidden = false;
    document.body.style.overflow = 'hidden';
    installClose.focus({ preventScroll: true });
  }

  function closeInstallHelp() {
    installModal.hidden = true;
    document.body.style.overflow = '';
    startBtn.focus({ preventScroll: true });
  }

  async function copyInstallLink() {
    const link = location.href;

    try {
      await navigator.clipboard.writeText(link);
      showToast('链接已复制');
      return;
    } catch (error) {
      /* fall back to execCommand */
    }

    try {
      const input = document.createElement('input');
      input.value = link;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      showToast('链接已复制');
    } catch (error) {
      showToast('复制失败，请手动选择链接');
    }
  }

  if (installBtn) {
    installBtn.hidden = standaloneMode;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
    });

    installBtn.addEventListener('click', async () => {
      const hasActivation = !navigator.userActivation || navigator.userActivation.isActive;

      if (!deferredInstallPrompt || !hasActivation) {
        openInstallHelp();
        return;
      }

      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;

      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') showToast('正在安装 COACHER…');
      } catch (error) {
        openInstallHelp();
      }
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      installBtn.hidden = true;
      browserNotice.hidden = true;
      showToast('已安装到主屏幕');
    });
  }

  if (installModal) {
    installClose.addEventListener('click', closeInstallHelp);
    installCloseBtn.addEventListener('click', closeInstallHelp);
    $('[data-install-close]', installModal).addEventListener('click', closeInstallHelp);
    copyLinkBtn.addEventListener('click', copyInstallLink);
  }

  const inAppBrowser = /MicroMessenger|QQ\/|Weibo|AlipayClient|aweme|BytedanceWebview|Douyin|Baidu|UCBrowser|MQQBrowser/i.test(navigator.userAgent);

  if (browserNotice && inAppBrowser && !standaloneMode) {
    browserNotice.hidden = false;
    browserNoticeBtn.addEventListener('click', openInstallHelp);
    browserNoticeClose.addEventListener('click', () => {
      browserNotice.hidden = true;
    });
  }

  /* ---------- events ---------- */

  startBtn.addEventListener('click', startSession);
  stopBtn.addEventListener('click', stopSession);

  stagePauseBtn.addEventListener('click', () => {
    if (state.phase === 'running') pauseSession();
    else if (state.phase === 'paused') resumeSession();
  });

  stageStopBtn.addEventListener('click', stopSession);

  stage.addEventListener('click', (event) => {
    if (event.target.closest('.stage-fs, .stage-stop')) return;
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
    if (isStageFullscreen() || focusModeActive) exitStageFocus();
    else enterStageFocus();
  });

  function syncFullscreenUI() {
    const isFullscreen = isStageFullscreen();

    if (isFullscreen && focusModeActive) {
      focusModeActive = false;
      stage.classList.remove('is-focus');
      document.body.classList.remove('is-stage-focus');
    }

    const expanded = isFullscreen || focusModeActive;
    fullscreenBtn.setAttribute('aria-label', expanded ? '退出全屏' : '全屏显示信号');
    fullscreenBtn.title = expanded ? '退出全屏' : '全屏显示信号';
    updateStageSessionButtons();
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
    if (event.key === 'Escape' && !installModal.hidden) {
      closeInstallHelp();
      return;
    }

    if (event.key === 'Escape' && !summaryModal.hidden) {
      closeSummary();
      return;
    }

    if (event.key === 'Escape' && focusModeActive) {
      exitStageFocus();
      return;
    }

    if (event.code !== 'Space') return;

    const target = event.target;
    const tagName = (target.tagName || '').toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'button' || target.isContentEditable) {
      return;
    }

    event.preventDefault();
    if (summaryModal.hidden && installModal.hidden) startSession();
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
  syncFullscreenUI();
  renderHistory();
})();
