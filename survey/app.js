/* Interactive Logic & Survey Data for Code World Models Survey */
(function () {
  'use strict';

  const DATA = window.CWM_DATA || { total_sources: 0, literature_cutoff: '', sections: [], papers: [], section_counts: {}, group_counts: {} };
  const PAPERS_BY_ID = Object.fromEntries(DATA.papers.map((p) => [p.id, p]));
  const SHELL = window.PWM_SHELL || null;

  const URL_PARAMS = new URLSearchParams(window.location.search);
  const VALID_LAYERS = new Set(['L0', 'L1', 'L2', 'L3', 'L4']);
  const RAW_LAYER = (URL_PARAMS.get('layer') || '').trim().toUpperCase();
  const VALID_SECTIONS = new Set(['all', 'worldcoder', 'code_as_world', 'vibeworlding', 'gui', 'benchmark', 'survey']);
  const VALID_PARADIGMS = new Map([
    ['all', 'all'],
    ['l2', 'L2'],
    ['l3', 'L3'],
    ['eval-l2', 'Eval-L2'],
    ['eval-l4', 'Eval-L4'],
    ['gui', 'GUI'],
  ]);
  const RAW_SEC = (URL_PARAMS.get('sec') || '').trim().toLowerCase();
  const RAW_PAR = (URL_PARAMS.get('par') || '').trim().toLowerCase();

  const STATE = {
    lang: SHELL
      ? SHELL.lang
      : (URL_PARAMS.get('lang') === 'zh' ? 'zh' : URL_PARAMS.get('lang') === 'en' ? 'en' : (localStorage.getItem('pwm-language') || localStorage.getItem('cwm_lang') || 'en')),
    theme: SHELL
      ? SHELL.theme
      : (URL_PARAMS.get('theme') === 'dark' ? 'dark' : URL_PARAMS.get('theme') === 'light' ? 'light' : (localStorage.getItem('pwm-theme') || localStorage.getItem('cwm_theme') || 'light')),
    style: localStorage.getItem('cwm_style') === 'classic' ? 'classic' : 'clean',
    activeLayer: VALID_LAYERS.has(RAW_LAYER) ? RAW_LAYER : 'L2',
    activeCase: 'caseA',
    activeFrameworkTab: 'obs',
    openChapter: 2,
    viewMode: 'cards',
    sort: 'newest',
    search: URL_PARAMS.get('q') || '',
    sectionFilter: VALID_SECTIONS.has(RAW_SEC) ? RAW_SEC : 'all',
    benchmarkSubFilter: 'all',
    paradigmFilter: VALID_PARADIGMS.get(RAW_PAR) || 'all',
    roleFilter: 'all',
    depthFilter: 'all',
    yearFilter: 'all',
    cmdIndex: 0,
  };

  const I18N = {
    en: {
      search_short: 'Search...',
      style_prefix: 'Style:',
      download_bib: 'Download BibTeX',
      atlas_by_family: 'By Family',
      atlas_by_paradigm: 'By L0–L4',
      atlas_replay: 'Replay',
      heroPillText: 'Executable Dynamics · Persistent Worlds · Renderable Observations →',
      heroTitle: 'Worlds written as executable code.',
      heroSub: `Uniting model-based agents that induce programs for planning with generative visual worlds driven by authoritative code state—organized across a 5-layer transition spectrum and ${DATA.total_sources} verified sources.`,
      heroPrimaryCta: `Browse ${DATA.total_sources} papers`,
      heroSecondaryCta: 'Inspect L0–L4 spectrum',
      stat_sources: 'Curated sources',
      stat_paradigms: 'Transition paradigms',
      stat_families: 'Core families + suites',
      stat_cutoff: 'Literature cutoff',
      pEyebrow: 'Survey Section 3 · Five Transition Paradigms',
      pTitle: 'One question sorts every simulator',
      pDesc: 'When an agent acts, which component computes the next state s_{t+1}, and where do its rules come from? From hand-authored engines (L0) to fully learned dynamics (L4), each paradigm trades off verifiability, authoring cost, and open-world coverage.',
      axisLeft: '← Hand-authored rules · Exact verification',
      axisRight: 'Learned dynamics · Open visual coverage →',
      cEyebrow: 'Survey Section 2 · Running Diagnostic Cases',
      cTitle: 'Same intervention, executable difference',
      cDesc: 'Drag the divider to compare pure pixel-space rollout (L4) against authoritative programmatic state + conditional rendering (L2/L3) across our survey’s diagnostic scenarios.',
      cmpLeftBadge: 'L4 · Frame-Only Video Prediction',
      cmpHint: '← Drag handle to compare →',
      cmpRightBadge: 'L2 / L3 · Code World Model',
      fEyebrow: 'Catalogue Organization · Zooming into L2 & L3',
      fTitle: 'How much of the world code carries',
      fDesc: `Within code-grounded world models, our ${DATA.total_sources}-paper collection splits into three primary families along a single axis—from pure state dynamics to whitebox-conditioned neural rendering to complete 3D worlds in code.`,
      oEyebrow: 'Survey Architecture · Sections 5, 7 & Manuscript Map',
      oTitle: 'Observation contracts & evidence obligations',
      oDesc: 'Inspect how upstream state compiles into visual conditioning interfaces, what each benchmark obligation does (and does not) establish, and the 9-chapter survey blueprint.',
      libEyebrow: 'Structured Literature Corpus',
      libTitle: `Explore all ${DATA.total_sources} verified sources`,
      libDesc: 'Filter by transition paradigm, code-substrate family, benchmark target, code role, and review depth.',
      reset_filters: 'Reset filters',
      export_bibtex: 'Export filtered BibTeX',
      sort_newest: 'Newest first',
      sort_oldest: 'Oldest first',
      sort_title: 'Title A–Z',
      view_cards: 'Cards',
      view_table: 'Table',
      searchPlaceholder: 'Filter title, alias, author, tag...',
      cmdPlaceholder: `Jump to L0–L4 paradigm, family, or search ${DATA.total_sources} papers...`,
    },
    zh: {
      search_short: '检索...',
      style_prefix: '风格:',
      download_bib: '下载全部 BibTeX',
      atlas_by_family: '按三类主线',
      atlas_by_paradigm: '按 L0–L4',
      atlas_replay: '重播',
      heroPillText: '可执行动力学 · 持久状态世界 · 可渲染视觉观测 →',
      heroTitle: '以可执行代码构建交互世界。',
      heroSub: `汇合“面向规划的程序归纳智能体”与“由权威代码状态驱动的生成式视觉世界”两大脉络——围绕 L0–L4 五层状态转移范式与三类代码载体框架，系统梳理 ${DATA.total_sources} 篇核实文献。`,
      heroPrimaryCta: `浏览 ${DATA.total_sources} 篇文献`,
      heroSecondaryCta: '探索 L0–L4 五层范式',
      stat_sources: '核实文献记录',
      stat_paradigms: '状态转移范式',
      stat_families: '核心主线 + 外围分组',
      stat_cutoff: '文献截止日期',
      pEyebrow: '综述第 3 章 · 五层状态转移范式',
      pTitle: '一个核心问题厘清五层模拟器谱系',
      pDesc: '当智能体采取动作时，由哪个组件计算下一状态 s_{t+1}，其规则又从何而来？从手写物理引擎（L0）到纯学习神经动力学（L4），五层范式并非高低排名，而是可验证性、构建成本与开放视觉覆盖面之间的权衡。',
      axisLeft: '← 人工编写确定性规则 · 强可验证',
      axisRight: '神经网络学习动力学 · 开放视觉覆盖 →',
      cEyebrow: '综述第 2 章 · 贯穿式诊断案例',
      cTitle: '同一交互动作，可执行的本质差异',
      cDesc: '拖动中间滑块，直观对比纯像素视频推演（L4）与“权威代码状态 + 条件神经渲染”（L2/L3）在穿墙约束、跨遮挡持久性与运行时改规则上的行为差异。',
      cmpLeftBadge: 'L4 · 纯帧空间视频预测',
      cmpHint: '← 左右拖动滑块对比 →',
      cmpRightBadge: 'L2 / L3 · 代码世界模型',
      fEyebrow: '文献目录主轴 · 聚焦 L2 与 L3 内部结构',
      fTitle: '可执行代码承担了世界的多少部分',
      fDesc: `在代码世界模型内部，${DATA.total_sources} 篇文献沿单一主轴划分为三类主线：纯状态程序化动力学、白模/Proxy + 生成式渲染、以及完整 3D 世界代码构建。`,
      oEyebrow: '综述核心图表 · 第 5 章观测契约、第 7 章评测义务与章节蓝图',
      oTitle: '观测条件接口与评测证据链',
      oDesc: '对比上游状态如何编译为视觉渲染条件（表 1 三种反馈机制）、五项评测义务各自能证明与不能证明的边界（表 2），以及 9 章综述全文结构。',
      libEyebrow: '结构化双语文献库',
      libTitle: `交互检索全部 ${DATA.total_sources} 篇核实来源`,
      libDesc: '支持按 L0–L4 范式视角、三类主线、评测靶点、代码职责与核查深度多维筛选及一键导出 BibTeX。',
      reset_filters: '重置筛选',
      export_bibtex: '导出当前筛选 BibTeX',
      sort_newest: '按日期最新排序',
      sort_oldest: '按日期最早排序',
      sort_title: '按标题字母排序',
      view_cards: '卡片视图',
      view_table: '紧凑表格',
      searchPlaceholder: '搜索标题、方法别名、作者、标签...',
      cmdPlaceholder: `跳转 L0–L4 范式、三类主线或检索 ${DATA.total_sources} 篇论文...`,
    },
  };

  // 5-Layer Transition Paradigms (Verbatim fidelity to Overleaf sections/03-paradigms.tex)
  const PARADIGMS = [
    {
      id: 'L0',
      core: false,
      name_en: 'Hand-written engines',
      name_zh: '手写游戏与物理引擎',
      mini_en: 'Human-authored physics & game rules',
      mini_zh: '人工预先编写的物理定律与游戏逻辑',
      summary_en: 'Game and physics engines execute rules authored by humans in advance. They are exact, repeatable, fast, and enforce constraints reliably—their limitation is that every object and rule must be hand-engineered, so they cannot induce how an unfamiliar environment works.',
      summary_zh: '游戏与物理引擎运行人工预先编写好的确定性规则。它们精确、可复现、速度快且严格执行几何/物理约束；局限在于每个实体和交互规则都需手工建模，无法自主学习未知环境的运行规律。',
      executor_en: 'Deterministic C++/physics runtime',
      executor_zh: '确定性游戏/物理引擎运行时',
      rule_source_en: 'Authored in advance by human engineers',
      rule_source_zh: '由人类工程师预先手工编写',
      state_en: 'Explicit engine scene graph & rigid-body state',
      state_zh: '显式引擎场景图与刚体状态',
      boundary_en: 'If a coding agent writes or edits the scene/simulator automatically, it moves from L0 to L2.',
      boundary_zh: '一旦由编码智能体根据指令或观测自动编写/修改模拟程序，即从 L0 进入 L2。',
      case_en: 'Case A (Wall): Character stops cleanly at the wall every step. Case B (Boulder): Contact impulse & resting pose follow exact solver equations, but novel materials must be coded manually.',
      case_zh: '案例 A（墙壁）：角色每一步都严格停在墙前绝不穿模。案例 B（推石）：碰撞冲量与静止位置严格遵循物理求解器，但未预先建模的新交互无法自动泛化。',
      pipe: ['(s_t, a_t)', 'Human Rules', 'Engine Step', 's_{t+1}', 'Raster / Shader'],
      highlightIdx: 2,
      metrics: [98, 8, 98, 35, 96],
      anchors: [
        { label: 'MuJoCo', id: null },
        { label: 'Unity', id: null },
        { label: 'Unreal Engine', id: null },
        { label: 'DOOM Engine', id: null },
      ],
    },
    {
      id: 'L1',
      core: false,
      name_en: 'LLM predicting next state',
      name_zh: '语言模型直接预测下一状态',
      mini_en: 'Prompted symbolic transition, no code runtime',
      mini_zh: '提示词直接生成下一状态，无中间可执行程序',
      summary_en: 'A language model receives a text or JSON description of (s_t, a_t) and directly writes the next state s_{t+1} with no executable program in between. Highly flexible with minimal engineering for open-ended text worlds, but requires an LLM call every step and accumulates arithmetic, spatial, and causal drift over long horizons.',
      summary_zh: '语言模型接收当前状态与动作的文本或 JSON 描述，直接输出下一状态 s_{t+1}，中间没有任何可执行程序。无需复杂工程即可适配开放文本世界，但每一步演化都需调用大模型，且长程计数、空间关系与因果链极易累积漂移。',
      executor_en: 'Autoregressive LLM token decoding per step',
      executor_zh: '每步直接通过 LLM 采样解码输出状态',
      rule_source_en: 'Pretrained LLM world knowledge + prompt context',
      rule_source_zh: '大模型预训练常识与上下文提示',
      state_en: 'Textual or JSON symbolic state buffer',
      state_zh: '文本或 JSON 符号状态缓冲区',
      boundary_en: 'Separated from L4 by its prompted symbolic-state interface rather than learned latent/frame weights.',
      boundary_zh: '与 L4 的核心区别在于接口：L1 是在符号/文本状态上做提示推理，而非训练端到端状态转移网络。',
      case_en: 'Case A (Wall): Often respects semantic rules initially, but coordinate arithmetic drifts across 20+ steps. Case B (Boulder): Qualitative effects described plausibly, metric geometry ungrounded.',
      case_zh: '案例 A（墙壁）：短程能理解“墙不可穿过”的语义，但多步坐标加减易出错。案例 B（推石）：能写出定性后果描述，缺乏精确几何与动量守恒约束。',
      pipe: ['(s_t, a_t)', 'Prompt Context', 'LLM Call', 'JSON s_{t+1}', 'Text / UI'],
      highlightIdx: 2,
      metrics: [38, 88, 45, 30, 22],
      anchors: [
        { label: 'RAP', id: null },
        { label: 'ByteSized32-State-Prediction', id: null },
        { label: 'GlobeBench (Eval)', id: '2610.22708' },
      ],
    },
    {
      id: 'L2',
      core: true,
      name_en: 'Agent-built code world models',
      name_zh: '智能体构建的代码世界模型',
      mini_en: 'Synthesized world program + deterministic executor',
      mini_zh: '自动合成世界程序 + 执行器权威推演（综述核心）',
      summary_en: 'The core subject of this survey. An LLM, coding agent, or program-induction loop writes an executable world program (from specifications, trajectories, or active exploration), and an executor runs it to compute s_{t+1}. Adding a neural video renderer on top stays L2 whenever the program alone decides s_{t+1} and the video model only renders it.',
      summary_zh: '本综述最核心的研究对象。由 LLM、编码智能体或程序归纳算法从文本规格、历史轨迹或交互探索中自动写出可执行世界程序，交由执行器算出每一帧新状态 s_{t+1}。即使上层叠加神经视频渲染器，只要程序单独决定下一状态、视频模型只负责绘制画面，系统仍属于 L2。',
      executor_en: 'Python / DSL / Physics / Whitebox runtime',
      executor_zh: 'Python / 领域 DSL / 物理或白模沙箱执行器',
      rule_source_en: 'Induced from interaction/video or synthesized from specs by coding agents',
      rule_source_zh: '编码智能体从交互轨迹归纳或从多模态规格合成',
      state_en: 'Authoritative programmatic variables, entities & 3D proxies',
      state_zh: '权威程序变量、持久实体账本与 3D 几何代理',
      boundary_en: 'One-way neural video rendering (o_t = R_θ(Π(s_t, v_t))) remains L2 because rendering errors cannot mutate state.',
      boundary_zh: '单向神经渲染（o_t = R_θ(Π(s_t, v_t))）仍属 L2，因为渲染误差不会反向篡改程序持有的权威状态。',
      case_en: 'Case A (Wall): Synthesized collision check blocks wall penetration across arbitrary horizons. Case B (Boulder): Displaced boulder coordinates persist in program memory across camera turns and drive consistent re-rendering.',
      case_zh: '案例 A（墙壁）：合成的碰撞逻辑在任意长步数内严格阻挡穿墙。案例 B（推石）：巨石位移后的精确三维坐标持久保存在程序状态中，相机移开再回看依然原位重现。',
      pipe: ['(s_t, a_t)', 'Agent-Synthesized Code', 'Executor F', 'Authoritative s_{t+1}', 'Π(s) → R_θ'],
      highlightIdx: 1,
      metrics: [92, 80, 95, 84, 86],
      anchors: [
        { label: 'WorldCoder', id: '2402.12275' },
        { label: 'GIF-MCTS', id: '2405.15383' },
        { label: 'Twin', id: '2608.14490' },
        { label: 'Code World Model', id: '2608.25927' },
        { label: 'Programmable WM', id: '2609.10540' },
        { label: 'State World Models', id: '2610.26811' },
        { label: 'AgentGarten', id: '2610.12374' },
        { label: 'VibeWorlding', id: '2608.15265' },
      ],
    },
    {
      id: 'L3',
      core: true,
      name_en: 'Shared code + learned dynamics',
      name_zh: '代码与学习模型共享动力学',
      mini_en: 'Co-governed s_{t+1} with persistent state writeback',
      mini_zh: '代码与神经模型共同演化状态并持久写回（核心前沿）',
      summary_en: 'A system belongs to L3 only when executable code and a learned model each decide part of what happens next, AND those learned decisions carry forward into future persistent state—for instance, code governs high-level rules while a generative model resolves complex motion or newly generated visual entities are registered back into the code state table.',
      summary_zh: '仅当可执行代码与学习模型各自决定下一状态的一部分，且学习模型产生的变化被写回持久状态并影响后续步骤时，系统才属于 L3。例如：代码管理规则与事件，学习模型补全复杂接触或新涌现的视觉物体，并将其注册回代码维护的世界状态表。',
      executor_en: 'Coupled code runtime + generative model with writeback',
      executor_zh: '代码执行器 + 带状态写回通道的生成式模型',
      rule_source_en: 'Programmatic rules + learned generative priors with registration',
      rule_source_zh: '显式程序规则 + 生成式先验联合演化与写回',
      state_en: 'Extensible hybrid state table / 3D memory updated by both sides',
      state_zh: '由代码推演与观测反注册共同更新的可扩展持久状态',
      boundary_en: 'Strict bar: candidate systems must verify that learned outputs actually mutate persistent state (Genie 4 is kept unlabeled).',
      boundary_zh: '严格判据：必须确认生成侧输出真正改变了后续持久状态（内部表示未公开的 Genie 4 不靠猜测归入此类）。',
      case_en: 'Case A (Wall): Code enforces hard wall bounds while learned dynamics can introduce destructible debris if written back. Case B (Boulder): Code tracks object identity while learned model resolves fine granular/fluid interaction and writes updated pose back.',
      case_zh: '案例 A（墙壁）：代码保证硬边界约束，同时允许生成侧产生受控局部变化并写回。案例 B（推石）：代码维护持久对象身份，生成模型解析细粒度接触或新出现实体并同步回状态账本。',
      pipe: ['(s_t, a_t)', 'Code Rules ⇄ Gen Model', 'Writeback', 'Hybrid s_{t+1}', 'Interactive o_{t+1}'],
      highlightIdx: 1,
      metrics: [72, 86, 82, 94, 68],
      anchors: [
        { label: 'Oneira (Writeback)', id: '2610.01614' },
        { label: 'UniState', id: null },
        { label: 'WorldRuler', id: '2611.24869' },
        { label: 'GameWM (Candidate)', id: '2611.19247' },
      ],
    },
    {
      id: 'L4',
      core: false,
      name_en: 'Learned neural dynamics',
      name_zh: '纯学习型神经动力学',
      mini_en: 'Neural net computes s_{t+1} over frames or structured state',
      mini_zh: '神经网络直接在帧空间或显式结构状态上预测转移',
      summary_en: 'A neural network computes the next state directly—working either over frame history (GameNGen) or over explicit structured state such as 3D occupancy grids (PlayGen2) or shared multi-player typed tensors (MASS). Not equivalent to “no state”, and valuable where hand-coding rules is impractical, though harder to audit or steer under out-of-distribution interventions.',
      summary_zh: '由神经网络直接计算下一状态——既包括在图像帧历史上的自回归/扩散模型（如 GameNGen），也包括在显式结构化状态（如 PlayGen2 的 3D 占据网格、MASS 的多人类型化状态）上用神经网络更新状态的方法。L4 不等于“无状态”，但在分布外干预下较难审计与精确编辑规则。',
      executor_en: 'End-to-end neural forward pass (diffusion / transformer)',
      executor_zh: '神经网络前向推理（扩散模型 / 自回归 Transformer）',
      rule_source_en: 'Implicitly fit from large-scale video or state-action datasets',
      rule_source_zh: '从大规模交互录像或轨迹数据中端到端拟合',
      state_en: 'Frame KV-cache / latent tokens OR explicit neural-updated 3D/typed state',
      state_zh: '帧历史隐状态，或由神经网络更新的显式 3D/类型化状态',
      boundary_en: 'Explicit state ≠ code: PlayGen2 and MASS maintain explicit state but update it with neural networks, so they sit in L4.',
      boundary_zh: '显式状态 ≠ 代码：PlayGen2 与 MASS 虽维护显式状态，但状态转移由神经网络计算，故属于 L4。',
      case_en: 'Case A (Wall): Under unusual camera angles or sustained pressing, character may clip through walls or morph geometry. Case B (Boulder): Pushed boulder can vanish or change size after leaving and re-entering the camera frustum.',
      case_zh: '案例 A（墙壁）：在非常规视角或持续推挤下可能穿墙或场景形变。案例 B（推石）：巨石移出视野再转回时容易发生位置漂移、尺寸突变或凭空消失。',
      pipe: ['(h_t, a_t)', 'Learned Weights θ', 'Neural Step', 'Latent / Grid s_{t+1}', 'Decoded Frame'],
      highlightIdx: 1,
      metrics: [20, 95, 42, 96, 74],
      anchors: [
        { label: 'GameNGen', id: null },
        { label: 'PlayGen2', id: null },
        { label: 'MASS', id: null },
        { label: 'FlipTest (Eval)', id: '2611.19822' },
        { label: 'WorldProbe (Eval)', id: '2610.39721' },
      ],
    },
  ];

  const TELEMETRY_LABELS = {
    en: ['Rule Verifiability', 'Zero Hand-Authoring', 'Long-Horizon Persistence', 'Open Visual Coverage', 'Runtime Step Speed'],
    zh: ['规则可验证性', '免人工手写规则', '长程状态持久性', '开放视觉表现力', '单步运行效率'],
  };

  const PITFALLS = [
    {
      badge: 'Pitfall 01 · L2 vs. L3',
      title_en: 'Code + Video Model ≠ L3',
      title_zh: '“代码 + 视频渲染模型”不等于 L3',
      desc_en: 'Systems like CWM, PWM, and AgentGarten pair executable code with a neural video model yet belong to L2: the program alone computes s_{t+1}, while the video model only renders observations.',
      desc_zh: 'CWM、PWM、AgentGarten 虽然结合了代码与视频生成模型，但仍属于 L2：只要代码单独决定下一状态 s_{t+1}、视频模型只负责单向渲染，就不构成共享动力学。',
    },
    {
      badge: 'Pitfall 02 · L2 vs. L4',
      title_en: 'Explicit State ≠ Executable Code',
      title_zh: '“维护显式状态”不等于运行代码',
      desc_en: 'PlayGen2 (3D occupancy + entities) and MASS (shared typed state) maintain explicit structured state, but compute state updates via learned neural networks—placing them in L4, not L2.',
      desc_zh: 'PlayGen2（3D 体素网格与实体）和 MASS（多人共享类型化状态）都持有显式结构化状态，但状态更新由神经网络计算而非执行程序，因此属于 L4。',
    },
    {
      badge: 'Pitfall 03 · Epistemic Discipline',
      title_en: 'No Guesswork on Closed Systems',
      title_zh: '不对闭源内部机制做猜测归类',
      desc_en: 'When public descriptions do not disclose internal state representation (e.g., Genie 4 pairing live Gemini reasoning with video generation), we treat the system as an unlabeled external reference.',
      desc_zh: '对于未公开内部状态表示与转移机制的系统（如结合实时指令推理与视频生成的 Genie 4），综述将其作为无标签外部对照，拒绝靠猜测贴标签。',
    },
  ];

  // Interactive Split-Comparison Cases
  const CASES = {
    caseA: {
      tab_en: 'Case A · Character & Wall',
      tab_zh: '案例 A · 角色与墙壁碰撞',
      url: 'sim://interactive-rollout/case-a-wall-collision',
      left_title_en: 'L4 Pixel-Only Rollout (t = 24)',
      left_title_zh: 'L4 纯像素帧预测（第 24 步）',
      left_status_en: 'Constraint Violation · Wall Clipping',
      left_status_zh: '几何约束失效 · 持续前推导致穿墙',
      left_desc_en: 'When the player repeatedly presses FORWARD against a solid wall, pixel-history diffusion lacks an explicit collision invariant: texture blurs and the character hallucinates through into an invented corridor.',
      left_desc_zh: '当玩家对着墙壁连续输入前进动作时，纯像素模型缺少硬几何不变量：局部纹理在重绘中模糊变形，角色穿墙进入幻觉生成的走廊。',
      left_code: `// Implicit latent history h_24\naction = "MOVE_FORWARD" (x12)\nlatent_drift = 0.41  // high!\n// No explicit wall boundary check:\nframe_24 = DiffusionStep(h_23, action)\n// Result: wall dissolves, pos aliased`,
      right_title_en: 'L2 Code World Model (t = 24)',
      right_title_zh: 'L2 代码世界模型（第 24 步）',
      right_status_en: 'Invariant Preserved · Exact Stop',
      right_status_zh: '可执行碰撞不变量 · 零累积漂移',
      right_desc_en: 'The executor checks tile/mesh occupancy before updating player_pos. Even after 100 blocked actions, authoritative state stays exact while Π(s_t) anchors the neural renderer.',
      right_desc_zh: '执行器在更新坐标前运行确定性碰撞检测；即使连续 100 次撞墙动作，权威状态零漂移，导出的几何代理 Π(s_t) 稳稳锚定神经渲染画面。',
      right_code: `state.tick = 24\ncandidate = state.pos + Vec3(0, 0, 1)\nif not world.collides(candidate):\n    state.pos = candidate  # blocked!\nproxy = emit_depth_normal(state, cam)\nframe_24 = Renderer(proxy, ref_x0)  # crisp ✓`,
    },
    caseB: {
      tab_en: 'Case B · Bulldozer & Boulder',
      tab_zh: '案例 B · 推土机推石与跨遮挡回看',
      url: 'sim://interactive-rollout/case-b-occlusion-persistence',
      left_title_en: 'L4 Pixel-Only Rollout (t = 40)',
      left_title_zh: 'L4 纯像素帧预测（第 40 步回看）',
      left_status_en: 'Object Permanence Lost on Revisit',
      left_status_zh: '跨视野遗忘 · 转头回看巨石消失',
      left_desc_en: 'After pushing a boulder to (x=6.2, z=-3.0), panning the camera 180° away for 15 seconds evicts the boulder from visual context; turning back yields empty ground or a rescaled rock.',
      left_desc_zh: '推土机将巨石推至新位置并阻止后续通行，但当相机转开 15 秒再转回时，超出注意力窗口的巨石从画面中消失或尺寸剧变。',
      left_code: `// KV-cache window = 16 frames\n// Boulder left frustum at t = 19\ncam_yaw = +180° -> -180° (t = 40)\n// Boulder absent from recent frames:\nframe_40 = DiffusionStep(recent_frames)\n// Result: boulder forgotten!`,
      right_title_en: 'L2 / L3 Code World Model (t = 40)',
      right_title_zh: 'L2 / L3 代码世界模型（第 40 步回看）',
      right_status_en: 'Persistent Entity Ledger + Future Constraint',
      right_status_zh: '持久实体账本 · 遮挡再现与路径阻断一致',
      right_desc_en: 'The displaced boulder pose (6.2, 0.0, -3.0) persists in authoritative state regardless of camera view, blocking future paths there and re-projecting accurately whenever revisited.',
      right_desc_zh: '巨石被推开后的三维位姿持久存储在代码状态账本中，既真实阻断后续经过该处的动作，也能在任意时刻转回相机时精确重投影渲染。',
      right_code: `state.entities["boulder_01"] = {\n  "pos": (6.20, 0.00, -3.00),\n  "mass": 450.0, "blocking": True\n}\n# At t = 40, camera turns back:\nproxy = project_obb(state.entities, cam_40)\nframe_40 = Renderer(proxy, memory_bank) # exact ✓`,
    },
    caseC: {
      tab_en: 'Runtime Rule Intervention',
      tab_zh: '运行时反事实规则编辑',
      url: 'sim://interactive-rollout/counterfactual-rule-edit',
      left_title_en: 'L4 Prompted Video Edit',
      left_title_zh: 'L4 文本提示改规则',
      left_status_en: 'Visual Prior Overrides New Rule',
      left_status_zh: '预训练视觉先验压制反事实规则',
      left_desc_en: 'Prompting “switches now invert gravity” or “red doors require two lever pulls” fails to override strong visual training priors—doors open on the first pull or appearance leaks.',
      left_desc_zh: '用文本提示要求“拉杆需拉两次才开门”或“反转局部重力”时，视频模型的预训练视觉先验往往直接无视离散计数或反事实物理参数。',
      left_code: `prompt = "Door opens only on 2nd pull"\npull_count = ??? // unrepresented in pixels\n// Video prior sees lever pulled -> opens door\n// Strict counterfactual pair: FAILS`,
      right_title_en: 'L2 Editable World Program',
      right_title_zh: 'L2 可编辑世界程序',
      right_status_en: 'Surgical Rule Patch · Unaffected State Intact',
      right_status_zh: '精准修改规则代码 · 其余世界状态完整保留',
      right_desc_en: 'Editing one condition in step() updates causal mechanics immediately while preserving unaffected entities, layouts, and appearance memory.',
      right_desc_zh: '直接对世界程序的 step() 施加局部补丁即可立即切换隐藏计数锁或反事实重力，同时完整保留其余实体状态与外观记忆。',
      right_code: ` patch(world.rules, "door_unlock"):\n-  if state.lever_pulls >= 1:\n+  if state.lever_pulls >= 2:\n       state.door_open = True\n# Counterfactual twin A/B verified ✓`,
    },
  };

  // Observation Contracts (Verbatim from Overleaf sections/05-observation.tex Table 1)
  const OBS_REGIMES = [
    {
      group_en: 'I. One-Way Rendering from Programmatic or Engine State (L2 Core)',
      group_zh: 'I. 由程序或引擎权威状态驱动的单向渲染（主体属 L2）',
      rows: [
        { method: 'Code World Model (CWM)', id: '2608.25927', upstream: 'Executable code', cond: 'Coarse RGB proxy', role: 'Appearance & motion', fb: 'Visual history' },
        { method: 'Programmable WM (PWM)', id: '2609.10540', upstream: 'Engine 3D OBBs', cond: 'Projected 3D maps', role: 'Motion completion', fb: 'Appearance memory' },
        { method: 'GameWM', id: '2611.19247', upstream: 'Game engine', cond: 'Depth / semantic proxy', role: 'Motion completion', fb: 'Visual history' },
        { method: 'BoxWorld', id: '2610.36371', upstream: 'Async. engine', cond: '2D boxes & status', role: 'State rendering', fb: 'Visual history' },
        { method: 'CWM 2.0 (Invoker-Render)', id: '2611.22925', upstream: 'Structured scene', cond: 'Multi-scale proxy', role: 'Motion completion', fb: 'Visual history' },
        { method: 'AgentGarten', id: '2610.12374', upstream: 'Code worlds', cond: 'Depth / surface normals', role: 'State rendering (36.5 fps)', fb: 'Action-mediated' },
      ],
    },
    {
      group_en: 'II. Learned Explicit-State Rendering (Neural Dynamics · L4)',
      group_zh: 'II. 显式结构化状态的神经动力学渲染（L4 对照）',
      rows: [
        { method: 'MASS', id: null, upstream: 'Learned typed state', cond: 'Camera-local tensor', role: 'Feed-forward RGB', fb: 'None' },
        { method: 'PlayGen2', id: null, upstream: 'Learned 3D grid', cond: 'Depth / semantic maps', role: 'State rendering', fb: 'Visual history' },
      ],
    },
    {
      group_en: 'III. Observation-to-World Feedback (Registration & Writeback · L2/L3)',
      group_zh: 'III. 观测到世界状态的反馈注册与写回（L2 外观回写 / L3 状态写回）',
      rows: [
        { method: 'CoDeR', id: '2609.26458', upstream: 'Three.js whitebox', cond: 'Whitebox & depth', role: 'Appearance painting', fb: 'Surface color memory' },
        { method: 'UniState', id: null, upstream: '3D latent memory', cond: '3D latents & edits', role: 'Motion & contact', fb: 'State writeback (L3)' },
        { method: 'Oneira', id: '2610.01614', upstream: 'Agent world table', cond: 'Box-edit proxy', role: 'Motion & new objects', fb: 'State writeback (L3)' },
        { method: 'WorldRuler', id: '2611.24869', upstream: '3D rule graph', cond: 'Geometry & masks', role: 'Local attribute control', fb: 'State writeback (L3)' },
      ],
    },
  ];

  // Evaluation Obligations (Verbatim from Overleaf tables/evaluation-obligations.tex + §7 B1-B4)
  const EVAL_OBLIGATIONS = [
    {
      name_en: '1. Executable validity',
      name_zh: '1. 可执行合法性（Executable validity）',
      proves_en: 'Does the generated artifact run and respect its interface? Checked via sandbox execution tests and local state invariants.',
      proves_zh: '生成的程序能否在沙箱中无错运行并满足接口契约？通过执行测试与局部状态不变量检验。',
      not_en: 'Correct domain rules or correspondence to any external target environment.',
      not_zh: '规则本身是否正确，或是否与目标外部环境一致。',
      target: 'worldcoder',
    },
    {
      name_en: '2. Mechanism fidelity',
      name_zh: '2. 机制保真度（Mechanism fidelity）',
      proves_en: 'Does modeled behavior match empirical evidence or specifications across held-out transitions, multi-step rollouts, and interventions?',
      proves_zh: '模型在留出状态转移、多步推演与反事实干预下是否符合真实环境证据或给定规格？',
      not_en: 'A faithful generated visual observation of that underlying behavior.',
      not_zh: '神经渲染器生成的视觉画面是否忠实呈现了该状态变化。',
      target: 'worldcoder',
    },
    {
      name_en: '3. Observation adherence',
      name_zh: '3. 观测遵循度（Observation adherence）',
      proves_en: 'Does rendered output depict executed states and events? Checked via synchronized program logs and calibrated view-aware readouts.',
      proves_zh: '渲染出的视频是否如实呈现了程序执行的状态与事件？通过同步事件日志与视角感知读出检验。',
      not_en: 'Identification or discovery of unknown environment dynamics.',
      not_zh: '系统能否自主归纳未知环境的底层动力学。',
      target: 'code_as_world',
    },
    {
      name_en: '4. Decision utility',
      name_zh: '4. 决策与学习收益（Decision utility）',
      proves_en: 'Does using the world model improve planning, control, or agent training under a matched total compute/interaction budget?',
      proves_zh: '在同等算力与交互预算下，引入该世界模型是否真正提升了下游智能体的规划、控制或训练表现？',
      not_en: 'Accuracy on unqueried state variables or untested horizons (see Play-Adequacy vs. Prediction-Accuracy).',
      not_zh: '未涉及状态字段的预测精度或超长未测步数下的全局精确性。',
      target: 'vibeworlding',
    },
    {
      name_en: '5. Revision reliability',
      name_zh: '5. 修订可靠性（Revision reliability）',
      proves_en: 'Does a runtime edit or counterexample patch satisfy its new requirement while preserving previously validated behaviors?',
      proves_zh: '面对新反例或指令编辑时，局部程序修订在满足新需求的同时是否不破坏已验证的旧行为（无回归退化）？',
      not_en: 'Correctness on every future edit or unseen structural shift.',
      not_zh: '未来任意编辑或未见结构剧变下的普适正确性。',
      target: 'vibeworlding',
    },
  ];

  const CHAPTERS = [
    { num: '01', en: 'Introduction — Beyond Short Video Generation', zh: '第 1 章 · 引言：从短视频生成走向持久交互世界', desc_en: 'Frames why interactive simulation requires persistence, lawful response to interventions, and consequences that constrain future actions—motivating executable code as world substrate.', desc_zh: '阐明开放交互世界为何不仅需要单帧逼真，更要求持久性、干预一致性与后果约束未来，引出以可执行代码为载体的世界模型。' },
    { num: '02', en: 'Foundations & Dual Research Genealogy', zh: '第 2 章 · 形式化基础与双脉络谱系', desc_en: 'Defines s_{t+1} ~ F(s_t, a_t) and o_t = R_θ(Π(s_t, v_t)), four core primitives (world program, executor, program source, authoritative state), Case A/B diagnostics, and unites planning-agent program induction with visual world engines.', desc_zh: '定义状态转移与条件渲染方程、四个核心原语（世界程序、执行器、程序来源、权威状态）及诊断案例 A/B，弥合规划程序归纳与视觉世界生成两条传统。' },
    { num: '03', en: 'World Modeling Paradigms (L0–L4 Spectrum)', zh: '第 3 章 · 世界建模五层范式（L0–L4）', desc_en: 'Sorts simulators from hand-written engines (L0) and direct LLM predictors (L1) to agent-built code world models (L2), shared code+learned dynamics (L3), and learned neural dynamics (L4), clarifying three boundary pitfalls.', desc_zh: '按“谁计算下一状态及规则来源”划分 L0–L4 五层范式，并澄清“代码+视频≠L3”“显式状态≠代码”等三大分类边界误区。' },
    { num: '04', en: 'World Representation and Execution', zh: '第 4 章 · 世界表示与程序执行机制', desc_en: 'Compares implicit, explicit, and programmatic representations (Python, PDDL, scene graphs, USD/Blender/MuJoCo DSLs), hybrid execution loops, and state authority conflict resolution.', desc_zh: '深入比较隐式、显式与程序化状态表示（Python、PDDL、场景图、三维引擎 DSL），以及混合系统中的状态权威与冲突消解。' },
    { num: '05', en: 'Observation Models and Rendering Interfaces', zh: '第 5 章 · 观测模型与条件神经渲染接口', desc_en: 'Analyzes projection c_t = Π(s_t, v_t), generative motion/appearance completion, structural fidelity failure modes (source leakage, scaffolding paradox), and Regimes I–III feedback paths.', desc_zh: '剖析代理投影 Π(s_t, v_t)、运动与外观补全、脚手架悖论与源泄漏等失真模式，以及单向渲染到状态写回的三类反馈体制。' },
    { num: '06', en: 'State Update, Program Learning & Revision', zh: '第 6 章 · 状态更新、程序获取与迭代修订', desc_en: 'Covers specification-driven synthesis, trajectory/video induction, active identifiability experiments, counterexample-guided patching, and wake-sleep / RL training.', desc_zh: '涵盖从文本规格合成、从观测轨迹归纳、主动消歧实验、反例驱动补丁修复以及执行/渲染反馈强化学习。' },
    { num: '07', en: 'Evaluation Hierarchy (B1–B4) & Obligations', zh: '第 7 章 · 评测层级（B1–B4）与五项证据义务', desc_en: 'Organizes 26 benchmarks across B1 (visual realization), B2 (executable interactive worlds), B3 (causal dynamics), and B4 (online adaptation), auditing changed-field metrics and judge calibration.', desc_zh: '按视觉实现（B1）、可执行交互世界（B2）、因果动力学（B3）与在线适应（B4）梳理评测基准，审视静态字段虚高与视觉裁判校准问题。' },
    { num: '08', en: 'Open Challenges & Future Directions', zh: '第 8 章 · 开放挑战与未来方向', desc_en: 'Examines deciding what to write as code vs. learn, visual program induction without ground-truth states, open-ended world expansion, code–video co-adaptation, and sub-100ms real-time interaction.', desc_zh: '探讨代码与学习边界划分、无真值视觉程序归纳、开放世界持续扩展、代码—渲染器双向共适应与实时交互缩放。' },
    { num: '09', en: 'Conclusion', zh: '第 9 章 · 结语', desc_en: 'Synthesizes design principles for controllable, auditable, and visually rich interactive world models.', desc_zh: '总结可控、可审计且兼具高表现力的交互式代码世界模型设计原则。' },
  ];

  function t(key) {
    return (I18N[STATE.lang] && I18N[STATE.lang][key]) || I18N.en[key] || key;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.remove('show'), 2100);
  }

  function fallbackCopyText(text, label) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast(STATE.lang === 'zh' ? `已复制 ${label}` : `Copied ${label}`);
    } catch (err) {
      showToast(STATE.lang === 'zh' ? `复制失败: ${label}` : `Copy failed: ${label}`);
    }
  }

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(STATE.lang === 'zh' ? `已复制 ${label}` : `Copied ${label}`);
      }).catch(() => fallbackCopyText(text, label));
    } else {
      fallbackCopyText(text, label);
    }
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function syncLangFromInternal(lang) {
    const next = lang === 'zh' ? 'zh' : 'en';
    if (window.PWM_SHELL && window.PWM_SHELL.lang !== next) {
      window.PWM_SHELL.setLang(next);
      return;
    }
    if (STATE.lang !== next) {
      STATE.lang = next;
      localStorage.setItem('pwm-language', next);
      localStorage.setItem('cwm_lang', next);
      renderAll();
    }
  }

  function syncThemeFromInternal(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    if (window.PWM_SHELL && window.PWM_SHELL.theme !== next) {
      window.PWM_SHELL.setTheme(next);
      return;
    }
    if (STATE.theme !== next) {
      STATE.theme = next;
      localStorage.setItem('pwm-theme', next);
      localStorage.setItem('cwm_theme', next);
      applyRootPrefs();
      if (ATLAS.redraw) ATLAS.redraw();
    }
  }

  function mountExtraNavControls() {
    const slot = document.getElementById('pwmExtraNavSlot');
    if (!slot) return;
    slot.innerHTML = `
      <button type="button" class="pwm-pill pill-btn nav-cmd-btn" id="openCmdBtn" title="Quick search (⌘K)">
        <span class="cmd-label" style="color:var(--aui-muted)" data-i18n="search_short">Search...</span>
        <span class="kbd">⌘K</span>
      </button>
      <button type="button" class="pwm-pill pill-btn nav-style-btn" id="styleToggleBtn" title="Switch Clean / Classic UI geometry">
        <span class="style-prefix" style="color:var(--aui-muted)" data-i18n="style_prefix">Style:</span>
        <strong id="styleLabel">Clean</strong>
      </button>
    `;
  }

  // Apply Theme, Style, Language
  function applyRootPrefs() {
    document.documentElement.setAttribute('data-theme', STATE.theme);
    document.documentElement.setAttribute('data-style', STATE.style);
    document.documentElement.classList.toggle('zh', STATE.lang === 'zh');
    document.documentElement.lang = STATE.lang === 'zh' ? 'zh-CN' : 'en';
    document.title = STATE.lang === 'zh'
      ? '01 · 文献综述与点阵图谱 — Program World Model'
      : '01 · Survey & Dot Atlas — Program World Model';

    const styleLabelEl = document.getElementById('styleLabel');
    if (styleLabelEl) {
      styleLabelEl.textContent = STATE.style === 'clean' ? 'Clean' : 'Classic';
    }

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (I18N[STATE.lang][k]) el.textContent = I18N[STATE.lang][k];
    });

    const ids = [
      'heroPillText', 'heroTitle', 'heroSub',
      'heroPrimaryCta', 'heroSecondaryCta', 'pEyebrow', 'pTitle', 'pDesc',
      'axisLeft', 'axisRight', 'cEyebrow', 'cTitle', 'cDesc',
      'cmpLeftBadge', 'cmpHint', 'cmpRightBadge', 'fEyebrow', 'fTitle', 'fDesc',
      'oEyebrow', 'oTitle', 'oDesc', 'libEyebrow', 'libTitle', 'libDesc',
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t(id);
    });

    const searchInputEl = document.getElementById('searchInput');
    if (searchInputEl) searchInputEl.placeholder = t('searchPlaceholder');

    const cmdInputEl = document.getElementById('cmdInput');
    if (cmdInputEl) cmdInputEl.placeholder = t('cmdPlaceholder');

    const statTotalEl = document.getElementById('statTotal');
    if (statTotalEl) statTotalEl.textContent = DATA.total_sources;

    const statCutoffEl = document.getElementById('statCutoff');
    if (statCutoffEl) statCutoffEl.textContent = DATA.literature_cutoff;
  }

  // Render Section 1: L0-L4 Spectrum
  function renderParadigms() {
    const zh = STATE.lang === 'zh';
    const rail = document.getElementById('spectrumRail');
    rail.innerHTML = PARADIGMS.map((p) => {
      const active = p.id === STATE.activeLayer ? 'active' : '';
      const coreClass = p.core ? 'is-core' : '';
      const coreBadge = p.core
        ? `<span class="badge sand">${zh ? '核心范畴' : 'Survey Core'}</span>`
        : `<span class="badge">${zh ? '谱系参照' : 'Spectrum'}</span>`;
      return `
        <button type="button" role="tab" aria-selected="${p.id === STATE.activeLayer}" class="layer-tab ${active} ${coreClass}" data-layer="${p.id}">
          <div class="layer-tab-top">
            <span class="layer-code">${p.id}</span>
            ${coreBadge}
          </div>
          <div class="layer-name">${escapeHtml(zh ? p.name_zh : p.name_en)}</div>
          <div class="layer-mini">${escapeHtml(zh ? p.mini_zh : p.mini_en)}</div>
        </button>
      `;
    }).join('');

    rail.querySelectorAll('[data-layer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        STATE.activeLayer = btn.getAttribute('data-layer');
        renderParadigms();
      });
    });

    const cur = PARADIGMS.find((p) => p.id === STATE.activeLayer) || PARADIGMS[2];
    const labels = TELEMETRY_LABELS[STATE.lang];
    const stage = document.getElementById('inspectorStage');

    const anchorsHtml = cur.anchors.map((a) => {
      if (a.id && PAPERS_BY_ID[a.id]) {
        return `<button type="button" class="anchor-chip clickable" data-open-paper="${a.id}"><span>${escapeHtml(a.label)}</span><span style="opacity:0.55">↗</span></button>`;
      }
      return `<span class="anchor-chip">${escapeHtml(a.label)}</span>`;
    }).join('');

    const pipeHtml = cur.pipe.map((step, i) => {
      const node = `
        <div class="pipe-node ${i === cur.highlightIdx ? 'highlight' : ''}">
          <div class="pipe-node-lbl">${i === 0 ? 'Input' : i === 1 ? 'Rules' : i === 2 ? 'Compute' : i === 3 ? 'State' : 'View'}</div>
          <div class="pipe-node-val">${escapeHtml(step)}</div>
        </div>
      `;
      return i < cur.pipe.length - 1 ? node + '<span class="pipe-arrow">→</span>' : node;
    }).join('');

    const barsHtml = cur.metrics.map((val, idx) => `
      <div class="tbar-row tabular">
        <span style="color:var(--aui-secondary)">${escapeHtml(labels[idx])}</span>
        <div class="tbar-track"><div class="tbar-fill ${cur.core ? 'sand' : ''}" style="width:${val}%"></div></div>
        <span class="mono" style="text-align:right;color:var(--aui-muted)">${val}%</span>
      </div>
    `).join('');

    const jumpBtn = (cur.id === 'L2' || cur.id === 'L3')
      ? `<button type="button" class="pill-btn primary" data-filter-paradigm="${cur.id}">${zh ? `在文献库中筛选 ${cur.id} 相关论文 →` : `Filter ${cur.id} papers in library →`}</button>`
      : '';

    stage.innerHTML = `
      <div>
        <div class="stage-title-row">
          <span class="badge ${cur.core ? 'sand' : 'blue'} mono">${cur.id}</span>
          <h3 class="stage-h3">${escapeHtml(zh ? cur.name_zh : cur.name_en)}</h3>
        </div>
        <p class="stage-summary">${escapeHtml(zh ? cur.summary_zh : cur.summary_en)}</p>
        <div class="kv-grid">
          <div class="kv-box">
            <div class="kv-label">${zh ? '谁计算 s_{t+1}（执行器）' : 'Transition Executor'}</div>
            <div class="kv-val">${escapeHtml(zh ? cur.executor_zh : cur.executor_en)}</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${zh ? '规则来源（Program Source）' : 'Rule / Program Source'}</div>
            <div class="kv-val">${escapeHtml(zh ? cur.rule_source_zh : cur.rule_source_en)}</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${zh ? '状态表示（Authoritative State）' : 'State Representation'}</div>
            <div class="kv-val">${escapeHtml(zh ? cur.state_zh : cur.state_en)}</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${zh ? '关键分类边界' : 'Key Classification Boundary'}</div>
            <div class="kv-val">${escapeHtml(zh ? cur.boundary_zh : cur.boundary_en)}</div>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:11.5px;color:var(--aui-muted);margin-bottom:6px;">${zh ? '代表性系统与基准（点击蓝框条目查看文献详情）：' : 'Representative systems & anchors (click corpus entries to inspect):'}</div>
          <div class="anchor-row">${anchorsHtml}</div>
        </div>
        ${jumpBtn}
      </div>

      <div class="stage-right">
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--aui-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;">
            ${zh ? '单步因果数据流' : 'Step Transition Dataflow'}
          </div>
          <div class="pipeline-diagram">${pipeHtml}</div>
        </div>

        <div>
          <div style="font-size:11px;font-weight:600;color:var(--aui-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">
            ${zh ? '范式特性权衡剖面（示意）' : 'Design Trade-off Profile'}
          </div>
          <div class="telemetry-bars">${barsHtml}</div>
        </div>

        <div class="case-callout">
          <strong style="color:var(--aui-ink)">${zh ? '诊断案例表现：' : 'Diagnostic Cases: '}</strong>
          ${escapeHtml(zh ? cur.case_zh : cur.case_en)}
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-open-paper]').forEach((btn) => {
      btn.addEventListener('click', () => openPaperModal(btn.getAttribute('data-open-paper')));
    });
    stage.querySelectorAll('[data-filter-paradigm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-filter-paradigm');
        clearFilterState();
        STATE.paradigmFilter = val === 'L3' ? 'L3' : 'L2';
        renderLibrary();
        document.getElementById('library').scrollIntoView({ behavior: 'smooth' });
      });
    });

    const pitfallsGrid = document.getElementById('pitfallsGrid');
    pitfallsGrid.innerHTML = PITFALLS.map((pf) => `
      <div class="bento-card">
        <div><span class="badge mono">${escapeHtml(pf.badge)}</span></div>
        <h4>${escapeHtml(zh ? pf.title_zh : pf.title_en)}</h4>
        <p>${escapeHtml(zh ? pf.desc_zh : pf.desc_en)}</p>
      </div>
    `).join('');
  }

  // Render Section 2: Split Comparison
  function renderComparison() {
    const zh = STATE.lang === 'zh';
    const tabsEl = document.getElementById('caseTabs');
    tabsEl.innerHTML = Object.entries(CASES).map(([key, c]) => `
      <button type="button" class="utab ${STATE.activeCase === key ? 'active' : ''}" data-case="${key}">
        ${escapeHtml(zh ? c.tab_zh : c.tab_en)}
      </button>
    `).join('');

    tabsEl.querySelectorAll('[data-case]').forEach((btn) => {
      btn.addEventListener('click', () => {
        STATE.activeCase = btn.getAttribute('data-case');
        renderComparison();
      });
    });

    const cur = CASES[STATE.activeCase];
    document.getElementById('cmpUrl').textContent = cur.url;

    const svgLeft = STATE.activeCase === 'caseA'
      ? `<svg width="100%" height="84" viewBox="0 0 760 84" fill="none">
          <line x1="60" y1="42" x2="540" y2="42" stroke="#d97706" stroke-width="2.5" stroke-dasharray="6 5"/>
          <rect x="372" y="10" width="16" height="64" rx="3" fill="rgba(240,68,56,0.22)" stroke="#f04438" stroke-dasharray="3 3"/>
          <circle cx="110" cy="42" r="9" fill="#d97706"/>
          <circle cx="490" cy="42" r="9" fill="#f04438" opacity="0.65"/>
          <text x="398" y="28" fill="#c4320a" font-size="11" font-family="monospace">wall dissolves → clips through (x=490)</text>
        </svg>`
      : STATE.activeCase === 'caseB'
      ? `<svg width="100%" height="84" viewBox="0 0 760 84" fill="none">
          <rect x="90" y="29" width="32" height="26" rx="4" fill="#d97706"/>
          <line x1="130" y1="42" x2="430" y2="42" stroke="#d97706" stroke-width="2"/>
          <circle cx="465" cy="42" r="15" stroke="#f04438" stroke-width="1.5" stroke-dasharray="4 4"/>
          <text x="492" y="46" fill="#c4320a" font-size="11" font-family="monospace">t=40 revisit: boulder evicted from KV window</text>
        </svg>`
      : `<svg width="100%" height="84" viewBox="0 0 760 84" fill="none">
          <rect x="120" y="24" width="120" height="36" rx="6" stroke="#d97706" stroke-width="1.5"/>
          <text x="140" y="46" fill="#b25e00" font-size="11" font-family="monospace">pull #1</text>
          <line x1="250" y1="42" x2="420" y2="42" stroke="#f04438" stroke-width="2"/>
          <rect x="430" y="20" width="190" height="44" rx="6" fill="rgba(240,68,56,0.12)" stroke="#f04438"/>
          <text x="448" y="46" fill="#c4320a" font-size="11" font-family="monospace">door opens prematurely ✗</text>
        </svg>`;

    const svgRight = STATE.activeCase === 'caseA'
      ? `<svg width="100%" height="84" viewBox="0 0 760 84" fill="none">
          <line x1="60" y1="42" x2="356" y2="42" stroke="#1e8a4f" stroke-width="2.5"/>
          <rect x="372" y="10" width="16" height="64" rx="3" fill="#1e8a4f"/>
          <circle cx="110" cy="42" r="9" fill="#0190fe"/>
          <circle cx="356" cy="42" r="9" fill="#1e8a4f"/>
          <text x="402" y="46" fill="#1e8a4f" font-size="11" font-family="monospace">collides(nxt)==True → exact stop at x=356 ✓</text>
        </svg>`
      : STATE.activeCase === 'caseB'
      ? `<svg width="100%" height="84" viewBox="0 0 760 84" fill="none">
          <rect x="90" y="29" width="32" height="26" rx="4" fill="#0190fe"/>
          <line x1="130" y1="42" x2="430" y2="42" stroke="#1e8a4f" stroke-width="2.5"/>
          <circle cx="465" cy="42" r="15" fill="rgba(30,138,79,0.2)" stroke="#1e8a4f" stroke-width="2"/>
          <text x="492" y="46" fill="#1e8a4f" font-size="11" font-family="monospace">t=40 revisit: OBB (6.2, 0, -3.0) re-projected ✓</text>
        </svg>`
      : `<svg width="100%" height="84" viewBox="0 0 760 84" fill="none">
          <rect x="120" y="24" width="120" height="36" rx="6" stroke="#0190fe" stroke-width="1.5"/>
          <text x="140" y="46" fill="#0068c9" font-size="11" font-family="monospace">pulls == 1 &lt; 2</text>
          <line x1="250" y1="42" x2="420" y2="42" stroke="#1e8a4f" stroke-width="2"/>
          <rect x="430" y="20" width="190" height="44" rx="6" fill="rgba(30,138,79,0.12)" stroke="#1e8a4f"/>
          <text x="448" y="46" fill="#1e8a4f" font-size="11" font-family="monospace">door_open == False (locked) ✓</text>
        </svg>`;

    document.getElementById('splitLeftContent').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <strong>${escapeHtml(zh ? cur.left_title_zh : cur.left_title_en)}</strong>
        <span class="badge amber">${escapeHtml(zh ? cur.left_status_zh : cur.left_status_en)}</span>
      </div>
      <div class="split-scene-viz">${svgLeft}</div>
      <p style="margin:0;font-size:12.5px;line-height:1.55;color:var(--aui-secondary);">
        ${escapeHtml(zh ? cur.left_desc_zh : cur.left_desc_en)}
      </p>
      <pre class="sim-code" style="margin:0;padding:9px 12px;font-size:11px;line-height:1.45;">${escapeHtml(cur.left_code)}</pre>
    `;

    document.getElementById('splitRightContent').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <strong style="color:var(--aui-sand)">${escapeHtml(zh ? cur.right_title_zh : cur.right_title_en)}</strong>
        <span class="badge green">${escapeHtml(zh ? cur.right_status_zh : cur.right_status_en)}</span>
      </div>
      <div class="split-scene-viz" style="border-color:var(--aui-sand-border);">${svgRight}</div>
      <p style="margin:0;font-size:12.5px;line-height:1.55;color:var(--aui-secondary);">
        ${escapeHtml(zh ? cur.right_desc_zh : cur.right_desc_en)}
      </p>
      <pre class="sim-code" style="margin:0;padding:9px 12px;font-size:11px;line-height:1.45;border-color:var(--aui-sand-border);">${escapeHtml(cur.right_code)}</pre>
    `;
  }

  // Render Section 3: 3-Family Showcase
  function renderFamilies() {
    const zh = STATE.lang === 'zh';
    const meta = {
      worldcoder: {
        num: '01',
        paradigm: 'L2 · State-Only Dynamics',
        badgeClass: 'blue',
        diagram: `
          <div class="flank-code" style="font-size:10.5px;">
            s_{t+1}, r_t = prog.step(s_t, a_t)<br>
            <span style="color:var(--aui-muted)"># Transition, planning &amp; repair · No pixel synthesis</span>
          </div>`,
        anchors: ['WorldCoder', 'GIF-MCTS', 'TheoryCoder', 'OneLife', 'EMPIRIC'],
      },
      code_as_world: {
        num: '02',
        paradigm: 'L2 & L3 · Proxy + Neural Render',
        badgeClass: 'sand',
        diagram: `
          <div class="flank-code" style="font-size:10.5px;">
            s_{t+1} = engine.step(s_t, a_t)<br>
            o_{t+1} = VideoModel(Π(s_{t+1}), x_0)
          </div>`,
        anchors: ['Code World Model', 'PWM', 'AgentGarten', 'Oneira', 'State World Models'],
      },
      vibeworlding: {
        num: '03',
        paradigm: 'L2 · Full 3D Scene Code',
        badgeClass: 'teal',
        diagram: `
          <div class="flank-code" style="font-size:10.5px;">
            scene = agent.build_3d(spec, assets)<br>
            <span style="color:var(--aui-muted)"># Blender / USD / MuJoCo / Unreal execution</span>
          </div>`,
        anchors: ['VibeWorlding', 'WorldClaw', 'USDCraft', 'SceneRig', 'Code2Worlds-2'],
      },
    };

    const grid = document.getElementById('familyGrid');
    grid.innerHTML = DATA.sections.map((sec) => {
      const m = meta[sec.id];
      return `
        <article class="family-card">
          <div class="family-preview">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span class="badge ${m.badgeClass} mono">${m.num} · ${m.paradigm}</span>
              <span class="badge mono tabular">${sec.count} ${zh ? '篇' : 'sources'}</span>
            </div>
            ${m.diagram}
            <div class="tag-list">
              ${m.anchors.map((a) => `<span class="tag-chip">${escapeHtml(a)}</span>`).join('')}
            </div>
          </div>
          <div class="family-body">
            <h3>${escapeHtml(zh ? sec.title_zh : sec.title_en)}</h3>
            <p>${escapeHtml(zh ? sec.description_zh : sec.description_en)}</p>
            <div class="family-footer">
              <span style="font-size:11.5px;color:var(--aui-muted)">${zh ? '单主类互斥归属' : 'Mutually exclusive primary family'}</span>
              <button type="button" class="pill-btn" data-jump-section="${sec.id}">${zh ? '浏览该类 →' : 'Filter family →'}</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    const others = [
      {
        key: 'gui',
        badge: 'Other · GUI',
        count: DATA.group_counts.gui || 21,
        title_en: 'GUI & Computer-Use World Models',
        title_zh: 'GUI 与电脑操作世界模型',
        desc_en: 'Screen, web, and renderable-HTML predictors (Code2World, gWorld, AppDeltaWorld) plus synthesized tool worlds. Kept separate because code carries single-step screens rather than persistent world dynamics.',
        desc_zh: '手机/桌面/网页与可渲染 HTML 下一屏预测（如 Code2World、gWorld）及合成软件环境。因代码承载的是界面观测而非持久物理/游戏状态，独立于三类主线之外。',
      },
      {
        key: 'benchmark',
        badge: 'Other · Benchmarks',
        count: DATA.group_counts.benchmark || 26,
        title_en: 'Benchmarks & Diagnostic Studies',
        title_zh: '评测基准与诊断研究',
        desc_en: 'Grouped into 4 evaluation targets: state-level dynamics (ScratchWorld, GameLogicBench), program-to-video rendering (WorldDraft, PROWBench), 3D world construction (ExeWorldBench), and non-code video WMs (FlipTest).',
        desc_zh: '按评测靶点分为四组：纯状态动力学、程序到视频渲染（WorldDraft、PROWBench）、3D 世界构建（ExeWorldBench）以及非代码视频世界模型诊断（FlipTest）。',
      },
      {
        key: 'survey',
        badge: 'Related Surveys',
        count: DATA.group_counts.survey || 8,
        title_en: 'Related Surveys & Scope Contrasts',
        title_zh: '相邻综述与边界对比',
        desc_en: `${DATA.group_counts.survey || 8} adjacent surveys on video generation harnesses, game AI, text world models, and planning formalizers—each paired with an explicit “How we differ” scope note.`,
        desc_zh: `收录 ${DATA.group_counts.survey || 8} 篇围绕视频生成智能体框架、游戏 AI、文本世界模型与规划形式化的相邻综述，并逐篇附有明确的边界差异说明。`,
      },
    ];

    const otherGrid = document.getElementById('otherGroupsGrid');
    otherGrid.innerHTML = others.map((o) => `
      <div class="bento-card">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span class="badge mono">${o.badge}</span>
          <span class="badge mono tabular">${o.count}</span>
        </div>
        <h4>${escapeHtml(zh ? o.title_zh : o.title_en)}</h4>
        <p style="flex:1;">${escapeHtml(zh ? o.desc_zh : o.desc_en)}</p>
        <div>
          <button type="button" class="pill-btn" data-jump-section="${o.key}">${zh ? '筛选查看 →' : 'View records →'}</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('[data-jump-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetSec = btn.getAttribute('data-jump-section');
        clearFilterState();
        STATE.sectionFilter = targetSec;
        renderLibrary();
        document.getElementById('library').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // Render Section 4: Observation Contracts, Evaluation Obligations, Survey Outline
  function renderFrameworkSection() {
    const zh = STATE.lang === 'zh';
    const tabs = [
      { id: 'obs', en: 'Observation Contracts (Table 1)', zh: '观测条件契约（综述表 1）' },
      { id: 'eval', en: 'Evaluation Obligations & B1–B4 (Table 2)', zh: '五项评测义务与 B1–B4 层级（综述表 2）' },
      { id: 'outline', en: '9-Chapter Survey Blueprint (§1–§9)', zh: '综述九章全文蓝图（§1–§9）' },
    ];
    const tabsEl = document.getElementById('frameworkTabs');
    tabsEl.innerHTML = tabs.map((tab) => `
      <button type="button" class="utab ${STATE.activeFrameworkTab === tab.id ? 'active' : ''}" data-ftab="${tab.id}">
        ${escapeHtml(zh ? tab.zh : tab.en)}
      </button>
    `).join('');

    tabsEl.querySelectorAll('[data-ftab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        STATE.activeFrameworkTab = btn.getAttribute('data-ftab');
        renderFrameworkSection();
      });
    });

    const stage = document.getElementById('frameworkStage');
    if (STATE.activeFrameworkTab === 'obs') {
      const rowsHtml = OBS_REGIMES.map((reg) => {
        const header = `<tr class="group-row"><td colspan="5">${escapeHtml(zh ? reg.group_zh : reg.group_en)}</td></tr>`;
        const body = reg.rows.map((r) => {
          const nameCell = r.id && PAPERS_BY_ID[r.id]
            ? `<button type="button" class="anchor-chip clickable" data-open-paper="${r.id}"><strong>${escapeHtml(r.method)}</strong> ↗</button>`
            : `<strong>${escapeHtml(r.method)}</strong>`;
          return `
            <tr>
              <td>${nameCell}</td>
              <td>${escapeHtml(r.upstream)}</td>
              <td class="mono" style="font-size:11.5px;">${escapeHtml(r.cond)}</td>
              <td>${escapeHtml(r.role)}</td>
              <td><span class="badge ${r.fb.includes('L3') ? 'sand' : ''}">${escapeHtml(r.fb)}</span></td>
            </tr>
          `;
        }).join('');
        return header + body;
      }).join('');

      stage.innerHTML = `
        <div class="table-wrap">
          <table class="aui-table">
            <thead>
              <tr>
                <th>${zh ? '代表系统' : 'Method'}</th>
                <th>${zh ? '上游权威状态（Upstream State）' : 'Upstream State'}</th>
                <th>${zh ? '条件接口 Π(s_t, v_t)' : 'Condition Interface Π(s_t, v_t)'}</th>
                <th>${zh ? '生成渲染器职责 R_θ' : 'Generator Role R_θ'}</th>
                <th>${zh ? '反馈路径（Feedback Path）' : 'Feedback Path'}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `;
      stage.querySelectorAll('[data-open-paper]').forEach((btn) => {
        btn.addEventListener('click', () => openPaperModal(btn.getAttribute('data-open-paper')));
      });
    } else if (STATE.activeFrameworkTab === 'eval') {
      const rowsHtml = EVAL_OBLIGATIONS.map((ob) => `
        <tr>
          <td><strong>${escapeHtml(zh ? ob.name_zh : ob.name_en)}</strong></td>
          <td>${escapeHtml(zh ? ob.proves_zh : ob.proves_en)}</td>
          <td style="color:var(--aui-muted)">${escapeHtml(zh ? ob.not_zh : ob.not_en)}</td>
          <td>
            <button type="button" class="pill-btn" data-jump-btarget="${ob.target}">
              ${zh ? '对应基准 →' : 'Benchmarks →'}
            </button>
          </td>
        </tr>
      `).join('');

      stage.innerHTML = `
        <div class="bento-4">
          <div class="bento-card">
            <span class="badge blue mono">B1 · Visual Realization</span>
            <h4>${zh ? '视觉与程序对齐评测' : 'Program-to-Video Rendering'}</h4>
            <p>${zh ? '评测渲染器是否忠实呈现程序指定的运动、相机与属性（如 WorldDraft、PROWBench）。' : 'Tests whether video models render program-specified kinematics, events, and attributes (WorldDraft, PROWBench).'}</p>
          </div>
          <div class="bento-card">
            <span class="badge teal mono">B2 · Executable Worlds</span>
            <h4>${zh ? '可执行三维与游戏构建' : 'Executable 3D & Game Worlds'}</h4>
            <p>${zh ? '通过隐藏契约与场景检查检验完整 3D/游戏世界构建（如 ExeWorldBench、VibePrevisBench、OCTAVE）。' : 'Checks executable 3D/game generation against runtime contracts (ExeWorldBench, VibePrevisBench, OCTAVE).'}</p>
          </div>
          <div class="bento-card">
            <span class="badge sand mono">B3 · Causal Dynamics</span>
            <h4>${zh ? '状态动力学与反事实推理' : 'Dynamics & Counterfactuals'}</h4>
            <p>${zh ? '采用变化字段指标与严格配对测试状态演化（如 ScratchWorld、GameLogicBench、FlipTest）。' : 'Uses changed-field assertions and boundary flips to isolate causal state (ScratchWorld, GameLogicBench, FlipTest).'}</p>
          </div>
          <div class="bento-card">
            <span class="badge purple mono">B4 · Online Adaptation</span>
            <h4>${zh ? '主动探索与模型学习适应' : 'World-Model Learning & Repair'}</h4>
            <p>${zh ? '在无奖励探索与交互预算下检验环境级查询与在线修订（如 WorldTest / AutumnBench）。' : 'Evaluates environment-level queries and belief revision after exploration (WorldTest / AutumnBench, StateAliasBench).'}</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="aui-table">
            <thead>
              <tr>
                <th>${zh ? '证据义务（Obligation）' : 'Evidence Obligation'}</th>
                <th>${zh ? '核心检验问题与所需证据' : 'Question & Required Evidence'}</th>
                <th>${zh ? '该指标不能证明什么（常见过度外推）' : 'What It Does NOT Establish'}</th>
                <th>${zh ? '检索基准' : 'Explore'}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `;
      stage.querySelectorAll('[data-jump-btarget]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetB = btn.getAttribute('data-jump-btarget');
          clearFilterState();
          STATE.sectionFilter = 'benchmark';
          STATE.benchmarkSubFilter = targetB;
          renderLibrary();
          document.getElementById('library').scrollIntoView({ behavior: 'smooth' });
        });
      });
    } else {
      stage.innerHTML = `
        <div class="accordion">
          ${CHAPTERS.map((ch, idx) => {
            const open = STATE.openChapter === idx;
            return `
              <div class="acc-item">
                <button type="button" class="acc-trigger" data-ch="${idx}" aria-expanded="${open}">
                  <span><span class="mono" style="color:var(--aui-sand);margin-right:8px;">§${ch.num}</span>${escapeHtml(zh ? ch.zh : ch.en)}</span>
                  <span class="mono" style="color:var(--aui-muted)">${open ? '−' : '+'}</span>
                </button>
                ${open ? `<div class="acc-panel">${escapeHtml(zh ? ch.desc_zh : ch.desc_en)}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
      stage.querySelectorAll('[data-ch]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-ch'));
          STATE.openChapter = STATE.openChapter === idx ? -1 : idx;
          renderFrameworkSection();
        });
      });
    }
  }

  // Filter & Sort Papers
  function getFilteredPapers() {
    const q = STATE.search.trim().toLowerCase();
    const list = DATA.papers.filter((p) => {
      if (STATE.sectionFilter !== 'all') {
        if (['worldcoder', 'code_as_world', 'vibeworlding'].includes(STATE.sectionFilter)) {
          if (p.section !== STATE.sectionFilter) return false;
        } else if (p.unassigned_group !== STATE.sectionFilter) {
          return false;
        }
      }
      if (STATE.sectionFilter === 'benchmark' && STATE.benchmarkSubFilter !== 'all') {
        if (p.benchmark_target !== STATE.benchmarkSubFilter) return false;
      }
      if (STATE.paradigmFilter !== 'all') {
        if (STATE.paradigmFilter === 'L3') {
          if (p.paradigm !== 'L3' && p.paradigm !== 'L2-L3' && !p.feedback_regime) return false;
        } else if (p.paradigm !== STATE.paradigmFilter) {
          return false;
        }
      }
      if (STATE.roleFilter !== 'all') {
        if (STATE.roleFilter === 'both') {
          if (!(p.code_roles.includes('transition') && p.code_roles.includes('observation'))) return false;
        } else if (!p.code_roles.includes(STATE.roleFilter)) {
          return false;
        }
      }
      if (STATE.depthFilter !== 'all' && p.review_badge !== STATE.depthFilter) {
        return false;
      }
      if (STATE.yearFilter !== 'all') {
        if (STATE.yearFilter === 'le2024') {
          if (p.year > 2024) return false;
        } else if (String(p.year) !== STATE.yearFilter) {
          return false;
        }
      }
      if (q) {
        const hay = [
          p.title, p.alias || '', p.id, p.authors.join(' '),
          p.tags.join(' '), p.summary_en, p.summary_zh,
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (STATE.sort === 'oldest') {
      list.sort((a, b) => a.date_sort.localeCompare(b.date_sort) || a.id.localeCompare(b.id));
    } else if (STATE.sort === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => b.date_sort.localeCompare(a.date_sort) || b.id.localeCompare(a.id));
    }
    return list;
  }

  function familyLabel(p) {
    const zh = STATE.lang === 'zh';
    if (p.section === 'worldcoder') return zh ? '01 · 程序化动力学' : '01 · WorldCoder-type';
    if (p.section === 'code_as_world') return zh ? '02 · 白模 + 神经渲染' : '02 · Code-as-World';
    if (p.section === 'vibeworlding') return zh ? '03 · 3D 世界构建' : '03 · VibeWorlding';
    if (p.unassigned_group === 'gui') return zh ? '其他 · GUI 世界模型' : 'Other · GUI';
    if (p.unassigned_group === 'benchmark') return zh ? `基准 · ${p.benchmark_target}` : `Benchmark · ${p.benchmark_target}`;
    if (p.unassigned_group === 'survey') return zh ? '相关综述' : 'Related Survey';
    return 'Other';
  }

  function familyBadgeClass(p) {
    if (p.section === 'worldcoder') return 'blue';
    if (p.section === 'code_as_world') return 'sand';
    if (p.section === 'vibeworlding') return 'teal';
    if (p.unassigned_group === 'benchmark') return 'amber';
    if (p.unassigned_group === 'gui') return 'purple';
    return '';
  }

  // Render Sidebar + Paper List
  function renderLibrary() {
    const zh = STATE.lang === 'zh';

    const secOptions = [
      { id: 'all', label: zh ? '全部文献' : 'All sources', count: DATA.total_sources },
      { id: 'worldcoder', label: zh ? '01 · 程序化动力学' : '01 · WorldCoder-type', count: DATA.section_counts.worldcoder },
      { id: 'code_as_world', label: zh ? '02 · 白模 + 神经渲染' : '02 · Code-as-World', count: DATA.section_counts.code_as_world },
      { id: 'vibeworlding', label: zh ? '03 · 3D 世界构建' : '03 · VibeWorlding-type', count: DATA.section_counts.vibeworlding },
      { id: 'gui', label: zh ? '其他 · GUI 世界模型' : 'Other · GUI Models', count: DATA.group_counts.gui },
      { id: 'benchmark', label: zh ? '其他 · 评测基准' : 'Other · Benchmarks', count: DATA.group_counts.benchmark },
      { id: 'survey', label: zh ? '相关综述对比' : 'Related Surveys', count: DATA.group_counts.survey },
    ];

    let benchSubHtml = '';
    if (STATE.sectionFilter === 'benchmark') {
      const btCounts = {};
      DATA.papers.forEach((p) => {
        if (p.unassigned_group === 'benchmark' && p.benchmark_target) {
          btCounts[p.benchmark_target] = (btCounts[p.benchmark_target] || 0) + 1;
        }
      });
      const subs = [
        ['all', zh ? '全部评测靶点' : 'All targets'],
        ['worldcoder', `→ worldcoder (${btCounts.worldcoder || 0})`],
        ['code_as_world', `→ code_as_world (${btCounts.code_as_world || 0})`],
        ['vibeworlding', `→ vibeworlding (${btCounts.vibeworlding || 0})`],
        ['video_wm', `→ video_wm / L4 (${btCounts.video_wm || 0})`],
      ];
      benchSubHtml = `<div style="padding-left:10px;display:flex;flex-direction:column;gap:2px;margin-top:2px;">` +
        subs.map(([val, lbl]) => `
          <button type="button" class="filter-btn ${STATE.benchmarkSubFilter === val ? 'active' : ''}" data-bsub="${val}" style="font-size:11.5px;padding:4px 8px;">
            <span>${escapeHtml(lbl)}</span>
          </button>
        `).join('') + `</div>`;
    }

    document.getElementById('sectionFilterGroup').innerHTML = `
      <div class="filter-heading">${zh ? '文献主线 / 分组' : 'Catalogue Family'}</div>
      ${secOptions.map((o) => `
        <button type="button" class="filter-btn ${STATE.sectionFilter === o.id ? 'active' : ''}" data-sec="${o.id}">
          <span>${escapeHtml(o.label)}</span>
          <span class="filter-count tabular">${o.count}</span>
        </button>
        ${o.id === 'benchmark' ? benchSubHtml : ''}
      `).join('')}
    `;

    const paradigmOptions = [
      { id: 'all', label: zh ? '全部范式视角' : 'All paradigms' },
      { id: 'L2', label: zh ? 'L2 · 权威代码世界模型' : 'L2 · Authoritative Code' },
      { id: 'L3', label: zh ? 'L3 / 观测反馈与表 1 锚点' : 'L3 / Writeback & Table 1' },
      { id: 'Eval-L2', label: zh ? '评测 · 代码世界基准' : 'Eval · Code World Benches' },
      { id: 'Eval-L4', label: zh ? '评测 · 视频模型诊断 (L4)' : 'Eval · Video WM (L4)' },
      { id: 'GUI', label: zh ? 'GUI · 界面预测与软件世界' : 'GUI · Screen & Software' },
    ];
    document.getElementById('paradigmFilterGroup').innerHTML = `
      <div class="filter-heading">${zh ? 'L0–L4 范式透镜' : 'Paradigm Lens'}</div>
      ${paradigmOptions.map((o) => `
        <button type="button" class="filter-btn ${STATE.paradigmFilter === o.id ? 'active' : ''}" data-par="${o.id}">
          <span>${escapeHtml(o.label)}</span>
        </button>
      `).join('')}
    `;

    const roleOptions = [
      ['all', zh ? '全部职责' : 'All code roles'],
      ['transition', 'transition (F)'],
      ['observation', 'observation (Π / 3D)'],
      ['both', 'transition + observation'],
    ];
    document.getElementById('roleFilterGroup').innerHTML = `
      <div class="filter-heading">${zh ? '代码语义职责' : 'Code Role'}</div>
      ${roleOptions.map(([id, lbl]) => `
        <button type="button" class="filter-btn ${STATE.roleFilter === id ? 'active' : ''}" data-role="${id}">
          <span>${escapeHtml(lbl)}</span>
        </button>
      `).join('')}
    `;

    const depthOptions = [
      ['all', zh ? '全部核查深度' : 'All review depths'],
      ['FT', zh ? 'FT · 正文重点核查' : 'FT · Targeted full-text'],
      ['A', zh ? 'A · 摘要与元数据' : 'A · Abstract & metadata'],
      ['M', zh ? 'M · 书目元数据' : 'M · Bibliographic only'],
    ];
    document.getElementById('depthFilterGroup').innerHTML = `
      <div class="filter-heading">${zh ? '核查深度' : 'Review Depth'}</div>
      ${depthOptions.map(([id, lbl]) => `
        <button type="button" class="filter-btn ${STATE.depthFilter === id ? 'active' : ''}" data-depth="${id}">
          <span>${escapeHtml(lbl)}</span>
        </button>
      `).join('')}
    `;

    const yearOptions = [
      ['all', zh ? '全部年份' : 'All years'],
      ['2026', '2026'],
      ['2025', '2025'],
      ['le2024', '≤ 2024'],
    ];
    document.getElementById('yearFilterGroup').innerHTML = `
      <div class="filter-heading">${zh ? '发表年份' : 'Year'}</div>
      ${yearOptions.map(([id, lbl]) => `
        <button type="button" class="filter-btn ${STATE.yearFilter === id ? 'active' : ''}" data-year="${id}">
          <span>${escapeHtml(lbl)}</span>
        </button>
      `).join('')}
    `;

    // Bind sidebar events
    document.querySelectorAll('[data-sec]').forEach((b) => b.addEventListener('click', () => {
      STATE.sectionFilter = b.getAttribute('data-sec');
      STATE.benchmarkSubFilter = 'all';
      renderLibrary();
    }));
    document.querySelectorAll('[data-bsub]').forEach((b) => b.addEventListener('click', () => {
      STATE.benchmarkSubFilter = b.getAttribute('data-bsub');
      renderLibrary();
    }));
    document.querySelectorAll('[data-par]').forEach((b) => b.addEventListener('click', () => {
      STATE.paradigmFilter = b.getAttribute('data-par');
      renderLibrary();
    }));
    document.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => {
      STATE.roleFilter = b.getAttribute('data-role');
      renderLibrary();
    }));
    document.querySelectorAll('[data-depth]').forEach((b) => b.addEventListener('click', () => {
      STATE.depthFilter = b.getAttribute('data-depth');
      renderLibrary();
    }));
    document.querySelectorAll('[data-year]').forEach((b) => b.addEventListener('click', () => {
      STATE.yearFilter = b.getAttribute('data-year');
      renderLibrary();
    }));

    const filtered = getFilteredPapers();
    document.getElementById('resultsCounter').textContent = zh
      ? `当前显示 ${filtered.length} / ${DATA.total_sources} 篇文献来源`
      : `Showing ${filtered.length} of ${DATA.total_sources} sources`;

    const container = document.getElementById('papersContainer');
    if (!filtered.length) {
      container.innerHTML = `
        <div style="padding:48px 20px;text-align:center;color:var(--aui-muted);">
          <div style="font-size:15px;font-weight:600;color:var(--aui-ink);margin-bottom:6px;">
            ${zh ? '没有匹配的文献记录' : 'No matching sources'}
          </div>
          <p style="margin:0 0 14px;">${zh ? '请尝试清空搜索词或重置左侧筛选条件。' : 'Try clearing your search query or resetting sidebar filters.'}</p>
          <button type="button" class="pill-btn primary" id="emptyResetBtn">${zh ? '重置全部筛选' : 'Reset all filters'}</button>
        </div>
      `;
      document.getElementById('emptyResetBtn').addEventListener('click', resetAllFilters);
      return;
    }

    if (STATE.viewMode === 'cards') {
      container.innerHTML = `<div class="papers-grid">${filtered.map((p) => renderPaperCard(p, zh)).join('')}</div>`;
    } else {
      container.innerHTML = renderPaperTable(filtered, zh);
    }

    container.querySelectorAll('[data-open-paper]').forEach((b) => {
      b.addEventListener('click', () => openPaperModal(b.getAttribute('data-open-paper')));
    });
    container.querySelectorAll('[data-copy-bib]').forEach((b) => {
      b.addEventListener('click', () => {
        const p = PAPERS_BY_ID[b.getAttribute('data-copy-bib')];
        if (p) copyText(p.bibtex, p.citation_key);
      });
    });
    container.querySelectorAll('[data-tag]').forEach((b) => {
      b.addEventListener('click', () => {
        STATE.search = b.getAttribute('data-tag');
        const searchEl = document.getElementById('searchInput');
        if (searchEl) searchEl.value = STATE.search;
        renderLibrary();
      });
    });
  }

  function renderPaperCard(p, zh) {
    const titleLabel = p.alias && !p.title.toLowerCase().includes(p.alias.toLowerCase())
      ? `${p.title} (${p.alias})`
      : p.title;
    const summary = zh ? p.summary_zh : p.summary_en;
    const extraNote = p.comparison_en
      ? `<div class="paper-note"><strong>${zh ? '与本综述的区别：' : 'How we differ: '}</strong>${escapeHtml(zh ? p.comparison_zh : p.comparison_en)}</div>`
      : p.feedback_note_en
      ? `<div class="paper-note"><strong>${escapeHtml(p.feedback_regime)}: </strong>${escapeHtml(zh ? p.feedback_note_zh : p.feedback_note_en)}</div>`
      : '';

    return `
      <article class="paper-card">
        <div class="paper-top">
          <div class="paper-badges">
            <span class="badge ${familyBadgeClass(p)}">${escapeHtml(familyLabel(p))}</span>
            <span class="badge mono">${escapeHtml(p.paradigm)}</span>
            <span class="badge ${p.review_badge === 'FT' ? 'sand' : ''} mono" title="Review depth: ${escapeHtml(p.review_depth)}">${p.review_badge}</span>
          </div>
          <span class="mono" style="font-size:11px;color:var(--aui-muted)">${escapeHtml(p.date_display)}</span>
        </div>

        <h3 class="paper-title">
          <button type="button" data-open-paper="${escapeHtml(p.id)}">${escapeHtml(titleLabel)}</button>
        </h3>

        <div class="paper-authors">${escapeHtml(p.authors.join(', '))}</div>
        <p class="paper-summary">${escapeHtml(summary)}</p>
        ${extraNote}

        <div class="paper-bottom">
          <div class="tag-list">
            ${p.tags.slice(0, 3).map((tg) => `<button type="button" class="tag-chip" data-tag="${escapeHtml(tg)}">#${escapeHtml(tg)}</button>`).join('')}
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <button type="button" class="icon-btn" data-copy-bib="${escapeHtml(p.id)}" title="Copy BibTeX">❝</button>
            <a class="pill-btn" style="height:24px;padding:0 9px;font-size:11px;" href="${escapeHtml(p.source_url)}" target="_blank" rel="noopener">
              ${p.arxiv_id ? 'arXiv' : p.source_type === 'project' ? 'Project' : 'Paper'} ↗
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function renderPaperTable(list, zh) {
    return `
      <div class="table-wrap" style="box-shadow:none;border:0.5px solid var(--aui-border);">
        <table class="aui-table">
          <thead>
            <tr>
              <th>${zh ? '日期' : 'Date'}</th>
              <th>${zh ? '论文 / 项目' : 'Work'}</th>
              <th>${zh ? '分类' : 'Family / Group'}</th>
              <th>${zh ? '范式' : 'Paradigm'}</th>
              <th>${zh ? '核查' : 'Rev'}</th>
              <th>Bib</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((p) => `
              <tr>
                <td class="mono" style="font-size:11px;white-space:nowrap;color:var(--aui-muted)">${escapeHtml(p.date_display)}</td>
                <td>
                  <button type="button" style="text-align:left;font-weight:600;" data-open-paper="${escapeHtml(p.id)}">
                    ${escapeHtml(p.alias || p.title)}
                  </button>
                  <div style="font-size:11.5px;color:var(--aui-muted);margin-top:2px;">${escapeHtml(zh ? p.summary_zh : p.summary_en)}</div>
                </td>
                <td><span class="badge ${familyBadgeClass(p)}">${escapeHtml(familyLabel(p))}</span></td>
                <td><span class="badge mono">${escapeHtml(p.paradigm)}</span></td>
                <td class="mono">${p.review_badge}</td>
                <td><button type="button" class="icon-btn" data-copy-bib="${escapeHtml(p.id)}" title="Copy BibTeX">❝</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Paper Detail Modal
  function openPaperModal(pid) {
    const p = PAPERS_BY_ID[pid];
    if (!p) return;
    const zh = STATE.lang === 'zh';
    const dialog = document.getElementById('paperDialog');
    document.getElementById('paperDialogHeader').textContent = `${p.id} · ${familyLabel(p)}`;

    const relatedHtml = (p.related_ids && p.related_ids.length)
      ? `<div style="margin-top:12px;">
          <div style="font-size:11.5px;color:var(--aui-muted);margin-bottom:6px;">${zh ? '关联文献记录：' : 'Related records in corpus:'}</div>
          <div class="anchor-row">
            ${p.related_ids.map((rid) => {
              const rp = PAPERS_BY_ID[rid];
              return rp ? `<button type="button" class="anchor-chip clickable" data-modal-rel="${escapeHtml(rid)}">${escapeHtml(rp.alias || rp.title)} ↗</button>` : '';
            }).join('')}
          </div>
        </div>`
      : '';

    document.getElementById('paperDialogBody').innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
        <span class="badge ${familyBadgeClass(p)}">${escapeHtml(familyLabel(p))}</span>
        <span class="badge mono">${escapeHtml(p.paradigm)}</span>
        <span class="badge mono">scope: ${escapeHtml(p.scope)}</span>
        <span class="badge ${p.review_badge === 'FT' ? 'sand' : ''} mono">review: ${escapeHtml(p.review_depth)}</span>
        <span class="badge mono">${escapeHtml(p.date_display)}</span>
      </div>
      <h3 style="margin:0 0 6px;font-size:18px;line-height:1.35;">${escapeHtml(p.title)}</h3>
      <div style="font-size:12.5px;color:var(--aui-muted);margin-bottom:14px;">${escapeHtml(p.authors.join(', '))}</div>

      <div class="kv-box" style="margin-bottom:12px;">
        <div class="kv-label">${zh ? '机制与贡献摘要' : 'Mechanism & Relevance Summary'}</div>
        <div class="kv-val" style="font-weight:400;line-height:1.6;">${escapeHtml(zh ? p.summary_zh : p.summary_en)}</div>
      </div>

      ${p.evidence_notes ? `
        <div class="paper-note" style="margin-bottom:12px;">
          <strong>${zh ? '实验条件与证据说明（Evidence Notes）：' : 'Evidence & Interpretation Notes: '}</strong>
          ${escapeHtml(p.evidence_notes)}
        </div>` : ''}

      ${p.feedback_note_en ? `
        <div class="paper-note" style="margin-bottom:12px;">
          <strong>${escapeHtml(p.feedback_regime)}: </strong>
          ${escapeHtml(zh ? p.feedback_note_zh : p.feedback_note_en)}
        </div>` : ''}

      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        <div class="tag-list">
          ${p.code_roles.map((r) => `<span class="badge blue mono">role:${escapeHtml(r)}</span>`).join('')}
          ${p.tags.map((tg) => `<span class="tag-chip">#${escapeHtml(tg)}</span>`).join('')}
        </div>
        <a class="pill-btn primary" href="${escapeHtml(p.source_url)}" target="_blank" rel="noopener">
          ${zh ? '打开原始来源 ↗' : 'Open primary source ↗'}
        </a>
      </div>

      ${relatedHtml}

      <div style="margin-top:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span class="mono" style="font-size:11.5px;color:var(--aui-muted);">BibTeX (${escapeHtml(p.citation_key)})</span>
          <button type="button" class="pill-btn" id="modalCopyBibBtn">${zh ? '复制 BibTeX' : 'Copy BibTeX'}</button>
        </div>
        <pre class="sim-code" style="margin:0;">${escapeHtml(p.bibtex)}</pre>
      </div>
    `;

    document.getElementById('modalCopyBibBtn').addEventListener('click', () => copyText(p.bibtex, p.citation_key));
    dialog.querySelectorAll('[data-modal-rel]').forEach((b) => {
      b.addEventListener('click', () => openPaperModal(b.getAttribute('data-modal-rel')));
    });

    if (!dialog.open) dialog.showModal();
  }

  // Command K Search Palette
  function renderCmdResults() {
    const q = document.getElementById('cmdInput').value.trim().toLowerCase();
    const zh = STATE.lang === 'zh';
    const items = [];

    PARADIGMS.forEach((l) => {
      const text = `${l.id} ${l.name_en} ${l.name_zh} ${l.mini_en}`.toLowerCase();
      if (!q || text.includes(q)) {
        items.push({
          kind: 'Paradigm',
          title: `${l.id} · ${zh ? l.name_zh : l.name_en}`,
          sub: zh ? l.mini_zh : l.mini_en,
          action: () => {
            STATE.activeLayer = l.id;
            renderParadigms();
            document.getElementById('paradigms').scrollIntoView({ behavior: 'smooth' });
          },
        });
      }
    });

    DATA.papers.forEach((p) => {
      const text = `${p.title} ${p.alias || ''} ${p.id} ${p.authors.join(' ')} ${p.tags.join(' ')}`.toLowerCase();
      if (!q || text.includes(q)) {
        items.push({
          kind: p.paradigm,
          title: p.alias ? `${p.alias} — ${p.title}` : p.title,
          sub: `${p.date_display} · ${familyLabel(p)}`,
          action: () => openPaperModal(p.id),
        });
      }
    });

    const top = items.slice(0, 18);
    if (STATE.cmdIndex >= top.length) STATE.cmdIndex = 0;
    const listEl = document.getElementById('cmdResults');
    listEl.innerHTML = top.map((it, idx) => `
      <button type="button" class="cmd-item ${idx === STATE.cmdIndex ? 'selected' : ''}" data-cmd-idx="${idx}">
        <div style="min-width:0;">
          <div style="font-weight:550;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(it.title)}</div>
          <div style="font-size:11.5px;color:var(--aui-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(it.sub)}</div>
        </div>
        <span class="badge mono">${escapeHtml(it.kind)}</span>
      </button>
    `).join('');

    listEl._actions = top.map((it) => it.action);
    listEl.querySelectorAll('[data-cmd-idx]').forEach((b) => {
      b.addEventListener('click', () => {
        const i = Number(b.getAttribute('data-cmd-idx'));
        document.getElementById('cmdDialog').close();
        listEl._actions[i]();
      });
    });
  }

  function clearFilterState() {
    STATE.search = '';
    STATE.sectionFilter = 'all';
    STATE.benchmarkSubFilter = 'all';
    STATE.paradigmFilter = 'all';
    STATE.roleFilter = 'all';
    STATE.depthFilter = 'all';
    STATE.yearFilter = 'all';
    const searchEl = document.getElementById('searchInput');
    if (searchEl) searchEl.value = '';
  }

  function resetAllFilters() {
    clearFilterState();
    renderLibrary();
  }

  function renderAll() {
    applyRootPrefs();
    renderParadigms();
    renderComparison();
    renderFamilies();
    renderFrameworkSection();
    renderLibrary();
    if (ATLAS.redraw) ATLAS.redraw();
  }

  // Event Listeners Setup
  function init() {
    mountExtraNavControls();

    const styleToggleBtn = document.getElementById('styleToggleBtn');
    if (styleToggleBtn) {
      styleToggleBtn.addEventListener('click', () => {
        STATE.style = STATE.style === 'clean' ? 'classic' : 'clean';
        localStorage.setItem('cwm_style', STATE.style);
        applyRootPrefs();
      });
    }

    const copyCloneBtn = document.getElementById('copyCloneBtn');
    if (copyCloneBtn) {
      copyCloneBtn.addEventListener('click', () => {
        const cloneCmd = document.getElementById('cloneCmd');
        if (cloneCmd) copyText(cloneCmd.textContent, 'git clone command');
      });
    }

    const downloadAllBibBtn = document.getElementById('downloadAllBibBtn');
    if (downloadAllBibBtn) {
      downloadAllBibBtn.addEventListener('click', () => {
        const bib = DATA.papers.map((p) => p.bibtex).join('\n\n') + '\n';
        downloadTextFile('code-world-models.bib', bib);
        showToast(STATE.lang === 'zh' ? `已下载全部 ${DATA.total_sources} 篇 BibTeX` : `Downloaded full ${DATA.total_sources}-paper BibTeX`);
      });
    }

    const exportFilteredBibBtn = document.getElementById('exportFilteredBibBtn');
    if (exportFilteredBibBtn) {
      exportFilteredBibBtn.addEventListener('click', () => {
        const list = getFilteredPapers();
        const bib = list.map((p) => p.bibtex).join('\n\n') + '\n';
        downloadTextFile(`cwm-filtered-${list.length}.bib`, bib);
        showToast(STATE.lang === 'zh' ? `已导出 ${list.length} 条 BibTeX` : `Exported ${list.length} BibTeX entries`);
      });
    }

    const resetFiltersTopBtn = document.getElementById('resetFiltersTopBtn');
    if (resetFiltersTopBtn) {
      resetFiltersTopBtn.addEventListener('click', resetAllFilters);
    }

    const splitSlider = document.getElementById('splitSlider');
    if (splitSlider) {
      splitSlider.addEventListener('input', (e) => {
        document.getElementById('splitStage').style.setProperty('--split-pos', e.target.value + '%');
      });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      if (STATE.search) searchInput.value = STATE.search;
      searchInput.addEventListener('input', (e) => {
        STATE.search = e.target.value;
        renderLibrary();
      });
    }

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        STATE.sort = e.target.value;
        renderLibrary();
      });
    }

    const viewCardsBtn = document.getElementById('viewCardsBtn');
    const viewTableBtn = document.getElementById('viewTableBtn');
    if (viewCardsBtn && viewTableBtn) {
      viewCardsBtn.addEventListener('click', () => {
        STATE.viewMode = 'cards';
        viewCardsBtn.classList.add('active');
        viewTableBtn.classList.remove('active');
        renderLibrary();
      });

      viewTableBtn.addEventListener('click', () => {
        STATE.viewMode = 'table';
        viewTableBtn.classList.add('active');
        viewCardsBtn.classList.remove('active');
        renderLibrary();
      });
    }

    // Command Dialog
    const cmdDialog = document.getElementById('cmdDialog');
    const cmdInput = document.getElementById('cmdInput');
    function openCmd() {
      if (!cmdDialog || !cmdInput) return;
      STATE.cmdIndex = 0;
      cmdInput.value = '';
      renderCmdResults();
      if (!cmdDialog.open) cmdDialog.showModal();
      cmdInput.focus();
    }

    const openCmdBtn = document.getElementById('openCmdBtn');
    if (openCmdBtn) openCmdBtn.addEventListener('click', openCmd);

    const closeCmdBtn = document.getElementById('closeCmdBtn');
    if (closeCmdBtn && cmdDialog) closeCmdBtn.addEventListener('click', () => cmdDialog.close());

    if (cmdDialog && cmdInput) {
      cmdDialog.addEventListener('click', (e) => { if (e.target === cmdDialog) cmdDialog.close(); });

      cmdInput.addEventListener('input', () => {
        STATE.cmdIndex = 0;
        renderCmdResults();
      });
      cmdInput.addEventListener('keydown', (e) => {
        const actions = document.getElementById('cmdResults')._actions || [];
        if (!actions.length) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          STATE.cmdIndex = (STATE.cmdIndex + 1) % actions.length;
          renderCmdResults();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          STATE.cmdIndex = (STATE.cmdIndex - 1 + actions.length) % actions.length;
          renderCmdResults();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const fn = actions[STATE.cmdIndex];
          cmdDialog.close();
          if (fn) fn();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCmd();
      }
    });

    const paperDialog = document.getElementById('paperDialog');
    const closePaperBtn = document.getElementById('closePaperBtn');
    if (closePaperBtn && paperDialog) {
      closePaperBtn.addEventListener('click', () => paperDialog.close());
    }
    if (paperDialog) {
      paperDialog.addEventListener('click', (e) => { if (e.target === paperDialog) paperDialog.close(); });
    }

    if (window.PWM_SHELL && typeof window.PWM_SHELL.onChange === 'function') {
      window.PWM_SHELL.onChange((sh) => {
        const langChanged = sh.lang !== STATE.lang;
        const themeChanged = sh.theme !== STATE.theme;
        if (!langChanged && !themeChanged) return;
        STATE.lang = sh.lang;
        STATE.theme = sh.theme;
        if (langChanged) {
          renderAll();
        } else {
          applyRootPrefs();
          if (ATLAS.redraw) ATLAS.redraw();
        }
      });
    }

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
        if (!nextTab) return;
        nextTab.click();
        const refreshedTabs = Array.from(tablist.querySelectorAll('[role="tab"]:not([disabled])'));
        const targetTab = refreshedTabs[nextIdx] || nextTab;
        if (targetTab && targetTab.isConnected) targetTab.focus();
      });
    });

    initAtlasField();
    renderAll();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (ATLAS.redraw) ATLAS.redraw();
      });
    }
  }

  // SurveyAtlas-inspired Interactive Chronological Dot Swimlane Canvas
  const ATLAS = {
    mode: 'family', // 'family' | 'paradigm'
    redraw: null,
  };

  function initAtlasField() {
    const cv = document.getElementById('atlasField');
    const tip = document.getElementById('atlasTip');
    const yearEl = document.getElementById('atlasYearWatermark');
    if (!cv || !DATA.papers.length) return;
    const ctx = cv.getContext('2d');
    const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const PAL = {
      light: ['#3b6ea8', '#9c8558', '#1f8a78', '#6e5ca8', '#c47b35', '#7b8191'],
      dark: ['#62a4ed', '#d8c394', '#46c6ab', '#b19ce8', '#e8a864', '#9499ad'],
    };

    const FAMILY_LANES = [
      { key: 'worldcoder', en: '01 · WORLDCODER-TYPE', zh: `01 · 程序化动力学 (${DATA.section_counts.worldcoder || 48})`, filter: { sec: 'worldcoder' }, colorIdx: 0 },
      { key: 'code_as_world', en: '02 · CODE-AS-WORLD-TYPE', zh: `02 · 白模 + 生成式渲染 (${DATA.section_counts.code_as_world || 25})`, filter: { sec: 'code_as_world' }, colorIdx: 1 },
      { key: 'vibeworlding', en: '03 · VIBEWORLDING-TYPE', zh: `03 · 3D 世界构建 (${DATA.section_counts.vibeworlding || 42})`, filter: { sec: 'vibeworlding' }, colorIdx: 2 },
      { key: 'gui', en: 'OTHER · GUI WORLD MODELS', zh: `其他 · GUI 世界模型 (${DATA.group_counts.gui || 21})`, filter: { sec: 'gui' }, colorIdx: 3 },
      { key: 'benchmark', en: 'OTHER · BENCHMARKS (B1–B4)', zh: `其他 · 评测基准 B1–B4 (${DATA.group_counts.benchmark || 26})`, filter: { sec: 'benchmark' }, colorIdx: 4 },
      { key: 'survey', en: 'RELATED SURVEYS', zh: `相关综述对比 (${DATA.group_counts.survey || 8})`, filter: { sec: 'survey' }, colorIdx: 5 },
    ];

    const PARADIGM_LANES = [
      { key: 'L2', en: 'L2 · AUTHORITATIVE CODE DYNAMICS', zh: 'L2 · 权威代码状态世界模型', filter: { par: 'L2' }, colorIdx: 0 },
      { key: 'L3', en: 'L3 & TABLE 1 · WRITEBACK / FEEDBACK', zh: 'L3 与表 1 · 状态写回与观测反馈', filter: { par: 'L3' }, colorIdx: 1 },
      { key: 'Eval-L2', en: 'EVAL · CODE WORLD BENCHMARKS', zh: '评测 · 代码世界与渲染基准', filter: { par: 'Eval-L2' }, colorIdx: 2 },
      { key: 'Eval-L4', en: 'EVAL · VIDEO WM DIAGNOSTICS (L4)', zh: '评测 · 视频模型状态诊断 (L4)', filter: { par: 'Eval-L4' }, colorIdx: 4 },
      { key: 'GUI-Survey', en: 'GUI WORLDS & ADJACENT SURVEYS', zh: 'GUI 界面预测与相关综述', filter: { par: 'GUI' }, colorIdx: 3 },
    ];

    const TIME_TICKS = [
      { u: 0.03, label: '≤2021' },
      { u: 0.13, label: '2023' },
      { u: 0.23, label: '2024' },
      { u: 0.36, label: '2025' },
      { u: 0.54, label: '26·Q1' },
      { u: 0.68, label: '26·Q2' },
      { u: 0.82, label: '26·Q3' },
      { u: 0.95, label: '26·Q4' },
    ];

    function parseDecimalYear(dateStr, fallbackYear) {
      if (!dateStr) return fallbackYear + 0.5;
      const m = String(dateStr).match(/(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
      if (!m) return fallbackYear + 0.5;
      const y = Number(m[1]);
      const mo = m[2] ? Number(m[2]) : 6;
      const da = m[3] ? Number(m[3]) : 15;
      return y + ((mo - 1) + (da - 1) / 30) / 12;
    }

    // Piecewise time warp so 2013-2024 seeds and 2025-2026 surge both breathe organically
    function yearToU(yr) {
      if (yr <= 2022.0) return 0.02 + Math.max(0, (yr - 2013) / 9) * 0.08;
      if (yr <= 2023.999) return 0.10 + (yr - 2022.0) * 0.05;
      if (yr <= 2024.999) return 0.20 + (yr - 2024.0) * 0.12;
      if (yr <= 2025.999) return 0.32 + (yr - 2025.0) * 0.18;
      return Math.min(0.985, 0.50 + ((yr - 2026.0) / 0.92) * 0.485);
    }

    function uToDisplayYear(u) {
      if (u < 0.10) return Math.round(2015 + (u / 0.10) * 7);
      if (u < 0.20) return 2023;
      if (u < 0.32) return 2024;
      if (u < 0.50) return 2025;
      return 2026;
    }

    function rnd(i, k) {
      const x = Math.sin((i + 1) * 127.1 + k * 311.7) * 43758.5453;
      return x - Math.floor(x);
    }

    function getLanes() {
      return ATLAS.mode === 'family' ? FAMILY_LANES : PARADIGM_LANES;
    }

    function laneIndexForPaper(p) {
      if (ATLAS.mode === 'family') {
        if (p.section === 'worldcoder') return 0;
        if (p.section === 'code_as_world') return 1;
        if (p.section === 'vibeworlding') return 2;
        if (p.unassigned_group === 'gui') return 3;
        if (p.unassigned_group === 'benchmark') return 4;
        return 5;
      }
      if (p.paradigm === 'L3' || p.paradigm === 'L2-L3' || p.feedback_regime) return 1;
      if (p.paradigm === 'L2') return 0;
      if (p.paradigm === 'Eval-L2') return 2;
      if (p.paradigm === 'Eval-L4') return 3;
      return 4;
    }

    let W = 0, H = 0, dpr = 1;
    let bounds = { left: 0, right: 0, top: 0, bot: 0, laneH: 0 };
    let mouse = { x: -9999, y: -9999, active: false };
    let hovered = null;
    let hoveredLane = -1;
    let sweepClock = RM ? 1.02 : 0;
    let sweepStart = performance.now();
    const SWEEP_DUR = 4200;
    let morphAnimating = false;

    // Sort chronologically so sweep reveals history in order
    const chronological = [...DATA.papers].sort((a, b) => a.date_sort.localeCompare(b.date_sort));
    const nodes = chronological.map((p, i) => {
      const decYr = parseDecimalYear(p.date_sort, p.year);
      const u = yearToU(decYr);
      const baseR = p.review_badge === 'FT' ? 4.8 : p.review_badge === 'A' ? 3.8 : 3.0;
      const r = baseR + rnd(i, 3) * 0.9;
      return {
        i,
        p,
        decYr,
        u,
        r,
        lane: 0,
        colorIdx: 0,
        x: 0,
        y: 0,
        tx: 0,
        ty: 0,
      };
    });
    const nodeById = Object.fromEntries(nodes.map((n) => [n.p.id, n]));

    function computeLayout(snapImmediate) {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth;
      H = cv.clientHeight;
      if (!W || !H) return;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const lanes = getLanes();
      const nL = lanes.length;
      const copyLeft = Math.max(20, (W - 1240) / 2 + 20);
      const left = W > 980 ? Math.max(W * 0.47, copyLeft + 515) : 24;
      const right = W - 28;
      const top = W > 980 ? 78 : 26;
      const bot = H - 38;
      const laneH = (bot - top) / nL;
      bounds = { left, right, top, bot, laneH };

      nodes.forEach((n) => {
        const li = laneIndexForPaper(n.p);
        n.lane = li;
        n.colorIdx = lanes[li].colorIdx;
        const jx = (rnd(n.i, 1) - 0.5) * 14;
        const jy = (rnd(n.i, 2) - 0.5) * (laneH * 0.62);
        n.tx = Math.min(right - 6, Math.max(left + 6, left + n.u * (right - left) + jx));
        n.ty = top + laneH * (li + 0.56) + jy;
        if (snapImmediate || (!n.x && !n.y)) {
          n.x = n.tx;
          n.y = n.ty;
        }
      });
    }

    function draw() {
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      const isDark = STATE.theme === 'dark';
      const colors = PAL[isDark ? 'dark' : 'light'];
      const lanes = getLanes();
      const { left, right, top, bot, laneH } = bounds;

      // 1. Vertical time grid & bottom labels
      ctx.font = '500 10.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      TIME_TICKS.forEach((tk) => {
        const gx = left + tk.u * (right - left);
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(20,22,36,0.055)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gx, top - 8);
        ctx.lineTo(gx, bot + 4);
        ctx.stroke();

        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.34)' : 'rgba(20,22,36,0.38)';
        ctx.fillText(tk.label, gx, bot + 20);
      });

      // 2. Horizontal swimlane dividers & clickable lane titles
      ctx.textAlign = 'left';
      ctx.font = '600 10.5px "Inter", "Noto Sans SC", system-ui, sans-serif';
      lanes.forEach((ln, idx) => {
        const ly = top + laneH * idx;
        if (idx > 0) {
          ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(20,22,36,0.045)';
          ctx.beginPath();
          ctx.moveTo(left, ly);
          ctx.lineTo(right, ly);
          ctx.stroke();
        }
        ctx.fillStyle = colors[ln.colorIdx];
        ctx.globalAlpha = hoveredLane === idx ? 1 : 0.86;
        ctx.fillText(STATE.lang === 'zh' ? ln.zh : ln.en, left + 2, ly + 13);
      });
      ctx.globalAlpha = 1;

      // 3. Chronological sweep glow bar
      if (sweepClock < 1.0) {
        const sx = left + Math.min(1, sweepClock) * (right - left);
        const grad = ctx.createLinearGradient(sx - 72, 0, sx, 0);
        grad.addColorStop(0, isDark ? 'rgba(216,206,180,0)' : 'rgba(176,164,132,0)');
        grad.addColorStop(1, isDark ? 'rgba(216,206,180,0.16)' : 'rgba(176,164,132,0.22)');
        ctx.fillStyle = grad;
        ctx.fillRect(Math.max(left, sx - 72), top - 8, Math.min(72, sx - left), bot - top + 12);
      }

      // 4. Related-paper constellation arcs when hovering a dot
      if (hovered && hovered.p.related_ids && hovered.p.related_ids.length) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(20,22,36,0.32)';
        ctx.lineWidth = 1.2;
        hovered.p.related_ids.forEach((rid) => {
          const peer = nodeById[rid];
          if (peer && peer.u <= sweepClock) {
            ctx.beginPath();
            ctx.moveTo(hovered.x, hovered.y);
            const cx = (hovered.x + peer.x) / 2;
            const cy = Math.min(hovered.y, peer.y) - 18;
            ctx.quadraticCurveTo(cx, cy, peer.x, peer.y);
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // 5. Render paper dots with entrance bloom & cursor proximity field
      for (const n of nodes) {
        if (n.u > sweepClock) continue;
        const age = RM ? 1 : Math.min(1, (sweepClock - n.u) * 7.5);
        let dx = 0, dy = 0, proxBoost = 0;

        if (mouse.active && hovered !== n) {
          const vx = n.x - mouse.x;
          const vy = n.y - mouse.y;
          const d2 = vx * vx + vy * vy;
          if (d2 > 1 && d2 < 5600) {
            const dist = Math.sqrt(d2);
            const force = (1 - dist / 75);
            proxBoost = force * 0.25;
            dx = (vx / dist) * force * 2.4;
            dy = (vy / dist) * force * 2.4;
          }
        }

        const dimByLane = hoveredLane >= 0 && hoveredLane !== n.lane ? 0.24 : 1;
        ctx.globalAlpha = Math.min(1, (0.28 + 0.60 * age + proxBoost) * dimByLane);
        ctx.fillStyle = colors[n.colorIdx];
        const drawR = n.r * (1 + (1 - age) * 1.35) * (hovered === n ? 1.22 : 1);
        ctx.beginPath();
        ctx.arc(n.x + dx, n.y + dy, drawR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 6. Active hover ring & halo (SurveyAtlas signature)
      if (hovered && hovered.u <= sweepClock) {
        const col = colors[hovered.colorIdx];
        ctx.save();
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.20;
        ctx.beginPath();
        ctx.arc(hovered.x, hovered.y, hovered.r + 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.strokeStyle = isDark ? '#ffffff' : '#151831';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(hovered.x, hovered.y, hovered.r + 4.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (yearEl) {
        yearEl.textContent = String(uToDisplayYear(Math.min(1, sweepClock)));
      }
    }

    function tickLoop(ts) {
      let needsNext = false;
      if (sweepClock < 1.02) {
        const elapsed = Math.max(0, ts - sweepStart);
        sweepClock = Math.min(1.02, Math.pow(Math.min(1, elapsed / SWEEP_DUR), 0.88) * 1.02);
        if (sweepClock < 1.02) needsNext = true;
      }
      if (morphAnimating) {
        let maxDelta = 0;
        for (const n of nodes) {
          n.x += (n.tx - n.x) * 0.18;
          n.y += (n.ty - n.y) * 0.18;
          maxDelta = Math.max(maxDelta, Math.abs(n.tx - n.x), Math.abs(n.ty - n.y));
        }
        if (maxDelta > 0.25) {
          needsNext = true;
        } else {
          nodes.forEach((n) => { n.x = n.tx; n.y = n.ty; });
          morphAnimating = false;
        }
      }
      draw();
      if (needsNext) requestAnimationFrame(tickLoop);
    }

    function startSweep() {
      if (RM) {
        sweepClock = 1.02;
        draw();
        return;
      }
      sweepClock = 0;
      sweepStart = performance.now();
      requestAnimationFrame(tickLoop);
    }

    function triggerMorph() {
      computeLayout(false);
      if (RM) {
        nodes.forEach((n) => { n.x = n.tx; n.y = n.ty; });
        draw();
      } else {
        morphAnimating = true;
        requestAnimationFrame(tickLoop);
      }
    }

    // Pointer interactions
    cv.addEventListener('mousemove', (e) => {
      const rect = cv.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      mouse.x = mx;
      mouse.y = my;
      mouse.active = true;

      let best = null;
      let bestD2 = 256; // 16px hit radius
      for (const n of nodes) {
        if (n.u > sweepClock) continue;
        const d2 = (n.x - mx) * (n.x - mx) + (n.y - my) * (n.y - my);
        if (d2 < bestD2) {
          bestD2 = d2;
          best = n;
        }
      }

      // Check lane header hover if no dot hit
      let laneHit = -1;
      if (!best && mx >= bounds.left && mx <= bounds.left + 250 && my >= bounds.top && my <= bounds.bot) {
        const li = Math.floor((my - bounds.top) / bounds.laneH);
        const offsetInLane = (my - bounds.top) - li * bounds.laneH;
        if (li >= 0 && li < getLanes().length && offsetInLane <= 20) {
          laneHit = li;
        }
      }

      hovered = best;
      hoveredLane = laneHit;
      cv.style.cursor = (best || laneHit >= 0) ? 'pointer' : '';
      draw();

      if (best) {
        const p = best.p;
        const zh = STATE.lang === 'zh';
        const shortName = p.alias || (p.title.length > 54 ? p.title.slice(0, 52) + '…' : p.title);
        tip.innerHTML = `
          <div class="atlas-ftip-head">
            <span class="atlas-ftip-title">${escapeHtml(shortName)}</span>
            <span class="badge ${p.review_badge === 'FT' ? 'sand' : ''} mono" style="height:17px;font-size:10px;">${escapeHtml(p.paradigm)} · ${p.review_badge}</span>
          </div>
          <div class="atlas-ftip-meta">${escapeHtml(p.date_display)} · ${escapeHtml(familyLabel(p))}</div>
          <div class="atlas-ftip-hint">${zh ? '点击圆点查看论文详情与 BibTeX →' : 'Click dot to inspect paper & BibTeX →'}</div>
        `;
        const tx = Math.min(window.innerWidth - 324, Math.max(12, e.clientX + 14));
        const ty = Math.min(window.innerHeight - 96, Math.max(12, e.clientY + 14));
        tip.style.left = tx + 'px';
        tip.style.top = ty + 'px';
        tip.classList.add('visible');
      } else {
        tip.classList.remove('visible');
      }
    });

    cv.addEventListener('mouseleave', () => {
      mouse.active = false;
      hovered = null;
      hoveredLane = -1;
      tip.classList.remove('visible');
      draw();
    });

    cv.addEventListener('click', () => {
      if (hovered) {
        tip.classList.remove('visible');
        openPaperModal(hovered.p.id);
      } else if (hoveredLane >= 0) {
        const ln = getLanes()[hoveredLane];
        resetAllFilters();
        if (ln.filter.sec) STATE.sectionFilter = ln.filter.sec;
        if (ln.filter.par) STATE.paradigmFilter = ln.filter.par;
        renderLibrary();
        document.getElementById('library').scrollIntoView({ behavior: 'smooth' });
      }
    });

    document.getElementById('atlasModeFamily').addEventListener('click', () => {
      if (ATLAS.mode === 'family') return;
      ATLAS.mode = 'family';
      document.getElementById('atlasModeFamily').classList.add('active');
      document.getElementById('atlasModeParadigm').classList.remove('active');
      triggerMorph();
    });

    document.getElementById('atlasModeParadigm').addEventListener('click', () => {
      if (ATLAS.mode === 'paradigm') return;
      ATLAS.mode = 'paradigm';
      document.getElementById('atlasModeParadigm').classList.add('active');
      document.getElementById('atlasModeFamily').classList.remove('active');
      triggerMorph();
    });

    document.getElementById('atlasReplayBtn').addEventListener('click', () => {
      startSweep();
    });

    window.addEventListener('resize', () => {
      computeLayout(true);
      draw();
    });
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => {
        computeLayout(true);
        draw();
      }).observe(cv);
    }

    ATLAS.redraw = () => draw();
    computeLayout(true);
    startSweep();
  }

  window.PWM_SURVEY = {
    syncLang: syncLangFromInternal,
    syncTheme: syncThemeFromInternal,
  };

  init();
})();
