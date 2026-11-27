/* ==========================================================================
   02 · Evaluation Benchmark (In Progress) — Minimalist Subpage Script
   ========================================================================== */
(function () {
  'use strict';

  function syncTitle(shell) {
    const zh = shell && shell.lang === 'zh';
    document.title = zh
      ? '02 · 程序世界模型评测基准（In Progress）· Program World Model'
      : '02 · Evaluation Benchmark (In Progress) · Program World Model';
  }

  if (window.PWM_SHELL) {
    syncTitle(window.PWM_SHELL);
    window.PWM_SHELL.onChange(syncTitle);
  }
})();
