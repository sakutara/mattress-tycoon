/* Kho (cửa hàng + kho ngoài), kệ trưng bày, chuyển hàng nội bộ, xả hàng */
(function () {
  'use strict';
  var G = window.G;
  G.data.warehouses = [
    { id: 'gan1', name: 'Kho Cầu Giấy (gần)', near: true, cap: 150, rent: 4e6, deposit: 8e6, dist: 3, minLevel: 1, desc: 'Gần cửa hàng: thuê đắt, phí chuyển thấp, chuyển hàng ngay.' },
    { id: 'gan2', name: 'Kho Hà Đông (gần)', near: true, cap: 260, rent: 6.5e6, deposit: 13e6, dist: 7, minLevel: 2, desc: 'Gần, sức chứa vừa.' },
    { id: 'xa1', name: 'Kho Thường Tín (ngoại thành)', near: false, cap: 650, rent: 5e6, deposit: 10e6, dist: 28, minLevel: 1, desc: 'Xa: thuê rẻ, sức chứa lớn, phí mỗi chuyến cao, mất 1 ngày.' },
    { id: 'xa2', name: 'Kho Phú Xuyên (ngoại thành xa)', near: false, cap: 1400, rent: 8e6, deposit: 16e6, dist: 45, minLevel: 2, desc: 'Rất xa, rất rẻ và rất lớn.' }
  ];
  G.whById = {};
  G.data.warehouses.forEach(function (w) { G.whById[w.id] = w; });
  G.addDefaults({ inv: {}, slots: [], whRent: {}, whUpgrades: 0, transfers: [], ownTruck: false, costBasis: {}, bGrade: {}, hidden: {}, clearance: {}, noInvoice: {}, nextSlotId: 1, showUnits: {}, lostLog: [], setVer: 0 });

  var W = G.wh = {
    TRIP_VOL: 60,
    cap: function (loc) {
      if (loc === 'st') return Math.round(G.lvl().whBase * (1 + 0.3 * G.state.whUpgrades));
      return G.state.whRent[loc] ? G.whById[loc].cap : 0;
    },
    locName: function (loc) { return loc === 'st' ? 'Kho cửa hàng' : (G.whById[loc] ? G.whById[loc].name : loc); },
    locs: function () { return ['st'].concat(Object.keys(G.state.whRent)); },
    get: function (sku, loc) { var r = G.state.inv[sku]; return r ? (r[loc] || 0) : 0; },
    add: function (sku, n, loc) {
      var inv = G.state.inv; if (!inv[sku]) inv[sku] = {};
      inv[sku][loc] = (inv[sku][loc] || 0) + n;
      if (inv[sku][loc] <= 0) delete inv[sku][loc];
      if (!Object.keys(inv[sku]).length) delete inv[sku];
    },
    vol: function (sku) { return G.skus[sku].vol; },
    used: function (loc) {
      var t = 0, inv = G.state.inv;
      Object.keys(inv).forEach(function (k) { if (inv[k][loc] && G.skus[k]) t += inv[k][loc] * G.skus[k].vol; });
      return t;
    },
    incoming: function (loc) {
      var t = 0, s = G.state;
      (s.orders || []).forEach(function (o) { if (o.status !== 'Đã về kho' && o.dest === loc) Object.keys(o.items).forEach(function (k) { t += o.items[k] * G.skus[k].vol; }); });
      s.transfers.forEach(function (tr) { if (tr.to === loc) t += tr.qty * G.skus[tr.sku].vol; });
      return t;
    },
    free: function (loc) { return W.cap(loc) - W.used(loc) - W.incoming(loc); },
    shelfQty: function (sku) { var t = 0; G.state.slots.forEach(function (sl) { if (sl.sku === sku) t += sl.qty; }); return t; },
    stockQty: function (sku) { var t = 0, r = G.state.inv[sku]; if (r) Object.keys(r).forEach(function (k) { t += r[k]; }); return t; },
    total: function (sku) { return W.stockQty(sku); },   // hàng bán được (mẫu trưng bày không tính)
    // lấy n sản phẩm để bán: kho cửa hàng trước, rồi kho ngoài. Trả {n, locs:{loc:n}}
    take: function (sku, n) {
      var s = G.state, got = 0, locs = {}, order = ['st'].concat(Object.keys(s.whRent));
      order.forEach(function (l) { if (got >= n) return; var h = W.get(sku, l), t = Math.min(h, n - got); if (t > 0) { W.add(sku, -t, l); got += t; locs[l] = t; } });
      return { n: got, locs: locs };
    },
    lineStock: function (sku) { var t = G.skus[sku]; if (!t) return 0; var n = 0; G.lines[t.line].skus.forEach(function (k) { n += W.stockQty(k.id); }); return n; },
    pickSource: function (sku) { var order = ['st'].concat(Object.keys(G.state.whRent)); for (var i = 0; i < order.length; i++) if (W.get(sku, order[i]) > 0) return order[i]; return null; },
    logLost: function (sku, why, n) {
      var s = G.state, t = G.skus[sku]; if (!t) return; s.lostLog.push({ day: s.day, sku: sku, line: t.line, type: t.type, n: n || 1, why: why || 'het' }); if (s.lostLog.length > 160) s.lostLog.shift();
    },
    incomingQty: function (sku) { var t = 0; (G.state.orders || []).forEach(function (o) { if (o.status !== 'Đã về kho' && o.items[sku]) t += o.items[sku]; }); G.state.transfers.forEach(function (tr) { if (tr.sku === sku) t += tr.qty; }); return t; },
    // khoảng cách từ cửa hàng tới loc
    dist: function (loc) { return loc === 'st' ? 0 : G.whById[loc].dist; },
    transportMult: function () {
      var m = 1; if (G.staff && G.staff.count('warehouse') > 0) m *= 0.85; if (G.state.ownTruck) m *= 0.7; return m;
    },
    // chi phí chuyển `vol` khối lượng giữa 2 địa điểm (theo khoảng cách + khối lượng, nhiều hàng 1 chuyến rẻ hơn mỗi đơn vị)
    transportCost: function (from, to, vol) {
      var d = from === 'st' ? W.dist(to) : (to === 'st' ? W.dist(from) : W.dist(from) + W.dist(to));
      if (from === 'sup') d = W.dist(to) + 5;
      if (d <= 0) return 0;
      var trips = Math.ceil(vol / W.TRIP_VOL);
      return Math.round(trips * (100000 + d * 40000) * W.transportMult() / 1000) * 1000;
    },
    isFar: function (from, to) { return Math.max(W.dist(from === 'sup' ? 'st' : from), W.dist(to === 'sup' ? 'st' : to)) >= 20; },
    // Chuyển hàng. Trả {ok,msg}
    transfer: function (sku, qty, from, to) {
      var s = G.state;
      qty = Math.floor(qty);
      if (qty <= 0 || from === to) return { ok: false, msg: 'Số lượng không hợp lệ' };
      if (W.get(sku, from) < qty) return { ok: false, msg: 'Không đủ hàng trong ' + W.locName(from) };
      var v = qty * G.skus[sku].vol;
      if (W.free(to) < v) return { ok: false, msg: W.locName(to) + ' không đủ chỗ (cần ' + v + ', trống ' + Math.max(0, Math.floor(W.free(to))) + ')' };
      var cost = W.transportCost(from, to, v);
      if (s.money < cost) return { ok: false, msg: 'Không đủ tiền vận chuyển ' + G.fmt.vnd(cost) };
      G.econ.expense(cost, 'transport');
      W.add(sku, -qty, from);
      if (W.isFar(from, to)) { s.transfers.push({ sku: sku, qty: qty, to: to, arriveDay: s.day + 1 }); return { ok: true, msg: 'Đã chuyển, hàng về sau 1 ngày (phí ' + G.fmt.vnd(cost) + ')' }; }
      W.add(sku, qty, to);
      return { ok: true, msg: 'Đã chuyển ' + qty + ' (phí ' + G.fmt.vnd(cost) + ')' };
    },
    rent: function (id) {
      var d = G.whById[id], s = G.state;
      if (s.whRent[id]) return { ok: false, msg: 'Đã thuê rồi' };
      if (s.level < d.minLevel) return { ok: false, msg: 'Chưa đủ cấp cửa hàng' };
      if (s.money < d.deposit + d.rent) return { ok: false, msg: 'Không đủ tiền cọc + tháng đầu' };
      s.money -= d.deposit; G.econ.expense(d.rent, 'whrent');
      s.whRent[id] = { since: s.day, deposit: d.deposit };
      return { ok: true, msg: 'Đã thuê ' + d.name };
    },
    cancel: function (id) {
      var s = G.state;
      if (!s.whRent[id]) return { ok: false, msg: 'Chưa thuê' };
      if (W.used(id) > 0 || W.incoming(id) > 0) return { ok: false, msg: 'Kho còn hàng, hãy chuyển hết trước khi trả' };
      s.money += s.whRent[id].deposit; delete s.whRent[id];
      return { ok: true, msg: 'Đã trả kho, nhận lại tiền cọc' };
    },
    upgradeCost: function () { var s = G.state; return 5e6 * (s.level + 1) * (s.whUpgrades + 1); },
    upgrade: function () {
      var s = G.state, lv = G.lvl();
      if (s.whUpgrades >= lv.whUpMax) return { ok: false, msg: 'Đã tối đa cho cấp này (cần nâng cấp cửa hàng)' };
      var c = W.upgradeCost(); if (s.money < c) return { ok: false, msg: 'Không đủ tiền' };
      s.money -= c; s.whUpgrades++; return { ok: true, msg: 'Đã mở rộng kho cửa hàng' };
    }
  };

  // ---------- Kệ / giường TRƯNG BÀY MẪU: mỗi ô giữ đúng 1 sản phẩm mẫu (qty luôn = 1); bán từ KHO ----------
  var S = G.shelf = {
    ensure: function () {
      var s = G.state, lv = G.lvl();
      var ns = lv.shelves * G.data.shelfSlotsPerUnit, nb = lv.beds;
      var cs = 0, cb = 0;
      s.slots.forEach(function (x) { if (x.kind === 'shelf') cs++; else cb++; });
      while (cs < ns) { s.slots.push({ id: s.nextSlotId++, kind: 'shelf', sku: null, qty: 0 }); cs++; }
      while (cb < nb) { s.slots.push({ id: s.nextSlotId++, kind: 'bed', sku: null, qty: 0, set: null }); cb++; }
    },
    ordinals: function () {
      var cs = 0, cb = 0; var o = {};
      G.state.slots.forEach(function (x) { o[x.id] = x.kind === 'shelf' ? cs++ : cb++; });
      return o;
    },
    byId: function (id) { return G.state.slots.filter(function (x) { return x.id === id; })[0]; },
    fits: function (slot, sku) { var t = G.skus[sku]; if (!t) return false; return slot.kind === 'bed' ? t.type === 'dem' : t.type !== 'dem'; },
    capOf: function () { return 1; },
    release: function () {}, sweep: function () { return 0; },
    isShown: function (sku) { var ln = G.skus[sku] && G.skus[sku].line; return G.state.slots.some(function (x) { return (x.sku && G.skus[x.sku].line === ln) || (x.set && G.skus[x.set].line === ln); }); },
    // dòng hàng của `sku` đã được trưng bày ở một ô KHÁC (mẫu hoặc bộ phủ giường)?
    shownElsewhere: function (slotId, sku) {
      var ln = G.skus[sku] && G.skus[sku].line; if (!ln) return false;
      return G.state.slots.some(function (x) { return x.id !== slotId && ((x.sku && G.skus[x.sku].line === ln) || (x.set && G.skus[x.set].line === ln)); });
    },
    // trả 1 mẫu về kho (đánh dấu là hàng trưng bày: bán giảm giá nhẹ)
    // chọn kho còn chỗ nhận lại (kho cửa hàng trước); null nếu đầy
    backLoc: function (sku, extra) { var v = G.skus[sku].vol, locs = W.locs(); for (var i = 0; i < locs.length; i++) if (W.free(locs[i]) - (extra && extra[locs[i]] || 0) >= v) return locs[i]; return null; },
    giveBack: function (sku, force) { var s = G.state; if (!sku) return true; var loc = S.backLoc(sku) || (force ? 'st' : null); if (!loc) return false; W.add(sku, 1, loc); s.showUnits[sku] = (s.showUnits[sku] || 0) + 1; return true; },
    // chọn kích cỡ làm mẫu: ưu tiên sku đã chọn, nếu hết thì cỡ khác cùng dòng còn hàng
    pickSize: function (sku) { if (W.pickSource(sku)) return sku; var t = G.skus[sku]; if (!t) return null; var l = G.lines[t.line].skus.filter(function (k) { return W.pickSource(k.id); }); return l.length ? l[0].id : null; },
    takeOne: function (sku) {
      var s = G.state, src = W.pickSource(sku); if (!src) return false;
      W.add(sku, -1, src); if ((s.showUnits[sku] || 0) > 0) s.showUnits[sku]--; return true;
    },
    clear: function (slot) {
      var ex = {}, ok = true;
      [slot.sku, slot.set].forEach(function (k) { if (!k) return; var l = S.backLoc(k, ex); if (!l) ok = false; else ex[l] = (ex[l] || 0) + G.skus[k].vol; });
      if (!ok) return false; // kho không đủ chỗ: giữ nguyên mẫu trên kệ
      if (slot.sku) { slot.last = slot.sku; S.giveBack(slot.sku); }
      if (slot.set) { S.giveBack(slot.set); slot.set = null; }
      slot.sku = null; slot.qty = 0; return true;
    },
    // đặt mẫu `sku` vào ô (lấy 1 sản phẩm từ kho). Trả {ok,msg}
    assign: function (slotId, sku) {
      var slot = S.byId(slotId);
      if (!slot) return { ok: false, msg: 'Không có ô trưng bày' };
      if (!sku) { S.clear(slot); return { ok: true }; }
      if (!S.fits(slot, sku)) return { ok: false, msg: slot.kind === 'bed' ? 'Giường trưng bày chỉ đặt mẫu đệm (bộ chăn ga chọn riêng)' : 'Đệm phải đặt ở khu giường trưng bày' };
      if (slot.sku && G.skus[slot.sku].line === G.skus[sku].line) return { ok: true };
      if (S.shownElsewhere(slotId, sku)) return { ok: false, msg: 'Mẫu này đang trưng bày ở ô khác' };
      sku = S.pickSize(sku); if (!sku) return { ok: false, msg: 'Kho chưa có sản phẩm này để làm mẫu - hãy nhập ít nhất 1' };
      if (slot.sku) { slot.last = slot.sku; S.giveBack(slot.sku, true); }
      S.takeOne(sku); slot.sku = sku; slot.qty = 1; slot.last = sku;
      return { ok: true, msg: 'Đã trưng bày mẫu: ' + G.skus[sku].label };
    },
    assignQty: function (slotId, sku) { return S.assign(slotId, sku); },
    // chọn bộ chăn ga gối phủ lên giường mẫu
    assignSet: function (slotId, sku) {
      var slot = S.byId(slotId); if (!slot || slot.kind !== 'bed') return { ok: false, msg: 'Chỉ giường trưng bày mới phủ bộ chăn ga' };
      if (!sku) { if (slot.set) { if (!S.giveBack(slot.set)) return { ok: false, msg: 'Kho không đủ chỗ nhận lại' }; slot.set = null; } return { ok: true }; }
      var t = G.skus[sku]; if (!t || t.type !== 'ga') return { ok: false, msg: 'Chọn một bộ chăn ga gối' };
      if (slot.set && G.skus[slot.set].line === t.line) return { ok: true };
      if (S.shownElsewhere(slotId, sku)) return { ok: false, msg: 'Bộ này đang trưng bày ở ô khác' };
      sku = S.pickSize(sku); if (!sku) return { ok: false, msg: 'Kho chưa có bộ này - hãy nhập ít nhất 1 bộ làm mẫu' };
      t = G.skus[sku];
      if (slot.set) S.giveBack(slot.set, true);
      S.takeOne(sku); slot.set = sku;
      return { ok: true, msg: 'Giường mẫu đã phủ bộ ' + t.cw.code + ' ' + t.cw.name };
    },
    fill: function () { return 0; },
    unload: function (slot) { if (!slot.sku) return { ok: false, msg: 'Ô trống' }; if (!S.clear(slot)) return { ok: false, msg: 'Kho không đủ chỗ nhận lại' }; return { ok: true, msg: 'Đã gỡ mẫu về kho (hàng trưng bày)' }; },
    // bán luôn mẫu đang trưng bày với giá giảm 15% (thu tiền ngay)
    sellSample: function (slotId) {
      var slot = S.byId(slotId); if (!slot || !slot.sku) return { ok: false, msg: 'Ô trống' };
      var sku = slot.sku, price = Math.round(G.pricing.effective(sku) * 0.85 / 1000) * 1000;
      G.econ.income(price, 'sales'); G.econ.cogs(G.state.costBasis[sku] || G.skus[sku].cost); G.econ.addStat('units', 1);
      slot.last = sku; slot.sku = null; slot.qty = 0;
      return { ok: true, msg: 'Đã bán mẫu trưng bày giá ' + G.fmt.vnd(price) + ' (giảm 15%)' };
    },
    // tự trưng bày: ưu tiên mẫu đa dạng (loại, hãng, họ màu) từ hàng có trong kho
    autoArrange: function () {
      var s = G.state, placed = 0, shown = {};
      s.slots.forEach(function (x) { if (x.sku) shown[x.sku] = true; });
      var typeCnt = {}; s.slots.forEach(function (x) { if (x.sku) typeCnt[G.skus[x.sku].type] = (typeCnt[G.skus[x.sku].type] || 0) + 1; });
      var cand = Object.keys(s.inv).filter(function (k) { return G.skus[k] && W.stockQty(k) > 0 && G.life.stage(k) < 3 && !shown[k]; });
      function score(k) { var t = G.skus[k]; return -(G.life.stage(k) === 0 ? 3 : 0) - (t.size === '1m6' || t.size === 'Tiêu chuẩn' ? 2 : 0) - (W.stockQty(k) > 4 ? 1 : 0) + Math.random() * 0.5; }
      s.slots.forEach(function (sl) {
        if (sl.sku) return; var list = cand.filter(function (k) { return !shown[k] && S.fits(sl, k) && !S.shownElsewhere(sl.id, k); });
        if (!list.length) return;
        // cân bằng loại: chọn loại đang ít mẫu nhất
        list.sort(function (a, b) { return ((typeCnt[G.skus[a].type] || 0) - (typeCnt[G.skus[b].type] || 0)) || (score(a) - score(b)); });
        var k = list[0]; if (S.assign(sl.id, k).ok) { shown[k] = true; typeCnt[G.skus[k].type] = (typeCnt[G.skus[k].type] || 0) + 1; placed++; }
      });
      // giường: phủ bộ chăn ga còn trống
      s.slots.forEach(function (sl) {
        if (sl.kind !== 'bed' || !sl.sku || sl.set) return;
        var sets = Object.keys(s.inv).filter(function (k) { return G.skus[k] && G.skus[k].type === 'ga' && W.stockQty(k) > 0 && G.life.stage(k) < 3 && !shown[k] && !S.shownElsewhere(sl.id, k) && (G.skus[k].size === '1m6' || G.skus[k].size === '1m8'); });
        if (sets.length) { var ks = sets[Math.floor(Math.random() * sets.length)]; if (S.assignSet(sl.id, ks).ok) { shown[ks] = true; placed++; } }
      });
      return placed;
    },
    quickPlace: function (sku) {
      var s = G.state, slot = s.slots.filter(function (x) { return !x.sku && S.fits(x, sku); })[0];
      if (!slot) return { ok: false, msg: 'Không còn ô trưng bày trống phù hợp - hãy thay một mẫu cũ' };
      return S.assign(slot.id, sku);
    }
  };

  // ---------- Xả hàng ----------
  G.clearanceOps = {
    discount: function (sku, pct) { G.state.clearance[sku] = pct; return { ok: true }; },
    wholesaleUnit: function (sku) { var t = G.skus[sku]; return Math.round(t.list * 0.55 * G.life.ACCEPT[G.life.stage(sku)] / 1000) * 1000; },
    wholesale: function (sku, qty) {
      var have = W.get(sku, 'st'); qty = Math.min(qty, have);
      if (qty <= 0) return { ok: false, msg: 'Chỉ bán sỉ được hàng đang nằm trong kho cửa hàng' };
      var amt = qty * G.clearanceOps.wholesaleUnit(sku);
      W.add(sku, -qty, 'st'); G.econ.income(amt, 'wholesale'); G.econ.cogs(qty * (G.state.costBasis[sku] || G.skus[sku].cost));
      return { ok: true, msg: 'Bán sỉ ' + qty + ' cho đầu nậu, thu ' + G.fmt.vnd(amt) };
    },
    gift: function (sku, qty) {
      var have = W.get(sku, 'st'); qty = Math.min(qty, have);
      if (qty <= 0) return { ok: false, msg: 'Kho cửa hàng không có hàng' };
      W.add(sku, -qty, 'st'); G.econ.cogs(qty * (G.state.costBasis[sku] || G.skus[sku].cost));
      G.state.rep = Math.min(100, G.state.rep + qty * 0.03);
      return { ok: true, msg: 'Đã tặng kèm ' + qty + ' sản phẩm cho khách (danh tiếng tăng nhẹ)' };
    },
    returnOk: function (sku) { var s = G.state, t = G.skus[sku]; return !G.brandById[t.brand].noBrand && ((s.rel || {})[t.brand] || 0) >= 60; },
    returnSup: function (sku, qty) {
      if (!G.clearanceOps.returnOk(sku)) return { ok: false, msg: 'Cần quan hệ NCC ≥ 60 (hàng thương hiệu)' };
      var have = W.get(sku, 'st'); qty = Math.min(qty, have);
      if (qty <= 0) return { ok: false, msg: 'Kho cửa hàng không có hàng' };
      var amt = Math.round(qty * (G.state.costBasis[sku] || G.skus[sku].cost) * 0.9);
      W.add(sku, -qty, 'st'); G.econ.cash(amt);
      return { ok: true, msg: 'Trả lại NCC ' + qty + ', hoàn ' + G.fmt.vnd(amt) + ' (phí 10%)' };
    }
  };

  G.on('init', function () {
    var s = G.state; S.ensure();
    if (s.setVer < 2) { // PASS 19: mô hình trưng bày mẫu - hàng thừa trên kệ trả về kho, mỗi ô giữ 1 mẫu
      s.slots.forEach(function (sl) { if (sl.sku) { var extra = Math.max(0, (sl.qty || 0) - 1); if (extra > 0) W.add(sl.sku, extra, 'st'); sl.qty = 1; } else sl.qty = 0; if (sl.kind === 'bed' && sl.set === undefined) sl.set = null; });
      s.showUnits = s.showUnits || {}; s.lostLog = s.lostLog || []; s.setVer = 2;
    }
  });
  G.on('levelUp', S.ensure);
  G.on('dayStart', function () {
    var s = G.state;
    s.transfers = s.transfers.filter(function (tr) {
      if (s.day >= tr.arriveDay) { W.add(tr.sku, tr.qty, tr.to); return false; }
      return true;
    });
  });
  G.on('monthStart', function () {
    var s = G.state;
    Object.keys(s.whRent).forEach(function (id) { G.econ.expense(G.whById[id].rent, 'whrent'); });
  });
  // thất thoát hàng (giảm khi có kế toán)
  G.on('dayEnd', function () {
    var s = G.state;
    var p = 0.2 * (1 - Math.min(0.9, G.econ.taxReduction() * 2));
    if (!G.chance(p)) return;
    var ks = Object.keys(s.inv).filter(function (k) { return s.inv[k].st > 0; });
    if (!ks.length) return;
    var k = G.pick(ks), n = Math.min(s.inv[k].st, G.randInt(1, 2));
    W.add(k, -n, 'st'); G.econ.cogs(n * (s.costBasis[k] || G.skus[k].cost));
    G.notify.push({ title: 'Thất thoát hàng', text: 'Mất ' + n + ' × ' + G.skus[k].label + ' trong kho (kế toán giúp giảm thất thoát).', type: 'warn', sound: false, toast: false });
  });
})();
