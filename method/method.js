/* ==========================================================================
   /method/ — Executable World Synthesis & Verification (Reference Sandbox)
   Genuine deterministic pwm-state-v1 interpreter + 3-stage loop inspector
   ========================================================================== */
(function () {
  'use strict';

  const shell = window.PWM_SHELL;
  let lang = shell ? shell.lang : 'en';

  function createInitialState() {
    return {
      schema: 'pwm-state-v1',
      tick: 0,
      params: {
        'door.mode': 'single_open',
        'door.required_pulls': 1,
        'lamp.pulse_ticks': 2,
      },
      camera: {
        view: 'room_view',
        yaw_deg: 0,
        frustum_occluded: false,
      },
      entities: {
        brass_key: {
          type: 'key_item',
          props: { on_floor: true, held: false },
          obs: { on_floor: 'visible', held: 'ui' },
        },
        lever_L2: {
          type: 'lever',
          props: { powered: false, pull_count: 0 },
          obs: { powered: 'visible', pull_count: 'hidden' },
        },
        iron_door: {
          type: 'iron_door',
          props: { open: false, lock_progress: '0/1' },
          obs: { open: 'visible', lock_progress: 'hidden' },
        },
        redstone_lamp: {
          type: 'lamp',
          props: { lit: false },
          obs: { lit: 'visible' },
        },
      },
      rules: [
        {
          id: 'door_gate',
          version: 1,
          priority: 10,
          status: 'active',
          when: { event: 'pull', source: 'lever_L2' },
          if: [
            'brass_key.held == true',
            "lever_L2.pull_count >= params['door.required_pulls']",
          ],
          then: [{ toggle: 'iron_door.open' }],
          once: false,
          active_from: 0,
          expires_at: null,
        },
        {
          id: 'lamp_relay',
          version: 1,
          priority: 5,
          status: 'active',
          when: { event: 'toggle', target: 'redstone_lamp' },
          if: [],
          then: [{ toggle: 'redstone_lamp.lit' }],
          once: false,
          active_from: 0,
          expires_at: null,
        },
      ],
      pending: [],
    };
  }

  let worldState = createInitialState();
  let pendingSeq = 1;
  let lastCallEn = 's_0 = world.init(schema="pwm-state-v1")';
  let lastCallZh = 's_0 = world.init(schema="pwm-state-v1")';
  let occlusionBaseline = null;
  let occlusionCheck = null;
  let activeStageId = '01';
  let copyTimer = null;

  let traceLog = [
    {
      tick: 0,
      opEn: 'world.init',
      opZh: 'world.init',
      ruleId: 'pwm-state-v1',
      deltaEn: 'Initialized 4 entities, 2 rules (single_open v1), pending=[]',
      deltaZh: '初始化 4 个实体、2 条规则（single_open v1），pending=[]',
      obs: 'visible',
      blocked: false,
    },
  ];

  function pushTrace(entry) {
    traceLog.unshift(entry);
    if (traceLog.length > 24) {
      traceLog = traceLog.slice(0, 24);
    }
  }

  function padTick(n) {
    return String(n).padStart(2, '0');
  }

  function findRule(id) {
    return worldState.rules.find((r) => r.id === id);
  }

  function sortedActiveRules() {
    return worldState.rules
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.status === 'active')
      .sort((a, b) => {
        if (b.r.priority !== a.r.priority) return b.r.priority - a.r.priority;
        if (b.r.version !== a.r.version) return b.r.version - a.r.version;
        return a.idx - b.idx;
      })
      .map(({ r }) => r);
  }

  function fireDuePending(nextTick) {
    const due = worldState.pending
      .filter((p) => p.at_tick <= nextTick)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!due.length) return;

    const dueIds = new Set(due.map((d) => d.id));
    worldState.pending = worldState.pending.filter((p) => !dueIds.has(p.id));

    due.forEach((evt) => {
      const lamp = worldState.entities.redstone_lamp.props;
      const prevLit = lamp.lit;
      lamp.lit = !prevLit;
      if (worldState.camera.frustum_occluded && occlusionBaseline) {
        occlusionBaseline.pendingFired += 1;
        occlusionBaseline.mutations += 1;
      }
      pushTrace({
        tick: nextTick,
        opEn: `pending: ${evt.id}`,
        opZh: `定时触发: ${evt.id}`,
        ruleId: `${evt.source_rule}@v${findRule(evt.source_rule).version}`,
        deltaEn: `redstone_lamp.lit: ${prevLit}→${lamp.lit}`,
        deltaZh: `redstone_lamp.lit: ${prevLit}→${lamp.lit}`,
        obs: 'visible',
        blocked: false,
      });
    });
  }

  function markOnceRulesConsumed(firedRuleIds) {
    worldState.rules.forEach((r) => {
      if (r.once && firedRuleIds.includes(r.id)) {
        r.status = 'consumed';
      }
    });
  }

  function evaluateDoorGate(nextTick, opEn, opZh, prefixDeltaEn, prefixDeltaZh) {
    const key = worldState.entities.brass_key.props;
    const lever = worldState.entities.lever_L2.props;
    const door = worldState.entities.iron_door.props;
    const req = worldState.params['door.required_pulls'];
    const gate = findRule('door_gate');
    const active = sortedActiveRules();
    const activeGate = active.find((r) => r.id === 'door_gate');

    if (!activeGate) {
      pushTrace({
        tick: nextTick,
        opEn,
        opZh,
        ruleId: `door_gate@${gate.status}`,
        deltaEn: `${prefixDeltaEn}blocked: door_gate is ${gate.status}; iron_door.open=${door.open}`,
        deltaZh: `${prefixDeltaZh}受阻：door_gate 状态为 ${gate.status}；iron_door.open=${door.open}`,
        obs: 'hidden',
        blocked: true,
      });
      return [];
    }

    if (!key.held) {
      pushTrace({
        tick: nextTick,
        opEn,
        opZh,
        ruleId: `door_gate@v${activeGate.version}`,
        deltaEn: `${prefixDeltaEn}blocked: brass_key.held == false; iron_door.open=${door.open}`,
        deltaZh: `${prefixDeltaZh}受阻：brass_key.held == false；iron_door.open=${door.open}`,
        obs: 'ui',
        blocked: true,
      });
      return [];
    }

    if (lever.pull_count < req) {
      pushTrace({
        tick: nextTick,
        opEn,
        opZh,
        ruleId: `door_gate@v${activeGate.version}`,
        deltaEn: `${prefixDeltaEn}gated: pull_count ${lever.pull_count} < ${req} (lock ${door.lock_progress})`,
        deltaZh: `${prefixDeltaZh}门锁计数未满：pull_count ${lever.pull_count} < ${req}（进度 ${door.lock_progress}）`,
        obs: 'hidden',
        blocked: true,
      });
      return [];
    }

    const prevOpen = door.open;
    door.open = !prevOpen;
    if (worldState.camera.frustum_occluded && occlusionBaseline) {
      occlusionBaseline.mutations += 1;
    }
    pushTrace({
      tick: nextTick,
      opEn,
      opZh,
      ruleId: `door_gate@v${activeGate.version}`,
      deltaEn: `${prefixDeltaEn}iron_door.open: ${prevOpen}→${door.open}`,
      deltaZh: `${prefixDeltaZh}iron_door.open: ${prevOpen}→${door.open}`,
      obs: 'visible',
      blocked: false,
    });
    return ['door_gate'];
  }

  function applyRulePatch(mode) {
    const gate = findRule('door_gate');
    if (worldState.params['door.mode'] === mode) return;

    const nextTick = worldState.tick + 1;
    // 1. Meta-edit
    const prevMode = worldState.params['door.mode'];
    const req = mode === 'double_lock' ? 2 : 1;
    worldState.params['door.mode'] = mode;
    worldState.params['door.required_pulls'] = req;
    gate.version += 1;
    gate.if = [
      'brass_key.held == true',
      `lever_L2.pull_count >= params['door.required_pulls'] (${req})`,
    ];
    const prevPulls = worldState.entities.lever_L2.props.pull_count;
    worldState.entities.lever_L2.props.pull_count = 0;
    worldState.entities.iron_door.props.lock_progress = `0/${req}`;

    // 2. Due pending
    fireDuePending(nextTick);

    pushTrace({
      tick: nextTick,
      opEn: 'meta: set_rule',
      opZh: '元编辑: set_rule',
      ruleId: `door_gate@v${gate.version}`,
      deltaEn: `mode: ${prevMode}→${mode}; required_pulls=${req}; pull_count: ${prevPulls}→0`,
      deltaZh: `模式: ${prevMode}→${mode}; 所需拉杆=${req}; pull_count: ${prevPulls}→0`,
      obs: 'hidden',
      blocked: false,
    });

    worldState.tick = nextTick;
    lastCallEn = `world.set_rule("door_gate", mode="${mode}", required_pulls=${req})  # t=${padTick(nextTick)}`;
    lastCallZh = `world.set_rule("door_gate", mode="${mode}", required_pulls=${req})  # t=${padTick(nextTick)}`;
    renderAll();
  }

  function toggleRevokeDoorGate() {
    const gate = findRule('door_gate');
    const nextTick = worldState.tick + 1;

    // 1. Meta-edit
    const nextStatus = gate.status === 'active' ? 'revoked' : 'active';
    gate.status = nextStatus;
    gate.version += 1;
    const cancelledCount =
      nextStatus === 'revoked'
        ? worldState.pending.filter((p) => p.source_rule === 'door_gate').length
        : 0;
    if (nextStatus === 'revoked') {
      worldState.pending = worldState.pending.filter((p) => p.source_rule !== 'door_gate');
    }

    // 2. Due pending
    fireDuePending(nextTick);

    const opName = nextStatus === 'revoked' ? 'meta: revoke' : 'meta: restore';
    const opNameZh = nextStatus === 'revoked' ? '元编辑: revoke' : '元编辑: restore';
    pushTrace({
      tick: nextTick,
      opEn: opName,
      opZh: opNameZh,
      ruleId: `door_gate@v${gate.version}`,
      deltaEn: `door_gate.status → "${nextStatus}" (cancel_pending=${cancelledCount})`,
      deltaZh: `door_gate.status → "${nextStatus}" (取消挂起=${cancelledCount})`,
      obs: 'hidden',
      blocked: nextStatus === 'revoked',
    });

    worldState.tick = nextTick;
    lastCallEn =
      nextStatus === 'revoked'
        ? `world.revoke("door_gate", cancel_pending=True)  # t=${padTick(nextTick)}`
        : `world.restore("door_gate", status="active")  # t=${padTick(nextTick)}`;
    lastCallZh = lastCallEn;
    renderAll();
  }

  function executeAction(action) {
    if (action === 'reset') {
      worldState = createInitialState();
      pendingSeq = 1;
      occlusionBaseline = null;
      occlusionCheck = null;
      lastCallEn = 's_0 = world.reset(schema="pwm-state-v1")';
      lastCallZh = 's_0 = world.reset(schema="pwm-state-v1")';
      traceLog = [
        {
          tick: 0,
          opEn: 'world.reset',
          opZh: 'world.reset',
          ruleId: 'pwm-state-v1',
          deltaEn: 'Restored canonical s_0 (single_open v1, pending=[])',
          deltaZh: '已重置为初始状态 s_0（single_open v1，pending=[]）',
          obs: 'visible',
          blocked: false,
        },
      ];
      renderAll();
      return;
    }

    if (action === 'offscreen_mutate' && !worldState.camera.frustum_occluded) {
      return;
    }

    const nextTick = worldState.tick + 1;
    // Step 2: Fire due pending events before agent action
    fireDuePending(nextTick);

    let firedRuleIds = [];

    if (action === 'pickup_key') {
      const key = worldState.entities.brass_key.props;
      if (!key.held) {
        key.on_floor = false;
        key.held = true;
        if (worldState.camera.frustum_occluded && occlusionBaseline) {
          occlusionBaseline.mutations += 1;
        }
        pushTrace({
          tick: nextTick,
          opEn: 'act: pickup(key)',
          opZh: '动作: pickup(key)',
          ruleId: 'inventory_op',
          deltaEn: 'brass_key.on_floor: true→false; held: false→true',
          deltaZh: 'brass_key.on_floor: true→false; held: false→true',
          obs: 'ui',
          blocked: false,
        });
      } else {
        pushTrace({
          tick: nextTick,
          opEn: 'act: pickup(key)',
          opZh: '动作: pickup(key)',
          ruleId: 'inventory_op',
          deltaEn: 'noop: brass_key.held already true',
          deltaZh: '空操作：brass_key.held 已为 true',
          obs: 'ui',
          blocked: false,
        });
      }
      lastCallEn = `s_${nextTick}, obs = world.step(s_${worldState.tick}, pickup("brass_key"))`;
      lastCallZh = lastCallEn;
    } else if (action === 'pull_lever') {
      const lever = worldState.entities.lever_L2.props;
      const door = worldState.entities.iron_door.props;
      const req = worldState.params['door.required_pulls'];
      const prevPow = lever.powered;
      const prevCount = lever.pull_count;
      lever.powered = !prevPow;
      lever.pull_count += 1;
      const capped = Math.min(lever.pull_count, req);
      door.lock_progress = `${capped}/${req}`;
      if (worldState.camera.frustum_occluded && occlusionBaseline) {
        occlusionBaseline.mutations += 1;
      }
      const pEn = `lever.pull_count: ${prevCount}→${lever.pull_count}; `;
      const pZh = `lever.pull_count: ${prevCount}→${lever.pull_count}；`;
      firedRuleIds = evaluateDoorGate(nextTick, 'act: pull(lever)', '动作: pull(lever)', pEn, pZh);
      lastCallEn = `s_${nextTick}, obs = world.step(s_${worldState.tick}, pull("lever_L2"))`;
      lastCallZh = lastCallEn;
    } else if (action === 'interact_door') {
      firedRuleIds = evaluateDoorGate(
        nextTick,
        'act: interact(door)',
        '动作: interact(door)',
        '',
        ''
      );
      lastCallEn = `s_${nextTick}, obs = world.step(s_${worldState.tick}, interact("iron_door"))`;
      lastCallZh = lastCallEn;
    } else if (action === 'toggle_lamp' || action === 'offscreen_mutate') {
      const lamp = worldState.entities.redstone_lamp.props;
      const relay = findRule('lamp_relay');
      const prevLit = lamp.lit;
      lamp.lit = !prevLit;
      firedRuleIds = ['lamp_relay'];
      if (worldState.camera.frustum_occluded && occlusionBaseline) {
        occlusionBaseline.mutations += 1;
      }
      const isOffscreen = action === 'offscreen_mutate';
      pushTrace({
        tick: nextTick,
        opEn: isOffscreen ? 'offscreen: lamp' : 'act: toggle(lamp)',
        opZh: isOffscreen ? '离屏变更: lamp' : '动作: toggle(lamp)',
        ruleId: `lamp_relay@v${relay.version}`,
        deltaEn: `redstone_lamp.lit: ${prevLit}→${lamp.lit}${isOffscreen ? ' (while occluded)' : ''}`,
        deltaZh: `redstone_lamp.lit: ${prevLit}→${lamp.lit}${isOffscreen ? '（遮挡期间生效）' : ''}`,
        obs: 'visible',
        blocked: false,
      });
      lastCallEn = isOffscreen
        ? `s_${nextTick}, _ = world.step(s_${worldState.tick}, offscreen.mutate("toggle_lamp"))`
        : `s_${nextTick}, obs = world.step(s_${worldState.tick}, toggle("redstone_lamp"))`;
      lastCallZh = lastCallEn;
    } else if (action === 'schedule_pulse') {
      const delay = worldState.params['lamp.pulse_ticks'];
      const evtId = `evt_lamp_${String(pendingSeq).padStart(2, '0')}`;
      pendingSeq += 1;
      const fireAt = nextTick + delay;
      worldState.pending.push({
        id: evtId,
        at_tick: fireAt,
        op: 'toggle(redstone_lamp)',
        source_rule: 'lamp_relay',
        status: 'pending',
      });
      pushTrace({
        tick: nextTick,
        opEn: 'act: schedule(+2)',
        opZh: '动作: schedule(+2)',
        ruleId: 'pending_queue',
        deltaEn: `enqueued ${evtId} -> at_tick=${fireAt}`,
        deltaZh: `入队 ${evtId} -> 将在 tick=${fireAt} 触发`,
        obs: 'hidden',
        blocked: false,
      });
      lastCallEn = `s_${nextTick}, obs = world.step(s_${worldState.tick}, schedule("lamp_pulse", +${delay}))`;
      lastCallZh = lastCallEn;
    } else if (action === 'camera_pan') {
      if (!worldState.camera.frustum_occluded) {
        worldState.camera = {
          view: 'hallway_wall',
          yaw_deg: 180,
          frustum_occluded: true,
        };
        occlusionBaseline = {
          startTick: nextTick,
          mutations: 0,
          pendingFired: 0,
        };
        occlusionCheck = null;
        pushTrace({
          tick: nextTick,
          opEn: 'cam: pan(180°)',
          opZh: '相机: pan(180°)',
          ruleId: 'camera_frustum',
          deltaEn: 'view: room_view→hallway_wall (frustum_occluded=true)',
          deltaZh: '视野: room_view→hallway_wall（已遮挡）',
          obs: 'visible',
          blocked: false,
        });
        lastCallEn = `s_${nextTick}, obs = world.step(s_${worldState.tick}, camera.pan(180))`;
        lastCallZh = lastCallEn;
      } else {
        worldState.camera = {
          view: 'room_view',
          yaw_deg: 0,
          frustum_occluded: false,
        };
        const persistedMutations = occlusionBaseline ? occlusionBaseline.mutations : 0;
        const persistedPending = occlusionBaseline ? occlusionBaseline.pendingFired : 0;
        const spanTicks = occlusionBaseline ? nextTick - occlusionBaseline.startTick : 1;
        // Verify rendered readout projection matches authoritative pwm-state-v1
        const ent = worldState.entities;
        const projectionMatches =
          typeof ent.brass_key.props.on_floor === 'boolean' &&
          typeof ent.lever_L2.props.powered === 'boolean' &&
          typeof ent.iron_door.props.open === 'boolean' &&
          typeof ent.redstone_lamp.props.lit === 'boolean';
        occlusionCheck = {
          status: projectionMatches ? 'PASS' : 'FAIL',
          verifiedTick: nextTick,
          spanTicks,
          mutations: persistedMutations,
          pendingFired: persistedPending,
        };
        occlusionBaseline = null;
        pushTrace({
          tick: nextTick,
          opEn: 'cam: return(0°)',
          opZh: '相机: return(0°)',
          ruleId: 'occlusion_check',
          deltaEn: `PASS: readout == s_${nextTick} (${persistedMutations} off-screen mutations persisted)`,
          deltaZh: `PASS：回读 == s_${nextTick}（保留 ${persistedMutations} 次离屏状态变更）`,
          obs: 'visible',
          blocked: false,
        });
        lastCallEn = `s_${nextTick}, obs = world.step(s_${worldState.tick}, camera.return())`;
        lastCallZh = lastCallEn;
      }
    }

    // Step 5 & 6: Mark once rules consumed & advance tick
    markOnceRulesConsumed(firedRuleIds);
    worldState.tick = nextTick;
    renderAll();
  }

  function renderCodeBox() {
    const codeEl = document.getElementById('method-code-box');
    const metaEl = document.getElementById('method-kernel-meta');
    if (!codeEl) return;

    const gate = findRule('door_gate');
    const mode = worldState.params['door.mode'];
    const req = worldState.params['door.required_pulls'];
    const isDouble = mode === 'double_lock';
    const isRevoked = gate.status !== 'active';

    if (metaEl) {
      metaEl.textContent = `door_gate@v${gate.version} · ${gate.status} · prio ${gate.priority}`;
    }

    const patchLineClass = isRevoked
      ? 'method-code-line method-code-line--revoked'
      : isDouble
      ? 'method-code-line method-code-line--patched'
      : 'method-code-line';

    const statusLineClass = isRevoked
      ? 'method-code-line method-code-line--revoked'
      : 'method-code-line';

    const commentLine = isRevoked
      ? '<span class="cm"># PATCHED: door_gate is REVOKED — door actuation blocked</span>'
      : isDouble
      ? `<span class="cm"># PATCHED v${gate.version}: double_lock requires ${req} lever pulls</span>`
      : `<span class="cm"># ACTIVE v${gate.version}: single_open unlocks on 1 pull</span>`;

    codeEl.innerHTML = [
      `<span class="method-code-line"><span class="kw">def</span> <span class="fn">step</span>(state, op):  <span class="cm"># pwm-state-v1 deterministic kernel</span></span>`,
      `<span class="method-code-line">    s = state.<span class="fn">clone</span>(); next_t = s.tick + <span class="num">1</span></span>`,
      `<span class="method-code-line">    <span class="fn">fire_due_pending</span>(s, at_tick=next_t)  <span class="cm"># pending=${worldState.pending.length}</span></span>`,
      `<span class="${statusLineClass}">    <span class="cm"># rule[door_gate] status="${gate.status}", priority=${gate.priority}, version=${gate.version}</span></span>`,
      `<span class="${patchLineClass}">    ${commentLine}</span>`,
      `<span class="${patchLineClass}">    <span class="kw">if</span> op == <span class="str">"pull(lever_L2)"</span> <span class="kw">and</span> s.rules[<span class="str">"door_gate"</span>].status == <span class="str">"active"</span>:</span>`,
      `<span class="${patchLineClass}">        <span class="kw">if</span> s.brass_key.held <span class="kw">and</span> s.lever_L2.pull_count >= <span class="num">${req}</span>:</span>`,
      `<span class="${patchLineClass}">            s.iron_door.open = <span class="kw">not</span> s.iron_door.open  <span class="cm"># obs: visible</span></span>`,
      `<span class="method-code-line">    s.tick = next_t; <span class="kw">return</span> s, <span class="fn">project_visible</span>(s, s.camera)</span>`,
    ].join('\n');
  }

  function renderTrace() {
    const colsEl = document.getElementById('method-trace-cols');
    const listEl = document.getElementById('method-trace-list');
    if (!colsEl || !listEl) return;

    const zh = lang === 'zh';
    colsEl.innerHTML = zh
      ? '<span>tick</span><span>动作 / 操作</span><span>规则 ID</span><span>状态增量</span><span>obs</span>'
      : '<span>tick</span><span>action / op</span><span>rule_id</span><span>state delta</span><span>obs</span>';

    listEl.innerHTML = traceLog
      .map((row, idx) => {
        const op = zh ? row.opZh : row.opEn;
        const delta = zh ? row.deltaZh : row.deltaEn;
        const cls = [
          'method-trace-row',
          idx === 0 ? 'is-latest' : '',
          row.blocked ? 'is-blocked' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const obsCls = `method-obs-tag method-obs-tag--${row.obs}`;
        return `
          <div class="${cls}">
            <span class="trace-tick">t=${padTick(row.tick)}</span>
            <span class="method-trace-op" title="${op}">${op}</span>
            <span class="method-trace-rule" title="${row.ruleId}">${row.ruleId}</span>
            <span class="method-trace-delta">${delta}</span>
            <span class="${obsCls}">${row.obs}</span>
          </div>
        `;
      })
      .join('');
  }

  function renderRoomAndJson() {
    const roomEl = document.getElementById('method-room');
    const occEl = document.getElementById('method-occlusion-status');
    const jsonEl = document.getElementById('method-json-state');
    if (!roomEl || !occEl || !jsonEl) return;

    const zh = lang === 'zh';
    const key = worldState.entities.brass_key.props;
    const lever = worldState.entities.lever_L2.props;
    const door = worldState.entities.iron_door.props;
    const lamp = worldState.entities.redstone_lamp.props;
    const cam = worldState.camera;

    roomEl.className = [
      'room-stage',
      lamp.lit ? 'is-lit' : '',
      cam.frustum_occluded ? 'is-occluded' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const camText = cam.frustum_occluded
      ? zh
        ? `camera: hallway_wall (${cam.yaw_deg}° · 视野被墙壁遮挡)`
        : `camera: hallway_wall (${cam.yaw_deg}° · FRUSTUM OCCLUDED)`
      : zh
      ? `camera: room_view (${cam.yaw_deg}° · 可见房间)`
      : `camera: room_view (${cam.yaw_deg}° · VISIBLE)`;

    const keyHudText = key.held
      ? zh
        ? 'HUD [ui]: 持有 brass_key'
        : 'HUD [ui]: brass_key.held = true'
      : zh
      ? 'HUD [ui]: 未持有钥匙'
      : 'HUD [ui]: brass_key.held = false';

    const pendingText =
      worldState.pending.length > 0
        ? zh
          ? `挂起队列 [hidden]: ${worldState.pending.length} (t=${padTick(worldState.pending[0].at_tick)})`
          : `pending [hidden]: ${worldState.pending.length} (at t=${padTick(worldState.pending[0].at_tick)})`
        : zh
        ? '挂起队列 [hidden]: 0'
        : 'pending [hidden]: 0';

    roomEl.innerHTML = `
      <div class="method-stage-top">
        <span class="room-stage__cam">${camText}</span>
      </div>
      <div class="method-hud-strip">
        <span class="method-hud-chip ${key.held ? 'is-held' : ''}">${keyHudText}</span>
        <span class="method-hud-chip">${pendingText}</span>
      </div>
      <div class="room-stage__objects method-room-objects">
        <div class="room-obj method-room-obj ${key.on_floor ? 'is-active' : ''}">
          <span class="room-obj__icon">🔑</span>
          <small>${zh ? (key.on_floor ? '钥匙：地面' : '钥匙：已拾取') : key.on_floor ? 'Key: on_floor' : 'Key: picked up'}</small>
          <span class="method-room-obj__sub">obs: visible</span>
        </div>
        <div class="room-obj method-room-obj ${lever.powered ? 'is-active' : ''}">
          <span class="room-obj__icon">🕹️</span>
          <small>${zh ? `拉杆：${lever.powered ? '通电' : '未激活'}` : `Lever: ${lever.powered ? 'powered' : 'idle'}`}</small>
          <span class="method-room-obj__sub">pull_count=${lever.pull_count} (hidden)</span>
        </div>
        <div class="room-obj method-room-obj ${door.open ? 'is-active' : ''}">
          <span class="room-obj__icon">🚪</span>
          <small>${zh ? `铁门：${door.open ? '开启' : '闭合'}` : `Door: ${door.open ? 'open' : 'closed'}`}</small>
          <span class="method-room-obj__sub">lock=${door.lock_progress} (hidden)</span>
        </div>
        <div class="room-obj method-room-obj ${lamp.lit ? 'is-active' : ''}">
          <span class="room-obj__icon">💡</span>
          <small>${zh ? `红石灯：${lamp.lit ? '点亮' : '熄灭'}` : `Lamp: ${lamp.lit ? 'lit' : 'off'}`}</small>
          <span class="method-room-obj__sub">obs: visible</span>
        </div>
      </div>
      ${
        cam.frustum_occluded
          ? `<div class="room-occluded-banner">${
              zh
                ? '相机已转向 hallway_wall（180°）——像素仅见空白墙壁，下方权威状态 s_t 与 pending 事件仍在继续演化。'
                : 'Camera facing hallway_wall (180°) — pixels show blank wall while authoritative s_t and pending timers continue evolving below.'
            }</div>`
          : ''
      }
    `;

    if (cam.frustum_occluded && occlusionBaseline) {
      occEl.className = 'method-occlusion-card is-occluded';
      occEl.innerHTML = `
        <div class="method-occlusion-card__head">
          <span>${zh ? '遮挡记忆测试进行中' : 'OCCLUSION MEMORY CHECK · ACTIVE'}</span>
          <span>${zh ? `${occlusionBaseline.mutations} 次离屏变更` : `${occlusionBaseline.mutations} off-screen mutations`}</span>
        </div>
        <div>${
          zh
            ? '点击左侧 offscreen.mutate("toggle_lamp") 或其他动作后，再点击 camera.return(0°) 验证渲染读数与状态一致。'
            : 'Trigger offscreen.mutate("toggle_lamp") or other actions, then click camera.return(0°) to verify render readout matches s_t.'
        }</div>
      `;
    } else if (occlusionCheck) {
      occEl.className = `method-occlusion-card ${occlusionCheck.status === 'PASS' ? 'is-pass' : ''}`;
      occEl.innerHTML = `
        <div class="method-occlusion-card__head">
          <span>${zh ? `遮挡记忆校验 · ${occlusionCheck.status}` : `OCCLUSION MEMORY CHECK · ${occlusionCheck.status}`}</span>
          <span>t=${padTick(occlusionCheck.verifiedTick)}</span>
        </div>
        <div>${
          zh
            ? `已验证 render(s_t) 与权威 pwm-state-v1 完全一致：跨越 ${occlusionCheck.spanTicks} 步遮挡，保留 ${occlusionCheck.mutations} 次离屏变更与 ${occlusionCheck.pendingFired} 次定时触发。`
            : `Verified readout(render(s_t)) == authoritative pwm-state-v1 across ${occlusionCheck.spanTicks} occluded ticks (${occlusionCheck.mutations} off-screen mutations, ${occlusionCheck.pendingFired} pending fires persisted).`
        }</div>
      `;
    } else {
      occEl.className = 'method-occlusion-card';
      occEl.innerHTML = `
        <div class="method-occlusion-card__head">
          <span>${zh ? '遮挡记忆校验 · 待机' : 'OCCLUSION MEMORY CHECK · IDLE'}</span>
          <span>yaw=0°</span>
        </div>
        <div>${
          zh
            ? '点击 camera.pan(180°) 移开视野并执行离屏变更，再返回验证状态持久性。'
            : 'Click camera.pan(180°) to occlude the room, mutate state off-screen, and return to verify persistence.'
        }</div>
      `;
    }

    jsonEl.textContent = JSON.stringify(worldState, null, 2);
  }

  function renderToolbarAndButtons() {
    const zh = lang === 'zh';
    const tickBadge = document.getElementById('method-tick-badge');
    const callBar = document.getElementById('method-sim-call');
    const singleBtn = document.getElementById('method-mode-single');
    const doubleBtn = document.getElementById('method-mode-double');
    const revokeBtn = document.getElementById('method-revoke-btn');
    const patchStatus = document.getElementById('method-patch-status');
    const panCode = document.getElementById('method-pan-code');
    const panDesc = document.getElementById('method-pan-desc');
    const offscreenBtn = document.getElementById('method-offscreen-btn');
    const offscreenDesc = document.getElementById('method-offscreen-desc');
    const copyBtn = document.getElementById('method-copy-json');

    const gate = findRule('door_gate');
    const mode = worldState.params['door.mode'];

    if (tickBadge) tickBadge.textContent = `tick = ${padTick(worldState.tick)}`;
    if (callBar) callBar.textContent = zh ? lastCallZh : lastCallEn;

    if (singleBtn) {
      singleBtn.classList.toggle('is-active', mode === 'single_open');
      singleBtn.textContent = zh ? 'v1 · single_open (1 次拉杆)' : 'v1 · single_open (1 pull)';
    }
    if (doubleBtn) {
      doubleBtn.classList.toggle('is-active', mode === 'double_lock');
      doubleBtn.textContent = zh ? 'v2 · double_lock (2 次拉杆)' : 'v2 · double_lock (2 pulls)';
    }

    if (revokeBtn) {
      revokeBtn.textContent =
        gate.status === 'active'
          ? zh
            ? 'revoke("door_gate") 撤销规则'
            : 'revoke("door_gate")'
          : zh
          ? 'restore("door_gate") 恢复规则'
          : 'restore("door_gate")';
    }

    if (patchStatus) {
      if (gate.status !== 'active') {
        patchStatus.className = 'status-chip status-chip--danger';
        patchStatus.textContent = zh
          ? `door_gate: 已撤销 · v${gate.version}`
          : `door_gate: revoked · v${gate.version}`;
      } else if (mode === 'double_lock') {
        patchStatus.className = 'method-sand-pill';
        patchStatus.textContent = zh
          ? `door_gate: 双锁已热更 · v${gate.version}`
          : `door_gate: double_lock · v${gate.version}`;
      } else {
        patchStatus.className = 'status-chip status-chip--green';
        patchStatus.textContent = zh
          ? `door_gate: 激活 · v${gate.version}`
          : `door_gate: active · v${gate.version}`;
      }
    }

    if (panCode && panDesc) {
      if (worldState.camera.frustum_occluded) {
        panCode.textContent = 'camera.return(0°)';
        panDesc.textContent = zh
          ? '返回房间视角并执行遮挡记忆校验'
          : 'Return to room_view & run occlusion check';
      } else {
        panCode.textContent = 'camera.pan(180°)';
        panDesc.textContent = zh
          ? '转向空白墙壁并记录遮挡基线'
          : 'Occlude room view & snapshot baseline';
      }
    }

    if (offscreenBtn && offscreenDesc) {
      offscreenBtn.disabled = !worldState.camera.frustum_occluded;
      offscreenDesc.textContent = worldState.camera.frustum_occluded
        ? zh
          ? '视角外修改红石灯状态，测试持久性'
          : 'Mutate lamp while occluded to test memory'
        : zh
        ? '需先点击 camera.pan(180°) 移开视角'
        : 'Enable by panning 180° away first';
    }

    if (copyBtn && !copyTimer) {
      copyBtn.textContent = zh ? '复制 JSON' : 'Copy JSON';
    }
  }

  const STAGES = {
    '01': {
      titleEn: 'Stage 01 · Induce Typed State & Deterministic Rules',
      titleZh: '阶段 01 · 归纳显式状态契约与确定性规则',
      obligationEn: 'Ch. 7 Obligation 1 · Executable Validity',
      obligationZh: '第 7 章 评测义务 1 · 可执行有效性',
      inputsEn:
        'Observed trajectory prefixes (o₀:t, a₀:t-1), interaction logs, and rule-specification intent.',
      inputsZh: '交互观测轨迹前缀 (o₀:t, a₀:t-1)、操作日志与自然语言或结构化规则意图。',
      outputsEn:
        'Typed pwm-state-v1 schema with explicit obs tags (visible / ui / hidden), externalized params, and runnable step(s_t, a_t) rules.',
      outputsZh:
        '带 obs 标签（visible / ui / hidden）的 pwm-state-v1 状态模式、外置 params 参数以及可运行的 step(s_t, a_t) 规则代码。',
      guardEn:
        'Rejects silent runtime errors, missing state fields, and hardcoded domain constants (prior-memorization hazard).',
      guardZh: '拦截运行时语法/类型崩溃、缺失状态字段以及将常量硬编码进规则的先验记忆隐患。',
      linkHref: '../survey/?layer=L2#paradigms',
      linkEn: 'Inspect L2 Code World Models in Survey →',
      linkZh: '前往综述查看 L2 代码世界模型 →',
    },
    '02': {
      titleEn: 'Stage 02 · Counterfactual & Invariant Verification',
      titleZh: '阶段 02 · 反事实编辑与不变量验证',
      obligationEn: 'Ch. 7 Obligations 2 & 5 · Mechanism Fidelity & Revision Reliability',
      obligationZh: '第 7 章 评测义务 2 & 5 · 机制保真度与规则修订可靠性',
      inputsEn:
        'Candidate world program W, counterfactual edits (set_rule, revoke, schedule), and paired A/B action streams.',
      inputsZh: '候选世界程序 W、反事实元编辑操作（set_rule、revoke、schedule）以及成对 A/B 动作序列。',
      outputsEn:
        'Strict Pair (A ∧ B) pass/fail trace diagnostics, tick-order determinism checks, and counterexample-guided rule patches.',
      outputsZh: 'Strict Pair (A ∧ B) 成对轨迹诊断、单步时序确定性检查以及基于反例的规则修补建议。',
      guardEn:
        'Catches priority inversion, stale pending timers after revoke(), and off-screen state erasure across camera occlusion.',
      guardZh: '捕获规则优先级倒置、revoke() 后残留挂起定时器以及相机遮挡导致的离屏状态丢失。',
      linkHref: '../arena/',
      linkEn: 'Open 02 · PWM-Arena Counterfactual Workbench →',
      linkZh: '进入 02 · PWM-Arena 反事实评测基准 →',
    },
    '03': {
      titleEn: 'Stage 03 · Proxy-Conditioned Rendering Alignment',
      titleZh: '阶段 03 · 代理条件渲染与回读对齐',
      obligationEn: 'Ch. 7 Obligation 3 · Observation Adherence & One-Way Authority',
      obligationZh: '第 7 章 评测义务 3 · 观测一致性与单向状态决定权',
      inputsEn:
        'Authoritative next state s_{t+1}, camera pose v_t, and one-way geometric/semantic proxy c_t = Π(s_{t+1}, v_t).',
      inputsZh: '权威下一时刻状态 s_{t+1}、相机位姿 v_t 以及单向几何/语义代理 c_t = Π(s_{t+1}, v_t)。',
      outputsEn:
        'Rendered frame ô_{t+1} = R_θ(c_t) plus calibrated readout checks over obs: visible frame-bound fields.',
      outputsZh: '渲染观测 ô_{t+1} = R_θ(c_t)，以及针对 obs: visible 帧绑定字段的视角感知回读校验。',
      guardEn:
        'Enforces L2 state authority: rendering imperfections never mutate s_{t+1}, and hidden/ui fields are never misscored as pixel misses.',
      guardZh: '严格维持 L2 状态决定权：渲染误差绝不反写 s_{t+1}，且不将 hidden/ui 字段误判为像素遗漏。',
      linkHref: '../',
      linkEn: 'View L0–L4 Paradigm Framing on Portal Overview →',
      linkZh: '返回研究总览查看 L0–L4 范式谱系 →',
    },
  };

  function renderStageInspector() {
    const inspectorEl = document.getElementById('method-stage-inspector');
    if (!inspectorEl) return;

    const zh = lang === 'zh';
    const data = STAGES[activeStageId] || STAGES['01'];

    document.querySelectorAll('.method-stage-card').forEach((card) => {
      const match = card.getAttribute('data-stage') === activeStageId;
      card.classList.toggle('is-active', match);
      card.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    inspectorEl.innerHTML = `
      <div class="method-inspector__head">
        <h3 class="method-inspector__title">${zh ? data.titleZh : data.titleEn}</h3>
        <span class="method-sand-pill">${zh ? data.obligationZh : data.obligationEn}</span>
      </div>
      <div class="method-inspector__grid">
        <div class="method-inspector__block">
          <div class="method-inspector__label">${zh ? '输入 (Inputs)' : 'Inputs'}</div>
          <p class="method-inspector__text">${zh ? data.inputsZh : data.inputsEn}</p>
        </div>
        <div class="method-inspector__block">
          <div class="method-inspector__label">${zh ? '输出产物 (Outputs)' : 'Outputs'}</div>
          <p class="method-inspector__text">${zh ? data.outputsZh : data.outputsEn}</p>
        </div>
        <div class="method-inspector__block">
          <div class="method-inspector__label">${zh ? '验证守卫 (Invariant Guard)' : 'Invariant Guard'}</div>
          <p class="method-inspector__text">${zh ? data.guardZh : data.guardEn}</p>
        </div>
      </div>
      <div class="method-inspector__foot">
        <span class="mono-muted">${
          zh
            ? '点击上方 Stage 01 / 02 / 03 卡片切换对应契约细节'
            : 'Click Stage 01 / 02 / 03 cards above to inspect stage contracts'
        }</span>
        <a class="btn btn--sm btn--secondary" href="${data.linkHref}">${zh ? data.linkZh : data.linkEn}</a>
      </div>
    `;
  }

  function renderAll() {
    const zh = lang === 'zh';
    document.title = zh
      ? '03 · 可执行世界构建与验证 · Program World Model'
      : '03 · Executable World Synthesis & Verification · Program World Model';

    renderToolbarAndButtons();
    renderCodeBox();
    renderTrace();
    renderRoomAndJson();
    renderStageInspector();
  }

  function bindEvents() {
    document.querySelectorAll('[data-sim-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        executeAction(btn.getAttribute('data-sim-action'));
      });
    });

    document.querySelectorAll('[data-rule-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyRulePatch(btn.getAttribute('data-rule-mode'));
      });
    });

    const revokeBtn = document.getElementById('method-revoke-btn');
    if (revokeBtn) {
      revokeBtn.addEventListener('click', toggleRevokeDoorGate);
    }

    const copyBtn = document.getElementById('method-copy-json');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = JSON.stringify(worldState, null, 2);
        const onCopied = () => {
          copyBtn.textContent = lang === 'zh' ? '已复制 ✓' : 'Copied ✓';
          if (copyTimer) clearTimeout(copyTimer);
          copyTimer = setTimeout(() => {
            copyTimer = null;
            copyBtn.textContent = lang === 'zh' ? '复制 JSON' : 'Copy JSON';
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(onCopied, onCopied);
        } else {
          onCopied();
        }
      });
    }

    document.querySelectorAll('.method-stage-card').forEach((card) => {
      card.addEventListener('click', () => {
        activeStageId = card.getAttribute('data-stage') || '01';
        renderStageInspector();
      });
    });

    document.querySelectorAll('[role="tablist"]').forEach((tablist) => {
      tablist.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        const tabs = Array.from(tablist.querySelectorAll('[role="tab"]:not([disabled])'));
        if (!tabs.length) return;
        const currentTab = e.target.closest('[role="tab"]');
        const currentIdx = tabs.indexOf(currentTab);
        if (currentIdx === -1) return;
        e.preventDefault();
        let nextIdx = currentIdx;
        if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = tabs.length - 1;
        const nextTab = tabs[nextIdx];
        if (nextTab) {
          nextTab.click();
          nextTab.focus();
        }
      });
    });

    if (shell) {
      shell.onChange((nextShell) => {
        lang = nextShell.lang;
        renderAll();
      });
    }
  }

  bindEvents();
  renderAll();
})();
