const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const K = {
  inv: 'twsh.inventory.overrides.v1',
  pkg: 'twsh.packages.v1',
  buyer: 'twsh.buyers.v1',
  seller: 'twsh.sellers.v1',
  post: 'twsh.posts.v1',
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
  sop: null,
  sopQ: '',
  priceMode: false,
  priceRef: {},
  priceRefNote: '',
  buyerQ: '',
  buyerSort: false,
  sellerQ: '',
  current: null,
  photoIdx: 0,
  editingPkg: null,
  editingBuyer: null,
  editingSeller: null,
  dmBuyer: null,
  posts: [],
  postGroupId: '',
  postPicked: [],
  postStyle: 'pkg',
  postVariant: 0,
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
  if (state.priceMode) {
    renderPriceTable();
    return;
  }
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

/* ================= 快速標價 ================= */
function setOverride(id, field, value) {
  const cur = { ...(state.overrides[id] || {}) };
  if (value === '' || value === null || value === undefined) delete cur[field];
  else cur[field] = value;
  if (Object.keys(cur).length) state.overrides[id] = cur;
  else delete state.overrides[id];
  writeLS(K.inv, state.overrides);
}

function priceRefFor(id) {
  const r = state.priceRef[id];
  return Array.isArray(r) && r.length === 2 ? r : null;
}

function renderPriceTable() {
  const q = state.stockQ.trim().toLowerCase();
  const list = state.items
    .map(merged)
    .filter((i) => !state.stockCat || i.cat === state.stockCat)
    .filter((i) => !state.stockStatus || i.status === state.stockStatus)
    .filter((i) => !q || `${i.name} ${i.cat} ${i.desc} ${i.specs}`.toLowerCase().includes(q));

  $('#priceBody').innerHTML = list
    .map((i) => {
      const ref = priceRefFor(i.id);
      const refTxt = ref ? `${money(ref[0])}–${money(ref[1])}` : '—';
      return `<tr data-id="${esc(i.id)}">
        <td class="pt-img"><img src="${esc(i.photos[0] || '')}" alt="" loading="lazy"></td>
        <td class="pt-name">${esc(i.name)}</td>
        <td class="pt-cat">${esc(i.cat)}</td>
        <td><input class="pt-in pt-price" type="number" min="0" step="100" inputmode="numeric"
             value="${i.price ?? ''}" placeholder="未定價"></td>
        <td><input class="pt-in pt-qty" type="number" min="0" step="1" inputmode="numeric"
             value="${i.qty ?? ''}" placeholder="—"></td>
        <td><input class="pt-in pt-specs" type="text" value="${esc(i.specs || '')}" placeholder="尺寸／廠牌"></td>
        <td>${ref ? `<button class="pt-ref" data-id="${esc(i.id)}" title="點一下填入中間值">${refTxt}</button>` : '<span class="pt-ref-none">—</span>'}</td>
        <td>
          <select class="pt-in pt-status">
            <option value="available"${i.status === 'available' ? ' selected' : ''}>🟢 待售</option>
            <option value="reserved"${i.status === 'reserved' ? ' selected' : ''}>🟡 已保留</option>
            <option value="sold"${i.status === 'sold' ? ' selected' : ''}>⚪ 已售出</option>
          </select>
        </td>
      </tr>`;
    })
    .join('');

  $$('#priceBody tr').forEach((tr) => {
    const id = tr.dataset.id;
    const price = tr.querySelector('.pt-price');
    const qty = tr.querySelector('.pt-qty');
    const specs = tr.querySelector('.pt-specs');
    const status = tr.querySelector('.pt-status');

    price.addEventListener('input', () => {
      setOverride(id, 'price', price.value === '' ? '' : Number(price.value));
      updatePriceStats();
    });
    qty.addEventListener('input', () => {
      setOverride(id, 'qty', qty.value === '' ? '' : Number(qty.value));
      updatePriceStats();
    });
    specs.addEventListener('input', () => setOverride(id, 'specs', specs.value));
    status.addEventListener('change', () => {
      setOverride(id, 'status', status.value);
      updatePriceStats();
    });
  });

  $$('#priceBody .pt-ref').forEach((b) =>
    b.addEventListener('click', () => {
      const ref = priceRefFor(b.dataset.id);
      if (!ref) return;
      const mid = Math.round((ref[0] + ref[1]) / 2 / 100) * 100;
      const tr = b.closest('tr');
      tr.querySelector('.pt-price').value = mid;
      setOverride(b.dataset.id, 'price', mid);
      updatePriceStats();
      toast(b, `已填入 ${money(mid)}`);
    })
  );

  updatePriceStats();
}

function updatePriceStats() {
  const all = state.items.map(merged);
  const priced = all.filter((i) => i.price != null && i.price !== '');
  const sum = priced.reduce((a, i) => a + Number(i.price) * (Number(i.qty) || 1), 0);
  $('#priceDone').textContent = `${priced.length} / ${all.length}`;
  $('#priceFill').style.width = all.length ? `${(priced.length / all.length) * 100}%` : '0%';
  $('#priceSum').textContent = priced.length ? money(sum) : '—';
  $('#priceNote').textContent = state.priceRefNote || '';
}

function togglePriceMode(on) {
  state.priceMode = on ?? !state.priceMode;
  $('#pricePanel').hidden = !state.priceMode;
  $('#stockGrid').hidden = state.priceMode;
  $('#stockEmpty').hidden = true;
  $('#priceMode').classList.toggle('primary', state.priceMode);
  $('#priceMode').textContent = state.priceMode ? '⚡ 標價中' : '⚡ 快速標價';
  if (state.priceMode) renderPriceTable();
  else renderStock();
}

function fillAllRefs() {
  let n = 0;
  state.items.forEach((i) => {
    const ref = priceRefFor(i.id);
    if (!ref) return;
    const cur = merged(i);
    if (cur.price != null && cur.price !== '') return;
    const mid = Math.round((ref[0] + ref[1]) / 2 / 100) * 100;
    setOverride(i.id, 'price', mid);
    n++;
  });
  renderPriceTable();
  toast($('#priceFillRef'), n ? `已填入 ${n} 項參考價，記得逐項調整` : '每一項都已經有價格了');
}

function clearAllPrices() {
  if (!confirm('確定要清除全部售價嗎？（只清售價，其他資料不動）')) return;
  state.items.forEach((i) => setOverride(i.id, 'price', ''));
  renderPriceTable();
  toast($('#priceClear'), '已清除全部售價');
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
    .map((g) => {
      const lp = lastPostFor(g);
      const posted = lp ? `<span class="badge posted">上次 ${daysAgo(lp.at)}</span>` : '';
      return `<div class="group">
        <div class="group-info">
          <p class="group-name">${g.priority ? `<span class="pri">${g.priority}</span>` : ''}${esc(g.name)} ${posted}</p>
          <p class="group-sub">${esc(g.cat)}${g.kind === 'search' ? ' · 搜尋連結' : ''}</p>
          ${g.note ? `<p class="group-note">${esc(g.note)}</p>` : ''}
        </div>
        <div class="group-actions">
          <button class="btn small primary" data-post="${esc(groupKey(g))}">📤 發文</button>
          <a class="btn small ghost" href="${esc(g.url)}" target="_blank" rel="noopener">開啟 ↗</a>
        </div>
      </div>`;
    })
    .join('');

  $$('#groupList [data-post]').forEach((b) =>
    b.addEventListener('click', () => openPost(b.dataset.post))
  );
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

/* ================= 發文產生器 ================= */
const POST_STYLES = [
  { id: 'pkg', label: '🎁 開店套餐' },
  { id: 'item', label: '📦 單品出清' },
  { id: 'urgent', label: '⚡ 限時出清' },
  { id: 'buy', label: '🏪 收店公告' },
];

const postItems = () =>
  state.postPicked
    .map((id) => itemById(id))
    .filter(Boolean)
    .map(merged)
    .filter((i) => i.status !== 'sold');
const groupKey = (g) => g.url || g.name;
const groupById = (k) => state.groups.find((g) => groupKey(g) === k) || null;

function lastPostFor(g) {
  const k = groupKey(g);
  return state.posts.filter((p) => p.groupKey === k).sort((a, b) => (a.at < b.at ? 1 : -1))[0] || null;
}

function daysAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return '今天';
  if (d === 1) return '昨天';
  return `${d} 天前`;
}

function openPost(groupKeyArg, itemIds) {
  const sorted = [...state.groups].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  state.postGroupId = groupKeyArg || state.postGroupId || (sorted[0] ? groupKey(sorted[0]) : '');
  if (itemIds) state.postPicked = [...itemIds];
  renderPostGroups();
  renderPostPicker();
  renderPostStyles();
  regenPost();
  $('#postModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#postModal').scrollTop = 0;
}

function closePost() {
  $('#postModal').hidden = true;
  document.body.style.overflow = '';
}

function renderPostGroups() {
  const sorted = [...state.groups].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  $('#postGroup').innerHTML = sorted
    .map((g) => {
      const lp = lastPostFor(g);
      const tag = lp ? ` · 上次 ${daysAgo(lp.at)}` : '';
      return `<option value="${esc(groupKey(g))}">${g.priority ? `${g.priority}. ` : ''}${esc(g.name)}${tag}</option>`;
    })
    .join('');
  $('#postGroup').value = state.postGroupId;
  syncPostGroupLink();
}

function syncPostGroupLink() {
  const g = groupById(state.postGroupId);
  const a = $('#postOpenGroup');
  if (g) {
    a.href = g.url;
    a.hidden = false;
    a.textContent = g.kind === 'search' ? '🔍 去 FB 搜尋 ↗' : '開啟社團 ↗';
  } else {
    a.hidden = true;
  }
}

function renderPostPicker() {
  const items = state.items.map(merged).filter((i) => i.status !== 'sold');
  if (!items.length) {
    $('#postPicker').innerHTML = '<p class="hint" style="padding:12px">沒有可發文的商品</p>';
    return;
  }
  $('#postPicker').innerHTML = items
    .map((i) => {
      const on = state.postPicked.includes(i.id);
      const img = i.photos?.[0] ? `<img src="${esc(i.photos[0])}" alt="" loading="lazy">` : '<div class="pp-noimg">📦</div>';
      return `<div class="post-pick ${on ? 'on' : ''}" data-id="${esc(i.id)}">
        ${img}
        <span class="pp-tick">✓</span>
        <div class="pp-body">
          <div class="pp-name">${esc(i.name)}</div>
          <div class="pp-price ${i.price ? '' : 'none'}">${i.price ? money(i.price) : '未定價'}</div>
        </div>
      </div>`;
    })
    .join('');
  updatePostSum();
}

function updatePostSum() {
  const picked = postItems();
  const priced = picked.filter((i) => i.price);
  const total = priced.reduce((s, i) => s + Number(i.price), 0);
  const unpriced = picked.length - priced.length;
  let txt = `已選 ${picked.length} 項`;
  if (total) txt += ` · 合計 ${money(total)}`;
  if (unpriced) txt += ` · ${unpriced} 項未定價`;
  $('#postSum').textContent = txt;
}

function renderPostStyles() {
  $('#postStyles').innerHTML = POST_STYLES.map(
    (s) => `<button class="chip ${state.postStyle === s.id ? 'active' : ''}" data-style="${s.id}">${s.label}</button>`
  ).join('');
}

const POST_OPENERS = {
  pkg: [
    '要開店，別一項一項買。\n這組直接幫你配好，省錢也省時間。',
    '開一間店最貴的不是設備，是「買錯」。\n這組是照店型配好的，直接帶走。',
    '自己一項一項找，光運費跟時間就吃掉價差。\n整組帶走比較快。',
    '設備東湊西湊，最後不是尺寸不合就是少一件。\n這組已經配好了。',
  ],
  item: [
    '倉庫出清，都是自己店裡用過、整理過的。',
    '這些都是我們倉庫現貨，可現場看、可試機。',
    '整理倉庫，以下都可以談，帶走越多越便宜。',
  ],
  urgent: [
    '這批這週要清掉，價格好談。',
    '倉庫要挪空間，這幾項這週帶走再優惠。',
    '限時，這週內成交的價格跟下週不一樣。',
  ],
  buy: [
    '店要收起來，設備不知道怎麼處理？\n我們整間收，你不用一件一件賣。',
    '收店最麻煩的不是賣不掉，是「不知道誰會買」。\n我們整間收，一次解決。',
    '結束營業，設備留著也是租金。\n我們整間收，當場現金。',
  ],
};

const POST_CLOSERS = {
  pkg: [
    '告訴我你的店型跟預算，我幫你配一組 🙏',
    '私訊我你的店型，我直接幫你配 🙏',
    '有要開店的話，先聊聊再決定也不遲 🙏',
  ],
  item: [
    '有興趣請私訊，告訴我你要哪一項 🙏',
    '要哪一項直接私訊我，可以約時間看貨 🙏',
    '私訊我品項名稱就好，我回你細節 🙏',
    '有需要都可以問，問了不一定買也沒關係 🙏',
  ],
  urgent: [
    '要的私訊我，先問先贏 🙏',
    '這週要的優先，私訊我保留 🙏',
    '有需要這週內私訊，過了就恢復原價 🙏',
    '這週內私訊的都優先處理 🙏',
  ],
  buy: [
    '有店要收，直接私訊我照片跟地點 🙏',
    '要收店的私訊我，拍照就好，不用整理 🙏',
    '有店要收起來，先問我一句，說不定比你想的多 🙏',
    '要收店的話，先傳照片給我，報價不用錢 🙏',
  ],
};

const pickVariant = (arr, v) => arr[((v % arr.length) + arr.length) % arr.length];

function buildPostText() {
  const picked = postItems();
  const style = state.postStyle;
  const L = [];
  const priced = picked.filter((i) => i.price);
  const total = priced.reduce((s, i) => s + Number(i.price), 0);
  const unpriced = picked.length - priced.length;

  if (style === 'buy') {
    L.push('【整間收購 · 餐廳 / 小吃店 / 飲料店 / 早餐店】', '');
    L.push(pickVariant(POST_OPENERS.buy, state.postVariant), '');
    L.push('▪ 收購範圍：冰箱、爐具、工作台、水槽、桌椅、餐具、裝潢五金');
    L.push('▪ 地區：宜蘭、台北、新北、桃園（其他地區可談）');
    L.push('▪ 流程：拍照給我 → 我報價 → 約時間看貨 → 當場現金');
    L.push('▪ 你不用搬、不用整理、不用自己上架', '');
    L.push('⚠️ 我們是自營倉庫，不是仲介。價格實在，但一定低於市價——');
    L.push('因為我們要整理、要保固、要承擔賣不掉的風險。', '');
    L.push(pickVariant(POST_CLOSERS.buy, state.postVariant));
    return L.join('\n');
  }

  if (style === 'pkg') {
    L.push('【宜蘭倉庫 · 開店整組帶走】', '');
    L.push(pickVariant(POST_OPENERS.pkg, state.postVariant), '');
    if (picked.length) {
      L.push(`▪ 內容（${picked.length} 項）：`);
      picked.forEach((i, n) => L.push(`   ${n + 1}. ${i.name}${i.price ? ` — ${money(i.price)}` : ' — 私訊報價'}`));
      L.push('');
    }
    if (total) L.push(`▪ 原價合計：${money(total)}`);
    if (unpriced) L.push(`▪ 另有 ${unpriced} 項未定價，私訊報價`);
    L.push('▪ 整組價：私訊談（帶走越多越便宜）');
    L.push('▪ 地點：宜蘭倉庫（可自取，可協助運送）');
    L.push('▪ 可現場看貨、可試機', '');
    L.push(pickVariant(POST_CLOSERS.pkg, state.postVariant));
    return L.join('\n');
  }

  if (style === 'urgent') {
    L.push('【限時出清 · 這週帶走再談】', '');
    L.push(pickVariant(POST_OPENERS.urgent, state.postVariant), '');
    if (picked.length) {
      picked.forEach((i) => {
        L.push(`▪ ${i.name}${i.price ? ` — ${money(i.price)}` : ' — 私訊報價'}`);
        if (i.specs) L.push(`   （${i.specs}）`);
      });
      L.push('');
    }
    if (total) L.push(`▪ 原價合計：${money(total)}`);
    L.push('▪ 全部可議，帶走越多越便宜');
    L.push('▪ 這週內成交另有優惠');
    L.push('▪ 地點：宜蘭倉庫（可自取，可協助運送）', '');
    L.push(pickVariant(POST_CLOSERS.urgent, state.postVariant));
    return L.join('\n');
  }

  // item
  L.push('【二手餐飲設備出清 · 宜蘭倉庫】', '');
  L.push(pickVariant(POST_OPENERS.item, state.postVariant), '');
  if (picked.length) {
    picked.forEach((i) => {
      L.push(`▪ ${i.name}`);
      const bits = [];
      if (i.condition) bits.push(i.condition);
      if (i.specs) bits.push(i.specs);
      if (bits.length) L.push(`   狀況／規格：${bits.join('，')}`);
      L.push(`   售價：${i.price ? `${money(i.price)}（可議）` : '私訊報價'}`);
      L.push('');
    });
  }
  if (total) L.push(`▪ 全部帶走：${money(total)}（可再談）`);
  L.push('▪ 地點：宜蘭倉庫（可自取，可協助運送）');
  L.push('▪ 可現場看貨、可試機', '');
  L.push(pickVariant(POST_CLOSERS.item, state.postVariant));
  return L.join('\n');
}

function regenPost() {
  $('#postText').value = buildPostText();
  updatePostSum();
}

/* ---------- 拼圖 ---------- */
function loadImg(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

function gridFor(n) {
  if (n <= 1) return [1, 1];
  if (n === 2) return [2, 1];
  if (n <= 4) return [2, 2];
  if (n <= 6) return [3, 2];
  return [3, 3];
}

function roundRectPath(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

function drawCover(x, img, px, py, w, h) {
  const ir = img.width / img.height;
  const br = w / h;
  let sw, sh, sx, sy;
  if (ir > br) {
    sh = img.height;
    sw = sh * br;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / br;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  x.drawImage(img, sx, sy, sw, sh, px, py, w, h);
}

async function drawCollage() {
  const W = 1080;
  const H = 1350;
  const PAD = 56;
  const picked = postItems().slice(0, 9);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');

  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0d1117');
  g.addColorStop(1, '#0b1a1a');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // 標頭
  x.fillStyle = '#2dd4bf';
  x.font = '700 26px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText('宜蘭倉庫 · 二手餐飲設備', PAD, 78);

  const titles = {
    pkg: '開店整組帶走',
    item: '二手設備出清',
    urgent: '限時出清 · 價格可談',
    buy: '整間收購',
  };
  x.fillStyle = '#e6edf3';
  x.font = '800 62px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText(titles[state.postStyle] || '二手設備出清', PAD, 152);

  const priced = picked.filter((i) => i.price);
  const total = priced.reduce((s, i) => s + Number(i.price), 0);
  const sub = picked.length
    ? `${picked.length} 項${total ? ` · 原價合計 NT$${total.toLocaleString('en-US')}` : ''}`
    : '私訊洽詢';
  x.fillStyle = '#8b949e';
  x.font = '400 26px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText(sub, PAD, 196);

  // 格線
  const TOP = 232;
  const BOT = 1180;
  const availW = W - PAD * 2;
  const availH = BOT - TOP;
  const GAP = 14;

  if (!picked.length && state.postStyle === 'buy') {
    const steps = [
      ['①', '拍照給我', '設備、店面、大概數量，手機拍就好'],
      ['②', '我報價', '當天回你一個整間的價格'],
      ['③', '約時間看貨', '確認後約時間，我們自己搬'],
      ['④', '當場現金', '不用你整理、不用你上架'],
    ];
    const boxH = 150;
    const startY = TOP + (availH - steps.length * (boxH + 18)) / 2;
    steps.forEach(([no, t1, t2], n) => {
      const py = startY + n * (boxH + 18);
      x.save();
      roundRectPath(x, PAD, py, availW, boxH, 16);
      x.fillStyle = '#161b22';
      x.fill();
      x.strokeStyle = '#2d333b';
      x.lineWidth = 2;
      x.stroke();
      x.fillStyle = '#2dd4bf';
      x.font = '800 44px "PingFang TC","Noto Sans TC",sans-serif';
      x.fillText(no, PAD + 28, py + 62);
      x.fillStyle = '#e6edf3';
      x.font = '700 34px "PingFang TC","Noto Sans TC",sans-serif';
      x.fillText(t1, PAD + 100, py + 58);
      x.fillStyle = '#8b949e';
      x.font = '400 24px "PingFang TC","Noto Sans TC",sans-serif';
      x.fillText(t2, PAD + 100, py + 100);
      x.restore();
    });
  } else if (!picked.length) {
    x.fillStyle = '#4a525c';
    x.font = '400 34px "PingFang TC","Noto Sans TC",sans-serif';
    x.textAlign = 'center';
    x.fillText('請先選商品', W / 2, TOP + availH / 2);
    x.textAlign = 'left';
  } else {
    const [cols, rows] = gridFor(picked.length);
    const cellW = (availW - GAP * (cols - 1)) / cols;
    const cellH = Math.min((availH - GAP * (rows - 1)) / rows, cellW * 1.25);
    const gridH = cellH * rows + GAP * (rows - 1);
    const offY = TOP + (availH - gridH) / 2;

    const imgs = await Promise.all(picked.map((i) => loadImg(i.photos?.[0])));

    picked.forEach((it, n) => {
      const r = Math.floor(n / cols);
      const col = n % cols;
      const px = PAD + col * (cellW + GAP);
      const py = offY + r * (cellH + GAP);

      x.save();
      roundRectPath(x, px, py, cellW, cellH, 16);
      x.clip();
      x.fillStyle = '#1c2128';
      x.fillRect(px, py, cellW, cellH);
      if (imgs[n]) drawCover(x, imgs[n], px, py, cellW, cellH);
      else {
        x.fillStyle = '#4a525c';
        x.font = '400 40px sans-serif';
        x.textAlign = 'center';
        x.fillText('📦', px + cellW / 2, py + cellH / 2);
        x.textAlign = 'left';
      }
      // 底部漸層 + 文字
      const barH = Math.min(112, cellH * 0.42);
      const lg = x.createLinearGradient(0, py + cellH - barH, 0, py + cellH);
      lg.addColorStop(0, '#00000000');
      lg.addColorStop(1, '#000000e6');
      x.fillStyle = lg;
      x.fillRect(px, py + cellH - barH, cellW, barH);

      const fs = cellW < 340 ? 20 : 24;
      x.font = `700 ${fs}px "PingFang TC","Noto Sans TC",sans-serif`;
      x.fillStyle = '#ffffff';
      const lines = wrapText(x, it.name, cellW - 24).slice(0, 2);
      lines.forEach((ln, k) => x.fillText(ln, px + 12, py + cellH - barH + 30 + k * (fs + 4)));

      x.font = `700 ${fs - 2}px "PingFang TC","Noto Sans TC",sans-serif`;
      x.fillStyle = it.price ? '#2dd4bf' : '#8b949e';
      x.fillText(it.price ? money(it.price) : '私訊報價', px + 12, py + cellH - 16);
      x.restore();
    });

    // 空格填「更多」
    const cells = cols * rows;
    for (let n = picked.length; n < cells; n++) {
      const r = Math.floor(n / cols);
      const col = n % cols;
      const px = PAD + col * (cellW + GAP);
      const py = offY + r * (cellH + GAP);
      x.save();
      roundRectPath(x, px, py, cellW, cellH, 16);
      x.clip();
      x.fillStyle = '#161b22';
      x.fillRect(px, py, cellW, cellH);
      x.strokeStyle = '#2d333b';
      x.lineWidth = 2;
      roundRectPath(x, px + 1, py + 1, cellW - 2, cellH - 2, 15);
      x.stroke();
      x.fillStyle = '#4a525c';
      x.font = '400 34px sans-serif';
      x.textAlign = 'center';
      x.fillText('＋', px + cellW / 2, py + cellH / 2 - 6);
      x.font = '400 18px "PingFang TC","Noto Sans TC",sans-serif';
      x.fillText('更多品項', px + cellW / 2, py + cellH / 2 + 28);
      x.fillText('私訊詢問', px + cellW / 2, py + cellH / 2 + 52);
      x.textAlign = 'left';
      x.restore();
    }
  }

  // 頁尾
  x.fillStyle = '#2d333b';
  x.fillRect(PAD, 1216, W - PAD * 2, 2);
  x.fillStyle = '#e6edf3';
  x.font = '700 30px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText('宜蘭倉庫 · 可自取 · 可協助運送', PAD, 1272);
  x.fillStyle = '#8b949e';
  x.font = '400 24px "PingFang TC","Noto Sans TC",sans-serif';
  x.fillText('私訊洽詢 · 可現場看貨試機', PAD, 1312);

  return c;
}

async function renderCollage() {
  const hint = $('#postHint');
  if (!postItems().length) return toast(hint, '請先選至少一項商品');
  toast(hint, '🖼 產生中…');
  const c = await drawCollage();
  const dst = $('#postCanvas');
  dst.width = c.width;
  dst.height = c.height;
  dst.getContext('2d').drawImage(c, 0, 0);
  toast(hint, '✅ 拼圖好了，按「⬇ 下載」');
}

async function downloadCollage() {
  const hint = $('#postHint');
  if (!postItems().length) return toast(hint, '請先選至少一項商品');
  const c = await drawCollage();
  const g = groupById(state.postGroupId);
  const tag = g ? g.name.slice(0, 12) : '社團';
  c.toBlob((b) => download(b, `發文拼圖_${tag}_${new Date().toISOString().slice(0, 10)}.png`), 'image/png');
  toast(hint, '✅ 拼圖已下載，去社團貼上');
}

/* ---------- 發文記錄 ---------- */
function markPosted() {
  const hint = $('#postHint');
  const g = groupById(state.postGroupId);
  if (!g) return toast(hint, '請先選社團');
  const picked = postItems();
  if (!picked.length) return toast(hint, '請先選至少一項商品');
  state.posts.unshift({
    id: uid(),
    groupKey: groupKey(g),
    groupName: g.name,
    itemIds: picked.map((i) => i.id),
    itemNames: picked.map((i) => i.name),
    style: state.postStyle,
    text: $('#postText').value,
    at: new Date().toISOString(),
  });
  writeLS(K.post, state.posts);
  renderGroups();
  renderPostGroups();
  toast(hint, `✅ 已記錄：${g.name.slice(0, 16)}…（${picked.length} 項）`);
}

function nextGroup() {
  const sorted = [...state.groups].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  const i = sorted.findIndex((g) => groupKey(g) === state.postGroupId);
  const nx = sorted[(i + 1) % sorted.length];
  if (!nx) return;
  state.postGroupId = groupKey(nx);
  renderPostGroups();
  $('#postGroup').value = state.postGroupId;
  syncPostGroupLink();
  toast($('#postHint'), `→ 換到：${nx.name.slice(0, 20)}…`);
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

/* ================= 成交 SOP ================= */
function renderSop() {
  const sop = state.sop;
  if (!sop) return;

  $('#sopPrinciple').textContent = sop.principle || '';
  $('#sopPrincipleWhy').textContent = sop.principleWhy || '';

  $('#sopSteps').innerHTML = (sop.steps || [])
    .map(
      (st) => `<div class="sop-step">
        <div class="sop-n">${st.n}</div>
        <div class="sop-body">
          <h4>${esc(st.title)}</h4>
          <p class="sop-why">${esc(st.why)}</p>
          <pre class="sop-say">${esc(st.say)}</pre>
          <div class="sop-foot">
            <span class="sop-tip">💡 ${esc(st.tip)}</span>
            <button class="btn small" data-say="${st.n}">📋 複製這段</button>
          </div>
        </div>
      </div>`
    )
    .join('');

  $$('#sopSteps .sop-step button').forEach((b) =>
    b.addEventListener('click', () => {
      const st = (sop.steps || []).find((x) => String(x.n) === b.dataset.say);
      if (st) copyText(st.say, b);
    })
  );

  $('#sopDonts').innerHTML = (sop.donts || []).map((d) => `<li>${esc(d)}</li>`).join('');

  renderSopObjections();
}

function renderSopObjections() {
  const sop = state.sop;
  if (!sop) return;
  const q = state.sopQ.trim().toLowerCase();
  const list = (sop.objections || []).filter(
    (o) => !q || `${o.q} ${o.a} ${o.why}`.toLowerCase().includes(q)
  );
  $('#sopObjections').innerHTML = list
    .map(
      (o, i) => `<div class="sop-obj">
        <div class="sop-obj-head">
          <span class="sop-q">「${esc(o.q)}」</span>
          <button class="btn small" data-i="${i}">📋 複製回覆</button>
        </div>
        <pre class="sop-a">${esc(o.a)}</pre>
        <p class="sop-why-line">為什麼這樣回：${esc(o.why)}</p>
      </div>`
    )
    .join('');
  $('#sopEmpty').hidden = list.length > 0;
  $$('#sopObjections .sop-obj button').forEach((b) =>
    b.addEventListener('click', () => copyText(list[Number(b.dataset.i)].a, b))
  );
}

function exportSop() {
  const sop = state.sop;
  if (!sop) return;
  const L = [];
  L.push('# 成交 SOP — 發完文之後怎麼回私訊');
  L.push('');
  L.push(`> ${sop.principle}`);
  L.push(`> ${sop.principleWhy}`);
  L.push('');
  L.push('## 五步流程');
  (sop.steps || []).forEach((st) => {
    L.push('');
    L.push(`### 第 ${st.n} 步：${st.title}`);
    L.push('');
    L.push(`**為什麼**：${st.why}`);
    L.push('');
    L.push('**照這樣說**：');
    L.push('```');
    L.push(st.say);
    L.push('```');
    L.push('');
    L.push(`**小技巧**：${st.tip}`);
  });
  L.push('');
  L.push('## 客戶這樣說，你這樣回');
  (sop.objections || []).forEach((o) => {
    L.push('');
    L.push(`### 「${o.q}」`);
    L.push('');
    L.push('```');
    L.push(o.a);
    L.push('```');
    L.push('');
    L.push(`*為什麼這樣回：${o.why}*`);
  });
  L.push('');
  L.push('## 絕對不要做的事');
  (sop.donts || []).forEach((d) => L.push(`- ${d}`));
  L.push('');
  L.push(`---`);
  L.push(`產生時間：${new Date().toLocaleString('zh-TW')}`);
  L.push(`來源：0915888927.com/tw`);
  download(new Blob([L.join('\n')], { type: 'text/markdown;charset=utf-8' }), '成交SOP_發完文怎麼回私訊.md');
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
  state.posts = readLS(K.post, []);

  const [inv, groups, sites, replies, sop, priceRef] = await Promise.all([
    fetch('data/inventory.json').then((r) => r.json()).catch(() => ({ items: [] })),
    fetch('data/groups.json').then((r) => r.json()).catch(() => ({ groups: [] })),
    fetch('data/sites.json').then((r) => r.json()).catch(() => []),
    fetch('data/replies.json').then((r) => r.json()).catch(() => ({ replies: [] })),
    fetch('data/sop.json').then((r) => r.json()).catch(() => null),
    fetch('data/price-ref.json').then((r) => r.json()).catch(() => null),
  ]);

  state.items = inv.items || [];
  state.groups = groups.groups || [];
  state.sites = Array.isArray(sites) ? sites : [];
  state.replies = replies.replies || [];
  state.sop = sop;
  state.priceRef = priceRef?.refs || {};
  state.priceRefNote = priceRef?.note || '';
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
  renderSop();
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

  $('#priceMode').addEventListener('click', () => togglePriceMode());
  $('#priceBack').addEventListener('click', () => togglePriceMode(false));
  $('#priceFillRef').addEventListener('click', fillAllRefs);
  $('#priceClear').addEventListener('click', clearAllPrices);

  $$('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));

  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    ['#modal', '#pkgModal', '#buyerModal', '#sellerModal', '#dmModal', '#postModal'].forEach((s) => {
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

  /* ---------- 發文產生器 ---------- */
  $('#stockPost').addEventListener('click', () => openPost(''));
  $('#postClose').addEventListener('click', closePost);
  $('#postModal').addEventListener('click', (e) => {
    if (e.target.id === 'postModal') closePost();
  });
  $('#postGroup').addEventListener('change', (e) => {
    state.postGroupId = e.target.value;
    syncPostGroupLink();
  });
  $('#postPicker').addEventListener('click', (e) => {
    const card = e.target.closest('.post-pick');
    if (!card) return;
    const id = card.dataset.id;
    const i = state.postPicked.indexOf(id);
    if (i >= 0) state.postPicked.splice(i, 1);
    else {
      if (state.postPicked.length >= 9) return toast($('#postHint'), '拼圖最多 9 項，先取消一項');
      state.postPicked.push(id);
    }
    card.classList.toggle('on', state.postPicked.includes(id));
    regenPost();
  });
  $('#postStyles').addEventListener('click', (e) => {
    const b = e.target.closest('[data-style]');
    if (!b) return;
    state.postStyle = b.dataset.style;
    renderPostStyles();
    regenPost();
  });
  $('#postCopy').addEventListener('click', () => copyText($('#postText').value, $('#postHint')));
  $('#postRegen').addEventListener('click', () => {
    state.postVariant++;
    regenPost();
    toast($('#postHint'), '🔄 換一種說法（避免多社團貼一樣被 FB 判定重複）');
  });
  $('#postDraw').addEventListener('click', renderCollage);
  $('#postDownload').addEventListener('click', downloadCollage);
  $('#postDone').addEventListener('click', markPosted);
  $('#postNext').addEventListener('click', nextGroup);

  $('#sopSearch').addEventListener('input', (e) => {
    state.sopQ = e.target.value;
    renderSopObjections();
  });
  $('#sopExport').addEventListener('click', exportSop);

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
