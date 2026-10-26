/* ============================================================
   剧本工作台
   数据源：data/script.json（由排版稿 docx 结构化而来）
   ============================================================ */

(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let DATA = null;
  let currentRole = 'all';
  let currentLine = -1;
  let fontScale = 1;

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg, isErr) {
    const wrap = $('#toast-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast' + (isErr ? ' is-err' : '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 320);
    }, 2600);
  }

  /* 把舞台提示 / 动作提示从台词正文里分离出来 */
  const CUE_RE = /（[^）]*）|\([^)]{1,12}\)/g;

  function splitCue(text) {
    const parts = [];
    let last = 0;
    let m;
    CUE_RE.lastIndex = 0;
    while ((m = CUE_RE.exec(text)) !== null) {
      if (m.index > last) parts.push({ type: 'text', v: text.slice(last, m.index) });
      parts.push({ type: 'cue', v: m[0] });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ type: 'text', v: text.slice(last) });
    return parts;
  }

  function renderCue(text) {
    return splitCue(text)
      .map(p => p.type === 'cue' ? `<span class="cue">${esc(p.v)}</span>` : esc(p.v))
      .join('');
  }

  /* ---------- 渲染 ---------- */
  function buildScript() {
    const box = $('#wb-script');
    if (!box || !DATA) return;

    // 建立 行索引 → 场景 / 幕 的映射
    const lineScene = new Map();
    const lineAct = new Map();
    DATA.acts.forEach(a => {
      a.scenes.forEach(s => {
        (s.lineIds || []).forEach(id => { lineScene.set(id, s); lineAct.set(id, a); });
      });
    });

    // 角色台词行数
    const counts = {};
    DATA.lines.forEach(l => {
      if (l.kind === 'line') counts[l.roleId] = (counts[l.roleId] || 0) + 1;
    });

    // 角色筛选按钮
    const filters = $('#role-filters');
    const allBtn = `<button class="role-filter is-active" data-role="all">全部<span class="cnt">${Object.values(counts).reduce((a, b) => a + b, 0)}</span></button>`;
    const roleBtns = DATA.roles
      .filter(r => counts[r.id])
      .map(r => `<button class="role-filter" data-role="${esc(r.id)}"><span class="role-dot" style="background:${esc(r.color)};margin:0"></span>${esc(r.name)}<span class="cnt">${counts[r.id]}</span></button>`)
      .join('');
    filters.innerHTML = allBtn + roleBtns;

    // 曲目跳转
    const jump = $('#song-jump');
    const songOpts = DATA.songs.map(s =>
      `<option value="${esc(s.title)}">${esc(s.title)}${s.hasLyrics ? '' : '（无唱词）'}</option>`).join('');
    jump.innerHTML = '<option value="">跳到某首歌…</option>' + songOpts;

    // 场次目录
    const actNav = $('#act-nav');
    actNav.innerHTML = DATA.acts.map((a, i) =>
      `<a href="#act-${esc(a.id)}" data-act="${esc(a.id)}"><span class="an">${esc(a.num)}</span><span class="at">${esc(a.title)}</span></a>`).join('');

    // 正文
    const html = DATA.acts.map((a, ai) => {
      const lines = [];
      a.scenes.forEach(s => {
        const sceneLines = (s.lineIds || []).map(id => DATA.lines[id]).filter(Boolean);
        if (!sceneLines.length) return;

        const body = sceneLines.map(l => {
          if (l.kind === 'stage') {
            return `<div class="scene-note">${esc(l.text)}</div>`;
          }
          if (l.kind === 'lyric') {
            return `<div class="line lyric" data-role="${esc(l.roleId)}" data-idx="${l.__i}">
              <div class="who" style="color:${roleColor(l.roleId)}">${esc(l.roleName)}</div>
              <div class="what">${esc(l.text)}</div>
            </div>`;
          }
          if (l.kind === 'line') {
            return `<div class="line" data-role="${esc(l.roleId)}" data-idx="${l.__i}">
              <div class="who" style="color:${roleColor(l.roleId)}">${esc(l.roleName)}</div>
              <div class="what">${renderCue(l.text)}</div>
            </div>`;
          }
          return `<div class="line text" data-idx="${l.__i}">
            <div class="who"></div><div class="what">${esc(l.text)}</div>
          </div>`;
        }).join('');

        lines.push(`<div class="scene">${body}</div>`);
      });

      const songList = (a.songIds || []).join(' · ');
      return `
      <section class="act-block" id="act-${esc(a.id)}" data-act-block="${esc(a.id)}">
        <div class="act-h">
          <span class="n">${esc(a.num)}</span>
          <span class="t">${esc(a.title)}</span>
          <span class="meta">${a.scenes.length} 场${songList ? ' · ' + esc(songList) : ''}</span>
        </div>
        ${lines.join('')}
      </section>`;
    }).join('');

    box.innerHTML = html;
  }

  function roleColor(id) {
    const r = DATA.roles.find(x => x.id === id);
    return r ? r.color : 'var(--text-2)';
  }

  /* ---------- 交互：角色筛选 ---------- */
  function initFilters() {
    $('#role-filters').addEventListener('click', e => {
      const btn = e.target.closest('.role-filter');
      if (!btn) return;
      $$('.role-filter').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentRole = btn.dataset.role;

      const box = $('#wb-script');
      const name = btn.textContent.replace(/\d+$/, '').trim();

      if (currentRole === 'all') {
        box.classList.remove('is-filtered');
        $$('.line', box).forEach(l => l.classList.remove('is-mine'));
        $('#now-line').innerHTML = '<span class="dot" style="background:var(--ink)"></span><span>显示全部台词</span>';
      } else {
        box.classList.add('is-filtered');
        $$('.line', box).forEach(l => {
          l.classList.toggle('is-mine', l.dataset.role === currentRole);
        });
        $('#now-line').innerHTML =
          `<span class="dot" style="background:${roleColor(currentRole)}"></span><span>正在看 <b>${esc(name)}</b> 的台词</span>`;
      }
    });
  }

  /* ---------- 交互：检索跳转 ---------- */
  function findAndJump(q) {
    const box = $('#wb-script');
    $$('.line', box).forEach(l => l.classList.remove('is-hit', 'is-current'));

    if (!q) { toast('请输入要检索的内容'); return; }

    const needle = q.trim().toLowerCase();
    const hits = [];
    $$('.line', box).forEach(el => {
      const what = $('.what', el);
      if (what && what.textContent.toLowerCase().includes(needle)) hits.push(el);
    });

    if (!hits.length) { toast('没有找到「' + q + '」', true); return; }

    hits.forEach(h => h.classList.add('is-hit'));
    const first = hits[0];
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    first.classList.add('is-current');

    toast(hits.length > 1 ? `找到 ${hits.length} 处，已定位到第一处` : '已定位');
  }

  function initSearch() {
    const input = $('#lyric-search');
    const go = () => findAndJump(input.value);

    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#find-btn').addEventListener('click', go);
    $('#reset-btn').addEventListener('click', () => {
      input.value = '';
      $('#song-jump').value = '';
      $$('.line').forEach(l => l.classList.remove('is-hit', 'is-current'));
      $$('.line').forEach(l => {
        const w = $('.what', l);
        if (w) w.innerHTML = renderCue(w.textContent);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    $('#song-jump').addEventListener('change', e => {
      const title = e.target.value;
      if (!title) return;
      const idx = DATA.lines.findIndex(l => l.songIndex !== null &&
        (DATA.songs[l.songIndex] ? DATA.songs[l.songIndex].title === title : false));
      if (idx < 0) { toast('未找到该曲目的唱词', true); return; }
      const target = $(`[data-idx="${idx}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('is-current');
        setTimeout(() => target.classList.remove('is-current'), 2600);
      }
    });
  }

  /* ---------- 交互：字号 ---------- */
  function applyFont() {
    document.documentElement.style.setProperty('--font-scale', fontScale);
    $('#font-val').textContent = Math.round(fontScale * 100) + '%';
    Store.setPref('fontScale', fontScale);
  }

  function initFont() {
    const p = Store.getPrefs();
    fontScale = p.fontScale || 1;
    applyFont();
    $('#font-up').addEventListener('click', () => {
      fontScale = Math.min(1.6, +(fontScale + 0.1).toFixed(2));
      applyFont();
    });
    $('#font-down').addEventListener('click', () => {
      fontScale = Math.max(0.8, +(fontScale - 0.1).toFixed(2));
      applyFont();
    });
  }

  /* ---------- 目录高亮 ---------- */
  function initActSpy() {
    const blocks = $$('[data-act-block]');
    if (!blocks.length || !('IntersectionObserver' in window)) return;
    const links = new Map();
    $$('#act-nav a').forEach(a => links.set(a.dataset.act, a));

    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(l => l.classList.remove('is-current'));
        const l = links.get(en.target.dataset.actBlock);
        if (l) l.classList.add('is-current');
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    blocks.forEach(b => io.observe(b));
  }

  /* ---------- 启动 ---------- */
  async function boot() {
    try {
      DATA = await fetch('data/script.json').then(r => r.json());
    } catch (err) {
      console.error('剧本加载失败', err);
      $('#wb-script').innerHTML =
        '<div class="empty"><b>剧本加载失败</b>请确认 data/script.json 存在，并通过 HTTP 方式打开本页面。</div>';
      return;
    }

    // 给每行加全局索引
    DATA.lines.forEach((l, i) => { l.__i = i; });

    buildScript();
    initFilters();
    initSearch();
    initFont();
    initActSpy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
