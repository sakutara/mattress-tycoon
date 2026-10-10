/* Đơn đặt riêng theo yêu cầu khách (hàng chưa có) có đặt cọc. Trường để pass 3 xử lý "bỏ cọc". */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ special: { list: [], nextId: 1 } });
  var D = G.deposits = {
    byId: function (id) { return G.state.special.list.filter(function (o) { return o.id === id; })[0]; },
    pending: function () { return G.state.special.list.filter(function (o) { return o.status === 'Chờ xử lý'; }).length; },
    maybeRequest: function (c) {
      var s = G.state; if (s.level < 1 || !G.chance(0.08)) return false;
      if (s.special.list.filter(function (o) { return o.status === 'Chờ xử lý' || o.status === 'Đã nhận cọc'; }).length >= 6) return false;
      var cands = G.skuList.filter(function (k) { return k.type === c.want && G.brandAvail(k.brand) && G.life.stage(k.id) < 3 && G.wh.total(k.id) < 2 && (k.size === c.sizePref || k.size === 'Tiêu chuẩn') && k.brand !== 'cho'; });
      var k = G.weighted(cands, function (x) { var b = G.brandById[x.brand]; return Math.exp(-Math.abs((b.tier || 2.5) - c.aff)); });
      if (!k) return false;
      var small = k.type === 'goi' || k.type === 'ga' || k.type === 'phukien', qty = small ? G.pick([1, 1, 1, 2, 2, 3]) : (G.chance(0.12) ? 2 : 1);
      var price = Math.round(k.list * 1.03 / 1000) * qty * 1000;
      var o = { id: s.special.nextId++, kind: 'retail', sku: k.id, qty: qty, held: 0, poIds: [], price: price, deposit: Math.round(price * 0.3 / 1000) * 1000, cust: { name: G.pick(G.data.lastNames) + ' ' + G.pick(G.data.firstNames) }, askedDay: s.day, due: s.day + 10, status: 'Chờ xử lý', depositPaid: false, cancelable: false };
      s.special.list.push(o);
      var st0 = D.stock(o); G.notify.push({ title: 'Khách xin đặt riêng', text: o.cust.name + ' muốn ' + qty + ' × ' + k.label + ' · ' + st0.label + ' (cọc ' + G.fmt.short(o.deposit) + '). Xem tab Giao hàng.', type: 'info', sound: 'info' });
      return true;
    },
    accept: function (id) {
      var o = D.byId(id); if (!o || o.status !== 'Chờ xử lý') return { ok: false, msg: 'Không hợp lệ' };
      G.econ.cash(o.deposit); o.depositPaid = true; o.status = 'Đã nhận cọc'; o.cancelable = true; o.due = G.state.day + 10;
      return { ok: true, msg: 'Đã nhận cọc ' + G.fmt.vnd(o.deposit) + '. Hãy nhập hàng và giao trong 10 ngày.' };
    },
    reject: function (id) { var o = D.byId(id); if (o && o.status === 'Chờ xử lý') o.status = 'Từ chối'; },
    OPEN: ['Chờ xử lý', 'Đã nhận cọc'],
    // hàng có sẵn trong kho / kệ?
    available: function (sku) { return G.wh.total(sku) >= 1; },
    take: function (sku) {
      var W = G.wh, s = G.state;
      if (W.get(sku, 'st') > 0) { W.add(sku, -1, 'st'); return true; }
      var locs = Object.keys(s.whRent); for (var i = 0; i < locs.length; i++) if (W.get(sku, locs[i]) > 0) { W.add(sku, -1, locs[i]); return true; }
      return false;
    },
    // ---- thông tin kho cho 1 đơn cọc ----
    b2bNeed: function (sku) { var t = 0; G.state.b2b.orders.forEach(function (b) { if (b.status === 'Đang thực hiện') b.items.forEach(function (i) { if (i.sku === sku) t += Math.max(0, i.qty - i.done); }); }); return t; },
    othersNeed: function (o) { var t = 0; G.state.special.list.forEach(function (x) { if (x !== o && x.sku === o.sku && x.status === 'Đã nhận cọc') t += Math.max(0, x.qty - (x.held || 0)); }); return t; },
    stock: function (o) {
      var s = G.state, W = G.wh, sku = o.sku, qty = o.qty || 1, held = o.held || 0, ext = [], inc = [], i;
      var st = W.get(sku, 'st'), shelf = 0;
      Object.keys(s.whRent).forEach(function (l) { var n = W.get(sku, l); if (n) ext.push({ loc: l, name: W.locName(l), n: n }); });
      s.orders.forEach(function (po) { if (po.status !== 'Đã về kho' && po.items[sku]) inc.push({ id: po.id, qty: po.items[sku], day: po.arriveDay, min: po.arriveMin, express: !!po.express, mine: po.forDeposit === o.id }); });
      var extN = ext.reduce(function (a, x) { return a + x.n; }, 0), inv = st + shelf + extN, incN = inc.reduce(function (a, x) { return a + x.qty; }, 0);
      var oth = D.othersNeed(o), b2b = D.b2bNeed(sku), need = Math.max(0, qty - held);
      var free = Math.max(0, inv - oth - b2b), freeInc = Math.max(0, inv + incN - oth - b2b);
      var short = Math.max(0, need - free), shortAfter = Math.max(0, need - freeInc);
      var ok = need === 0 || short === 0, status = ok ? 'ok' : (free > 0 || freeInc >= need ? 'part' : 'none');
      var label = ok ? 'Đủ hàng - có thể giao ngay' : (status === 'none' ? 'Chưa có hàng' : 'Thiếu ' + short);
      return { st: st, shelf: shelf, ext: ext, inc: inc, incN: incN, inv: inv, held: held, others: oth, b2b: b2b, reserved: oth + b2b, need: need, free: free, short: short, shortAfter: shortAfter, ok: ok, status: status, label: label, qty: qty };
    },
    takeN: function (sku, n) { var k = 0; while (k < n && D.take(sku)) k++; return k; },
    hold: function (id) {
      var o = D.byId(id); if (!o || o.status !== 'Đã nhận cọc') return { ok: false, msg: 'Chỉ giữ hàng cho đơn đã nhận cọc' };
      var st = D.stock(o), n = Math.min(st.need, st.free); if (n <= 0) return { ok: false, msg: 'Không còn hàng rảnh để giữ' };
      var got = D.takeN(o.sku, n); o.held = (o.held || 0) + got; return { ok: true, msg: 'Đã giữ ' + got + ' × ' + G.skus[o.sku].label + ' cho ' + o.cust.name + ' (không bán ra nữa)' };
    },
    release: function (o) { if (o && o.held > 0) { G.wh.add(o.sku, o.held, 'st'); o.held = 0; } },
    unhold: function (id) { var o = D.byId(id); if (!o || !o.held) return { ok: false, msg: 'Chưa giữ hàng' }; var n = o.held; D.release(o); return { ok: true, msg: 'Đã trả ' + n + ' sp về kho' }; },
    // đề xuất nhập hàng cho đơn cọc
    suggest: function (o) {
      var s = G.state, PU = G.purchasing, st = D.stock(o), sku = o.sku, t = G.skus[sku]; if (!t) return null;
      var vel = 0; (s.sold7[sku] || []).forEach(function (x) { vel += x; }); vel /= 7;
      var extra = vel >= 0.4 ? Math.max(1, Math.round(vel * 3)) : 0, base = st.shortAfter - 0; if (base <= 0) return { none: true, st: st };
      var qty = base, daysLeft = o.due - s.day, best = null, opts = [];
      G.data.sources.forEach(function (src) {
        if (!PU.srcOpen(src) || !PU.skuOk(src.id, sku)) return;
        var q = Math.max(qty + extra, src.moq || 0), it = {}; it[sku] = q;
        var nq = PU.quote(src.id, it, 'st', false, false); if (nq.errors.length || !nq.qty) return;
        var late = src.lead[1] > daysLeft, xq = null;
        if (src.id === 'daily' || src.id === 'nhamay') { xq = PU.quote(src.id, it, 'st', false, true); if (xq.errors.length) xq = null; }
        var unit = nq.unit[sku], per = o.price / (o.qty || 1), r = { src: src.id, name: src.name, qty: q, need: qty, extra: q - qty, unit: unit, total: nq.total, lead: src.lead, late: late, margin: (per - unit) / per, nq: nq, xTotal: xq ? xq.total : 0, xFee: xq ? xq.expFee : 0, xOk: !!xq && PU.xLeft() > 0 };
        opts.push(r);
      });
      if (!opts.length) return { none: false, st: st, opts: [], qty: qty };
      var ontime = opts.filter(function (r) { return !r.late; });
      best = (ontime.length ? ontime : opts).slice().sort(function (a, b) { return a.total / a.qty - b.total / b.qty; })[0];
      var warn = ''; if (best.late) warn = 'Đơn thường về sau ' + best.lead[0] + '-' + best.lead[1] + ' ngày, có thể trễ hạn (còn ' + Math.max(0, daysLeft) + ' ngày)' + (best.xOk ? ' - nên ⚡ nhập lấy ngay' : '');
      return { st: st, qty: qty, extra: extra, best: best, opts: opts, warn: warn, daysLeft: daysLeft };
    },
    linked: function (o) { return G.state.orders.filter(function (po) { return po.forDeposit === o.id && po.status !== 'Đã về kho'; }); },
    orderFor: function (id, express) {
      var o = D.byId(id); if (!o || o.status !== 'Đã nhận cọc') return { ok: false, msg: 'Chỉ nhập hàng cho đơn đã nhận cọc' };
      var sg = D.suggest(o); if (!sg || sg.none) return { ok: false, msg: 'Đã đủ hàng, không cần nhập thêm' }; if (!sg.best) return { ok: false, msg: 'Không có nguồn nhập phù hợp' };
      var b = sg.best, it = {}; it[o.sku] = b.qty;
      var r = G.purchasing.place(b.src, it, 'st', false, !!express); if (r.ok && r.order) { r.order.forDeposit = o.id; o.poIds = o.poIds || []; o.poIds.push(r.order.id); G.suggest && G.suggest.invalidate(); }
      return r;
    },
    toCart: function (id) {
      var o = D.byId(id), sg = o && D.suggest(o); if (!sg || sg.none || !sg.best) return { ok: false, msg: 'Không có gì để thêm' };
      var c = G.state.cart; c.source = sg.best.src; G.purchasing.cartAdd(sg.best.src, o.sku, sg.best.qty); G.ui.st.buyBrand = G.skus[o.sku].brand;
      return { ok: true, msg: 'Đã thêm ' + sg.best.qty + ' vào giỏ nhập (tab Nhập hàng)' };
    },
    fulfil: function (id) {
      var s = G.state, o = D.byId(id); if (!o || o.status !== 'Đã nhận cọc') return { ok: false, msg: 'Không hợp lệ' };
      var qty = o.qty || 1, held = Math.min(o.held || 0, qty), need = qty - held;
      if (need > 0 && G.wh.total(o.sku) < need) return { ok: false, msg: 'Chưa đủ hàng - còn thiếu ' + (need - G.wh.total(o.sku)) + ' × ' + G.skus[o.sku].label };
      if (need > 0) D.takeN(o.sku, need); o.held = 0;
      G.econ.cogs((s.costBasis[o.sku] || G.skus[o.sku].cost) * qty);
      G.econ.recognize(o.deposit); G.econ.cash(o.price - o.deposit);   // cọc đã nhận trước
      o.status = 'Hoàn tất'; o.cancelable = false; s.rep = G.clamp(s.rep + 0.4, 0, 100); G.reviews.add(5, { special: o.id, sku: o.sku });
      G.emit('specialDone', o);
      var so = G.shipping.createOnline({ items: [{ sku: o.sku, qty: qty, price: Math.round(o.price / qty) }], rev: o.price, cogs: 0, cod: false, name: o.cust && o.cust.name, source: 'special', note: 'Đơn đặt riêng', special: true, urgent: false });
      return { ok: true, msg: 'Đã thu ' + G.fmt.vnd(o.price) + '. Đơn giao #' + so.id + ' tạo trong tab Giao hàng (' + (G.shipping.sameDayOk() ? 'đặt trước 17h để giao trong ngày' : 'sau 17h: giao sáng mai') + ')' };
    },
    // Pass 3: khách bỏ cọc -> người chơi giữ tiền cọc
    customerCancel: function (id) {
      var o = D.byId(id); if (!o || o.status !== 'Đã nhận cọc') return false;
      D.release(o); G.econ.recognize(o.deposit); o.status = 'Bỏ cọc'; o.cancelable = false; G.emit('depositForfeited', o); return true;
    },
    expire: function () {
      var s = G.state;
      s.special.list.forEach(function (o) {
        if (s.day <= o.due) return;
        if (o.status === 'Chờ xử lý') o.status = 'Hết hạn';
        else if (o.status === 'Đã nhận cọc') {
          D.release(o); G.econ.cash(-o.deposit); o.status = 'Hết hạn'; o.cancelable = false; s.rep = G.clamp(s.rep - 0.5, 0, 100); G.reviews.add(2, { special: o.id });
          G.notify.push({ title: 'Quá hạn đơn đặt riêng #' + o.id, text: 'Đã hoàn cọc ' + G.fmt.vnd(o.deposit) + ' cho khách.', type: 'warn', sound: false });
        }
      });
      s.special.list = s.special.list.filter(function (o) { return ['Chờ xử lý', 'Đã nhận cọc'].indexOf(o.status) >= 0 || s.day - o.due < 20; });
    }
  };
  G.on('dayStart', D.expire);
  // hàng về cho đơn cọc -> tự giữ lại
  G.on('truck', function (e) { var s = G.state; s.special.list.forEach(function (o) { if (o.status === 'Đã nhận cọc' && (o.poIds || []).indexOf(e.order) >= 0) D.hold(o.id); }); });
})();
