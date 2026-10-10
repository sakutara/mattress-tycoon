/* Thủ kho tự ĐẶT HÀNG theo nhu cầu (tốc độ bán, khách hỏi hết hàng, đơn cọc / B2B, livestream, dự báo thời tiết) trong ngân sách tháng.
   Chế độ: 'list' (mặc định mới: gom MỘT danh sách cần mua để duyệt trước khi mở cửa), 'auto' (tự đặt), 'approve' (duyệt từng món). Không có Thủ kho thì không có đề xuất. */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ autobuy: { mode: 'list', paused: false, budget: 30e6, spent: 0, month: 0, maxCover: 14, log: [], pending: [], nextId: 1, batch: null, hist: [], nextBatch: 1 } });
  var AB = G.autobuy = {
    active: function () { return G.staff.byRole('warehouse').some(function (x) { return x.status === 'ok'; }); },
    st: function () { var a = G.state.autobuy; if (!a.hist) a.hist = []; if (a.batch === undefined) a.batch = null; if (!a.nextBatch) a.nextBatch = 1; return a; },
    reasonFor: function (r) {
      var s = G.state, k = r.sku, t = G.skus[k], code = G.sprites && G.sprites.codeOf ? G.sprites.codeOf(k) : k, why = [], lost = G.suggest.lostRecent(k);
      if (lost >= 1) why.push(lost + ' khách hỏi mẫu ' + code + ' hết hàng');
      if (r.tags.indexOf('Đơn cọc') >= 0) why.push('đơn cọc đang mở');
      if (r.tags.indexOf('Đơn đang mở') >= 0) why.push('đơn lớn B2B');
      if (s.live.sessions.some(function (x) { return x.status === 'Đã đặt' && x.day - s.day <= 3 && (x.feat || []).indexOf(k) >= 0; })) why.push('livestream sắp tới');
      if (G.shelf.isShown(k) && G.wh.lineStock(k) <= 2) why.push('mẫu trưng bày ' + code + ' sắp hết');
      var fc = G.weather ? G.weather.forecast().map(function (d) { return d.t; }) : [];
      if (t.type === 'chan' && fc.indexOf('ret') >= 0) why.push('dự báo rét');
      if (t.type === 'ga' && fc.indexOf('nong') >= 0 && t.cw && /tencel|lụa|satin/.test(t.cw.mat)) why.push('dự báo nóng, bộ lụa mát');
      if (t.type === 'dem' && fc.indexOf('nom') >= 0) why.push('dự báo nồm ẩm');
      if (!why.length) why.push('sắp hết: còn ~' + (r.daysLeft > 90 ? '∞' : r.daysLeft.toFixed(1)) + ' ngày (tồn ' + r.have + ', bán ~' + (r.vel || 0).toFixed(1) + '/ngày)');
      return why.join('; ');
    },
    log: function (e) { var a = AB.st(); a.log.unshift(e); if (a.log.length > 40) a.log.pop(); },
    minOrder: function () { var a = AB.st(); return a.minOrder == null ? 10e6 : a.minOrder; },
    pItems: function (p) { return p.items || [{ sku: p.sku, qty: p.qty, reason: p.reason, tier: p.tier }]; },
    // đơn dưới mức tối thiểu chỉ được đặt khi có món khẩn (đơn khách / sắp hết hẳn)
    belowMin: function (total, urgent) { return !urgent && total < AB.minOrder(); },
    // p = một đơn hàng gom theo nguồn: {src, items:[{sku,qty,reason,tier}], cost, urgent}
    place: function (p) {
      var s = G.state, a = AB.st(), items = {}, its = AB.pItems(p), lab = its.map(function (i) { return G.skus[i.sku].label; }).join(', ');
      its.forEach(function (i) { items[i.sku] = (items[i.sku] || 0) + i.qty; });
      var tier1 = its.some(function (i) { return i.tier === 1; });
      if (!tier1 && a.spent + p.cost > a.budget) { AB.log({ day: s.day, ok: false, text: 'Bỏ qua (vượt ngân sách tháng): ' + lab }); return false; }
      var r = G.purchasing.place(p.src, items, 'st', false);
      if (!r.ok) { AB.log({ day: s.day, ok: false, text: 'Không đặt được: ' + r.msg }); return false; }
      a.spent += p.cost; if (r.order) r.order.autoBy = 'thukho';
      its.forEach(function (i) { AB.log({ day: s.day, sku: i.sku, qty: i.qty, ok: true, cost: p.cost, text: i.qty + ' × ' + G.skus[i.sku].label + ' từ ' + G.srcById[p.src].name + ' (gộp 1 đơn ' + its.length + ' món) - ' + i.reason }); });
      return true;
    },
    // ---- phân tích nhu cầu -> danh sách ứng viên ----
    candidates: function (urgentOnly) {
      var s = G.state, a = AB.st(), out = [];
      var rows = G.suggest.compute(true).rows.filter(function (r) { return r.action === 'order'; });
      rows.forEach(function (r) {
        var c = r.chosen, t = G.skus[r.sku], lost = G.suggest.lostRecent(r.sku);
        var urgent = r.tags.indexOf('Hết hàng') >= 0 || r.tags.indexOf('Sắp hết') >= 0 || r.tags.indexOf('Đơn cọc') >= 0 || r.tags.indexOf('Đơn đang mở') >= 0 || lost >= 1 || (G.shelf.isShown(r.sku) && G.wh.lineStock(r.sku) <= 2) || r.daysLeft < c.lead[1] + 3;
        if (r.tier === 1) urgent = true;
        if (!urgent || !c.qty || G.life.stage(r.sku) >= 3) return;
        var veryUrgent = r.tags.indexOf('Hết hàng') >= 0 || r.daysLeft < 1.5 || lost >= 2;
        if (urgentOnly && !veryUrgent) return;
        if (s.orders.some(function (o) { return o.status !== 'Đã về kho' && o.items[r.sku] && o.autoBy === 'thukho'; })) return;
        var qty = c.qty, vel = r.vel || 0, cap = Math.max(2, Math.ceil(vel * a.maxCover) - r.have + (r.commit || 0)); if (vel > 0 && lost === 0 && r.tags.indexOf('Đơn cọc') < 0) qty = Math.min(qty, cap);
        if (t.type === 'chan' && G.weather && G.weather.forecast().some(function (d) { return d.t === 'ret'; })) qty = Math.ceil(qty * 1.3);
        // chỉ vài khách hỏi (không phải đơn cọc/B2B) thì đừng nhập cả lô: ~2 sản phẩm cho mỗi khách hỏi + nhu cầu 1 tuần; nếu nguồn đòi tối thiểu (MOQ) thì dùng số lượng gốc
        var origQty = qty, isOrder = r.tier === 1 || r.tags.indexOf('Đơn cọc') >= 0 || r.tags.indexOf('Đơn đang mở') >= 0;
        if (!isOrder && lost >= 1 && r.have <= 0) qty = Math.min(qty, Math.max(2, lost * 2 + Math.ceil(vel * 7)));
        var mk = function (n) { var m = {}; m[r.sku] = n; return m; };
        var srcUse = c.src, q = G.purchasing.quote(srcUse, mk(qty), 'st', false);
        if (q.errors.length && qty !== origQty) { // nguồn đòi MOQ lớn: thử đại lý cấp 1 (không MOQ) với số lượng nhỏ, không được thì quay lại lô gốc
          var alt = c.src !== 'daily' ? G.purchasing.quote('daily', mk(qty), 'st', false) : null;
          if (alt && !alt.errors.length) { srcUse = 'daily'; q = alt; } else { qty = origQty; q = G.purchasing.quote(srcUse, mk(qty), 'st', false); }
        }
        if (q.errors.length) return;
        // đơn khách chỉ cần vài cái mà nguồn rẻ nhất bắt nhập cả lô MOQ: ưu tiên đại lý cấp 1 đúng số cần nếu kịp hạn giao
        if (r.tier === 1 && r.cust && r.cust.qty && srcUse !== 'daily') {
          var needQ = Math.max(1, r.cust.qty - (r.have || 0));
          if (qty > needQ * 3) {
            var dsrc = G.srcById && G.srcById.daily, inTime = !dsrc || !dsrc.lead || dsrc.lead[1] <= (r.cust.minDays || 99);
            var alt2 = inTime ? G.purchasing.quote('daily', mk(needQ), 'st', false) : null;
            if (alt2 && !alt2.errors.length) { srcUse = 'daily'; qty = needQ; q = alt2; }
          }
        }
        out.push({ sku: r.sku, qty: qty, src: srcUse, express: false, cost: q.total, reason: AB.reasonFor(r), tier: r.tier, cust: r.cust && r.cust.orders.length ? r.cust.orders.slice(0, 3) : null, minDays: r.cust ? r.cust.minDays : 99, urgent: veryUrgent || r.tier === 1, risk: c.risk, tags: r.tags.slice(), daysLeft: r.daysLeft, have: r.have });
      });
      return out;
    },
    // ---- chế độ cũ: tự đặt / duyệt từng món ----
    run: function (urgentOnly) {
      var s = G.state, a = AB.st(); if (!AB.active() || a.paused) return 0;
      if (a.month !== G.cal.monthNo(s.day)) { a.month = G.cal.monthNo(s.day); a.spent = 0; }
      if (a.mode === 'list') return AB.buildBatch(urgentOnly);
      var n = 0, PU = G.purchasing, by = {};
      var inPending = {}; a.pending.forEach(function (x) { AB.pItems(x).forEach(function (i) { inPending[i.sku] = 1; }); });
      AB.candidates(false).slice(0, 12).forEach(function (p) {
        if (inPending[p.sku]) return;
        var g = by[p.src] || (by[p.src] = { src: p.src, items: [], map: {}, urgent: false });
        g.items.push({ sku: p.sku, qty: p.qty, reason: p.reason, tier: p.tier }); g.map[p.sku] = (g.map[p.sku] || 0) + p.qty; if (p.urgent || p.tier === 1) g.urgent = true;
      });
      Object.keys(by).forEach(function (k) {
        var g = by[k], q = PU.quote(g.src, g.map, 'st', false); if (q.errors.length) return;
        if (AB.belowMin(q.total, g.urgent)) return;          // chưa đủ mức đơn tối thiểu: chờ gom thêm
        var p = { src: g.src, items: g.items, cost: q.total, urgent: g.urgent, day: s.day, id: a.nextId++ };
        if (a.mode === 'approve') { a.pending.push(p); n++; G.notify.push({ title: 'Thủ kho đề xuất 1 đơn hàng', text: g.items.length + ' mặt hàng từ ' + G.srcById[g.src].name + ' · ' + G.fmt.short(q.total), type: 'info', sound: false, toast: false }); }
        else if (AB.place(p)) n++;
      });
      if (n) G.suggest.invalidate();
      return n;
    },
    approve: function (id) { var a = AB.st(), p = a.pending.filter(function (x) { return x.id === id; })[0]; if (!p) return { ok: false, msg: 'Đề xuất không còn' }; a.pending = a.pending.filter(function (x) { return x !== p; }); var ok = AB.place(p); return { ok: ok, msg: ok ? 'Đã đặt hàng theo đề xuất của Thủ kho' : 'Không đặt được (xem nhật ký)' }; },
    skip: function (id) { var a = AB.st(); a.pending = a.pending.filter(function (x) { return x.id !== id; }); },
    expire: function () { var a = AB.st(), d = G.state.day; a.pending = a.pending.filter(function (p) { return d - p.day <= 2; }); },
    // ================= DANH SÁCH CẦN MUA (một lượt duyệt) =================
    batch: function () { var b = AB.st().batch; return b && b.status === 'open' ? b : null; },
    open: function () { var b = AB.batch(); return b && b.items.length ? b : null; },
    closeBatch: function (status) {
      var a = AB.st(), b = a.batch; if (!b) return; b.status = status === 'Đã duyệt' ? 'done' : 'closed'; b.result = status; var tot = 0, n = 0;
      b.items.forEach(function (i) { if (i.done) { n++; tot += i.doneCost || 0; } });
      a.hist.unshift({ day: b.day, id: b.id, status: status, n: n, planned: b.items.length, total: tot, items: b.items.slice(0, 8).map(function (i) { return { sku: i.sku, qty: i.qty, done: !!i.done }; }) }); if (a.hist.length > 20) a.hist.pop();
      a.batch = null; G.emit && G.emit('uiRefresh');
    },
    buildBatch: function (urgentOnly) {
      var s = G.state, a = AB.st(), cand = AB.candidates(urgentOnly);
      var cur = AB.batch();
      if (!cand.length) { return 0; }
      if (cur) { cand = cand.filter(function (p) { return !cur.items.some(function (i) { return i.sku === p.sku; }); }); if (!cand.length) return 0; }
      else { cur = a.batch = { id: a.nextBatch++, day: s.day, status: 'open', items: [], shown: false, mid: !!urgentOnly }; }
      cand.sort(function (x, y) { return (x.tier || 9) - (y.tier || 9) || (x.minDays || 99) - (y.minDays || 99); });
      // đơn khách (nhóm 1) không bao giờ bị cắt; các nhóm còn lại tối đa 12 dòng/ngày để danh sách duyệt gọn
      var room = Math.max(0, 12 - cur.items.filter(function (i) { return i.tier !== 1; }).length);
      cand = cand.filter(function (p) { return p.tier === 1; }).concat(cand.filter(function (p) { return p.tier !== 1; }).slice(0, room));
      if (!cand.length) return 0;
      cand.forEach(function (p) { cur.items.push({ uid: a.nextId++, sku: p.sku, qty: p.qty, src: p.src, express: p.tier === 1 && p.minDays < 99 && p.risk === 'cao' ? false : false, include: true, reason: p.reason, urgent: p.urgent, tier: p.tier || 6, cust: p.cust, minDays: p.minDays, daysLeft: p.daysLeft, risk: p.risk }); });
      if (urgentOnly) { cur.shown = false; G.notify.push({ title: 'Thủ kho: ' + cand.length + ' mặt hàng cần mua gấp', text: 'Danh sách cần duyệt đã được cập nhật.', type: 'warn', sound: false, action: { label: 'Xem danh sách', fn: function () { G.ui.openAbReview && G.ui.openAbReview(); } } }); }
      return cand.length;
    },
    // đối chiếu lại: món đã được bù bằng đơn khác / không còn nhu cầu -> đánh dấu
    refresh: function () {
      var b = AB.batch(); if (!b) return; var rows = {}; G.suggest.compute(true).rows.forEach(function (r) { if (r.action === 'order') rows[r.sku] = r; });
      b.items.forEach(function (i) { if (i.done) return; i.covered = !rows[i.sku]; if (i.covered) i.include = false; i.valid = G.purchasing.skuOk(i.src, i.sku); });
    },
    // tuỳ chọn nguồn cho 1 món: [{src,name,unit,total,lead,risk,noInvoice,ok,why}]
    options: function (i) {
      var PU = G.purchasing, out = [];
      G.data.sources.forEach(function (src) {
        if (!PU.srcOpen(src) || !PU.skuOk(src.id, i.sku)) return;
        var q = Math.max(i.qty, src.moq || 0), m = {}; m[i.sku] = q; var qt = PU.quote(src.id, m, 'st', false);
        var o = { src: src.id, name: src.name, unit: qt.unit[i.sku], total: qt.total, lead: src.lead, noInvoice: !!src.noInvoice, ok: !qt.errors.length, why: qt.errors[0] || '' };
        o.late = i.daysLeft != null && src.lead[1] > i.daysLeft;
        out.push(o);
      });
      return out;
    },
    // tính tiền theo nhóm nguồn (hưởng chiết khấu số lượng): trả {groups:[{key,src,express,items,quote}], total, cash, over, vol, free, cashShort, budgetLeft, flags}
    totals: function (b) {
      var s = G.state, a = AB.st(), PU = G.purchasing, groups = {}, tot = 0, vol = 0, running = 0, budgetLeft = Math.max(0, a.budget - a.spent);
      b.items.forEach(function (i) {
        i.err = ''; i.overBudget = false; if (i.done) return;
        if (i.covered) { i.err = 'Đã đủ hàng (có đơn khác bù)'; return; }
        if (!PU.skuOk(i.src, i.sku)) { i.err = 'Nguồn này không bán mặt hàng'; return; }
        if (!i.include) return;
        var k = i.src + (i.express ? '|x' : ''), g = groups[k] || (groups[k] = { key: k, src: i.src, express: !!i.express, items: [], map: {} }); g.items.push(i); g.map[i.sku] = (g.map[i.sku] || 0) + Math.max(1, Math.floor(i.qty));
      });
      var list = Object.keys(groups).map(function (k) { return groups[k]; });
      list.forEach(function (g) {
        var q = PU.quote(g.src, g.map, 'st', false, g.express); g.quote = q;
        if (q.errors.length) g.err = q.errors[0];
        g.items.forEach(function (i) { var u = q.unit[i.sku] || 0; i.unit = u; i.line = u * Math.max(1, Math.floor(i.qty)); if (g.err) i.err = g.err; });
        g.total = q.total; g.vol = q.vol;
      });
      // vượt ngân sách tháng: gắn cờ theo thứ tự ưu tiên (đơn khách trước -> món tầng thấp bị cắt trước)
      var flat = []; list.forEach(function (g) { g.items.forEach(function (i) { flat.push(i); }); }); flat.sort(function (x, y) { return (x.tier || 9) - (y.tier || 9); });
      flat.forEach(function (i) { running += i.line || 0; if (running > budgetLeft) i.overBudget = true; });
      list.forEach(function (g) { if (!g.err) { tot += g.total; vol += g.vol; } });
      var free = G.wh.free('st');
      return { groups: list, total: tot, cash: s.money, cashShort: tot > s.money, vol: vol, free: free, overCap: vol > free, budgetLeft: budgetLeft, overBudget: tot > budgetLeft, n: b.items.filter(function (i) { return i.include && !i.done && !i.covered && !i.err; }).length };
    },
    // đặt các món được chọn: mỗi giỏ (cùng nguồn) thành MỘT đơn hàng; onlyKey = chỉ đặt giỏ đó. Trả {ok, placed, failed[]}
    commit: function (b, onlyKey) {
      var s = G.state, a = AB.st(), PU = G.purchasing, placed = 0, failed = [], T = AB.totals(b);
      T.groups.forEach(function (g) {
        if (onlyKey && g.key !== onlyKey) return;     // đặt riêng 1 giỏ (1 nguồn = 1 đơn hàng)
        if (g.err) { failed.push(g.err); return; }
        if (AB.belowMin(g.total, g.items.some(function (i) { return i.urgent || i.tier === 1; }))) { failed.push(G.srcById[g.src].name + ': đơn ' + G.fmt.short(g.total) + ' dưới mức tối thiểu ' + G.fmt.short(AB.minOrder()) + ' - thêm món hoặc hạ mức tối thiểu'); return; }
        var credit = false, q = g.quote;
        if (s.money < q.total) { var qc = PU.quote(g.src, g.map, 'st', true, g.express); if (!qc.errors.length && g.src !== 'cho') credit = true; else { failed.push(G.srcById[g.src].name + ': không đủ tiền' + (g.src === 'cho' ? ' (chợ không bán chịu)' : ' / chưa đủ quan hệ để mua chịu')); return; } }
        var r = PU.place(g.src, g.map, 'st', credit, g.express);
        if (!r.ok) { failed.push(G.srcById[g.src].name + ': ' + r.msg); return; }
        if (r.order) r.order.autoBy = 'thukho';
        a.spent += q.total;
        g.items.forEach(function (i) { i.done = true; i.doneCost = i.line; placed++; AB.log({ day: s.day, sku: i.sku, qty: i.qty, ok: true, cost: i.line, text: i.qty + ' × ' + G.skus[i.sku].label + ' từ ' + G.srcById[g.src].name + (g.express ? ' ⚡' : '') + (credit ? ' (chịu)' : '') + ' - ' + i.reason }); });
      });
      var left = b.items.filter(function (i) { return !i.done; });
      if (placed) G.suggest.invalidate();
      if (!left.length) AB.closeBatch('Đã duyệt');
      return { ok: placed > 0, placed: placed, failed: failed };
    },
    skipBatch: function (why) { var b = AB.batch(); if (!b) return; var n = b.items.filter(function (i) { return !i.done; }).length; AB.log({ day: G.state.day, ok: false, text: 'Bỏ qua danh sách ' + n + ' mặt hàng' + (why ? ' (' + why + ')' : '') }); AB.closeBatch(b.items.some(function (i) { return i.done; }) ? 'Duyệt một phần' : 'Bỏ qua'); },
    approveAll: function () { var b = AB.batch(); if (!b) return { ok: false }; b.items.forEach(function (i) { if (!i.done && !i.covered) i.include = true; }); return AB.commit(b); },
    unreviewed: function () { var b = AB.open(); return b ? b.items.filter(function (i) { return !i.done && !i.covered; }).length : 0; }
  };
  G.on('dayStart', function () {
    var a = AB.st(), s = G.state;
    AB.expire();
    var old = AB.batch(); if (old) { AB.log({ day: s.day - 1, ok: false, text: 'Danh sách ngày ' + old.day + ' hết hạn chưa duyệt' }); AB.closeBatch('Hết hạn'); }
    if (a.mode !== 'list') { AB.run(false); return; }
    var n = AB.run(false);
    if (n && (G.clock.skipping)) AB.approveAll();                  // tua nhanh / debug: duyệt tất cả như chế độ tự động
    else if (n && G.settings.autoOpen) { AB.skipBatch('tự động mở cửa'); G.notify.push({ title: 'Thủ kho: danh sách ' + n + ' mặt hàng bị bỏ qua', text: 'Đã bật tự động mở cửa nên không duyệt kịp. Xem tab Nhập.', type: 'warn', sound: false }); }
  });
  G.on('hour', function (h) { if (h.hour === 12 || h.hour === 17) { var a = AB.st(); if (a.mode === 'list' && G.clock.skipping) { if (AB.run(true)) AB.approveAll(); } else AB.run(a.mode === 'list'); } });
  G.on('monthStart', function () { var a = AB.st(); a.spent = 0; a.month = G.cal.monthNo(G.state.day); });
  // mở cửa (kể cả tự động mở) khi còn danh sách chưa duyệt -> ghi nhận bỏ qua
  var _open = G.clock.openShop;
  G.clock.openShop = function () { var b = AB.open(); if (b && !G.clock.skipping && AB.unreviewed()) { AB.skipBatch('mở cửa luôn'); G.notify.push({ title: 'Đã bỏ qua danh sách cần mua', text: 'Bạn mở cửa khi chưa duyệt. Xem lại ở tab Nhập.', type: 'info', sound: false, toast: false }); } _open.apply(G.clock, arguments); };
})();
