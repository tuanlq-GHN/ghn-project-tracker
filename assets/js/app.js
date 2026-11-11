/* =========================================================
   GHN Project Tracker – ứng dụng tĩnh, dữ liệu lưu localStorage
   ========================================================= */
(function () {
  'use strict';

  const STORE_KEY = 'ghn-pt-data:v1';
  const PREF_KEY = 'ghn-pt-prefs';

  // ---------- Helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const uid = (p = 'x') => p + '-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fmtDate = (d) => { if (!d) return '—'; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
  const fmtShort = (d) => { if (!d) return '—'; const [, m, dd] = d.split('-'); return `${dd}/${m}`; };
  const fmtTime = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const toDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
  const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

  const ICON = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="m5 12 5 5 9-10"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  };

  // ---------- Enums ----------
  const TASK_STATUS = { todo: 'Chưa làm', doing: 'Đang làm', done: 'Hoàn thành', blocked: 'Vướng mắc' };
  const PROJECT_STATUS = { planning: 'Lên kế hoạch', active: 'Đang triển khai', paused: 'Tạm dừng', done: 'Hoàn thành' };
  const PRIORITY = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
  const ZONE_STATUS = { none: 'Chưa lắp Tele', doing: 'Đang lắp Tele', done: 'Đã lắp – cấm nhà thầu' };
  const CONTRACTOR_STATUS = { open: 'Chờ phản hồi', answered: 'Đã phản hồi', closed: 'Đã chốt' };
  const TRAINING_STATUS = { plan: 'Chưa xếp lịch', scheduled: 'Đã xếp lịch', done: 'Đã hoàn thành' };
  const opts = (obj) => Object.entries(obj).map(([value, label]) => ({ value, label }));

  // ---------- State ----------
  let db = load();
  let prefs = loadPrefs();
  let route = { view: 'dashboard', pid: null, tab: 'overview' };
  const filters = { q: '', group: '', status: '', pic: '' };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const d = JSON.parse(raw); if (d && Array.isArray(d.projects)) return normalize(d); }
    } catch (e) { console.warn(e); }
    return normalize(window.GHN_SEED());
  }
  function normalize(d) {
    d.projects.forEach((p) => {
      ['milestones', 'tasks', 'zones', 'gates', 'trainings', 'contractor', 'people', 'log'].forEach((k) => { if (!Array.isArray(p[k])) p[k] = []; });
      if (!p.id) p.id = uid('p');
    });
    return d;
  }
  function loadPrefs() {
    try { return Object.assign({ sort: 'asc' }, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { return { sort: 'asc' }; }
  }
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }
  function save(msg) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(db));
      if (!cloud.enabled) setSaveState('Đã lưu trên máy lúc ' + fmtTime(new Date().toISOString()).slice(0, 5));
    } catch (e) {
      if (!cloud.enabled) toast('Không lưu được dữ liệu trên trình duyệt này – hãy dùng "Sao lưu".', true);
    }
    if (cloud.enabled) schedulePush();
    if (msg) toast(msg);
  }
  function setSaveState(text, isError) {
    const el = $('#saveState');
    el.textContent = text;
    el.style.color = isError ? 'var(--danger)' : '';
  }

  // ---------- Đồng bộ đám mây (khi chạy trên Vercel) ----------
  const API_URL = 'api/data';
  const PASS_KEY = 'ghn-pt-passcode';
  const cloud = { enabled: false, rev: 0, synced: {}, pushing: false, pending: false, timer: null };
  const getPass = () => { try { return localStorage.getItem(PASS_KEY) || ''; } catch (e) { return ''; } };
  const snapshot = (d) => Object.fromEntries(d.projects.map((p) => [p.id, JSON.stringify(p)]));
  const hasLocalChanges = () => {
    const now = snapshot(db);
    const ids = new Set([...Object.keys(now), ...Object.keys(cloud.synced)]);
    for (const id of ids) if (now[id] !== cloud.synced[id]) return true;
    return false;
  };
  async function api(method, body) {
    const r = await fetch(API_URL, {
      method, cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-passcode': getPass() },
      body: body ? JSON.stringify(body) : undefined,
    });
    const ct = r.headers.get('content-type') || '';
    const json = ct.includes('application/json') ? await r.json().catch(() => null) : null;
    return { status: r.status, json };
  }
  function applyRemote(data, rev) {
    db = normalize(data);
    cloud.rev = rev;
    cloud.synced = snapshot(db);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) {}
  }
  // Gộp: lấy bản trên máy chủ, giữ lại các dự án mình vừa sửa/thêm/xóa
  function mergeInto(server) {
    const mine = snapshot(db);
    const merged = normalize(server || { projects: [] });
    Object.keys(mine).forEach((id) => {
      if (mine[id] === cloud.synced[id]) return;
      const p = JSON.parse(mine[id]);
      const i = merged.projects.findIndex((x) => x.id === id);
      if (i >= 0) merged.projects[i] = p; else merged.projects.push(p);
    });
    Object.keys(cloud.synced).forEach((id) => {
      if (!mine[id]) merged.projects = merged.projects.filter((x) => x.id !== id);
    });
    return merged;
  }
  function schedulePush() {
    setSaveState('Đang lưu lên máy chủ…');
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(push, 400);
  }
  async function push() {
    if (cloud.pushing) { cloud.pending = true; return; }
    cloud.pushing = true;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { status, json } = await api('PUT', { baseRev: cloud.rev, data: db });
        if (status === 200) {
          cloud.rev = json.rev; cloud.synced = snapshot(db);
          setSaveState('Đã đồng bộ lúc ' + fmtTime(new Date().toISOString()).slice(0, 5) + ' · mọi người đều thấy');
          break;
        }
        if (status === 409) {
          db = mergeInto(json.data); cloud.rev = json.rev;
          toast('Có người vừa cập nhật – đã gộp thay đổi của bạn với bản mới nhất');
          if (!modalClose) render();
          continue;
        }
        if (status === 401) { askPasscode(); break; }
        throw new Error((json && json.error) || 'HTTP ' + status);
      }
    } catch (e) {
      setSaveState('Chưa đồng bộ được – sẽ thử lại', true);
      toast('Lỗi lưu lên máy chủ: ' + e.message, true);
      clearTimeout(cloud.timer); cloud.timer = setTimeout(push, 8000);
    } finally {
      cloud.pushing = false;
      if (cloud.pending) { cloud.pending = false; push(); }
    }
  }
  async function pull() {
    if (!cloud.enabled || cloud.pushing || document.hidden) return;
    try {
      const { status, json } = await api('GET');
      if (status !== 200 || !json || json.rev <= cloud.rev || !json.data) return;
      if (hasLocalChanges()) { db = mergeInto(json.data); cloud.rev = json.rev; schedulePush(); }
      else applyRemote(json.data, json.rev);
      const busy = modalClose || ['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement || {}).tagName);
      if (!busy) { const y = window.scrollY; parseHash(); render(); window.scrollTo(0, y); }
      setSaveState('Đã cập nhật dữ liệu mới lúc ' + fmtTime(new Date().toISOString()).slice(0, 5));
    } catch (e) { /* mạng chập chờn – lần sau thử lại */ }
  }
  function askPasscode(wrong) {
    return new Promise((resolve) => {
      const { root, close } = showModal('Nhập mã truy cập', `<form id="passForm">
        <p style="margin:0 0 12px">Trang này dùng chung cho cả nhóm. Nhập mã truy cập do quản trị viên cung cấp.</p>
        ${wrong ? '<p style="margin:0 0 12px;color:var(--danger)">Mã không đúng, vui lòng thử lại.</p>' : ''}
        <input class="input" type="password" name="pass" autocomplete="current-password" required aria-label="Mã truy cập">
        <div class="modal-actions"><span class="spacer"></span><button class="btn btn-primary" type="submit">Vào trang</button></div></form>`, 'sm');
      root.querySelector('#passForm').onsubmit = (e) => {
        e.preventDefault();
        try { localStorage.setItem(PASS_KEY, e.target.elements.pass.value); } catch (err) {}
        close(); resolve(connectCloud());
      };
    });
  }
  async function connectCloud() {
    let res;
    try { res = await api('GET'); } catch (e) { return false; } // không có API → chế độ lưu trên máy
    if (res.status === 401) return askPasscode(!!getPass());
    if (res.status === 503) { setSaveState('Máy chủ chưa kết nối kho dữ liệu – đang lưu trên máy', true); return false; }
    if (res.status !== 200 || !res.json) return false;
    cloud.enabled = true;
    if (res.json.data) {
      applyRemote(res.json.data, res.json.rev);
      setSaveState('Đồng bộ dữ liệu chung · mọi người đều thấy');
    } else {
      // Máy chủ chưa có dữ liệu: đưa dữ liệu hiện có lên làm bản đầu tiên
      cloud.rev = res.json.rev || 0; cloud.synced = {};
      await push();
    }
    parseHash(); render();
    setInterval(pull, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
    return true;
  }
  function logp(p, text) {
    p.log.unshift({ at: new Date().toISOString(), text });
    if (p.log.length > 200) p.log.length = 200;
  }
  const proj = () => db.projects.find((p) => p.id === route.pid);

  // ---------- Metrics ----------
  function stats(p) {
    const t = todayStr();
    const total = p.tasks.length;
    const done = p.tasks.filter((x) => x.status === 'done').length;
    const overdue = p.tasks.filter((x) => x.due && x.due < t && x.status !== 'done').length;
    const blocked = p.tasks.filter((x) => x.status === 'blocked').length;
    const noPic = p.tasks.filter((x) => !x.pic && x.status !== 'done').length;
    const zonesDone = p.zones.filter((z) => z.status === 'done').length;
    const openQ = p.contractor.filter((c) => c.status === 'open').length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, overdue, blocked, noPic, zonesDone, openQ, pct };
  }
  const isOverdue = (x) => x.due && x.due < todayStr() && x.status !== 'done';
  function sortedProjects() {
    const list = db.projects.slice().sort((a, b) => (a.startDate || a.createdAt || '').localeCompare(b.startDate || b.createdAt || ''));
    return prefs.sort === 'desc' ? list.reverse() : list;
  }

  // ---------- Toast / modal ----------
  function toast(msg, error) {
    const el = document.createElement('div');
    el.className = 'toast' + (error ? ' error' : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }
  let modalClose = null;
  function showModal(title, html, size) {
    $('#modalRoot').innerHTML = `<div class="modal-backdrop" data-modal-bg><div class="modal ${size || ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-modal-close aria-label="Đóng">${ICON.close}</button></div>
      <div class="modal-body">${html}</div></div></div>`;
    const root = $('#modalRoot');
    const close = () => { root.innerHTML = ''; modalClose = null; };
    modalClose = close;
    root.querySelector('[data-modal-close]').onclick = close;
    root.querySelector('[data-modal-bg]').addEventListener('mousedown', (e) => { if (e.target.hasAttribute('data-modal-bg')) close(); });
    const first = root.querySelector('input:not([type=hidden]), select, textarea');
    if (first) setTimeout(() => first.focus(), 30);
    return { root, close };
  }
  function confirmDialog(message, okLabel = 'Xóa') {
    return new Promise((resolve) => {
      const { root, close } = showModal('Xác nhận', `<p style="margin:0">${esc(message)}</p>
        <div class="modal-actions"><span class="spacer"></span><button class="btn btn-ghost" data-r="0">Hủy</button><button class="btn btn-danger-ghost" data-r="1">${esc(okLabel)}</button></div>`, 'sm');
      root.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { close(); resolve(b.dataset.r === '1'); });
    });
  }
  function fieldHtml(f, v) {
    const val = v ?? f.default ?? '';
    const req = f.required ? ' required' : '';
    const lbl = `<label for="f_${f.name}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>`;
    let input;
    if (f.type === 'select') {
      input = `<select class="input select" id="f_${f.name}" name="${f.name}"${req}>${f.options.map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(val) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea class="input" id="f_${f.name}" name="${f.name}" placeholder="${esc(f.placeholder || '')}"${req}>${esc(val)}</textarea>`;
    } else if (f.type === 'checkbox') {
      return `<div class="field ${f.full ? 'full' : ''}"><label class="check"><input type="checkbox" name="${f.name}"${val ? ' checked' : ''}> ${esc(f.label)}</label></div>`;
    } else {
      const list = f.list ? ` list="dl_${f.name}"` : '';
      const dl = f.list ? `<datalist id="dl_${f.name}">${f.list.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>` : '';
      input = `<input class="input" id="f_${f.name}" name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}"${list}${req}${f.type === 'number' ? ' step="any" min="0"' : ''}>${dl}`;
    }
    return `<div class="field ${f.full ? 'full' : ''}">${lbl}${input}${f.help ? `<div class="help">${esc(f.help)}</div>` : ''}</div>`;
  }
  function openForm({ title, fields, data = {}, submitLabel = 'Lưu', onSubmit, onDelete }) {
    const html = `<form id="mform" novalidate><div class="form-grid">${fields.map((f) => fieldHtml(f, data[f.name])).join('')}</div>
      <div class="modal-actions">${onDelete ? `<button type="button" class="btn btn-danger-ghost" data-del>${ICON.trash} Xóa</button>` : ''}<span class="spacer"></span>
      <button type="button" class="btn btn-ghost" data-cancel>Hủy</button><button type="submit" class="btn btn-primary">${esc(submitLabel)}</button></div></form>`;
    const { root, close } = showModal(title, html);
    const form = root.querySelector('#mform');
    root.querySelector('[data-cancel]').onclick = close;
    if (onDelete) root.querySelector('[data-del]').onclick = async () => { close(); onDelete(); };
    form.onsubmit = (e) => {
      e.preventDefault();
      const out = {};
      for (const f of fields) {
        const el = form.elements[f.name];
        if (f.type === 'checkbox') out[f.name] = el.checked;
        else out[f.name] = el.value.trim();
        if (f.required && !out[f.name]) { el.focus(); toast(`Vui lòng nhập "${f.label}"`, true); return; }
      }
      if (out.start && out.due && out.start > out.due) { toast('Ngày bắt đầu không được sau hạn chót', true); return; }
      if (out.startDate && out.endDate && out.startDate > out.endDate) { toast('Ngày bắt đầu không được sau ngày kết thúc', true); return; }
      if (out.start && out.end && out.start > out.end) { toast('Ngày bắt đầu không được sau ngày kết thúc', true); return; }
      close();
      onSubmit(out);
    };
  }

  // ---------- Routing ----------
  function parseHash() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'p' && parts[1] && db.projects.some((p) => p.id === parts[1])) {
      route = { view: 'project', pid: parts[1], tab: parts[2] || 'overview' };
    } else {
      route = { view: 'dashboard', pid: null, tab: 'overview' };
    }
  }
  const go = (h) => { if (location.hash === h) render(); else location.hash = h; };
  window.addEventListener('hashchange', () => {
    const prev = route.pid; parseHash();
    if (prev !== route.pid) Object.assign(filters, { q: '', group: '', status: '', pic: '' }); $('#app').classList.remove('nav-open'); render(); window.scrollTo(0, 0); });

  // ---------- Render: shell ----------
  function render() {
    renderSidebar();
    renderCrumbs();
    const c = $('#content');
    if (route.view === 'project' && proj()) c.innerHTML = renderProject(proj());
    else c.innerHTML = renderDashboard();
    document.title = (route.view === 'project' && proj() ? proj().name + ' · ' : '') + 'GHN Project Tracker';
    afterRender();
  }
  function renderSidebar() {
    const q = ($('#projectSearch').value || '').toLowerCase();
    const list = sortedProjects().filter((p) => !q || (p.name + ' ' + (p.code || '') + ' ' + (p.location || '')).toLowerCase().includes(q));
    $('#projectList').innerHTML = list.length ? list.map((p) => {
      const s = stats(p);
      return `<a class="project-item ${route.pid === p.id ? 'active' : ''}" href="#/p/${p.id}">
        <div class="pi-name"><span class="dot ${p.status}"></span><span>${esc(p.name)}</span></div>
        <div class="pi-meta">${fmtDate(p.startDate)} → ${fmtDate(p.endDate)} · ${s.pct}%</div>
        <div class="bar"><i style="width:${s.pct}%"></i></div></a>`;
    }).join('') : `<div class="muted" style="padding:10px 6px;font-size:12.5px">Không có dự án phù hợp.</div>`;
    $('#navDashboard').classList.toggle('active', route.view === 'dashboard');
    $('#sortBtn').textContent = prefs.sort === 'asc' ? 'Cũ → Mới' : 'Mới → Cũ';
    $('#themeBtn').textContent = document.documentElement.getAttribute('data-theme') === 'light' ? 'Giao diện tối' : 'Giao diện sáng';
  }
  function renderCrumbs() {
    const p = proj();
    $('#crumbs').innerHTML = route.view === 'project' && p
      ? `<a href="#/">Dự án</a><span>/</span><strong>${esc(p.name)}</strong>`
      : `<strong>Tổng quan dự án</strong>`;
    $('#todayLabel').textContent = 'Hôm nay: ' + fmtDate(todayStr());
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const all = db.projects;
    const t = todayStr();
    const agg = all.reduce((a, p) => { const s = stats(p); a.overdue += s.overdue; a.noPic += s.noPic; a.tasks += s.total; a.done += s.done; return a; }, { overdue: 0, noPic: 0, tasks: 0, done: 0 });
    const active = all.filter((p) => p.status === 'active').length;
    const upcoming = [];
    all.forEach((p) => {
      p.tasks.forEach((x) => { if (x.status !== 'done' && x.due && x.due <= addDays(t, 14)) upcoming.push({ p, kind: 'task', title: x.title, date: x.due, pic: x.pic, overdue: x.due < t }); });
      p.milestones.forEach((m) => { if (!m.done && m.date && m.date >= t && m.date <= addDays(t, 45)) upcoming.push({ p, kind: 'ms', title: m.title, date: m.date }); });
    });
    upcoming.sort((a, b) => a.date.localeCompare(b.date));

    const cards = sortedProjects().map((p) => {
      const s = stats(p);
      return `<a class="card project-card" href="#/p/${p.id}">
        <div class="pc-top"><div><div class="pc-code">${esc(p.code || '')}</div><h3>${esc(p.name)}</h3></div><span class="badge b-${p.status}">${PROJECT_STATUS[p.status] || ''}</span></div>
        <div class="pc-desc">${esc(p.description || 'Chưa có mô tả')}</div>
        <div class="progress-row"><div class="bar"><i style="width:${s.pct}%"></i></div><b>${s.pct}%</b></div>
        <div class="pc-stats"><span>📅 <b>${fmtDate(p.startDate)}</b> → <b>${fmtDate(p.endDate)}</b></span></div>
        <div class="pc-stats"><span><b>${s.done}/${s.total}</b> việc</span><span><b>${s.zonesDone}/${p.zones.length}</b> zone Tele</span>${s.overdue ? `<span class="badge b-overdue">${s.overdue} quá hạn</span>` : ''}${s.noPic ? `<span class="badge b-nopic">${s.noPic} chưa có PIC</span>` : ''}</div>
      </a>`;
    }).join('');

    return `
      <section class="hero"><div class="hero-row"><div>
        <div class="tagline">GHN · Your loads. Our roads.</div>
        <h1>Theo dõi tiến độ dự án</h1>
        <p>Quản lý toàn bộ dự án kho – từ dự án cũ đến dự án mới: công việc, PIC, layout zone, đào tạo và các đầu mục cần chốt với nhà thầu.</p>
      </div><div><button class="btn btn-primary" data-action="new-project">${ICON.plus} Tạo dự án mới</button></div></div></section>

      <div class="grid kpis">
        <div class="card kpi"><div class="label">Tổng số dự án</div><div class="value">${all.length}</div><div class="hint">${active} đang triển khai</div></div>
        <div class="card kpi"><div class="label">Công việc hoàn thành</div><div class="value">${agg.done}<span class="muted" style="font-size:18px">/${agg.tasks}</span></div><div class="hint">${agg.tasks ? Math.round(agg.done / agg.tasks * 100) : 0}% toàn bộ</div></div>
        <div class="card kpi ${agg.overdue ? 'alert' : ''}"><div class="label">Việc quá hạn</div><div class="value">${agg.overdue}</div><div class="hint">Chưa hoàn thành, đã qua hạn</div></div>
        <div class="card kpi ${agg.noPic ? 'warn' : ''}"><div class="label">Việc chưa có PIC</div><div class="value">${agg.noPic}</div><div class="hint">Cần phân công người phụ trách</div></div>
      </div>

      <div class="grid cols-2">
        <div>
          <div class="card-head" style="margin-bottom:12px"><h3>Danh sách dự án</h3><span class="sub">Sắp xếp theo ngày bắt đầu: ${prefs.sort === 'asc' ? 'cũ → mới' : 'mới → cũ'}</span><span class="spacer"></span><button class="btn btn-sm" data-action="toggle-sort">Đảo thứ tự</button></div>
          ${all.length ? `<div class="grid project-cards">${cards}</div>` : emptyState('Chưa có dự án nào', 'Bấm "Tạo dự án mới" để bắt đầu.')}
        </div>
        <div class="card">
          <div class="card-head"><h3>Sắp đến hạn</h3><span class="sub">Việc trong 14 ngày & mốc trong 45 ngày</span></div>
          ${upcoming.length ? `<div class="list">${upcoming.slice(0, 14).map((u) => `
            <a class="list-item" href="#/p/${u.p.id}/${u.kind === 'ms' ? 'overview' : 'tasks'}" style="text-decoration:none;color:inherit">
              <div class="li-main"><div class="li-title">${u.kind === 'ms' ? '◆ ' : ''}${esc(u.title)}</div>
              <div class="li-sub">${esc(u.p.name)}${u.kind === 'task' ? ' · ' + (u.pic ? 'PIC: ' + esc(u.pic) : '<span style="color:var(--warn)">Chưa có PIC</span>') : ' · Mốc dự án'}</div></div>
              <span class="badge plain ${u.overdue ? 'b-overdue' : 'b-accent'} tnum">${fmtShort(u.date)}</span></a>`).join('')}</div>` : emptyState('Không có việc sắp đến hạn', '')}
        </div>
      </div>`;
  }
  function emptyState(title, text) {
    return `<div class="empty">${ICON.folder}<h4>${esc(title)}</h4><div>${esc(text)}</div></div>`;
  }

  // ---------- Project ----------
  const TABS = [
    ['overview', 'Tổng quan'], ['tasks', 'Checklist công việc'], ['zones', 'Layout zone & Cổng'],
    ['training', 'Đào tạo'], ['contractor', 'Nhà thầu'], ['team', 'Nhân sự & PIC'], ['timeline', 'Timeline'],
  ];
  function renderProject(p) {
    const s = stats(p);
    const counts = { tasks: p.tasks.length, zones: p.zones.length, training: p.trainings.length, contractor: s.openQ, team: p.people.length };
    const tab = TABS.some((t) => t[0] === route.tab) ? route.tab : 'overview';
    const daysLeft = p.endDate ? daysBetween(todayStr(), p.endDate) : null;
    const body = {
      overview: tabOverview, tasks: tabTasks, zones: tabZones, training: tabTraining,
      contractor: tabContractor, team: tabTeam, timeline: tabTimeline,
    }[tab](p, s);
    return `
      <section class="hero"><div class="hero-row">
        <div>
          <div class="tagline">${esc(p.code || 'Dự án')} · <span>${PROJECT_STATUS[p.status] || ''}</span></div>
          <h1>${esc(p.name)}</h1>
          ${p.description ? `<p>${esc(p.description)}</p>` : ''}
          <div class="hero-meta">
            <span>Bắt đầu: <b>${fmtDate(p.startDate)}</b></span>
            <span>Kết thúc: <b>${fmtDate(p.endDate)}</b></span>
            ${daysLeft !== null ? `<span>${daysLeft >= 0 ? `Còn <b>${daysLeft}</b> ngày` : `Quá <b>${-daysLeft}</b> ngày`}</span>` : ''}
            <span>Địa điểm: <b>${esc(p.location || 'Chưa cập nhật')}</b></span>
            <span>Quản lý dự án: <b>${esc(p.manager || 'Chưa cập nhật')}</b></span>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
            <button class="btn btn-sm btn-ghost" data-action="edit-project">${ICON.edit} Sửa thông tin</button>
            <button class="btn btn-sm btn-ghost" data-action="duplicate-project">${ICON.copy} Nhân bản làm mẫu</button>
            <button class="btn btn-sm btn-ghost" data-action="export-project">${ICON.download} Xuất JSON</button>
            <button class="btn btn-sm btn-ghost" data-action="delete-project">${ICON.trash} Xóa</button>
          </div>
        </div>
        <div class="ring" style="--p:${s.pct}"><div><div><b>${s.pct}%</b><span>${s.done}/${s.total} việc</span></div></div></div>
      </div></section>
      <nav class="tabs" role="tablist">${TABS.map(([k, l]) => `<a class="tab ${tab === k ? 'active' : ''}" role="tab" href="#/p/${p.id}/${k}">${l}${counts[k] ? ` <span class="count">${counts[k]}</span>` : ''}</a>`).join('')}</nav>
      ${body}`;
  }

  // --- Overview tab
  function tabOverview(p, s) {
    const t = todayStr();
    const ms = p.milestones.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const nextId = (ms.find((m) => !m.done) || {}).id;
    const groups = groupTasks(p.tasks);
    const pending = p.tasks.filter((x) => x.status !== 'done').sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 7);
    const trainDone = p.trainings.filter((x) => x.status === 'done').length;
    return `
      <div class="grid kpis">
        <div class="card kpi"><div class="label">Tiến độ công việc</div><div class="value">${s.pct}%</div><div class="hint">${s.done}/${s.total} việc hoàn thành</div></div>
        <div class="card kpi ${s.overdue ? 'alert' : ''}"><div class="label">Quá hạn / Vướng mắc</div><div class="value">${s.overdue}<span class="muted" style="font-size:18px"> / ${s.blocked}</span></div><div class="hint">Cần xử lý ngay</div></div>
        <div class="card kpi"><div class="label">Zone đã lắp Tele</div><div class="value">${s.zonesDone}<span class="muted" style="font-size:18px">/${p.zones.length}</span></div><div class="hint">${s.zonesDone} zone cấm nhà thầu</div></div>
        <div class="card kpi ${s.openQ ? 'warn' : ''}"><div class="label">Chờ nhà thầu phản hồi</div><div class="value">${s.openQ}</div><div class="hint">Đào tạo: ${trainDone}/${p.trainings.length} hoàn thành</div></div>
      </div>
      <div class="grid cols-2">
        <div class="grid" style="align-content:start">
          <div class="card">
            <div class="card-head"><h3>Tiến độ theo hạng mục</h3><span class="spacer"></span><a class="btn btn-sm" href="#/p/${p.id}/tasks">Xem checklist</a></div>
            ${groups.length ? groups.map(([g, list]) => { const d = list.filter((x) => x.status === 'done').length; const pc = Math.round(d / list.length * 100); return `
              <div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="font-weight:600">${esc(g)}</span><span class="muted tnum">${d}/${list.length}</span></div>
              <div class="progress-row"><div class="bar lg"><i style="width:${pc}%"></i></div><b>${pc}%</b></div></div>`; }).join('') : emptyState('Chưa có công việc', '')}
          </div>
          <div class="card">
            <div class="card-head"><h3>Việc cần ưu tiên</h3><span class="sub">Chưa hoàn thành, sắp xếp theo hạn</span></div>
            ${pending.length ? `<div class="list">${pending.map((x) => `<div class="list-item">
              <div class="li-main"><div class="li-title">${esc(x.title)}</div><div class="li-sub">${esc(x.group)} · ${x.pic ? 'PIC: ' + esc(x.pic) : '<span style="color:var(--warn)">Chưa có PIC</span>'}</div></div>
              <span class="badge plain ${isOverdue(x) ? 'b-overdue' : 'b-' + x.status} tnum">${x.due ? fmtShort(x.due) : 'Chưa có hạn'}</span></div>`).join('')}</div>` : emptyState('Tất cả công việc đã hoàn thành 🎉', '')}
          </div>
        </div>
        <div class="grid" style="align-content:start">
          <div class="card">
            <div class="card-head"><h3>Mốc quan trọng</h3><span class="spacer"></span><button class="btn btn-sm" data-action="add-milestone">${ICON.plus} Thêm mốc</button></div>
            ${ms.length ? `<div class="ms">${ms.map((m) => `
              <div class="ms-item ${m.done ? 'done' : ''} ${m.id === nextId ? 'next' : ''}">
                <button class="ms-dot" data-action="toggle-milestone" data-id="${m.id}" title="Đánh dấu hoàn thành" aria-label="Đánh dấu hoàn thành">${ICON.check}</button>
                <div class="ms-body"><div class="ms-date">${fmtDate(m.date)}${!m.done && m.date && m.date < t ? ' · <span style="color:var(--danger)">Trễ</span>' : ''}</div><div class="ms-title">${esc(m.title)}</div></div>
                <button class="icon-btn" data-action="edit-milestone" data-id="${m.id}" aria-label="Sửa">${ICON.edit}</button>
              </div>`).join('')}</div>` : emptyState('Chưa có mốc', '')}
          </div>
          <div class="card">
            <div class="card-head"><h3>Lịch sử cập nhật</h3></div>
            <div class="list">${p.log.slice(0, 8).map((l) => `<div class="list-item"><div class="li-main"><div style="font-size:13px">${esc(l.text)}</div><div class="li-sub tnum">${fmtTime(l.at)}</div></div></div>`).join('') || '<div class="muted">Chưa có.</div>'}</div>
          </div>
        </div>
      </div>`;
  }

  // --- Tasks tab
  function groupTasks(tasks) {
    const map = new Map();
    tasks.forEach((x) => { const g = x.group || 'Khác'; if (!map.has(g)) map.set(g, []); map.get(g).push(x); });
    return [...map.entries()];
  }
  function picList(p) {
    const s = new Set(p.people.map((x) => x.name).filter(Boolean));
    p.tasks.forEach((x) => x.pic && s.add(x.pic));
    return [...s].sort((a, b) => a.localeCompare(b, 'vi'));
  }
  function tabTasks(p) {
    const groups = [...new Set(p.tasks.map((x) => x.group || 'Khác'))];
    const pics = picList(p);
    const q = filters.q.toLowerCase();
    const rows = p.tasks.filter((x) =>
      (!q || (x.title + ' ' + x.note + ' ' + x.pic).toLowerCase().includes(q)) &&
      (!filters.group || (x.group || 'Khác') === filters.group) &&
      (!filters.status || (filters.status === 'overdue' ? isOverdue(x) : x.status === filters.status)) &&
      (!filters.pic || (filters.pic === '__none' ? !x.pic : x.pic === filters.pic)));
    const grouped = groupTasks(rows);
    const sel = (name, value, options, label) => `<select class="select input" data-filter="${name}" aria-label="${label}"><option value="">${label}</option>${options.map((o) => `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    return `
      <div class="toolbar">
        <div class="search">${ICON.search}<input class="input" type="search" data-filter="q" value="${esc(filters.q)}" placeholder="Tìm công việc, ghi chú, PIC…" aria-label="Tìm công việc"></div>
        ${sel('group', filters.group, groups.map((g) => ({ value: g, label: g })), 'Tất cả hạng mục')}
        ${sel('status', filters.status, [...opts(TASK_STATUS), { value: 'overdue', label: 'Quá hạn' }], 'Mọi trạng thái')}
        ${sel('pic', filters.pic, [{ value: '__none', label: '— Chưa có PIC —' }, ...pics.map((x) => ({ value: x, label: x }))], 'Mọi PIC')}
        <span class="spacer"></span>
        <button class="btn btn-sm" data-action="export-csv">${ICON.download} Xuất Excel (CSV)</button>
        <button class="btn btn-primary" data-action="add-task">${ICON.plus} Thêm việc</button>
      </div>
      ${rows.length ? `<div class="table-wrap"><table>
        <thead><tr><th></th><th>Công việc</th><th>PIC</th><th>Thời gian</th><th>Ưu tiên</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${grouped.map(([g, list]) => { const d = list.filter((x) => x.status === 'done').length; const pc = Math.round(d / list.length * 100); return `
          <tr class="group-row"><td colspan="7"><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><span>${esc(g)}</span><span class="muted tnum" style="font-weight:500">${d}/${list.length}</span><div class="progress-row" style="flex:1;min-width:140px"><div class="bar"><i style="width:${pc}%"></i></div><b>${pc}%</b></div></div></td></tr>
          ${list.map((x) => `<tr>
            <td class="chk"><input type="checkbox" data-action="toggle-task" data-id="${x.id}" ${x.status === 'done' ? 'checked' : ''} aria-label="Hoàn thành"></td>
            <td style="min-width:260px"><div class="task-title ${x.status === 'done' ? 'done' : ''}">${esc(x.title)}</div>${x.note ? `<div class="task-note">${esc(x.note)}</div>` : ''}</td>
            <td style="min-width:150px">${x.pic ? `<span style="font-weight:600">${esc(x.pic)}</span>` : `<span class="badge b-nopic">Chưa có PIC</span>`}</td>
            <td class="date-cell ${isOverdue(x) ? 'overdue' : ''}">${x.start ? fmtShort(x.start) + ' → ' : ''}${x.due ? fmtDate(x.due) : '<span class="muted">Chưa có hạn</span>'}${isOverdue(x) ? '<br>Quá hạn' : ''}</td>
            <td><span class="badge b-${x.priority}">${PRIORITY[x.priority] || ''}</span></td>
            <td><select class="select input inline-select" data-action="task-status" data-id="${x.id}" aria-label="Trạng thái">${opts(TASK_STATUS).map((o) => `<option value="${o.value}"${o.value === x.status ? ' selected' : ''}>${o.label}</option>`).join('')}</select></td>
            <td><div class="cell-actions"><button class="icon-btn" data-action="edit-task" data-id="${x.id}" aria-label="Sửa">${ICON.edit}</button><button class="icon-btn danger" data-action="delete-task" data-id="${x.id}" aria-label="Xóa">${ICON.trash}</button></div></td>
          </tr>`).join('')}`; }).join('')}
        </tbody></table></div>` : `<div class="card">${emptyState('Không có công việc phù hợp', 'Thử bỏ bớt bộ lọc hoặc thêm việc mới.')}</div>`}`;
  }
  function taskFields(p) {
    const groups = [...new Set(p.tasks.map((x) => x.group).filter(Boolean))];
    return [
      { name: 'title', label: 'Tên công việc', required: true, full: true },
      { name: 'group', label: 'Hạng mục', list: groups, default: groups[0] || '', help: 'Chọn có sẵn hoặc gõ hạng mục mới' },
      { name: 'pic', label: 'PIC (người phụ trách)', list: picList(p) },
      { name: 'start', label: 'Ngày bắt đầu', type: 'date' },
      { name: 'due', label: 'Hạn chót', type: 'date' },
      { name: 'priority', label: 'Mức ưu tiên', type: 'select', options: opts(PRIORITY), default: 'medium' },
      { name: 'status', label: 'Trạng thái', type: 'select', options: opts(TASK_STATUS), default: 'todo' },
      { name: 'note', label: 'Ghi chú', type: 'textarea', full: true },
    ];
  }

  // --- Zones tab
  function tabZones(p) {
    const cnt = (st) => p.zones.filter((z) => z.status === st).length;
    return `
      <div class="rule-banner">${ICON.lock}<div><b>Quy định:</b> Zone nào đã lắp Tele thì <b>không cho phép nhà thầu vào khu vực đó nữa</b>. Lắp Tele từ <b>18/12</b>, thời gian thi công khoảng 2 tuần. Bấm vào từng zone để cập nhật trạng thái.</div></div>
      <div class="grid cols-2">
        <div class="card">
          <div class="card-head"><h3>Layout Kho – ${p.zones.length} zone</h3><span class="spacer"></span>
            <div class="legend"><span><i class="lg-none"></i>Chưa lắp (${cnt('none')})</span><span><i class="lg-doing"></i>Đang lắp (${cnt('doing')})</span><span><i class="lg-done"></i>Đã lắp – cấm nhà thầu (${cnt('done')})</span></div>
          </div>
          <div class="site"><span class="site-label">Mặt bằng</span>
            <div class="warehouse"><span class="warehouse-label">Kho</span>
              <div class="zones">${p.zones.map((z) => `
                <button class="zone ${z.status}" data-action="edit-zone" data-id="${z.id}" title="${esc(ZONE_STATUS[z.status])}">
                  ${z.status === 'done' ? `<span class="z-lock">${ICON.lock}</span>` : ''}
                  <span class="z-name">${esc(z.name)}</span><span class="z-status">${esc(ZONE_STATUS[z.status])}</span>
                  <span class="z-meta">${z.date ? 'Lắp: ' + fmtShort(z.date) : ''}${z.team ? ' · ' + esc(z.team) : ''}</span>
                </button>`).join('')}</div>
            </div>
            <div class="gates">${p.gates.map((g) => `<button class="gate ${g.inUse ? 'on' : ''}" data-action="edit-gate" data-id="${g.id}">${ICON.truck}${esc(g.name)}${g.inUse ? '' : ' · đóng'}</button>`).join('')}</div>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
            <button class="btn btn-sm" data-action="add-zone">${ICON.plus} Thêm zone</button>
            <button class="btn btn-sm" data-action="add-gate">${ICON.plus} Thêm cổng</button>
          </div>
        </div>
        <div class="grid" style="align-content:start">
          <div class="card">
            <div class="card-head"><h3>Cổng ra/vào</h3><span class="sub">Kế hoạch xe ra vào</span></div>
            <div class="list">${p.gates.map((g) => `<div class="list-item">
              <div class="li-main"><div class="li-title">${esc(g.name)} ${g.width ? `<span class="muted" style="font-weight:500">· rộng ${esc(g.width)}</span>` : ''}</div>${g.note ? `<div class="li-sub">${esc(g.note)}</div>` : ''}</div>
              <span class="badge ${g.inUse ? 'b-done' : 'b-plan'}">${g.inUse ? 'Sử dụng' : 'Không sử dụng'}</span>
              <button class="icon-btn" data-action="edit-gate" data-id="${g.id}" aria-label="Sửa">${ICON.edit}</button></div>`).join('')}</div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Zone cấm nhà thầu</h3></div>
            ${cnt('done') ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${p.zones.filter((z) => z.status === 'done').map((z) => `<span class="badge b-blocked">${esc(z.name)}</span>`).join('')}</div>` : '<div class="muted">Chưa có zone nào lắp xong Tele.</div>'}
          </div>
        </div>
      </div>`;
  }

  // --- Training tab
  function tabTraining(p) {
    return `
      <div class="toolbar"><div class="muted">Mỗi khóa cần chốt: <b>những ngày nào</b>, <b>số tiếng học</b>, danh sách học viên và người phụ trách.</div><span class="spacer"></span>
        <button class="btn btn-primary" data-action="add-training">${ICON.plus} Thêm khóa đào tạo</button></div>
      ${p.trainings.length ? `<div class="grid cols-2-even">${p.trainings.map((x) => {
        const n = (x.trainees || '').split(/\n|,/).map((s) => s.trim()).filter(Boolean);
        const miss = [!x.start && 'ngày học', !x.hours && 'số tiếng', !n.length && 'học viên', !x.trainer && 'PIC'].filter(Boolean);
        return `<div class="card">
          <div class="card-head"><h3 style="flex:1">${esc(x.topic)}</h3><span class="badge b-${x.status}">${TRAINING_STATUS[x.status]}</span>
            <button class="icon-btn" data-action="edit-training" data-id="${x.id}" aria-label="Sửa">${ICON.edit}</button></div>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
            <div><div class="muted">Thời gian</div><b>${x.start ? fmtDate(x.start) + (x.end && x.end !== x.start ? ' → ' + fmtDate(x.end) : '') : '<span style="color:var(--warn)">Chưa chốt</span>'}</b></div>
            <div><div class="muted">Số tiếng học</div><b>${x.hours ? esc(x.hours) + ' giờ' : '<span style="color:var(--warn)">Chưa chốt</span>'}</b></div>
            <div><div class="muted">Đối tượng</div><b>${esc(x.audience || '—')}</b></div>
            <div><div class="muted">Số học viên</div><b>${n.length || '—'}</b></div>
            <div><div class="muted">Giảng viên / PIC</div><b>${esc(x.trainer || '—')}</b></div>
            <div><div class="muted">Địa điểm</div><b>${esc(x.location || '—')}</b></div>
          </div>
          ${n.length ? `<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">${n.map((s) => `<span class="badge plain">${esc(s)}</span>`).join('')}</div>` : ''}
          ${x.note ? `<div class="task-note" style="margin-top:12px">${esc(x.note)}</div>` : ''}
          ${miss.length && x.status !== 'done' ? `<div style="margin-top:12px;font-size:12.5px;color:var(--warn)">Cần bổ sung: ${miss.join(', ')}</div>` : ''}
        </div>`; }).join('')}</div>` : `<div class="card">${emptyState('Chưa có khóa đào tạo', '')}</div>`}`;
  }
  const trainingFields = (p) => [
    { name: 'topic', label: 'Nội dung đào tạo', required: true, full: true },
    { name: 'audience', label: 'Đối tượng', placeholder: 'VD: lái xe nâng cứng tay' },
    { name: 'status', label: 'Trạng thái', type: 'select', options: opts(TRAINING_STATUS), default: 'plan' },
    { name: 'start', label: 'Từ ngày', type: 'date' },
    { name: 'end', label: 'Đến ngày', type: 'date' },
    { name: 'hours', label: 'Số tiếng học', type: 'number' },
    { name: 'trainer', label: 'Giảng viên / PIC', list: picList(p) },
    { name: 'location', label: 'Địa điểm', full: true },
    { name: 'trainees', label: 'Danh sách học viên', type: 'textarea', full: true, help: 'Mỗi dòng một người (hoặc ngăn cách bằng dấu phẩy)' },
    { name: 'note', label: 'Ghi chú', type: 'textarea', full: true },
  ];

  // --- Contractor tab
  function tabContractor(p) {
    return `
      <div class="toolbar"><div class="muted">Các đầu mục cần hỏi / xác nhận với nhà thầu.</div><span class="spacer"></span>
        <button class="btn btn-primary" data-action="add-contractor">${ICON.plus} Thêm đầu mục</button></div>
      ${p.contractor.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Nội dung cần xác nhận</th><th>Phản hồi của nhà thầu</th><th>Người theo dõi</th><th>Hạn</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${p.contractor.map((c) => `<tr>
          <td style="min-width:240px;font-weight:600">${esc(c.question)}</td>
          <td style="min-width:220px">${c.answer ? `<div class="task-note" style="margin:0;color:var(--text)">${esc(c.answer)}</div>` : '<span class="muted">Chưa có</span>'}</td>
          <td>${c.owner ? esc(c.owner) : '<span class="badge b-nopic">Chưa có PIC</span>'}</td>
          <td class="date-cell ${c.due && c.due < todayStr() && c.status === 'open' ? 'overdue' : ''}">${fmtDate(c.due)}</td>
          <td><span class="badge b-${c.status}">${CONTRACTOR_STATUS[c.status]}</span></td>
          <td><div class="cell-actions"><button class="icon-btn" data-action="edit-contractor" data-id="${c.id}" aria-label="Sửa">${ICON.edit}</button><button class="icon-btn danger" data-action="delete-contractor" data-id="${c.id}" aria-label="Xóa">${ICON.trash}</button></div></td>
        </tr>`).join('')}</tbody></table></div>` : `<div class="card">${emptyState('Chưa có đầu mục', '')}</div>`}`;
  }
  const contractorFields = (p) => [
    { name: 'question', label: 'Nội dung cần xác nhận', required: true, full: true, type: 'textarea' },
    { name: 'answer', label: 'Phản hồi của nhà thầu', type: 'textarea', full: true },
    { name: 'owner', label: 'Người theo dõi (PIC)', list: picList(p) },
    { name: 'due', label: 'Hạn phản hồi', type: 'date' },
    { name: 'status', label: 'Trạng thái', type: 'select', options: opts(CONTRACTOR_STATUS), default: 'open' },
  ];

  // --- Team tab
  function tabTeam(p) {
    const noPic = p.tasks.filter((x) => !x.pic && x.status !== 'done');
    const names = picList(p);
    return `
      <div class="grid cols-2">
        <div>
          <div class="toolbar"><h3 style="font-size:15px">Danh sách nhân sự</h3><span class="spacer"></span><button class="btn btn-primary" data-action="add-person">${ICON.plus} Thêm người</button></div>
          ${p.people.length ? `<div class="table-wrap"><table><thead><tr><th>Họ tên</th><th>Vai trò</th><th>Liên hệ</th><th>Việc phụ trách</th><th></th></tr></thead><tbody>
            ${p.people.map((m) => { const mine = p.tasks.filter((x) => x.pic === m.name); const d = mine.filter((x) => x.status === 'done').length; return `<tr>
              <td style="font-weight:600">${esc(m.name)}</td><td>${esc(m.role || '—')}</td>
              <td style="font-size:12.5px">${esc(m.phone || '')}${m.phone && m.email ? '<br>' : ''}${esc(m.email || '')}${!m.phone && !m.email ? '—' : ''}</td>
              <td class="tnum">${mine.length ? `${d}/${mine.length} xong` : '<span class="muted">0</span>'}</td>
              <td><div class="cell-actions"><button class="icon-btn" data-action="edit-person" data-id="${m.id}" aria-label="Sửa">${ICON.edit}</button><button class="icon-btn danger" data-action="delete-person" data-id="${m.id}" aria-label="Xóa">${ICON.trash}</button></div></td></tr>`; }).join('')}
          </tbody></table></div>` : `<div class="card">${emptyState('Chưa có nhân sự', 'Thêm người phụ trách để gán PIC cho từng đầu việc.')}</div>`}
        </div>
        <div class="card">
          <div class="card-head"><h3>Việc chưa có PIC</h3><span class="badge b-nopic">${noPic.length}</span></div>
          ${noPic.length ? `<div class="list">${noPic.map((x) => `<div class="list-item"><div class="li-main"><div class="li-title" style="font-size:13px">${esc(x.title)}</div><div class="li-sub">${esc(x.group)}</div>
            <select class="select input inline-select" style="margin-top:6px;max-width:100%" data-action="assign-pic" data-id="${x.id}" aria-label="Gán PIC"><option value="">Gán PIC…</option>${names.map((n) => `<option>${esc(n)}</option>`).join('')}</select></div></div>`).join('')}</div>`
            : '<div class="muted">Tất cả việc đều đã có người phụ trách.</div>'}
          ${noPic.length && !names.length ? '<div class="help muted" style="font-size:12px;margin-top:8px">Hãy thêm nhân sự ở bên trái trước khi gán PIC.</div>' : ''}
        </div>
      </div>`;
  }
  const personFields = [
    { name: 'name', label: 'Họ tên', required: true },
    { name: 'role', label: 'Vai trò / Bộ phận' },
    { name: 'phone', label: 'Số điện thoại', type: 'tel' },
    { name: 'email', label: 'Email', type: 'email' },
  ];

  // --- Timeline tab
  function tabTimeline(p) {
    const dated = p.tasks.filter((x) => x.due || x.start);
    const dates = [p.startDate, p.endDate, ...dated.flatMap((x) => [x.start, x.due]), ...p.milestones.map((m) => m.date)].filter(Boolean).sort();
    if (dates.length && todayStr() < dates[dates.length - 1]) dates.unshift(todayStr()), dates.sort();
    if (!dates.length) return `<div class="card">${emptyState('Chưa có dữ liệu thời gian', 'Thêm ngày bắt đầu / hạn chót cho công việc để xem timeline.')}</div>`;
    const min = addDays(dates[0], -2), max = addDays(dates[dates.length - 1], 3);
    const span = Math.max(daysBetween(min, max), 1);
    const pos = (d) => (daysBetween(min, d) / span) * 100;
    const ticks = [];
    for (let d = min, i = 0; d <= max && i < 80; d = addDays(d, 7), i++) ticks.push(d);
    const t = todayStr();
    const todayLine = t >= min && t <= max ? `<div class="g-today" style="left:${pos(t)}%"></div>` : '';
    const groups = groupTasks(dated);
    return `
      <div class="toolbar"><div class="legend"><span><i style="background:var(--border-strong)"></i>Chưa làm</span><span><i style="background:var(--accent)"></i>Đang làm</span><span><i style="background:var(--ok)"></i>Hoàn thành</span><span><i style="background:var(--danger)"></i>Vướng mắc</span><span><i style="background:var(--warn);transform:rotate(45deg);border-radius:2px;width:11px;height:11px"></i>Mốc</span></div></div>
      <div class="gantt"><div class="gantt-inner">
        <div class="g-row g-head"><div class="g-label">Công việc</div><div class="g-track">${ticks.map((d) => `<span class="g-tick" style="left:${pos(d)}%">${fmtShort(d)}</span>`).join('')}${todayLine}</div></div>
        <div class="g-row"><div class="g-label group">◆ Mốc quan trọng</div><div class="g-track">${p.milestones.filter((m) => m.date).map((m) => `<span class="g-ms ${m.done ? 'done' : ''}" style="left:${pos(m.date)}%" title="${esc(fmtDate(m.date) + ' – ' + m.title)}"></span>`).join('')}${todayLine}</div></div>
        ${groups.map(([g, list]) => `<div class="g-row"><div class="g-label group">${esc(g)}</div><div class="g-track">${todayLine}</div></div>
          ${list.map((x) => { const s = x.start || x.due, e = x.due || x.start; const l = pos(s), w = Math.max(pos(addDays(e, 1)) - l, .6);
            return `<div class="g-row"><div class="g-label" title="${esc(x.title)}">${esc(x.title)}</div><div class="g-track"><span class="g-bar ${x.status}" data-action="edit-task" data-id="${x.id}" style="left:${l}%;width:${w}%" title="${esc(x.title + ' · ' + fmtDate(s) + ' → ' + fmtDate(e) + (x.pic ? ' · ' + x.pic : ''))}"></span>${todayLine}</div></div>`; }).join('')}`).join('')}
      </div></div>
      ${p.tasks.length - dated.length ? `<p class="muted" style="font-size:12.5px">${p.tasks.length - dated.length} việc chưa có ngày nên không hiển thị trên timeline.</p>` : ''}`;
  }

  // ---------- Project forms ----------
  const projectFields = [
    { name: 'name', label: 'Tên dự án', required: true, full: true },
    { name: 'code', label: 'Mã dự án', placeholder: 'VD: KHO-2026-11' },
    { name: 'status', label: 'Trạng thái', type: 'select', options: opts(PROJECT_STATUS), default: 'planning' },
    { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
    { name: 'endDate', label: 'Ngày kết thúc (dự kiến)', type: 'date' },
    { name: 'location', label: 'Địa điểm / Kho' },
    { name: 'manager', label: 'Quản lý dự án' },
    { name: 'description', label: 'Mô tả', type: 'textarea', full: true },
  ];
  function newProject() {
    openForm({
      title: 'Tạo dự án mới', fields: projectFields, data: { startDate: todayStr(), status: 'planning' }, submitLabel: 'Tạo dự án',
      onSubmit: (v) => {
        const p = Object.assign({ id: uid('p'), createdAt: new Date().toISOString(), milestones: [], tasks: [], gates: [], trainings: [], contractor: [], people: [], log: [] }, v);
        p.zones = Array.from({ length: 12 }, (_, i) => ({ id: uid('z'), name: 'Zone ' + (i + 1), status: 'none', date: '', team: '', note: '' }));
        logp(p, 'Khởi tạo dự án');
        db.projects.push(p); save('Đã tạo dự án'); go('#/p/' + p.id);
      },
    });
  }

  // ---------- Export / import ----------
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  function exportCsv(p) {
    const head = ['Hạng mục', 'Công việc', 'PIC', 'Bắt đầu', 'Hạn chót', 'Ưu tiên', 'Trạng thái', 'Ghi chú'];
    const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [head.map(q).join(',')].concat(p.tasks.map((x) => [x.group, x.title, x.pic, fmtDate(x.start), fmtDate(x.due), PRIORITY[x.priority], isOverdue(x) ? 'Quá hạn' : TASK_STATUS[x.status], x.note].map(q).join(',')));
    download(slug(p.name) + '-checklist.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }
  function importJson(file) {
    const r = new FileReader();
    r.onload = async () => {
      try {
        const d = JSON.parse(r.result);
        let incoming = Array.isArray(d.projects) ? d.projects : (d.project ? [d.project] : null);
        if (!incoming) throw new Error('format');
        const ok = await confirmDialog(`File có ${incoming.length} dự án. Dự án trùng mã ID sẽ được ghi đè, dự án mới sẽ được thêm vào. Tiếp tục?`, 'Khôi phục');
        if (!ok) return;
        normalize({ projects: incoming });
        incoming.forEach((p) => { const i = db.projects.findIndex((x) => x.id === p.id); if (i >= 0) db.projects[i] = p; else db.projects.push(p); });
        save(`Đã khôi phục ${incoming.length} dự án`); render();
      } catch (e) { toast('File không hợp lệ', true); }
    };
    r.readAsText(file);
  }

  // ---------- Events ----------
  const findIn = (arr, id) => arr.find((x) => x.id === id);
  const removeFrom = (arr, id) => { const i = arr.findIndex((x) => x.id === id); if (i >= 0) arr.splice(i, 1); };

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'button')) return;
    const a = el.dataset.action, id = el.dataset.id, p = proj();
    switch (a) {
      case 'open-nav': $('#app').classList.add('nav-open'); break;
      case 'close-nav': $('#app').classList.remove('nav-open'); break;
      case 'new-project': $('#app').classList.remove('nav-open'); newProject(); break;
      case 'toggle-sort': prefs.sort = prefs.sort === 'asc' ? 'desc' : 'asc'; savePrefs(); render(); break;
      case 'toggle-theme': {
        const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('ghn-pt-theme', next); } catch (err) {}
        renderSidebar(); break;
      }
      case 'print': window.print(); break;
      case 'export-all': download(`ghn-project-tracker-backup-${todayStr()}.json`, JSON.stringify(db, null, 2), 'application/json'); toast('Đã tải file sao lưu'); break;
      case 'import': $('#importFile').click(); break;

      case 'edit-project':
        openForm({ title: 'Sửa thông tin dự án', fields: projectFields, data: p, onSubmit: (v) => { Object.assign(p, v); logp(p, 'Cập nhật thông tin dự án'); save('Đã lưu'); render(); } });
        break;
      case 'delete-project':
        if (await confirmDialog(`Xóa dự án "${p.name}"? Hành động này không thể hoàn tác (nên "Xuất JSON" trước).`)) {
          removeFrom(db.projects, p.id); save('Đã xóa dự án'); go('#/');
        }
        break;
      case 'duplicate-project': {
        const c = JSON.parse(JSON.stringify(p));
        c.id = uid('p'); c.name = p.name + ' (bản sao)'; c.createdAt = new Date().toISOString(); c.status = 'planning';
        c.tasks.forEach((x) => { x.id = uid('t'); x.status = 'todo'; });
        c.milestones.forEach((x) => { x.id = uid('m'); x.done = false; });
        c.zones.forEach((x) => { x.id = uid('z'); x.status = 'none'; x.date = ''; });
        c.trainings.forEach((x) => { x.id = uid('tr'); x.status = 'plan'; });
        c.contractor.forEach((x) => { x.id = uid('c'); x.status = 'open'; x.answer = ''; });
        c.log = []; logp(c, 'Nhân bản từ dự án "' + p.name + '"');
        db.projects.push(c); save('Đã nhân bản dự án'); go('#/p/' + c.id);
        break;
      }
      case 'export-project': download(slug(p.name) + '.json', JSON.stringify({ version: 1, project: p }, null, 2), 'application/json'); break;
      case 'export-csv': exportCsv(p); break;

      case 'add-milestone':
      case 'edit-milestone': {
        const m = id ? findIn(p.milestones, id) : null;
        openForm({
          title: m ? 'Sửa mốc' : 'Thêm mốc', data: m || {},
          fields: [{ name: 'title', label: 'Tên mốc', required: true, full: true }, { name: 'date', label: 'Ngày', type: 'date', required: true }, { name: 'done', label: 'Đã hoàn thành', type: 'checkbox' }],
          onSubmit: (v) => { if (m) Object.assign(m, v); else p.milestones.push(Object.assign({ id: uid('m') }, v)); logp(p, (m ? 'Sửa mốc: ' : 'Thêm mốc: ') + v.title); save('Đã lưu'); render(); },
          onDelete: m ? async () => { if (await confirmDialog('Xóa mốc này?')) { removeFrom(p.milestones, m.id); logp(p, 'Xóa mốc: ' + m.title); save('Đã xóa'); render(); } } : null,
        });
        break;
      }
      case 'toggle-milestone': { const m = findIn(p.milestones, id); m.done = !m.done; logp(p, (m.done ? 'Hoàn thành mốc: ' : 'Mở lại mốc: ') + m.title); save(); render(); break; }

      case 'add-task':
      case 'edit-task': {
        const x = id ? findIn(p.tasks, id) : null;
        openForm({
          title: x ? 'Sửa công việc' : 'Thêm công việc', fields: taskFields(p), data: x || (filters.group ? { group: filters.group } : {}),
          onSubmit: (v) => {
            if (!v.group) v.group = 'Khác';
            if (x) Object.assign(x, v); else p.tasks.push(Object.assign({ id: uid('t'), createdAt: new Date().toISOString() }, v));
            logp(p, (x ? 'Sửa việc: ' : 'Thêm việc: ') + v.title); save('Đã lưu'); render();
          },
          onDelete: x ? () => deleteTask(p, x) : null,
        });
        break;
      }
      case 'delete-task': deleteTask(p, findIn(p.tasks, id)); break;
      case 'toggle-task': { const x = findIn(p.tasks, id); x.status = el.checked ? 'done' : 'todo'; logp(p, (el.checked ? 'Hoàn thành: ' : 'Mở lại: ') + x.title); save(); render(); break; }

      case 'add-zone':
      case 'edit-zone': {
        const z = id ? findIn(p.zones, id) : null;
        openForm({
          title: z ? 'Cập nhật ' + z.name : 'Thêm zone', data: z || { name: 'Zone ' + (p.zones.length + 1), status: 'none' },
          fields: [
            { name: 'name', label: 'Tên zone', required: true },
            { name: 'status', label: 'Trạng thái Tele', type: 'select', options: opts(ZONE_STATUS) },
            { name: 'date', label: 'Ngày lắp Tele', type: 'date' },
            { name: 'team', label: 'Đội lắp / PIC', list: picList(p) },
            { name: 'note', label: 'Ghi chú', type: 'textarea', full: true },
          ],
          onSubmit: (v) => {
            if (z) { if (z.status !== v.status) logp(p, `${v.name}: ${ZONE_STATUS[v.status]}`); Object.assign(z, v); }
            else { p.zones.push(Object.assign({ id: uid('z') }, v)); logp(p, 'Thêm ' + v.name); }
            save(v.status === 'done' ? `${v.name} đã khóa – cấm nhà thầu vào` : 'Đã lưu'); render();
          },
          onDelete: z ? async () => { if (await confirmDialog(`Xóa ${z.name}?`)) { removeFrom(p.zones, z.id); save('Đã xóa'); render(); } } : null,
        });
        break;
      }
      case 'add-gate':
      case 'edit-gate': {
        const g = id ? findIn(p.gates, id) : null;
        openForm({
          title: g ? 'Cập nhật ' + g.name : 'Thêm cổng', data: g || { name: 'Cổng ' + (p.gates.length + 1), inUse: true },
          fields: [
            { name: 'name', label: 'Tên cổng', required: true },
            { name: 'width', label: 'Bề rộng', placeholder: 'VD: 16m' },
            { name: 'inUse', label: 'Sử dụng cho xe ra/vào', type: 'checkbox', full: true },
            { name: 'note', label: 'Ghi chú', type: 'textarea', full: true },
          ],
          onSubmit: (v) => { if (g) Object.assign(g, v); else p.gates.push(Object.assign({ id: uid('g') }, v)); logp(p, 'Cập nhật ' + v.name); save('Đã lưu'); render(); },
          onDelete: g ? async () => { if (await confirmDialog(`Xóa ${g.name}?`)) { removeFrom(p.gates, g.id); save('Đã xóa'); render(); } } : null,
        });
        break;
      }

      case 'add-training':
      case 'edit-training': {
        const x = id ? findIn(p.trainings, id) : null;
        openForm({
          title: x ? 'Sửa khóa đào tạo' : 'Thêm khóa đào tạo', fields: trainingFields(p), data: x || {},
          onSubmit: (v) => { if (x) Object.assign(x, v); else p.trainings.push(Object.assign({ id: uid('tr') }, v)); logp(p, 'Cập nhật đào tạo: ' + v.topic); save('Đã lưu'); render(); },
          onDelete: x ? async () => { if (await confirmDialog('Xóa khóa đào tạo này?')) { removeFrom(p.trainings, x.id); save('Đã xóa'); render(); } } : null,
        });
        break;
      }

      case 'add-contractor':
      case 'edit-contractor': {
        const c = id ? findIn(p.contractor, id) : null;
        openForm({
          title: c ? 'Cập nhật đầu mục nhà thầu' : 'Thêm đầu mục nhà thầu', fields: contractorFields(p), data: c || {},
          onSubmit: (v) => { if (c) Object.assign(c, v); else p.contractor.push(Object.assign({ id: uid('c') }, v)); logp(p, 'Nhà thầu: ' + v.question.slice(0, 60)); save('Đã lưu'); render(); },
          onDelete: c ? async () => { if (await confirmDialog('Xóa đầu mục này?')) { removeFrom(p.contractor, c.id); save('Đã xóa'); render(); } } : null,
        });
        break;
      }
      case 'delete-contractor': if (await confirmDialog('Xóa đầu mục này?')) { removeFrom(p.contractor, id); save('Đã xóa'); render(); } break;

      case 'add-person':
      case 'edit-person': {
        const m = id ? findIn(p.people, id) : null;
        const oldName = m && m.name;
        openForm({
          title: m ? 'Sửa nhân sự' : 'Thêm nhân sự', fields: personFields, data: m || {},
          onSubmit: (v) => {
            if (m) {
              Object.assign(m, v);
              if (oldName && oldName !== v.name) p.tasks.forEach((x) => { if (x.pic === oldName) x.pic = v.name; });
            } else p.people.push(Object.assign({ id: uid('u') }, v));
            logp(p, (m ? 'Sửa nhân sự: ' : 'Thêm nhân sự: ') + v.name); save('Đã lưu'); render();
          },
        });
        break;
      }
      case 'delete-person': { const m = findIn(p.people, id); if (await confirmDialog(`Xóa ${m.name} khỏi danh sách? (Các việc đã gán vẫn giữ tên PIC)`)) { removeFrom(p.people, id); save('Đã xóa'); render(); } break; }
    }
  });
  async function deleteTask(p, x) {
    if (await confirmDialog(`Xóa công việc "${x.title}"?`)) { removeFrom(p.tasks, x.id); logp(p, 'Xóa việc: ' + x.title); save('Đã xóa'); render(); }
  }

  document.addEventListener('change', (e) => {
    const el = e.target, p = proj();
    if (el.id === 'importFile') { if (el.files[0]) importJson(el.files[0]); el.value = ''; return; }
    if (el.dataset.filter && el.tagName === 'SELECT') { filters[el.dataset.filter] = el.value; render(); return; }
    if (el.dataset.action === 'task-status') { const x = findIn(p.tasks, el.dataset.id); x.status = el.value; logp(p, `${x.title}: ${TASK_STATUS[x.status]}`); save(); render(); }
    if (el.dataset.action === 'assign-pic' && el.value) { const x = findIn(p.tasks, el.dataset.id); x.pic = el.value; logp(p, `Gán PIC ${x.pic}: ${x.title}`); save('Đã gán PIC'); render(); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'projectSearch') renderSidebar();
    if (el.dataset.filter === 'q') {
      filters.q = el.value; const pos = el.selectionStart; render();
      const ni = document.querySelector('[data-filter="q"]'); if (ni) { ni.focus(); ni.setSelectionRange(pos, pos); }
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalClose) modalClose(); });
  // Đồng bộ khi mở nhiều tab
  window.addEventListener('storage', (e) => { if (!cloud.enabled && e.key === STORE_KEY && e.newValue) { db = normalize(JSON.parse(e.newValue)); parseHash(); render(); } });

  function afterRender() {}

  // ---------- Boot ----------
  if (!localStorage.getItem(STORE_KEY)) { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) {} }
  parseHash();
  render();
  // Chỉ thử kết nối máy chủ khi chạy qua http(s) (Vercel); mở file trực tiếp thì lưu trên máy
  if (location.protocol.startsWith('http')) connectCloud();
})();
