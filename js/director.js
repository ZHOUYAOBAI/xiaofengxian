/* ============================================================
   导演工作台
   数据源：Store（本地存储，可导出/导入）
   ============================================================ */

(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ACTS = [];
  let CAST = [];
  let currentTab = 'overview';

  const ACT_LABELS = ['序幕', '一幕', '二幕', '三幕', '四幕', '五幕', '六幕', '尾声'];
  const CAST_LIST = ['蔡锷', '小凤仙', '杨队长', '李副官', '蔡母', '掌班', '刘妈妈', '喜鹊', '丫鬟'];

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

  /* ---------- 默认状态 ---------- */
  function defaultState() {
    const acts = {};
    ACT_LABELS.forEach(a => { acts[a] = false; });
    const att = {};
    CAST_LIST.forEach(c => { att[c] = { present: false, state: '' }; });
    const notes = {};
    ACT_LABELS.forEach(a => { notes[a] = ''; });
    return {
      acts, att, notes,
      music: {},
      todos: [],
      notice: { date: '', time: '', location: '', acts: [], cast: [], notes: '' }
    };
  }

  function state() {
    const s = Store.getDirector();
    if (!s) return defaultState();
    const d = defaultState();
    return Object.assign(d, s, {
      acts: Object.assign(d.acts, s.acts || {}),
      att: Object.assign(d.att, s.att || {}),
      notes: Object.assign(d.notes, s.notes || {})
    });
  }

  function save(patch) {
    Store.setDirector(patch);
  }

  /* ============================================================
     渲染各模块
     ============================================================ */
  function renderOverview(st) {
    const doneActs = ACT_LABELS.filter(a => st.acts[a]).length;
    const present = CAST_LIST.filter(c => st.att[c] && st.att[c].present).length;
    const openTodos = st.todos.filter(t => !t.done).length;
    const pendingApps = Store.listApplications().filter(a => a.status === 'received').length;
    const pendingMsgs = Store.listMessages().filter(m => m.status === 'pending').length;

    return `
      <h3>总览</h3>
      <p class="dv-sub">截至 ${new Date().toLocaleDateString('zh-CN')} · 数据保存在本机</p>

      <div class="dv-stat-row">
        <div class="dv-stat"><div class="n">${doneActs}<span style="font-size:14px;color:var(--text-3)">/${ACT_LABELS.length}</span></div><div class="k">已排练幕次</div></div>
        <div class="dv-stat"><div class="n">${present}<span style="font-size:14px;color:var(--text-3)">/${CAST_LIST.length}</span></div><div class="k">今日到场</div></div>
        <div class="dv-stat"><div class="n">${openTodos}</div><div class="k">未完成待办</div></div>
        <div class="dv-stat"><div class="n">${pendingApps}</div><div class="k">待审投递</div></div>
        <div class="dv-stat"><div class="n">${pendingMsgs}</div><div class="k">待审留言</div></div>
      </div>

      <div class="notice">
        <b>下一步</b><br>
        ${nextHint(st)}
      </div>

      <div class="dv-io">
        <button class="btn btn-ghost btn-sm" data-goto="progress">去更新排练进度</button>
        <button class="btn btn-ghost btn-sm" data-goto="notice">生成通告单</button>
        <button class="btn btn-ghost btn-sm" data-goto="reviews">查看投递与留言</button>
      </div>`;
  }

  function nextHint(st) {
    const next = ACT_LABELS.find(a => !st.acts[a]);
    if (!next) return '全部幕次已标记为排练完成。可以开始做场记与通告单了。';
    const todo = st.todos.find(t => !t.done);
    const hint = todo ? `还有一条待办未完成：「${todo.text}」。` : '';
    return `${hint}尚未标记完成的幕次是「${next}」。`;
  }

  function renderProgress(st) {
    const done = ACT_LABELS.filter(a => st.acts[a]).length;
    return `
      <h3>排练进度</h3>
      <p class="dv-sub">勾选已完整排练的幕次 · ${done}/${ACT_LABELS.length}</p>
      <div class="dv-block">
        <h4>幕次完成度 <span class="cnt">${done}/${ACT_LABELS.length}</span></h4>
        ${ACT_LABELS.map(a => `
          <label class="dv-check${st.acts[a] ? ' is-done' : ''}">
            <input type="checkbox" data-act-check="${esc(a)}" ${st.acts[a] ? 'checked' : ''}>
            <span>${esc(a)}</span>
          </label>`).join('')}
      </div>
      <div class="dv-block" style="margin-top:26px">
        <h4>音乐备注 <span class="cnt">按曲目</span></h4>
        ${['飞絮', '秋痕', '澎湃', '望月', '荣光'].map(s => `
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
            <div style="flex:0 0 92px;font-size:13.5px;font-weight:600">${esc(s)}</div>
            <input class="input" style="padding:8px 10px;font-size:13.5px" data-music="${esc(s)}"
              value="${esc(st.music[s] || '')}" placeholder="速度 / 问题 / 备注">
          </div>`).join('')}
      </div>`;
  }

  function renderAttendance(st) {
    const present = CAST_LIST.filter(c => st.att[c] && st.att[c].present).length;
    return `
      <h3>演员到场</h3>
      <p class="dv-sub">勾选到场，并标记状态 · 今日 ${present}/${CAST_LIST.length}</p>
      <div class="dv-block">
        <h4>到场状态 <span class="cnt">${present}/${CAST_LIST.length}</span></h4>
        ${CAST_LIST.map(c => {
          const a = st.att[c] || { present: false, state: '' };
          return `
          <div class="dv-check${a.present ? '' : ''}">
            <input type="checkbox" data-att-check="${esc(c)}" ${a.present ? 'checked' : ''}>
            <span>${esc(c)}</span>
            <select data-att-state="${esc(c)}">
              <option value="">状态…</option>
              <option value="ok" ${a.state === 'ok' ? 'selected' : ''}>OK</option>
              <option value="practice" ${a.state === 'practice' ? 'selected' : ''}>需加练</option>
              <option value="absent" ${a.state === 'absent' ? 'selected' : ''}>缺</option>
            </select>
          </div>`;
        }).join('')}
      </div>`;
  }

  function renderNotes(st) {
    return `
      <h3>场记</h3>
      <p class="dv-sub">每幕的排到哪、卡在哪、下次复排什么</p>
      ${ACT_LABELS.map(a => `
        <div class="dv-block">
          <h4>${esc(a)}</h4>
          <textarea class="textarea dv-note" data-note="${esc(a)}"
            placeholder="排到哪？问题？下次复排？">${esc(st.notes[a] || '')}</textarea>
        </div>`).join('')}`;
  }

  function renderTodos(st) {
    return `
      <h3>待办</h3>
      <p class="dv-sub">${st.todos.filter(t => !t.done).length} 条未完成 / 共 ${st.todos.length} 条</p>
      <div style="display:flex;gap:10px;margin-bottom:20px">
        <input class="input" id="todo-input" placeholder="新增待办，回车添加" style="flex:1">
        <button class="btn btn-primary" id="todo-add">添加</button>
      </div>
      <div id="todo-list">
        ${st.todos.length ? st.todos.map((t, i) => `
          <div class="dv-todo${t.done ? ' is-done' : ''}" data-todo="${i}">
            <input type="checkbox" ${t.done ? 'checked' : ''} data-todo-check="${i}">
            <span>${esc(t.text)}</span>
            <button class="del" data-todo-del="${i}" aria-label="删除">&times;</button>
          </div>`).join('') : '<div class="empty">暂无待办</div>'}
      </div>`;
  }

  function renderNotice(st) {
    const n = st.notice || {};
    return `
      <h3>通告单</h3>
      <p class="dv-sub">填好后可直接复制或打印分发给全组</p>
      <div class="dv-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        <div class="field">
          <label for="nt-date">日期</label>
          <input class="input" type="date" id="nt-date" value="${esc(n.date || '')}">
        </div>
        <div class="field">
          <label for="nt-time">时间</label>
          <input class="input" type="time" id="nt-time" value="${esc(n.time || '')}">
        </div>
        <div class="field">
          <label for="nt-loc">地点</label>
          <input class="input" type="text" id="nt-loc" value="${esc(n.location || '昆明 · 钱王街 马家大院')}" placeholder="排练地点">
        </div>
      </div>
      <div class="dv-block">
        <h4>参演人员</h4>
        ${CAST_LIST.map(c => `
          <label class="dv-check">
            <input type="checkbox" data-nt-cast="${esc(c)}" ${(n.cast || []).includes(c) ? 'checked' : ''}>
            <span>${esc(c)}</span>
          </label>`).join('')}
      </div>
      <div class="dv-block" style="margin-top:24px">
        <h4>排练内容</h4>
        ${ACT_LABELS.map(a => `
          <label class="dv-check">
            <input type="checkbox" data-nt-act="${esc(a)}" ${(n.acts || []).includes(a) ? 'checked' : ''}>
            <span>${esc(a)}</span>
          </label>`).join('')}
      </div>
      <div class="dv-block" style="margin-top:24px">
        <h4>注意事项</h4>
        <textarea class="textarea dv-note" id="nt-notes" placeholder="服装、道具、走位、场地…">${esc(n.notes || '')}</textarea>
      </div>
      <div class="dv-io">
        <button class="btn btn-primary btn-sm" id="nt-copy">复制通告单</button>
        <button class="btn btn-ghost btn-sm" id="nt-print">打印</button>
      </div>
      <div id="nt-preview" style="margin-top:22px"></div>`;
  }

  function buildNoticeText(st) {
    const n = st.notice || {};
    const L = [];
    L.push('《蔡锷与小凤仙》排练通告单');
    L.push('────────────────────────');
    L.push(`日期：${n.date || '待定'}    时间：${n.time || '待定'}`);
    L.push(`地点：${n.location || '待定'}`);
    L.push('');
    L.push(`参演人员：${(n.cast || []).length ? (n.cast || []).join('、') : '（待定）'}`);
    L.push(`排练内容：${(n.acts || []).length ? (n.acts || []).join('、') : '（待定）'}`);
    if (n.notes) {
      L.push('');
      L.push('注意事项：');
      L.push(n.notes);
    }
    L.push('');
    L.push('—— 云南钟声音乐制作有限公司');
    return L.join('\n');
  }

  function renderReviews(st) {
    const apps = Store.listApplications();
    const msgs = Store.listMessages();

    const appRows = apps.length ? apps.map(a => `
      <tr>
        <td>${esc(a.name)}<div style="font-weight:400;color:var(--text-3);font-size:12.5px">${esc(a.contact)}</div></td>
        <td>${esc(a.role)}</td>
        <td>${esc(new Date(a.createdAt).toLocaleDateString('zh-CN'))}</td>
        <td><select data-app-status="${esc(a.id)}">
          ${['received', 'interview', 'cast', 'rejected'].map(s =>
            `<option value="${s}" ${a.status === s ? 'selected' : ''}>${
              { received: '已收', interview: '待约', cast: '已约', rejected: '未通过' }[s]
            }</option>`).join('')}
        </select></td>
      </tr>`).join('') : '<tr><td colspan="4" style="color:var(--text-3)">暂无投递记录</td></tr>';

    const msgRows = msgs.length ? msgs.map(m => `
      <tr>
        <td>${esc(m.name)}</td>
        <td>${esc(m.text)}</td>
        <td><select data-msg-status="${esc(m.id)}">
          ${['pending', 'approved', 'hidden'].map(s =>
            `<option value="${s}" ${m.status === s ? 'selected' : ''}>${
              { pending: '待审', approved: '已公开', hidden: '已隐藏' }[s]
            }</option>`).join('')}
        </select></td>
      </tr>`).join('') : '<tr><td colspan="3" style="color:var(--text-3)">暂无留言</td></tr>';

    return `
      <h3>投递与留言</h3>
      <p class="dv-sub">演员投递 ${apps.length} 条 · 观众留言 ${msgs.length} 条</p>

      <div class="dv-block">
        <h4>演员投递 <span class="cnt">${apps.length}</span></h4>
        <div class="table-wrap">
          <table class="notice-table">
            <thead><tr><th>投递人</th><th>角色</th><th>日期</th><th>状态</th></tr></thead>
            <tbody>${appRows}</tbody>
          </table>
        </div>
      </div>

      <div class="dv-block" style="margin-top:30px">
        <h4>观众留言 <span class="cnt">${msgs.length}</span></h4>
        <div class="table-wrap">
          <table class="notice-table">
            <thead><tr><th>留言人</th><th>内容</th><th>状态</th></tr></thead>
            <tbody>${msgRows}</tbody>
          </table>
        </div>
      </div>`;
  }

  function renderData(st) {
    const bk = Store.listBookings();
    return `
      <h3>数据管理</h3>
      <p class="dv-sub">当前数据保存在本机浏览器的本地存储中。换设备或清缓存前请先导出。</p>

      <div class="dv-stat-row">
        <div class="dv-stat"><div class="n">${bk.length}</div><div class="k">预约记录</div></div>
        <div class="dv-stat"><div class="n">${Store.listApplications().length}</div><div class="k">投递记录</div></div>
        <div class="dv-stat"><div class="n">${Store.listMessages().length}</div><div class="k">留言记录</div></div>
        <div class="dv-stat"><div class="n">${st.todos.length}</div><div class="k">待办</div></div>
      </div>

      <div class="dv-io">
        <button class="btn btn-primary btn-sm" id="data-export">导出全部数据</button>
        <button class="btn btn-ghost btn-sm" id="data-import">导入数据</button>
        <button class="btn btn-ghost btn-sm" id="data-reset">清空工作台</button>
        <input type="file" id="data-file" class="file" accept="application/json">
      </div>

      <div class="notice warn" style="margin-top:24px">
        <b>关于多人协作</b><br>
        当前版本的排练数据仅保存在这台设备上，导演在 A 电脑记录、场记在 B 电脑是看不到的。
        导出 JSON 后可在另一台设备导入，实现手动同步。
        真正的多人实时协作需要接入云端数据库。
      </div>`;
  }

  /* ============================================================
     主渲染
     ============================================================ */
  const RENDERERS = {
    overview: renderOverview,
    progress: renderProgress,
    attendance: renderAttendance,
    notes: renderNotes,
    todos: renderTodos,
    notice: renderNotice,
    reviews: renderReviews,
    data: renderData
  };

  function render() {
    const st = state();
    const panel = $('#dv-panel');
    panel.innerHTML = (RENDERERS[currentTab] || renderOverview)(st);
    bindPanel(st);
  }

  /* ---------- 面板内交互 ---------- */
  function bindPanel(st) {
    const panel = $('#dv-panel');

    // 幕次勾选
    $$('[data-act-check]', panel).forEach(cb => {
      cb.addEventListener('change', () => {
        const acts = Object.assign({}, st.acts);
        acts[cb.dataset.actCheck] = cb.checked;
        save({ acts });
        render();
      });
    });

    // 音乐备注
    $$('[data-music]', panel).forEach(inp => {
      inp.addEventListener('input', () => {
        const music = Object.assign({}, st.music);
        music[inp.dataset.music] = inp.value;
        save({ music });
      });
    });

    // 到场
    $$('[data-att-check]', panel).forEach(cb => {
      cb.addEventListener('change', () => {
        const att = JSON.parse(JSON.stringify(st.att));
        att[cb.dataset.attCheck] = Object.assign({}, att[cb.dataset.attCheck], { present: cb.checked });
        save({ att });
        render();
      });
    });
    $$('[data-att-state]', panel).forEach(sel => {
      sel.addEventListener('change', () => {
        const att = JSON.parse(JSON.stringify(st.att));
        att[sel.dataset.attState] = Object.assign({}, att[sel.dataset.attState], { state: sel.value });
        save({ att });
      });
    });

    // 场记
    $$('[data-note]', panel).forEach(ta => {
      ta.addEventListener('input', () => {
        const notes = Object.assign({}, st.notes);
        notes[ta.dataset.note] = ta.value;
        save({ notes });
      });
    });

    // 待办
    const addTodo = () => {
      const input = $('#todo-input');
      const v = input.value.trim();
      if (!v) return;
      const todos = st.todos.slice();
      todos.push({ text: v, done: false });
      save({ todos });
      input.value = '';
      render();
    };
    const addBtn = $('#todo-add');
    if (addBtn) {
      addBtn.addEventListener('click', addTodo);
      $('#todo-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
    }
    $$('[data-todo-check]', panel).forEach(cb => {
      cb.addEventListener('change', () => {
        const todos = st.todos.map((t, i) => i === +cb.dataset.todoCheck ? { text: t.text, done: cb.checked } : t);
        save({ todos });
        render();
      });
    });
    $$('[data-todo-del]', panel).forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.todoDel;
        const todos = st.todos.filter((_, k) => k !== i);
        save({ todos });
        render();
      });
    });

    // 通告单
    const n = JSON.parse(JSON.stringify(st.notice || {}));
    const dateI = $('#nt-date'), timeI = $('#nt-time'), locI = $('#nt-loc'), notesI = $('#nt-notes');
    if (dateI) dateI.addEventListener('change', () => { n.date = dateI.value; save({ notice: n }); });
    if (timeI) timeI.addEventListener('change', () => { n.time = timeI.value; save({ notice: n }); });
    if (locI) locI.addEventListener('input', () => { n.location = locI.value; save({ notice: n }); });
    if (notesI) notesI.addEventListener('input', () => { n.notes = notesI.value; save({ notice: n }); });
    $$('[data-nt-cast]', panel).forEach(cb => {
      cb.addEventListener('change', () => {
        const set = new Set(n.cast || []);
        cb.checked ? set.add(cb.dataset.ntCast) : set.delete(cb.dataset.ntCast);
        n.cast = Array.from(set);
        save({ notice: n });
      });
    });
    $$('[data-nt-act]', panel).forEach(cb => {
      cb.addEventListener('change', () => {
        const set = new Set(n.acts || []);
        cb.checked ? set.add(cb.dataset.ntAct) : set.delete(cb.dataset.ntAct);
        n.acts = Array.from(set);
        save({ notice: n });
      });
    });
    const copyBtn = $('#nt-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const text = buildNoticeText(state());
        try {
          await navigator.clipboard.writeText(text);
          toast('通告单已复制到剪贴板');
        } catch (e) {
          $('#nt-preview').innerHTML =
            `<pre style="white-space:pre-wrap;font-size:13px;background:var(--paper-2);padding:16px;border-radius:6px">${esc(text)}</pre>`;
          toast('浏览器不允许直接复制，请手动选中下方文本', true);
        }
      });
    }
    const printBtn = $('#nt-print');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const text = buildNoticeText(state());
        const w = window.open('', '_blank');
        if (!w) { toast('浏览器拦截了打印窗口', true); return; }
        w.document.write(`<pre style="font-family:serif;font-size:15px;line-height:1.9;white-space:pre-wrap;padding:40px">${esc(text)}</pre>`);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
      });
    }

    // 审核
    $$('[data-app-status]', panel).forEach(sel => {
      sel.addEventListener('change', () => {
        Store.setApplicationStatus(sel.dataset.appStatus, sel.value);
        toast('投递状态已更新');
      });
    });
    $$('[data-msg-status]', panel).forEach(sel => {
      sel.addEventListener('change', () => {
        Store.setMessageStatus(sel.dataset.msgStatus, sel.value);
        toast('留言状态已更新');
      });
    });

    // 数据管理
    const expBtn = $('#data-export');
    if (expBtn) {
      expBtn.addEventListener('click', () => {
        const blob = new Blob([Store.exportAll()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `小凤仙工作台备份-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast('已导出备份文件');
      });
    }
    const impBtn = $('#data-import');
    const fileInput = $('#data-file');
    if (impBtn) {
      impBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        const f = fileInput.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            Store.importAll(reader.result);
            toast('数据已导入');
            render();
          } catch (e) {
            toast('导入失败：' + e.message, true);
          }
        };
        reader.readAsText(f);
      });
    }
    const resetBtn = $('#data-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!confirm('确定清空工作台数据？此操作不可撤销，建议先导出备份。')) return;
        Store.resetDirector();
        render();
        toast('工作台已重置');
      });
    }

    // 跳转按钮
    $$('[data-goto]', panel).forEach(b => {
      b.addEventListener('click', () => {
        currentTab = b.dataset.goto;
        syncNav();
        render();
      });
    });
  }

  function syncNav() {
    $$('#dv-nav button').forEach(b => {
      b.classList.toggle('is-active', b.dataset.tab === currentTab);
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    $('#dv-nav').addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      currentTab = btn.dataset.tab;
      syncNav();
      render();
    });
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
