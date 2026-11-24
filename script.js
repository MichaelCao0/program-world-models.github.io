(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.lang-switch');
  const stored = localStorage.getItem('pwm-language');
  const setLanguage = (language) => {
    const chinese = language === 'zh';
    root.classList.toggle('zh', chinese);
    root.lang = chinese ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-en][data-zh]').forEach((element) => {
      element.innerHTML = chinese ? element.dataset.zh : element.dataset.en;
    });
    toggle.textContent = chinese ? 'EN' : '中';
    toggle.setAttribute('aria-pressed', String(chinese));
    document.title = chinese ? 'Program World Model｜程序世界模型' : 'Program World Model';
    localStorage.setItem('pwm-language', language);
  };
  setLanguage(stored === 'zh' ? 'zh' : 'en');
  toggle.addEventListener('click', () => setLanguage(root.classList.contains('zh') ? 'en' : 'zh'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('in-view');
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.section, .work-card, .spectrum').forEach((el) => {
    el.classList.add('reveal');
    observer.observe(el);
  });
})();
