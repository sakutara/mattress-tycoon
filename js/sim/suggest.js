/* Gợi ý nhập hàng: SKU sắp hết / bán chạy / đơn đang mở / mẫu mới (nên nhập) và tồn lâu / lỗi thời (nên xả), kèm số lượng + NGUỒN NHẬP đề xuất và bảng so sánh nguồn */
(function () {
  'use strict';
  var G = window.G, PU = G.purchasing, W = G.wh;
  var S = G.suggest = { cache: null, ct: 0, edits: {}, SAFETY: 4 };
  function helper() { return G.staff.count('accountant') > 0 || G.staff.count('warehouse') > 0; }
  function tierBump(q) { if (q >= 8 && q < 10) return 10; if (q >= 40 && q < 50) return 50; if (q >= 85 && q < 100) return 100; return q; }
  function vel(k) { var a = G.state.sold7[k]; var t = a ? a.reduce(function (x, y) { return x + y; }, 0) : 0; return t / 7; }
  function lostRecent(k) { var n = 0; G.state.lostLog.forEach(function (e) { if (e.sku === k && G.state.day - e.day <= 3) n += e.n || 1; }); return n; }
  S.lostRecent = lostRecent;
  function onShelf(k) { return G.shelf.isShown(k); }
  function depCommit(k) { var c = 0; G.state.special.list.forEach(function (o) { if (o.sku === k && o.status === 'Đã nhận cọc') c += Math.max(0, (o.qty || 1) - (o.held || 0)); }); return c; }
  S.TIERS = { 1: 'Đơn khách đã đặt', 2: 'Khách hỏi nhưng hết hàng', 3: 'Mẫu trưng bày sắp hết / hết', 4: 'Bán chạy sắp hết', 5: 'Theo mùa / thời tiết', 6: 'Mẫu mới ra mắt', 7: 'Nên xả / không nhập' };
  // đơn khách liên quan tới 1 SKU: cọc / B2B / livestream đã lên lịch
  function custInfo(k) {
    var s = G.state, out = { orders: [], minDays: 99, qty: 0 };
    s.special.list.forEach(function (o) { if (o.sku === k && o.status === 'Đã nhận cọc') { var need = Math.max(0, (o.qty || 1) - (o.held || 0)); if (!need) return; out.orders.push({ type: 'dep', id: o.id, name: o.cust.name, due: o.due, left: o.due - s.day, deposit: o.deposit, qty: need }); out.qty += need; out.minDays = Math.min(out.minDays, o.due - s.day); } });
    s.b2b.orders.forEach(function (o) { if (o.status !== 'Đang thực hiện') return; o.items.forEach(function (i) { if (i.sku === k && i.qty - i.done > 0) { out.orders.push({ type: 'b2b', id: o.id, name: o.client, due: o.deadline, left: o.deadline - s.day, qty: i.qty - i.done }); out.qty += i.qty - i.done; out.minDays = Math.min(out.minDays, o.deadline - s.day); } }); });
    s.live.sessions.forEach(function (x) { if (x.status === 'Đã đặt' && x.day - s.day <= 7 && x.day >= s.day && (x.feat || []).indexOf(k) >= 0) { out.orders.push({ type: 'live', id: x.id, name: 'Livestream ngày ' + x.day, due: x.day, left: x.day - s.day, qty: 0 }); out.minDays = Math.min(out.minDays, x.day - s.day); } });
    return out;
  }
  S.custInfo = custInfo;
  function commitments(k) {
    var s = G.state, c = 0;
    s.special.list.forEach(function (o) { if (o.sku === k && o.status === 'Đã nhận cọc') c += Math.max(0, (o.qty || 1) - (o.held || 0)); });
    c += 0;
    s.b2b.orders.forEach(function (o) { if (o.status === 'Đang thực hiện') o.items.forEach(function (i) { if (i.sku === k) c += i.qty - i.done; }); });
    return c;
  }
  // phân tích 1 nguồn cho 1 SKU
  function evalSrc(k, src, need, v, have, daysLeft) {
    var s = G.state, t = G.skus[k], open = PU.srcOpen(src), ok = PU.skuOk(src.id, k);
    var o = { src: src.id, name: src.name, locked: !open, usable: ok, lead: src.lead, defect: src.defect, moq: src.moq || 0, noInvoice: !!src.noInvoice };
    if (!open) { o.why = 'Mở ở cấp ' + G.data.levels[src.minLevel].name; return o; }
    if (!ok) { o.why = 'Không bán mặt hàng này'; return o; }
    var lead = (src.lead[0] + src.lead[1]) / 2, seas = G.clamp(G.season.demand(t.type, s.day + Math.ceil(lead)) / (G.season.demand(t.type, s.day) || 1), 0.7, 1.8);
    var q = Math.max(0, Math.ceil(v * (lead + S.SAFETY) * seas) + need.commit - have);
    if (need.min) q = Math.max(q, need.min);
    q = tierBump(q); if (src.moq && q < src.moq) q = src.moq;
    var cap = Math.floor(Math.max(0, W.free('st')) / t.vol);
    o.capped = q > cap; if (o.capped) q = cap;
    if (src.moq && q < src.moq) { o.qty = 0; o.why = 'Kho không đủ chỗ cho MOQ ' + src.moq; return o; }
    o.qty = q; if (!q) { o.why = 'Không cần'; return o; }
    var quote = PU.quote(src.id, (function () { var m = {}; m[k] = q; return m; })(), 'st', false);
    o.unit = quote.unit[k]; o.tier = quote.tier; o.total = quote.total; o.goods = quote.goods; o.fee = quote.fee;
    o.rel = PU.relDisc(t.brand); o.credit = src.id !== 'cho' && (s.rel[t.brand] || 0) >= 50;
    o.afford = s.money >= quote.total; o.cash = quote.total;
    o.risk = daysLeft < src.lead[0] ? 'cao' : daysLeft < src.lead[1] ? 'vừa' : 'thấp';
    var base = G.pricing.base(k); o.margin = (base - o.unit) / base;
    var rr = G.returns ? G.returns.sourceRate(src.id) : 0; o.retRate = rr;
    var sc = o.unit * (1 + src.defect * 0.7) * (1 + rr * 1.5);
    if (o.risk === 'cao') sc *= 1.1 + 0.08 * lead; else if (o.risk === 'vừa') sc *= 1.04 + 0.02 * lead;
    if (src.noInvoice && s.level >= 1) sc *= 1.08;
    if (o.qty > (q - 0) && src.moq) sc *= 1 + Math.max(0, (src.moq - (need.base || 0)) / Math.max(1, src.moq)) * 0.05;
    if (!o.afford && !o.credit) sc *= 1.5;
    o.score = sc; return o;
  }
  S.compute = function (force) {
    var now = performance.now(); if (!force && S.cache && now - S.ct < 1200) return S.cache;
    var s = G.state, hp = helper(), cand = {}, rows = [];
    function add(k, tag) { if (!G.skus[k]) return; var c = cand[k] || (cand[k] = { tags: [] }); if (c.tags.indexOf(tag) < 0) c.tags.push(tag); }
    // top bán chạy
    var tops = Object.keys(s.sold7).map(function (k) { return [k, vel(k)]; }).filter(function (x) { return x[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6).map(function (x) { return x[0]; });
    var keys = {}; s.live.sessions.forEach(function (x) { if (x.status === 'Đã đặt' && x.day - s.day <= 7) (x.feat || []).forEach(function (k) { if (G.skus[k]) keys[k] = 1; }); }); s.lostLog.forEach(function (e) { if (s.day - e.day <= 3 && G.skus[e.sku]) keys[e.sku] = 1; }); Object.keys(s.sold7).forEach(function (k) { keys[k] = 1; }); Object.keys(s.inv).forEach(function (k) { keys[k] = 1; }); s.slots.forEach(function (sl) { if (sl.sku) keys[sl.sku] = 1; else if (sl.last) keys[sl.last] = 1; });
    s.special.list.forEach(function (o) { if (o.status === 'Đã nhận cọc') keys[o.sku] = 1; }); s.b2b.orders.forEach(function (o) { if (o.status === 'Đang thực hiện') o.items.forEach(function (i) { keys[i.sku] = 1; }); });
    Object.keys(keys).forEach(function (k) {
      if (!G.skus[k]) return;
      var st = G.life.stage(k), v = vel(k) || (onShelf(k) ? 0.4 : 0), have = W.total(k) + W.incomingQty(k), dl = v > 0 ? have / v : 99, cm = commitments(k);
      if (st < 3) {
        if (lostRecent(k) >= 1 && have < 3) add(k, 'Khách hỏi hết hàng');
        var ci = custInfo(k); if (ci.orders.some(function (o) { return o.type === 'live'; }) && have < 6) add(k, 'Livestream');
        var sdm = G.season.demand(G.skus[k].type, s.day + 3) * (G.weather ? G.weather.demand(G.skus[k].type) : 1);
        if (sdm >= 1.35 && have < Math.max(6, v * 10) && (onShelf(k) || v > 0)) add(k, 'Theo mùa');
        if (cm > 0 && have < cm) add(k, depCommit(k) > 0 && have < depCommit(k) ? 'Đơn cọc' : 'Đơn đang mở');
        if (dl < 7 && (onShelf(k) || v > 0.3)) add(k, have <= 0 ? 'Hết hàng' : 'Sắp hết');
        if (hp && tops.indexOf(k) >= 0 && dl < 14) add(k, 'Bán chạy');
      }
    });
    if (hp) G.lineList.forEach(function (l) { if (G.life.stageOfLine(l.id) !== 0 || !G.brandAvail(l.brand)) return; l.skus.forEach(function (k) { if ((k.size === '1m6' || k.size === 'Tiêu chuẩn') && W.total(k.id) === 0 && W.incomingQty(k.id) === 0 && (k.brand !== 'own' || G.lvl().oem)) add(k.id, 'Mẫu mới'); }); });
    Object.keys(cand).forEach(function (k) {
      var v = vel(k) || (onShelf(k) ? 0.4 : 0), have = W.total(k) + W.incomingQty(k), dl = v > 0 ? have / v : 99, cm = commitments(k);
      var tags = cand[k].tags, need = { commit: cm, min: tags.indexOf('Mẫu mới') >= 0 && !v ? 4 : 0, base: 0 };
      var opts = G.data.sources.map(function (src) { return evalSrc(k, src, need, v, have, dl); });
      var valid = opts.filter(function (o) { return o.usable && !o.locked && o.qty > 0; });
      if (!valid.length) return;
      var best = valid.slice().sort(function (a, b) { return a.score - b.score; })[0];
      var key = k, ed = S.edits[key], chosen = best;
      if (ed) { var forced = ed.src ? opts.filter(function (o) { return o.src === ed.src && o.usable && !o.locked; })[0] : null; if (forced) { chosen = forced; if (ed.qty > 0) { var m = {}; m[k] = ed.qty; var qq = PU.quote(forced.src, m, 'st', false); chosen = Object.assign({}, forced, { qty: ed.qty, unit: qq.unit[k] || forced.unit, tier: qq.tier, total: qq.total, goods: qq.goods, fee: qq.fee, afford: s.money >= qq.total, cash: qq.total, errors: qq.errors }); } } else if (ed.qty > 0) { var m2 = {}; m2[k] = ed.qty; var q2 = PU.quote(best.src, m2, 'st', false); chosen = Object.assign({}, best, { qty: ed.qty, unit: q2.unit[k] || best.unit, tier: q2.tier, total: q2.total, goods: q2.goods, fee: q2.fee, afford: s.money >= q2.total, cash: q2.total, errors: q2.errors }); } }
      var why = [];
      var cheaper = valid.filter(function (o) { return o.src !== best.src; });
      if (best.src === 'cho') why.push('rẻ nhất & về trong ngày'); else if (best.src === 'nhamay') why.push('giá nhà máy rẻ hơn ~12%'); else if (best.src === 'oem') why.push('hàng thương hiệu riêng, lãi cao'); else why.push('giá chuẩn, về sau ' + best.lead[0] + '-' + best.lead[1] + ' ngày');
      if (best.risk === 'cao') why.push('⚠ có thể hết hàng trước khi hàng về (' + Math.round(dl * 10) / 10 + ' ngày tồn)');
      cheaper.forEach(function (o) { if (o.unit < best.unit * 0.97 && o.noInvoice) why.push('chợ rẻ hơn nhưng KHÔNG hóa đơn: rủi ro bị kiểm tra'); else if (o.unit < best.unit * 0.97 && o.moq && o.qty > best.qty * 1.5) why.push('nhà máy rẻ hơn nhưng MOQ ' + o.moq + ' → nhập dư'); });
      if (best.credit) why.push('mua chịu 30 ngày được'); if (best.rel) why.push('chiết khấu NCC ' + Math.round(best.rel * 100) + '%');
      var warn = [];
      if (chosen.margin != null && chosen.margin < 0.08) warn.push('Lãi mỏng (' + Math.round(chosen.margin * 100) + '%) - xem lại giá bán');
      var fl = G.pricing.floor(k); if (fl && G.pricing.effective(k) < fl) warn.push('Giá bán hiện thấp hơn giá sàn của hãng!');
      if (G.returns && G.returns.skuRate(k) > 0.12) warn.push('Tỉ lệ bảo hành / đổi trả cao (' + Math.round(G.returns.skuRate(k) * 100) + '%) - cân nhắc đổi nguồn hoặc mẫu khác');
      if (chosen.retRate > 0.1) warn.push('Nguồn này có tỉ lệ hàng bị trả cao (' + Math.round(chosen.retRate * 100) + '%)');
      if (chosen.noInvoice && s.level >= 1) warn.push('Nguồn không hóa đơn → ghi vào noInvoice, dễ bị phạt khi kiểm tra');
      if (chosen.capped || best.capped) warn.push('Đã giới hạn theo sức chứa kho');
      if (!chosen.afford && !chosen.credit) warn.push('Không đủ tiền'); else if (!chosen.afford && chosen.credit) warn.push('Thiếu tiền mặt - sẽ mua chịu');
      rows.push({ key: key, sku: k, label: G.skus[k].label, tags: tags, stage: G.life.stage(k), have: have, vel: v, daysLeft: dl, commit: cm, chosen: chosen, best: best, opts: opts, why: why.join('; '), warn: warn, action: 'order', afford: chosen.afford || chosen.credit, edited: !!ed });
    });
    // nhập hàng lấy ngay: gợi ý khi nguy cơ hết hàng cao
    rows.forEach(function (r) {
      if (r.action !== 'order') return;
      var xs = (r.chosen.src === 'daily' || r.chosen.src === 'nhamay') ? r.chosen.src : 'daily';
      if (xs === 'nhamay' && PU.xSrcOk('nhamay', [G.skus[r.sku].brand])) xs = 'daily';
      if (!PU.skuOk(xs, r.sku)) return;
      var qty = Math.min(PU.XMAX_QTY, Math.max(r.chosen.qty, G.srcById[xs].moq || 0)); if (xs === 'nhamay' && qty < 20) xs = 'daily';
      var it = {}; it[r.sku] = qty; var xq = PU.quote(xs, it, 'st', false, true), nq = PU.quote(xs, it, 'st', false, false);
      if (xq.errors.length) return;
      var urgent = r.chosen.risk === 'cao' || r.tags.indexOf('Hết hàng') >= 0 || r.daysLeft < 1.5;
      r.xp = { src: xs, name: G.srcById[xs].name, qty: qty, total: xq.total, fee: xq.expFee, normal: nq.total, afford: G.state.money >= xq.total, urgent: urgent, left: PU.xLeft(), eta: PU.xEta().text };
      if (urgent && r.xp.left && !r.warn.some(function (w) { return w.indexOf('lấy ngay') >= 0; })) r.warn.push('Nguy cơ hết hàng cao - cân nhắc ⚡ Nhập lấy ngay (+' + G.fmt.short(xq.expFee) + ' phí)');
    });
    // tồn lâu / lỗi thời -> nên xả, không nhập
    if (hp) Object.keys(s.inv).concat(s.slots.map(function (x) { return x.sku; })).forEach(function (k, i, arr) {
      if (!k || !G.skus[k] || arr.indexOf(k) !== i) return;
      var st = G.life.stage(k), have = W.total(k); if (!have) return;
      var last = s.lastSold[k], stale = (last ? s.day - last : s.day) > 20 && !(vel(k) > 0);
      if (st < 3 && !stale) return;
      var base = G.pricing.base(k), fl = G.pricing.floor(k), maxPct = fl ? Math.max(0, 1 - fl / base) : 0.5, pct = Math.min(st === 3 ? 0.4 : 0.25, maxPct);
      pct = Math.floor(pct * 20) / 20;
      rows.push({ key: 'c:' + k, sku: k, label: G.skus[k].label, tags: [st === 3 ? 'Lỗi thời - nên xả' : 'Tồn lâu - đừng nhập thêm'], stage: st, have: have, vel: vel(k), action: 'clear', pct: pct, floorLimited: fl > 0 && maxPct < (st === 3 ? 0.4 : 0.25), why: (st === 3 ? 'Mẫu lỗi thời, khách chỉ trả ~60% giá. ' : 'Không bán được ' + (last ? s.day - last : '20+') + ' ngày. ') + (pct > 0 ? 'Giảm ' + Math.round(pct * 100) + '%' + (fl ? ' (không thấp hơn giá sàn hãng)' : '') + ' hoặc bán sỉ.' : 'Giá sàn hãng không cho giảm thêm: bán sỉ đầu nậu / trả NCC.'), warn: [], afford: true });
    });
    // ---- phân tầng ưu tiên: 1 đơn khách, 2 khách hỏi hết hàng, 3 mẫu trưng bày, 4 bán chạy, 5 mùa vụ, 6 mẫu mới, 7 xả ----
    var ab = G.autobuy && G.autobuy.open ? G.autobuy.open() : null;
    rows.forEach(function (r) {
      if (r.action === 'clear') { r.tier = 7; return; }
      var ci = custInfo(r.sku), t = 6; r.cust = ci; r.line = G.skus[r.sku].line;
      var ln = G.lines[r.line]; r.coll = ln.family + '|' + ln.gen;
      if (r.tags.indexOf('Đơn cọc') >= 0 || r.tags.indexOf('Đơn đang mở') >= 0 || r.tags.indexOf('Livestream') >= 0) t = 1;
      else if (r.tags.indexOf('Khách hỏi hết hàng') >= 0) t = 2;
      else if (G.shelf.isShown(r.sku) && W.lineStock(r.sku) <= 2) t = 3;
      else if (r.tags.indexOf('Hết hàng') >= 0 || r.tags.indexOf('Sắp hết') >= 0 || r.tags.indexOf('Bán chạy') >= 0) t = 4;
      else if (r.tags.indexOf('Theo mùa') >= 0) t = 5;
      r.tier = t; r.inBatch = !!(ab && ab.items.some(function (i) { return i.sku === r.sku && !i.done; }));
      if (t === 1 && ci.minDays < 99) { var late = r.chosen.lead[1] > ci.minDays; r.lateRisk = late; if (late && !r.warn.some(function (w) { return w.indexOf('trễ hạn') >= 0; })) r.warn.push('Nhập thường (' + r.chosen.lead[1] + ' ngày) có thể TRỄ hạn đơn khách (còn ' + Math.max(0, ci.minDays) + ' ngày)' + (r.xp ? ' - nên ⚡ lấy ngay' : '')); }
    });
    rows.sort(function (a, b) {
      if (a.action !== b.action) return a.action === 'order' ? -1 : 1;
      if (a.tier !== b.tier) return a.tier - b.tier;
      var da = a.cust ? a.cust.minDays : 99, db = b.cust ? b.cust.minDays : 99; if (da !== db) return da - db;
      if (a.daysLeft !== b.daysLeft) return (a.daysLeft || 99) - (b.daysLeft || 99);
      return (b.chosen ? b.chosen.cash : 0) - (a.chosen ? a.chosen.cash : 0);
    });
    S.cache = { rows: rows, helper: hp }; S.ct = now; return S.cache;
  };
  S.count = function () { return S.compute().rows.filter(function (r) { return r.action === 'order' && r.tier <= 3 && !r.inBatch && !S.inCart(r); }).length; };   // số gợi ý có ý nghĩa (tầng 1-3)
  S.countCust = function () { return S.compute().rows.filter(function (r) { return r.action === 'order' && r.tier === 1 && !S.inCart(r); }).length; };
  S.countAll = function () { return S.compute().rows.filter(function (r) { return r.action === 'order'; }).length; };
  S.tierCounts = function () { var c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }; S.compute().rows.forEach(function (r) { c[r.tier] = (c[r.tier] || 0) + 1; }); return c; };
  // đặt tất cả đơn khách (tầng 1): đơn thường, riêng món sẽ trễ hạn thì ⚡ lấy ngay nếu có
  S.tier1 = function () {
    var rows = S.compute().rows.filter(function (r) { return r.action === 'order' && r.tier === 1 && !S.inCart(r); }), plan = { rows: rows, groups: {}, total: 0, late: 0, xN: 0 };
    rows.forEach(function (r) {
      var useX = r.lateRisk && r.xp && r.xp.left > 0, src = useX ? r.xp.src : r.chosen.src, qty = useX ? r.xp.qty : r.chosen.qty, cost = useX ? r.xp.total : r.chosen.cash, key = src + (useX ? '|x' : ''), g = plan.groups[key] || (plan.groups[key] = { src: src, express: useX, items: {}, total: 0, n: 0 });
      g.items[r.sku] = (g.items[r.sku] || 0) + qty; g.total += cost; g.n++; plan.total += cost; if (r.lateRisk && !useX) plan.late++; if (useX) plan.xN++;
    });
    return plan;
  };
  S.orderTier1 = function () {
    var plan = S.tier1(), ok = 0, fail = [];
    Object.keys(plan.groups).forEach(function (k) { var g = plan.groups[k], r = PU.place(g.src, g.items, 'st', G.state.money < g.total && g.src !== 'cho', g.express); if (r.ok) ok += g.n; else fail.push(r.msg); });
    S.invalidate(); return { ok: ok > 0, msg: ok ? 'Đã đặt ' + ok + ' mặt hàng cho đơn khách' + (fail.length ? ' (lỗi: ' + fail[0] + ')' : '') : (fail[0] || 'Không có đơn khách nào cần đặt') };
  };
  // ---- GIỎ ĐỀ XUẤT: các gợi ý cùng nguồn gom thành 1 đơn; bỏ món / sửa SL ngay trong giỏ; đơn tối thiểu do người chơi chỉnh (autobuy.minOrder) ----
  // ---- GIỎ HÀNG CHUNG (G.purchasing.cart*): thêm gợi ý = thêm vào giỏ theo nguồn đã chọn ----
  S.inCart = function (r) { return r.action === 'order' && PU.cartSrcs().some(function (src) { return PU.cartQty(src, r.sku) > 0; }); };
  S.addCart = function (key) {
    var r = S.rowByKey(key); if (!r || r.action !== 'order') return { ok: false, msg: 'Gợi ý không còn' };
    PU.cartAdd(r.chosen.src, r.sku, r.chosen.qty); delete S.edits[key]; S.invalidate();
    return { ok: true, msg: 'Đã thêm ' + r.chosen.qty + ' × ' + r.label + ' vào giỏ hàng' };
  };
  S.removeCart = function (key) { var r = S.rowByKey(key); if (r && r.action === 'order') PU.cartDel(r.chosen.src, r.sku); S.invalidate(); };
  S.addTier1 = function () {
    var n = 0; S.compute().rows.forEach(function (r) { if (r.action === 'order' && r.tier === 1 && !S.inCart(r)) { PU.cartAdd(r.chosen.src, r.sku, r.chosen.qty); n++; } });
    S.invalidate(); return { ok: true, msg: n ? 'Đã thêm ' + n + ' mặt hàng cho đơn khách vào giỏ' : 'Đơn khách đã nằm trong giỏ' };
  };
  S.cartCount = function () { return PU.cartAll().skus; };
  S.rowByKey = function (key) { return S.compute().rows.filter(function (r) { return r.key === key; })[0]; };
  S.invalidate = function () { S.cache = null; };
  S.setEdit = function (key, patch) { var e = S.edits[key] || (S.edits[key] = {}); Object.assign(e, patch); S.invalidate(); };
  S.order = function (key) {
    var r = S.rowByKey(key); if (!r || r.action !== 'order') return { ok: false, msg: 'Gợi ý không còn' };
    var c = r.chosen, items = {}; items[r.sku] = c.qty;
    var res = PU.place(c.src, items, 'st', !c.afford && c.credit);
    if (res.ok) delete S.edits[key]; S.invalidate(); return res;
  };
  S.orderExpress = function (key) {
    var r = S.rowByKey(key); if (!r || r.action !== 'order' || !r.xp) return { ok: false, msg: 'Không nhập lấy ngay được' };
    var items = {}; items[r.sku] = r.xp.qty;
    var res = PU.place(r.xp.src, items, 'st', false, true); if (res.ok) delete S.edits[key]; S.invalidate(); return res;
  };
  // báo giá "nhập gấp" nhanh cho 1 SKU (dùng ở ô kệ): đại lý cấp 1, số lượng = sức chứa ô hoặc 10
  S.quickX = function (sku, qty) {
    if (!G.skus[sku] || !PU.skuOk('daily', sku)) return null;
    qty = Math.max(1, Math.min(PU.XMAX_QTY, qty || 10)); var it = {}; it[sku] = qty;
    var xq = PU.quote('daily', it, 'st', false, true), nq = PU.quote('daily', it, 'st', false, false);
    return { sku: sku, qty: qty, total: xq.total, fee: xq.expFee, normal: nq.total, errors: xq.errors, afford: G.state.money >= xq.total, left: PU.xLeft(), eta: PU.xEta().text };
  };
  S.placeQuickX = function (sku, qty) { var it = {}; it[sku] = qty; var r = PU.place('daily', it, 'st', false, true); S.invalidate(); return r; };
  S.totals = function () { var rows = S.compute().rows.filter(function (r) { return r.action === 'order' && r.afford; }), t = 0, n = 0; rows.forEach(function (r) { t += r.chosen.cash; n++; }); return { n: n, total: t, rows: rows }; };
  S.orderAll = function () {
    var rows = S.compute().rows.filter(function (r) { return r.action === 'order' && r.afford; }), by = {}, ok = 0, fail = [];
    rows.forEach(function (r) { var g = by[r.chosen.src] || (by[r.chosen.src] = { items: {}, keys: [], credit: false }); g.items[r.sku] = r.chosen.qty; g.keys.push(r.key); if (!r.chosen.afford && r.chosen.credit) g.credit = true; });
    Object.keys(by).forEach(function (src) { var g = by[src], res = PU.place(src, g.items, 'st', g.credit); if (res.ok) { ok += g.keys.length; g.keys.forEach(function (k) { delete S.edits[k]; }); } else fail.push(res.msg); });
    S.invalidate(); return { ok: ok > 0, msg: ok ? 'Đã đặt ' + ok + ' mặt hàng theo gợi ý' + (fail.length ? ' (lỗi: ' + fail[0] + ')' : '') : (fail[0] || 'Không có gợi ý nào đặt được') };
  };
  S.setAuto = function (key) { var r = S.rowByKey(key); if (!r || r.action !== 'order') return { ok: false, msg: 'Không có gợi ý' }; G.state.autoOrder[r.sku] = { min: Math.max(2, Math.ceil(r.vel * (r.chosen.lead[1] + 2))), qty: r.chosen.qty, src: r.chosen.src }; return { ok: true, msg: 'Đã bật tự động đặt (' + r.chosen.name + ')' }; };
  S.clear = function (key) { var r = S.rowByKey(key); if (!r || r.action !== 'clear') return { ok: false }; if (r.pct > 0) { G.state.clearance[r.sku] = r.pct; S.invalidate(); return { ok: true, msg: 'Đã giảm giá xả ' + Math.round(r.pct * 100) + '%' }; } return G.clearanceOps.wholesale(r.sku, G.wh.get(r.sku, 'st') || 1); };
})();
