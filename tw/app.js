const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const K = {
  inv: 'twsh.inventory.overrides.v1',
  pkg: 'twsh.packages.v1',
  buyer: 'twsh.buyers.v1',
  seller: 'twsh.sellers.v1',
};

const STATUS_LABEL = { available: '🟢 待售', reserved: '🟡 已保留', sold: '⚪ 已售出' };
const BUYER_STATUS = { new: '🆕 新名單', contacted: '📞 已聯繫', quoted: '💰 已報價', won: '✅ 成交', lost: '❌ 流失' };
const SELLER_STATUS = { new: '🆕 待聯繫', visited: '👀 已看貨', negotiating: '🤝 議價中', bought: '✅ 已收購', dropped: '❌ 放棄' };

const state = {
  items: [],
  groups: [],
  sites: [],
  replies: [],
  overrides: {},
  packages: [],
  buyers: [],
  sellers: [],
  stockCat: '',
  stockQ: '',
  stockStatus: '',
  groupCat: '',
  dirCat: '',
  dirQ: '',
  replyCat: '',
  buyerQ: '',
  buyerSort: false,
  sellerQ: '',
  current: null,
  photoIdx: 0,
  editingPkg: null,
  editingBuyer: null,
  editingSeller: null,
  dmBuyer: null,
};

/* ================= storage ================= */
const readLS = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
  } catch {
    return d;
  }
};
const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ================= helpers ================= */
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? null : `NT$${Number(n).toLocaleString('en-US')}`);

function toast(el, msg) {
  if (!el) return;
  el.textContent = msg;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.textContent = ''), 2400);
}

async function copyText(text, hintEl) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(hintEl, '✅ 已複製到剪貼簿');
}

const merged = (item) => ({ ...item, ...(state.overrides[item.id] || {}) });
const itemById = (id) => state.items.find((i) => i.id === id);
const shareUrl = (item) => `${location.origin}${location.pathname}?item=${encodeURIComponent(item.id)}`;
const pkgUrl = (pkg) => `${location.origin}${location.pathname}?pkg=${encodeURIComponent(pkg.id)}`;

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function csvDownload(rows, filename) {
  const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

/* ================= 庫存 ================= */
function renderStats() {
  const items = state.items.map(merged);
  const avail = items.filter((i) => i.status === 'available').length;
  const cells = [
    ['商品', items.length],
    ['待售', avail],
    ['套餐', state.packages.length],
    ['買家', state.buyers.length],
    ['收店', state.sellers.length],
  ];
  $('#stats').innerHTML = cells.map(([k, v]) => `<div class="stat"><b>${v}</b>${k}</div>`).join('');
}

function renderStockCats() {
  const cats = [...new Set(state.items.map((i) => i.cat))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  $('#stockCats').innerHTML = ['', ...cats]
    .map((c) => `<button class="chip ${state.stockCat === c ? 'active' : ''}" data-cat="${esc(c)}">${c || '全部'}</button>`)
    .join('');
  $$('#stockCats .chip').forEach((b) =>
    b.addEventListener('click', () => {
      state.stockCat = b.dataset.cat;
      renderStockCats();
      renderStock();
    })
  );
}

function renderStock() {
  const q = state.stockQ.trim().toLowerCase();
  const list = state.items
    .map(merged)
    .filter((i) => !state.stockCat || i.cat === state.stockCat)
    .filter((i) => !state.stockStatus || i.status === state.stockStatus)
    .filter((i) => !q || `${i.name} ${i.cat} ${i.desc} ${i.specs}`.toLowerCase().includes(q));

  $('#stockEmpty').hidden = list.length > 0;
  $('#stockGrid').innerHTML = list
    .map((i) => {
      const price = money(i.price);
      return `<article class="card ${i.status === 'sold' ? 'sold' : ''}" data-id="${esc(i.id)}">
        <div class="card-img">
          <img src="${esc(i.photos[0])}" alt="${esc(i.name)}" loading="lazy">
          ${i.photos.length > 1 ? `<span class="card-count">${i.photos.length} 張</span>` : ''}
        </div>
        <div class="card-body">
          <h3>${esc(i.name)}</h3>
          <div class="card-meta">
            <span class="card-cat">${esc(i.cat)}</span>
            <span class="card-price ${price ? '' : 'none'}">${price || '未定價'}</span>
          </div>
          <div style="margin-top:6px"><span class="badge ${i.status}">${STATUS_LABEL[i.status]}</span></div>
        </div>
      </article>`;
    })
    .join('');

  $$('#stockGrid .card').forEach((c) => c.addEventListener('click', () => openModal(c.dataset.id)));
}

/* ================= 商品 modal ================= */
function openModal(id) {
  const item = itemById(id);
  if (!item) return;
  state.current = item;
  state.photoIdx = 0;
  const it = merged(item);
  $('#mName').textContent = it.name;
  $('#mCat').textContent = `${it.cat} · ${it.location || '宜蘭倉庫'} · ${it.photos.length} 張照片`;
  $('#mPrice').value = it.price ?? '';
  $('#mQty').value = it.qty ?? '';
  $('#mSpecs').value = it.specs ?? '';
  $('#mDesc').value = it.desc ?? '';
  $('#mStatusSel').value = it.status;
  $('#mStatus').className = `badge ${it.status}`;
  $('#mStatus').textContent = STATUS_LABEL[it.status];
  $('#mHint').textContent = '';
  renderGallery(it);
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function renderGallery(it) {
  $('#mImg').src = it.photos[state.photoIdx];
  $('#mThumbs').innerHTML = it.photos
    .map((p, i) => `<img src="${esc(p)}" data-i="${i}" class="${i === state.photoIdx ? 'active' : ''}" alt="圖 ${i + 1}" loading="lazy">`)
    .join('');
  $$('#mThumbs img').forEach((t) =>
    t.addEventListener('click', () => {
      state.photoIdx = Number(t.dataset.i);
      renderGallery(it);
    })
  );
}

function closeModal() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
  state.current = null;
}

function persistCurrent() {
  if (!state.current) return;
  state.overrides[state.current.id] = {
    ...(state.overrides[state.current.id] || {}),
    price: $('#mPrice').value === '' ? null : Number($('#mPrice').value),
    qty: $('#mQty').value === '' ? null : Number($('#mQty').value),
    specs: $('#mSpecs').value.trim(),
    desc: $('#mDesc').value.trim(),
    status: $('#mStatusSel').value,
  };
  writeLS(K.inv, state.overrides);
  const it = merged(state.current);
  $('#mStatus').className = `badge ${it.status}`;
  $('#mStatus').textContent = STATUS_LABEL[it.status];
  renderStats();
  renderStock();
}

/* ================= 文案 ================= */
function buildItemPost(item) {
  const it = merged(item);
  const L = [];
  L.push(`【二手出清】${it.name}`, '');
  L.push(`▪ 品項：${it.name}`);
  L.push(`▪ 狀況：${it.condition || '二手'}${it.desc ? `，${it.desc}` : ''}`);
  if (it.specs) L.push(`▪ 規格：${it.specs}`);
  L.push(`▪ 售價：${it.price ? `${money(it.price)}（可議）` : '歡迎私訊報價'}`);
  if (it.qty) L.push(`▪ 數量：${it.qty}`);
  L.push(`▪ 地點：${it.location || '宜蘭倉庫'}（可自取，可協助運送）`);
  L.push(`▪ 照片：${shareUrl(it)}`, '');
  L.push('有興趣請私訊，謝謝 🙏');
  return L.join('\n');
}

function pkgLines(pkg) {
  return (pkg.items || [])
    .map((e) => {
      const it = itemById(e.id);
      if (!it) return null;
      const m = merged(it);
      return { name: m.name, qty: e.qty || 1, price: m.price };
    })
    .filter(Boolean);
}

function pkgTotal(pkg) {
  return pkgLines(pkg).reduce((s, l) => s + (l.price || 0) * l.qty, 0);
}

function buildPkgPost(pkg) {
  const lines = pkgLines(pkg);
  const total = pkgTotal(pkg);
  const L = [];
  L.push(`【開店套餐】${pkg.name}`, '');
  if (pkg.type) L.push(`▪ 適合：${pkg.type}`);
  L.push(`▪ 內容（${lines.length} 項）：`);
  lines.forEach((l) => L.push(`   - ${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''}${l.price ? `（原價 ${money(l.price)}）` : ''}`));
  L.push('');
  if (total) L.push(`▪ 原價合計：${money(total)}`);
  L.push(`▪ 套餐價：${pkg.price ? `${money(pkg.price)}（現省 ${money(Math.max(0, total - pkg.price))}）` : '歡迎私訊報價'}`);
  L.push('▪ 地點：宜蘭倉庫（可自取，可協助運送）');
  if (pkg.note) L.push(`▪ 說明：${pkg.note}`);
  L.push(`▪ 完整清單：${pkgUrl(pkg)}`, '');
  L.push('要開店的朋友歡迎私訊，可現場看貨 🙏');
  return L.join('\n');
}

/* ================= 套餐 ================= */
function renderPackages() {
  $('#pkgEmpty').hidden = state.packages.length > 0;
  $('#pkgGrid').innerHTML = state.packages
    .map((p) => {
      const lines = pkgLines(p);
      const total = pkgTotal(p);
      const save = p.price && total ? total - p.price : 0;
      return `<article class="card pkg" data-id="${esc(p.id)}">
        <div class="pkg-body">
          <h3>${esc(p.name)}</h3>
          <p class="pkg-type">${esc(p.type || '未指定店型')} · ${lines.length} 項</p>
          <div class="pkg-price">
            ${p.price ? `<b>${money(p.price)}</b>` : '<b class="none">未定價</b>'}
            ${save > 0 ? `<s>${money(total)}</s>` : ''}
          </div>
          ${save > 0 ? `<p class="pkg-save">省 ${money(save)}（${Math.round((save / total) * 100)}%）</p>` : ''}
        </div>
      </article>`;
    })
    .join('');
  $$('#pkgGrid .pkg').forEach((c) => c.addEventListener('click', () => openPkg(c.dataset.id)));
}

function renderPicker(container, selected, withQty) {
  const cats = [...new Set(state.items.map((i) => i.cat))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const sel = new Map((selected || []).map((e) => [e.id, e.qty || 1]));
  container.innerHTML = cats
    .map((cat) => {
      const rows = state.items
        .filter((i) => i.cat === cat)
        .map((i) => {
          const m = merged(i);
          const on = sel.has(i.id);
          return `<label class="pick">
            <input type="checkbox" data-id="${esc(i.id)}" ${on ? 'checked' : ''}>
            <span class="pick-name">${esc(m.name)}</span>
            ${withQty ? `<input type="number" class="pick-qty" data-id="${esc(i.id)}" min="1" value="${sel.get(i.id) || 1}" ${on ? '' : 'disabled'}>` : ''}
            <span class="pick-price">${money(m.price) || '—'}</span>
          </label>`;
        })
        .join('');
      return `<div class="pick-cat">${esc(cat)}</div>${rows}`;
    })
    .join('');
}

function readPicker(container, withQty) {
  const root = typeof container === 'string' ? $(container) : container;
  if (!root) return [];
  return [...root.querySelectorAll('input[type=checkbox]')]
    .filter((c) => c.checked)
    .map((c) => {
      const q = withQty ? root.querySelector(`.pick-qty[data-id="${c.dataset.id}"]`) : null;
      return { id: c.dataset.id, qty: q ? Math.max(1, Number(q.value) || 1) : 1 };
    });
}

function openPkg(id) {
  const pkg = id ? state.packages.find((p) => p.id === id) : null;
  state.editingPkg = pkg ? { ...pkg } : { id: null, name: '', type: '', price: null, note: '', items: [] };
  $('#pkgTitle').textContent = pkg ? '編輯套餐' : '新增套餐';
  $('#pkgName').value = state.editingPkg.name;
  $('#pkgType').value = state.editingPkg.type || '';
  $('#pkgPrice').value = state.editingPkg.price ?? '';
  $('#pkgNote').value = state.editingPkg.note || '';
  $('#pkgDelete').hidden = !pkg;
  $('#pkgHint2').textContent = '';
  renderPicker($('#pkgPicker'), state.editingPkg.items, true);
  updatePkgSum();
  $('#pkgModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function updatePkgSum() {
  const items = readPicker('#pkgPicker', true);
  const total = items.reduce((s, e) => {
    const it = itemById(e.id);
    return s + (it ? (merged(it).price || 0) * e.qty : 0);
  }, 0);
  $('#pkgSum').textContent = `原價合計 ${money(total) || 'NT$0'}`;
}

function collectPkg() {
  return {
    id: state.editingPkg.id || uid(),
    name: $('#pkgName').value.trim() || '未命名套餐',
    type: $('#pkgType').value.trim(),
    price: $('#pkgPrice').value === '' ? null : Number($('#pkgPrice').value),
    note: $('#pkgNote').value.trim(),
    items: readPicker('#pkgPicker', true),
    createdAt: state.editingPkg.createdAt || new Date().toISOString(),
  };
}

function savePkg() {
  const pkg = collectPkg();
  const i = state.packages.findIndex((p) => p.id === pkg.id);
  if (i >= 0) state.packages[i] = pkg;
  else state.packages.push(pkg);
  writeLS(K.pkg, state.packages);
  state.editingPkg = pkg;
  $('#pkgDelete').hidden = false;
  renderPackages();
  renderStats();
  renderGroupProductSelect();
  toast($('#pkgHint2'), '✅ 已儲存');
}

/* ================= 報價單圖片 ================= */
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of [...text]) {
    if (line && ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

function drawQuote(pkg) {
  const W = 1080;
  const H = 1350;
  const PAD = 72;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');

  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0d1117');
  g.addColorStop(1, '#0b1a1a');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  x.fillStyle = '#2dd4bf';
  x.fillRect(0, 0, W, 8);

  x.fillStyle = '#2dd4bf';
  x.font = '700 34px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText('二手雷達', PAD, 96);

  x.fillStyle = '#8b949e';
  x.font = '400 24px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText('宜蘭倉庫 · 二手餐飲設備', PAD, 136);

  let y = 220;
  x.fillStyle = '#e6edf3';
  x.font = '700 54px "PingFang TC","Noto Sans TC",sans-serif';
  for (const line of wrapText(x, pkg.name, W - PAD * 2)) {
    x.fillText(line, PAD, y);
    y += 66;
  }

  if (pkg.type) {
    x.fillStyle = '#2dd4bf';
    x.font = '400 28px "PingFang TC","Noto Sans TC",sans-serif';
    x.fillText(`適合：${pkg.type}`, PAD, y + 6);
    y += 46;
  }

  y += 24;
  x.strokeStyle = '#2d333b';
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(PAD, y);
  x.lineTo(W - PAD, y);
  x.stroke();
  y += 52;

  const lines = pkgLines(pkg);
  const total = pkgTotal(pkg);
  const maxRows = 11;
  const shown = lines.slice(0, maxRows);

  x.font = '400 30px "PingFang TC","Noto Sans TC",sans-serif';
  for (const l of shown) {
    const label = `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''}`;
    const priceTxt = l.price ? money(l.price * l.qty) : '—';
    x.fillStyle = '#e6edf3';
    let t = label;
    while (x.measureText(t).width > W - PAD * 2 - 200 && t.length > 4) t = t.slice(0, -2);
    if (t !== label) t = t.slice(0, -1) + '…';
    x.fillText(t, PAD, y);
    x.fillStyle = '#8b949e';
    x.textAlign = 'right';
    x.fillText(priceTxt, W - PAD, y);
    x.textAlign = 'left';
    y += 56;
  }
  if (lines.length > maxRows) {
    x.fillStyle = '#6e7681';
    x.fillText(`…等共 ${lines.length} 項`, PAD, y);
  }

  const boxY = H - 330;
  x.fillStyle = '#161b22';
  x.strokeStyle = '#2dd4bf55';
  x.lineWidth = 2;
  x.beginPath();
  x.roundRect(PAD, boxY, W - PAD * 2, 200, 20);
  x.fill();
  x.stroke();

  x.fillStyle = '#8b949e';
  x.font = '400 26px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText('原價合計', PAD + 36, boxY + 56);
  x.textAlign = 'right';
  x.fillText(money(total) || '—', W - PAD - 36, boxY + 56);
  x.textAlign = 'left';

  x.fillStyle = '#2dd4bf';
  x.font = '700 30px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText('套餐價', PAD + 36, boxY + 132);
  x.textAlign = 'right';
  x.font = '700 62px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText(pkg.price ? money(pkg.price) : '私訊報價', W - PAD - 36, boxY + 140);
  x.textAlign = 'left';

  if (pkg.price && total > pkg.price) {
    x.fillStyle = '#f0b429';
    x.font = '700 26px "PingFang TC","Noto Sans TC",sans-serif';
    x.fillText(`現省 ${money(total - pkg.price)}（${Math.round(((total - pkg.price) / total) * 100)}%）`, PAD + 36, boxY + 178);
  }

  x.fillStyle = '#8b949e';
  x.font = '400 24px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText('宜蘭倉庫 · 可自取 · 可協助運送 · 私訊洽詢', PAD, H - 60);

  return c;
}

function downloadQuote(pkg) {
  if (!pkg.items.length) return toast($('#pkgHint2'), '請先選品項');
  const c = drawQuote(pkg);
  c.toBlob((b) => download(b, `${pkg.name || '套餐'}_報價單.png`), 'image/png');
  toast($('#pkgHint2'), '✅ 報價單已下載');
}

/* ================= 買家 ================= */
function renderBuyers() {
  const q = state.buyerQ.trim().toLowerCase();
  let list = state.buyers.filter((b) => !q || `${b.name} ${b.type} ${b.note} ${b.contact}`.toLowerCase().includes(q));
  if (state.buyerSort) list = [...list].sort((a, b) => matchBuyer(b).score - matchBuyer(a).score);
  else list = [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  $('#buyerEmpty').hidden = list.length > 0;
  $('#buyerList').innerHTML = list
    .map((b) => {
      const m = matchBuyer(b);
      return `<div class="row" data-id="${esc(b.id)}">
        <div class="row-main">
          <p class="row-title">${esc(b.name || '未命名')} <span class="badge b-${esc(b.status)}">${BUYER_STATUS[b.status] || ''}</span> <span class="badge m-${m.level}">${MATCH_LEVEL[m.level]}</span></p>
          <p class="row-sub">${esc(b.type || '未指定店型')}${b.budget ? ` · 預算 ${money(b.budget)}` : ''}${b.timeline ? ` · ${esc(b.timeline)}` : ''}</p>
          ${b.contact ? `<p class="row-sub">📞 ${esc(b.contact)}</p>` : ''}
          ${b.note ? `<p class="row-note">${esc(b.note)}</p>` : ''}
          ${m.reasons.length ? `<p class="row-match">🎯 ${esc(m.reasons.join(' · '))}${m.total ? ` · 合計 ${money(m.total)}` : ''}</p>` : ''}
        </div>
        <div class="row-actions">
          <button class="btn small primary row-dm">💬 私訊</button>
          <button class="btn small ghost row-edit">編輯</button>
        </div>
      </div>`;
    })
    .join('');

  $$('#buyerList .row').forEach((r) => {
    r.addEventListener('click', (e) => {
      if (e.target.closest('.row-dm')) return openDM(r.dataset.id);
      openBuyer(r.dataset.id);
    });
  });
}

function openBuyer(id) {
  const b = id ? state.buyers.find((x) => x.id === id) : null;
  state.editingBuyer = b ? { ...b } : { id: null, needs: [] };
  $('#buyerTitle').textContent = b ? '編輯買家' : '新增買家';
  $('#bName').value = b?.name || '';
  $('#bContact').value = b?.contact || '';
  $('#bType').value = b?.type || '';
  $('#bBudget').value = b?.budget ?? '';
  $('#bTimeline').value = b?.timeline || '';
  $('#bStatus').value = b?.status || 'new';
  $('#bNote').value = b?.note || '';
  $('#bDelete').hidden = !b;
  $('#bHint').textContent = '';

  const cats = [...new Set(state.items.map((i) => i.cat))].sort((a, c) => a.localeCompare(c, 'zh-Hant'));
  $('#bNeeds').innerHTML = cats
    .map(
      (c) =>
        `<label class="pick"><input type="checkbox" data-cat="${esc(c)}" ${(b?.needs || []).includes(c) ? 'checked' : ''}><span class="pick-name">${esc(c)}</span><span class="pick-price">${state.items.filter((i) => i.cat === c).length} 項</span></label>`
    )
    .join('');
  $('#buyerModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function saveBuyer() {
  const needs = $$('#bNeeds input[type=checkbox]').filter((c) => c.checked).map((c) => c.dataset.cat);
  const b = {
    id: state.editingBuyer.id || uid(),
    name: $('#bName').value.trim(),
    contact: $('#bContact').value.trim(),
    type: $('#bType').value.trim(),
    budget: $('#bBudget').value === '' ? null : Number($('#bBudget').value),
    timeline: $('#bTimeline').value.trim(),
    status: $('#bStatus').value,
    note: $('#bNote').value.trim(),
    needs,
    createdAt: state.editingBuyer.createdAt || new Date().toISOString(),
  };
  const i = state.buyers.findIndex((x) => x.id === b.id);
  if (i >= 0) state.buyers[i] = b;
  else state.buyers.push(b);
  writeLS(K.buyer, state.buyers);
  state.editingBuyer = b;
  $('#bDelete').hidden = false;
  renderBuyers();
  renderStats();
  toast($('#bHint'), '✅ 已儲存');
}

/* ================= 配對引擎 ================= */
const MATCH_LEVEL = { hot: '🔥 熱', warm: '⭐ 溫', cold: '💤 冷' };

function bigrams(s) {
  const t = String(s || '').replace(/\s/g, '');
  const out = new Set();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}
function similar(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return false;
  for (const x of A) if (B.has(x)) return true;
  return false;
}

function affordableCount(items, budget) {
  const priced = items.filter((i) => i.price).sort((a, b) => a.price - b.price);
  let sum = 0;
  let n = 0;
  for (const i of priced) {
    if (sum + i.price > budget) break;
    sum += i.price;
    n++;
  }
  return n;
}

function matchBuyer(b) {
  const needs = b.needs || [];
  const avail = state.items.map(merged).filter((i) => i.status === 'available');
  const hit = needs.length
    ? avail.filter((i) => needs.some((n) => i.cat === n || i.name.includes(n) || n.includes(i.name)))
    : [];
  const total = hit.reduce((s, i) => s + (i.price || 0), 0);
  const priced = hit.filter((i) => i.price).length;
  const unpriced = hit.length - priced;

  const typeKey = (b.type || '').trim();
  const pkgs = typeKey
    ? state.packages.filter((p) => {
        const pt = (p.type || '').trim();
        if (!pt) return false;
        return pt.includes(typeKey) || typeKey.includes(pt) || similar(pt, typeKey);
      })
    : [];

  let score = 0;
  const reasons = [];
  if (hit.length) {
    score += Math.min(30, hit.length * 8);
    reasons.push(`${hit.length} 項符合需求`);
  }
  if (priced) {
    score += 10;
    reasons.push(`${priced} 項已定價`);
  }
  if (b.budget && total) {
    if (total <= b.budget) {
      score += 30;
      reasons.push('整批在預算內');
    } else {
      const fit = affordableCount(hit, b.budget);
      if (total <= b.budget * 1.25) {
        score += 15;
        reasons.push('略超預算，可談');
      } else if (total <= b.budget * 1.5) {
        score -= 10;
        reasons.push(`超出預算，預算內可帶走 ${fit} 項`);
      } else {
        score -= 30;
        reasons.push(`遠超預算，預算內只能帶走 ${fit} 項`);
      }
    }
  }
  if (pkgs.length) {
    score += 25;
    reasons.push(`有 ${pkgs.length} 組套餐符合店型`);
  }
  if (/急|現在|馬上|月底|這週|下週|盡快|最近/.test(b.timeline || '')) {
    score += 15;
    reasons.push('時間急');
  }
  if (b.status === 'won' || b.status === 'lost') score = 0;

  const level = score >= 60 ? 'hot' : score >= 30 ? 'warm' : 'cold';
  return { score, level, items: hit, packages: pkgs, total, unpriced, budgetGap: b.budget ? b.budget - total : null, reasons };
}

/* ================= 私訊文案 ================= */
function buildBuyerDM(b, m, picked) {
  const who = b.name || '你好';
  const L = [];
  L.push(`${who} 你好 👋`);
  L.push('');

  if (picked.length) {
    L.push(`你之前提到要開${b.type ? `「${b.type}」` : '店'}，我幫你整理了一下宜蘭倉庫目前適合的：`);
    L.push('');
    for (const p of picked) {
      const it = itemById(p.id);
      if (!it) continue;
      const mm = merged(it);
      L.push(`▪ ${mm.name}${p.qty > 1 ? ` ×${p.qty}` : ''}${mm.price ? ` — ${money(mm.price * p.qty)}` : '（價格私訊）'}`);
    }
    L.push('');
    const sum = picked.reduce((s, p) => {
      const it = itemById(p.id);
      return s + (it ? (merged(it).price || 0) * p.qty : 0);
    }, 0);
    const unpriced = picked.filter((p) => {
      const it = itemById(p.id);
      return it && !merged(it).price;
    }).length;
    if (sum) {
      L.push(`原價合計 ${money(sum)}${unpriced ? `（另有 ${unpriced} 項未定價，私訊報價）` : ''}`);
      if (b.budget && sum <= b.budget) L.push(`→ 在你預算 ${money(b.budget)} 以內 ✅`);
      else if (b.budget) L.push(`→ 比你預算 ${money(b.budget)} 多 ${money(sum - b.budget)}，可以再談`);
      L.push('');
    }
  } else {
    L.push(`你之前提到要開${b.type ? `「${b.type}」` : '店'}，我這邊先幫你留意著。`);
    L.push('');
    if (!(b.needs || []).length) {
      L.push('方便先跟我說你大概需要哪些設備嗎？（爐台／冰箱／工作台／椅子…都可以）');
      L.push('我直接幫你配一份清單＋價格，會比你自己一件一件找快很多。');
    } else {
      L.push('目前倉庫這幾類剛好沒有完全對上的，但只要有適合的進來，我第一個通知你。');
    }
    L.push('');
  }

  if (m.packages.length) {
    const p = m.packages[0];
    L.push(`另外我們有一組「${p.name}」${p.type ? `（適合${p.type}）` : ''}${p.price ? `，整組 ${money(p.price)}` : ''}，`);
    L.push(`是照開店實際會用到的配的，通常比一件一件買便宜：`);
    L.push(pkgUrl(p));
    L.push('');
  }

  L.push('有興趣的話可以約時間來宜蘭倉庫看實機，通電試給你看，看完再決定沒關係 🙂');
  L.push('');
  L.push('— 二手雷達・宜蘭倉庫');
  return L.join('\n');
}

function openDM(buyerId) {
  const b = state.buyers.find((x) => x.id === buyerId);
  if (!b) return;
  state.dmBuyer = b;
  const m = matchBuyer(b);
  $('#dmTitle').textContent = `私訊 ${b.name || '買家'}`;
  $('#dmMatch').textContent = m.reasons.length
    ? `${MATCH_LEVEL[m.level]} · ${m.reasons.join(' · ')}`
    : '💤 目前沒有對得上的品項，先發「幫你留意」版';
  $('#dmHint').textContent = '';

  const picked = new Set(m.items.map((i) => i.id));
  $('#dmItems').innerHTML = m.items.length
    ? m.items
        .map(
          (i) => `<label class="pick">
            <input type="checkbox" data-id="${esc(i.id)}" checked>
            <span class="pick-name">${esc(i.name)}</span>
            <input type="number" class="pick-qty" data-id="${esc(i.id)}" min="1" value="1">
            <span class="pick-price">${money(i.price) || '—'}</span>
          </label>`
        )
        .join('')
    : '<p class="hint" style="padding:10px">沒有符合的品項</p>';

  regenDM();
  $('#dmModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function readDMPicked() {
  const root = $('#dmItems');
  if (!root) return [];
  return [...root.querySelectorAll('input[type=checkbox]')]
    .filter((c) => c.checked)
    .map((c) => {
      const q = root.querySelector(`.pick-qty[data-id="${c.dataset.id}"]`);
      return { id: c.dataset.id, qty: q ? Math.max(1, Number(q.value) || 1) : 1 };
    });
}

function regenDM() {
  const b = state.dmBuyer;
  if (!b) return;
  const picked = readDMPicked();
  const m = matchBuyer(b);
  let sum = 0;
  let unpriced = 0;
  for (const p of picked) {
    const it = itemById(p.id);
    if (!it) continue;
    const pr = merged(it).price;
    if (pr) sum += pr * p.qty;
    else unpriced++;
  }
  $('#dmSum').textContent = `${money(sum) || 'NT$0'}${unpriced ? ` ＋${unpriced} 項未定價` : ''}`;
  $('#dmText').value = buildBuyerDM(b, m, picked);
}

/* ================= 收店 ================= */
function renderSellers() {
  const q = state.sellerQ.trim().toLowerCase();
  const list = state.sellers
    .filter((s) => !q || `${s.shop} ${s.area} ${s.type} ${s.note} ${s.contact}`.toLowerCase().includes(q))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  $('#sellerEmpty').hidden = list.length > 0;
  $('#sellerList').innerHTML = list
    .map(
      (s) => `<div class="row" data-id="${esc(s.id)}">
        <div class="row-main">
          <p class="row-title">${esc(s.shop || '未命名')} <span class="badge s-${esc(s.status)}">${SELLER_STATUS[s.status] || ''}</span></p>
          <p class="row-sub">${esc(s.area || '—')}${s.type ? ` · ${esc(s.type)}` : ''}${s.close ? ` · 收店 ${esc(s.close)}` : ''}${s.ask ? ` · 開價 ${money(s.ask)}` : ''}</p>
          ${s.contact || s.phone ? `<p class="row-sub">📞 ${esc(s.contact || '')} ${esc(s.phone || '')}</p>` : ''}
          ${(s.equip || []).length ? `<p class="row-sub">設備：${esc(s.equip.join('、'))}</p>` : ''}
          ${s.note ? `<p class="row-note">${esc(s.note)}</p>` : ''}
        </div>
        <button class="btn small ghost row-edit">編輯</button>
      </div>`
    )
    .join('');

  $$('#sellerList .row').forEach((r) => r.addEventListener('click', () => openSeller(r.dataset.id)));
}

function openSeller(id) {
  const s = id ? state.sellers.find((x) => x.id === id) : null;
  state.editingSeller = s ? { ...s } : { id: null, equip: [] };
  $('#sellerTitle').textContent = s ? '編輯收店線索' : '新增收店線索';
  $('#sShop').value = s?.shop || '';
  $('#sArea').value = s?.area || '';
  $('#sContact').value = s?.contact || '';
  $('#sPhone').value = s?.phone || '';
  $('#sType').value = s?.type || '';
  $('#sClose').value = s?.close || '';
  $('#sAsk').value = s?.ask ?? '';
  $('#sStatus').value = s?.status || 'new';
  $('#sNote').value = s?.note || '';
  $('#sDelete').hidden = !s;
  $('#sHint').textContent = '';

  const cats = [...new Set(state.items.map((i) => i.cat))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  $('#sEquip').innerHTML = cats
    .map(
      (c) =>
        `<label class="pick"><input type="checkbox" data-cat="${esc(c)}" ${(s?.equip || []).includes(c) ? 'checked' : ''}><span class="pick-name">${esc(c)}</span></label>`
    )
    .join('');
  $('#sellerModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function saveSeller() {
  const equip = $$('#sEquip input[type=checkbox]').filter((c) => c.checked).map((c) => c.dataset.cat);
  const s = {
    id: state.editingSeller.id || uid(),
    shop: $('#sShop').value.trim(),
    area: $('#sArea').value.trim(),
    contact: $('#sContact').value.trim(),
    phone: $('#sPhone').value.trim(),
    type: $('#sType').value.trim(),
    close: $('#sClose').value.trim(),
    ask: $('#sAsk').value === '' ? null : Number($('#sAsk').value),
    status: $('#sStatus').value,
    note: $('#sNote').value.trim(),
    equip,
    createdAt: state.editingSeller.createdAt || new Date().toISOString(),
  };
  const i = state.sellers.findIndex((x) => x.id === s.id);
  if (i >= 0) state.sellers[i] = s;
  else state.sellers.push(s);
  writeLS(K.seller, state.sellers);
  state.editingSeller = s;
  $('#sDelete').hidden = false;
  renderSellers();
  renderStats();
  toast($('#sHint'), '✅ 已儲存');
}

/* ================= FB 社團 ================= */
function renderGroupCats() {
  const cats = [...new Set(state.groups.map((g) => g.cat))];
  const opts = [['', '全部'], ['__top', '⭐ 建議順序'], ...cats.map((c) => [c, c])];
  $('#groupCats').innerHTML = opts
    .map(([v, label]) => `<button class="chip ${state.groupCat === v ? 'active' : ''}" data-cat="${esc(v)}">${esc(label)}</button>`)
    .join('');
  $$('#groupCats .chip').forEach((b) =>
    b.addEventListener('click', () => {
      state.groupCat = b.dataset.cat;
      renderGroupCats();
      renderGroups();
    })
  );
}

function renderGroups() {
  const list = state.groups
    .filter((g) => (state.groupCat === '__top' ? g.priority : !state.groupCat || g.cat === state.groupCat))
    .sort((a, b) => {
      const pa = a.priority ?? 99;
      const pb = b.priority ?? 99;
      return pa !== pb ? pa - pb : a.name.localeCompare(b.name, 'zh-Hant');
    });

  $('#groupList').innerHTML = list
    .map(
      (g) => `<div class="group">
        <div class="group-info">
          <p class="group-name">${g.priority ? `<span class="pri">${g.priority}</span>` : ''}${esc(g.name)}</p>
          <p class="group-sub">${esc(g.cat)}${g.kind === 'search' ? ' · 搜尋連結' : ''}</p>
          ${g.note ? `<p class="group-note">${esc(g.note)}</p>` : ''}
        </div>
        <a class="btn small" href="${esc(g.url)}" target="_blank" rel="noopener">開啟 ↗</a>
      </div>`
    )
    .join('');
}

function renderGroupProductSelect() {
  const items = state.items
    .map(merged)
    .filter((i) => i.status !== 'sold')
    .map((i) => `<option value="item:${esc(i.id)}">📦 ${esc(i.name)}${i.price ? ` — ${money(i.price)}` : ''}</option>`)
    .join('');
  const pkgs = state.packages
    .map((p) => `<option value="pkg:${esc(p.id)}">🎁 ${esc(p.name)}${p.price ? ` — ${money(p.price)}` : ''}</option>`)
    .join('');
  $('#groupProduct').innerHTML =
    '<option value="">① 選擇商品或套餐…</option>' +
    (pkgs ? `<optgroup label="開店套餐">${pkgs}</optgroup>` : '') +
    (items ? `<optgroup label="單品">${items}</optgroup>` : '');
}

/* ================= 回覆範本 ================= */
function renderReplyCats() {
  const cats = [...new Set(state.replies.map((r) => r.cat))];
  $('#replyCats').innerHTML = ['', ...cats]
    .map((c) => `<button class="chip ${state.replyCat === c ? 'active' : ''}" data-cat="${esc(c)}">${esc(c || '全部')}</button>`)
    .join('');
  $$('#replyCats .chip').forEach((b) =>
    b.addEventListener('click', () => {
      state.replyCat = b.dataset.cat;
      renderReplyCats();
      renderReplies();
    })
  );
}

function renderReplies() {
  const list = state.replies.filter((r) => !state.replyCat || r.cat === state.replyCat);
  $('#replyList').innerHTML = list
    .map(
      (r, i) => `<div class="reply">
        <div class="reply-head">
          <span class="reply-kw">${esc(r.keyword)}</span>
          <button class="btn small" data-i="${i}">📋 複製</button>
        </div>
        <pre class="reply-text">${esc(r.text)}</pre>
      </div>`
    )
    .join('');
  $$('#replyList .reply button').forEach((b) =>
    b.addEventListener('click', () => copyText(list[Number(b.dataset.i)].text, $('#copyHint')))
  );
}

/* ================= 網站目錄 ================= */
function renderDirCats() {
  const cats = [...new Set(state.sites.map((s) => s.catLabel))];
  $('#dirCats').innerHTML = ['', ...cats]
    .map((c) => `<button class="chip ${state.dirCat === c ? 'active' : ''}" data-cat="${esc(c)}">${esc(c || '全部')}</button>`)
    .join('');
  $$('#dirCats .chip').forEach((b) =>
    b.addEventListener('click', () => {
      state.dirCat = b.dataset.cat;
      renderDirCats();
      renderDir();
    })
  );
}

function renderDir() {
  const q = state.dirQ.trim().toLowerCase();
  const list = state.sites
    .filter((s) => !state.dirCat || s.catLabel === state.dirCat)
    .filter((s) => !q || `${s.name} ${s.desc} ${s.catLabel}`.toLowerCase().includes(q));
  $('#dirList').innerHTML = list
    .map(
      (s) => `<a class="dir" href="${esc(s.url)}" target="_blank" rel="noopener">
        <h4>${esc(s.name)}</h4>
        <p>${esc(s.desc || '')}</p>
        <p class="tagline">${esc(s.catLabel)}${s.verify === 'partial' ? ' · 半查證' : ''}</p>
      </a>`
    )
    .join('');
}

/* ================= tabs ================= */
function switchView(view) {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  const url = new URL(location.href);
  if (view === 'stock') url.searchParams.delete('view');
  else url.searchParams.set('view', view);
  history.replaceState(null, '', url);
}

/* ================= init ================= */
async function init() {
  state.overrides = readLS(K.inv, {});
  state.packages = readLS(K.pkg, []);
  state.buyers = readLS(K.buyer, []);
  state.sellers = readLS(K.seller, []);

  const [inv, groups, sites, replies] = await Promise.all([
    fetch('data/inventory.json').then((r) => r.json()).catch(() => ({ items: [] })),
    fetch('data/groups.json').then((r) => r.json()).catch(() => ({ groups: [] })),
    fetch('data/sites.json').then((r) => r.json()).catch(() => []),
    fetch('data/replies.json').then((r) => r.json()).catch(() => ({ replies: [] })),
  ]);

  state.items = inv.items || [];
  state.groups = groups.groups || [];
  state.sites = Array.isArray(sites) ? sites : [];
  state.replies = replies.replies || [];
  $('#updated').textContent = inv.updated || '—';

  renderStats();
  renderStockCats();
  renderStock();
  renderPackages();
  renderBuyers();
  renderSellers();
  renderGroupCats();
  renderGroups();
  renderGroupProductSelect();
  renderReplyCats();
  renderReplies();
  renderDirCats();
  renderDir();

  $('#stockSearch').addEventListener('input', (e) => {
    state.stockQ = e.target.value;
    renderStock();
  });
  $('#stockStatus').addEventListener('change', (e) => {
    state.stockStatus = e.target.value;
    renderStock();
  });
  $('#exportCsv').addEventListener('click', () => {
    const rows = [['品名', '分類', '售價', '數量', '狀態', '規格', '備註', '照片數', '連結']];
    state.items.map(merged).forEach((i) =>
      rows.push([i.name, i.cat, i.price ?? '', i.qty ?? '', STATUS_LABEL[i.status], i.specs || '', i.desc || '', i.photos.length, shareUrl(i)])
    );
    csvDownload(rows, `宜蘭倉庫庫存_${new Date().toISOString().slice(0, 10)}.csv`);
  });

  $$('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));

  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    ['#modal', '#pkgModal', '#buyerModal', '#sellerModal', '#dmModal'].forEach((s) => {
      if (!$(s).hidden) {
        $(s).hidden = true;
        document.body.style.overflow = '';
      }
    });
  });
  ['#mPrice', '#mQty', '#mSpecs', '#mDesc', '#mStatusSel'].forEach((s) => $(s).addEventListener('change', persistCurrent));

  $('#mGen').addEventListener('click', () => {
    persistCurrent();
    $('#postText').value = buildItemPost(state.current);
    $('#postbox').hidden = false;
    $('#groupProduct').value = `item:${state.current.id}`;
    switchView('groups');
    closeModal();
    $('#postbox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('#mCopy').addEventListener('click', () => {
    persistCurrent();
    copyText(buildItemPost(state.current), $('#mHint'));
  });
  $('#mShare').addEventListener('click', () => copyText(shareUrl(state.current), $('#mHint')));
  $('#mGroups').addEventListener('click', () => {
    persistCurrent();
    $('#postText').value = buildItemPost(state.current);
    $('#postbox').hidden = false;
    $('#groupProduct').value = `item:${state.current.id}`;
    switchView('groups');
    closeModal();
  });

  $('#newPackage').addEventListener('click', () => openPkg(null));
  $('#pkgClose').addEventListener('click', () => {
    $('#pkgModal').hidden = true;
    document.body.style.overflow = '';
  });
  $('#pkgModal').addEventListener('click', (e) => {
    if (e.target.id === 'pkgModal') {
      $('#pkgModal').hidden = true;
      document.body.style.overflow = '';
    }
  });
  $('#pkgPicker').addEventListener('change', (e) => {
    if (e.target.classList.contains('pick-qty')) return;
    const q = $(`#pkgPicker .pick-qty[data-id="${e.target.dataset.id}"]`);
    if (q) q.disabled = !e.target.checked;
    updatePkgSum();
  });
  $('#pkgPicker').addEventListener('input', (e) => {
    if (e.target.classList.contains('pick-qty')) updatePkgSum();
  });
  $('#pkgSave').addEventListener('click', savePkg);
  $('#pkgQuote').addEventListener('click', () => downloadQuote(collectPkg()));
  $('#pkgCopyText').addEventListener('click', () => copyText(buildPkgPost(collectPkg()), $('#pkgHint2')));
  $('#pkgShare').addEventListener('click', () => {
    const pkg = collectPkg();
    if (!state.packages.find((p) => p.id === pkg.id)) savePkg();
    copyText(pkgUrl(pkg), $('#pkgHint2'));
  });
  $('#pkgDelete').addEventListener('click', () => {
    if (!state.editingPkg?.id) return;
    state.packages = state.packages.filter((p) => p.id !== state.editingPkg.id);
    writeLS(K.pkg, state.packages);
    $('#pkgModal').hidden = true;
    document.body.style.overflow = '';
    renderPackages();
    renderStats();
    renderGroupProductSelect();
  });

  $('#newBuyer').addEventListener('click', () => openBuyer(null));
  $('#buyerClose').addEventListener('click', () => {
    $('#buyerModal').hidden = true;
    document.body.style.overflow = '';
  });
  $('#buyerModal').addEventListener('click', (e) => {
    if (e.target.id === 'buyerModal') {
      $('#buyerModal').hidden = true;
      document.body.style.overflow = '';
    }
  });
  $('#bSave').addEventListener('click', saveBuyer);
  $('#bDelete').addEventListener('click', () => {
    if (!state.editingBuyer?.id) return;
    state.buyers = state.buyers.filter((b) => b.id !== state.editingBuyer.id);
    writeLS(K.buyer, state.buyers);
    $('#buyerModal').hidden = true;
    document.body.style.overflow = '';
    renderBuyers();
    renderStats();
  });
  $('#buyerSearch').addEventListener('input', (e) => {
    state.buyerQ = e.target.value;
    renderBuyers();
  });
  $('#buyerSort').addEventListener('click', () => {
    state.buyerSort = !state.buyerSort;
    $('#buyerSort').classList.toggle('primary', state.buyerSort);
    $('#buyerSort').classList.toggle('ghost', !state.buyerSort);
    renderBuyers();
  });

  $('#dmClose').addEventListener('click', () => {
    $('#dmModal').hidden = true;
    document.body.style.overflow = '';
  });
  $('#dmModal').addEventListener('click', (e) => {
    if (e.target.id === 'dmModal') {
      $('#dmModal').hidden = true;
      document.body.style.overflow = '';
    }
  });
  $('#dmItems').addEventListener('change', regenDM);
  $('#dmItems').addEventListener('input', regenDM);
  $('#dmRegen').addEventListener('click', () => {
    regenDM();
    toast($('#dmHint'), '🔄 已重新產生');
  });
  $('#dmCopy').addEventListener('click', () => copyText($('#dmText').value, $('#dmHint')));
  $('#dmQuote').addEventListener('click', () => {
    const b = state.dmBuyer;
    if (!b) return;
    const picked = readDMPicked();
    if (!picked.length) return toast($('#dmHint'), '請先勾選品項');
    const c = drawQuote({ name: `${b.type || '開店'}套餐`, type: b.type || '', price: null, items: picked });
    c.toBlob((blob) => download(blob, `${b.name || '買家'}_報價單.png`), 'image/png');
    toast($('#dmHint'), '✅ 報價單已下載');
  });
  $('#dmMark').addEventListener('click', () => {
    const b = state.dmBuyer;
    if (!b) return;
    b.status = 'contacted';
    writeLS(K.buyer, state.buyers);
    renderBuyers();
    toast($('#dmHint'), '✅ 已標記為「已聯繫」');
  });

  $('#exportBuyers').addEventListener('click', () => {
    const rows = [['稱呼', '聯絡', '店型', '預算', '開幕', '狀態', '需求品項', '備註', '建立日']];
    state.buyers.forEach((b) =>
      rows.push([b.name, b.contact, b.type, b.budget ?? '', b.timeline, BUYER_STATUS[b.status], (b.needs || []).join('、'), b.note, (b.createdAt || '').slice(0, 10)])
    );
    csvDownload(rows, `買家名單_${new Date().toISOString().slice(0, 10)}.csv`);
  });

  $('#newSeller').addEventListener('click', () => openSeller(null));
  $('#sellerClose').addEventListener('click', () => {
    $('#sellerModal').hidden = true;
    document.body.style.overflow = '';
  });
  $('#sellerModal').addEventListener('click', (e) => {
    if (e.target.id === 'sellerModal') {
      $('#sellerModal').hidden = true;
      document.body.style.overflow = '';
    }
  });
  $('#sSave').addEventListener('click', saveSeller);
  $('#sDelete').addEventListener('click', () => {
    if (!state.editingSeller?.id) return;
    state.sellers = state.sellers.filter((s) => s.id !== state.editingSeller.id);
    writeLS(K.seller, state.sellers);
    $('#sellerModal').hidden = true;
    document.body.style.overflow = '';
    renderSellers();
    renderStats();
  });
  $('#sellerSearch').addEventListener('input', (e) => {
    state.sellerQ = e.target.value;
    renderSellers();
  });
  $('#exportSellers').addEventListener('click', () => {
    const rows = [['店名', '地區', '聯絡人', '電話', '店型', '收店時間', '開價', '狀態', '設備', '備註', '建立日']];
    state.sellers.forEach((s) =>
      rows.push([s.shop, s.area, s.contact, s.phone, s.type, s.close, s.ask ?? '', SELLER_STATUS[s.status], (s.equip || []).join('、'), s.note, (s.createdAt || '').slice(0, 10)])
    );
    csvDownload(rows, `收店線索_${new Date().toISOString().slice(0, 10)}.csv`);
  });

  $('#genPost').addEventListener('click', () => {
    const v = $('#groupProduct').value;
    if (!v) return toast($('#copyHint'), '請先選一個商品或套餐');
    const [kind, id] = v.split(':');
    $('#postText').value = kind === 'pkg' ? buildPkgPost(state.packages.find((p) => p.id === id)) : buildItemPost(itemById(id));
    $('#postbox').hidden = false;
    $('#postbox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('#copyPost').addEventListener('click', () => copyText($('#postText').value, $('#copyHint')));
  $('#editPost').addEventListener('click', () => $('#postText').focus());

  $('#dirSearch').addEventListener('input', (e) => {
    state.dirQ = e.target.value;
    renderDir();
  });

  const params = new URLSearchParams(location.search);
  if (params.get('view')) switchView(params.get('view'));
  if (params.get('item')) openModal(params.get('item'));
  if (params.get('pkg')) openPkg(params.get('pkg'));
}

init();
