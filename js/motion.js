/* ============================================================
   动效层 —— 三层结构，全部只动 transform / opacity
   1) 首屏入场  2) 滚动浮现  3) 交互反馈
   prefers-reduced-motion 下完全降级为静止
   ============================================================ */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 首屏入场 ---------- */
  function heroIntro() {
    const items = document.querySelectorAll('[data-hero]');
    if (!items.length) return;

    if (reduceMotion) {
      items.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
      return;
    }

    items.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      el.style.transition = 'opacity .68s cubic-bezier(.16,1,.3,1), transform .68s cubic-bezier(.16,1,.3,1)';
      el.style.transitionDelay = (i * 80) + 'ms';
      // 强制回流以确保过渡生效
      void el.offsetHeight;
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    });
  }

  /* ---------- 2. 滚动浮现 ----------
     采用「滚动位置判定 + rAF 节流」而非纯 IntersectionObserver：
     快速滚动 / 锚点跳转时观察器会漏触发，位置判定不会。 */
  const pendingReveals = [];

  function revealEl(el) {
    if (el.dataset.revealed) return;
    el.dataset.revealed = '1';
    const delay = parseInt(el.dataset.revealDelay || '0', 10);
    el.style.transition = 'opacity .62s cubic-bezier(.16,1,.3,1), transform .62s cubic-bezier(.16,1,.3,1)';
    el.style.transitionDelay = delay + 'ms';
    el.style.opacity = '1';
    el.style.transform = 'none';
    const i = pendingReveals.indexOf(el);
    if (i >= 0) pendingReveals.splice(i, 1);
  }

  function checkReveals() {
    if (!pendingReveals.length) return;
    const limit = window.innerHeight * 0.92;
    for (let i = pendingReveals.length - 1; i >= 0; i--) {
      const el = pendingReveals[i];
      const r = el.getBoundingClientRect();
      if (r.top < limit) revealEl(el);
    }
  }

  let rafPending = false;
  function onScrollReveal() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      checkReveals();
    });
  }

  function observeReveals(root) {
    const scope = root || document;
    const targets = Array.from(scope.querySelectorAll('[data-reveal]'))
      .filter(el => !el.dataset.revealed && !el.dataset.revealBound);

    if (reduceMotion || !targets.length) {
      targets.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
      return;
    }

    targets.forEach(el => {
      el.dataset.revealBound = '1';
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      pendingReveals.push(el);
    });
    checkReveals();
  }

  function revealInit() {
    observeReveals(document);
    window.addEventListener('scroll', onScrollReveal, { passive: true });
    window.addEventListener('resize', onScrollReveal, { passive: true });
    // 兜底：任何时候都保证可见内容不会被卡住
    setTimeout(checkReveals, 1200);
  }

  /* ---------- 3. 交互反馈：按钮按压 ---------- */
  function pressFeedback() {
    if (reduceMotion) return;
    document.addEventListener('pointerdown', e => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      btn.style.transform = 'scale(.975)';
    });
    document.addEventListener('pointerup', () => {
      document.querySelectorAll('.btn').forEach(b => { b.style.transform = ''; });
    });
  }

  /* ---------- 导航：滚动变浅色 + 当前区块高亮 ---------- */
  function headerScroll() {
    const head = document.getElementById('site-head');
    if (!head) return;
    const hero = document.querySelector('.hero');
    const heroBottom = hero ? hero.offsetHeight : 0;

    const onScroll = () => {
      const y = window.scrollY;
      head.classList.toggle('is-light', y > heroBottom - 120);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // 当前区块高亮
    const links = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map();
    links.forEach(a => {
      const sec = document.querySelector(a.getAttribute('href'));
      if (sec) map.set(sec, a);
    });
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(a => a.classList.remove('is-current'));
        const a = map.get(en.target);
        if (a) a.classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, sec) => spy.observe(sec));
  }

  /* ---------- 数字滚动 ---------- */
  function countUp() {
    const nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      nums.forEach(el => { el.textContent = el.dataset.count; });
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = parseFloat(el.dataset.count);
        const dur = 900;
        const t0 = performance.now();
        const tick = now => {
          const p = Math.min((now - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.unobserve(el);
      });
    }, { threshold: .5 });
    nums.forEach(el => io.observe(el));
  }

  /* ---------- 移动端导航 ---------- */
  function mobileNav() {
    const btn = document.getElementById('nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? '✕' : '☰';
    });
    nav.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = '☰';
      }
    });
  }

  /* ---------- 启动 ---------- */
  function init() {
    heroIntro();
    revealInit();
    pressFeedback();
    headerScroll();
    countUp();
    mobileNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Motion = { reduceMotion, observeReveals };
})();
