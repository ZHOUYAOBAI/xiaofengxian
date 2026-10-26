/* ============================================================
   前台交互
   ============================================================ */

(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let SITE = null;   // showings.json
  let SCRIPT = null; // script.json

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
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 320);
    }, 2800);
  }

  function fmtDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return {
      m: (d.getMonth() + 1) + '月',
      d: d.getDate(),
      wd: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      full: `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 周${['日','一','二','三','四','五','六'][d.getDay()]}`
    };
  }

  function fmtTimeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return m + ' 分钟前';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' 小时前';
    return Math.floor(h / 24) + ' 天前';
  }

  /* ============================================================
     剧目叙事：六幕
     ============================================================ */
  const ACT_INTRO = {
    '序幕': '袁世凯一道命令，把滇军都督召进京城。蔡锷离滇赴京的那一刻，还以为自己是去赴一场更大的棋局。',
    '一幕': '陕西巷云吉班。掌班张罗着声色，杨队长把蔡锷带来「消遣」。小凤仙在灯下唱《落花》——两个世界第一次照面。',
    '二幕': '一句「相信我吧」，一句「督军要是革命党呢」。从试探到交心，庭院里的第一次长谈，把身份的说辞一层层剥开。',
    '三幕': '局势骤紧。劝进表要来了。蔡锷必须在「顺应」与「出走」之间选一条路，而选路的人只能是他最不愿意连累的那一个。',
    '四幕': '蔡母、丫鬟与一份报纸。京城里的风声从纸面传到后院。蔡锷劝进表上已经签了字，而云南还在袁世凯的枪口下。',
    '五幕': '计划成形。梁先生、袁三儿、灯芯糕与一碗龙井——所有对话都指向同一个夜晚。蔡锷与小凤仙在这一幕里，正式把话说开。',
    '六幕': '雨夜将至。掌班的生日宴、听说、劝进——所有人在同一个空间里各怀心事。蔡锷必须当着小凤仙的面，把那张纸撕下来。',
    '尾声': '凤仙花开，明月依旧。庭院空了，故人已远。留一个回望的镜头，和一句说不完的话。'
  };

  function renderStory() {
    const box = $('#act-flow');
    if (!box || !SCRIPT) return;
    const html = SCRIPT.acts.map((a, i) => {
      const intro = ACT_INTRO[a.num] || '';
      const songs = (a.songIds || []).map(s =>
        `<span class="song-chip">${esc(s)}</span>`).join('');
      const sceneCount = a.scenes.length;
      return `
      <div class="act-row" data-reveal data-reveal-delay="${Math.min(i * 50, 300)}">
        <div class="act-badge">
          <div class="n">${esc(a.num)}</div>
          <div class="t">${esc(a.title)}</div>
          <div class="c">${sceneCount} 场</div>
        </div>
        <div class="act-body">
          <p class="d">${esc(intro)}</p>
          ${songs ? `<div class="songs">${songs}</div>` : ''}
        </div>
      </div>`;
    }).join('');
    box.innerHTML = html;
    // 交给动效层统一接管新插入节点的浮现
    if (window.Motion) window.Motion.observeReveals(box);
  }

  /* ============================================================
     人物谱
     ============================================================ */
  const LEAD_ROLES = ['蔡锷', '小凤仙'];
  const ROLE_DESC = {
    '蔡锷': '云南都督，护国军总司令。33 岁，心中装着共和，却要在小凤仙面前装作一个贪玩的风流将军。',
    '小凤仙': '云吉班头牌，15 岁。唱《落花》的女子。看似卖唱，实则在一场戏里看清了一个人，也看清了自己。',
    '杨队长': '袁世凯幕僚，侦缉队长。奉命「款待」蔡锷，是监视者，也是这条线上唯一带着旧式江湖气的角色。',
    '李副官': '蔡锷的副官，二十多岁。忠心、务实、话少，是全剧唯一一个敢对将军说「您也忍得」的人。',
    '蔡母': '蔡锷母亲，五十多岁。旧式大家闺秀的规矩与一个母亲的政治嗅觉，在她身上同时存在。',
    '掌班': '云吉班掌柜，中年。圆滑、精明、见风使舵，但也是这条胡同里唯一还记得旧日情分的人。',
    '刘妈妈': '云吉班的中年女管事，操心、热心、嘴碎，负责把所有的琐碎都张罗起来。',
    '丫鬟 / 喜鹊': '需变装的双角色。丫鬟随蔡母在府中，喜鹊在云吉班唱曲，是剧中最灵活的一双眼睛。'
  };

  function renderCast() {
    const lead = $('#cast-lead'), rest = $('#cast-rest');
    if (!lead || !rest || !SCRIPT) return;

    const byName = {};
    SCRIPT.roles.forEach(r => { byName[r.name] = r; });

    const leadHtml = LEAD_ROLES.map(name => {
      const r = byName[name];
      if (!r) return '';
      return `
      <div class="person">
        <div class="nm">${esc(name)}</div>
        <div class="meta">${esc(r.desc || '主要角色')}</div>
        <div class="ds">${esc(ROLE_DESC[name] || '')}</div>
        <span class="cast-rel">${name === '蔡锷' ? '执棋者，却从未算到她' : '唯一没算到的变数'}</span>
      </div>`;
    }).join('');
    lead.innerHTML = leadHtml;

    const restHtml = SCRIPT.roles
      .filter(r => !LEAD_ROLES.includes(r.name) && r.name !== '同唱' && r.name !== '三人' && r.name !== '画外音')
      .map(r => `
      <div class="person">
        <div class="nm"><span class="role-dot" style="background:${esc(r.color)}"></span>${esc(r.name)}</div>
        <div class="meta">${esc(r.desc || '')}</div>
        <div class="ds">${esc(ROLE_DESC[r.name] || '')}</div>
      </div>`).join('');
    rest.innerHTML = restHtml;
  }

  /* ============================================================
     演出场次
     ============================================================ */
  let currentShowings = [];

  function seatPct(s) { return s.seats ? Math.min(100, Math.round(s.booked / s.seats * 100)) : 0; }

  function statusOf(s) {
    const left = s.seats - s.booked;
    if (left <= 0) return { cls: 'pill-full', txt: '已满场' };
    if (seatPct(s) >= 80) return { cls: 'pill-low', txt: `仅余 ${left} 座` };
    return { cls: 'pill-open', txt: '可预约' };
  }

  function renderShowings() {
    const grid = $('#showing-grid');
    if (!grid || !SITE) return;
    currentShowings = SITE.showings.slice();

    grid.innerHTML = currentShowings.map(s => {
      const d = fmtDate(s.date);
      const st = statusOf(s);
      const pct = seatPct(s);
      return `
      <article class="showing-card">
        <div class="when">
          <span class="d">${d.d}</span>
          <span class="m">${d.m} · 周${d.wd} ${s.time}</span>
        </div>
        <div class="where"><b>${esc(s.venue)}</b></div>
        <div class="seats">
          <span class="pill ${st.cls}">${st.txt}</span>
          <span class="seat-bar${pct >= 80 ? ' is-low' : ''}" style="max-width:74px"><i style="width:${pct}%"></i></span>
        </div>
        ${s.highlight ? '<div class="acts"><span class="pill pill-new">本场次为导演推荐场</span></div>' : ''}
        <button class="btn btn-primary" data-book="${esc(s.id)}" ${s.seats - s.booked <= 0 ? 'disabled style="opacity:.45;cursor:not-allowed"' : ''}>
          ${s.seats - s.booked <= 0 ? '已满场' : '预约留位'}
        </button>
      </article>`;
    }).join('');

    $$('[data-book]', grid).forEach(btn => {
      btn.addEventListener('click', () => openBooking(btn.dataset.book));
    });
  }

  function renderHeroShowings() {
    const box = $('#hero-showings');
    const mon = $('#hero-month');
    if (!box || !SITE) return;
    const list = SITE.showings.slice(0, 3);
    if (list.length) {
      const d = fmtDate(list[0].date);
      mon.textContent = d.m.toUpperCase();
    }
    box.innerHTML = list.map(s => {
      const d = fmtDate(s.date);
      const st = statusOf(s);
      return `
      <div class="showing-item">
        <div class="showing-date">
          <div class="d">${d.d}</div>
          <div class="m">${d.m} 周${d.wd}</div>
        </div>
        <div class="showing-info">
          <div class="t">${s.time} · ${esc(st.txt)}</div>
          <div class="s">${esc(s.venue)}</div>
        </div>
        <button class="btn btn-on-dark" data-book="${esc(s.id)}">预约</button>
      </div>`;
    }).join('');
    $$('[data-book]', box).forEach(btn => {
      btn.addEventListener('click', () => openBooking(btn.dataset.book));
    });
  }

  /* ---------- 预约弹层 ---------- */
  let bookingTarget = null;

  function openBooking(id) {
    const s = currentShowings.find(x => x.id === id);
    if (!s) return;
    bookingTarget = s;
    const d = fmtDate(s.date);
    $('#bk-sub').textContent = `${d.full} ${s.time} · ${s.venue}`;
    $('#bk-status').textContent = '';
    $('#booking-modal').classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#bk-name').focus(), 60);
  }

  function closeBooking() {
    $('#booking-modal').classList.remove('is-open');
    document.body.style.overflow = '';
    bookingTarget = null;
  }

  function initBookingForm() {
    const form = $('#booking-form');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#bk-name').value.trim();
      const contact = $('#bk-contact').value.trim();
      const status = $('#bk-status');

      if (!name) { status.textContent = '请填写姓名。'; status.style.color = 'var(--cinnabar)'; return; }
      if (!contact) { status.textContent = '请填写联系方式。'; status.style.color = 'var(--cinnabar)'; return; }
      if (!bookingTarget) return;

      Store.addBooking({
        showingId: bookingTarget.id,
        date: bookingTarget.date,
        time: bookingTarget.time,
        venue: bookingTarget.venue,
        name, contact,
        seats: parseInt($('#bk-seats').value, 10) || 1,
        note: $('#bk-note').value.trim()
      });

      // 同步更新余票
      const target = currentShowings.find(x => x.id === bookingTarget.id);
      if (target) target.booked += parseInt($('#bk-seats').value, 10) || 1;

      status.textContent = '预约已提交，剧组会通过你留下的联系方式确认。';
      status.style.color = 'var(--text-2)';
      form.reset();
      setTimeout(() => {
        closeBooking();
        renderShowings();
        renderHeroShowings();
        renderMyBookings();
        toast('预约已提交');
      }, 1400);
    });

    $$('[data-close]', $('#booking-modal')).forEach(b => {
      b.addEventListener('click', closeBooking);
    });
    $('#booking-modal').addEventListener('click', e => {
      if (e.target.id === 'booking-modal') closeBooking();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeBooking();
    });
  }

  /* ---------- 我的预约 ---------- */
  function renderMyBookings() {
    const box = $('#my-bookings');
    if (!box) return;
    const list = Store.listBookings().filter(b => b.status !== 'cancelled');
    if (!list.length) {
      box.textContent = '还没有预约记录。到「来看戏」选一场吧。';
      return;
    }
    box.innerHTML = list.slice(0, 3).map(b => {
      const d = fmtDate(b.date);
      return `<div style="margin-bottom:8px">${d.m}${d.d} ${b.time} · ${b.seats} 位 · <span style="color:var(--cinnabar)">${b.status === 'pending' ? '待确认' : b.status}</span></div>`;
    }).join('') + (list.length > 3 ? `<div style="color:var(--text-3);font-size:13px">共 ${list.length} 条</div>` : '');
  }

  /* ============================================================
     观剧指南
     ============================================================ */
  function renderGuide() {
    const box = $('#guide-grid');
    if (!box || !SITE) return;
    const v = SITE.venue;

    const transport = v.transport.map(t =>
      `<dt>${esc(t.mode)}</dt><dd>${esc(t.detail)}</dd>`).join('');

    const price = v.price.map(p =>
      `<dt>${esc(p.tier)} · ${esc(p.price)}</dt><dd>${esc(p.note)}</dd>`).join('');

    const notice = v.notice.map(n => `<li>${esc(n)}</li>`).join('');

    box.innerHTML = `
      <div class="guide-item">
        <div class="g-t">剧场</div>
        <dl>
          <dt>地址</dt><dd>${esc(v.name)}<br>${esc(v.address)}</dd>
          <dt>时长</dt><dd>${esc(v.duration)}</dd>
        </dl>
      </div>
      <div class="guide-item">
        <div class="g-t">交通</div>
        <dl>${transport}</dl>
      </div>
      <div class="guide-item">
        <div class="g-t">票价</div>
        <dl>${price}</dl>
      </div>
      <div class="guide-item">
        <div class="g-t">观演须知</div>
        <ul style="font-size:14px;line-height:1.85;color:var(--text-2);padding-left:16px;list-style:disc">${notice}</ul>
      </div>`;
  }

  /* ============================================================
     原声试听
     ============================================================ */
  const AUDIO_TRACKS = [
    { file: 'feixu-liuyuechen.mp3', name: '飞絮', vocal: '小凤仙 · 刘玥辰', alt: 'feixu-lihuayu.mp3', altName: '飞絮 · 李化羽' },
    { file: 'pengpai.mp3', name: '澎湃', vocal: '蔡锷（咏叹）' },
    { file: 'qiuhen.mp3', name: '秋痕', vocal: '小凤仙（咏叹）' },
    { file: 'wangyue.mp3', name: '望月', vocal: '蔡锷 · 小凤仙（咏叹）' },
    { file: 'rongguang-liudonghan.mp3', name: '荣光', vocal: '蔡锷 · 刘冬寒', alt: 'rongguang-chengjiafeng.mp3', altName: '荣光 · 程甲风' },
    { file: 'feixu-lihuayu.mp3', name: '飞絮（另一版）', vocal: '小凤仙 · 李化羽' }
  ];

  let currentAudio = null;

  function fmtDur(sec) {
    if (!isFinite(sec)) return '--:--';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function renderAudio() {
    const box = $('#audio-list');
    if (!box) return;

    const tracks = [];
    AUDIO_TRACKS.forEach(t => {
      tracks.push(t);
      if (t.alt) tracks.push({ file: t.alt, name: t.altName, vocal: t.vocal, group: t.name });
    });

    box.innerHTML = tracks.map(t => `
      <div class="audio-row" data-audio="${esc(t.file)}">
        <div>
          <div class="nm">${esc(t.name)}</div>
          <div class="vc">${esc(t.vocal)}</div>
        </div>
        <div class="audio-ctrl">
          <button class="play" aria-label="播放 ${esc(t.name)}">
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>
          </button>
          <span class="dur">--:--</span>
        </div>
      </div>`).join('');

    $$('[data-audio]', box).forEach(row => {
      const btn = $('.play', row);
      const dur = $('.dur', row);
      const audio = new Audio('assets/' + row.dataset.audio);
      audio.preload = 'metadata';

      const setPlaying = on => {
        btn.classList.toggle('is-playing', on);
        btn.innerHTML = on
          ? '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1" width="3" height="10"/><rect x="7" y="1" width="3" height="10"/></svg>'
          : '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>';
      };

      audio.addEventListener('loadedmetadata', () => { dur.textContent = fmtDur(audio.duration); });
      audio.addEventListener('timeupdate', () => { dur.textContent = fmtDur(audio.currentTime); });
      audio.addEventListener('ended', () => { setPlaying(false); dur.textContent = fmtDur(audio.duration); });
      audio.addEventListener('pause', () => setPlaying(false));
      audio.addEventListener('play', () => setPlaying(true));

      btn.addEventListener('click', () => {
        if (currentAudio && currentAudio !== audio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        currentAudio = audio;
        if (audio.paused) audio.play(); else audio.pause();
      });

      row._audio = audio;
    });
  }

  /* ============================================================
     曲谱画廊
     ============================================================ */
  let galleryItems = [];
  let lbIndex = 0;

  function renderGallery() {
    const box = $('#gallery-grid');
    if (!box) return;

    galleryItems = [];
    for (let i = 1; i <= 20; i++) {
      galleryItems.push({
        thumb: `assets/thumbs/image${i}.webp`,
        full: `assets/scores-webp/image${i}.webp`,
        cap: `曲谱 ${String(i).padStart(2, '0')}`
      });
    }

    box.innerHTML = galleryItems.map((g, i) => `
      <figure class="gallery-item" data-gal="${i}">
        <img src="${g.thumb}" alt="${esc(g.cap)}" loading="lazy" width="320" height="452">
        <figcaption class="cap">${esc(g.cap)}</figcaption>
      </figure>`).join('');

    $$('[data-gal]', box).forEach(el => {
      el.addEventListener('click', () => openLightbox(parseInt(el.dataset.gal, 10)));
    });
  }

  function openLightbox(i) {
    lbIndex = (i + galleryItems.length) % galleryItems.length;
    const g = galleryItems[lbIndex];
    $('#lb-img').src = g.full;
    $('#lb-img').alt = g.cap;
    $('#lb-cap').textContent = g.cap + ` （${lbIndex + 1} / ${galleryItems.length}）`;
    $('#lightbox').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    $('#lightbox').classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function initLightbox() {
    $('#lightbox').addEventListener('click', e => {
      const act = e.target.dataset.lb;
      if (act === 'close') closeLightbox();
      else if (act === 'prev') openLightbox(lbIndex - 1);
      else if (act === 'next') openLightbox(lbIndex + 1);
      else if (e.target.id === 'lightbox') closeLightbox();
    });
    document.addEventListener('keydown', e => {
      if (!$('#lightbox').classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') openLightbox(lbIndex - 1);
      if (e.key === 'ArrowRight') openLightbox(lbIndex + 1);
    });
  }

  /* ============================================================
     招角
     ============================================================ */
  function renderJoin() {
    if (!SITE) return;
    const roles = $('#role-open-list'), steps = $('#step-list'), sel = $('#ap-role');
    if (!roles) return;

    roles.innerHTML = SITE.audition.roles.map(r => `
      <div class="role-open-item">
        <div class="rn">${esc(r.name)}<small>${esc(r.note)}</small></div>
        <span class="st"><span class="pill ${r.open ? 'pill-open' : 'pill-full'}">${r.open ? '招募中' : '已定档'}</span></span>
      </div>`).join('');

    steps.innerHTML = SITE.audition.steps.map(s => `
      <li>
        <div class="sn">${esc(s.n)}</div>
        <div>
          <div class="st">${esc(s.t)}</div>
          <div class="sd">${esc(s.d)}</div>
        </div>
      </li>`).join('');

    if (sel) {
      const open = SITE.audition.roles.filter(r => r.open);
      sel.innerHTML = '<option value="">请选择…</option>' +
        open.map(r => `<option value="${esc(r.name)}">${esc(r.name)}（${esc(r.note)}）</option>`).join('');
    }
  }

  function initApplyForm() {
    const form = $('#apply-form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#ap-name').value.trim();
      const contact = $('#ap-contact').value.trim();
      const role = $('#ap-role').value;
      const status = $('#apply-status');

      if (!name) { status.textContent = '请填写姓名。'; status.style.color = 'var(--cinnabar-lt)'; return; }
      if (!contact) { status.textContent = '请填写联系方式。'; status.style.color = 'var(--cinnabar-lt)'; return; }
      if (!role) { status.textContent = '请选择应聘角色。'; status.style.color = 'var(--cinnabar-lt)'; return; }

      Store.addApplication({
        name, contact, role,
        video: $('#ap-video').value.trim(),
        note: $('#ap-note').value.trim()
      });

      status.textContent = '投递已提交。制作组会在 7 个工作日内联系你。';
      status.style.color = 'var(--on-dark-2)';
      form.reset();
      toast('投递已提交');
    });
  }

  /* ============================================================
     留言
     ============================================================ */
  function renderMessages() {
    const box = $('#msg-list');
    if (!box) return;
    const list = Store.listMessages();
    if (!list.length) {
      box.innerHTML = '<div class="empty"><b>还没有留言</b>来做第一个留言的人。</div>';
      return;
    }
    box.innerHTML = list.map(m => `
      <article class="msg-item${m.status === 'pending' ? ' is-pending' : ''}">
        <div class="mh">
          <span class="mn">${esc(m.name)}</span>
          <span class="md">${esc(fmtTimeAgo(m.createdAt))}${m.status === 'pending' ? ' · 待审阅' : ''}</span>
        </div>
        <p class="mt">${esc(m.text)}</p>
      </article>`).join('');
  }

  function initMsgForm() {
    const form = $('#msg-form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#mg-name').value.trim();
      const text = $('#mg-text').value.trim();
      const status = $('#msg-status');
      if (!name || !text) {
        status.textContent = '称呼和留言都要填。';
        status.style.color = 'var(--cinnabar)';
        return;
      }
      Store.addMessage({ name, text });
      status.textContent = '留言已提交，审阅后会在下方显示。';
      status.style.color = 'var(--text-2)';
      form.reset();
      renderMessages();
      toast('留言已提交');
    });
  }

  /* ============================================================
     启动
     ============================================================ */
  async function boot() {
    try {
      const [sRes, scRes] = await Promise.all([
        fetch('data/showings.json').then(r => r.json()),
        fetch('data/script.json').then(r => r.json())
      ]);
      SITE = sRes;
      SCRIPT = scRes;
    } catch (err) {
      console.error('数据加载失败', err);
      const flow = $('#act-flow');
      if (flow) flow.innerHTML = '<div class="empty"><b>数据加载失败</b>请确认 data/ 目录下的 showings.json 与 script.json 存在，并通过 HTTP 方式打开本页面。</div>';
      return;
    }

    renderStory();
    renderCast();
    renderShowings();
    renderHeroShowings();
    renderGuide();
    renderAudio();
    renderGallery();
    renderJoin();
    renderMessages();
    renderMyBookings();

    initBookingForm();
    initLightbox();
    initApplyForm();
    initMsgForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
