(() => {
  const root = document.documentElement;
  const header = document.getElementById('site-header');
  const langBtn = document.getElementById('lang-switch');
  const metaTheme = document.getElementById('meta-theme-color');

  // ---------------------------------------------------------------------------
  // 1. Sticky Navbar Hairline on Scroll + Dismissible Banner
  // ---------------------------------------------------------------------------
  const syncScrollState = () => {
    if (header) header.setAttribute('data-scrolled', String(window.scrollY > 8));
  };
  syncScrollState();
  window.addEventListener('scroll', syncScrollState, { passive: true });

  const banner = document.getElementById('offer-banner');
  const dismissBtn = document.getElementById('dismiss-banner');
  if (banner && localStorage.getItem('pwm-banner-dismissed') === '1') {
    banner.hidden = true;
  }
  if (banner && dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      banner.hidden = true;
      localStorage.setItem('pwm-banner-dismissed', '1');
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Light / Dark Theme Segmented Switch
  // ---------------------------------------------------------------------------
  const themeButtons = document.querySelectorAll('.theme-btn[data-theme-set]');
  const applyTheme = (theme) => {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', resolved);
    themeButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.themeSet === resolved));
    });
    if (metaTheme) {
      metaTheme.setAttribute('content', resolved === 'dark' ? '#0c0c0d' : '#ffffff');
    }
    localStorage.setItem('pwm-theme', resolved);
  };

  const savedTheme = localStorage.getItem('pwm-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.themeSet));
  });

  // ---------------------------------------------------------------------------
  // 3. Bilingual Language Switch (EN / 中文)
  // ---------------------------------------------------------------------------
  let currentLang = localStorage.getItem('pwm-language') === 'zh' ? 'zh' : 'en';
  let currentLevel = 'L2';
  let currentArenaMode = 'default';

  const SPECTRUM_DATA = {
    L0: {
      en: {
        badge: 'L0 · Baseline Reference',
        title: 'Native Engine',
        authority: 'Human-authored simulator or game engine (e.g., physics solver, hand-coded scene rules).',
        repr: 'Explicit scene graph, rigid/soft bodies, deterministic event callbacks, and physics state.',
        systems: ['Game Engines (Unity)', 'MuJoCo / Isaac', 'Pre-authored Environments'],
        pros: '✓ Exact, reproducible, and ground-truth verifiable.',
        cons: '✕ Expensive manual authoring; fixed domain boundaries and limited open-world synthesis.'
      },
      zh: {
        badge: 'L0 · 参照基线',
        title: '手写原生引擎（Native Engine）',
        authority: '由人类工程师编写的游戏引擎或物理模拟器直接计算状态演化。',
        repr: '显式场景图、几何碰撞体、确定性规则回调与物理状态。',
        systems: ['游戏引擎 (Unity)', '机器人模拟器 (MuJoCo)', '人工构建交互环境'],
        pros: '✓ 精确、可复现、天然具备真值验证能力。',
        cons: '✕ 人工建模成本高昂，难以自动泛化到开放世界新场景。'
      }
    },
    L1: {
      en: {
        badge: 'L1 · Neighboring Paradigm',
        title: 'Next-state LM',
        authority: 'A language model directly predicts the next textual or structured state token-by-token.',
        repr: 'JSON / symbolic text descriptions updated in-context without an external program executor.',
        systems: ['LLM-as-Transition', 'Text World Simulators', 'Prompted State Trackers'],
        pros: '✓ Zero-shot flexibility, open vocabulary, and minimal setup overhead.',
        cons: '✕ No guaranteed invariant enforcement; prone to arithmetic/constraint drift over long horizons.'
      },
      zh: {
        badge: 'L1 · 相邻范式',
        title: '状态预测大模型（Next-state LM）',
        authority: '由语言模型在上下文中直接预测下一步文本或符号状态更新，无外部代码执行器。',
        repr: '文本描述或结构化符号状态（JSON / 键值表）。',
        systems: ['LLM 直接状态转移系统', '文本世界模拟器', '提示式状态追踪'],
        pros: '✓ 零样本推理灵活、开放词汇表达能力强、启动成本低。',
        cons: '✕ 缺乏硬性守恒与门控执行保障，长程交互易出现状态漂移与自相矛盾。'
      }
    },
    L2: {
      en: {
        badge: 'L2 · Center of Gravity',
        title: 'Code World Model',
        authority: 'Executable world program (synthesized or maintained by an agent, executed by a runtime).',
        repr: 'Explicit world state + runnable transition code, rules, procedures, and scheduled events.',
        systems: ['WorldCoder', 'Code World Model', 'Programmable WM', 'Twin'],
        pros: '✓ Inspectable rules, persistent out-of-view state, deterministic counterfactual verification.',
        cons: '✕ Inducing rich perceptual appearance and complex continuous physics purely in code is hard.'
      },
      zh: {
        badge: 'L2 · 本计划核心重心',
        title: '代码世界模型（Code World Model）',
        authority: '可执行世界程序（由智能体归纳或维护，交由确定性运行时实际执行）。',
        repr: '显式世界状态 + 可运行的状态转移代码、规则函数与事件调度。',
        systems: ['WorldCoder', 'Code World Model', 'Programmable WM', 'Twin'],
        pros: '✓ 规则可检查、视野外状态持久一致，天然支持反事实干预与规划验证。',
        cons: '✕ 仅靠纯代码直接覆盖复杂连续物理与高保真开放视觉外观存在瓶颈。'
      }
    },
    L3: {
      en: {
        badge: 'L3 · Center of Gravity',
        title: 'Hybrid World Model',
        authority: 'Shared transition authority combining executable code/rules with learned neural models.',
        repr: 'Explicit symbolic/geometric state coupled with neural proxies, dynamics modules, or renderers.',
        systems: ['GameWM', 'Oneira', 'UniState', 'MASS', 'Hybrid Genie-style Systems'],
        pros: '✓ Balances executable rule fidelity & persistent memory with rich learned visual/open dynamics.',
        cons: '✕ Interface alignment between explicit state and neural modules requires careful verification.'
      },
      zh: {
        badge: 'L3 · 本计划核心重心',
        title: '混合世界模型（Hybrid World Model）',
        authority: '由可执行代码/规则机制与神经学习模型共同承担状态演化与条件渲染。',
        repr: '显式符号/几何状态 + 可执行程序 + 神经渲染器或学习动力学模块。',
        systems: ['GameWM', 'Oneira', 'UniState', 'MASS', '混合架构世界模型'],
        pros: '✓ 兼顾可执行规则控制力、跨遮挡持久记忆与丰富的神经视觉生成能力。',
        cons: '✕ 显式状态与神经模块之间的决定权边界与接口一致性难以评测与校准。'
      }
    },
    L4: {
      en: {
        badge: 'L4 · Neighboring Paradigm',
        title: 'Neural World Model',
        authority: 'End-to-end learned model dominates state evolution in latent or video pixel space.',
        repr: 'Implicit recurrent/diffusion latents or frame histories conditioned on action streams.',
        systems: ['GameNGen', 'PlayGen2', 'Video World Models', 'Latent Action Models'],
        pros: '✓ Scales directly from raw video data with expressive visual realism and open-ended priors.',
        cons: '✕ Hidden state ambiguity, runtime rule editing is opaque, and out-of-view consistency decays.'
      },
      zh: {
        badge: 'L4 · 相邻范式',
        title: '神经世界模型（Neural World Model）',
        authority: '由端到端神经网络在隐空间或视频像素空间主导状态演化。',
        repr: '隐式循环/扩散潜变量或条件视频帧序列。',
        systems: ['GameNGen', 'PlayGen2', '交互视频世界模型', '隐空间动力学模型'],
        pros: '✓ 可直接从大规模原始视频学习丰富的视觉先验与开放动态表现。',
        cons: '✕ 内部状态不可见、难以注入精确运行时规则编辑，长视野遮挡一致性易退化。'
      }
    }
  };

  const renderSpectrumDetail = () => {
    const entry = SPECTRUM_DATA[currentLevel][currentLang];
    if (!entry) return;
    document.getElementById('spec-detail-badge').textContent = entry.badge;
    document.getElementById('spec-detail-title').textContent = entry.title;
    document.getElementById('spec-detail-authority').textContent = entry.authority;
    document.getElementById('spec-detail-repr').textContent = entry.repr;
    document.getElementById('spec-detail-pros').textContent = entry.pros;
    document.getElementById('spec-detail-cons').textContent = entry.cons;
    const sysWrap = document.getElementById('spec-detail-systems');
    sysWrap.innerHTML = entry.systems.map((s) => `<span class="mini-tag">${s}</span>`).join('');
  };

  const renderArenaMode = () => {
    const isEdited = currentArenaMode === 'edited';
    const zh = currentLang === 'zh';
    const statusEl = document.getElementById('arena-branch-status');
    const codeEl = document.getElementById('arena-rule-code');
    const priorEl = document.getElementById('arena-prior-verdict');
    const pwmEl = document.getElementById('arena-pwm-verdict');
    const noteEl = document.getElementById('arena-pair-note');

    if (!statusEl || !codeEl) return;

    if (!isEdited) {
      statusEl.textContent = zh ? '分支 B · 默认绑定' : 'Branch B · Standard';
      statusEl.className = 'status-chip status-chip--blue';
      codeEl.innerHTML = `<code><span class="cm"># Standard binding (Control Branch B)</span>
on_event(<span class="str">"pull_lever_north"</span>):
    set_state(<span class="str">"oak_door"</span>, open=<span class="bool">True</span>)
    set_state(<span class="str">"trapdoor"</span>, open=<span class="bool">False</span>)</code>`;
      priorEl.textContent = zh ? '命中默认先验 ✓' : 'Matches Control ✓';
      priorEl.className = 'status-chip status-chip--green';
      pwmEl.textContent = zh ? '按规则执行 ✓' : 'Executes Rule ✓';
      pwmEl.className = 'status-chip status-chip--green';
      noteEl.textContent = zh
        ? '切换到「分支 A · 规则重绑定」，查看非可执行先验为何失效。'
        : 'Switch to Branch A (Rule Edited) to see where non-executable priors fail.';
    } else {
      statusEl.textContent = zh ? '分支 A · 运行时重绑定' : 'Branch A · Rebound Rule';
      statusEl.className = 'status-chip status-chip--green';
      codeEl.innerHTML = `<code><span class="cm"># Counterfactual edit (Branch A: revoke &amp; rebind)</span>
revoke_rule(<span class="str">"pull_lever_north -> oak_door"</span>)
on_event(<span class="str">"pull_lever_north"</span>):
    set_state(<span class="str">"oak_door"</span>, open=<span class="bool">False</span>)
    set_state(<span class="str">"trapdoor"</span>, open=<span class="bool">True</span>)</code>`;
      priorEl.textContent = zh ? '仍画成木门打开 ✕ (Strict Pair = 0)' : 'Still opens oak_door ✕ (Pair = 0)';
      priorEl.className = 'status-chip status-chip--danger';
      pwmEl.textContent = zh ? '执行新规则打开活板门 ✓ (Pair = 1)' : 'Opens trapdoor per edit ✓ (Pair = 1)';
      pwmEl.className = 'status-chip status-chip--green';
      noteEl.textContent = zh
        ? '仅靠视觉共现的模型忽略规则撤销，唯有真正执行规则契约的系统能同时通过 A 与 B。'
        : 'Models relying on static priors ignore the rule revocation; executable models pass both A and B.';
    }
  };

  // Simulation state for Runnable Program Loop
  const simState = {
    tick: 0,
    has_key: false,
    door_open: false,
    lamp_on: false,
    camera_occluded: false
  };

  const renderSimRoom = () => {
    const zh = currentLang === 'zh';
    const roomEl = document.getElementById('sim-room');
    const keyEl = document.getElementById('sim-room-key');
    const doorEl = document.getElementById('sim-room-door');
    const lampEl = document.getElementById('sim-room-lamp');
    const camEl = document.getElementById('sim-room-cam');
    const occBanner = document.getElementById('sim-occluded-banner');
    const jsonEl = document.getElementById('sim-json-state');
    const tickEl = document.getElementById('sim-tick');

    if (!roomEl) return;

    tickEl.textContent = `tick = ${String(simState.tick).padStart(2, '0')}`;
    roomEl.classList.toggle('is-lit', simState.lamp_on);
    roomEl.classList.toggle('is-occluded', simState.camera_occluded);
    occBanner.hidden = !simState.camera_occluded;

    camEl.textContent = simState.camera_occluded ? 'camera: hallway_wall (occluded)' : 'camera: room_view';

    keyEl.classList.toggle('is-active', simState.has_key);
    keyEl.innerHTML = `<span class="room-obj__icon">${simState.has_key ? '🗝️' : '🔑'}</span><small>${
      simState.has_key ? (zh ? '钥匙：已持有' : 'Key: held') : zh ? '钥匙：地面' : 'Key: floor'
    }</small>`;

    doorEl.classList.toggle('is-active', simState.door_open);
    doorEl.innerHTML = `<span class="room-obj__icon">${simState.door_open ? '🔓' : '🚪'}</span><small>${
      simState.door_open ? (zh ? '铁门：已开启' : 'Door: open') : zh ? '铁门：关闭' : 'Door: closed'
    }</small>`;

    lampEl.classList.toggle('is-active', simState.lamp_on);
    lampEl.innerHTML = `<span class="room-obj__icon">${simState.lamp_on ? '✨' : '💡'}</span><small>${
      simState.lamp_on ? (zh ? '红石灯：亮' : 'Lamp: on') : zh ? '红石灯：灭' : 'Lamp: off'
    }</small>`;

    jsonEl.textContent = JSON.stringify(
      {
        tick: simState.tick,
        has_key: simState.has_key,
        door_open: simState.door_open,
        lamp_on: simState.lamp_on,
        camera: simState.camera_occluded ? 'occluded' : 'room_view'
      },
      null,
      2
    );
  };

  const setLanguage = (lang) => {
    currentLang = lang === 'zh' ? 'zh' : 'en';
    const isZh = currentLang === 'zh';
    root.classList.toggle('zh', isZh);
    root.lang = isZh ? 'zh-CN' : 'en';

    document.querySelectorAll('[data-en][data-zh]').forEach((el) => {
      el.innerHTML = isZh ? el.dataset.zh : el.dataset.en;
    });

    if (langBtn) {
      langBtn.textContent = isZh ? 'EN' : '中';
      langBtn.setAttribute('aria-pressed', String(isZh));
    }
    document.title = isZh
      ? 'Program World Model｜可执行世界模型开放研究计划'
      : 'Program World Model · Executable Worlds & Open Research';
    localStorage.setItem('pwm-language', currentLang);

    renderSpectrumDetail();
    renderArenaMode();
    renderSimRoom();
  };

  setLanguage(currentLang);
  if (langBtn) {
    langBtn.addEventListener('click', () => setLanguage(currentLang === 'zh' ? 'en' : 'zh'));
  }

  // ---------------------------------------------------------------------------
  // 4. Works Filter Tabs (#work)
  // ---------------------------------------------------------------------------
  const filterTabs = document.querySelectorAll('.lp-tab[data-filter]');
  const workCards = document.querySelectorAll('.work-card[data-category]');
  const ledgerRows = document.querySelectorAll('.ledger-row[data-category]');

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;
      filterTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      workCards.forEach((card) => {
        card.hidden = filter !== 'all' && card.dataset.category !== filter;
      });
      ledgerRows.forEach((row) => {
        row.hidden = filter !== 'all' && row.dataset.category !== filter;
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Executable World Inspector Tabs & Runnable Step Simulation (#inspector)
  // ---------------------------------------------------------------------------
  const screenTabs = document.querySelectorAll('.screen-tab[data-screen]');
  const screenPanels = document.querySelectorAll('.screen-panel[data-screen-panel]');

  screenTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.screen;
      screenTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      screenPanels.forEach((panel) => {
        const show = panel.dataset.screenPanel === target;
        panel.classList.toggle('is-active', show);
        panel.hidden = !show;
      });
    });
  });

  const simCallEl = document.getElementById('sim-code-call');
  const simTraceEl = document.getElementById('sim-trace-list');
  const simStatusEl = document.getElementById('sim-status-pill');

  const pushTrace = (enMsg, zhMsg, blocked = false) => {
    if (!simTraceEl) return;
    const entry = document.createElement('div');
    entry.className = 'trace-entry';
    const msg = currentLang === 'zh' ? zhMsg : enMsg;
    entry.innerHTML = `<span class="trace-tick">t=${String(simState.tick).padStart(2, '0')}</span><span>${msg}</span>`;
    simTraceEl.prepend(entry);
    while (simTraceEl.children.length > 5) {
      simTraceEl.removeChild(simTraceEl.lastChild);
    }
    if (simStatusEl) {
      if (blocked) {
        simStatusEl.className = 'status-chip status-chip--danger';
        simStatusEl.textContent = currentLang === 'zh' ? '规则拦截 · 缺钥匙' : 'Gate Blocked · No Key';
      } else {
        simStatusEl.className = 'status-chip status-chip--green';
        simStatusEl.textContent = currentLang === 'zh' ? '已执行 · 状态更新' : 'Executed · Trace Verified';
      }
    }
  };

  document.querySelectorAll('.sim-action-btn[data-sim-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.simAction;
      if (action === 'reset') {
        simState.tick = 0;
        simState.has_key = false;
        simState.door_open = false;
        simState.lamp_on = false;
        simState.camera_occluded = false;
        if (simCallEl) simCallEl.textContent = 's_0 = world.reset()';
        pushTrace('World reset to initial state s_0.', '已重置回初始显式状态 s_0。');
      } else if (action === 'take_key') {
        simState.tick += 1;
        simState.has_key = true;
        if (simCallEl) simCallEl.textContent = `s_${simState.tick}, o_${simState.tick} = world.step("pickup(brass_key)")`;
        pushTrace('has_key -> true (persists in explicit inventory).', 'has_key -> true（已写入显式背包状态）。');
      } else if (action === 'unlock_door') {
        simState.tick += 1;
        if (simCallEl) simCallEl.textContent = `s_${simState.tick}, o_${simState.tick} = world.step("activate(iron_door)")`;
        if (!simState.has_key) {
          pushTrace(
            'Precondition failed (has_key == false): iron_door stays closed.',
            '门控前置条件未满足 (has_key == false)：铁门保持关闭。',
            true
          );
        } else {
          simState.door_open = !simState.door_open;
          pushTrace(
            `Gate rule satisfied -> door_open = ${simState.door_open}.`,
            `门控规则通过 -> door_open = ${simState.door_open}。`
          );
        }
      } else if (action === 'toggle_lamp') {
        simState.tick += 1;
        simState.lamp_on = !simState.lamp_on;
        if (simCallEl) simCallEl.textContent = `s_${simState.tick}, o_${simState.tick} = world.step("toggle(redstone_lamp)")`;
        pushTrace(`Illumination updated -> lamp_on = ${simState.lamp_on}.`, `光照规则更新 -> lamp_on = ${simState.lamp_on}。`);
      } else if (action === 'pan_away') {
        simState.tick += 1;
        simState.camera_occluded = !simState.camera_occluded;
        if (simCallEl) simCallEl.textContent = `s_${simState.tick}, o_${simState.tick} = world.step("camera.pan(away)")`;
        pushTrace(
          simState.camera_occluded
            ? 'Camera panned away — room occluded, all state fields preserved.'
            : 'Camera returned — rendered view aligns with preserved s_t.',
          simState.camera_occluded
            ? '相机移开 — 画面进入遮挡，底层全部状态字段原样保持。'
            : '相机转回房间 — 渲染画面与持久保存的 s_t 精确对齐。'
        );
      }
      renderSimRoom();
    });
  });

  // Counterfactual A/B Mode Switch
  const arenaBtns = document.querySelectorAll('.arena-mode-btn[data-arena-mode]');
  arenaBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentArenaMode = btn.dataset.arenaMode;
      arenaBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      renderArenaMode();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Spectrum Interactive Cards (#frame)
  // ---------------------------------------------------------------------------
  const specCards = document.querySelectorAll('.spec-card[data-level]');
  specCards.forEach((card) => {
    card.addEventListener('click', () => {
      currentLevel = card.dataset.level;
      specCards.forEach((c) => {
        const selected = c === card;
        c.classList.toggle('is-selected', selected);
        c.setAttribute('aria-selected', String(selected));
      });
      renderSpectrumDetail();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Draggable Before / After Split Slider (#idea)
  // ---------------------------------------------------------------------------
  const baStage = document.getElementById('ba-stage');
  const baRange = document.getElementById('ba-range');
  if (baStage && baRange) {
    const updateSplit = () => {
      baStage.style.setProperty('--split', `${baRange.value}%`);
    };
    baRange.addEventListener('input', updateSplit);
    updateSplit();
  }

  // ---------------------------------------------------------------------------
  // 8. Copy Clone Command Pill (#closing)
  // ---------------------------------------------------------------------------
  const copyBtn = document.getElementById('copy-cmd-btn');
  const copyText = document.getElementById('copy-cmd-text');
  const copyLabel = document.getElementById('copy-cmd-label');
  if (copyBtn && copyText && copyLabel) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyText.textContent.trim());
        copyLabel.textContent = currentLang === 'zh' ? '已复制 ✓' : 'Copied ✓';
        setTimeout(() => {
          copyLabel.textContent = currentLang === 'zh' ? '复制' : 'Copy';
        }, 1800);
      } catch {
        // Fallback selection if clipboard is unavailable
        const range = document.createRange();
        range.selectNodeContents(copyText);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 9. Calm Scroll-Reveal Observer
  // ---------------------------------------------------------------------------
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    document.querySelectorAll('.lp-section, .aui-card, .bento-tile').forEach((el) => {
      el.classList.add('reveal');
      observer.observe(el);
    });
  }
})();
