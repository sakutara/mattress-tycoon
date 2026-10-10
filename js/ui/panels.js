/* Khung panel tab + tab Nhập hàng / Kho & Kệ / Giá. Các tab khác ở panels2.js. Pass sau đăng ký tab qua G.ui.panels.register(). */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt;
  var UI = G.ui = G.ui || {};
  UI.st = { buyBrand: '', buyType: '', staffSub: 'list', selSku: null, act: { qty: 10, from: 'st', to: '' }, priceBrand: '', tr: { staff: '', course: '', form: 'internal', brand: '' }, auto: { sku: '', min: 10, qty: 20 }, repSub: 'days', open: {}, wh: { loc: 'st', brand: '', type: '', status: '', q: '', sort: 'qty' } };
  var P = UI.panels = {
    tabs: [], active: 'buy', last: '', pressed: false, act: {}, chg: {},
    register: function (def) {
      for (var i = 0; i < P.tabs.length; i++) if (P.tabs[i].id === def.id) { P.tabs[i] = def; return; }
      var at = def.after ? P.tabs.map(function (t) { return t.id; }).indexOf(def.after) : -1;
      if (at >= 0) P.tabs.splice(at + 1, 0, def); else P.tabs.push(def);
    },
    init: function () {
      var body = document.getElementById('tab-body');
      body.addEventListener('click', function (e) {
        var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
        var f = P.act[el.dataset.act] || (UI.shelf && UI.shelf.acts[el.dataset.act]); if (f) { f(el, e); P.refresh(true); if (UI.sheet2) UI.sheet2.refresh(true); }
      });
      body.addEventListener('change', function (e) {
        var el = e.target.closest('[data-chg]'); if (!el) return;
        var f = P.chg[el.dataset.chg] || (UI.shelf && UI.shelf.chg[el.dataset.chg]); if (f) { f(el, e); P.refresh(true); }
      });
      body.addEventListener('pointerdown', function () { P.pressed = true; });
      document.addEventListener('pointerup', function () { setTimeout(function () { P.pressed = false; }, 50); });
      P.buildNav(true);
      G.on('uiRefresh', function () { P.tick = (P.tick || 0) + 1; if (P.tick % 4 === 0) P.refresh(false); });
      P.refresh(true);
    },
    buildNav: function () {
      var nav = document.getElementById('tabs');
      nav.innerHTML = P.tabs.map(function (t) { return '<button data-tab="' + t.id + '" class="' + (t.id === P.active ? 'on' : '') + '">' + E(t.label) + '<span class="tbadge" data-badge="' + t.id + '"></span></button>'; }).join('');
      nav.onclick = function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; P.active = b.dataset.tab; P.buildNav(); P.refresh(true); };
    },
    refresh: function (force) {
      var body = document.getElementById('tab-body'); if (!body || !G.state) return;
      var ae = document.activeElement;
      if (!force && ((ae && body.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) || P.pressed)) return;
      var tab = P.tabs.filter(function (t) { return t.id === P.active; })[0]; if (!tab) return;
      var html;
      try { html = tab.render(); } catch (e) { console.error(e); html = '<p class="neg">Lỗi hiển thị tab: ' + E(e.message) + '</p>'; }
      if (html !== P.last || force) {
        var top = body.scrollTop, aeId = ae && ae.dataset ? (ae.dataset.chg || '') + '|' + (ae.dataset.sku || ae.dataset.id || '') : null;
        var ss = body.querySelector('.slot-strip'), sx = ss ? ss.scrollLeft : 0;
        body.innerHTML = html; P.last = html; body.scrollTop = top;
        if (sx) { ss = body.querySelector('.slot-strip'); if (ss) ss.scrollLeft = sx; }
        if (force && aeId && aeId !== '|') { var n = body.querySelector('[data-chg="' + aeId.split('|')[0] + '"][data-sku="' + aeId.split('|')[1] + '"]'); /* giữ nguyên, không focus lại */ }
      }
      P.tabs.forEach(function (t) {
        if (!t.badge) return; var el = document.querySelector('[data-badge="' + t.id + '"]'); if (el) { var n = t.badge(); el.textContent = n ? n : ''; el.style.display = n ? 'inline-block' : 'none'; }
      });
    }
  };
  UI.refresh = function () { P.refresh(true); };
  function res(r) { if (!r) return; if (r.msg) G.notify.toast(E(r.msg), r.ok ? 'good' : 'warn'); }
  UI.res = res;
  // ---- ô hàng dạng ảnh dùng chung (thumbnail + huy hiệu SL + tên ngắn + cỡ + chip loại) ----
  UI.gradeChip = function (k) { k = typeof k === 'string' ? G.skus[k] : k; return k && k.grade ? '<span class="gchip g' + k.grade + '">Loại ' + k.grade + '</span>' : ''; };
  UI.skuShort = function (k) { k = typeof k === 'string' ? G.skus[k] : k; var br = G.brandById[k.brand], ln = G.lines[k.line]; return (br.noBrand && !br.own ? '' : br.short + ' ') + (ln ? (k.cw ? ln.baseName : ln.name) : k.name); };
  UI.swatch = function (k) { k = typeof k === 'string' ? G.skus[k] : k; return k && k.cw ? '<span class="swt" style="background:' + k.cw.hex + ';border-color:' + k.cw.hex2 + '"></span>' : ''; };
  // it: {sku, qty, sub (dòng phụ), cls}
  UI.itemTile = function (it) {
    var k = G.skus[it.sku]; if (!k) return '';
    var sz = k.size === 'Tiêu chuẩn' ? '' : k.size;
    return '<div class="itile' + (it.cls ? ' ' + it.cls : '') + '" title="' + E(k.label) + '"><div class="ithumb"><img width="56" height="56" alt="" src="' + G.sprites.skuThumb(it.sku, 56) + '">' + (it.qty != null ? '<b class="iq">×' + it.qty + '</b>' : '') + (it.defect ? '<i class="idf">lỗi</i>' : '') + '</div><div class="inm">' + E(UI.skuShort(k)) + '</div><div class="isz">' + UI.swatch(k) + (k.cw ? '<b>' + E(k.cw.code) + '</b> ' : '') + (sz ? E(sz) + ' ' : '') + UI.gradeChip(k) + '</div>' + (it.sub ? '<div class="isb">' + it.sub + '</div>' : '') + '</div>';
  };
  UI.itemGrid = function (list) { return '<div class="igrid">' + list.map(UI.itemTile).join('') + '</div>'; };
  function bar(p, cls) { return '<div class="bar ' + (cls || '') + '"><i style="width:' + Math.round(G.clamp(p, 0, 1) * 100) + '%"></i></div>'; }
  UI.bar = bar;
  function opts(list, cur) { return list.map(function (o) { return '<option value="' + E(o[0]) + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + E(o[1]) + '</option>'; }).join(''); }
  UI.opts = opts;
  function stg(sku) { return G.life.badge(G.life.stage(sku)); }

  // ======================= NHẬP HÀNG =======================
  function buyTab() {
    var s = G.state, c = s.cart, st = UI.st, PU = G.purchasing, W = G.wh;
    if (!G.srcById[c.source] || !PU.srcOpen(G.srcById[c.source])) c.source = 'daily';
    if (c.dest !== 'st' && !s.whRent[c.dest]) c.dest = 'st';
    var src = G.srcById[c.source];
    var okSkus = G.skuList.filter(function (k) { return PU.skuOk(c.source, k.id); });
    var brandSet = {}; okSkus.forEach(function (k) { brandSet[k.brand] = 1; });
    var brands = G.data.brands.filter(function (b) { return brandSet[b.id]; });
    if (!brandSet[st.buyBrand] && brands.length) st.buyBrand = brands[0].id;
    var q = PU.cartTotals();
    var open = UI.st.open;
    function more(key, title, body, dflt) { var on = open[key] === undefined ? !!dflt : open[key]; return '<div class="buy-more"><div class="sum" data-act="buyMore" data-k="' + key + '" style="padding:12px;min-height:44px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer"><span>' + title + '</span><span>' + (on ? '▴' : '▾') + '</span></div>' + (on ? '<div class="buy-more-body">' + body + '</div>' : '') + '</div>'; }
    // --- header dính: nguồn + bộ lọc ---
    var h = '<div class="buy-wrap"><div class="buy-head"><div class="srcs">' + G.data.sources.filter(function (x) { return PU.srcOpen(x) || G.unlock.showAll('src'); }).map(function (x) {
      var o = PU.srcOpen(x);
      return '<button class="chip ' + (x.id === c.source ? 'on' : '') + '" data-act="src" data-id="' + x.id + '"' + (o ? '' : ' disabled') + '>' + E(x.name) + (o ? '' : ' 🔒 cấp ' + (x.minLevel + 1)) + '</button>';
    }).join('') + '</div>';
    h += '<div class="buy-filters"><select data-chg="buyBrand">' + opts(brands.map(function (b) { return [b.id, b.name + ' (' + b.seg + ')' + (((s.rel[b.id] || 0) >= 1) ? ' · TT ' + Math.round(s.rel[b.id]) : '')]; }), st.buyBrand) + '</select>' +
      (st.buyBrand === 'cho' ? '<select data-chg="buyGrade">' + opts([['', 'Mọi loại hàng'], ['1', 'Loại 1 (tốt)'], ['2', 'Loại 2 (rẻ)']], st.buyGrade || '') + '</select>' : '') + '<select data-chg="buyType">' + opts([['', 'Mọi loại']].concat(G.data.typeOrder.map(function (t) { return [t, G.data.types[t].name]; })), st.buyType) + '</select></div>' +
      '<p class="buy-note muted">' + E(src.desc) + ' Lỗi ~' + Math.round(src.defect * 100) + '%.' + (src.moq ? ' MOQ ≥' + src.moq + '/SKU.' : '') + ' CK SL: ≥10: 3% · ≥50: 7% · ≥100: 12%.</p></div>';
    // --- gợi ý / Thủ kho ---
    var hint = (UI.autobuyHtml ? UI.autobuyHtml() : '') + (UI.sugHtml ? UI.sugHtml() : '');
    var nHint = (G.suggest ? G.suggest.count() : 0) + (G.autobuy ? G.autobuy.unreviewed() : 0);
    if (hint) h += more('hint', '💡 Gợi ý nhập hàng' + (nHint ? ' (' + nHint + ')' : ''), hint, false);
    // --- danh sách sản phẩm dạng thẻ ---
    var rows = okSkus.filter(function (k) { return k.brand === st.buyBrand && (!st.buyType || k.type === st.buyType) && (!st.buyGrade || st.buyBrand !== 'cho' || String(k.grade) === st.buyGrade); });
    rows.sort(function (a, b) { return G.data.typeOrder.indexOf(a.type) - G.data.typeOrder.indexOf(b.type) || a.line.localeCompare(b.line) || a.list - b.list; });
    h += '<div class="buy-list" style="margin-top:8px">';
    rows.forEach(function (k) {
      var n = PU.cartQty(c.source, k.id), mm = PU.modMult(k.id);
      h += '<div class="buy-item' + (n ? ' sel' : '') + '"><img alt="" src="' + G.sprites.skuThumb(k.id, 56) + '"><div class="buy-info"><b>' + E(UI.skuShort(k)) + '</b> ' + E(k.size === 'Tiêu chuẩn' ? '' : k.size) + ' ' + UI.gradeChip(k) + '<br>' + stg(k.id) + (mm !== 1 ? ' <span class="chipx ' + (mm > 1 ? 'neg' : 'pos') + '">' + (mm > 1 ? '▲' : '▼') + '</span>' : '') +
        '<br><span class="muted">Tồn ' + W.total(k.id) + (W.incomingQty(k.id) ? ' (+' + W.incomingQty(k.id) + ')' : '') + '</span> · <span class="buy-price">' + F.vnd(PU.unit(c.source, k.id, q.tier)) + '</span></div>' +
        '<div class="buy-qty"><div class="buy-step"><button data-act="cartStep" data-sku="' + E(k.id) + '" data-n="-1"' + (n ? '' : ' disabled') + ' aria-label="Giảm">−</button><input type="number" min="0" step="1" class="qty" data-chg="cartQty" data-sku="' + E(k.id) + '" value="' + (n || '') + '" placeholder="0"><button class="plus" data-act="cartStep" data-sku="' + E(k.id) + '" data-n="1" aria-label="Tăng">+</button></div><button class="mini" data-act="cartAdd" data-sku="' + E(k.id) + '" data-n="10">+10</button>' + (n ? '<button class="mini cart-del" data-act="cartDel" data-sku="' + E(k.id) + '" aria-label="Xóa khỏi giỏ">🗑 Xóa</button>' : '') + '</div></div>';
    });
    if (!rows.length) h += '<p class="muted">Không có sản phẩm phù hợp.</p>';
    h += '</div>';
    h += G.unlock.teaser('src', G.data.sources.some(function (x) { return !PU.srcOpen(x); })) + G.unlock.teaser('brand', false);
    // --- phần phụ (thu gọn) ---
    var active = s.orders.slice().reverse(), ob = '';
    if (!active.length) ob = '<p class="muted small">Chưa có đơn nào.</p>';
    else ob = '<table class="tbl small">' + active.slice(0, 10).map(function (o) {
      var n = 0; Object.keys(o.items).forEach(function (k) { n += o.items[k]; });
      return '<tr><td>#' + o.id + ' · ' + E(G.srcById[o.source].name) + '<br><span class="muted">' + n + ' sp → ' + E(W.locName(o.dest)) + (o.express ? ' · ⚡ lấy ngay' : '') + (o.credit ? ' · chịu' : '') + (o.delayed ? ' · trễ' : '') + '</span></td><td><span class="chipx st-' + (o.status === 'Đã về kho' ? 'ok' : o.status === 'Đang vận chuyển' ? 'go' : 'wait') + '">' + o.status + '</span><br><span class="muted">' + (o.status === 'Đã về kho' ? 'ngày ' + o.arriveDay : o.arriveDay === s.day && (o.express || o.source === 'cho') ? 'dự kiến ' + G.cal.hm(o.arriveMin) + ' hôm nay' : 'dự kiến ngày ' + o.arriveDay) + '</span></td></tr>';
    }).join('') + '</table>';
    if (s.payables.length) ob += '<p class="small">Công nợ NCC: ' + s.payables.map(function (p) { return p.label + ' ' + F.short(p.amount) + ' (hạn ngày ' + p.due + ')'; }).join(' · ') + '</p>';
    h += more('orders', '📦 Đơn nhập (' + active.length + ')', ob, false);
    h += more('rels', '🤝 Quan hệ nhà cung cấp', '<div class="rels">' + G.data.brands.filter(function (b) { return !b.noBrand && G.brandAvail(b.id); }).map(function (b) {
      var r = s.rel[b.id] || 0;
      return '<div class="rel"><span>' + E(b.short) + (s.brandCut[b.id] ? ' ⚠' : '') + '</span>' + bar(r / 100, r >= 50 ? 'good' : '') + '<span class="muted small">' + Math.round(r) + '</span></div>';
    }).join('') + '</div><p class="muted small">≥25: chiết khấu riêng 2% · ≥50: 4%, mua chịu 30 ngày, báo tin mẫu mới sớm, thưởng quý · ≥75: 6%. ≥60: trả hàng tồn cho NCC.</p>', false);
    var hasHelper = G.staff.count('accountant') > 0 || G.staff.count('warehouse') > 0, ab;
    if (!hasHelper) ab = '<p class="muted small">🔒 Thuê Kế toán hoặc Thủ kho để mở tự động đặt hàng.</p>';
    else {
      ab = '<p class="muted small">Mỗi đầu ngày, nếu tồn (kho+kệ+đang về) dưới ngưỡng, hệ thống đặt từ Đại lý cấp 1 / Chợ / OEM về kho cửa hàng.</p>';
      var ao = Object.keys(s.autoOrder);
      ab += '<table class="tbl small">' + ao.map(function (k) { var a = s.autoOrder[k]; return '<tr><td>' + E(G.skus[k].label) + '</td><td>dưới ' + a.min + ' → đặt ' + a.qty + '</td><td><button class="mini" data-act="autoDel" data-sku="' + E(k) + '">xóa</button></td></tr>'; }).join('') + '</table>';
      var all = G.skuList.filter(function (k) { return G.brandAvail(k.brand) && G.life.stage(k.id) < 3; }).map(function (k) { return [k.id, k.label]; });
      ab += '<div class="row"><select data-chg="autoSku">' + opts([['', '— chọn sản phẩm —']].concat(all), st.auto.sku) + '</select><input type="number" class="qty" data-chg="autoMin" value="' + st.auto.min + '" title="ngưỡng"><input type="number" class="qty" data-chg="autoQty" value="' + st.auto.qty + '" title="số lượng đặt"><button class="btn" data-act="autoAdd">Thêm</button></div>';
    }
    h += more('auto', '⚙ Tự động đặt hàng', ab, false);
    h += '</div>';
    return h;
  }
  P.act.src = function (el) { G.state.cart.source = el.dataset.id; };   // chỉ đổi nguồn đang xem, giỏ giữ nguyên
  P.chg.buyGrade = function (el) { UI.st.buyGrade = el.value; };
  P.chg.buyBrand = function (el) { UI.st.buyBrand = el.value; };
  P.chg.buyType = function (el) { UI.st.buyType = el.value; };
  P.chg.cartQty = function (el) { G.purchasing.cartSet(G.state.cart.source, el.dataset.sku, +el.value); };
  P.act.cartAdd = function (el) { G.purchasing.cartAdd(G.state.cart.source, el.dataset.sku, +el.dataset.n || 10); };
  P.act.cartStep = function (el) { G.purchasing.cartAdd(G.state.cart.source, el.dataset.sku, +el.dataset.n || 0); };
  P.act.cartDel = function (el) { G.purchasing.cartDel(G.state.cart.source, el.dataset.sku); };
  P.chg.cartLineQty = function (el) { G.purchasing.cartSet(el.dataset.src, el.dataset.sku, +el.value); };
  P.act.cartLineStep = function (el) { G.purchasing.cartAdd(el.dataset.src, el.dataset.sku, +el.dataset.n || 0); };
  P.act.cartLineDel = function (el) { G.purchasing.cartDel(el.dataset.src, el.dataset.sku); };
  P.chg.cartCreditSrc = function (el) { G.purchasing.cartOpt(el.dataset.src).credit = el.checked; };
  P.chg.cartExpSrc = function (el) { G.purchasing.cartOpt(el.dataset.src).express = el.checked; };
  P.act.cartPlaceSrc = function (el) { res(G.purchasing.cartPlace(el.dataset.src)); };
  P.act.cartClearSrc = function (el) { G.purchasing.cartClear(el.dataset.src); };
  P.act.cartPlaceAll = function () {
    var PU = G.purchasing, ok = 0, fail = [];
    PU.cartSrcs().forEach(function (src) { var r = PU.cartPlace(src); if (r.ok) ok++; else fail.push(G.srcById[src].name + ': ' + r.msg); });
    G.suggest && G.suggest.invalidate();
    res({ ok: ok > 0, msg: ok ? 'Đã đặt ' + ok + ' đơn hàng' + (fail.length ? ' (chưa đặt: ' + fail[0] + ')' : '') : (fail[0] || 'Giỏ trống') });
  };
  P.act.buyMore = function (el) { var o = UI.st.open, k = el.dataset.k, cur = o[k]; o[k] = !cur; };
  P.chg.cartDest = function (el) { G.state.cart.dest = el.value; };
  P.act.clearCart = function () { G.purchasing.cartClear(); };
  P.act.reorder = function () { G.purchasing.reorderLast(); };
  P.chg.autoSku = function (el) { UI.st.auto.sku = el.value; };
  P.chg.autoMin = function (el) { UI.st.auto.min = Math.max(0, +el.value || 0); };
  P.chg.autoQty = function (el) { UI.st.auto.qty = Math.max(1, +el.value || 1); };
  P.act.autoAdd = function () { var a = UI.st.auto; if (!a.sku) return; G.state.autoOrder[a.sku] = { min: a.min, qty: a.qty }; };
  P.act.autoDel = function (el) { delete G.state.autoOrder[el.dataset.sku]; };

  // ======================= KHO & KỆ =======================
  function stockTab() {
    var s = G.state, W = G.wh, st = UI.st, ord = G.shelf.ordinals(), h = '';
    h += '<h4>Sức chứa</h4>';
    var locs = W.locs();
    locs.forEach(function (loc) {
      var cap = W.cap(loc), used = W.used(loc), inc = W.incoming(loc);
      h += '<div class="rel"><span>' + E(W.locName(loc)) + '</span>' + bar(used / cap, used / cap > 0.9 ? 'bad' : '') + '<span class="muted small">' + Math.round(used) + '/' + cap + (inc ? ' (+' + Math.round(inc) + ' đang về)' : '') + '</span></div>';
    });
    h += '<p class="muted small">Đơn vị khối lượng: đệm 6 · chăn/topper 2 · ga/gối 1 · phụ kiện 0,5.</p>';
    h += '<div class="row"><button class="btn" data-act="whUp">Mở rộng kho CH (+30%) · ' + F.short(W.upgradeCost()) + ' <span class="muted">(' + s.whUpgrades + '/' + G.lvl().whUpMax + ')</span></button></div>';
    h += '<details class="det" data-key="whrent"' + (st.open.whrent ? ' open' : '') + '><summary>Thuê kho ngoài</summary>';
    G.data.warehouses.forEach(function (w) {
      var have = !!s.whRent[w.id], locked = s.level < w.minLevel; if (locked && !G.unlock.showAll('wh')) return;
      h += '<div class="card small"><b>' + E(w.name) + '</b> · sức chứa ' + w.cap + ' · thuê ' + F.short(w.rent) + '/tháng · cọc ' + F.short(w.deposit) + ' · cách ' + w.dist + 'km<br><span class="muted">' + E(w.desc) + ' Phí chuyển ≈ ' + F.short(W.transportCost('st', w.id, W.TRIP_VOL)) + ' / chuyến (60 đơn vị).</span><br>' +
        (have ? '<button class="mini" data-act="whCancel" data-id="' + w.id + '">Trả kho (nhận lại cọc)</button>' : '<button class="mini" data-act="whRent" data-id="' + w.id + '"' + (locked ? ' disabled' : '') + '>' + (locked ? '🔒 cấp ' + (w.minLevel + 1) : 'Thuê') + '</button>') + '</div>';
    });
    h += G.unlock.teaser('wh', G.data.warehouses.some(function (w) { return s.level < w.minLevel; })) + '</details>';
    // ---- LƯỚI TỒN KHO ----
    var wf = st.wh, tabs = [['st', 'Kho cửa hàng']].concat(Object.keys(s.whRent).map(function (id) { return [id, G.whById[id].name.replace(/ \(.*\)/, '')]; })).concat([['shelf', 'Mẫu trưng bày'], ['incoming', 'Đang về']]);
    if (!tabs.some(function (t) { return t[0] === wf.loc; })) wf.loc = 'st';
    h += '<h4>Tồn kho</h4><div class="srcs">' + tabs.map(function (t) { return '<button class="chip' + (wf.loc === t[0] ? ' on' : '') + '" data-act="whLoc" data-id="' + t[0] + '">' + E(t[1]) + '</button>'; }).join('') + '</div>';
    var brandsAll = G.data.brands.filter(function (b) { return G.skuList.some(function (k) { return k.brand === b.id; }); });
    h += '<div class="row wfil"><select data-chg="whBrand">' + opts([['', 'Mọi hãng']].concat(brandsAll.map(function (b) { return [b.id, b.short]; })), wf.brand) + '</select><select data-chg="whType">' + opts([['', 'Mọi loại']].concat(G.data.typeOrder.map(function (t) { return [t, G.data.types[t].name]; })), wf.type) + '</select>' +
      '<select data-chg="whStatus">' + opts([['', 'Mọi trạng thái'], ['out', '🔴 Hết / sắp hết'], ['low', '🟡 Thấp'], ['ok', '🟢 Đủ'], ['old', '⚪ Lỗi thời / tồn lâu'], ['inc', '🔵 Đang về']], wf.status) + '</select>' +
      '<select data-chg="whSort">' + opts([['qty', 'Số lượng ↓'], ['qtyUp', 'Số lượng ↑'], ['name', 'Tên'], ['age', 'Tồn lâu nhất']], wf.sort) + '</select><input type="text" class="wsearch" placeholder="Tìm..." data-chg="whQ" value="' + E(wf.q) + '"></div>';
    var tiles = whTiles(wf);
    if (!tiles.length) h += '<p class="muted small">Không có mặt hàng nào phù hợp.</p>';
    else h += '<div class="wgrid">' + tiles.map(function (t) {
      var k = G.skus[t.sku], line = G.lines[k.line];
      return '<button class="wtile s-' + t.status + (st.selSku === t.sku ? ' sel' : '') + '" data-act="selSku" data-sku="' + E(t.sku) + '" data-drag="' + E(t.sku) + '" title="' + E(k.label) + '"><img class="wimg" alt="" src="' + G.sprites.skuThumb(t.sku, 56) + '"><b class="wq">' + t.qty + '</b><span class="wn">' + E(line.name + (k.size === 'Tiêu chuẩn' ? '' : ' · ' + k.size)) + '</span><span class="wb">' + (k.grade ? UI.gradeChip(k) : E(G.brandName(k.brand))) + (t.note ? ' · ' + E(t.note) : '') + '</span></button>';
    }).join('') + '</div><div class="wlegend small muted"><i class="s-out"></i>hết/sắp hết <i class="s-low"></i>thấp <i class="s-ok"></i>đủ <i class="s-old"></i>lỗi thời/tồn lâu <i class="s-inc"></i>đang về</div>';
    // kệ: dải ô ngang + chọn mẫu ngay tại tab
    var SHu = UI.shelf, sh = '';
    if (!s.slots.some(function (x) { return x.id === SHu.cur; })) SHu.cur = s.slots.length ? s.slots[0].id : null;
    sh += '<details class="det" data-key="slots"' + (st.open.slots !== false ? ' open' : '') + '><summary>Mẫu trưng bày: chọn ô rồi đổi mẫu</summary><div class="row"><button class="btn primary" data-act="autoArrange">⚡ Tự trưng bày mẫu</button><span class="muted small">Mỗi ô 1 mẫu; bán từ kho.</span></div>';
    sh += '<div class="slot-strip" id="slot-strip">';
    s.slots.forEach(function (sl) {
      var n = ord[sl.id], name = sl.kind === 'shelf' ? 'Kệ ' + (Math.floor(n / 3) + 1) + '.' + (n % 3 + 1) : 'Đệm ' + (n + 1), k = sl.sku && G.skus[sl.sku];
      sh += '<button class="slot-tile' + (sl.id === SHu.cur ? ' on' : '') + (k ? '' : ' empty') + '" data-act="slotSel" data-id="' + sl.id + '">' + (k ? '<img alt="" src="' + G.sprites.skuThumb(sl.sku, 56) + '" width="48" height="48">' : '<span class="st-plus">＋</span>') + '<b>' + name + '</b><small>' + (k ? E(UI.skuShort(k)) : 'Trống') + '</small></button>';
    });
    sh += '</div>';
    if (SHu.cur != null) sh += '<div class="slot-picker">' + SHu.render() + '</div>';
    sh += '</details>';
    h = sh + h;
    if (st.selSku && G.skus[st.selSku]) h = '<div class="popcard">' + skuDetail(st.selSku) + '</div>' + h;
    return h;
  }
  // dữ liệu ô lưới theo vị trí + bộ lọc
  function whTiles(wf) {
    var s = G.state, W = G.wh, out = [], loc = wf.loc, map = {};
    function vel(k) { var a = s.sold7[k]; return a ? a.reduce(function (x, y) { return x + y; }, 0) / 7 : 0; }
    function add(k, qty, extra) { if (!G.skus[k]) return; var m = map[k] || (map[k] = { sku: k, qty: 0, note: '' }); m.qty += qty; if (extra) m.note = extra; }
    if (loc === 'incoming') {
      s.orders.forEach(function (o) { if (o.status !== 'Đã về kho') Object.keys(o.items).forEach(function (k) { add(k, o.items[k], 'ngày ' + o.arriveDay); }); });
      s.transfers.forEach(function (t) { add(t.sku, t.qty, 'ngày ' + t.arriveDay); });
    } else if (loc === 'shelf') { s.slots.forEach(function (sl) { if (sl.sku) add(sl.sku, 1, 'mẫu'); if (sl.set) add(sl.set, 1, 'mẫu bộ'); }); }
    else Object.keys(s.inv).forEach(function (k) { if (s.inv[k][loc] > 0) add(k, s.inv[k][loc]); });
    Object.keys(map).forEach(function (k) {
      var m = map[k], t = G.skus[k], total = W.total(k), v = vel(k), last = s.lastSold[k], stage = G.life.stage(k);
      var stale = total > 0 && !(v > 0) && (last ? s.day - last : s.day) > 20, dl = v > 0 ? total / v : 99, stt;
      if (loc === 'incoming') stt = 'inc'; else if (stage === 3 || stale) stt = 'old'; else if (total <= 0 || dl < 3) stt = 'out'; else if (dl < 7) stt = 'low'; else stt = 'ok';
      m.status = stt; m.age = last ? s.day - last : (total > 0 ? s.day : 0); m.name = t.label;
      if (wf.brand && t.brand !== wf.brand) return; if (wf.type && t.type !== wf.type) return; if (wf.status && stt !== wf.status) return;
      if (wf.q && t.label.toLowerCase().indexOf(wf.q.toLowerCase()) < 0) return;
      out.push(m);
    });
    out.sort(function (a, b) { return wf.sort === 'qtyUp' ? a.qty - b.qty : wf.sort === 'name' ? a.name.localeCompare(b.name) : wf.sort === 'age' ? b.age - a.age : b.qty - a.qty; });
    return out;
  }
  function skuDetail(k) {
    var s = G.state, t = G.skus[k], W = G.wh, a = UI.st.act, CO = G.clearanceOps;
    var locs = W.locs();
    if (!a.to || locs.indexOf(a.to) < 0) a.to = locs[1] || 'st';
    if (locs.indexOf(a.from) < 0) a.from = 'st';
    var fl = G.pricing.floor(k), eff = G.pricing.effective(k), stage = G.life.stage(k);
    var h = '<div class="card"><div class="dcard"><img class="dthumb" width="56" height="56" alt="" src="' + G.sprites.skuThumb(k, 56) + '"><div class="dinfo"><b>' + E(t.label) + '</b> ' + stg(k) + ' <button class="mini" data-act="whClose">✕ Đóng</button></div></div>' + '<br><span class="small">Giá vốn bq ' + F.vnd(s.costBasis[k] || t.cost) + ' · niêm yết ' + F.vnd(t.list) + ' · giá bán hiện tại <b>' + F.vnd(eff) + '</b>' + (fl ? ' · sàn ' + F.vnd(fl) : '') + '</span>';
    if (stage >= 2) h += '<p class="warn small">Mẫu ' + G.life.name(stage).toLowerCase() + ': khách chỉ trả ~' + Math.round(G.life.ACCEPT[stage] * 100) + '% giá. Nên xả hàng sớm.</p>';
    h += '<div class="row"><button class="btn" data-act="quickPlace" data-sku="' + E(k) + '">Trưng bày làm mẫu</button></div>';
    h += '<div class="small"><b>Giảm giá tại cửa hàng:</b> ' + [0, 0.1, 0.2, 0.3, 0.4].map(function (p) {
      var ef = Math.round(G.pricing.base(k) * (1 - p) / 1000) * 1000, below = G.pricing.isBelowFloor(k, ef);
      return '<button class="mini ' + ((s.clearance[k] || 0) === p ? 'on' : '') + '" data-act="clr" data-sku="' + E(k) + '" data-p="' + p + '">' + (p ? '-' + p * 100 + '%' : 'Không') + (below ? ' ⚠' : '') + '</button>';
    }).join('') + '</div>';
    if (fl && G.pricing.isBelowFloor(k, eff)) h += '<p class="neg small">⚠ Giá đang dưới giá sàn của hãng - có xác suất bị hãng phát hiện: cảnh cáo → cắt chiết khấu → rút quyền đại lý.</p>';
    h += '<div class="row small"><label>Số lượng <input type="number" class="qty" min="1" data-chg="actQty" value="' + a.qty + '"></label>' +
      '<button class="mini" data-act="wholesale" data-sku="' + E(k) + '">Bán sỉ đầu nậu (' + F.short(CO.wholesaleUnit(k)) + '/cái)</button>' +
      '<button class="mini" data-act="gift" data-sku="' + E(k) + '">Tặng kèm combo</button>' +
      '<button class="mini" data-act="retSup" data-sku="' + E(k) + '"' + (CO.returnOk(k) ? '' : ' disabled title="Cần QH NCC ≥ 60"') + '>Trả NCC</button></div>';
    if (locs.length > 1) {
      var vol = a.qty * t.vol;
      h += '<div class="row small">Chuyển <select data-chg="xFrom">' + opts(locs.map(function (l) { return [l, W.locName(l) + ' (' + W.get(k, l) + ')']; }), a.from) + '</select> → <select data-chg="xTo">' + opts(locs.map(function (l) { return [l, W.locName(l)]; }), a.to) + '</select> <button class="mini" data-act="xfer" data-sku="' + E(k) + '">Chuyển ' + a.qty + ' (phí ' + F.short(W.transportCost(a.from, a.to, vol)) + (W.isFar(a.from, a.to) ? ', mất 1 ngày' : '') + ')</button></div>';
    }
    var sg = G.suggest.compute().rows.filter(function (r) { return r.sku === k && r.action === 'order'; })[0];
    if (sg) h += '<div class="small" style="margin-top:6px"><b>Gợi ý nhập:</b> ' + sg.chosen.qty + ' từ ' + E(sg.chosen.name) + ' (' + F.short(sg.chosen.cash) + ') <button class="mini primary" data-act="sugOrder" data-key="' + E(sg.key) + '"' + (sg.afford ? '' : ' disabled') + '>Đặt theo gợi ý</button></div>';
    else h += '<div class="small" style="margin-top:6px"><button class="mini" data-act="whCart" data-sku="' + E(k) + '">Thêm vào giỏ nhập (+20)</button></div>';
    return h + '</div>';
  }
  P.act.whLoc = function (el) { UI.st.wh.loc = el.dataset.id; };
  P.chg.whBrand = function (el) { UI.st.wh.brand = el.value; };
  P.chg.whType = function (el) { UI.st.wh.type = el.value; };
  P.chg.whStatus = function (el) { UI.st.wh.status = el.value; };
  P.chg.whSort = function (el) { UI.st.wh.sort = el.value; };
  P.chg.whQ = function (el) { UI.st.wh.q = el.value; };
  P.act.whClose = function () { UI.st.selSku = null; };
  P.act.whCart = function (el) { var k = el.dataset.sku, t = G.skus[k], c = G.state.cart, src = t.brand === 'cho' ? 'cho' : t.brand === 'own' ? 'oem' : 'daily'; G.purchasing.cartAdd(src, k, 20); c.source = src; UI.st.buyBrand = t.brand; P.active = 'buy'; P.buildNav(); G.notify.toast('Đã thêm vào giỏ nhập', 'good'); };
  P.act.whUp = function () { res(G.wh.upgrade()); };
  P.act.whRent = function (el) { res(G.wh.rent(el.dataset.id)); };
  P.act.whCancel = function (el) { res(G.wh.cancel(el.dataset.id)); };
  P.act.slotSel = function (el) { UI.shelf.cur = +el.dataset.id; UI.shelf.target = 'main'; };
  P.act.slotOpen = function (el) { if (UI.shelf) UI.shelf.open(+el.dataset.id); };
  P.act.autoArrange = function () { var n = G.shelf.autoArrange(); res({ ok: true, msg: n ? 'Đã trưng bày ' + n + ' mẫu' : 'Không còn mẫu mới để trưng bày' }); };
  P.chg.slotSku = function (el) { res(G.shelf.assign(+el.dataset.id, el.value || null)); };
  P.act.slotFill = function (el) { var sl = G.state.slots.filter(function (x) { return x.id === +el.dataset.id; })[0]; var n = G.shelf.fill(sl); res({ ok: n > 0, msg: n ? 'Đã nạp ' + n : 'Kho cửa hàng hết hàng này' }); };
  P.act.slotClear = function (el) { var sl = G.state.slots.filter(function (x) { return x.id === +el.dataset.id; })[0]; if (!G.shelf.clear(sl)) res({ ok: false, msg: 'Kho cửa hàng không đủ chỗ nhận lại' }); };
  P.act.selSku = function (el) { UI.st.selSku = el.dataset.sku; };
  P.act.quickPlace = function (el) { res(G.shelf.quickPlace(el.dataset.sku)); };
  P.act.clr = function (el) { G.state.clearance[el.dataset.sku] = +el.dataset.p; };
  P.chg.actQty = function (el) { UI.st.act.qty = Math.max(1, Math.floor(+el.value || 1)); };
  P.chg.xFrom = function (el) { UI.st.act.from = el.value; };
  P.chg.xTo = function (el) { UI.st.act.to = el.value; };
  P.act.wholesale = function (el) { res(G.clearanceOps.wholesale(el.dataset.sku, UI.st.act.qty)); };
  P.act.gift = function (el) { res(G.clearanceOps.gift(el.dataset.sku, UI.st.act.qty)); };
  P.act.retSup = function (el) { res(G.clearanceOps.returnSup(el.dataset.sku, UI.st.act.qty)); };
  P.act.xfer = function (el) { var a = UI.st.act; res(G.wh.transfer(el.dataset.sku, a.qty, a.from, a.to)); };
  document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.dataset && d.dataset.key) UI.st.open[d.dataset.key] = d.open; }, true);

  // ======================= GIÁ =======================
  function priceTab() {
    var s = G.state, st = UI.st;
    var brands = G.data.brands.filter(function (b) { return G.brandAvail(b.id); });
    if (!brands.some(function (b) { return b.id === st.priceBrand; })) st.priceBrand = brands[0].id;
    var h = '<p class="muted small">Mỗi hãng có <b>giá sàn</b> (tối thiểu so với niêm yết). Đặt dưới sàn sẽ bị chặn. Hàng phổ thông / thương hiệu riêng không có giá sàn. Giá tối đa 160% niêm yết.</p>';
    h += '<div class="row"><select data-chg="priceBrand">' + opts(brands.map(function (b) { return [b.id, b.name + (b.floor ? ' · sàn ' + Math.round(b.floor * 100) + '%' : '')]; }), st.priceBrand) + '</select></div>';
    if (s.violations[st.priceBrand]) h += '<p class="neg small">Vi phạm giá sàn với hãng này: ' + s.violations[st.priceBrand] + ' lần.</p>';
    h += '<table class="tbl small"><tr><th>Sản phẩm</th><th class="r">Vốn</th><th class="r">Sàn</th><th>Giá bán</th></tr>';
    G.skuList.filter(function (k) { return k.brand === st.priceBrand; }).sort(function (a, b) { return a.line.localeCompare(b.line) || a.list - b.list; }).forEach(function (k) {
      var base = G.pricing.base(k.id), fl = G.pricing.floor(k.id), cost = s.costBasis[k.id] || k.cost, mg = (base - cost) / base;
      h += '<tr><td>' + E(k.label) + '<br>' + stg(k.id) + ' <span class="muted">niêm yết ' + F.short(k.list) + '</span></td><td class="r">' + F.short(cost) + '</td><td class="r">' + (fl ? F.short(fl) : '—') + '</td><td class="nw"><input type="number" class="price" step="1000" data-chg="price" data-sku="' + E(k.id) + '" value="' + base + '"><br><span class="small ' + (mg < 0.05 ? 'neg' : 'pos') + '">lãi ' + Math.round(mg * 100) + '%</span></td></tr>';
    });
    return h + '</table>';
  }
  P.chg.priceBrand = function (el) { UI.st.priceBrand = el.value; };
  P.chg.price = function (el) { res(G.pricing.setPrice(el.dataset.sku, +el.value)); };

  P.register({ id: 'cart', label: 'Giỏ hàng', after: 'buy', render: function () {
    var h = UI.sugCartHtml ? UI.sugCartHtml() : '';
    return h || '<div class="card empty"><p><b>Giỏ hàng trống</b></p><p class="muted small">Vào tab Nhập hàng → Gợi ý nhập hàng, bấm "Thêm vào giỏ hàng" để gom sản phẩm. Các sản phẩm cùng nguồn sẽ nằm chung 1 đơn.</p><button class="btn" data-act="goTab" data-id="buy">Về Nhập hàng</button></div>';
  }, badge: function () { return G.purchasing.cartAll().skus; } });
  P.register({ id: 'buy', label: 'Nhập hàng', render: buyTab, badge: function () { return G.suggest.count(); } });
  P.register({ id: 'stock', label: 'Kho & Kệ', render: stockTab });
  P.register({ id: 'price', label: 'Giá', render: priceTab });
})();
