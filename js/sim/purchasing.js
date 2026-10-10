/* Nhập hàng: nguồn nhập, chiết khấu số lượng, đơn đang về, kiểm hàng, quan hệ NCC, công nợ, tự động đặt hàng */
(function () {
  'use strict';
  var G = window.G;
  G.data.sources = [
    { id: 'cho', name: 'Chợ đầu mối Ninh Hiệp', minLevel: 0, mult: 1, lead: [0, 0], defect: 0.12, moq: 0, noInvoice: true, desc: 'Hàng phổ thông không thương hiệu (Loại 1 tốt hơn, Loại 2 rẻ hơn), về ngay trong ngày, tỉ lệ lỗi cao (Loại 2 cao hơn), không hóa đơn.' },
    { id: 'daily', name: 'Đại lý cấp 1 của hãng', minLevel: 0, mult: 1, lead: [1, 2], defect: 0.03, moq: 0, desc: 'Giá chuẩn, về sau 1-2 ngày.' },
    { id: 'nhamay', name: 'Nhập thẳng nhà máy', minLevel: 3, mult: 0.88, lead: [3, 5], defect: 0.02, moq: 20, desc: 'Rẻ hơn ~12% nhưng phải nhập tối thiểu (MOQ) 20 cái/SKU, về sau 3-5 ngày.' },
    { id: 'oem', name: 'Xưởng gia công OEM', minLevel: 4, mult: 1, lead: [4, 6], defect: 0.05, moq: 20, desc: 'Làm hàng thương hiệu riêng "Nhà Mình": lãi cao, uy tín ban đầu thấp, tăng dần theo đánh giá. MOQ 20.' }
  ];
  G.srcById = {}; G.data.sources.forEach(function (x) { G.srcById[x.id] = x; });
  G.addDefaults({
    xbuy: { day: 0, n: 0 }, orders: [], nextOrderId: 1, rel: {}, payables: [], pendingRefunds: [], lastOrder: null, autoOrder: {}, priceMods: [],
    cart: { source: 'daily', dest: 'st', lines: {}, opt: {} }, sold7: {}, lastSold: {}, quarterBuy: {}, ownRep: 20
  });

  G.brandAvail = function (bid) {
    var s = G.state, b = G.brandById[bid]; if (!b) return false;
    if (s.brandRevoked[bid]) return false;
    if (b.own) return G.lvl().oem === true;
    if (b.noBrand) return true;
    return b.tier <= G.lvl().maxTier;
  };
  var PU = G.purchasing = {
    relDisc: function (bid) {
      var s = G.state; if (s.brandCut[bid]) return 0;
      var r = s.rel[bid] || 0; return r >= 75 ? 0.06 : r >= 50 ? 0.04 : r >= 25 ? 0.02 : 0;
    },
    tierDisc: function (qty) { return qty >= 100 ? 0.12 : qty >= 50 ? 0.07 : qty >= 10 ? 0.03 : 0; },
    srcOpen: function (src) { return G.state.level >= src.minLevel; },
    skuOk: function (srcId, sku) {
      var src = G.srcById[srcId], t = G.skus[sku]; if (!src || !t) return false;
      if (!PU.srcOpen(src)) return false;
      var b = G.brandById[t.brand];
      if (srcId === 'cho' && t.brand !== 'cho') return false;
      if (srcId === 'oem' && t.brand !== 'own') return false;
      if ((srcId === 'daily' || srcId === 'nhamay') && (t.brand === 'cho' || t.brand === 'own')) return false;
      return G.brandAvail(t.brand) && G.life.stage(sku) < 3;
    },
    modMult: function (sku) {
      var t = G.skus[sku], m = 1;
      G.state.priceMods.forEach(function (pm) { if (G.state.day > pm.until) return; if ((!pm.brand || pm.brand === t.brand) && (!pm.type || pm.type === t.type)) m *= pm.mult; });
      return m;
    },
    unit: function (srcId, sku, tier) {
      var src = G.srcById[srcId], t = G.skus[sku];
      var u = t.cost * src.mult * (G.life.stage(sku) === 2 ? 0.96 : 1) * PU.modMult(sku) * (1 - (tier || 0)) * (1 - PU.relDisc(t.brand));
      return Math.round(u / 100) * 100;
    },
    owned: function (sku) { return G.wh.total(sku); },
    // ---- Nhập hàng lấy ngay (hỏa tốc): đại lý cấp 1, nhà máy khi quan hệ >= 50; tối đa 3 đơn/ngày, 40 sp/đơn ----
    XMAX_ORD: 3, XMAX_QTY: 40,
    xLeft: function () { var x = G.state.xbuy; return x.day === G.state.day ? Math.max(0, PU.XMAX_ORD - x.n) : PU.XMAX_ORD; },
    xSrcOk: function (srcId, brands) {
      if (srcId === 'daily') return null;
      if (srcId === 'nhamay') { for (var i = 0; i < (brands || []).length; i++) if ((G.state.rel[brands[i]] || 0) < 50) return 'Nhà máy chỉ giao gấp khi quan hệ NCC ' + G.brandName(brands[i]) + ' ≥ 50'; return null; }
      return 'Nguồn này không hỗ trợ nhập lấy ngay';
    },
    xFee: function (goods, vol) { return Math.round((goods * 0.08 + 150000 * Math.max(1, Math.ceil(vol / 60))) / 1000) * 1000; },
    xEta: function () {
      var s = G.state;
      if (s.prep) return { day: s.day, min: 480, text: 'trước giờ mở cửa' };
      return { hours: 1, text: 'sau 1-3 giờ' };
    },
    quote: function (srcId, items, dest, credit, express) {
      var src = G.srcById[srcId], q = { lines: [], qty: 0, goods: 0, fee: 0, ext: 0, vol: 0, errors: [], total: 0, tier: 0, unit: {} };
      Object.keys(items).forEach(function (k) { if (items[k] > 0) q.qty += items[k]; });
      q.tier = PU.tierDisc(q.qty);
      var brands = {};
      Object.keys(items).forEach(function (k) {
        var n = Math.floor(items[k]); if (n <= 0) return;
        if (!PU.skuOk(srcId, k)) { q.errors.push(G.skus[k].label + ' không nhập được từ nguồn này'); return; }
        if (src.moq && n < src.moq) q.errors.push(G.skus[k].label + ': cần tối thiểu ' + src.moq + ' (MOQ)');
        var u = PU.unit(srcId, k, q.tier);
        q.unit[k] = u; q.goods += u * n; q.vol += G.skus[k].vol * n; brands[G.skus[k].brand] = true;
        q.lines.push({ sku: k, qty: n, unit: u });
      });
      if (q.qty > 0) {
        q.fee = srcId === 'cho' ? 150000 : srcId === 'daily' ? Math.max(100000, Math.round(q.goods * 0.015)) : Math.round(500000 + q.goods * 0.02);
        if (dest && dest !== 'st') q.ext = G.wh.transportCost('sup', dest, q.vol);
      }
      q.expFee = 0;
      if (express && q.qty > 0) {
        var xe = PU.xSrcOk(srcId, Object.keys(brands)); if (xe) q.errors.push(xe);
        if (q.qty > PU.XMAX_QTY) q.errors.push('Nhập lấy ngay tối đa ' + PU.XMAX_QTY + ' sản phẩm/đơn');
        if (!PU.xLeft()) q.errors.push('Hết lượt nhập lấy ngay hôm nay (tối đa ' + PU.XMAX_ORD + ' đơn/ngày)');
        q.expFee = PU.xFee(q.goods, q.vol);
      }
      q.total = q.goods + q.fee + q.ext + q.expFee;
      q.brands = Object.keys(brands);
      if (credit) {
        if (srcId === 'cho') q.errors.push('Chợ đầu mối không bán chịu');
        q.brands.forEach(function (b) { if ((G.state.rel[b] || 0) < 50) q.errors.push('Mua chịu cần quan hệ NCC ' + G.brandName(b) + ' ≥ 50'); });
      }
      return q;
    },
    place: function (srcId, items, dest, credit, express) {
      var s = G.state, src = G.srcById[srcId], q = PU.quote(srcId, items, dest, credit, express);
      if (!q.qty) return { ok: false, msg: 'Giỏ hàng trống' };
      if (q.errors.length) return { ok: false, msg: q.errors[0] };
      if (s.money < (credit ? q.expFee : q.total)) return { ok: false, msg: 'Không đủ tiền (cần ' + G.fmt.vnd(q.total) + ')' };
      if (G.wh.free(dest) < q.vol) return { ok: false, msg: G.wh.locName(dest) + ' không đủ chỗ chứa (cần ' + Math.ceil(q.vol) + ', trống ' + Math.max(0, Math.floor(G.wh.free(dest))) + ')' };
      var lead = G.randInt(src.lead[0], src.lead[1]), arriveDay = s.day, arriveMin;
      if (lead === 0) { arriveMin = s.minute + 120; if (arriveMin > 1230) { arriveDay++; arriveMin = 510; } }
      else { arriveDay = s.day + lead; arriveMin = 480; } // hàng về ngay khi sang ngày (pha chuẩn bị)
      if (express) {
        var ex = PU.xEta(); arriveDay = s.day;
        if (ex.min != null) arriveMin = ex.min; else { arriveMin = s.minute + 60 * G.randInt(1, 3) + G.randInt(0, 20); if (arriveMin > 1230) { arriveDay++; arriveMin = 480; } }
      }
      var o = { id: s.nextOrderId++, express: !!express, source: srcId, dest: dest, items: {}, unit: q.unit, placedDay: s.day, placedMin: s.minute, arriveDay: arriveDay, arriveMin: arriveMin, status: 'Đã đặt', total: q.total, credit: !!credit, delayed: false, note: '' };
      q.lines.forEach(function (l) { o.items[l.sku] = l.qty; });
      s.orders.push(o);
      if (credit) s.payables.push({ order: o.id, due: s.day + 30, amount: q.total, label: 'Đơn #' + o.id });
      else G.econ.cash(-q.goods);
      if (q.fee) G.econ.expense(credit ? 0 : q.fee, 'fees');
      if (q.ext) { G.econ.expense(credit ? 0 : q.ext, 'transport'); }
      if (express) { G.econ.expense(q.expFee, 'buyexpress'); s.xbuy = { day: s.day, n: (s.xbuy.day === s.day ? s.xbuy.n : 0) + 1 }; o.delayChecked = true; }
      // quan hệ NCC theo giá trị nhập
      var perBrand = {};
      q.lines.forEach(function (l) { var b = G.skus[l.sku].brand; perBrand[b] = (perBrand[b] || 0) + l.unit * l.qty; });
      Object.keys(perBrand).forEach(function (b) {
        if (G.brandById[b].noBrand) return;
        s.rel[b] = Math.min(100, (s.rel[b] || 0) + perBrand[b] / 4e6);
        s.quarterBuy[b] = (s.quarterBuy[b] || 0) + perBrand[b];
      });
      s.lastOrder = { source: srcId, dest: dest, items: G.clone(o.items) };
      G.emit('orderPlaced', o);
      return { ok: true, msg: 'Đã đặt đơn #' + o.id + (express ? ' ⚡ lấy ngay' : '') + ' (' + G.fmt.vnd(q.total) + '), dự kiến về ' + (express ? (arriveDay === s.day ? G.cal.hm(arriveMin) + ' hôm nay' : 'đầu ngày mai') : (arriveDay === s.day ? 'trong ngày' : 'ngày ' + arriveDay)), order: o };
    },
    process: function () {
      var s = G.state;
      s.orders.slice().forEach(function (o) {
        if (o.status === 'Đã về kho') return;
        var due = s.day > o.arriveDay || (s.day === o.arriveDay && s.minute >= o.arriveMin);
        if (due) { PU.deliver(o); return; }
        if (o.status === 'Đã đặt' && (s.day > o.placedDay || s.minute >= o.placedMin + 60)) o.status = 'Đang vận chuyển';
      });
      s.orders = s.orders.filter(function (o) { return o.status !== 'Đã về kho' || s.day - o.arriveDay < 10; });
    },
    deliver: function (o) {
      var s = G.state, src = G.srcById[o.source], W = G.wh;
      if (!o.delayChecked) {
        o.delayChecked = true;
        if (o.source !== 'cho' && G.chance(0.1 + (G.weather ? G.weather.shipDelay() * 0.5 : 0))) { o.arriveDay++; o.delayed = true; o.status = 'Đang vận chuyển'; G.notify.push({ title: 'Đơn #' + o.id + ' bị trễ', text: 'Nhà vận chuyển báo trễ 1 ngày.', type: 'warn', sound: false }); return; }
      }
      // thiếu hàng
      if (G.chance(0.08)) {
        var ks = Object.keys(o.items), k = G.pick(ks), lost = Math.max(1, Math.round(o.items[k] * G.rand(0.1, 0.3)));
        lost = Math.min(lost, o.items[k]);
        o.items[k] -= lost; if (o.items[k] <= 0) delete o.items[k];
        var ref = lost * (o.unit[k] || 0);
        if (o.credit) s.payables.forEach(function (p) { if (p.order === o.id) p.amount = Math.max(0, p.amount - ref); }); else G.econ.cash(ref);
        o.note = 'Thiếu ' + lost + ' × ' + G.skus[k].label + ' (đã hoàn tiền)';
        G.notify.push({ title: 'Đơn #' + o.id + ' giao thiếu hàng', text: o.note, type: 'warn', sound: false });
      }
      o.status = 'Đã về kho';
      var detectP = G.staff && G.staff.count('warehouse') > 0 ? Math.min(0.97, 0.8 + 0.06 * G.staff.bestStars('warehouse')) : 0.5;
      var detected = {}, totDet = 0;
      Object.keys(o.items).forEach(function (k) {
        var qty = o.items[k], n = 0, i;
        var dp = src.defect * (G.skus[k].grade === 1 ? 0.4 : G.skus[k].grade === 2 ? 1.25 : 1);
        for (i = 0; i < qty; i++) if (Math.random() < dp) n++;
        // giá vốn bình quân
        var have = W.total(k), cb = s.costBasis[k] || o.unit[k];
        s.costBasis[k] = Math.round((have * cb + qty * o.unit[k]) / (have + qty));
        W.add(k, qty, o.dest);
        if (src.noInvoice) s.noInvoice[k] = (s.noInvoice[k] || 0) + qty;
        if (n > 0) {
          var det = Math.round(n * detectP);
          if (det > 0) { detected[k] = det; totDet += det; }
          if (n - det > 0) s.hidden[k] = (s.hidden[k] || 0) + (n - det);
        }
      });
      G.emit('truck', { order: o.id });
      G.notify.push({ title: 'Hàng về kho: đơn #' + o.id, text: 'Xe tải đã giao ' + Object.keys(o.items).reduce(function (a, k) { return a + o.items[k]; }, 0) + ' sản phẩm tới ' + W.locName(o.dest) + '.', type: 'good', sound: 'good' });
      if (totDet > 0) PU.inspectModal(o, detected, totDet);
    },
    inspectModal: function (o, detected, tot) {
      var s = G.state, W = G.wh;
      var val = 0, lines = Object.keys(detected).map(function (k) { val += detected[k] * o.unit[k]; return '<li>' + G.esc(G.skus[k].label) + ': <b>' + detected[k] + '</b> lỗi</li>'; }).join('');
      function doReturn() {
        var refund = 0;
        Object.keys(detected).forEach(function (k) { var n = Math.min(detected[k], W.get(k, o.dest)); W.add(k, -n, o.dest); refund += n * o.unit[k] * 0.9; });
        s.pendingRefunds.push({ day: s.day + 2, amount: Math.round(refund), label: 'Đơn #' + o.id });
        G.notify.push({ title: 'Đã trả hàng lỗi', text: 'NCC sẽ hoàn ' + G.fmt.vnd(refund) + ' sau 2 ngày.', type: 'info', sound: false });
      }
      function doKeep() {
        var reb = 0;
        Object.keys(detected).forEach(function (k) { s.bGrade[k] = (s.bGrade[k] || 0) + detected[k]; reb += detected[k] * o.unit[k] * 0.35; });
        G.econ.cash(Math.round(reb));
        G.notify.push({ title: 'Nhận hàng lỗi nhẹ', text: 'NCC giảm giá ' + G.fmt.vnd(reb) + '. Hàng lỗi sẽ bán với giá thấp hơn.', type: 'info', sound: false });
      }
      G.notify.modal({
        title: 'Kiểm hàng: phát hiện hàng lỗi', def: 0,
        html: '<p>Đơn #' + o.id + ' từ <b>' + G.esc(G.srcById[o.source].name) + '</b> có <b>' + tot + '</b> sản phẩm lỗi (giá trị ~' + G.fmt.vnd(val) + ').' + (G.staff && G.staff.count('warehouse') ? ' <span class="muted">(Thủ kho đã tự kiểm)</span>' : ' <span class="muted">(Chưa có Thủ kho nên có thể sót hàng lỗi)</span>') + '</p><ul>' + lines + '</ul>',
        choices: [{ label: 'Trả lại NCC (hoàn ~90% sau 2 ngày)', cls: 'primary', fn: doReturn }, { label: 'Nhận và bán giảm giá (NCC giảm 35%)', fn: doKeep }]
      });
    },
    // dữ liệu gợi ý
    suggestions: function () {
      var s = G.state, best = [], low = [], stale = [];
      Object.keys(s.sold7).forEach(function (k) { var t = s.sold7[k].reduce(function (a, b) { return a + b; }, 0); if (t > 0 && G.skus[k]) best.push({ sku: k, n: t }); });
      best.sort(function (a, b) { return b.n - a.n; }); best = best.slice(0, 6);
      best.forEach(function (b) { var tot = G.wh.total(b.sku) + G.wh.incomingQty(b.sku); if (tot < Math.max(3, b.n * 0.5)) low.push({ sku: b.sku, n: tot }); });
      Object.keys(s.inv).forEach(function (k) { if (!G.skus[k]) return; var last = s.lastSold[k] || 0; if (s.day - last > 20 && G.wh.total(k) > 0) stale.push({ sku: k, days: s.day - last, n: G.wh.total(k) }); });
      stale.sort(function (a, b) { return b.days - a.days; });
      return { best: best, low: low, stale: stale.slice(0, 6) };
    },
    // ---- GIỎ HÀNG CHUNG: lines[nguồn][sku] = SL; gợi ý & chọn thủ công đều vào đây, mỗi nguồn = 1 đơn ----
    cart: function () {
      var c = G.state.cart; if (!c.lines) c.lines = {}; if (!c.opt) c.opt = {};
      if (c.items) { if (Object.keys(c.items).length) c.lines[c.source] = Object.assign(c.lines[c.source] || {}, c.items); delete c.items; }   // chuyển save cũ
      return c;
    },
    cartLines: function (src) { return PU.cart().lines[src] || {}; },
    cartQty: function (src, sku) { return PU.cartLines(src)[sku] || 0; },
    cartSet: function (src, sku, n) { var c = PU.cart(); n = Math.max(0, Math.floor(n || 0)); if (n) (c.lines[src] = c.lines[src] || {})[sku] = n; else if (c.lines[src]) { delete c.lines[src][sku]; if (!Object.keys(c.lines[src]).length) delete c.lines[src]; } },
    cartAdd: function (src, sku, d) { PU.cartSet(src, sku, PU.cartQty(src, sku) + d); },
    cartDel: function (src, sku) { PU.cartSet(src, sku, 0); },
    cartClear: function (src) { var c = PU.cart(); if (src) delete c.lines[src]; else c.lines = {}; },
    cartSrcs: function () { var c = PU.cart(); return G.data.sources.map(function (x) { return x.id; }).filter(function (id) { return c.lines[id] && Object.keys(c.lines[id]).length; }); },
    cartOpt: function (src) { var c = PU.cart(), o = c.opt[src] || (c.opt[src] = { credit: false, express: false }); if (src !== 'daily' && src !== 'nhamay') o.express = false; if (src === 'cho') o.credit = false; return o; },
    cartQuote: function (src) { var c = PU.cart(), o = PU.cartOpt(src); return PU.quote(src, c.lines[src] || {}, c.dest, o.credit, o.express); },
    cartTotals: function () { return PU.cartQuote(G.state.cart.source); },     // báo giá giỏ của nguồn đang xem
    cartAll: function () { var srcs = PU.cartSrcs(), t = { n: srcs.length, qty: 0, total: 0, skus: 0 }; srcs.forEach(function (id) { var q = PU.cartQuote(id); t.qty += q.qty; t.total += q.total; t.skus += Object.keys(PU.cartLines(id)).length; }); return t; },
    // đặt 1 nguồn trong giỏ thành 1 đơn
    cartPlace: function (src) {
      var c = PU.cart(), o = PU.cartOpt(src), items = c.lines[src]; if (!items || !Object.keys(items).length) return { ok: false, msg: 'Giỏ trống' };
      var r = PU.place(src, items, c.dest, o.credit, o.express); if (r.ok) delete c.lines[src]; return r;
    },
    addMod: function (mod) { G.state.priceMods.push(mod); },
    reorderLast: function () {
      var l = G.state.lastOrder; if (!l) return false;
      var c = PU.cart(); c.source = l.source; c.dest = l.dest; c.lines[l.source] = G.clone(l.items); return true;
    }
  };
  G.on('hour', PU.process);
  var xacc = 0; G.on('tick', function (t) { xacc += t.gm; if (xacc >= 10) { xacc = 0; if (G.state.orders.some(function (o) { return o.status !== 'Đã về kho' && o.arriveDay === G.state.day; })) PU.process(); } });
  G.on('dayStart', function () {
    var s = G.state;
    PU.process();
    // đổi chiều bảng bán 7 ngày
    Object.keys(s.sold7).forEach(function (k) { s.sold7[k].unshift(0); s.sold7[k].pop(); });
    // công nợ & hoàn tiền
    s.payables = s.payables.filter(function (p) {
      if (s.day >= p.due) { G.econ.cash(-p.amount); G.notify.push({ title: 'Trả công nợ NCC', text: p.label + ': ' + G.fmt.vnd(p.amount), type: 'warn', sound: false }); return false; }
      return true;
    });
    s.pendingRefunds = s.pendingRefunds.filter(function (r) {
      if (s.day >= r.day) { G.econ.cash(r.amount); G.notify.push({ title: 'NCC hoàn tiền', text: r.label + ': +' + G.fmt.vnd(r.amount), type: 'good', sound: false }); return false; }
      return true;
    });
    s.priceMods = s.priceMods.filter(function (m) { return s.day <= m.until; });
    // thưởng doanh số quý
    if (s.day > 1 && (s.day - 1) % 90 === 0) {
      Object.keys(s.quarterBuy).forEach(function (b) {
        var v = s.quarterBuy[b];
        if ((s.rel[b] || 0) >= 50 && v >= 30e6 && !s.brandCut[b]) {
          var bonus = Math.round(v * ((s.rel[b] || 0) >= 75 ? 0.03 : 0.02));
          G.econ.cash(bonus); G.notify.push({ title: 'Thưởng doanh số quý từ ' + G.brandName(b), text: '+' + G.fmt.vnd(bonus), type: 'good' });
        }
      });
      s.quarterBuy = {};
    }
    // biến động giá ngẫu nhiên
    if (G.chance(0.06)) {
      var brs = G.data.brands.filter(function (b) { return !b.noBrand && G.brandAvail(b.id); });
      if (brs.length) {
        var b = G.pick(brs), r = Math.random();
        if (r < 0.4) { PU.addMod({ brand: b.id, mult: 1.12, until: s.day + 10, label: b.short + ' tăng giá' }); G.notify.push({ title: b.short + ' tăng giá nhập', text: 'Giá nhập +12% trong 10 ngày.', type: 'warn' }); }
        else if (r < 0.75) { PU.addMod({ brand: b.id, mult: 0.8, until: s.day + 5, label: b.short + ' xả kho' }); G.notify.push({ title: b.short + ' xả kho giá sốc!', text: 'Giá nhập -20% trong 5 ngày - cơ hội nhập thêm.', type: 'good', sound: 'good' }); }
        else { var cold = [11, 12, 1, 2].indexOf(G.cal.moy(s.day)) >= 0; if (cold) { PU.addMod({ type: 'chan', mult: 1.2, until: s.day + 12, label: 'Khan hàng chăn mùa lạnh' }); G.notify.push({ title: 'Khan hàng mùa lạnh', text: 'Giá nhập chăn +20% trong 12 ngày.', type: 'warn' }); } }
      }
    }
    // tự động đặt hàng (cần Kế toán hoặc Thủ kho)
    if (G.staff && (G.staff.count('warehouse') > 0 || G.staff.count('accountant') > 0)) {
      Object.keys(s.autoOrder).forEach(function (k) {
        var a = s.autoOrder[k]; if (!G.skus[k] || !a) return;
        var tot = G.wh.total(k) + G.wh.incomingQty(k);
        if (tot >= a.min) return;
        var t = G.skus[k], src = a.src && PU.skuOk(a.src, k) ? a.src : (t.brand === 'cho' ? 'cho' : t.brand === 'own' ? 'oem' : 'daily'), qty = a.qty;
        if (src === 'nhamay' && qty < G.srcById.nhamay.moq) qty = G.srcById.nhamay.moq;
        if (src === 'oem' && qty < 20) qty = 20;
        var items = {}; items[k] = qty;
        var r = PU.place(src, items, 'st', false);
        if (!r.ok) G.notify.push({ title: 'Tự động đặt hàng thất bại', text: t.label + ': ' + r.msg, type: 'warn', sound: false, toast: false });
        else G.notify.push({ title: 'Tự động đặt hàng', text: t.label + ' × ' + qty, type: 'info', sound: false, toast: false });
      });
    }
  });
})();
