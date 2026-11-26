/* ==========================================================================
   02 · PWM-Arena — Deterministic pwm-state-v1 Engine, Counterfactual Workbench
   & P · D · R Track Explorer
   ========================================================================== */
(() => {
  'use strict';

  const SHELL = window.PWM_SHELL;

  const STATE = {
    lang: SHELL ? SHELL.lang : 'en',
    theme: SHELL ? SHELL.theme : 'light',
    archetypeId: 'rebind',
    stepIndex: 2,
    candidateId: 'oracle',
    trackFilter: 'all', // 'all' | 'pd' | 'r'
    activeTrackTab: 'pd', // 'pd' | 'r' | 'e'
  };

  function isZh() {
    return STATE.lang === 'zh';
  }

  function t(en, zh) {
    return isZh() ? zh : en;
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* ------------------------------------------------------------------------
     4 Counterfactual Rule-Edit Archetypes (Grounded in pwm-state-v1)
     ------------------------------------------------------------------------ */
  const ARCHETYPES = [
    {
      id: 'rebind',
      code: 'S12 · PD1.rebind',
      tags: ['P3', 'D1', 'R1 · A.toggle'],
      title_en: '01 · Rule Rebinding',
      title_zh: '01 · 规则重绑定',
      subtitle_en: 'Lever L2 → Lever L3 (invalidate old source)',
      subtitle_zh: '控制源 L2 → L3（旧绑定失效）',
      provenance_en: 'Exact S12 expected-state table & set_rule v2 schema (paired, 6 visible fields + hidden rule state).',
      provenance_zh: '严格对齐 S12 期望状态表与 set_rule v2 契约（配对任务，6 个可见字段 + 隐藏规则状态）。',
      summary_en:
        'Rebinds door_controller from L2 to L3 at t=2 via set_rule (v1 → v2), invalidating L2 while preserving distractor door_D. Both branches converge at after_L3 (t=10), making after_L2 (t=4) the sole discriminating checkpoint.',
      summary_zh:
        '在 t=2 通过 set_rule（v1 → v2）将 door_controller 从 L2 改绑为 L3，使旧源 L2 失效且干扰门 door_D 保持关闭。两分支在 after_L3（t=10）收敛为同开，因此 after_L2（t=4）是唯一判别检查点。',
      intent_en: 'P-intent: "Rebind door_A so lever L3 controls it instead of L2." (Replacement, NOT additive)',
      intent_zh: 'P-intent："以后改由拉杆 L3 控制门 door_A（替换 L2，而非同时控制）。"',
      diffB_en: `// Branch B (Control): rule stays v1\n{"id": "door_controller", "version": 1, "priority": 0,\n "when": {"event": "activate", "source": "L2"},\n "then": [{"op": "toggle", "target": "door_A.open"}]}`,
      diffB_zh: `// 分支 B（对照）：规则维持 v1\n{"id": "door_controller", "version": 1, "priority": 0,\n "when": {"event": "activate", "source": "L2"},\n "then": [{"op": "toggle", "target": "door_A.open"}]}`,
      diffA_en: `// Branch A (Edited at t=2): set_rule -> v2 (replaces source)\n{"t": 2, "kind": "meta", "op": "set_rule",\n "rule_id": "door_controller", "version": 2,\n "patch": {"when.source": "L3"}}`,
      diffA_zh: `// 分支 A（t=2 编辑）：set_rule 升级至 v2（替换控制源）\n{"t": 2, "kind": "meta", "op": "set_rule",\n "rule_id": "door_controller", "version": 2,\n "patch": {"when.source": "L3"}}`,
      trapLabel_en: 'Bug: Additive Rebind (Qwen-I pitfall)',
      trapLabel_zh: '缺陷陷阱：误追加未替换（Qwen-I 陷阱）',
      trapDesc_en:
        'Simulates the Qwen-I session bug where set_rule accidentally appends L3 as an extra rule without invalidating L2, causing door_A to wrongly open when L2 is pulled at t=4.',
      trapDesc_zh:
        '模拟 Qwen-I 会话中出现的缺陷：把重绑定实现为新增 L3 规则而未使 L2 失效，导致 t=4 拉动 L2 时 door_A 仍被错误打开。',
      initialState: {
        schema: 'pwm-state-v1',
        tick: 0,
        camera: { yaw: 0, inView: true },
        entities: {
          'L2.powered': { value: false, obs: 'visible', frame_bound: true, label_en: 'L2.powered', label_zh: 'L2.通电' },
          'L3.powered': { value: false, obs: 'visible', frame_bound: true, label_en: 'L3.powered', label_zh: 'L3.通电' },
          'door_A.open': { value: false, obs: 'visible', frame_bound: true, label_en: 'door_A.open', label_zh: '目标门 A' },
          'door_D.open': { value: false, obs: 'visible', frame_bound: true, label_en: 'door_D.open', label_zh: '干扰门 D' },
          'rule.source': { value: 'L2 (v1)', obs: 'hidden', frame_bound: false, label_en: 'door_ctrl.src', label_zh: '规则绑定源' },
        },
        rules: [
          {
            id: 'door_controller',
            version: 1,
            priority: 0,
            status: 'active',
            once: false,
            when: { event: 'activate', source: 'L2' },
            then: [{ op: 'toggle', target: 'door_A.open' }],
          },
        ],
        pending: [],
      },
      timeline: [
        {
          t: 0,
          cp: 'baseline',
          label_en: 't=0 · baseline',
          label_zh: 't=0 · 初始基线',
          opLabel_en: 'init s_0',
          opLabel_zh: '初始状态 s_0',
          scored: false,
          discriminating: false,
          metaA: [],
          metaB: [],
          actions: [],
        },
        {
          t: 2,
          cp: 'edit_rebind',
          label_en: 't=2 · set_rule v2',
          label_zh: 't=2 · set_rule v2',
          opLabel_en: 'A: L2→L3 | B: noop',
          opLabel_zh: 'A: 改绑 L3 | B: 无操作',
          scored: true,
          discriminating: false,
          metaA: [
            {
              op: 'set_rule',
              rule_id: 'door_controller',
              version: 2,
              patch: { 'when.source': 'L3' },
              entityPatch: { 'rule.source': 'L3 (v2)' },
            },
          ],
          metaB: [],
          actions: [],
        },
        {
          t: 4,
          cp: 'after_L2',
          label_en: 't=4 · after_L2',
          label_zh: 't=4 · 拉动 L2 后',
          opLabel_en: 'activate("L2")',
          opLabel_zh: '触发 activate("L2")',
          scored: true,
          discriminating: true,
          metaA: [],
          metaB: [],
          actions: [{ event: 'activate', source: 'L2', setEntity: { 'L2.powered': true } }],
        },
        {
          t: 10,
          cp: 'after_L3',
          label_en: 't=10 · after_L3',
          label_zh: 't=10 · 拉动 L3 后',
          opLabel_en: 'activate("L3")',
          opLabel_zh: '触发 activate("L3")',
          scored: true,
          discriminating: false,
          metaA: [],
          metaB: [],
          actions: [{ event: 'activate', source: 'L3', setEntity: { 'L3.powered': true } }],
        },
      ],
    },
    {
      id: 'override',
      code: 'S18/S19 · PD3.override',
      tags: ['P3', 'D1', 'R1 · A/B'],
      title_en: '02 · Priority Override & Revocation',
      title_zh: '02 · 优先级覆盖与规则撤销',
      subtitle_en: 'Priority 10 override → revoke restores prio 0',
      subtitle_zh: '优先级 10 覆盖 → 撤销恢复基线',
      provenance_en: 'Contract-verified pwm-state-v1 reference trace grounded in S18 (override/revoke) & S19 (priority conflict resolution).',
      provenance_zh: '基于 S18（覆盖与撤销）与 S19（优先级冲突裁决）构建的契约验证 pwm-state-v1 参考轨迹。',
      summary_en:
        'Installs a priority-10 override rule redirecting btn_1 from gate_A to alarm_lamp while suppressing gate_A, verifies priority conflict resolution (10 > 0) at t=2, then calls revoke("override_alarm", cancel_pending=true) at t=4 so base_gate cleanly resumes at t=6.',
      summary_zh:
        '在 t=1 安装优先级 10 的覆盖规则（将 btn_1 重定向至点亮 alarm_lamp 并抑制 gate_A），在 t=2 验证优先级冲突裁决（10 > 0），随后在 t=4 调用 revoke("override_alarm", cancel_pending=true) 恢复基线规则。',
      intent_en: 'P-session: Turn 1: "Temporarily override btn_1 to trigger alarm instead of gate." Turn 2: "Revoke the override and restore normal gate."',
      intent_zh: 'P-session：第 1 轮“临时覆盖 btn_1，改为触发警报灯而非开门”；第 2 轮“撤销该覆盖规则，恢复正常开门”。',
      diffB_en: `// Branch B (Control): base_gate (priority 0) only\n{"id": "base_gate", "version": 1, "priority": 0,\n "when": {"event": "activate", "source": "btn_1"},\n "then": [{"op": "set", "target": "gate_A.open", "value": true}]}`,
      diffB_zh: `// 分支 B（对照）：仅保留基线规则 base_gate (prio=0)\n{"id": "base_gate", "version": 1, "priority": 0,\n "when": {"event": "activate", "source": "btn_1"},\n "then": [{"op": "set", "target": "gate_A.open", "value": true}]}`,
      diffA_en: `// Branch A (Edited): install prio-10 override, then revoke\n{"t": 1, "op": "add_rule", "rule": {"id": "override_alarm", "priority": 10,\n  "when": {"event": "activate", "source": "btn_1"},\n  "then": [{"op": "set", "target": "alarm_lamp.lit", "value": true},\n           {"op": "set", "target": "gate_A.open", "value": false}]}}\n{"t": 4, "op": "revoke", "rule_id": "override_alarm", "cancel_pending": true}`,
      diffA_zh: `// 分支 A（编辑）：先加 prio=10 覆盖规则，再执行撤销\n{"t": 1, "op": "add_rule", "rule": {"id": "override_alarm", "priority": 10,\n  "when": {"event": "activate", "source": "btn_1"},\n  "then": [{"op": "set", "target": "alarm_lamp.lit", "value": true},\n           {"op": "set", "target": "gate_A.open", "value": false}]}}\n{"t": 4, "op": "revoke", "rule_id": "override_alarm", "cancel_pending": true}`,
      trapLabel_en: 'Bug: Missing Revoke Cleanup',
      trapLabel_zh: '缺陷陷阱：忘记撤销覆盖规则',
      trapDesc_en:
        'Simulates a stateful interpreter that applies priority-10 override at t=1 but drops revoke("override_alarm") at t=4, causing t=6 btn_1 press to keep firing alarm_lamp instead of restoring gate_A.',
      trapDesc_zh:
        '模拟状态解释器忽略 t=4 的 revoke("override_alarm") 操作：t=2 看似正确覆盖，但 t=6 再次按下 btn_1 时未能恢复基线开门行为。',
      initialState: {
        schema: 'pwm-state-v1',
        tick: 0,
        camera: { yaw: 0, inView: true },
        entities: {
          'gate_A.open': { value: false, obs: 'visible', frame_bound: true, label_en: 'gate_A.open', label_zh: '主门 gate_A' },
          'alarm_lamp.lit': { value: false, obs: 'visible', frame_bound: true, label_en: 'alarm_lamp.lit', label_zh: '警报灯' },
          'btn_1.pressed': { value: false, obs: 'visible', frame_bound: true, label_en: 'btn_1.pressed', label_zh: '按钮 btn_1' },
          'override.status': { value: 'absent', obs: 'hidden', frame_bound: false, label_en: 'override.status', label_zh: '覆盖规则状态' },
        },
        rules: [
          {
            id: 'base_gate',
            version: 1,
            priority: 0,
            status: 'active',
            once: false,
            when: { event: 'activate', source: 'btn_1' },
            then: [
              { op: 'set', target: 'gate_A.open', value: true },
              { op: 'set', target: 'alarm_lamp.lit', value: false },
            ],
          },
        ],
        pending: [],
      },
      timeline: [
        {
          t: 0,
          cp: 'baseline',
          label_en: 't=0 · baseline',
          label_zh: 't=0 · 初始基线',
          opLabel_en: 'init s_0',
          opLabel_zh: '初始状态 s_0',
          scored: false,
          discriminating: false,
          metaA: [],
          metaB: [],
          actions: [],
        },
        {
          t: 1,
          cp: 'install_override',
          label_en: 't=1 · add prio=10',
          label_zh: 't=1 · 安装 prio=10',
          opLabel_en: 'A: add_rule | B: noop',
          opLabel_zh: 'A: 新增覆盖 | B: 无',
          scored: true,
          discriminating: false,
          metaA: [
            {
              op: 'add_rule',
              rule: {
                id: 'override_alarm',
                version: 1,
                priority: 10,
                status: 'active',
                once: false,
                when: { event: 'activate', source: 'btn_1' },
                then: [
                  { op: 'set', target: 'alarm_lamp.lit', value: true },
                  { op: 'set', target: 'gate_A.open', value: false },
                ],
              },
              entityPatch: { 'override.status': 'active' },
            },
          ],
          metaB: [],
          actions: [],
        },
        {
          t: 2,
          cp: 'during_override',
          label_en: 't=2 · during_override',
          label_zh: 't=2 · 覆盖生效检验',
          opLabel_en: 'activate("btn_1")',
          opLabel_zh: '触发 activate("btn_1")',
          scored: true,
          discriminating: true,
          metaA: [],
          metaB: [],
          actions: [{ event: 'activate', source: 'btn_1', setEntity: { 'btn_1.pressed': true } }],
        },
        {
          t: 4,
          cp: 'revoke_override',
          label_en: 't=4 · revoke',
          label_zh: 't=4 · 撤销覆盖',
          opLabel_en: 'A: revoke | B: noop',
          opLabel_zh: 'A: revoke | B: 无',
          scored: true,
          discriminating: false,
          metaA: [
            {
              op: 'revoke',
              rule_id: 'override_alarm',
              cancel_pending: true,
              entityPatch: { 'override.status': 'revoked' },
            },
          ],
          metaB: [],
          actions: [],
        },
        {
          t: 5,
          cp: 'reset_probe',
          label_en: 't=5 · reset_probe',
          label_zh: 't=5 · 清零复位探针',
          opLabel_en: 'set_state(reset)',
          opLabel_zh: '复位实体状态',
          scored: true,
          discriminating: false,
          metaA: [{ op: 'set_state', values: { 'gate_A.open': false, 'alarm_lamp.lit': false, 'btn_1.pressed': false } }],
          metaB: [{ op: 'set_state', values: { 'gate_A.open': false, 'alarm_lamp.lit': false, 'btn_1.pressed': false } }],
          actions: [],
        },
        {
          t: 6,
          cp: 'after_revoke',
          label_en: 't=6 · after_revoke',
          label_zh: 't=6 · 撤销后重按',
          opLabel_en: 'activate("btn_1")',
          opLabel_zh: '再按 activate("btn_1")',
          scored: true,
          discriminating: false,
          metaA: [],
          metaB: [],
          actions: [{ event: 'activate', source: 'btn_1', setEntity: { 'btn_1.pressed': true } }],
        },
      ],
    },
    {
      id: 'temporal',
      code: 'S13/S16/S17 · PD4.temporal',
      tags: ['P3', 'D3', 'R1 · A/B/I'],
      title_en: '03 · Scheduled / One-Shot Events',
      title_zh: '03 · 定时、一次性与挂起取消',
      subtitle_en: 'once: true + [active_from, expires_at] + cancel(id)',
      subtitle_zh: '一次性消耗 + 时间窗 + 取消挂起事件',
      provenance_en: 'Contract-verified pwm-state-v1 trace unifying S13 (once consumed), S16 (time window), and S17 (cancel pending event).',
      provenance_zh: '统一 S13（once 一次性消费）、S16（时间窗）与 S17（取消挂起事件）的契约验证参考轨迹。',
      summary_en:
        'Exercises all three temporal primitives: entry_reward (once: true, window [2, 8]) fires once at t=3 and transitions to status="consumed"; schedule("beacon_pulse", at=7) queues a pending event that Branch A cancels at t=5 (cancel("beacon_pulse")), while Branch B lets it fire at t=7.',
      summary_zh:
        '完整演练三种时间原语：entry_reward（once: true，时间窗 [2, 8]）在 t=3 首次触发后置为 consumed；t=2 调度挂起事件 beacon_pulse@7 后，分支 A 在 t=5 调用 cancel("beacon_pulse") 取消，而分支 B 在 t=7 准时触发。',
      intent_en: 'P-intent: "Cancel the scheduled beacon_pulse before tick 7; keep the one-shot entry reward unchanged."',
      intent_zh: 'P-intent：“在第 7 刻之前取消已排队的 beacon_pulse 事件；保持一次性入区奖励规则不变。”',
      diffB_en: `// Branch B (Control): beacon_pulse@7 stays in pending[]\n{"t": 2, "op": "schedule", "id": "beacon_pulse", "at": 7,\n "do": [{"op": "set", "target": "beacon.active", "value": true}]}\n// t=5: noop -> fires at tick 7 Step 2`,
      diffB_zh: `// 分支 B（对照）：beacon_pulse@7 保留在 pending[] 中\n{"t": 2, "op": "schedule", "id": "beacon_pulse", "at": 7,\n "do": [{"op": "set", "target": "beacon.active", "value": true}]}\n// t=5 无取消操作 -> 第 7 刻第 2 步准时触发`,
      diffA_en: `// Branch A (Edited at t=5): cancel specific pending ID\n{"t": 2, "op": "schedule", "id": "beacon_pulse", "at": 7,\n "do": [{"op": "set", "target": "beacon.active", "value": true}]}\n{"t": 5, "kind": "meta", "op": "cancel", "id": "beacon_pulse"}`,
      diffA_zh: `// 分支 A（t=5 编辑）：按事件 ID 精准取消挂起事件\n{"t": 2, "op": "schedule", "id": "beacon_pulse", "at": 7,\n "do": [{"op": "set", "target": "beacon.active", "value": true}]}\n{"t": 5, "kind": "meta", "op": "cancel", "id": "beacon_pulse"}`,
      trapLabel_en: 'Bug: Ignored Pending Cancel',
      trapLabel_zh: '缺陷陷阱：未移除挂起队列事件',
      trapDesc_en:
        'Simulates models that have no pending[] queue representation (S17 hidden state) and ignore cancel("beacon_pulse") at t=5, causing beacon.active to fire on Branch A at t=7.',
      trapDesc_zh:
        '模拟缺乏 pending[] 挂起队列建模（S17 隐藏状态）的模型：忽略 t=5 的 cancel("beacon_pulse")，导致分支 A 在 t=7 仍误触发信标。',
      initialState: {
        schema: 'pwm-state-v1',
        tick: 0,
        camera: { yaw: 0, inView: true },
        entities: {
          'reward_block.lit': { value: false, obs: 'visible', frame_bound: true, label_en: 'reward_block.lit', label_zh: '奖励灯块' },
          'beacon.active': { value: false, obs: 'visible', frame_bound: true, label_en: 'beacon.active', label_zh: '信标激活' },
          'entry_reward.status': { value: 'active', obs: 'hidden', frame_bound: false, label_en: 'once_rule.status', label_zh: 'once 规则态' },
          'pending.queue': { value: '[]', obs: 'hidden', frame_bound: false, label_en: 'pending[]', label_zh: '挂起队列' },
        },
        rules: [
          {
            id: 'entry_reward',
            version: 1,
            priority: 0,
            status: 'active',
            once: true,
            active_from: 2,
            expires_at: 8,
            when: { event: 'enter_zone', source: 'pad_1' },
            then: [{ op: 'set', target: 'reward_block.lit', value: true }],
          },
        ],
        pending: [],
      },
      timeline: [
        {
          t: 0,
          cp: 'baseline',
          label_en: 't=0 · baseline',
          label_zh: 't=0 · 初始基线',
          opLabel_en: 'init s_0',
          opLabel_zh: '初始状态 s_0',
          scored: false,
          discriminating: false,
          metaA: [],
          metaB: [],
          actions: [],
        },
        {
          t: 2,
          cp: 'schedule_event',
          label_en: 't=2 · schedule@7',
          label_zh: 't=2 · 调度 @7',
          opLabel_en: 'schedule("beacon_pulse", 7)',
          opLabel_zh: '排队 beacon_pulse@7',
          scored: true,
          discriminating: false,
          metaA: [{ op: 'schedule', id: 'beacon_pulse', rule_id: 'sys', at: 7, do: [{ op: 'set', target: 'beacon.active', value: true }] }],
          metaB: [{ op: 'schedule', id: 'beacon_pulse', rule_id: 'sys', at: 7, do: [{ op: 'set', target: 'beacon.active', value: true }] }],
          actions: [],
        },
        {
          t: 3,
          cp: 'first_entry',
          label_en: 't=3 · first_entry',
          label_zh: 't=3 · 首次进入',
          opLabel_en: 'enter_zone("pad_1")',
          opLabel_zh: '进入 pad_1（消耗 once）',
          scored: true,
          discriminating: false,
          metaA: [],
          metaB: [],
          actions: [{ event: 'enter_zone', source: 'pad_1' }],
        },
        {
          t: 5,
          cp: 'cancel_edit',
          label_en: 't=5 · cancel_edit',
          label_zh: 't=5 · 取消挂起',
          opLabel_en: 'A: cancel | B: noop',
          opLabel_zh: 'A: 取消队列 | B: 保留',
          scored: true,
          discriminating: true,
          metaA: [{ op: 'cancel', id: 'beacon_pulse' }],
          metaB: [],
          actions: [],
        },
        {
          t: 7,
          cp: 'at_due_tick',
          label_en: 't=7 · due_tick',
          label_zh: 't=7 · 到期时刻',
          opLabel_en: 'advance(7) -> drain pending',
          opLabel_zh: '推进至 t=7 检查挂起触发',
          scored: true,
          discriminating: true,
          metaA: [],
          metaB: [],
          actions: [],
        },
        {
          t: 9,
          cp: 'post_expiry',
          label_en: 't=9 · post_expiry',
          label_zh: 't=9 · 过期重入',
          opLabel_en: 'enter_zone("pad_1")',
          opLabel_zh: '过期后重入 pad_1',
          scored: true,
          discriminating: false,
          metaA: [],
          metaB: [],
          actions: [{ event: 'enter_zone', source: 'pad_1' }],
        },
      ],
    },
    {
      id: 'persistence',
      code: 'S24/R3 · R3.revisit',
      tags: ['R3', 'R2', 'E-memory · G'],
      title_en: '04 · Out-of-View Persistence',
      title_zh: '04 · 视野外状态持久性与回看',
      subtitle_en: '180° pan away → hidden persistence → revisit',
      subtitle_zh: '180° 转开 → 视野外保持 → 转回重访',
      provenance_en: 'Extends S24 continuous-turn reveal with the 180° pan-away & revisit (转开再回看) R3 / scene-pose-v1 protocol.',
      provenance_zh: '基于 S24 连续转角揭示任务扩展的 180° 转开再回看（R3 / scene-pose-v1 位姿投影）协议。',
      summary_en:
        'Tests whether a world model preserves off-screen state across camera motion (t=4 pan yaw=180° occludes target_crate while Branch A updates it to emerald_block; t=8 pan yaw=0° revisits). During occlusion (t=4), target_crate is scored in P+D (hidden) and excluded from R rather than marked "unreadable".',
      summary_zh:
        '检验模型在相机转开 180° 期间的记忆持久性（t=4 镜头转向 hallway_back 遮挡目标箱体，分支 A 在后台将其设为 emerald_block；t=8 转回 yaw=0° 重访）。遮挡期 t=4 的箱体材质仅在 P+D 计分，R 轨合法排除并改测相机朝向与“无法判断”校准。',
      intent_en: 'R3 / E-memory: Pan 180° away, keep or update occluded entity state in s_t, pan back to yaw=0°, and verify via scene-pose-v1 3D projection.',
      intent_zh: 'R3 / E-memory：转开 180° 离开视野，在 s_t 中持久化/更新被遮挡实体，转回 yaw=0° 后用 scene-pose-v1 三维位姿投影回读。',
      diffB_en: `// Branch B (Control): target_crate stays "oak_planks"\n// t=4: pan(yaw=180°) -> crate occluded (in_view=false)\n// t=8: pan(yaw=0°)   -> revisit confirms "oak_planks"`,
      diffB_zh: `// 分支 B（对照）：target_crate 全程维持 "oak_planks"\n// t=4：pan(yaw=180°) -> 箱体离开视野 (in_view=false)\n// t=8：pan(yaw=0°)   -> 回看确认仍为 "oak_planks"`,
      diffA_en: `// Branch A (Edited while out of view at t=4)\n{"t": 4, "kind": "meta", "op": "set_state",\n "target": "target_crate.material", "value": "emerald_block"}\n// t=8: pan(yaw=0°) -> pose-projected readout verifies emerald_block`,
      diffA_zh: `// 分支 A（t=4 视野外后台修改状态）\n{"t": 4, "kind": "meta", "op": "set_state",\n "target": "target_crate.material", "value": "emerald_block"}\n// t=8：pan(yaw=0°) -> 位姿投影回读验证绿宝石块持久保留`,
      trapLabel_en: 'Bug: Pixel Camera Amnesia',
      trapLabel_zh: '缺陷陷阱：纯像素相机遗忘（Amnesia）',
      trapDesc_en:
        'Simulates LoopNav / pixel-only video models that forget off-screen edits during the 180° pan and revert target_crate back to the t=0 oak_planks anchor upon revisit at t=8.',
      trapDesc_zh:
        '模拟 LoopNav 类纯像素视频模型的视野外遗忘：180° 转开后丢失后台状态更新，在 t=8 转回时受 t=0 初始帧锚点牵引而退回 oak_planks。',
      initialState: {
        schema: 'pwm-state-v1',
        tick: 0,
        camera: { yaw: 0, inView: true },
        entities: {
          'camera.yaw': { value: '0°', obs: 'visible', frame_bound: true, label_en: 'camera.yaw', label_zh: '相机偏航角' },
          'crate.in_view': { value: true, obs: 'ui', frame_bound: true, label_en: 'crate.in_view', label_zh: '视野可见标志' },
          'target_crate.material': {
            value: 'oak_planks',
            obs: 'visible',
            frame_bound: true,
            occludable: true,
            label_en: 'target_crate',
            label_zh: '目标箱体材质',
          },
        },
        rules: [],
        pending: [],
      },
      timeline: [
        {
          t: 0,
          cp: 'initial_view',
          label_en: 't=0 · yaw=0°',
          label_zh: 't=0 · 正向初视',
          opLabel_en: 'view room_front',
          opLabel_zh: '观察前室箱体',
          scored: false,
          discriminating: false,
          metaA: [],
          metaB: [],
          actions: [],
        },
        {
          t: 4,
          cp: 'occluded_pan',
          label_en: 't=4 · pan 180°',
          label_zh: 't=4 · 转开 180°',
          opLabel_en: 'pan(180°) + A: offscreen edit',
          opLabel_zh: '转开 180° + A: 后台改材质',
          scored: true,
          discriminating: true,
          metaA: [{ op: 'set_state', values: { 'target_crate.material': 'emerald_block' } }],
          metaB: [],
          actions: [{ event: 'pan', yaw: 180, inView: false, setEntity: { 'camera.yaw': '180°', 'crate.in_view': false } }],
        },
        {
          t: 8,
          cp: 'after_revisit',
          label_en: 't=8 · revisit 0°',
          label_zh: 't=8 · 转回重访',
          opLabel_en: 'pan(0°) -> pose readout',
          opLabel_zh: '转回 0° 位姿投影回读',
          scored: true,
          discriminating: true,
          metaA: [],
          metaB: [],
          actions: [{ event: 'pan', yaw: 0, inView: true, setEntity: { 'camera.yaw': '0°', 'crate.in_view': true } }],
        },
      ],
    },
  ];

  /* ------------------------------------------------------------------------
     Candidate Modes
     ------------------------------------------------------------------------ */
  const CANDIDATES = [
    {
      id: 'oracle',
      label_en: 'Oracle (pwm-state-v1)',
      label_zh: 'Oracle (pwm-state-v1 参考引擎)',
      desc_en: 'Genuine deterministic 6-step pwm-state-v1 interpreter obeying every rule edit, priority conflict, pending queue, and off-screen state.',
      desc_zh: '严格执行 6 步时间步序、优先级裁决、挂起队列与视野外状态持久化的参考解释器。',
    },
    {
      id: 'b_init',
      label_en: 'B-init (Initial State)',
      label_zh: 'B-init（恒猜初态）',
      desc_en: 'Trivial baseline returning initial state s_0 at all ticks. Exploits the 77.2% unchanged fields in single-checkpoint accuracy, yet collapses to 0.0 on Strict Pair (A ∧ B).',
      desc_zh: '始终返回初始状态 s_0 的平庸基线。在单点准确率中可蹭取 77.2% 不变字段，但在 Strict Pair (A ∧ B) 下直接归零。',
    },
    {
      id: 'b_frozen',
      label_en: 'B-frozen (Static Frame)',
      label_zh: 'B-frozen（静态首帧）',
      desc_en: 'Replays the static t=0 visual frame across all ticks. Under symmetric R-track readout, fails camera pan & edited transitions equally (0.0 Strict Pair).',
      desc_zh: '全程复读 t=0 静态首帧。在对称 R 轨读出规则下与其它模型同审相机位姿与状态变化，Strict Pair 归零。',
    },
    {
      id: 'b_ignore',
      label_en: 'B-ignore (Ignores Edit)',
      label_zh: 'B-ignore（忽略规则编辑）',
      desc_en: 'Executes Branch B (Control) dynamics for both branches, failing Branch A on every discriminating checkpoint and yielding TwinContrast = 0.',
      desc_zh: '对分支 A 与 B 均按默认规则（分支 B）推演，彻底忽略运行时规则编辑，TwinContrast = 0。',
    },
    {
      id: 'b_replay',
      label_en: 'B-replay (Swapped A/B)',
      label_zh: 'B-replay（A/B 对调）',
      desc_en: 'Swaps Branch A and Branch B outputs. Achieves TwinContrast = 1 (A ≠ B) yet fails both branches on discriminating checkpoints (Strict Pair = 0).',
      desc_zh: '将分支 A 与 B 的结果对调。虽能骗过 TwinContrast = 1，但双分支均答错，证明 Strict Pair (A ∧ B) 不可或缺。',
    },
    {
      id: 'domain_trap',
      label_en: 'Domain Bug Trap',
      label_zh: '典型领域缺陷陷阱',
      desc_en: '', // dynamically filled from active archetype
      desc_zh: '',
    },
  ];

  /* ------------------------------------------------------------------------
     Deterministic 6-Step pwm-state-v1 Interpreter
     ------------------------------------------------------------------------ */
  function syncPendingSummary(state) {
    if (state.entities['pending.queue']) {
      state.entities['pending.queue'].value =
        state.pending.length === 0 ? '[]' : '[' + state.pending.map((p) => `${p.id}@${p.at}`).join(', ') + ']';
    }
  }

  function applyEffect(state, eff) {
    if (!eff || !eff.target || !state.entities[eff.target]) return;
    if (eff.op === 'toggle') {
      state.entities[eff.target].value = !state.entities[eff.target].value;
    } else if (eff.op === 'set') {
      state.entities[eff.target].value = eff.value;
    }
  }

  function simulateBranch(arch, branchKey, quirk = 'none') {
    const state = clone(arch.initialState);
    const snapshots = [];

    arch.timeline.forEach((step, idx) => {
      const logParts = [];
      if (idx === 0) {
        syncPendingSummary(state);
        snapshots.push({
          t: step.t,
          cp: step.cp,
          camera: clone(state.camera),
          entities: clone(state.entities),
          rules: clone(state.rules),
          pending: clone(state.pending),
          log_en: `t=0 initialized (${Object.keys(state.entities).length} tracked fields)`,
          log_zh: `t=0 初始化完成（共 ${Object.keys(state.entities).length} 个追踪字段）`,
        });
        return;
      }

      // Step 1: Apply meta-edits
      const ops = branchKey === 'A' ? (quirk === 'ignore_meta' ? step.metaB : step.metaA) : step.metaB;
      ops.forEach((op) => {
        if (op.op === 'set_rule') {
          if (quirk === 'additive_rebind' && branchKey === 'A') {
            // Buggy additive rebind: keeps old L2 rule active and appends L3 rule!
            const orig = state.rules.find((r) => r.id === op.rule_id);
            if (orig) {
              const dup = clone(orig);
              dup.id = `${op.rule_id}_extra`;
              dup.version = op.version;
              dup.when.source = op.patch['when.source'];
              state.rules.push(dup);
              if (state.entities['rule.source']) {
                state.entities['rule.source'].value = 'L2 + L3 (additive bug)';
              }
              logParts.push({
                en: `Step 1 [BUG]: appended ${dup.when.source} without invalidating L2`,
                zh: `步 1 [缺陷]：追加了 ${dup.when.source} 但未使 L2 失效`,
              });
            }
          } else {
            const rule = state.rules.find((r) => r.id === op.rule_id);
            if (rule) {
              if (op.patch && op.patch['when.source']) {
                rule.when.source = op.patch['when.source'];
              }
              rule.version = op.version;
              if (op.entityPatch) {
                Object.keys(op.entityPatch).forEach((k) => {
                  if (state.entities[k]) state.entities[k].value = op.entityPatch[k];
                });
              }
              logParts.push({
                en: `Step 1: set_rule(${op.rule_id}, v=${op.version}) -> source="${rule.when.source}"`,
                zh: `步 1：set_rule(${op.rule_id}, v=${op.version}) -> 控制源="${rule.when.source}"`,
              });
            }
          }
        } else if (op.op === 'add_rule') {
          state.rules.push(clone(op.rule));
          if (op.entityPatch) {
            Object.keys(op.entityPatch).forEach((k) => {
              if (state.entities[k]) state.entities[k].value = op.entityPatch[k];
            });
          }
          logParts.push({
            en: `Step 1: add_rule(${op.rule.id}, prio=${op.rule.priority})`,
            zh: `步 1：add_rule(${op.rule.id}, 优先级=${op.rule.priority})`,
          });
        } else if (op.op === 'revoke') {
          if (quirk === 'skip_revoke' && branchKey === 'A') {
            logParts.push({
              en: `Step 1 [BUG]: ignored revoke(${op.rule_id}) — override stayed active`,
              zh: `步 1 [缺陷]：忽略 revoke(${op.rule_id})，覆盖规则残留生效`,
            });
          } else {
            const rule = state.rules.find((r) => r.id === op.rule_id);
            if (rule) rule.status = 'revoked';
            if (op.cancel_pending) {
              state.pending = state.pending.filter((p) => p.rule_id !== op.rule_id);
            }
            if (op.entityPatch) {
              Object.keys(op.entityPatch).forEach((k) => {
                if (state.entities[k]) state.entities[k].value = op.entityPatch[k];
              });
            }
            logParts.push({
              en: `Step 1: revoke(${op.rule_id}, cancel_pending=${op.cancel_pending})`,
              zh: `步 1：revoke(${op.rule_id}, cancel_pending=${op.cancel_pending})`,
            });
          }
        } else if (op.op === 'set_state') {
          Object.keys(op.values).forEach((k) => {
            if (state.entities[k]) state.entities[k].value = op.values[k];
          });
          logParts.push({
            en: `Step 1: set_state(${Object.entries(op.values)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')})`,
            zh: `步 1：set_state(${Object.entries(op.values)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')})`,
          });
        } else if (op.op === 'schedule') {
          state.pending.push({ id: op.id, rule_id: op.rule_id || 'sys', at: op.at, do: clone(op.do) });
          logParts.push({
            en: `Step 1: schedule(${op.id}, at=${op.at})`,
            zh: `步 1：schedule(${op.id}, 预定刻=${op.at})`,
          });
        } else if (op.op === 'cancel') {
          if (quirk === 'skip_cancel' && branchKey === 'A') {
            logParts.push({
              en: `Step 1 [BUG]: ignored cancel("${op.id}") — queue unchanged`,
              zh: `步 1 [缺陷]：忽略 cancel("${op.id}")，挂起队列未清除`,
            });
          } else {
            state.pending = state.pending.filter((p) => p.id !== op.id);
            logParts.push({
              en: `Step 1: cancel("${op.id}") -> removed from pending[]`,
              zh: `步 1：cancel("${op.id}") -> 已从 pending[] 移除`,
            });
          }
        }
      });

      // Step 2: Fire due pending events in ascending id order
      const due = state.pending.filter((p) => p.at === step.t).sort((a, b) => a.id.localeCompare(b.id));
      if (due.length > 0) {
        due.forEach((ev) => {
          ev.do.forEach((eff) => applyEffect(state, eff));
          logParts.push({
            en: `Step 2: fired due pending "${ev.id}"`,
            zh: `步 2：触发到期挂起事件 "${ev.id}"`,
          });
        });
        state.pending = state.pending.filter((p) => p.at !== step.t);
      }

      // Step 3: Apply agent actions
      const firedEvents = [];
      step.actions.forEach((act) => {
        if (act.setEntity) {
          Object.keys(act.setEntity).forEach((k) => {
            if (state.entities[k]) state.entities[k].value = act.setEntity[k];
          });
        }
        if (act.event === 'pan') {
          state.camera.yaw = act.yaw;
          state.camera.inView = act.inView;
          if (quirk === 'camera_amnesia' && branchKey === 'A' && act.inView && state.entities['target_crate.material']) {
            // Amnesia bug: loses off-screen edit and falls back to initial t=0 oak_planks!
            state.entities['target_crate.material'].value = arch.initialState.entities['target_crate.material'].value;
            logParts.push({
              en: `Step 3 [BUG]: pan(${act.yaw}°) revisit suffered pixel amnesia -> reverted to oak_planks`,
              zh: `步 3 [缺陷]：pan(${act.yaw}°) 回看发生像素遗忘 -> 退回初始 oak_planks`,
            });
          } else {
            logParts.push({
              en: `Step 3: pan(yaw=${act.yaw}°, in_view=${act.inView})`,
              zh: `步 3：相机转向 pan(yaw=${act.yaw}°, 视野内=${act.inView})`,
            });
          }
        } else {
          firedEvents.push({ event: act.event, source: act.source });
          logParts.push({
            en: `Step 3: action ${act.event}("${act.source}")`,
            zh: `步 3：执行动作 ${act.event}("${act.source}")`,
          });
        }
      });

      // Step 4: Evaluate triggered active rules in descending priority -> higher version -> insertion order
      const firedRules = [];
      firedEvents.forEach((fe) => {
        const candidates = state.rules
          .map((r, order) => ({ r, order }))
          .filter(({ r }) => {
            if (r.status !== 'active') return false;
            if (r.active_from !== undefined && step.t < r.active_from) return false;
            if (r.expires_at !== undefined && step.t > r.expires_at) return false;
            return r.when.event === fe.event && r.when.source === fe.source;
          })
          .sort((a, b) => {
            if (b.r.priority !== a.r.priority) return b.r.priority - a.r.priority;
            if (b.r.version !== a.r.version) return b.r.version - a.r.version;
            return a.order - b.order;
          });

        if (candidates.length > 0) {
          // Priority & version conflict resolution: highest (priority, version) tier wins; tie-break by insertion order
          const topPrio = candidates[0].r.priority;
          const topVersion = candidates[0].r.version;
          candidates.forEach(({ r }) => {
            if (r.priority === topPrio && r.version === topVersion) {
              r.then.forEach((eff) => applyEffect(state, eff));
              firedRules.push(r);
              logParts.push({
                en: `Step 4: rule "${r.id}" (prio=${r.priority}, v=${r.version}) fired`,
                zh: `步 4：规则 "${r.id}"（优先级=${r.priority}, v=${r.version}）生效`,
              });
            } else if (r.priority === topPrio) {
              logParts.push({
                en: `Step 4: rule "${r.id}" (prio=${r.priority}, v=${r.version}) overridden by higher version v=${topVersion}`,
                zh: `步 4：规则 "${r.id}"（优先级=${r.priority}, v=${r.version}）被更高版本 v=${topVersion} 覆盖`,
              });
            } else {
              logParts.push({
                en: `Step 4: rule "${r.id}" (prio=${r.priority}) suppressed by prio=${topPrio}`,
                zh: `步 4：规则 "${r.id}"（优先级=${r.priority}）被更高优先级 ${topPrio} 抑制`,
              });
            }
          });
        } else {
          logParts.push({
            en: `Step 4: no active rule matched ${fe.event}("${fe.source}")`,
            zh: `步 4：无匹配活跃规则响应 ${fe.event}("${fe.source}")`,
          });
        }
      });

      // Step 5: Consume once: true rules
      firedRules.forEach((r) => {
        if (r.once) {
          r.status = 'consumed';
          if (state.entities['entry_reward.status']) {
            state.entities['entry_reward.status'].value = 'consumed';
          }
          logParts.push({
            en: `Step 5: once rule "${r.id}" -> status="consumed"`,
            zh: `步 5：一次性规则 "${r.id}" 状态置为 consumed`,
          });
        }
      });

      // Step 6: Advance tick & snapshot
      state.tick = step.t;
      syncPendingSummary(state);

      snapshots.push({
        t: step.t,
        cp: step.cp,
        camera: clone(state.camera),
        entities: clone(state.entities),
        rules: clone(state.rules),
        pending: clone(state.pending),
        log_en: logParts.length ? logParts.map((l) => l.en).join(' | ') : `t=${step.t} no state change`,
        log_zh: logParts.length ? logParts.map((l) => l.zh).join(' | ') : `t=${step.t} 无状态变化`,
      });
    });

    return snapshots;
  }

  function simulateCandidate(arch, candidateId, oracleA, oracleB) {
    if (candidateId === 'oracle') {
      return { candA: clone(oracleA), candB: clone(oracleB) };
    }
    if (candidateId === 'b_init') {
      const s0 = oracleB[0];
      const makeInit = (snap, idx) => {
        const out = clone(s0);
        out.t = snap.t;
        out.cp = snap.cp;
        if (idx > 0) {
          out.log_en = `t=${snap.t} [B-init]: returned constant initial state s_0 (ignored edits & actions)`;
          out.log_zh = `t=${snap.t} [B-init]：恒返回初始状态 s_0（忽略规则编辑与动作）`;
        }
        return out;
      };
      return {
        candA: oracleA.map(makeInit),
        candB: oracleB.map(makeInit),
      };
    }
    if (candidateId === 'b_frozen') {
      const s0 = oracleB[0];
      const makeFrozen = (snap, idx) => {
        const out = clone(s0);
        out.t = snap.t;
        out.cp = snap.cp;
        // Static first frame never turns camera on pan steps
        out.camera = clone(s0.camera);
        if (idx > 0) {
          out.log_en = `t=${snap.t} [B-frozen]: replayed static t=0 frame (camera & state frozen at s_0)`;
          out.log_zh = `t=${snap.t} [B-frozen]：复读 t=0 静态首帧（相机与状态冻结于 s_0）`;
        }
        return out;
      };
      return {
        candA: oracleA.map(makeFrozen),
        candB: oracleB.map(makeFrozen),
      };
    }
    if (candidateId === 'b_ignore') {
      const candA = simulateBranch(arch, 'B', 'none').map((snap, idx) => {
        const step = arch.timeline[idx];
        if (idx > 0 && step && step.metaA && step.metaA.length > 0) {
          const ignoredOps = step.metaA.map((m) => m.op).join(', ');
          const prefixEn = `Step 1 [B-ignore]: ignored Branch A meta-edit (${ignoredOps}) — kept Control B`;
          const prefixZh = `步 1 [B-ignore]：忽略分支 A 元编辑（${ignoredOps}），维持对照分支 B`;
          snap.log_en = snap.log_en === `t=${step.t} no state change` ? prefixEn : `${prefixEn} | ${snap.log_en}`;
          snap.log_zh = snap.log_zh === `t=${step.t} 无状态变化` ? prefixZh : `${prefixZh} | ${snap.log_zh}`;
        }
        return snap;
      });
      return {
        candA,
        candB: simulateBranch(arch, 'B', 'none'),
      };
    }
    if (candidateId === 'b_replay') {
      const candA = clone(oracleB).map((snap, idx) => {
        if (idx > 0) {
          snap.log_en = `[B-replay: swapped Branch B] ${snap.log_en}`;
          snap.log_zh = `[B-replay：错用分支 B] ${snap.log_zh}`;
        }
        return snap;
      });
      const candB = clone(oracleA).map((snap, idx) => {
        if (idx > 0) {
          snap.log_en = `[B-replay: swapped Branch A] ${snap.log_en}`;
          snap.log_zh = `[B-replay：错用分支 A] ${snap.log_zh}`;
        }
        return snap;
      });
      return { candA, candB };
    }
    // domain_trap
    const quirkMap = {
      rebind: 'additive_rebind',
      override: 'skip_revoke',
      temporal: 'skip_cancel',
      persistence: 'camera_amnesia',
    };
    const quirk = quirkMap[arch.id] || 'none';
    return {
      candA: simulateBranch(arch, 'A', quirk),
      candB: simulateBranch(arch, 'B', 'none'),
    };
  }

  /* ------------------------------------------------------------------------
     Denominator Routing & Strict Pair (A ∧ B) Evaluator
     ------------------------------------------------------------------------ */
  function isFieldInTrack(entityDef, cameraState, trackFilter) {
    if (trackFilter === 'all' || trackFilter === 'pd') return true;
    // R track: only visible AND frame_bound AND not occluded at current tick
    if (entityDef.obs !== 'visible' || !entityDef.frame_bound) return false;
    if (entityDef.occludable && cameraState && cameraState.inView === false) return false;
    return true;
  }

  function evaluateCounterfactual(arch, oracleA, oracleB, candA, candB, trackFilter) {
    let changedTotal = 0;
    let changedMatched = 0;
    let unchangedTotal = 0;
    let unchangedMatched = 0;
    let anyDiscriminatingPair = false;
    let twinContrastPass = false;

    const s0 = oracleB[0];
    const perStep = arch.timeline.map((step, i) => {
      const oA = oracleA[i];
      const oB = oracleB[i];
      const cA = candA[i];
      const cB = candB[i];

      const fieldKeys = Object.keys(oA.entities);
      const activeKeys = fieldKeys.filter((k) => isFieldInTrack(oA.entities[k], oA.camera, trackFilter));

      const mismatchA = [];
      const mismatchB = [];
      let discContrastAtStep = false;

      if (step.scored) {
        if (step.discriminating) anyDiscriminatingPair = true;

        activeKeys.forEach((k) => {
          const valOA = oA.entities[k].value;
          const valOB = oB.entities[k].value;
          const valCA = cA.entities[k].value;
          const valCB = cB.entities[k].value;
          const val0 = s0.entities[k].value;

          if (step.discriminating && valCA !== valCB) {
            discContrastAtStep = true;
          }

          // Branch A field classification (changed vs s_0; B-init scores 0% by construction)
          const changedA = valOA !== val0;
          const matchA = valCA === valOA;
          if (!matchA) mismatchA.push(k);
          if (changedA) {
            changedTotal += 1;
            if (matchA) changedMatched += 1;
          } else {
            unchangedTotal += 1;
            if (matchA) unchangedMatched += 1;
          }

          // Branch B field classification (changed vs s_0; B-init scores 0% by construction)
          const changedB = valOB !== val0;
          const matchB = valCB === valOB;
          if (!matchB) mismatchB.push(k);
          if (changedB) {
            changedTotal += 1;
            if (matchB) changedMatched += 1;
          } else {
            unchangedTotal += 1;
            if (matchB) unchangedMatched += 1;
          }
        });

        if (step.discriminating && discContrastAtStep) {
          twinContrastPass = true;
        }
      }

      return {
        t: step.t,
        cp: step.cp,
        scored: step.scored,
        discriminating: step.discriminating,
        activeCount: activeKeys.length,
        activeKeys,
        mismatchA,
        mismatchB,
        passed: !step.scored || (activeKeys.length > 0 && mismatchA.length === 0 && mismatchB.length === 0),
        excludedInR: step.scored && activeKeys.length === 0,
      };
    });

    const editRecall = changedTotal > 0 ? changedMatched / changedTotal : 1;
    const preservation = unchangedTotal > 0 ? unchangedMatched / unchangedTotal : 1;
    const twinContrast = anyDiscriminatingPair ? (twinContrastPass ? 1 : 0) : 1;
    const allMatched = changedMatched === changedTotal && unchangedMatched === unchangedTotal;
    const strictPair = allMatched && twinContrast === 1 ? 1 : 0;

    return {
      editRecall,
      preservation,
      twinContrast,
      strictPair,
      changedMatched,
      changedTotal,
      unchangedMatched,
      unchangedTotal,
      perStep,
    };
  }

  /* ------------------------------------------------------------------------
     Render Workbench (#arenaWorkbenchRoot)
     ------------------------------------------------------------------------ */
  function formatVal(v) {
    if (typeof v === 'boolean') return v ? 'true (1)' : 'false (0)';
    return String(v);
  }

  function renderObsPill(entityDef, cameraState) {
    if (entityDef.occludable && cameraState && cameraState.inView === false) {
      return `<span class="obs-pill obs-pill--unbound">${t('occluded (P+D only)', '视野遮挡（仅 P+D）')}</span>`;
    }
    if (entityDef.obs === 'visible') {
      return `<span class="obs-pill obs-pill--visible">visible</span>`;
    }
    if (entityDef.obs === 'ui') {
      return `<span class="obs-pill obs-pill--ui">ui</span>`;
    }
    return `<span class="obs-pill obs-pill--hidden">hidden</span>`;
  }

  function renderBranchCard(branchKey, arch, oracleSnaps, candSnaps, stepEval, trackFilter) {
    const idx = STATE.stepIndex;
    const oSnap = oracleSnaps[idx];
    const cSnap = candSnaps[idx];
    const s0 = oracleSnaps[0];
    const mismatches = branchKey === 'A' ? stepEval.mismatchA : stepEval.mismatchB;

    const title =
      branchKey === 'A'
        ? t('Branch A (Edited)', '分支 A（规则编辑）')
        : t('Branch B (Control)', '分支 B（对照基线）');

    const badge =
      branchKey === 'A'
        ? `<span class="obs-pill obs-pill--hidden">${t('Edited Branch', '编辑分支')}</span>`
        : `<span class="mono-tag">${t('Matched Control', '匹配对照')}</span>`;

    const entityCards = Object.keys(oSnap.entities)
      .map((key) => {
        const oEnt = oSnap.entities[key];
        const cEnt = cSnap.entities[key];
        const baseVal = s0.entities[key].value;
        const inTrack = isFieldInTrack(oEnt, oSnap.camera, trackFilter);
        const isMismatch = inTrack && mismatches.includes(key);
        const isChanged = oEnt.value !== baseVal;
        const isOccluded = Boolean(oEnt.occludable && oSnap.camera && oSnap.camera.inView === false);

        const tileCls = [
          'wb-entity-tile',
          isMismatch ? 'is-mismatch' : isChanged ? 'is-changed' : '',
          !inTrack || isOccluded ? 'is-occluded' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const label = isZh() ? oEnt.label_zh : oEnt.label_en;
        const candHtml =
          STATE.candidateId === 'oracle'
            ? `<span class="wb-entity-tile__cand">${inTrack ? t('Scored', '计入分母') : t('Excluded from R', 'R 轨排除')}</span>`
            : `<span class="wb-entity-tile__cand ${isMismatch ? 'is-err' : ''}">${t('Pred:', '预测:')} ${esc(
                formatVal(cEnt.value)
              )}${!inTrack ? ` (${t('excluded', '不计')})` : ''}</span>`;

        return `
          <div class="${tileCls}">
            <div class="wb-entity-tile__head">
              <span class="wb-entity-tile__name" title="${esc(key)}">${esc(label)}</span>
              ${renderObsPill(oEnt, oSnap.camera)}
            </div>
            <div class="wb-entity-tile__val">${esc(formatVal(oEnt.value))}</div>
            ${candHtml}
          </div>
        `;
      })
      .join('');

    const isOracle = STATE.candidateId === 'oracle';
    const displaySnap = isOracle ? oSnap : cSnap;
    const displaySnaps = isOracle ? oracleSnaps : candSnaps;
    const activeRules = Array.isArray(displaySnap.rules) ? displaySnap.rules : [];

    let ruleNoteHtml = '';
    if (STATE.candidateId === 'b_init' || STATE.candidateId === 'b_frozen') {
      ruleNoteHtml = `<div class="wb-cand-note">${esc(
        t(
          'Candidate rule/camera state frozen at t=0 (s_0); runtime edits & actions ignored.',
          '候选规则与相机状态冻结于 t=0（s_0），忽略运行时编辑与动作。'
        )
      )}</div>`;
    } else if (STATE.candidateId === 'b_replay') {
      ruleNoteHtml = `<div class="wb-cand-note">${esc(
        t(
          `Swapped replay: displaying ${branchKey === 'A' ? 'Branch B' : 'Branch A'} rules & trace.`,
          `对调重放：当前显示${branchKey === 'A' ? '分支 B' : '分支 A'}的规则与轨迹。`
        )
      )}</div>`;
    } else if (STATE.candidateId === 'b_ignore' && branchKey === 'A') {
      ruleNoteHtml = `<div class="wb-cand-note">${esc(
        t(
          'Control-only replay: Branch A meta-edits ignored.',
          '仅运行对照规则：已忽略分支 A 的元编辑操作。'
        )
      )}</div>`;
    }

    const rulesHtml =
      activeRules.length > 0
        ? `<div class="wb-rule-list">
            ${activeRules
              .map((r) => {
                const isExtraBug = !isOracle && r.id.endsWith('_extra');
                const cls = [
                  'wb-rule-chip',
                  r.status !== 'active' ? 'is-revoked' : '',
                  isExtraBug ? 'is-bug' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return `
              <div class="${cls}">
                <span>${esc(r.id)} · v${r.version} · p=${r.priority} · ${esc(r.when.event)}(${esc(r.when.source)})</span>
                <span class="mono-muted">${esc(r.status)}</span>
              </div>`;
              })
              .join('')}
          </div>${ruleNoteHtml}`
        : `<div class="wb-cand-note">${esc(
            t(
              `Camera state: yaw=${displaySnap.camera.yaw}°, in_view=${displaySnap.camera.inView}`,
              `相机位姿：yaw=${displaySnap.camera.yaw}°，目标视野内=${displaySnap.camera.inView}`
            )
          )}</div>${ruleNoteHtml}`;

    const traceLines = displaySnaps
      .slice(0, idx + 1)
      .map((snap, sIdx) => {
        const msg = isZh() ? snap.log_zh : snap.log_en;
        const isBugLine = /\[(BUG|缺陷|B-init|B-frozen|B-ignore|B-replay)/i.test(msg);
        return `
          <div class="wb-trace-line ${sIdx === idx ? 'is-current' : ''} ${isBugLine ? 'is-bug' : ''}">
            <span class="trace-tick">t=${snap.t}</span>
            <span>${esc(msg)}</span>
          </div>
        `;
      })
      .join('');

    return `
      <div class="wb-branch-card ${branchKey === 'A' ? 'wb-branch-card--edited' : ''}">
        <div class="wb-branch-head">
          <span class="wb-branch-title">${title}</span>
          ${badge}
        </div>
        <div class="wb-scene-strip">${entityCards}</div>
        ${rulesHtml}
        <div class="wb-trace-box">${traceLines}</div>
      </div>
    `;
  }

  function renderWorkbench() {
    const root = document.getElementById('arenaWorkbenchRoot');
    if (!root) return;

    const arch = ARCHETYPES.find((a) => a.id === STATE.archetypeId) || ARCHETYPES[0];
    if (STATE.stepIndex >= arch.timeline.length) STATE.stepIndex = arch.timeline.length - 1;
    if (STATE.stepIndex < 0) STATE.stepIndex = 0;

    const oracleA = simulateBranch(arch, 'A', 'none');
    const oracleB = simulateBranch(arch, 'B', 'none');
    const { candA, candB } = simulateCandidate(arch, STATE.candidateId, oracleA, oracleB);
    const evalRes = evaluateCounterfactual(arch, oracleA, oracleB, candA, candB, STATE.trackFilter);
    const stepEval = evalRes.perStep[STATE.stepIndex];
    const activeCand = CANDIDATES.find((c) => c.id === STATE.candidateId) || CANDIDATES[0];

    const candDesc =
      activeCand.id === 'domain_trap'
        ? isZh()
          ? arch.trapDesc_zh
          : arch.trapDesc_en
        : isZh()
        ? activeCand.desc_zh
        : activeCand.desc_en;

    const archButtonsHtml = ARCHETYPES.map((a) => {
      const isSelected = a.id === arch.id;
      const active = isSelected ? 'is-active' : '';
      return `
        <button type="button" role="tab" aria-selected="${isSelected ? 'true' : 'false'}" class="wb-arch-btn ${active}" data-arch-id="${a.id}">
          <div class="wb-arch-btn__top">
            <span class="wb-arch-btn__code">${esc(a.code)}</span>
            <span class="mono-tag">${esc(a.tags[0])}</span>
          </div>
          <div class="wb-arch-btn__title">${esc(isZh() ? a.title_zh : a.title_en)}</div>
          <div class="wb-arch-btn__meta">${esc(isZh() ? a.subtitle_zh : a.subtitle_en)}</div>
        </button>
      `;
    }).join('');

    const candButtonsHtml = CANDIDATES.map((c) => {
      const label =
        c.id === 'domain_trap' ? (isZh() ? arch.trapLabel_zh : arch.trapLabel_en) : isZh() ? c.label_zh : c.label_en;
      return `<button type="button" class="wb-pill-btn ${c.id === STATE.candidateId ? 'is-active' : ''}" data-cand-id="${
        c.id
      }">${esc(label)}</button>`;
    }).join('');

    const trackButtonsHtml = [
      { id: 'all', en: 'All Fields', zh: '全部字段' },
      { id: 'pd', en: 'P+D Track (all obs)', zh: 'P+D 轨（含隐藏）' },
      { id: 'r', en: 'R Track (visible & bound)', zh: 'R 轨（仅可见+绑定）' },
    ]
      .map(
        (tr) =>
          `<button type="button" class="wb-pill-btn ${tr.id === STATE.trackFilter ? 'is-active' : ''}" data-track-id="${
            tr.id
          }">${esc(isZh() ? tr.zh : tr.en)}</button>`
      )
      .join('');

    const timelineNodesHtml = arch.timeline
      .map((step, i) => {
        const se = evalRes.perStep[i];
        let badgeHtml = `<span class="wb-tick-node__badge wb-tick-node__badge--muted">${t('ref', '基线')}</span>`;
        if (step.scored) {
          if (se.excludedInR) {
            badgeHtml = `<span class="wb-tick-node__badge wb-tick-node__badge--muted">${t('R: excl', 'R 不计')}</span>`;
          } else if (!se.passed) {
            badgeHtml = `<span class="wb-tick-node__badge wb-tick-node__badge--fail">${t('FAIL', '失配')}</span>`;
          } else if (step.discriminating) {
            badgeHtml = `<span class="wb-tick-node__badge wb-tick-node__badge--disc">${t('DISC', '判别点')}</span>`;
          } else {
            badgeHtml = `<span class="wb-tick-node__badge wb-tick-node__badge--ok">${t('PASS', '通过')}</span>`;
          }
        }
        return `
          <button type="button" class="wb-tick-node ${i === STATE.stepIndex ? 'is-active' : ''}" data-step-idx="${i}">
            <div class="wb-tick-node__top">
              <span class="wb-tick-node__tick">${esc(isZh() ? step.label_zh : step.label_en)}</span>
              ${badgeHtml}
            </div>
            <div class="wb-tick-node__op">${esc(isZh() ? step.opLabel_zh : step.opLabel_en)}</div>
          </button>
        `;
      })
      .join('');

    const strictPass = evalRes.strictPair === 1;
    const stepStatusText = !stepEval.scored
      ? t('Baseline s_0 reference (not scored)', 't=0 初始基线参考（不计入得分）')
      : stepEval.excludedInR
      ? t('Hidden/unbound at this tick — excluded from R denominator', '当前刻无可见且绑定字段 — R 轨合法排除')
      : stepEval.passed
      ? t(`Tick t=${stepEval.t} PASS (${stepEval.activeCount} scored fields/branch)`, `时刻 t=${stepEval.t} 通过（每分支 ${stepEval.activeCount} 字段）`)
      : t(
          `Tick t=${stepEval.t} MISMATCH — A:[${stepEval.mismatchA.join(', ') || 'ok'}] B:[${stepEval.mismatchB.join(', ') || 'ok'}]`,
          `时刻 t=${stepEval.t} 失配 — A:[${stepEval.mismatchA.join(', ') || '通过'}] B:[${stepEval.mismatchB.join(', ') || '通过'}]`
        );

    root.innerHTML = `
      <div class="wb-shell">
        <div class="wb-archetype-bar" role="tablist" aria-label="${t('Rule-Edit Archetypes', '规则编辑原型')}">
          ${archButtonsHtml}
        </div>

        <div class="wb-controls-bar">
          <div class="wb-summary-block">
            <h3>${esc(isZh() ? arch.title_zh : arch.title_en)} <span class="mono-tag">${esc(arch.tags.join(' · '))}</span></h3>
            <p>${esc(isZh() ? arch.summary_zh : arch.summary_en)}</p>
            <p class="mono-muted" style="margin-top:6px;">${esc(isZh() ? arch.provenance_zh : arch.provenance_en)}</p>
            <div class="wb-intent-quote">
              <span>${esc(isZh() ? arch.intent_zh : arch.intent_en)}</span>
            </div>
          </div>

          <div class="wb-filter-group">
            <div class="wb-control-row">
              <span class="wb-control-label">${t('CANDIDATE:', '评测候选:')}</span>
              <div class="wb-pill-group" role="group" aria-label="${t('Candidate Mode', '候选模式')}">
                ${candButtonsHtml}
              </div>
            </div>
            <div class="wb-control-row">
              <span class="wb-control-label">${t('DENOMINATOR:', '计分分母:')}</span>
              <div class="wb-pill-group" role="group" aria-label="${t('Track Denominator', '轨道分母')}">
                ${trackButtonsHtml}
              </div>
            </div>
          </div>
        </div>

        <div class="wb-timeline-card">
          <div class="wb-timeline-head">
            <div>
              <strong style="font-size:12.5px;">${t('Action & Edit Timeline Scrubber', '动作与规则编辑时间轴')}</strong>
              <span class="mono-muted" style="margin-left:8px;">${esc(stepStatusText)}</span>
            </div>
            <div class="wb-timeline-nav">
              <button type="button" class="wb-step-btn" id="wbPrevStep" ${STATE.stepIndex <= 0 ? 'disabled' : ''}>◀ ${t('Prev', '上一步')}</button>
              <button type="button" class="wb-step-btn" id="wbNextStep" ${STATE.stepIndex >= arch.timeline.length - 1 ? 'disabled' : ''}>${t('Next', '下一步')} ▶</button>
            </div>
          </div>
          <div class="wb-timeline-track">${timelineNodesHtml}</div>
        </div>

        <div class="wb-main-grid">
          ${renderBranchCard('A', arch, oracleA, candA, stepEval, STATE.trackFilter)}
          ${renderBranchCard('B', arch, oracleB, candB, stepEval, STATE.trackFilter)}

          <div class="wb-branch-card wb-branch-card--verdict">
            <div class="wb-branch-head">
              <span class="wb-branch-title">${t('Strict Pair (A ∧ B) Live Evaluation', 'Strict Pair (A ∧ B) 实时评分')}</span>
              <span class="status-chip ${strictPass ? 'status-chip--green' : 'status-chip--danger'}">
                ${strictPass ? t('PASS (1.0)', '通过 (1.0)') : t('FAIL (0.0)', '未通过 (0.0)')}
              </span>
            </div>

            <div class="wb-score-grid">
              <div class="wb-kpi">
                <span class="wb-kpi__label">${t('Edit Recall (Changed)', '编辑召回率（变化字段）')}</span>
                <span class="wb-kpi__val">${(evalRes.editRecall * 100).toFixed(0)}%</span>
                <span class="mono-muted">${evalRes.changedMatched}/${evalRes.changedTotal}</span>
              </div>
              <div class="wb-kpi">
                <span class="wb-kpi__label">${t('Preservation (Unchanged)', '保持率（不变字段）')}</span>
                <span class="wb-kpi__val">${(evalRes.preservation * 100).toFixed(0)}%</span>
                <span class="mono-muted">${evalRes.unchangedMatched}/${evalRes.unchangedTotal}</span>
              </div>
              <div class="wb-kpi">
                <span class="wb-kpi__label">${t('TwinContrast (A ≠ B)', '孪生对比度 (A ≠ B)')}</span>
                <span class="wb-kpi__val">${evalRes.twinContrast}</span>
                <span class="mono-muted">${evalRes.twinContrast ? t('Discriminates', '具备区分度') : t('Collapsed', '分支塌缩')}</span>
              </div>
              <div class="wb-kpi ${strictPass ? 'wb-kpi--pass' : 'wb-kpi--fail'}">
                <span class="wb-kpi__label">Strict Pair (A ∧ B)</span>
                <span class="wb-kpi__val">${evalRes.strictPair}</span>
                <span class="mono-muted">${strictPass ? t('All checkpoints match', '全检查点双分支一致') : t('Gate failed', '配对门控未通过')}</span>
              </div>
            </div>

            <div class="wb-cand-note">
              <strong>${esc(
                activeCand.id === 'domain_trap'
                  ? isZh()
                    ? arch.trapLabel_zh
                    : arch.trapLabel_en
                  : isZh()
                  ? activeCand.label_zh
                  : activeCand.label_en
              )}</strong><br />
              ${esc(candDesc)}
            </div>

            <div class="wb-diff-grid">
              <div>
                <div class="mono-muted" style="margin-bottom:4px;">${t('Branch A Rule Patch', '分支 A 规则补丁')}</div>
                <pre class="code-box">${esc(isZh() ? arch.diffA_zh : arch.diffA_en)}</pre>
              </div>
              <div>
                <div class="mono-muted" style="margin-bottom:4px;">${t('Branch B Baseline Rule', '分支 B 基线规则')}</div>
                <pre class="code-box">${esc(isZh() ? arch.diffB_zh : arch.diffB_en)}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     Render P · D · R · E Track Explorer (#arenaTracksRoot)
     ------------------------------------------------------------------------ */
  function renderTracks() {
    const root = document.getElementById('arenaTracksRoot');
    if (!root) return;

    const tabs = [
      { id: 'pd', en: 'PD Track · State & Rules', zh: 'PD 轨 · 状态契约与规则' },
      { id: 'r', en: 'R Track · L0–L4 & Readout', zh: 'R 轨 · L0–L4 与对称读出' },
      { id: 'e', en: 'E Track & P→D→R Integration', zh: 'E 闭环轨与 P→D→R 集成' },
    ];

    const tabButtons = tabs
      .map(
        (tb) =>
          `<button type="button" role="tab" aria-selected="${STATE.activeTrackTab === tb.id ? 'true' : 'false'}" class="lp-tab ${STATE.activeTrackTab === tb.id ? 'is-active' : ''}" data-track-tab="${
            tb.id
          }">${esc(isZh() ? tb.zh : tb.en)}</button>`
      )
      .join('');

    let bodyHtml = '';

    if (STATE.activeTrackTab === 'pd') {
      bodyHtml = `
        <div class="tracks-subgrid">
          <div class="tracks-panel">
            <h4>${t('Capabilities Coverage (pwm-capabilities-v3)', '能力子维覆盖（pwm-capabilities-v3）')}</h4>
            <div class="tracks-chip-grid">
              <span class="tracks-chip"><strong>P1</strong>${t('Input interface & scope', '输入接口与可控范围')}</span>
              <span class="tracks-chip"><strong>P2</strong>${t('Intent & program grounding', '意图理解与程序表达')}</span>
              <span class="tracks-chip"><strong>P3</strong>${t('Rebind / override / revoke / cancel / once', '全生命周期干预')}</span>
              <span class="tracks-chip"><strong>P4</strong>${t('Real-time latency (evaluated in E)', '实时交互延迟（移入 E 轨）')}</span>
              <span class="tracks-chip"><strong>D1</strong>${t('State transitions & consequences', '状态转移与动作后果')}</span>
              <span class="tracks-chip"><strong>D2</strong>${t('Physical & causal events', '物理与因果事件')}</span>
              <span class="tracks-chip"><strong>D3</strong>${t('Scheduled & environmental processes', '定时与环境过程')}</span>
              <span class="tracks-chip"><strong>D4</strong>${t('Stochastic futures & induction', '随机未来与机制归纳')}</span>
            </div>
          </div>

          <div class="tracks-panel">
            <h4>${t('8 PD Template Families & Scale Roadmap', '8 大 PD 模板族与规模扩容路线')}</h4>
            <div class="tracks-chip-grid" style="margin-bottom:8px;">
              <span class="tracks-chip">1. ${t('Binding / Rebinding (S12)', '绑定/重绑')}</span>
              <span class="tracks-chip">2. ${t('Gating & Negation (S03, S14, S20)', '门控与否定')}</span>
              <span class="tracks-chip">3. ${t('Override / Revoke / Priority (S18, S19)', '覆盖/撤销/优先级')}</span>
              <span class="tracks-chip">4. ${t('once / schedule / cancel (S13, S16, S17)', '时间事件')}</span>
              <span class="tracks-chip">5. ${t('Numeric Conservation (S04, S05, S08, S11)', '数值与守恒')}</span>
              <span class="tracks-chip">6. ${t('Relational Reference (S06, S07, S09)', '对象与关系指代')}</span>
              <span class="tracks-chip">7. ${t('Native Mechanics (S02, S10, S15, S21)', '原生力学子集')}</span>
              <span class="tracks-chip">8. ${t('Appearance-Dynamics Decoupling (S22)', '外观与动力学解耦')}</span>
            </div>
            <p class="mono-muted" style="margin:0;">
              ${t(
                'Procedural generator roadmap: ≥20 templates × 20 hidden paired instances (400–480+ total) + counterfactual parameter twins + cross-domain skins (Minecraft, Abstract, Smart Home, Traffic).',
                '程序化生成路线：≥20 类模板 × 20 隐藏配对实例（400–480+ 总量）+ 反事实参数孪生体 + 跨领域皮肤（Minecraft / 抽象网格 / 智能家居 / 交通）。'
              )}
            </p>
          </div>
        </div>

        <div class="arena-table-wrap">
          <table class="arena-table">
            <thead>
              <tr>
                <th>${t('Mode', '执行模式')}</th>
                <th>${t('Given Input', '给定输入')}</th>
                <th>${t('Predicted Output', '模型输出')}</th>
                <th>${t('Evaluation Protocol', '评测方式与目的')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code class="mono-tag">P-intent</code></td>
                <td>${t('NL edit intent + state & rules (no field answer leakage)', '自然语言编辑意图 + 当前状态与规则（零字段答案泄漏）')}</td>
                <td>${t('DSL edit op list', 'DSL 元编辑操作列表')}</td>
                <td>${t('Apply predicted vs gold edit to identical state and run K hidden event streams (semantic execution equivalence).', '将预测编辑与标准编辑作用于同一状态并运行 K 条隐藏事件流（语义执行等价性）。')}</td>
              </tr>
              <tr>
                <td><code class="mono-tag">P-session</code></td>
                <td>${t('Multi-turn edits (create, override, revoke, cancel, ID reuse)', '多轮连续编辑（创建、覆盖、撤销、取消、ID 复用）')}</td>
                <td>${t('Per-turn edit ops', '逐轮元编辑操作')}</td>
                <td>${t('Per-turn & cumulative execution equivalence + activation timing error.', '逐轮与累计执行等价性 + 生效时刻误差。')}</td>
              </tr>
              <tr>
                <td><code class="mono-tag">D-direct</code></td>
                <td>${t('Gold rules + initial state + event stream + query ticks', '标准规则 + 初始状态 + 事件流 + 查询时刻')}</td>
                <td>${t('Query field JSON', '查询字段 JSON')}</td>
                <td>${t('Normalized JSON comparison scored with Edit Recall, Preservation & Strict Pair (A ∧ B).', '归一化 JSON 对比，计算编辑召回率、保持率与 Strict Pair。')}</td>
              </tr>
              <tr>
                <td><code class="mono-tag">D-program</code></td>
                <td>${t('Rule specification + 1 example instance', '规则文本 + 1 个示例实例')}</td>
                <td>${t('Executable step(s, e) Python/DSL', '可执行 step(s, e) 程序')}</td>
                <td>${t('Executed on 50–200 hidden test-suite instances (test-suite accuracy & display–hidden gap).', '在 50–200 个隐藏测试实例上实跑（测试集通过率与显隐差距）。')}</td>
              </tr>
              <tr>
                <td><code class="mono-tag">D-induce</code></td>
                <td>${t('Rules hidden; only K ∈ {0, 1, 3, 10} transitions given', '隐藏规则，仅提供 K ∈ {0, 1, 3, 10} 条转移轨迹')}</td>
                <td>${t('Induced program or rollout', '归纳程序或状态预测')}</td>
                <td>${t('Held-out transition accuracy, sample efficiency & probabilistic scoring for stochastic D4.', '留出转移准确率、样本效率及随机 D4 概率评测。')}</td>
              </tr>
              <tr>
                <td><code class="mono-tag">D-img / +sym</code></td>
                <td>${t('Rule text + rendered t=0 frame', '规则文本 + t=0 渲染首帧')}</td>
                <td>${t('Parsed t=0 state + rollout', '首帧状态解析 + 推演')}</td>
                <td>${t('Isolates MLLM visual perception gap (D-sym − D-img) from rule reasoning.', '将多模态感知差距（D-sym − D-img）与规则推理解耦。')}</td>
              </tr>
              <tr>
                <td><code class="mono-tag">P∘D</code></td>
                <td>${t('NL intent + initial state', '自然语言意图 + 初始状态')}</td>
                <td>${t('Model P piped into Model D', '模型自身 P 接模型自身 D')}</td>
                <td>${t('Compared against isolated P-only and D-only to expose composition failures.', '对比单独 P 与单独 D 得分，定位组合接口失败。')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (STATE.activeTrackTab === 'r') {
      bodyHtml = `
        <div class="arena-table-wrap" style="margin-bottom:12px;">
          <table class="arena-table">
            <thead>
              <tr>
                <th>${t('Conditioning Level', '条件层级')}</th>
                <th>${t('Conditioning Input', '条件输入接口')}</th>
                <th>${t('Leakage Risk', '信息泄漏')}</th>
                <th>${t('What It Measures', '真实评测目标')}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="tracks-level-row--banned">
                <td><strong class="mono-tag">L0</strong> <span class="status-chip status-chip--danger">${t('Diagnostic-Only · Banned', '仅诊断 · 禁止计分')}</span></td>
                <td>${t('Future ground-truth RGB, blurred RGB, or RGB Canny edges', '未来真值 RGB、模糊 RGB 或真值提取 Canny 边缘')}</td>
                <td>${t('Answer already in condition', '答案已包含在条件中')}</td>
                <td>${t('Style transfer & preservation only — excluded from comparative R scoring.', '仅测风格迁移与局部保持，不得用于渲染器能力横向计分。')}</td>
              </tr>
              <tr>
                <td><strong class="mono-tag">L1</strong></td>
                <td>${t('Voxel per-frame Depth + Block-ID semantic map + camera pose', '体素逐帧深度图 + Block-ID 语义图 + 相机位姿（无 RGB）')}</td>
                <td>${t('Geometry & semantics given', '几何与语义完全给出')}</td>
                <td>${t('Texture synthesis, appearance & temporal stability (vs deterministic lookup ceiling).', '纹理生成、外观保真与时序稳定性（对比确定性查表上限）。')}</td>
              </tr>
              <tr class="tracks-level-row--primary">
                <td><strong class="mono-tag">L2</strong> <span class="status-chip status-chip--green">${t('Recommended Primary', '推荐主接口')}</span></td>
                <td>${t('Graybox / low-poly proxy + material/state channel (color-coded ID or timestamped prompts)', '低多边形灰盒代理 + 材质/状态通道（色标 ID 或带时间戳提示）')}</td>
                <td>${t('Geometry given; appearance omitted', '几何可见，外观待渲染')}</td>
                <td>${t('Materializing symbolic state changes into pixels (material channel mandatory for S14/S22).', '将符号状态变化准确物化为像素（S14/S22 必须含材质通道）。')}</td>
              </tr>
              <tr>
                <td><strong class="mono-tag">L3</strong></td>
                <td>${t('First frame + sparse JSON state diff + camera trajectory', '首帧 + 稀疏 JSON 状态增量 + 相机轨迹')}</td>
                <td>${t('Minimal', '极低泄漏')}</td>
                <td>${t('Inferring visual geometry & motion consequences (falling sand, swinging door, revealed room).', '由状态增量推演视觉几何与运动后果（落沙、门摆动、新视野）。')}</td>
              </tr>
              <tr>
                <td><strong class="mono-tag">L4</strong></td>
                <td>${t('First frame + timestamped text event descriptions', '首帧 + 带时间戳文本事件描述')}</td>
                <td>${t('Ambiguous', '语义存在歧义')}</td>
                <td>${t('Text-to-event visual synthesis (GameCraft-2, LingBot-World, dynamicPrompts).', '文本事件驱动的视频合成。')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="tracks-subgrid">
          <div class="tracks-panel">
            <h4>${t('9 Visual Primitives (A–I) & Dual-Axis Reporting', '9 类视觉原语 (A–I) 与双轴报告')}</h4>
            <div class="tracks-chip-grid" style="margin-bottom:8px;">
              <span class="tracks-chip"><strong>A</strong>${t('Toggle (door/lever/lamp)', '状态切换')}</span>
              <span class="tracks-chip"><strong>B</strong>${t('Material / color', '材质/颜色')}</span>
              <span class="tracks-chip"><strong>C</strong>${t('Appear / disappear', '出现/消失')}</span>
              <span class="tracks-chip"><strong>D</strong>${t('Displacement / motion', '位移运动')}</span>
              <span class="tracks-chip"><strong>E</strong>${t('Spatial propagation', '空间传播')}</span>
              <span class="tracks-chip"><strong>F</strong>${t('Illumination', '光照变化')}</span>
              <span class="tracks-chip"><strong>G</strong>${t('Camera pan & new region', '相机运动与新视野')}</span>
              <span class="tracks-chip"><strong>H</strong>${t('Structural composition', '结构组合')}</span>
              <span class="tracks-chip"><strong>I</strong>${t('No change (control)', '无变化对照')}</span>
            </div>
            <p class="mono-muted" style="margin:0;">
              ${t(
                'Compare ONLY within the same L1–L4 level. Report State Fidelity separately from Minecraft Style Fidelity, plus R4 perceptual quality (secondary only).',
                '严格禁止跨 L1–L4 等级比较；将「状态忠实度」与「Minecraft 风格保真度」双轴分报，R4 感知画质仅作次级参考。'
              )}
            </p>
          </div>

          <div class="tracks-panel">
            <h4>${t('6 Symmetric Readout Calibration Rules', '对称读出校准 6 项硬性规则')}</h4>
            <ol class="tracks-note-list">
              <li>${t('Symmetry: Trivial baselines, oracle frames, and neural renderers pass the exact same dual-annotator gate & missing/unreadable rules.', '对称性：平庸基线、原生参考帧与神经渲染器必须经过完全相同的双标注器门控与缺失/不可读判定。')}</li>
              <li>${t('Three-number reporting: (a) Readable coverage rate, (b) Success conditioned on readable, (c) Total success with unresolved = fail.', '三数同报：可读覆盖率、可读条件下成功率、未决按失败计的总成功率。')}</li>
              <li>${t('Certification: ≥59 error-free known-answer clusters per annotator×class (95% Clopper-Pearson <5% error), plus VAE round-trip calibration.', '认证阈值：每类 ≥59 个无错已知答案簇（95% Clopper-Pearson 上界误差 <5%），并纳入 VAE 重编码校准。')}</li>
              <li>${t('Independent annotators: Add non-Qwen VLM + complete 352-query human packet; replace κ-only with Gwet AC1 / Krippendorff α.', '独立标注器：引入非 Qwen 家族 VLM 与 352 条人类盲标；用 Gwet AC1 / Krippendorff α 替代单一 κ。')}</li>
              <li>${t('Pose-aware R3: Use scene-pose-v1 3D projection for camera-moving tasks (S24) plus temporal-shuffle & static-copy gameability probes.', '位姿感知 R3：在 S24 等相机运动任务中使用 scene-pose-v1 三维投影取样，并加时间打乱与静态帧反作弊探针。')}</li>
              <li>${t('Throughput separation: Isolate one-time cold model load from steady-state denoising cost (GPU-s / video-s).', '吞吐分离：将一次性冷启动加载与稳态去噪耗时（GPU-s / video-s）分开统计。')}</li>
            </ol>
          </div>
        </div>
      `;
    } else {
      bodyHtml = `
        <div class="arena-table-wrap" style="margin-bottom:12px;">
          <table class="arena-table">
            <thead>
              <tr>
                <th>${t('Sub-Track', '子轨道')}</th>
                <th>${t('Target Systems', '适用模型类别')}</th>
                <th>${t('How Triggers / Edits Enter', '编辑与触发输入')}</th>
                <th>${t('Scoring & Safeguards', '评测机制与防作弊')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code class="mono-tag">E-action</code></td>
                <td>${t('Action-conditioned pixel simulators (MineWorld, Oasis, Matrix-Game 2.0, Solaris)', '动作条件像素世界模型')}</td>
                <td>${t('Replay VPT / MineRL action streams (pull lever, remove support, pan)', '回放 VPT / MineRL 动作序列')}</td>
                <td>${t('State probes + VPT IDM action fidelity (separates missed action from wrong dynamics).', '状态探针 + VPT 逆动力学动作保真度，区分“未执行动作”与“动力学错误”。')}</td>
              </tr>
              <tr>
                <td><code class="mono-tag">E-text</code></td>
                <td>${t('Promptable / text-event world models (LingBot-World, GameCraft-2, Genie 3/4)', '文本事件可提示世界模型')}</td>
                <td>${t('Text rule edit issued at t, pure trigger action only at t+k', 't 时刻输入文本规则修改，t+k 仅执行纯触发动作')}</td>
                <td>${t('Delayed-trigger test verifying rule memory persistence across k steps + Strict Pair.', '延迟触发检验：验证跨越 k 步的规则记忆持久性，而非瞬时画面插入。')}</td>
              </tr>
              <tr>
                <td><code class="mono-tag">E-composed</code></td>
                <td>${t('Hybrid & wrapped systems (Matrix-Game 4.0, LLM P+D + EdenLive R)', '混合与拼接架构系统')}</td>
                <td>${t('Native end-to-end interface', '原生端到端接口')}</td>
                <td>${t('Full P∘D∘R score compared against isolated P, D, R scores for error attribution.', '端到端总分与独立 P、D、R 分数对照以精确定位瓶颈。')}</td>
              </tr>
              <tr>
                <td><code class="mono-tag">E-memory</code></td>
                <td>${t('Long-horizon memory models (Matrix-Game 3.0, WorldMem, Memory Forcing)', '长程记忆世界模型')}</td>
                <td>${t('180° pan away and revisit', '180° 转开再回看重访')}</td>
                <td>${t('R3 scene-pose-v1 pose-projected persistence probes.', 'R3 scene-pose-v1 三维位姿投影持久性探针。')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="tracks-subgrid">
          <div class="tracks-panel">
            <h4>${t('3 E-Track Design Disciplines', 'E 轨三项设计纪律')}</h4>
            <ol class="tracks-note-list">
              <li>${t('Expressivity Coverage: Action-only models without a rule-edit channel are marked "unsupported" on meta-edit tasks and reported as expressivity coverage rather than silently penalized.', '表达力覆盖率：纯动作模型因无运行时规则编辑通道，相关任务标记为 unsupported 并单独统计覆盖率，不混入失败分母。')}</li>
              <li>${t('Delayed-Trigger Core: Separating edit time t from trigger time t+k prevents prompt-injection shortcuts.', '延迟触发核心：将编辑时间 t 与触发时间 t+k 隔开，防止将提示词瞬时绘图误判为规则记忆。')}</li>
              <li>${t('Anti-Collapse Pairing: Pairing temporal consistency with Edit Recall guarantees static-frame collapse scores 0.', '防塌缩配对：将时序一致性与 Edit Recall 强制绑定，使静态帧塌缩得分为 0。')}</li>
            </ol>
          </div>

          <div class="tracks-panel">
            <h4>${t('P → D → R Unranked Integration Subset', 'P → D → R 非排名集成校验子集')}</h4>
            <p class="tracks-note-list" style="padding-left:0; list-style:none;">
              ${t(
                'Retains ~1 instance per template (S01–S24) where Model P feeds Model D, and Model D’s own predicted state (NOT gold engine state) conditions Renderer R. Used purely as an interface sanity check to surface mismatches such as D predicting door_A.open=true while R renders a closed door.',
                '每类模板保留约 1 个代表实例（覆盖 S01–S24）：模型 P 的输出接入模型 D，再由模型 D 自己预测的状态（而非标准引擎真值）驱动渲染器 R。该子集不参与排名，专门用于排查模块间接口失配（例如 D 预测门已开而 R 仍渲染关门）。'
              )}
            </p>
          </div>
        </div>
      `;
    }

    root.innerHTML = `
      <div class="tracks-shell">
        <div class="lp-tabs" role="tablist" aria-label="${t('P · D · R · E Track Tabs', 'P · D · R · E 轨道标签')}">
          ${tabButtons}
        </div>
        ${bodyHtml}
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     Render All & Event Delegation
     ------------------------------------------------------------------------ */
  function syncTitle() {
    document.title = isZh()
      ? '02 · PWM-Arena｜程序世界模型反事实评测基准与 P · D · R 架构'
      : '02 · PWM-Arena · Counterfactual Benchmark & P · D · R';
  }

  function renderAll() {
    syncTitle();
    renderWorkbench();
    renderTracks();
  }

  document.addEventListener('click', (e) => {
    const archBtn = e.target.closest('[data-arch-id]');
    if (archBtn) {
      const nextId = archBtn.getAttribute('data-arch-id');
      if (nextId && nextId !== STATE.archetypeId) {
        STATE.archetypeId = nextId;
        // Default to the primary discriminating checkpoint for immediate clarity
        const arch = ARCHETYPES.find((a) => a.id === nextId);
        const discIdx = arch ? arch.timeline.findIndex((s) => s.discriminating) : 1;
        STATE.stepIndex = discIdx >= 0 ? discIdx : 1;
        renderWorkbench();
      }
      return;
    }

    const candBtn = e.target.closest('[data-cand-id]');
    if (candBtn) {
      STATE.candidateId = candBtn.getAttribute('data-cand-id');
      renderWorkbench();
      return;
    }

    const trackFilterBtn = e.target.closest('[data-track-id]');
    if (trackFilterBtn) {
      STATE.trackFilter = trackFilterBtn.getAttribute('data-track-id');
      renderWorkbench();
      return;
    }

    const stepBtn = e.target.closest('[data-step-idx]');
    if (stepBtn) {
      STATE.stepIndex = Number(stepBtn.getAttribute('data-step-idx')) || 0;
      renderWorkbench();
      return;
    }

    if (e.target.closest('#wbPrevStep')) {
      if (STATE.stepIndex > 0) {
        STATE.stepIndex -= 1;
        renderWorkbench();
      }
      return;
    }

    if (e.target.closest('#wbNextStep')) {
      const arch = ARCHETYPES.find((a) => a.id === STATE.archetypeId) || ARCHETYPES[0];
      if (STATE.stepIndex < arch.timeline.length - 1) {
        STATE.stepIndex += 1;
        renderWorkbench();
      }
      return;
    }

    const trackTabBtn = e.target.closest('[data-track-tab]');
    if (trackTabBtn) {
      STATE.activeTrackTab = trackTabBtn.getAttribute('data-track-tab');
      renderTracks();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tab = e.target && e.target.closest ? e.target.closest('[role="tab"]') : null;
    if (!tab) return;
    const tablist = tab.closest('[role="tablist"]');
    if (!tablist) return;
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]:not([disabled])'));
    const currentIdx = tabs.indexOf(tab);
    if (currentIdx === -1) return;
    e.preventDefault();
    let nextIdx = currentIdx;
    if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = tabs.length - 1;
    const nextTab = tabs[nextIdx];
    if (!nextTab) return;
    const host = tablist.closest('#arenaWorkbenchRoot, #arenaTracksRoot') || tablist.parentElement;
    nextTab.click();
    if (nextTab.isConnected) {
      nextTab.focus();
    } else if (host) {
      const refreshedTablist = host.querySelector('[role="tablist"]');
      const refreshedTabs = refreshedTablist
        ? Array.from(refreshedTablist.querySelectorAll('[role="tab"]:not([disabled])'))
        : [];
      const targetTab = refreshedTabs[nextIdx];
      if (targetTab) targetTab.focus();
    }
  });

  if (SHELL) {
    SHELL.onChange((sh) => {
      STATE.lang = sh.lang;
      STATE.theme = sh.theme;
      renderAll();
    });
  }

  renderAll();
})();
