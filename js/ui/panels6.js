/* Panel gợi ý nhập hàng (chèn vào tab Nhập hàng) + tab Livestream */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, opts = UI.opts, bar = UI.bar, res = UI.res, SG = G.suggest;
  UI.st.live = { platform: 'shopee', dayIn: 0, start: 19, dur: 2, hostKind: 'staff', hostId: '', kolId: '', crewId: '', f: ['', '', ''], combo: false, disc: 10, voucher: 0, vmin: 1000000, ad: 1000000 };

  // ======================= GỢI Ý NHẬP HÀNG =======================
  // ---- 1 thẻ gợi ý ----
  function sugCard(r, hp) {
    var h = '', c = r.chosen;
      h += '<div class="card small sugcard"><div class="irow">' + UI.itemTile({ sku: r.sku, qty: c.qty, sub: F.short(c.cash) }) + '<div style="min-width:0"><b>' + E(r.label) + '</b> ' + G.life.badge(r.stage) + ' ' + r.tags.map(function (t) { return '<span class="chipx ' + (t === 'Sắp hết' || t === 'Hết hàng' || t === 'Đơn đang mở' || t === 'Đơn cọc' || t === 'Khách hỏi hết hàng' ? 'neg' : t === 'Mẫu mới' ? 'st-go' : 'st-ok') + '">' + t + '</span>'; }).join(' ') + (r.edited ? ' <span class="chipx">đã sửa</span>' : '') + '</div></div>' +
        '<div class="muted">Tồn+đang về: <b>' + r.have + '</b>' + (hp && r.vel ? ' · bán ~' + r.vel.toFixed(1) + '/ngày · còn ~' + (r.daysLeft > 90 ? '∞' : r.daysLeft.toFixed(1)) + ' ngày' : '') + (r.commit ? ' · đơn mở cần ' + r.commit : '') + '</div>' +
        '<div class="row"><label>SL <input type="number" class="qty" min="1" data-chg="sugQty" data-key="' + E(r.key) + '" value="' + c.qty + '"></label>' +
        '<select data-chg="sugSrc" data-key="' + E(r.key) + '">' + r.opts.filter(function (o) { return o.usable && !o.locked; }).map(function (o) { return '<option value="' + o.src + '"' + (o.src === c.src ? ' selected' : '') + '>' + E(o.name) + (o.src === r.best.src ? ' ★ gợi ý' : '') + '</option>'; }).join('') + '</select></div>' +
        '<div>Đơn giá <b>' + F.vnd(c.unit) + '</b>' + (c.tier ? ' (CK SL ' + Math.round(c.tier * 100) + '%)' : '') + ' · tổng <b>' + F.vnd(c.cash) + '</b> · về sau ' + (c.lead[0] === c.lead[1] ? c.lead[0] : c.lead[0] + '-' + c.lead[1]) + ' ngày · hết hàng trước khi về: <b class="' + (c.risk === 'cao' ? 'neg' : c.risk === 'vừa' ? 'warn' : 'pos') + '">' + (c.risk || '—') + '</b></div>' +
        '<div class="muted">💡 ' + E(r.why) + '</div>' + r.warn.map(function (w) { return '<div class="' + (/Không đủ|dưới giá sàn|KHÔNG|noInvoice/.test(w) ? 'neg' : 'warn') + '">⚠ ' + E(w) + '</div>'; }).join('') +
        (r.xp ? '<div class="small' + (r.xp.urgent ? ' warn' : ' muted') + '">⚡ Lấy ngay (' + E(r.xp.name) + ', ' + r.xp.qty + ' sp, ' + E(r.xp.eta) + '): <b>' + F.vnd(r.xp.total) + '</b> thay vì ' + F.vnd(r.xp.normal) + ' (phí hỏa tốc +' + F.vnd(r.xp.fee) + ') · còn ' + r.xp.left + ' lượt</div>' : '') +
        '<div class="row">' + (SG.inCart(r) ? '<button class="mini" data-act="sugDismiss" data-key="' + E(r.key) + '">✓ Trong giỏ · bỏ</button>' : '<button class="mini primary" data-act="sugCartAdd" data-key="' + E(r.key) + '">🛒 Thêm vào giỏ hàng</button>') + (r.xp ? '<button class="mini' + (r.xp.urgent ? ' primary' : '') + '" data-act="sugExpress" data-key="' + E(r.key) + '"' + (r.xp.afford && r.xp.left ? '' : ' disabled') + '>⚡ Nhập lấy ngay</button>' : '') + (G.staff.count('warehouse') + G.staff.count('accountant') > 0 ? '<button class="mini" data-act="sugAuto" data-key="' + E(r.key) + '" title="Tự đặt khi tồn dưới ngưỡng">Tự động đặt</button>' : '') + '</div>';
      if (hp) {
        h += '<details class="det" data-key="sug_' + E(r.key) + '"' + (UI.st.open['sug_' + r.key] ? ' open' : '') + '><summary>So sánh nguồn nhập</summary><div class="tblwrap"><table class="tbl small"><tr><th>Nguồn</th><th class="r">Giá/đv</th><th class="r">SL</th><th class="r">Tổng</th><th>ETA</th><th>Hết hàng</th><th>Lỗi</th><th>MOQ</th><th>Ưu đãi / lưu ý</th></tr>' + r.opts.map(function (o) {
          if (o.locked && !G.unlock.showAll('src')) return '';
          if (o.locked || !o.usable) return '<tr class="muted"><td>' + E(o.name) + '</td><td colspan="8">' + (o.locked ? '🔒 ' : '') + E(o.why || '') + '</td></tr>';
          if (!o.qty) return '<tr class="muted"><td>' + E(o.name) + '</td><td colspan="8">' + E(o.why || 'Không cần') + '</td></tr>';
          var perks = []; if (o.credit) perks.push('mua chịu'); if (o.rel) perks.push('CK NCC ' + Math.round(o.rel * 100) + '%'); if (o.noInvoice) perks.push('<span class="neg">không hóa đơn</span>'); perks.push(o.afford ? '<span class="pos">đủ tiền</span>' : '<span class="neg">thiếu ' + F.short(o.cash - G.state.money) + '</span>');
          return '<tr class="' + (o.src === r.best.src ? 'sel' : '') + '"><td>' + E(o.name) + (o.src === r.best.src ? ' ★' : '') + '</td><td class="r">' + F.short(o.unit) + '</td><td class="r">' + o.qty + '</td><td class="r">' + F.short(o.cash) + '</td><td>' + (o.lead[0] === o.lead[1] ? o.lead[0] : o.lead[0] + '-' + o.lead[1]) + 'n</td><td>' + o.risk + '</td><td>' + Math.round(o.defect * 100) + '%</td><td>' + (o.moq || '—') + '</td><td>' + perks.join(', ') + '</td></tr>';
        }).join('') + '</table></div></details>';
      }
      h += '</div>';
    return h;
  }
  function custLine(r) {
    if (!r.cust || !r.cust.orders.length) return '';
    return '<div class="custline">' + r.cust.orders.slice(0, 3).map(function (o) { return '<span class="chipx ' + (o.left <= 2 ? 'neg' : 'st-go') + '">' + (o.type === 'dep' ? G.icon('gift', 10) + ' ' + E(o.name) + ' · cọc ' + F.short(o.deposit) + ' · hạn ngày ' + o.due + ' (còn ' + Math.max(0, o.left) + ' ngày)' : o.type === 'b2b' ? 'B2B ' + E(o.name) + ' · hạn ngày ' + o.due + ' (còn ' + Math.max(0, o.left) + ' ngày)' : G.icon('live', 10) + ' ' + E(o.name)) + '</span>'; }).join(' ') + (r.lateRisk ? ' <span class="chipx neg">nhập thường có thể trễ hạn</span>' : '') + '</div>';
  }
  UI.st.sug = UI.st.sug || { f: 'all', brand: '', more: false, collapsed: {}, exp: {} };
  UI.sugHtml = function () {
    var C = SG.compute(), rows = C.rows, hp = C.helper, st = UI.st.sug, all = rows.filter(function (r) { return r.action === 'order'; }), clears = rows.filter(function (r) { return r.action === 'clear'; });
    var tc = SG.tierCounts(), meaningful = all.filter(function (r) { return r.tier <= 3; }), inB = all.filter(function (r) { return r.inBatch; }).length, tot = 0; meaningful.forEach(function (r) { tot += r.chosen.cash; });
    var h = '<h4>Gợi ý nhập hàng</h4>';
    h += '<div class="card small sugsum"><b>' + meaningful.length + ' gợi ý</b> cần chú ý (<b class="neg">' + tc[1] + ' cho đơn khách</b> · ' + tc[2] + ' khách hỏi hết hàng · ' + tc[3] + ' mẫu trưng bày) · tổng ~<b>' + F.short(tot) + '</b>' + (all.length > meaningful.length ? ' · còn ' + (all.length - meaningful.length) + ' gợi ý ít gấp hơn' : '') + (inB ? '<div class="muted">' + inB + ' món đã nằm trong danh sách của Thủ kho (ẩn)</div>' : '') + '</div>';
    if (!hp) h += '<p class="muted small">Đang hiện gợi ý cơ bản. 🔒 Thuê <b>Kế toán</b> hoặc <b>Thủ kho</b> để thêm: bán chạy, mẫu mới, tồn lâu, bảng so sánh nguồn nhập.</p>';
    if (!rows.length) return h + '<p class="muted small">Chưa có gợi ý nào - kho và kệ đang ổn.</p>';
    // một chạm: đặt tất cả đơn khách
    if (tc[1]) { var pl = SG.tier1(); h += '<div class="card sugbox"><b>' + G.icon('gift', 16) + ' Đơn khách (' + pl.rows.length + ' mặt hàng · ' + F.short(pl.total) + ')</b><div class="small">' + Object.keys(pl.groups).map(function (k) { var g = pl.groups[k]; return E(G.srcById[g.src].name) + (g.express ? ' ⚡' : '') + ': ' + F.short(g.total); }).join(' · ') + (pl.xN ? ' · ' + pl.xN + ' món dùng ⚡ lấy ngay để kịp hạn' : '') + '</div>' + (pl.late ? '<div class="neg small">' + G.icon('warn', 12) + ' ' + pl.late + ' món vẫn có thể trễ hạn (không còn lượt ⚡)</div>' : '<div class="pos small">' + G.icon('check', 12) + ' Kịp hạn các đơn khách</div>') + '<button class="btn primary" data-act="sugTier1">Thêm đơn khách vào giỏ</button></div>'; }
    if (all.length) h += '<div class="chips">' + [['all', 'Tất cả'], ['cust', 'Đơn khách (' + tc[1] + ')'], ['out', 'Hết hàng (' + (tc[2] + tc[3]) + ')'], ['season', 'Mùa vụ (' + tc[5] + ')'], ['new', 'Mẫu mới (' + tc[6] + ')']].map(function (x) { return '<button class="chip' + (st.f === x[0] ? ' on' : '') + '" data-act="sugF" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var brands = {}; all.forEach(function (r) { brands[G.skus[r.sku].brand] = 1; });
    if (Object.keys(brands).length > 1) h += '<div class="row"><select data-chg="sugBrand"><option value="">Mọi hãng</option>' + Object.keys(brands).map(function (b) { return '<option value="' + b + '"' + (st.brand === b ? ' selected' : '') + '>' + E(G.brandName(b)) + '</option>'; }).join('') + '</select></div>';
    var vis = all.filter(function (r) { if (r.inBatch) return false; if (st.brand && G.skus[r.sku].brand !== st.brand) return false; return st.f === 'all' || (st.f === 'cust' && r.tier === 1) || (st.f === 'out' && (r.tier === 2 || r.tier === 3)) || (st.f === 'season' && r.tier === 5) || (st.f === 'new' && r.tier === 6); });
    var budget = 12, shownN = 0, hidden = 0, tiersHtml = '';
    for (var t = 1; t <= 6; t++) {
      var list = vis.filter(function (r) { return r.tier === t; }); if (!list.length) continue;
      var limit = t === 1 ? 999 : t <= 3 ? Math.max(3, budget - shownN) : t === 4 ? 5 : 0;
      if (st.f !== 'all') limit = 999; if (st.more) limit = 999;
      var take = list.slice(0, limit), rest = list.length - take.length; if (rest > 0) hidden += rest; if (!take.length) { hidden += 0; continue; }
      shownN += take.length; var col = st.collapsed[t];
      var qty = 0; list.forEach(function (r) { qty += r.chosen.qty; });
      tiersHtml += '<h4 class="tierh t' + t + '" data-act="sugCol" data-v="' + t + '">' + (col ? '▸' : '▾') + ' ' + E(SG.TIERS[t]) + ' <span class="chipx ' + (t === 1 ? 'neg' : 'st-wait') + '">' + list.length + '</span> <span class="muted small">cần ' + qty + ' sp</span></h4>';
      if (col) continue;
      var groups = {}, order = []; take.forEach(function (r) { var k = r.coll; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(r); });
      order.forEach(function (k) {
        var g = groups[k];
        if (g.length === 1) { tiersHtml += custLine(g[0]) + sugCard(g[0], hp); return; }
        var ln = G.lines[g[0].line], sumq = 0, cash = 0; g.forEach(function (r) { sumq += r.chosen.qty; cash += r.chosen.cash; });
        var lines = {}; g.forEach(function (r) { lines[r.line] = 1; }); var nl = Object.keys(lines).length;
        tiersHtml += '<details class="det sugdet" data-key="sg_' + t + k + '"' + (st.exp[t + k] ? ' open' : '') + '><summary data-act="sugExp" data-v="' + E(t + k) + '"><b>' + E(G.brandName(ln.brand) + ' ' + ln.baseName) + '</b> · ' + (nl > 1 ? nl + ' màu' : g.length + ' cỡ') + ' · cần <b>' + sumq + '</b> · ~' + F.short(cash) + '</summary>' + g.map(function (r) { return custLine(r) + sugCard(r, hp); }).join('') + '</details>';
      });
    }
    h += tiersHtml || '<p class="muted small">Không có gợi ý phù hợp bộ lọc.</p>';
    if (hidden > 0 || (!st.more && vis.length > shownN)) h += '<button class="btn" data-act="sugMore">Xem thêm (' + Math.max(hidden, vis.length - shownN) + ')</button>'; else if (st.more) h += '<button class="btn" data-act="sugMore">Thu gọn</button>';
    if (clears.length) {
      h += '<h4>Nên xả hàng (không nhập thêm)</h4>';
      clears.slice(0, 6).forEach(function (r) {
        h += '<div class="card small"><div class="irow">' + UI.itemTile({ sku: r.sku, qty: r.have }) + '<div style="min-width:0"><b>' + E(r.label) + '</b> ' + G.life.badge(r.stage) + ' <span class="chipx neg">' + r.tags[0] + '</span><div class="muted">Còn ' + r.have + ' · ' + E(r.why) + '</div></div></div><div class="row"><button class="mini primary" data-act="sugClear" data-key="' + E(r.key) + '">' + (r.pct > 0 ? 'Giảm ' + Math.round(r.pct * 100) + '%' : 'Bán sỉ đầu nậu') + '</button></div></div>';
      });
    }
    return h;
  };
  // GIỎ HÀNG CHUNG (tab Giỏ hàng): gợi ý + chọn thủ công cùng 1 giỏ; mỗi nguồn nhập = 1 đơn hàng
  UI.sugCartHtml = function () {
    var PU = G.purchasing, srcs = PU.cartSrcs(); if (!srcs.length) return '';
    var c = PU.cart(), W = G.wh, s = G.state, all = PU.cartAll(), min = G.autobuy ? G.autobuy.minOrder() : 0;
    var destOpts = [['st', 'Kho cửa hàng (trống ' + Math.max(0, Math.floor(W.free('st'))) + ')']].concat(Object.keys(s.whRent).map(function (id) { return [id, G.whById[id].name + ' (trống ' + Math.max(0, Math.floor(W.free(id))) + ')']; }));
    var h = '<div class="sugcart"><h4>' + G.icon('box', 16) + ' Giỏ hàng · ' + srcs.length + ' đơn · ' + all.skus + ' sản phẩm (' + all.qty + ' sp)</h4>' +
      '<div class="row"><label>Nhận hàng tại <select data-chg="cartDest">' + opts(destOpts, c.dest) + '</select></label></div>';
    h += srcs.map(function (src, ix) {
      var sd = G.srcById[src], q = PU.cartQuote(src), o = PU.cartOpt(src), lines = PU.cartLines(src), xok = src === 'daily' || src === 'nhamay';
      var below = min > 0 && q.total < min;
      return '<div class="card abcart"><b>Đơn ' + (ix + 1) + ' · ' + E(sd.name) + (o.express ? ' ⚡' : '') + '</b> <span class="muted small">· ' + Object.keys(lines).length + ' sản phẩm · về sau ' + (sd.lead[0] === sd.lead[1] ? sd.lead[0] : sd.lead[0] + '-' + sd.lead[1]) + ' ngày</span>' +
        Object.keys(lines).map(function (sku) {
          var t = G.skus[sku], u = q.unit[sku] || 0;
          return '<div class="cart-line"><div class="cl-info"><b>' + E(t.label) + '</b><br><span class="muted">' + F.short(u) + '/sp = <b>' + F.short(u * lines[sku]) + '</b></span></div><div class="buy-step"><button data-act="cartLineStep" data-src="' + src + '" data-sku="' + E(sku) + '" data-n="-1" aria-label="Giảm">−</button><input type="number" min="0" class="qty" data-chg="cartLineQty" data-src="' + src + '" data-sku="' + E(sku) + '" value="' + lines[sku] + '"><button class="plus" data-act="cartLineStep" data-src="' + src + '" data-sku="' + E(sku) + '" data-n="1" aria-label="Tăng">+</button></div><button class="cart-x" data-act="cartLineDel" data-src="' + src + '" data-sku="' + E(sku) + '" aria-label="Bỏ khỏi giỏ">✕</button></div>';
        }).join('') +
        '<table class="tbl small"><tr><td>Hàng hóa' + (q.tier ? ' (CK SL ' + Math.round(q.tier * 100) + '%)' : '') + '</td><td class="r">' + F.vnd(q.goods) + '</td></tr><tr><td>Phí giao hàng' + (q.ext ? ' + vận chuyển kho ngoài' : '') + '</td><td class="r">' + F.vnd(q.fee + (q.ext || 0)) + '</td></tr>' + (q.expFee ? '<tr><td>⚡ Phí lấy ngay</td><td class="r">' + F.vnd(q.expFee) + '</td></tr>' : '') + '<tr class="tot"><td>Tổng đơn</td><td class="r">' + F.vnd(q.total) + '</td></tr></table>' +
        (q.errors.length ? '<div class="neg small">' + q.errors.slice(0, 2).map(E).join('<br>') + '</div>' : '') +
        (below ? '<div class="warn small">' + G.icon('warn', 12) + ' Dưới mức đơn tối thiểu ' + F.short(min) + ' (đặt ở panel Thủ kho) - vẫn đặt được</div>' : '') +
        '<div class="row">' + (src !== 'cho' ? '<label class="nw"><input type="checkbox" data-chg="cartCreditSrc" data-src="' + src + '"' + (o.credit ? ' checked' : '') + '> Mua chịu 30 ngày (QH ≥ 50)</label>' : '') +
        (xok ? '<label class="nw"><input type="checkbox" data-chg="cartExpSrc" data-src="' + src + '"' + (o.express ? ' checked' : '') + '> ⚡ Nhập lấy ngay (còn ' + PU.xLeft() + ' lượt)</label>' : '') + '</div>' +
        '<div class="row"><button class="btn primary" data-act="cartPlaceSrc" data-src="' + src + '"' + (q.errors.length ? ' disabled' : '') + '>Đặt đơn ' + (ix + 1) + ' (' + F.short(q.total) + ')</button><button class="btn" data-act="cartClearSrc" data-src="' + src + '">Xóa đơn</button></div></div>';
    }).join('');
    h += '<div class="row"><button class="btn primary" data-act="cartPlaceAll">Đặt tất cả (' + srcs.length + ' đơn · ' + F.short(all.total) + ')</button><button class="btn" data-act="clearCart">Xóa cả giỏ</button>' + (s.lastOrder ? '<button class="btn" data-act="reorder">Nhập lại như lần trước</button>' : '') + '</div></div>';
    return h;
  };
  P.act.sugF = function (el) { UI.st.sug.f = el.dataset.v; UI.st.sug.more = false; };
  P.act.sugMore = function () { UI.st.sug.more = !UI.st.sug.more; };
  P.act.sugCol = function (el) { var c = UI.st.sug.collapsed; c[el.dataset.v] = !c[el.dataset.v]; };
  P.act.sugExp = function (el) { var e = UI.st.sug.exp; e[el.dataset.v] = !e[el.dataset.v]; };
  P.act.sugDismiss = function (el) { SG.removeCart(el.dataset.key); };
  P.act.sugCartAdd = function (el) { SG.addCart(el.dataset.key); };
  P.act.sugTier1 = function () { res(SG.addTier1()); };
  P.chg.sugBrand = function (el) { UI.st.sug.brand = el.value; };
  P.chg.sugQty = function (el) { SG.setEdit(el.dataset.key, { qty: Math.max(1, Math.floor(+el.value || 1)) }); };
  P.chg.sugSrc = function (el) { SG.setEdit(el.dataset.key, { src: el.value }); };
  P.act.sugOrder = function (el) { res(SG.order(el.dataset.key)); };
  P.act.sugExpress = function (el) { res(SG.orderExpress(el.dataset.key)); };
  P.act.sugAuto = function (el) { res(SG.setAuto(el.dataset.key)); };
  P.act.sugClear = function (el) { res(SG.clear(el.dataset.key)); };
  P.act.sugAll = function () { var t = SG.totals(); if (!t.n) return; if (confirm('Đặt ' + t.n + ' mặt hàng theo gợi ý, tổng ' + F.vnd(t.total) + '?')) res(SG.orderAll()); };

  // ======================= LIVESTREAM =======================
  function featOptions() {
    var l = G.skuList.filter(function (k) { return G.live.sellable(k.id) >= 1 && G.brandAvail(k.brand); }).sort(function (a, b) { return a.label.localeCompare(b.label); });
    return [['', '— chọn sản phẩm —']].concat(l.map(function (k) { return [k.id, k.label + ' (còn ' + G.live.sellable(k.id) + ') ' + F.short(G.pricing.base(k.id))]; }));
  }
  function cfgNow() {
    var f = UI.st.live, s = G.state, cfg = { platform: f.platform, dayIn: f.dayIn, start: f.start, dur: f.dur, hostKind: f.hostKind, hostId: f.hostId, kolId: f.kolId, crewId: f.crewId, feat: f.f.slice(), combo: f.combo, disc: f.disc / 100, voucher: f.voucher, vmin: f.vmin, ad: f.ad };
    if (f.hostKind === 'staff') { var st = G.staff.byId(+f.hostId); if (st) cfg.hostObj = G.live.hostOf({ host: { type: 'staff', id: st.id } }); }
    else { var k = s.live.kols.filter(function (x) { return x.id === f.kolId; })[0]; if (k) cfg.hostObj = G.live.hostOf({ host: { type: 'kol', kol: k } }); }
    return cfg;
  }
  function liveTab() {
    var s = G.state, lv = s.live, f = UI.st.live, h = '';
    if (!lv.built) {
      return '<div class="card"><b>🎥 Phòng livestream</b><p class="small">Xây phòng livestream bên cạnh cửa hàng: đèn ring, camera, phông nền. Bán hàng online qua TikTak Live, Shopee-ee Live, Facebúc Live với host là nhân viên hoặc KOL; đơn online đi qua hệ thống giao hàng (COD, hoàn, trễ...).</p>' +
        '<p class="small">Chi phí xây <b>' + F.vnd(lv.studioCost) + '</b> · duy trì <b>' + F.vnd(G.live.UPKEEP) + '/ngày</b> · mở từ cấp <b>Cửa hàng mặt phố</b>.</p><button class="btn primary" data-act="lvBuild"' + (s.level < G.live.MIN_LEVEL ? ' disabled' : '') + '>' + (s.level < G.live.MIN_LEVEL ? '🔒 Chưa đủ cấp' : 'Xây phòng livestream') + '</button></div>';
    }
    var run = G.live.running();
    if (run) {
      var host = G.live.hostOf(run), st = run.st;
      h += '<div class="card warnbox"><b>🔴 ĐANG LIVE · ' + E(G.data.platforms[run.platform].name) + '</b><div class="small">Host ' + E(host ? host.name : '?') + ' · ' + Math.floor(st.min) + '/' + run.dur * 60 + ' phút</div>' + bar(st.min / (run.dur * 60), 'good') +
        '<div class="small">👁 <b>' + Math.round(st.viewers) + '</b> (đỉnh ' + st.peak + ') · đơn <b>' + st.orders + '</b> · doanh thu <b>' + F.vnd(st.rev) + '</b> · sự cố ' + st.mishaps + '</div><div class="muted small">Host/trợ lý đang không đứng cửa hàng. Chọn lựa trong các cửa sổ "chốt đơn" để tăng đơn.</div></div>';
    }
    h += '<div class="card small"><b>Kênh của bạn</b> · uy tín kênh ' + Math.round(lv.rep) + '/100' + bar(lv.rep / 100, lv.rep >= 50 ? 'good' : '') + Object.keys(G.data.platforms).map(function (k) { return E(G.data.platforms[k].name) + ': <b>' + F.num(lv.followers[k]) + '</b> follow'; }).join(' · ') + '</div>';
    // --- lên lịch ---
    h += '<h4>Lên lịch phiên live</h4>';
    var staffOpts = s.staff.filter(function (x) { return (x.role === 'marketing' || x.role === 'sales') && x.status === 'ok'; });
    if (f.hostKind === 'staff' && !staffOpts.some(function (x) { return String(x.id) === String(f.hostId); })) f.hostId = staffOpts.length ? String(staffOpts[0].id) : '';
    if (f.hostKind === 'kol' && !lv.kols.some(function (k) { return k.id === f.kolId; })) f.kolId = lv.kols.length ? lv.kols[0].id : '';
    h += '<div class="card small"><div class="row"><label>Nền tảng <select data-chg="lvPlat">' + opts(Object.keys(G.data.platforms).map(function (k) { var p = G.data.platforms[k]; return [k, p.name + ' · tiếp cận ×' + p.reach + ' · chốt ×' + p.conv + ' · phí ' + Math.round(p.fee * 100) + '%']; }), f.platform) + '</select></label></div>' +
      '<div class="row"><label>Ngày <select data-chg="lvDay">' + opts([0, 1, 2, 3, 4, 5, 6, 7].map(function (d) { return [d, d === 0 ? 'Hôm nay (ngày ' + s.day + ')' : 'Ngày ' + (s.day + d) + ' (' + G.cal.WD[G.cal.weekday(s.day + d)] + ')']; }), f.dayIn) + '</select></label>' +
      '<label>Bắt đầu <select data-chg="lvStart">' + opts([9, 10, 11, 12, 14, 16, 17, 18, 19, 20].map(function (h2) { return [h2, h2 + 'h' + (G.data.liveSlots[h2] >= 1.2 ? ' (giờ vàng)' : '')]; }), f.start) + '</select></label>' +
      '<label>Thời lượng <select data-chg="lvDur">' + opts([1, 2, 3].map(function (d) { return [d, d + ' giờ']; }), f.dur) + '</select></label></div>' +
      '<div class="row"><label>Host <select data-chg="lvHostKind">' + opts([['staff', 'Nhân viên của shop'], ['kol', 'Thuê KOL / host']], f.hostKind) + '</select></label>' +
      (f.hostKind === 'staff' ? '<select data-chg="lvHost">' + opts(staffOpts.length ? staffOpts.map(function (x) { return [x.id, x.name + ' (' + G.roleById[x.role].name + ' ' + x.stars + '★)']; }) : [['', 'Chưa có NV marketing/bán hàng rảnh']], f.hostId) + '</select>' : '<select data-chg="lvKol">' + opts(lv.kols.map(function (k) { return [k.id, k.name + ' · ' + F.num(k.followers) + ' follow · phí ' + F.short(k.fee)]; }), f.kolId) + '</select>') + '</div>' +
      '<div class="row"><label>Trợ lý (tuỳ chọn) <select data-chg="lvCrew">' + opts([['', '— không —']].concat(s.staff.filter(function (x) { return x.status === 'ok' && String(x.id) !== String(f.hostId); }).map(function (x) { return [x.id, x.name + ' (' + G.roleById[x.role].name + ')']; })), f.crewId) + '</select></label></div>' +
      '<div class="small"><b>Sản phẩm giới thiệu</b> (cần có hàng mẫu + hàng bán) <button class="mini" data-act="lvCombo">Combo phòng ngủ</button></div>' +
      [0, 1, 2].map(function (i) { return '<div class="row"><select data-chg="lvFeat" data-i="' + i + '">' + opts(featOptions(), f.f[i]) + '</select></div>'; }).join('') +
      '<div class="row"><label class="nw"><input type="checkbox" data-chg="lvComboChk"' + (f.combo ? ' checked' : '') + '> Bán theo combo (mua đủ bộ, -5% thêm)</label></div>' +
      '<div class="row"><label>Giảm giá live <select data-chg="lvDisc">' + opts([0, 5, 10, 15, 20, 30, 40].map(function (d) { return [d, d + '%']; }), f.disc) + '</select></label><label>Voucher <select data-chg="lvVoucher">' + opts([0, 50000, 100000, 200000].map(function (d) { return [d, d ? F.short(d) : 'Không']; }), f.voucher) + '</select></label><label>Hóa đơn từ <select data-chg="lvVmin">' + opts([500000, 1000000, 3000000].map(function (d) { return [d, F.short(d)]; }), f.vmin) + '</select></label></div>' +
      '<div class="row"><label>Ngân sách quảng cáo <select data-chg="lvAd">' + opts([0, 500000, 1000000, 2000000, 5000000].map(function (d) { return [d, d ? F.short(d) : 'Không']; }), f.ad) + '</select></label></div>';
    var cfg = cfgNow(), fl = 0; f.f.filter(Boolean).forEach(function (k) { if (G.pricing.isBelowFloor(k, Math.round(G.pricing.base(k) * (1 - f.disc / 100) / 1000) * 1000)) fl++; });
    if (fl) h += '<div class="neg">⚠ ' + fl + ' sản phẩm giảm dưới giá sàn của hãng: bị phát hiện sẽ bị cảnh cáo / cắt chiết khấu / rút quyền đại lý!</div>';
    var est = cfg.hostObj ? G.live.estimate(cfg) : null, cost = f.ad + (f.hostKind === 'kol' && cfg.hostObj ? lv.kols.filter(function (k) { return k.id === f.kolId; })[0].fee : 0);
    if (est) h += '<div class="small" style="margin:6px 0">Ước tính: ~<b>' + est.viewers + '</b> người xem · ~<b>' + est.orders.toFixed(1) + '</b> đơn · doanh thu ~' + F.short(est.rev) + ' · chi phí ngay <b>' + F.short(cost) + '</b></div>';
    h += '<button class="btn primary" data-act="lvSchedule">Đặt lịch live</button></div>';
    var sch = lv.sessions.filter(function (x) { return x.status === 'Đã đặt'; });
    h += '<h4>Lịch sắp tới (' + sch.length + ')</h4>' + (sch.length ? '<table class="tbl small">' + sch.map(function (x) { var hst = G.live.hostOf(x); return '<tr><td>Ngày ' + x.day + ' · ' + x.start + 'h (' + x.dur + 'h)<br><span class="muted">' + E(G.data.platforms[x.platform].name) + ' · host ' + E(hst ? hst.name : '?') + '</span></td><td>' + x.feat.map(function (k) { return E(G.skus[k].label); }).join(', ') + '</td><td><button class="mini" data-act="lvCancel" data-id="' + x.id + '">Hủy (hoàn 50%)</button></td></tr>'; }).join('') + '</table>' : '<p class="muted small">Chưa có lịch.</p>');
    if (lv.reports.length) h += '<h4>Báo cáo gần đây</h4><table class="tbl small"><tr><th>Ngày</th><th class="r">Đỉnh</th><th class="r">Đơn</th><th class="r">Lãi</th><th class="r">+Follow</th></tr>' + lv.reports.map(function (r) { return '<tr><td>' + r.day + ' ' + E(r.platform.split(' ')[0]) + '</td><td class="r">' + r.peak + '</td><td class="r">' + r.orders + '</td><td class="r ' + (r.profit >= 0 ? 'pos' : 'neg') + '">' + F.short(r.profit) + '</td><td class="r">+' + r.newF + '</td></tr>'; }).join('') + '</table>';
    return h;
  }
  var LF = function () { return UI.st.live; };
  P.act.lvBuild = function () { res(G.live.build()); };
  P.chg.lvPlat = function (el) { LF().platform = el.value; };
  P.chg.lvDay = function (el) { LF().dayIn = +el.value; };
  P.chg.lvStart = function (el) { LF().start = +el.value; };
  P.chg.lvDur = function (el) { LF().dur = +el.value; };
  P.chg.lvHostKind = function (el) { LF().hostKind = el.value; };
  P.chg.lvHost = function (el) { LF().hostId = el.value; };
  P.chg.lvKol = function (el) { LF().kolId = el.value; };
  P.chg.lvCrew = function (el) { LF().crewId = el.value; };
  P.chg.lvFeat = function (el) { LF().f[+el.dataset.i] = el.value; };
  P.chg.lvComboChk = function (el) { LF().combo = el.checked; };
  P.chg.lvDisc = function (el) { LF().disc = +el.value; };
  P.chg.lvVoucher = function (el) { LF().voucher = +el.value; };
  P.chg.lvVmin = function (el) { LF().vmin = +el.value; };
  P.chg.lvAd = function (el) { LF().ad = +el.value; };
  P.act.lvCombo = function () {
    var f = LF(), pick = function (type) { var l = G.skuList.filter(function (k) { return k.type === type && G.live.sellable(k.id) >= 1 && G.brandAvail(k.brand) && k.brand !== 'cho'; }); return l.length ? l[0].id : ''; };
    f.f = [pick('dem'), pick('ga'), pick('goi')]; f.combo = true;
    if (!f.f.some(Boolean)) res({ ok: false, msg: 'Chưa có hàng đệm/ga/gối để lên combo' });
  };
  P.act.lvSchedule = function () { var cfg = cfgNow(); delete cfg.hostObj; res(G.live.schedule(cfg)); };
  P.act.lvCancel = function (el) { G.live.cancel(+el.dataset.id); };
  P.register({ id: 'live', label: 'Livestream', after: 'camp', render: liveTab, badge: function () { return G.live.running() ? '●' : ''; } });
})();
