/* ==========================================================================
   Program World Model — Shared Global Header, Route Switcher, Theme & Language
   Mounts cleanly into #pwm-shell-header and #pwm-shell-subnav on every route.
   ========================================================================== */
(function () {
  'use strict';

  const root = document.documentElement;
  const pageId = document.body.dataset.pwmPage || 'overview'; // 'overview' | 'survey' | 'arena' | 'method'
  const basePrefix = document.body.dataset.pwmBase || '.';     // '.' on root, '..' on subpages
  const urlParams = new URLSearchParams(window.location.search);

  function getInitialLang() {
    const p = urlParams.get('lang');
    if (p === 'zh' || p === 'en') return p;
    const saved = localStorage.getItem('pwm-language') || localStorage.getItem('cwm_lang');
    return saved === 'zh' ? 'zh' : 'en';
  }

  function getInitialTheme() {
    const p = urlParams.get('theme');
    if (p === 'dark' || p === 'light') return p;
    const saved = localStorage.getItem('pwm-theme') || localStorage.getItem('cwm_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const SHELL = {
    lang: getInitialLang(),
    theme: getInitialTheme(),
    listeners: [],
    onChange(fn) {
      this.listeners.push(fn);
    },
    setLang(lang) {
      this.lang = lang === 'zh' ? 'zh' : 'en';
      localStorage.setItem('pwm-language', this.lang);
      localStorage.setItem('cwm_lang', this.lang);
      applyShellState();
      this.listeners.forEach((fn) => fn(this));
    },
    setTheme(theme) {
      this.theme = theme === 'dark' ? 'dark' : 'light';
      localStorage.setItem('pwm-theme', this.theme);
      localStorage.setItem('cwm_theme', this.theme);
      applyShellState();
      this.listeners.forEach((fn) => fn(this));
    },
  };
  window.PWM_SHELL = SHELL;

  const ROUTES = [
    {
      id: 'overview',
      num: '',
      href: `${basePrefix}/`,
      en: 'Overview',
      zh: '总览主页',
      desc_en: 'Research thesis, three connected workstreams, and shared L0–L4 framing.',
      desc_zh: '研究主旨、核心系列工作与统一的 L0–L4 状态决定权框架。',
    },
    {
      id: 'survey',
      num: '01',
      badge: '200',
      href: `${basePrefix}/survey/`,
      en: 'Survey & Atlas',
      zh: '综述与图谱',
      desc_en: 'Interactive chronological dot atlas, L0–L4 spectrum, observation & evaluation tables.',
      desc_zh: '200 篇时间轴文献点阵、L0–L4 范式对比、观测契约与评测义务检索台。',
    },
    {
      id: 'arena',
      num: '02',
      badge: 'P·D·R',
      href: `${basePrefix}/arena/`,
      en: 'PWM-Arena',
      zh: '评测基准',
      desc_en: 'Counterfactual A/B runtime rule-editing scenarios and decoupled P/D/R tracks.',
      desc_zh: '成对反事实 A/B 运行时规则编辑场景与解耦的 P/D/R 评测赛道。',
    },
    {
      id: 'method',
      num: '03',
      href: `${basePrefix}/method/`,
      en: 'Agent Method',
      zh: '智能体方法',
      desc_en: 'Code-agent synthesis loop, step-trace sandbox, and closed-loop world verification.',
      desc_zh: 'Code-Agent 世界程序归纳、单步因果轨迹沙箱与闭环验证方法。',
    },
  ];

  function mountShell() {
    const headerMount = document.getElementById('pwm-shell-header');
    if (headerMount) {
      const dismissed = localStorage.getItem('pwm-banner-dismissed') === '1';
      headerMount.innerHTML = `
        <div class="pwm-topbar" id="pwmTopbar" ${dismissed ? 'hidden' : ''}>
          <a class="pwm-topbar__link" href="${basePrefix}/${pageId === 'survey' ? 'arena/' : 'survey/'}">
            <span class="pwm-topbar__tag">PROGRAM WORLD MODEL</span>
            <strong id="pwmTopbarLead"></strong>
            <span class="pwm-topbar__muted" id="pwmTopbarCta"></span>
          </a>
          <button class="pwm-topbar__close" id="pwmTopbarClose" type="button" aria-label="Dismiss announcement">✕</button>
        </div>

        <header class="pwm-global-nav">
          <div class="pwm-global-nav__inner">
            <div class="pwm-global-nav__left">
              <a class="pwm-brand" href="${basePrefix}/">
                <span class="pwm-brand__mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
                <span>Program World Model</span>
              </a>

              <nav class="pwm-route-tabs" aria-label="Program World Model sub-pages">
                ${ROUTES.map((r) => `
                  <a class="pwm-route-link ${r.id === pageId ? 'is-active' : ''}" href="${r.href}" data-route-id="${r.id}">
                    ${r.num ? `<span class="pwm-route-num">${r.num}</span>` : ''}
                    <span class="pwm-route-label" data-route-en="${r.en}" data-route-zh="${r.zh}">${r.en}</span>
                    ${r.badge ? `<span class="pwm-route-count">${r.badge}</span>` : ''}
                  </a>
                `).join('')}
              </nav>
            </div>

            <div class="pwm-global-nav__right">
              <span id="pwmExtraNavSlot"></span>

              <div class="pwm-seg" role="group" aria-label="Language">
                <button type="button" id="pwmLangEn">EN</button>
                <button type="button" id="pwmLangZh">中文</button>
              </div>

              <div class="pwm-seg" role="group" aria-label="Color theme">
                <button type="button" id="pwmThemeLight" aria-label="Light theme">☀</button>
                <button type="button" id="pwmThemeDark" aria-label="Dark theme">☾</button>
              </div>

              <a class="pwm-pill pwm-hide-sm" href="https://github.com/FreedomIntelligence/Awesome-Code-World-Model" target="_blank" rel="noopener">
                <span>GitHub ↗</span>
              </a>
            </div>
          </div>
        </header>
      `;

      const closeBtn = document.getElementById('pwmTopbarClose');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          document.getElementById('pwmTopbar').hidden = true;
          localStorage.setItem('pwm-banner-dismissed', '1');
        });
      }
      document.getElementById('pwmLangEn').addEventListener('click', () => SHELL.setLang('en'));
      document.getElementById('pwmLangZh').addEventListener('click', () => SHELL.setLang('zh'));
      document.getElementById('pwmThemeLight').addEventListener('click', () => SHELL.setTheme('light'));
      document.getElementById('pwmThemeDark').addEventListener('click', () => SHELL.setTheme('dark'));
    }

    const subnavMount = document.getElementById('pwm-shell-subnav');
    if (subnavMount) {
      subnavMount.innerHTML = `
        <section class="pwm-subnav-band" aria-label="Explore sibling sub-pages">
          <div class="pwm-subnav-inner">
            ${ROUTES.map((r) => `
              <a class="pwm-subnav-card ${r.id === pageId ? 'is-current' : ''}" href="${r.href}">
                <div class="pwm-subnav-kicker">
                  <span>${r.num ? `WORK ${r.num}` : 'PORTAL ROOT'}</span>
                  <span class="pwm-subnav-state" data-current="${r.id === pageId ? '1' : '0'}">${r.id === pageId ? '● Current' : 'Open →'}</span>
                </div>
                <div class="pwm-subnav-title" data-route-en="${r.en}" data-route-zh="${r.zh}">${r.en}</div>
                <div class="pwm-subnav-desc" data-desc-en="${r.desc_en}" data-desc-zh="${r.desc_zh}">${r.desc_en}</div>
              </a>
            `).join('')}
          </div>
        </section>
      `;
    }

    applyShellState();
  }

  function applyShellState() {
    const zh = SHELL.lang === 'zh';
    root.setAttribute('data-theme', SHELL.theme);
    root.classList.toggle('zh', zh);
    root.lang = zh ? 'zh-CN' : 'en';

    const metaTheme = document.getElementById('meta-theme-color');
    if (metaTheme) {
      metaTheme.setAttribute('content', SHELL.theme === 'dark' ? '#0c0c0d' : '#ffffff');
    }

    const enBtn = document.getElementById('pwmLangEn');
    const zhBtn = document.getElementById('pwmLangZh');
    const lBtn = document.getElementById('pwmThemeLight');
    const dBtn = document.getElementById('pwmThemeDark');
    if (enBtn) enBtn.classList.toggle('is-active', !zh);
    if (zhBtn) zhBtn.classList.toggle('is-active', zh);
    if (lBtn) lBtn.classList.toggle('is-active', SHELL.theme === 'light');
    if (dBtn) dBtn.classList.toggle('is-active', SHELL.theme === 'dark');

    const lead = document.getElementById('pwmTopbarLead');
    const cta = document.getElementById('pwmTopbarCta');
    if (lead && cta) {
      if (pageId === 'survey') {
        lead.textContent = zh ? '子站 01 · 代码世界模型综述与 200 篇实时点阵图谱' : 'Work 01 · Code World Models Survey & 200-Paper Dot Atlas';
        cta.textContent = zh ? '继续查看 02 · PWM-Arena 评测基准 →' : 'Next: Open 02 · PWM-Arena Benchmark →';
      } else {
        lead.textContent = zh ? '开放研究计划 · 覆盖综述图谱、反事实基准与智能体方法三个子站' : 'Unified Research Portal · Survey Atlas, PWM-Arena & Agent Method';
        cta.textContent = zh ? '点开 01 · 综述与 200 篇点阵图谱子页 →' : 'Open 01 · Survey & 200-Paper Dot Atlas →';
      }
    }

    document.querySelectorAll('[data-route-en][data-route-zh]').forEach((el) => {
      el.textContent = zh ? el.getAttribute('data-route-zh') : el.getAttribute('data-route-en');
    });
    document.querySelectorAll('[data-desc-en][data-desc-zh]').forEach((el) => {
      el.textContent = zh ? el.getAttribute('data-desc-zh') : el.getAttribute('data-desc-en');
    });
    document.querySelectorAll('.pwm-subnav-state').forEach((el) => {
      const cur = el.getAttribute('data-current') === '1';
      el.textContent = cur ? (zh ? '● 当前页面' : '● Current') : (zh ? '进入子页 →' : 'Open →');
    });

    // Also translate standard [data-en][data-zh] elements on pages that use them
    document.querySelectorAll('[data-en][data-zh]').forEach((el) => {
      el.innerHTML = zh ? el.getAttribute('data-zh') : el.getAttribute('data-en');
    });
  }

  mountShell();
})();
