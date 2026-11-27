/* ==========================================================================
   03 · Modeling Method (In Progress) — Minimalist Subpage Script
   ========================================================================== */
(function () {
  'use strict';

  function syncTitle(shell) {
    const zh = shell && shell.lang === 'zh';
    document.title = zh
      ? '03 · 程序世界模型方法（In Progress）· Program World Model'
      : '03 · Modeling Method (In Progress) · Program World Model';
  }

  if (window.PWM_SHELL) {
    syncTitle(window.PWM_SHELL);
    window.PWM_SHELL.onChange(syncTitle);
  }
})();
