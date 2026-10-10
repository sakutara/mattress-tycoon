/* Sự kiện ra mắt sản phẩm + chương trình ưu đãi (giảm %, flash sale, mua X tặng Y, combo, voucher) + thẻ thành viên */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ camp: { offers: [], events: [], promos: [], nextId: 1, heat: 0, heatWarned: false, member: { on: false, list: [], nextId: 1 }, reports: [], baseVisitors: 30 } });
  var SC = {
    small: { name: 'Nhỏ tại cửa hàng', cost: 3e6, traffic: 1.4, conv: 1.2, needStock: 2, needStaff: 1, rep: 2 },
    mc: { name: 'Có MC + quà tặng', cost: 15e6, traffic: 2.0, conv: 1.35, needStock: 4, needStaff: 2, rep: 4 },
    kol: { name: 'Mời KOL livestream', cost: 40e6, traffic: 3.0, conv: 1.5, needStock: 6, needStaff: 3, rep: 7 }
  };
  var CHANNEL = { none: { name: 'Không quảng bá', day: 0, boost: 1 }, flyer: { name: 'Tờ rơi', day: 300000, boost: 1.08 }, fb: { name: 'Facebúc Ads', day: 1200000, boost: 1.2 } };
  var TIERS = [['Kim cương', 60e6, 0.06, 4], ['Vàng', 20e6, 0.04, 2], ['Bạc', 5e6, 0.02, 1]];
  var C = G.campaigns = {
    SC: SC, CHANNEL: CHANNEL, TIERS: TIERS,
    // ---------- sự kiện ra mắt ----------
    eventFactor: function (ev) { return G.clamp(0.6 + 0.4 * ev.budget / SC[ev.scale].cost, 0.6, 1.4); },
    todayEvent: function () { var s = G.state; return s.camp.events.filter(function (e) { return e.day === s.day && e.status === 'Đang diễn ra'; })[0]; },
    book: function (offerId, scale, day, budget) {
      var s = G.state, off = s.camp.offers.filter(function (o) { return o.id === offerId; })[0], sc = SC[scale];
      if (!off || !sc) return { ok: false, msg: 'Chọn dòng sản phẩm và quy mô' };
      if (day <= s.day) return { ok: false, msg: 'Ngày tổ chức phải sau hôm nay' };
      budget = Math.round(Math.max(sc.cost, budget || sc.cost));
      if (s.camp.events.some(function (e) { return e.day === day && e.status === 'Đã đặt'; })) return { ok: false, msg: 'Ngày đó đã có sự kiện khác' };
      if (s.money < budget) return { ok: false, msg: 'Không đủ ngân sách ' + G.fmt.vnd(budget) };
      G.econ.expense(budget, 'ads');
      var rel = s.rel[off.brand] || 0;
      s.camp.events.push({ id: s.camp.nextId++, brand: off.brand, lineId: off.lineId, name: off.name, scale: scale, budget: budget, day: day, status: 'Đã đặt', sponsorPct: rel >= 80 ? 0.5 : rel >= 60 ? 0.3 : 0, stockOk: null, staffOk: null });
      return { ok: true, msg: 'Đã đặt sự kiện "' + off.name + '" vào ngày ' + day };
    },
    cancelEvent: function (id) {
      var s = G.state, e = s.camp.events.filter(function (x) { return x.id === id; })[0];
      if (!e || e.status !== 'Đã đặt') return;
      e.status = 'Hủy'; G.econ.cash(Math.round(e.budget * 0.5));
    },
    sampleUnits: function (lineId) { var t = 0; G.lines[lineId].skus.forEach(function (k) { t += G.wh.total(k.id); }); return t; },
    staffOnDuty: function () { return G.staff.ents.filter(function (e) { return (e.role === 'sales' || e.role === 'owner' || e.role === 'manager') && e.state !== 'leaving'; }).length; },
    // ---------- trợ giúp cho giao diện ----------
    offerById: function (id) { return G.state.camp.offers.filter(function (o) { return o.id === +id; })[0]; },
    sponsorPct: function (brand) { var rel = G.state.rel[brand] || 0; return rel >= 80 ? 0.5 : rel >= 60 ? 0.3 : 0; },
    netCost: function (brand, budget) { var sp = Math.round(budget * C.sponsorPct(brand)); return { sponsor: sp, net: budget - sp }; },
    // số người bán dự kiến có mặt vào ngày `day` (chủ + quản lý + NV bán hàng không nghỉ ca)
    sellersOn: function (day) {
      var s = G.state, n = 1;
      ['sales', 'manager'].forEach(function (r) { G.staff.byRole(r).forEach(function (x) { if (x.status === 'ok' && G.staff.shiftFor(x, day) !== 'off') n++; }); });
      return n;
    },
    conflicts: function (day) {
      var s = G.state, out = [];
      if (s.camp.events.some(function (e) { return e.day === day && (e.status === 'Đã đặt' || e.status === 'Đang diễn ra'); })) out.push({ t: 'Đã có sự kiện khác ngày này', block: true });
      if (s.live && s.live.sessions && s.live.sessions.some(function (x) { return x.day === day && x.status === 'Đã đặt'; })) out.push({ t: 'Có phiên livestream cùng ngày (chia sẻ nhân sự)' });
      if (s.closure && s.closure.day === day) out.push({ t: 'Cửa hàng bị đóng cửa tạm thời' });
      if (G.cal.weekday(day) < 5) { var h = G.season.active(day); if (!h.length) out.push({ t: 'Ngày thường: lượng khách thấp hơn cuối tuần', soft: true }); }
      return out;
    },
    sampleSku: function (lineId) { var l = G.lines[lineId]; return (l.skus.filter(function (k) { return k.size === '1m6' || k.size === 'Tiêu chuẩn'; })[0] || l.skus[0]); },
    // ước lượng kết quả (khoảng thấp-cao)
    estimate: function (scale, budget, brand, day) {
      var s = G.state, sc = SC[scale], f = G.clamp(0.6 + 0.4 * budget / sc.cost, 0.6, 1.4), base = s.camp.baseVisitors || 30;
      var hist = s.history.days.slice(-7), rv = 0, vs = 0, cg = 0; hist.forEach(function (d) { rv += d.revenue; vs += Math.max(1, d.visitors || 0); cg += d.cogs || 0; });
      var perV = vs > 0 && rv > 0 ? rv / vs : 150000, margin = rv > 0 ? G.clamp((rv - cg) / rv, 0.1, 0.5) : 0.3;
      var tm = 1 + (sc.traffic - 1) * f, cm = 1 + (sc.conv - 1) * f, wk = day != null && G.cal.weekday(day) >= 5 ? 1.2 : 1;
      var vis = base * tm * wk, rev = vis * perV * cm, extra = rev - base * wk * perV, nc = C.netCost(brand, budget).net;
      var profit = extra * margin - nc;
      return { traffic: Math.round((tm - 1) * 100), conv: Math.round((cm - 1) * 100), vis: [Math.round(vis * 0.85), Math.round(vis * 1.15)], rev: [Math.round(rev * 0.8), Math.round(rev * 1.2)], roi: [Math.round((extra * 0.8 * margin - nc) / nc * 100), Math.round((extra * 1.2 * margin - nc) / nc * 100)], rep: sc.rep, f: f, net: nc };
    },
    // đặt nhập hàng mẫu cho dòng ra mắt
    sampleOrder: function (offerId, express) {
      var o = C.offerById(offerId); if (!o) return { ok: false, msg: 'Không tìm thấy dòng sản phẩm' };
      var f = G.ui.st.cmp, sc = SC[f.scale || 'small'], k = C.sampleSku(o.lineId), have = C.sampleUnits(o.lineId), need = Math.max(1, sc.needStock - have + 1), it = {}; it[k.id] = need;
      return G.purchasing.place('daily', it, 'st', false, !!express);
    },
    // ---------- ưu đãi ----------
    inScope: function (p, sku) {
      var t = G.skus[sku], sc = p.scope; if (!sc || sc.type === 'all') return true;
      return sc.type === 'brand' ? t.brand === sc.value : t.type === sc.value;
    },
    isActive: function (p) { var s = G.state; return s.day >= p.start && s.day <= p.end; },
    discount: function (sku) {
      var s = G.state, ps = s.camp.promos, best = 0;
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i]; if ((p.kind !== 'pct' && p.kind !== 'flash') || !C.isActive(p) || !C.inScope(p, sku)) continue;
        if (p.kind === 'flash' && (s.minute < p.fromH * 60 || s.minute >= p.toH * 60)) continue;
        if (p.pct > best) best = p.pct;
      }
      return best;
    },
    storeWide: function (minPct) { return G.state.camp.promos.some(function (p) { return (p.kind === 'pct' || p.kind === 'flash') && C.isActive(p) && p.scope.type === 'all' && p.pct >= minPct; }); },
    active: function () { return G.state.camp.promos.filter(C.isActive); },
    floorWarn: function (scope, pct) {
      var n = 0;
      G.skuList.forEach(function (k) {
        if (!G.brandAvail(k.brand)) return;
        if (scope.type === 'brand' && k.brand !== scope.value) return; if (scope.type === 'type' && k.type !== scope.value) return;
        var f = G.pricing.floor(k.id); if (f && G.pricing.base(k.id) * (1 - pct) < f) n++;
      });
      return n;
    },
    create: function (o) {
      var s = G.state, dur = Math.max(1, Math.min(30, Math.floor(o.days || 3))), start = s.day + Math.max(0, Math.floor(o.startIn || 0));
      var p = { id: s.camp.nextId++, kind: o.kind, name: o.name || '', scope: o.scope || { type: 'all' }, pct: o.pct || 0, start: start, end: start + dur - 1, fromH: o.fromH || 18, toH: o.toH || 21, buyType: o.buyType, giftType: o.giftType, value: o.value || 0, minBill: o.minBill || 0, channel: o.channel || 'none', status: 'Chờ', st: { sales: 0, units: 0, revenue: 0, discount: 0, profit: 0, gifts: 0, visitors: 0, days: 0 }, holiday: o.holiday || null };
      if ((p.kind === 'pct' || p.kind === 'flash') && (p.pct < 0.02 || p.pct > 0.7)) return { ok: false, msg: 'Mức giảm từ 2% đến 70%' };
      if (p.kind === 'flash' && p.toH <= p.fromH) return { ok: false, msg: 'Khung giờ vàng không hợp lệ' };
      if (p.kind === 'combo' && (p.pct < 0.02 || p.pct > 0.5)) return { ok: false, msg: 'Combo giảm 2%-50%' };
      if (p.kind === 'voucher' && p.value < 20000) return { ok: false, msg: 'Voucher tối thiểu 20.000đ' };
      if (p.kind === 'bxgy' && (!p.buyType || !p.giftType)) return { ok: false, msg: 'Chọn loại hàng mua và quà tặng' };
      var cost = CHANNEL[p.channel].day * dur; if (s.money < cost) return { ok: false, msg: 'Không đủ tiền chạy quảng bá' };
      if (!p.name) p.name = { pct: 'Giảm ' + Math.round(p.pct * 100) + '%', flash: 'Flash sale -' + Math.round(p.pct * 100) + '%', bxgy: 'Mua ' + (G.data.types[p.buyType] || {}).name + ' tặng ' + (G.data.types[p.giftType] || {}).name, combo: 'Combo phòng ngủ -' + Math.round(p.pct * 100) + '%', voucher: 'Voucher ' + G.fmt.short(p.value) }[p.kind];
      s.camp.promos.push(p);
      return { ok: true, msg: 'Đã tạo chương trình "' + p.name + '" (' + (p.start === s.day ? 'bắt đầu hôm nay' : 'từ ngày ' + p.start) + ')' };
    },
    cancelPromo: function (id) { var s = G.state; s.camp.promos = s.camp.promos.filter(function (p) { return p.id !== id; }); },
    attributes: function (p, items) { return items.some(function (i) { return C.inScope(p, i.sku); }); },
    tierOf: function (spend) { for (var i = 0; i < TIERS.length; i++) if (spend >= TIERS[i][1]) return TIERS[i]; return null; },
    memberRebate: function (rev, revenue) {
      var m = G.state.camp.member; if (!m.on || !G.chance(0.35)) return 0;
      var rec;
      if (m.list.length && G.chance(0.5)) rec = G.pick(m.list);
      else { rec = { id: m.nextId++, spend: 0, tier: '' }; m.list.push(rec); if (m.list.length > 300) m.list.shift(); }
      rec.spend += revenue; var t = C.tierOf(rec.spend), name = t ? t[0] : '';
      if (name && name !== rec.tier) { rec.tier = name; if (name !== 'Bạc' || G.chance(0.3)) G.notify.push({ title: 'Thành viên lên hạng ' + name, text: 'Một khách hàng thân thiết đã đạt hạng ' + name + '.', type: 'good', sound: false, toast: false }); }
      return t ? Math.round(revenue * t[2]) : 0;
    },
    memberTrafficMult: function () { var m = G.state.camp.member; if (!m.on) return 1; var w = 0; m.list.forEach(function (r) { var t = C.tierOf(r.spend); w += t ? t[3] : 0.5; }); return 1 + Math.min(0.25, w / 500); },
    heatMult: function () { return 1 - Math.min(0.25, G.state.camp.heat / 80); }
  };
  // ----- móc vào mô phỏng -----
  var ct = function () {
    var s = G.state, m = 1, ev = C.todayEvent();
    if (ev) m *= 1 + (SC[ev.scale].traffic - 1) * C.eventFactor(ev);
    var adm = 1; C.active().forEach(function (p) { if (p.kind === 'pct' || p.kind === 'flash') adm *= 1 + Math.min(0.5, p.pct * 1.2) * (p.scope.type === 'all' ? 1 : 0.5); adm *= CHANNEL[p.channel].boost; });
    m *= Math.min(2.2, adm);
    return m * C.memberTrafficMult();
  };
  ct.label = 'Sự kiện / ưu đãi / thành viên'; G.trafficMods.push(ct);
  G.conversionMods.push(function (c, eff, ctx) {
    var s = G.state, m = 1, sku = ctx && ctx.sku; if (!sku) return 1;
    var ev = C.todayEvent();
    if (ev && G.skus[sku].line === ev.lineId) m *= (1 + (SC[ev.scale].conv - 1) * C.eventFactor(ev)) * (ev.stockOk === false || ev.staffOk === false ? 0.85 : 1);
    C.active().forEach(function (p) {
      if (p.kind === 'bxgy' && G.skus[sku].type === p.buyType) m *= 1.12;
      else if (p.kind === 'combo' && G.skus[sku].type === 'dem') m *= 1.1;
      else if (p.kind === 'voucher') m *= 1.05;
    });
    if (!C.storeWide(0.05) && !C.active().some(function (p) { return (p.kind === 'pct' || p.kind === 'flash') && C.discount(sku) > 0; })) m *= C.heatMult();
    if (G.season.isActive('bf', s.day)) m *= C.storeWide(0.1) ? 1.15 : 0.82;
    return m;
  });
  G.on('lineReleased', function (e) {
    var s = G.state;
    s.camp.offers.push({ id: s.camp.nextId++, brand: e.brand, lineId: e.line.id, name: G.brandName(e.brand) + ' ' + e.line.name, expires: s.day + 14 });
    var offId = s.camp.nextId - 1;
    G.notify.push({ title: 'Hãng ' + G.brandName(e.brand) + ' ra mắt dòng mới', text: e.line.name + ' - tổ chức sự kiện ra mắt (còn 14 ngày).', type: 'info', sound: false, action: { label: 'Mở sự kiện ra mắt', fn: function () { G.ui.openCamp && G.ui.openCamp(offId); } }, onClick: function () { G.ui.openCamp && G.ui.openCamp(offId); } });
  });
  G.on('dayStart', function () {
    var s = G.state, cp = s.camp;
    cp.offers = cp.offers.filter(function (o) { return s.day <= o.expires; });
    cp.events.forEach(function (e) {
      if (e.status === 'Đã đặt' && s.day > e.day) e.status = 'Hủy';
      if (e.status === 'Đã đặt' && e.day === s.day) {
        e.status = 'Đang diễn ra';
        if (e.sponsorPct) { var sp = Math.round(e.budget * e.sponsorPct); G.econ.cash(sp); G.notify.push({ title: G.brandName(e.brand) + ' tài trợ sự kiện', text: '+' + G.fmt.vnd(sp) + ' (quan hệ NCC tốt).', type: 'good', sound: false }); }
        G.notify.push({ title: 'Hôm nay: sự kiện ra mắt ' + e.name, text: 'Cần đủ hàng mẫu & nhân viên có mặt!', type: 'good', sound: 'good' });
      }
    });
    cp.events = cp.events.filter(function (e) { return e.status === 'Đã đặt' || e.status === 'Đang diễn ra' || s.day - e.day < 20; });
    cp.promos.forEach(function (p) {
      if (p.status === 'Chờ' && s.day >= p.start && s.day <= p.end) p.status = 'Đang chạy';
      if (p.status === 'Đang chạy' && s.day > p.end) C.finish(p);
      else if (p.status === 'Đang chạy') { var cost = CHANNEL[p.channel].day; if (cost) { G.econ.expense(cost, 'ads'); p.st.ad = (p.st.ad || 0) + cost; } }
    });
    cp.promos = cp.promos.filter(function (p) { return p.status !== 'Xong'; });
    if (cp.member.on && G.cal.dom(s.day) === 1) G.econ.expense(1000000, 'ads');
  });
  C.finish = function (p) {
    var s = G.state, st = p.st, base = s.camp.baseVisitors, ad = st.ad || 0;
    p.status = 'Xong';
    var rep = { name: p.name, days: st.days, visitorsPerDay: st.days ? st.visitors / st.days : 0, base: base, sales: st.sales, revenue: st.revenue, discount: st.discount, ad: ad, profit: st.profit - ad };
    s.camp.reports.unshift(rep); if (s.camp.reports.length > 8) s.camp.reports.pop();
    G.notify.modal({
      title: 'Báo cáo chương trình: ' + p.name, def: 0,
      html: '<table class="tbl small"><tr><td>Số ngày chạy</td><td class="r">' + st.days + '</td></tr><tr><td>Khách/ngày (trước CT: ' + Math.round(base) + ')</td><td class="r">' + Math.round(rep.visitorsPerDay) + '</td></tr><tr><td>Đơn / sản phẩm</td><td class="r">' + st.sales + ' / ' + st.units + '</td></tr><tr><td>Doanh thu thuộc CT</td><td class="r">' + G.fmt.vnd(st.revenue) + '</td></tr><tr><td>Giá trị giảm giá / quà</td><td class="r">' + G.fmt.vnd(st.discount) + '</td></tr><tr><td>Chi phí quảng bá</td><td class="r">' + G.fmt.vnd(ad) + '</td></tr><tr class="tot"><td>Lợi nhuận thực</td><td class="r ' + (rep.profit >= 0 ? 'pos' : 'neg') + '">' + G.fmt.vnd(rep.profit) + '</td></tr></table>',
      choices: [{ label: 'Đóng', cls: 'primary' }]
    });
  };
  G.on('hour', function (h) {
    var s = G.state;
    if (h.hour !== 10) return;
    var ev = C.todayEvent(); if (!ev) return;
    var sc = SC[ev.scale];
    ev.stockOk = C.sampleUnits(ev.lineId) >= sc.needStock; ev.staffOk = C.staffOnDuty() >= sc.needStaff;
    if (!ev.stockOk || !ev.staffOk) G.notify.push({ title: 'Sự kiện chuẩn bị chưa tốt', text: (ev.stockOk ? '' : 'Thiếu hàng mẫu (cần ≥' + sc.needStock + '). ') + (ev.staffOk ? '' : 'Thiếu nhân viên có mặt (cần ≥' + sc.needStaff + ').'), type: 'bad', sound: 'bad' });
  });
  G.on('sale', function (e) {
    var s = G.state, items = e.items, cp = s.camp;
    C.active().forEach(function (p) {
      var attr = false, disc = 0;
      if (p.kind === 'pct' || p.kind === 'flash') {
        items.forEach(function (i) { var d = C.discount(i.sku); if (d > 0 && C.inScope(p, i.sku)) { attr = true; var orig = Math.round(G.pricing.base(i.sku) * (1 - (s.clearance[i.sku] || 0)) / 1000) * 1000; disc += Math.max(0, orig - i.price) * i.qty; } });
      } else if (p.kind === 'bxgy') {
        if (items.some(function (i) { return G.skus[i.sku].type === p.buyType; })) {
          var cand = G.skuList.filter(function (k) { return k.type === p.giftType && G.wh.total(k.id) > 0; }).sort(function (a, b) { return a.cost - b.cost; })[0];
          if (cand && G.deposits.take(cand.id)) { var gc = s.costBasis[cand.id] || cand.cost; G.econ.cogs(gc); disc += gc; attr = true; p.st.gifts++; }
        }
      } else if (p.kind === 'combo') {
        var have = {}; items.forEach(function (i) { have[G.skus[i.sku].type] = (have[G.skus[i.sku].type] || 0) + i.price * i.qty; });
        if (have.dem && have.ga && have.goi) { var rb = Math.round((have.dem + have.ga + have.goi) * p.pct); G.econ.income(-rb, 'sales'); disc += rb; attr = true; }
      } else if (p.kind === 'voucher') {
        if (e.revenue >= p.minBill && G.chance(0.45)) { G.econ.income(-p.value, 'sales'); disc += p.value; attr = true; }
      }
      if (!attr) return;
      p.st.sales++; p.st.units += items.reduce(function (a, i) { return a + i.qty; }, 0); p.st.revenue += e.revenue - (p.kind === 'combo' || p.kind === 'voucher' ? disc : 0); p.st.discount += disc;
      p.st.profit += e.revenue - e.cogs - (p.kind === 'combo' || p.kind === 'voucher' ? disc : 0) - (p.kind === 'bxgy' ? disc : 0);
    });
    var rb = C.memberRebate(0, e.revenue); if (rb > 0) G.econ.income(-rb, 'sales');
  });
  G.on('report', function (rep) { // economy phát 'report' trước khi reset số liệu ngày
    var s = G.state, cp = s.camp, act = C.active();
    // báo cáo / hiệu ứng sự kiện ra mắt
    var ev = C.todayEvent();
    if (ev) {
      var sc = SC[ev.scale], ok = ev.stockOk !== false && ev.staffOk !== false;
      if (ok) { for (var i = 0; i < 3; i++) G.reviews.add(5, { force: true, launch: true }); s.rep = G.clamp(s.rep + sc.rep, 0, 100); }
      else {
        if (ev.stockOk === false) { for (var j = 0; j < 3; j++) G.reviews.add(2, { force: true, angry: 'stock' }); s.rep = G.clamp(s.rep - 1, 0, 100); }
        if (ev.staffOk === false) { for (var k = 0; k < 2; k++) G.reviews.add(2, { force: true, angry: 'wait' }); s.rep = G.clamp(s.rep - 0.5, 0, 100); }
      }
      ev.status = 'Xong'; ev.result = { visitors: rep.visitors, revenue: rep.revenue, ok: ok };
      G.notify.modal({ title: 'Kết quả sự kiện: ' + ev.name, def: 0, sound: ok ? 'good' : 'bad', html: '<p>Quy mô: ' + SC[ev.scale].name + '. Khách hôm nay: <b>' + rep.visitors + '</b>, doanh thu <b>' + G.fmt.vnd(rep.revenue) + '</b>.</p><p>' + (ok ? 'Chuẩn bị tốt: nhiều khách hài lòng, danh tiếng +' + sc.rep + '.' : 'Chuẩn bị chưa tốt (' + (ev.stockOk === false ? 'thiếu hàng mẫu ' : '') + (ev.staffOk === false ? 'thiếu nhân viên' : '') + '): khách thất vọng, đánh giá xấu.') + '</p>', choices: [{ label: 'Đóng', cls: 'primary' }] });
    }
    act.forEach(function (p) { p.st.visitors += rep.visitors; p.st.days++; });
    if (!act.length && !ev) cp.baseVisitors = cp.baseVisitors * 0.8 + rep.visitors * 0.2;
    // chờ sale
    var h = 0;
    act.forEach(function (p) { if (p.kind === 'pct' || p.kind === 'flash' || p.kind === 'combo') { var w = (p.scope && p.scope.type === 'all') ? 1 : 0.5, pc = p.pct * 100 * w * 0.12 * (p.pct >= 0.4 ? 2 : 1); h = Math.max(h, pc); if (p.end - p.start >= 9) h += 1; if (p.pct >= 0.4) s.rep = G.clamp(s.rep - 0.1, 0, 100); } });
    if (h > 0) cp.heat = Math.min(60, cp.heat + h); else cp.heat = Math.max(0, cp.heat - 0.8);
    if (cp.heat > 15 && !cp.heatWarned) { cp.heatWarned = true; G.notify.push({ title: 'Khách bắt đầu "chờ sale"', text: 'Giảm giá quá sâu / quá lâu: khách chờ khuyến mãi mới mua, giảm mua giá gốc.', type: 'warn' }); }
    if (cp.heat < 5) cp.heatWarned = false;
  });
  // trang trí canvas: băng rôn + bóng bay
  G.on('drawOverlay', function (ctx) {
    var s = G.state, ev = C.todayEvent(), pr = C.active().filter(function (p) { return p.kind === 'pct' || p.kind === 'flash'; })[0];
    if (!ev && !pr) return;
    if (!G.clock.isOpen()) return;
    var L = G.layout.get(), T = G.sprites.T, W = L.cols * T, t = performance.now() / 600;
    var SPR = G.sprites;
    var P = SPR.P, HXs = SPR.HX, HYs = SPR.HY;
    function wb(gx, u, v) { return SPR.wallBack(gx, u, v); }
    function wtext(gx, u, v, txt, font, col, al) { var o = wb(gx, u, v); ctx.save(); ctx.transform(HXs / T, HYs / T, 0, 1, o[0], o[1]); ctx.fillStyle = col; ctx.font = font; ctx.textAlign = al || 'left'; ctx.fillText(txt, 0, 0); ctx.restore(); }
    if (ev) {
      var cxw = W / 2;
      SPR.poly(ctx, [wb(cxw, -130, 14), wb(cxw, 130, 14), wb(cxw, 130, 30), wb(cxw, -130, 30)], '#f08a8a'); SPR.poly(ctx, [wb(cxw, -130, 14), wb(cxw, 130, 14), wb(cxw, 130, 18), wb(cxw, -130, 18)], '#d9707a');
      wtext(cxw, 0, 18.5, 'RA MẮT: ' + ev.name.toUpperCase(), 'bold 11px sans-serif', '#FFF3A0', 'center');
      ['#f4b6c2', '#9fd0f0', '#ffd06b', '#8fcf7a', '#d4c6f2', '#f0a24a'].forEach(function (col, i) {
        var gx = (L.door.x + (i - 2.5) * 0.9 + 0.5) * T, gy = (L.door.y - 0.9) * T, z = 64 + Math.sin(t + i) * 4, b = P(gx, gy, z), b0 = P(gx, gy, 6);
        ctx.strokeStyle = '#b8aec8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b[0], b[1] + 12); ctx.lineTo(b0[0], b0[1]); ctx.stroke();
        SPR.hexagon(ctx, b[0], b[1], 10, col, 1.25);
      });
    }
    if (pr) { var pw = [wb(0, 6, 44), wb(0, 150, 44), wb(0, 150, 60), wb(0, 6, 60)]; SPR.poly(ctx, pw, '#f08a8a'); wtext(0, 12, 48, 'KHUYẾN MÃI -' + Math.round(pr.pct * 100) + '%', 'bold 11px sans-serif', '#fff'); }
  });
})();
