/* ============================================================
   数据层 · 适配器
   全部前端功能只通过这一层读写。
   当前实现：浏览器本地存储（localStorage），单机可用、无需后端。
   未来接入云端：只需把 Adapter 的方法体换成云服务调用，
   页面与组件代码一行都不用改。
   ============================================================ */

(function (global) {
  'use strict';

  const NS = 'xfx:';           // 命名空间，避免与其它站点数据冲突
  const KEYS = {
    bookings: NS + 'bookings',
    messages: NS + 'messages',
    applications: NS + 'applications',
    director: NS + 'director',
    prefs: NS + 'prefs'
  };

  /* ---------- 底层读写 ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const val = JSON.parse(raw);
      return val === null || val === undefined ? fallback : val;
    } catch (e) {
      console.warn('[store] 读取失败', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[store] 写入失败', key, e);
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' +
           Math.random().toString(36).slice(2, 8);
  }

  /* ---------- 对外 API ---------- */
  const Store = {
    /* 演出预约 */
    listBookings() { return read(KEYS.bookings, []); },
    addBooking(data) {
      const list = Store.listBookings();
      const rec = Object.assign({
        id: uid('bk'),
        createdAt: new Date().toISOString(),
        status: 'pending'
      }, data);
      list.unshift(rec);
      write(KEYS.bookings, list);
      return rec;
    },
    cancelBooking(id) {
      const list = Store.listBookings();
      const hit = list.find(b => b.id === id);
      if (hit) { hit.status = 'cancelled'; write(KEYS.bookings, list); }
      return hit;
    },

    /* 观众留言 */
    listMessages() { return read(KEYS.messages, []); },
    addMessage(data) {
      const list = Store.listMessages();
      const rec = Object.assign({
        id: uid('msg'),
        createdAt: new Date().toISOString(),
        status: 'pending'
      }, data);
      list.unshift(rec);
      write(KEYS.messages, list);
      return rec;
    },
    setMessageStatus(id, status) {
      const list = Store.listMessages();
      const hit = list.find(m => m.id === id);
      if (hit) { hit.status = status; write(KEYS.messages, list); }
      return hit;
    },

    /* 演员投递 */
    listApplications() { return read(KEYS.applications, []); },
    addApplication(data) {
      const list = Store.listApplications();
      const rec = Object.assign({
        id: uid('app'),
        createdAt: new Date().toISOString(),
        status: 'received'
      }, data);
      list.unshift(rec);
      write(KEYS.applications, list);
      return rec;
    },
    setApplicationStatus(id, status) {
      const list = Store.listApplications();
      const hit = list.find(a => a.id === id);
      if (hit) { hit.status = status; write(KEYS.applications, list); }
      return hit;
    },

    /* 导演工作台 */
    getDirector() { return read(KEYS.director, null); },
    setDirector(patch) {
      const cur = Store.getDirector() || {};
      const next = Object.assign({}, cur, patch, { updatedAt: new Date().toISOString() });
      write(KEYS.director, next);
      return next;
    },
    resetDirector() { localStorage.removeItem(KEYS.director); },

    /* 偏好（字号等） */
    getPrefs() { return read(KEYS.prefs, { fontScale: 1 }); },
    setPref(k, v) {
      const p = Store.getPrefs();
      p[k] = v;
      write(KEYS.prefs, p);
      return p;
    },

    /* 导出 / 导入 —— 便于在设备之间转移数据 */
    exportAll() {
      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        bookings: Store.listBookings(),
        messages: Store.listMessages(),
        applications: Store.listApplications(),
        director: Store.getDirector()
      }, null, 2);
    },
    importAll(json) {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      if (!data || typeof data !== 'object') throw new Error('数据格式不正确');
      if (Array.isArray(data.bookings)) write(KEYS.bookings, data.bookings);
      if (Array.isArray(data.messages)) write(KEYS.messages, data.messages);
      if (Array.isArray(data.applications)) write(KEYS.applications, data.applications);
      if (data.director) write(KEYS.director, data.director);
      return true;
    }
  };

  global.Store = Store;
})(window);
