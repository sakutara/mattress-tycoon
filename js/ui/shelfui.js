/* Tương tác trực tiếp với kệ trên sơ đồ: chạm kệ -> sheet chọn hàng từ kho, đổi giá/nạp/lấy xuống; kéo-thả thẻ hàng lên kệ; giữ lâu = menu nhanh */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels;
  function $(id) { return document.getElementById(id); }
  // ---- sheet thứ 2 (chọn / chi tiết) ----
  var S2 = UI.sheet2 = {
    fn: null, openFlag: false,
    open: function (title, fn) { S2.fn = fn; S2.openFlag = true; $('sheet2-title').textContent = title; $('sheet2').classList.add('open'); UI.layoutSheets(); S2.refresh(true); },
    close: function () { S2.openFlag = false; S2.fn = null; $('sheet2').classList.remove('open'); UI.shelf.cur = null; },
    refresh: function (force) {
      if (!S2.openFlag || !S2.fn) return;
      var b = $('sheet2-body'), ae = document.activeElement;
      if (!force && ae && b.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) return;
      var top = b.scrollTop, h = S2.fn(); if (h !== S2.last || force) { b.innerHTML = h; S2.last = h; b.scrollTop = top; }
    }
  };
  var SH = UI.shelf = { cur: null, target: 'main', qty: 'full', f: { type: '', brand: '', q: '', fam: '' }, acts: {}, chg: {} };
  function slotById(id) { return G.state.slots.filter(function (x) { return x.id === id; })[0]; }
  function slotName(sl) { var n = G.shelf.ordinals()[sl.id]; return sl.kind === 'shelf' ? 'Kệ ' + (Math.floor(n / 3) + 1) + '.' + (n % 3 + 1) : 'Đệm trưng bày ' + (n + 1); }
  SH.open = function (id) { SH.cur = id; SH.target = 'main'; var sl = slotById(id); if (!sl) return; S2.open(slotName(sl), SH.render); };
  function xBtn(sl, sku) {
    var x = G.suggest.quickX(sku, 6);
    if (!x) return '<div class="muted small">Mặt hàng này không nhập lấy ngay được (chỉ đại lý cấp 1 / nhà máy).</div>';
    return '<div class="small">⚡ <b>Nhập gấp</b> ' + x.qty + ' sp từ đại lý (' + E(x.eta) + '): <b>' + F.vnd(x.total) + '</b> thay vì ' + F.vnd(x.normal) + ' · phí hỏa tốc +' + F.vnd(x.fee) + ' · còn ' + x.left + ' lượt</div>' +
      '<div class="row"><button class="btn primary" data-act="shExpress" data-sku="' + E(sku) + '" data-n="' + x.qty + '"' + (x.afford && x.left ? '' : ' disabled') + '>⚡ Nhập gấp ' + x.qty + '</button></div>';
  }
  function stockTxt(sku) {
    var t = G.skus[sku]; return G.lines[t.line].skus.filter(function (k) { return G.wh.stockQty(k.id) > 0 || k.size === '1m6'; }).map(function (k) { return (k.size === 'Tiêu chuẩn' ? '' : k.size + ': ') + '<b class="' + (G.wh.stockQty(k.id) ? '' : 'neg') + '">' + G.wh.stockQty(k.id) + '</b>'; }).join(' · ');
  }
  function sampleCard(sku, title, extra) {
    var k = G.skus[sku], tot = G.wh.lineStock(sku), fl = G.pricing.floor(sku), base = G.pricing.base(sku);
    return '<div class="card"><div class="dcard"><img class="dthumb" width="56" height="56" alt="" src="' + G.sprites.skuThumb(sku, 56) + '"><div class="dinfo"><small class="muted">' + title + '</small><br><b>' + E(k.label) + '</b> ' + G.life.badge(G.life.stage(sku)) + '<div class="small">Mã <b>' + E(G.sprites.codeOf(sku)) + '</b>' + (k.cw ? ' · ' + E(k.cw.name) + ' · ' + E(k.cw.mat) + ' · ' + E(G.data.cwPatterns[k.cw.pat]) + ' · bộ ' + k.cw.pieces + ' món' : '') + '</div>' +
      '<div class="small">Tồn kho: <b class="' + (tot ? '' : 'neg') + '">' + tot + '</b> (' + stockTxt(sku) + ')</div></div></div>' +
      '<div class="row"><label class="small">Giá bán <input type="number" class="price" step="1000" data-chg="shPrice" data-sku="' + E(sku) + '" value="' + base + '"></label><span class="muted small">niêm yết ' + F.short(k.list) + (fl ? ' · sàn ' + F.short(fl) : '') + '</span></div>' + (extra || '') + '</div>';
  }
  SH.catalog = function (sl) {
    var W = G.wh, target = SH.target === 'set' && sl.kind === 'bed' ? 'set' : 'main', lines = [];
    G.lineList.forEach(function (l) {
      var rep = l.skus.filter(function (k) { return k.size === '1m6' || k.size === 'Tiêu chuẩn'; })[0] || l.skus[0]; if (!rep || !G.brandAvail(l.brand)) return;
      if (G.life.stageOfLine(l.id) >= 3 && !W.lineStock(rep.id)) return;
      if (target === 'set' ? rep.type !== 'ga' : !G.shelf.fits(sl, rep.id)) return;
      if (G.shelf.shownElsewhere(sl.id, rep.id)) return; // đang trưng bày ở ô khác thì không chọn lại
      lines.push({ rep: rep, stock: W.lineStock(rep.id), line: l });
    });
    return lines;
  };
  SH.render = function () {
    var s = G.state, W = G.wh, sl = slotById(SH.cur); if (!sl) return '<p class="muted">Ô trưng bày không còn.</p>';
    $('sheet2-title').textContent = slotName(sl);
    var h = '<div class="sh-nav"><button class="sh-nb" data-act="shNav" data-d="-1" aria-label="Ô trước">◀</button><div class="sh-nt"><b>' + E(slotName(sl)) + '</b><small>' + (sl.kind === 'bed' ? 'Mẫu đệm + bộ chăn ga' : 'Mỗi ô 1 mẫu · hàng bán lấy từ kho') + '</small></div><button class="sh-nb" data-act="shNav" data-d="1" aria-label="Ô sau">▶</button></div>';
    if (sl.sku) {
      h += sampleCard(sl.sku, sl.kind === 'bed' ? 'Mẫu đệm đang trưng bày' : 'Mẫu đang trưng bày', '<div class="sh-acts"><button class="btn" data-act="shRemove">📤 Gỡ về kho</button><button class="btn" data-act="shSellSample">🏷 Bán mẫu -15%</button><button class="btn" data-act="shToBuy">📦 Nhập hàng</button></div>' + (W.lineStock(sl.sku) === 0 ? xBtn(sl, sl.sku) : ''));
    } else {
      h += '<div class="card muted">Ô đang trống - chọn mẫu để trưng bày từ danh mục bên dưới.</div>';
      if (sl.last && G.skus[sl.last] && W.pickSize(sl.last)) h += '<div class="row"><button class="btn primary" data-act="shRelast">↩ Trưng bày lại mẫu trước: ' + E(G.sprites.codeOf(sl.last)) + '</button></div>';
    }
    if (sl.kind === 'bed') {
      if (sl.set && G.skus[sl.set]) h += sampleCard(sl.set, 'Bộ chăn ga gối phủ giường', '<div class="sh-acts"><button class="btn" data-act="shSetOff">Bỏ bộ khỏi giường</button></div>');
      else h += '<div class="card muted">Giường chưa phủ bộ chăn ga: chọn một bộ để dọn giường đẹp như ảnh.</div>';
      h += '<div class="segs sh-segs"><button class="seg' + (SH.target !== 'set' ? ' on' : '') + '" data-act="shTarget" data-v="main">Chọn mẫu đệm</button><button class="seg' + (SH.target === 'set' ? ' on' : '') + '" data-act="shTarget" data-v="set">Chọn bộ chăn ga</button></div>';
    }
    // danh mục
    var target = SH.target === 'set' && sl.kind === 'bed' ? 'set' : 'main', all = SH.catalog(sl), types = {};
    all.forEach(function (x) { types[x.rep.type] = 1; });
    if (SH.f.type && !types[SH.f.type]) SH.f.type = '';
    var brands = {}; all.forEach(function (x) { brands[x.rep.brand] = 1; });
    var showFam = target === 'set' || SH.f.type === 'ga' || (!SH.f.type && types.ga);
    h += '<h4 class="sh-title">Chọn mẫu mới <span class="muted">(' + all.length + ')</span></h4><div class="buy-filters sh-head"><select data-chg="shType"><option value="">Mọi loại</option>' + Object.keys(types).map(function (t) { return '<option value="' + t + '"' + (SH.f.type === t ? ' selected' : '') + '>' + G.data.types[t].name + '</option>'; }).join('') + '</select>' +
      '<select data-chg="shBrand"><option value="">Mọi hãng</option>' + Object.keys(brands).map(function (b) { return '<option value="' + b + '"' + (SH.f.brand === b ? ' selected' : '') + '>' + E(G.brandName(b)) + '</option>'; }).join('') + '</select><input type="text" class="wsearch sh-search" placeholder="Tìm mã / tên..." data-chg="shQ" value="' + E(SH.f.q) + '"></div>';
    if (showFam) h += '<div class="chips"><button class="chip' + (!SH.f.fam ? ' on' : '') + '" data-act="shFam" data-v="">Mọi màu</button>' + Object.keys(G.data.cwFamilies).map(function (f) { return '<button class="chip' + (SH.f.fam === f ? ' on' : '') + '" data-act="shFam" data-v="' + f + '">' + E(G.data.cwFamilies[f]) + '</button>'; }).join('') + '</div>';
    var q = (SH.f.q || '').toLowerCase();
    var list = all.filter(function (x) { var k = x.rep; return (!SH.f.type || k.type === SH.f.type) && (!SH.f.brand || k.brand === SH.f.brand) && (!SH.f.fam || (k.cw && k.cw.fam === SH.f.fam)) && (!q || (k.label + ' ' + G.sprites.codeOf(k.id)).toLowerCase().indexOf(q) >= 0); });
    list.sort(function (a, b) { return (b.stock > 0) - (a.stock > 0) || (G.life.stageOfLine(a.line.id) - G.life.stageOfLine(b.line.id)) || b.stock - a.stock; });
    var more = list.length > 60; list = list.slice(0, 60);
    if (!list.length) h += '<p class="muted small">Không có mẫu phù hợp. <button class="mini primary" data-act="shToBuy">Đi nhập hàng</button></p>';
    else h += '<div class="sh-list">' + list.map(function (x) {
      var k = x.rep, st = x.stock <= 0 ? 'out' : G.life.stage(k.id) === 3 ? 'old' : x.stock <= 3 ? 'low' : 'ok', cur = (target === 'set' ? sl.set : sl.sku) && G.skus[target === 'set' ? sl.set : sl.sku].line === k.line;
      return '<div class="buy-item sh-item s-' + st + (cur ? ' sel' : '') + '"' + (x.stock > 0 ? ' data-drag="' + E(k.id) + '"' : '') + '><img alt="" src="' + G.sprites.skuThumb(k.id, 56) + '"><div class="buy-info"><b>' + E(k.cw ? k.cw.code + ' ' + k.cw.name : x.line.name) + '</b><br><span class="muted">' + E(G.brandName(k.brand)) + ' · ' + E(G.data.types[k.type].name) + '</span><br><span class="sh-stock">Kho <b class="' + (x.stock ? '' : 'neg') + '">' + x.stock + '</b></span> · <span class="buy-price">' + F.vnd(G.pricing.base(k.id)) + '</span></div>' +
        '<div class="buy-qty">' + (x.stock > 0 ? '<button class="btn primary sh-pick" data-act="shPick" data-sku="' + E(k.id) + '">' + (cur ? '✓ Đang dùng' : 'Trưng bày') + '</button>' : '<button class="btn sh-pick" data-act="shToBuy">Nhập hàng</button>') + '</div></div>';
    }).join('') + '</div>' + (more ? '<p class="muted small">Chỉ hiện 60 mẫu đầu - hãy lọc thêm.</p>' : '');
    return h;
  };
  var A = SH.acts, C = SH.chg;
  function res(r) { if (r && r.msg) G.notify.toast(E(r.msg), r.ok ? 'good' : 'warn'); }
  A.shNav = function (el) {
    var cur = slotById(SH.cur), list = G.state.slots.filter(function (x) { return x.kind === cur.kind; }), i = list.indexOf(cur), j = (i + (+el.dataset.d) + list.length) % list.length; SH.cur = list[j].id;
  };
  A.shTarget = function (el) { SH.target = el.dataset.v; SH.f.type = ''; };
  A.shFam = function (el) { SH.f.fam = el.dataset.v; };
  A.shPick = function (el) {
    var sl = slotById(SH.cur), sku = el.dataset.sku;
    if (G.wh.lineStock(sku) <= 0) { res({ ok: false, msg: 'Hết hàng trong kho - cần nhập ít nhất 1 để làm mẫu' }); return; }
    res(SH.target === 'set' && sl.kind === 'bed' ? G.shelf.assignSet(sl.id, sku) : G.shelf.assign(sl.id, sku));
  };
  A.shExpress = function (el) { res(G.suggest.placeQuickX(el.dataset.sku, +el.dataset.n)); };
  A.shRelast = function () { var sl = slotById(SH.cur); res(G.shelf.assign(sl.id, sl.last)); };
  A.shRemove = function () { var sl = slotById(SH.cur); G.shelf.clear(sl); res({ ok: true, msg: 'Đã gỡ mẫu về kho (thành hàng trưng bày)' }); };
  A.shSellSample = function () { res(G.shelf.sellSample(SH.cur)); };
  A.shSetOff = function () { res(G.shelf.assignSet(SH.cur, null)); };
  A.shToBuy = function () { S2.close(); P.show('buy'); };
  C.shType = function (el) { SH.f.type = el.value; }; C.shBrand = function (el) { SH.f.brand = el.value; }; C.shQ = function (el) { SH.f.q = el.value; };
  C.shPrice = function (el) { var sku = el.dataset.sku || (slotById(SH.cur) || {}).sku; if (sku) res(G.pricing.setPrice(sku, +el.value)); };
  // ---- menu nhanh (giữ lâu) ----
  SH.quick = function (id, cx, cy) {
    var sl = slotById(id), m = $('qmenu'), wrap = m.parentNode.getBoundingClientRect(); if (!sl) return;
    SH.sel = id;
    m.innerHTML = '<b class="small">' + E(slotName(sl)) + '</b><button data-q="auto">⚡ Auto xếp kệ</button>' + (sl.sku ? '<button data-q="fill">📥 Nạp đầy</button><button data-q="take">📤 Lấy xuống</button>' : '') + '<button data-q="price">🏷 Đổi giá / chi tiết</button><button data-q="close">✕</button>';
    m.style.display = 'grid'; m.style.left = Math.max(4, Math.min(wrap.width - m.offsetWidth - 4, cx - wrap.left - 20)) + 'px'; m.style.top = Math.max(4, Math.min(wrap.height - m.offsetHeight - 4, cy - wrap.top - 10)) + 'px';
    m.onclick = function (e) {
      var b = e.target.closest('[data-q]'); if (!b) return; var q = b.dataset.q; m.style.display = 'none';
      if (q === 'auto') { var n = G.shelf.autoArrange(); G.notify.toast(n ? 'Đã trưng bày ' + n + ' mẫu' : 'Không còn mẫu mới để trưng bày', 'good'); }
      else if (q === 'take') res(G.shelf.unload(sl));
      else if (q === 'price') SH.open(sl.id);
      P.refresh(true); S2.refresh(true);
    };
  };
  document.addEventListener('pointerdown', function (e) { var m = $('qmenu'); if (m && m.style.display !== 'none' && !m.contains(e.target)) m.style.display = 'none'; }, true);

  // ---- kéo-thả thẻ hàng lên kệ (chuột + cảm ứng; cảm ứng cần giữ ~250ms) ----
  var D = UI.drag = { active: false, sku: null, ghost: null, suppress: false, timer: null, sx: 0, sy: 0, pending: null };
  function start(sku, x, y) {
    D.active = true; D.sku = sku; if (G.render.page !== 'shop') G.render.goPage('shop', true); var g = document.createElement('div'); g.className = 'dragghost'; g.innerHTML = '<img src="' + G.sprites.skuThumb(sku, 56) + '" width="48" height="48"><span>' + E(G.skus[sku].label) + '</span>'; document.body.appendChild(g); D.ghost = g; move(x, y);
    document.body.classList.add('dragging');
  }
  function move(x, y) { if (!D.ghost) return; D.ghost.style.left = x + 'px'; D.ghost.style.top = y + 'px'; var r = G.render.slotAtClient(x, y); G.render.dragHover = r ? r.id : null; }
  function end(x, y, cancel) {
    clearTimeout(D.timer); D.pending = null;
    if (!D.active) return;
    var sku = D.sku, sl = cancel ? null : G.render.slotAtClient(x, y);
    D.active = false; if (D.ghost && D.ghost.parentNode) D.ghost.parentNode.removeChild(D.ghost); D.ghost = null; G.render.dragHover = null; document.body.classList.remove('dragging');
    D.suppress = true; setTimeout(function () { D.suppress = false; }, 350);
    if (sl) { var r = (G.skus[sku].type === 'ga' && sl.kind === 'bed') ? G.shelf.assignSet(sl.id, sku) : G.shelf.assign(sl.id, sku); res(r); P.refresh(true); S2.refresh(true); }
  }
  document.addEventListener('pointerdown', function (e) {
    var t = e.target.closest && e.target.closest('[data-drag]'); if (!t) return;
    D.sx = e.clientX; D.sy = e.clientY; D.pending = t.dataset.drag; D.pid = e.pointerId; D.touch = e.pointerType === 'touch';
    clearTimeout(D.timer); if (D.touch) D.timer = setTimeout(function () { if (D.pending) { start(D.pending, D.sx, D.sy); D.pending = null; if (navigator.vibrate) navigator.vibrate(15); } }, 250);
  });
  document.addEventListener('pointermove', function (e) {
    if (D.active) { move(e.clientX, e.clientY); return; }
    if (D.pending) { var dx = e.clientX - D.sx, dy = e.clientY - D.sy; if (Math.sqrt(dx * dx + dy * dy) > 8) { if (D.touch) { clearTimeout(D.timer); D.pending = null; } else { start(D.pending, e.clientX, e.clientY); D.pending = null; } } }
  });
  document.addEventListener('pointerup', function (e) { clearTimeout(D.timer); D.pending = null; if (D.active) end(e.clientX, e.clientY, false); });
  document.addEventListener('pointercancel', function (e) { end(e.clientX, e.clientY, true); });
  document.addEventListener('touchmove', function (e) { if (D.active) e.preventDefault(); }, { passive: false });
  document.addEventListener('click', function (e) { if (D.suppress) { e.stopPropagation(); e.preventDefault(); } }, true);

  // ---- nối sự kiện cho sheet2 ----
  function init() {
    $('sheet2-x').onclick = S2.close;
    var b = $('sheet2-body');
    b.addEventListener('click', function (e) { var el = e.target.closest('[data-act]'); if (!el || el.disabled) return; var f = A[el.dataset.act] || P.act[el.dataset.act]; if (f) { f(el, e); P.refresh(true); S2.refresh(true); } });
    b.addEventListener('change', function (e) { var el = e.target.closest('[data-chg]'); if (!el) return; var f = C[el.dataset.chg] || P.chg[el.dataset.chg]; if (f) { f(el, e); P.refresh(true); S2.refresh(true); } });
    G.on('uiRefresh', function () { S2.refresh(false); });
  }
  UI.initShelf = init;
})();
