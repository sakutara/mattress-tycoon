/* Giao hàng cho khách (quầy / đặt riêng / livestream): GIAO TRONG NGÀY nếu đặt trước 17h, sau 17h giao sáng mai; hỏa tốc 1-2 giờ tới 20h; NV giao hàng của shop theo lịch chuyến */
(function () {
  'use strict';
  var G = window.G;
  var OPEN = 480, CUT = 1020, EXP_CUT = 1200, CLOSE = 1260, LAST = 1240;
  G.SHIP = { OPEN: OPEN, CUTOFF: CUT, EXPRESS_CUTOFF: EXP_CUT };
  // pickup / transit = số phút game; late = xác suất trễ thêm 60-180 phút; (GHTK rẻ nhưng hay trôi sang sáng mai)
  G.data.carriers = [
    { id: 'ghtk', short: 'GHTK', name: 'Giao Hàng Tiếc Kiệm', base: 25000, perVol: 6000, pickup: [90, 180], transit: [180, 360], late: 0.22, damage: 0.05, desc: 'Rẻ nhất, chậm, dễ trôi sang sáng mai' },
    { id: 'ahamuve', short: 'Ahamuve', name: 'Ahamuve', base: 40000, perVol: 5000, pickup: [40, 70], transit: [120, 200], late: 0.10, damage: 0.04, desc: 'Tốt cho hàng cồng kềnh (phí/đv thấp)' },
    { id: 'vtpot', short: 'Viettel Pót', name: 'Viettel Pót', base: 40000, perVol: 9000, pickup: [60, 120], transit: [180, 300], late: 0.04, damage: 0.02, desc: 'Chậm hơn nhưng đáng tin, ít hư hàng' },
    { id: 'grap', short: 'Grap', name: 'Grap Express', base: 70000, perVol: 14000, pickup: [20, 40], transit: [60, 120], late: 0.06, damage: 0.03, desc: 'Nhanh nhất trong ngày, đắt' },
    { id: 'own', short: 'NV nhà', name: 'NV giao hàng của cửa hàng', base: 0, perVol: 0, pickup: [10, 20], transit: [45, 90], late: 0.03, damage: 0.01, desc: 'Miễn phí, theo lịch chuyến còn lại trong ngày', own: true },
    { id: 'express', short: 'Hỏa tốc', name: '⚡ Hỏa tốc (Grap Express)', base: 140000, perVol: 30000, pickup: [10, 20], transit: [40, 90], late: 0.04, damage: 0.02, desc: 'Giao trong 1-2 giờ, nhận đến 20h', express: true }
  ];
  G.carrierById = {}; G.data.carriers.forEach(function (c) { G.carrierById[c.id] = c; });
  G.addDefaults({ shipping: { orders: [], nextId: 1, auto: 'ghtk', tripsUsed: 0, busy: {}, expressOn: true, stats: { delivered: 0, failed: 0, late: 0, damaged: 0, express: 0 } } });
  function hm(m) { return G.cal.hm(m); }
  var SH = G.shipping = {
    TRIP_VOL: function () { return G.state.ownTruck ? 120 : 60; },
    byId: function (id) { return G.state.shipping.orders.filter(function (o) { return o.id === id; })[0]; },
    tripsCap: function () {
      var s = G.state, t = 0;
      G.staff.byRole('delivery').forEach(function (x) { if (x.status === 'ok' && G.staff.shiftFor(x, s.day) !== 'off') t += Math.max(1, Math.round(3 * G.staff.eff(x))); });
      return t;
    },
    tripsLeft: function () { return Math.max(0, SH.tripsCap() - G.state.shipping.tripsUsed); },
    fee: function (carrier, vol) { return Math.round((carrier.base + carrier.perVol * vol) / 1000) * 1000; },
    // ---- mốc 17h ----
    isShopDay: function () { var s = G.state; return !s.prep && s.minute >= OPEN && s.minute < CLOSE; },
    now: function () { var s = G.state; return s.prep ? OPEN : s.minute; },
    sameDayOk: function () { return SH.now() < CUT; },
    expressOk: function () { return !!G.state.shipping.expressOn && SH.now() < EXP_CUT; },
    minsToCutoff: function () { return Math.max(0, CUT - SH.now()); },
    countdownText: function () {
      var m = Math.ceil(SH.minsToCutoff()); if (m <= 0) return null; var h = Math.floor(m / 60);
      return 'Còn ' + (h ? h + 'h' : '') + (m % 60 ? ' ' + (m % 60) + 'p' : '') + ' để đặt giao TRONG NGÀY (trước 17h)';
    },
    wantsShip: function (items) {
      var bulky = items.some(function (i) { return G.skus[i.sku].type === 'dem'; });
      return G.chance(bulky ? 0.9 : 0.12);
    },
    newOrder: function (spec) {
      var s = G.state, vol = 0; spec.items.forEach(function (i) { vol += G.skus[i.sku].vol * i.qty; });
      return { id: s.shipping.nextId++, day: s.day, createdMin: SH.now(), items: spec.items, rev: spec.rev, cogs: spec.cogs, vol: vol, cod: spec.cod, paid: false, carrier: null, fee: 0, status: 'Chờ đặt',
        cust: { name: spec.name || (G.pick(G.data.lastNames) + ' ' + G.pick(G.data.firstNames)), tol: spec.tol || 1, black: !!spec.black }, late: false, damaged: false, note: spec.note || '', source: spec.source || 'online', urgent: spec.urgent != null ? spec.urgent : G.chance(0.15) };
    },
    autoBook: function (o) {
      var s = G.state, a = s.shipping.auto;
      if (!a) { G.notify.push({ title: 'Đơn giao mới #' + o.id, text: (SH.sameDayOk() ? 'Đặt ship trước 17h để giao trong ngày.' : 'Đã quá 17h: giao sáng mai (hoặc chọn hỏa tốc tới 20h).') + ' Vào tab Giao hàng.', type: 'info', sound: false }); return; }
      if (o.urgent && SH.expressOk()) { var r = SH.book(o.id, 'express', true, { payExp: G.state.shipping.expPay !== false }); if (r.ok) return; }
      var r2 = SH.book(o.id, a === 'express' ? (SH.expressOk() ? 'express' : 'grap') : a, true); if (!r2.ok && a !== 'ghtk') SH.book(o.id, 'ghtk', true);
    },
    createFromSale: function (c, rev, cogs, force) {
      if (!force && !SH.wantsShip(c.items)) return null;
      var o = SH.newOrder({ items: c.items.map(function (i) { return { sku: i.sku, qty: i.qty, price: i.price, defect: i.defect }; }), rev: rev, cogs: cogs, cod: G.chance(0.55), name: c.name, tol: c.tol, black: c.black, source: 'retail' });
      G.state.shipping.orders.push(o); SH.autoBook(o); return o;
    },
    createOnline: function (spec) {
      var o = SH.newOrder({ items: spec.items, rev: spec.rev, cogs: spec.cogs, cod: spec.cod, name: spec.name, black: spec.black, note: spec.note, source: spec.source || 'online', urgent: spec.urgent != null ? spec.urgent : G.chance(spec.source === 'live' ? 0.25 : 0.15) });
      if (spec.special) { o.special = true; o.paid = true; }
      G.state.shipping.orders.push(o); SH.autoBook(o); return o;
    },
    // ---- lập lịch giao: trả {pickup, arriveDay, arriveMin, promiseDay, promiseMin, morning} ----
    // exact=false: dùng giá trị trung bình (xem trước); true: ngẫu nhiên
    plan: function (o, car, startDay, startMin, exact, morning) {
      var s = G.state, mid = function (a) { return exact ? G.randInt(a[0], a[1]) : Math.round((a[0] + a[1]) / 2); }, f = morning ? 0.6 : 1;
      var pick = Math.round(mid(car.pickup) * f), tr = Math.round(mid(car.transit) * f); if (!car.own && !car.express && o.vol >= 6 && car.id !== 'ahamuve') tr += 30;
      var out = { pickup: startMin + pick, morning: !!morning, express: !!car.express };
      if (car.own) { // NV giao hàng: chọn người rảnh sớm nhất, mỗi chuyến ~90 phút
        var trips = Math.max(1, Math.ceil(o.vol / SH.TRIP_VOL())), best = null;
        G.staff.byRole('delivery').forEach(function (x) { if (x.status !== 'ok' || G.staff.shiftFor(x, startDay) === 'off') return; var free = Math.max(startMin, (s.shipping.busy[x.id] || 0)); if (!best || free < best.free) best = { st: x, free: free }; });
        if (!best) return { ok: false, reason: 'Chưa có NV Giao hàng đang làm việc' };
        var planned = best.free + 25 + (trips - 1) * 90 + 45;
        if (planned > 1200 || SH.tripsLeft() < trips) return { ok: false, reason: SH.tripsLeft() < trips ? 'Hết lượt giao hôm nay' : 'NV đã kín lịch trước 20h' };
        out.pickup = best.free + 25; out.staff = best.st.id; out.busyUntil = best.free + trips * 90; out.trips = trips; pick = out.pickup - startMin; tr = planned - out.pickup;
      }
      var planned2 = startMin + pick + tr, promise = planned2 + (car.express ? 20 : 45), slip = G.chance(car.late + (G.weather ? G.weather.shipDelay() : 0)) ? G.randInt(60, 180) * (G.weather && G.weather.shipDelay() > 0.3 ? 1.6 : 1) : 0; slip = Math.round(slip);
      out.arriveDay = startDay; out.promiseDay = startDay;
      if (planned2 > LAST) { out.arriveDay = startDay + 1; out.arriveMin = exact ? 540 + G.randInt(0, 120) : 600; out.promiseDay = startDay + 1; out.promiseMin = 720; out.morning = true; out.nextDay = true; }
      else {
        out.arriveMin = planned2 + slip; out.promiseMin = promise;
        if (out.arriveMin > LAST) { out.arriveDay = startDay + 1; out.arriveMin = exact ? 540 + G.randInt(0, 120) : 600; }
        out.slipped = slip > 0;
      }
      out.ok = true; return out;
    },
    etaText: function (o) {
      if (!o.arriveDay) return '';
      var d = o.arriveDay - G.state.day;
      if (o.status === 'Giao sáng mai') return 'Sáng mai 8–11h';
      if (d === 0) return (o.status === 'Đã giao' ? 'Đã giao ' : 'Dự kiến ') + hm(o.arriveMin) + ' hôm nay';
      if (d === 1) return 'Sáng mai ' + hm(o.arriveMin) + (o.promiseMin ? '' : '');
      if (d < 0) return 'Đã giao ngày ' + o.arriveDay;
      return 'Ngày ' + o.arriveDay + ' ' + hm(o.arriveMin);
    },
    // xem trước cho UI: phí + giờ giao dự kiến của từng đơn vị
    preview: function (o, carrierId, opts) {
      var car = G.carrierById[carrierId], now = SH.now(), fee = car.own ? 0 : SH.fee(car, o.vol), r = { fee: fee, ok: true, carrier: car };
      if (car.express && !SH.expressOk()) return { ok: false, fee: fee, reason: 'Hỏa tốc nhận đến 20h', carrier: car };
      if (SH.sameDayOk() || car.express) {
        var p = SH.plan(o, car, G.state.day, now, false, false); if (!p.ok) return { ok: false, fee: fee, reason: p.reason, carrier: car };
        r.text = p.nextDay ? 'Sáng mai (hôm nay không kịp)' : (car.express ? '⚡ ' : '') + 'khoảng ' + hm(p.arriveMin) + ' hôm nay'; r.today = !p.nextDay; if (p.nextDay) r.late = true;
      } else { r.text = 'Giao sáng mai (đã quá 17h)'; r.today = false; if (car.own && !G.staff.count('delivery')) return { ok: false, fee: fee, reason: 'Chưa có NV Giao hàng', carrier: car }; }
      return r;
    },
    book: function (id, carrierId, quiet, opts) {
      var s = G.state, o = SH.byId(id), car = G.carrierById[carrierId]; opts = opts || {};
      if (!o || !car) return { ok: false, msg: 'Đơn không hợp lệ' };
      if (o.status !== 'Chờ đặt') return { ok: false, msg: 'Đơn đã được đặt' };
      var now = SH.now(), express = !!car.express, queue = !express && now >= CUT, fee = car.own ? 0 : SH.fee(car, o.vol);
      if (express && !SH.expressOk()) return { ok: false, msg: 'Hỏa tốc chỉ nhận đến 20h' };
      var plan = null;
      if (!queue) { plan = SH.plan(o, car, s.day, now, true, false); if (!plan.ok) return { ok: false, msg: plan.reason }; }
      else if (car.own) { if (!G.staff.count('delivery')) return { ok: false, msg: 'Chưa có NV Giao hàng' }; var needT = Math.max(1, Math.ceil(o.vol / SH.TRIP_VOL())); if (SH.tripsCap() < needT) return { ok: false, msg: 'NV giao hàng không đủ lượt cho sáng mai' }; }
      if (!car.own && s.money < fee) return { ok: false, msg: 'Không đủ tiền phí ship' };
      if (fee) { if (express) { G.econ.expense(fee, 'shipexpress'); if (opts.payExp) { G.econ.income(fee, 'expressfee'); G.econ.addStat('expressFeeIn', fee); o.expPaid = true; } } else G.econ.expense(fee, 'shipfee'); }
      o.carrier = carrierId; o.fee = fee; o.booked = s.day; o.bookedMin = now; o.express = express;
      if (plan) {
        o.pickupMin = plan.pickup; o.arriveDay = plan.arriveDay; o.arriveMin = plan.arriveMin; o.promiseDay = plan.promiseDay; o.promiseMin = plan.promiseMin; o.status = 'Chờ lấy'; o.late = false;
        if (car.own) { s.shipping.busy[plan.staff] = plan.busyUntil; s.shipping.tripsUsed += plan.trips; o.staff = plan.staff; }
      } else { o.status = 'Giao sáng mai'; o.queueDay = s.day; o.arriveDay = s.day + 1; o.arriveMin = 600; o.promiseDay = s.day + 1; o.promiseMin = 720; }
      if (!o.cod && !o.paid) { G.econ.income(o.rev, 'sales'); o.paid = true; }
      if (!quiet) G.notify.toast('Đã đặt ' + G.esc(car.name) + ' cho đơn #' + o.id + ' · ' + G.esc(SH.etaText(o)), 'good');
      return { ok: true, msg: 'Đã đặt ' + car.name + (fee ? ' (phí ' + G.fmt.vnd(fee) + (o.expPaid ? ', khách trả' : '') + ')' : '') + ' · ' + SH.etaText(o) };
    },
    toggleCod: function (id) { var o = SH.byId(id); if (o && o.status === 'Chờ đặt') o.cod = !o.cod; },
    // đơn xếp hàng "giao sáng mai": lên lịch ngay khi sang ngày (giai đoạn chuẩn bị)
    dispatchMorning: function () {
      var s = G.state;
      s.shipping.orders.forEach(function (o) {
        if (o.status !== 'Giao sáng mai' || o.queueDay >= s.day) return;
        var car = G.carrierById[o.carrier], plan = SH.plan(o, car.express ? G.carrierById.grap : car, s.day, OPEN + G.randInt(0, 20), true, true);
        if (!plan.ok) { plan = SH.plan(o, G.carrierById.ghtk, s.day, OPEN + 10, true, true); o.carrier = 'ghtk'; }
        o.pickupMin = plan.pickup; o.arriveDay = plan.arriveDay; o.arriveMin = plan.arriveMin; o.promiseDay = s.day; o.promiseMin = Math.max(plan.promiseMin, 720); o.status = 'Chờ lấy'; o.booked = s.day; o.bookedMin = OPEN;
        if (car.own && plan.staff) { s.shipping.busy[plan.staff] = plan.busyUntil; s.shipping.tripsUsed += plan.trips; }
      });
    },
    process: function () {
      var s = G.state;
      s.shipping.orders.forEach(function (o) {
        if (o.status === 'Chờ lấy' && (s.day > o.booked || s.minute >= o.pickupMin)) o.status = 'Đang giao';
        if ((o.status === 'Đang giao' || o.status === 'Chờ lấy') && (s.day > o.arriveDay || (s.day === o.arriveDay && s.minute >= o.arriveMin))) SH.arrive(o);
      });
    },
    giveBack: function (o) {
      o.items.forEach(function (i) { G.wh.add(i.sku, i.qty, 'st'); });
      G.econ.cogs(-o.cogs);
    },
    arrive: function (o) {
      var s = G.state, st = s.shipping.stats, car = G.carrierById[o.carrier];
      var refuse = o.special ? 0 : (o.cod ? 0.10 : 0.03);
      if (G.chance(refuse)) {
        o.status = 'Thất bại'; o.note = 'Khách không nhận hàng, hàng hoàn về kho' + (o.fee ? ', mất phí ship' : '');
        SH.giveBack(o); if (o.paid) { G.econ.income(-o.rev, 'sales'); o.paid = false; }
        st.failed++;
        G.notify.push({ title: 'Giao thất bại #' + o.id, text: o.note, type: 'warn', sound: false });
        G.emit('shipFailed', o); return;
      }
      o.status = 'Đã giao'; o.deliveredDay = s.day; o.deliveredMin = s.minute; st.delivered++; if (o.express) st.express++;
      if (o.cod) { G.econ.income(o.rev, 'sales'); o.paid = true; }
      var bad = false;
      if (G.chance(car.damage)) { o.damaged = true; st.damaged++; var ref = Math.round(o.rev * 0.3); G.econ.income(-ref, 'sales'); o.note = 'Hàng bị hư hại khi giao, hoàn 30% cho khách'; bad = true; G.reviews.add(2, { damaged: true, ship: o.id }); }
      var pd = o.promiseDay != null ? o.promiseDay : (o.promised || s.day), pm = o.promiseMin != null ? o.promiseMin : 1260;
      o.late = s.day > pd || (s.day === pd && s.minute > pm);
      if (o.late) { st.late++; o.note = (o.note ? o.note + '; ' : '') + 'Giao trễ giờ hẹn'; s.rep = G.clamp(s.rep - 0.3, 0, 100); if (!bad) G.reviews.add(2, { late: true, ship: o.id }); bad = true; }
      if (!bad) {
        var sameDay = o.arriveDay === o.day || s.day === o.day;
        if (o.express && G.chance(0.7)) { G.reviews.add(5, { ship: o.id, fast: true }); s.rep = G.clamp(s.rep + 0.05, 0, 100); }
        else if (o.urgent && !sameDay && !o.express && G.chance(0.35)) G.reviews.add(2, { late: true, ship: o.id });
        else if (G.chance(sameDay ? 0.6 : 0.4)) G.reviews.add(5, { ship: o.id });
      }
      G.emit('shipDelivered', o);
    },
    daily: function () {
      var s = G.state; s.shipping.tripsUsed = 0; s.shipping.busy = {};
      s.shipping.orders.forEach(function (o) {
        if (o.status === 'Chờ đặt' && !o.special && s.day - o.day >= 2) {
          o.status = 'Hủy'; o.note = 'Khách hủy vì chưa được đặt ship'; SH.giveBack(o); G.reviews.add(1, { ship: o.id });
          G.notify.push({ title: 'Khách hủy đơn giao #' + o.id, text: 'Quá 2 ngày chưa đặt ship.', type: 'bad', sound: false });
        }
      });
      s.shipping.orders = s.shipping.orders.filter(function (o) { return ['Đã giao', 'Thất bại', 'Hủy'].indexOf(o.status) < 0 || s.day - (o.arriveDay || o.day) < 15; });
    },
    pendingCount: function () { return G.state.shipping.orders.filter(function (o) { return o.status === 'Chờ đặt'; }).length; },
    morningCount: function () { var s = G.state; return s.shipping.orders.filter(function (o) { return (o.status === 'Chờ lấy' || o.status === 'Đang giao' || o.status === 'Giao sáng mai') && o.arriveDay === s.day && o.arriveMin < 780; }).length; }
  };
  G.on('dayStart', function () { SH.daily(); SH.dispatchMorning(); SH.process(); });
  G.on('hour', SH.process);
  var acc = 0; G.on('tick', function (t) { acc += t.gm; if (acc >= 10) { acc = 0; SH.process(); } });
  G.conversionMods.push(function () { return G.state.shipping.expressOn ? 1.03 : 1; });
  G.econ.EXP_NAMES.shipexpress = 'Phí giao hỏa tốc'; G.econ.EXP_NAMES.buyexpress = 'Phí nhập hỏa tốc';
})();
