/* Đơn lớn khách sạn / resort: sinh đơn, modal thông báo, nhận/từ chối/đàm phán, giao nhiều chuyến, thanh toán / phạt trễ */
(function () {
  'use strict';
  var G = window.G;
  G.data.b2bClients = ['Khách sạn Mường Thạnh', 'Vin-Pearl Resort', 'Khách sạn Sen Hồng', 'Resort Biển Xanh', 'Khách sạn Hoàng Long Palace', 'Furama Resort Đà Nẵng', 'Khách sạn Sài Gòn Star', 'Homestay Đà Lạt Mộng Mơ', 'Resort Phú Quý Island', 'Khách sạn Hạ Long Bay View'];
  G.addDefaults({ b2b: { offers: [], orders: [], nextId: 1, auto: false, stats: { done: 0, late: 0, failed: 0, earned: 0 } } });
  var B = G.b2b = {
    HIRE_TRIP_FEE: 1200000,
    offerById: function (id) { return G.state.b2b.offers.filter(function (o) { return o.id === id; })[0]; },
    orderById: function (id) { return G.state.b2b.orders.filter(function (o) { return o.id === id; })[0]; },
    active: function () { return G.state.b2b.orders.filter(function (o) { return o.status === 'Đang thực hiện'; }); },
    pendingOffers: function () { return G.state.b2b.offers.filter(function (o) { return o.status === 'Chờ quyết định'; }); },
    staffEff: function () { var t = 0; G.staff.byRole('b2b').forEach(function (x) { if (x.status === 'ok') t += G.staff.eff(x); }); return t; },
    bestNegotiator: function () { var b = null; G.staff.byRole('b2b').forEach(function (x) { if (x.status === 'ok' && (!b || x.stars > b.stars)) b = x; }); return b; },
    freq: function () { // xác suất sinh đơn mỗi ngày
      var s = G.state, p = 0.11 * (1 + 0.4 * B.staffEff()) * (0.7 + s.rep / 100 * 0.7) * (s.level >= 4 ? 1.4 : 1);
      return Math.min(0.6, p);
    },
    build: function () {
      var s = G.state, tierMin = 2, ok = G.data.brands.filter(function (b) { return !b.noBrand && G.brandAvail(b.id) && b.tier >= tierMin; });
      if (!ok.length) ok = G.data.brands.filter(function (b) { return !b.noBrand && G.brandAvail(b.id); });
      if (!ok.length) return null;
      var main = G.weighted(ok, function (b) { return b.tier; });
      var rooms = G.randInt(12, 30) * (s.level >= 4 ? 2 : 1), items = [];
      function pickSku(type, sizes) {
        var pool = G.skuList.filter(function (k) { return k.type === type && k.brand === main.id && G.life.stage(k.id) < 3 && sizes.indexOf(k.size) >= 0; });
        if (!pool.length) pool = G.skuList.filter(function (k) { return k.type === type && ok.some(function (b) { return b.id === k.brand; }) && G.life.stage(k.id) < 3 && sizes.indexOf(k.size) >= 0; });
        if (type === 'ga') { var wh = pool.filter(function (k) { return k.cw && (k.cw.fam === 'trang' || k.cw.fam === 'be'); }); if (wh.length) pool = wh; } // khách sạn đặt bộ trắng / ngà
        return pool.length ? G.pick(pool) : null;
      }
      var ga = pickSku('ga', ['1m6', '1m8']), goi = pickSku('goi', ['Tiêu chuẩn']), dem = G.chance(0.35) ? pickSku('dem', ['1m6', '1m8']) : null;
      if (ga) items.push({ sku: ga.id, qty: rooms, done: 0 });
      if (goi) items.push({ sku: goi.id, qty: rooms * 2, done: 0 });
      if (dem) items.push({ sku: dem.id, qty: Math.round(rooms * 0.6), done: 0 });
      if (!items.length) return null;
      var value = 0; items.forEach(function (i) { value += G.skus[i.sku].list * i.qty * 0.92; });
      value = Math.round(value / 10000) * 10000;
      return { items: items, value: value };
    },
    generate: function (force) {
      var s = G.state, b = B.build(); if (!b) return null;
      var o = { id: s.b2b.nextId++, client: G.pick(G.data.b2bClients), items: b.items, value: b.value, deposit: Math.round(b.value * 0.2 / 10000) * 10000, penalty: Math.round(b.value * 0.15 / 10000) * 10000,
        askDay: s.day, deadline: s.day + G.randInt(10, 18), validUntil: s.day + 3, status: 'Chờ quyết định', negotiated: false };
      s.b2b.offers.push(o);
      G.notify.push({ title: 'Đơn lớn: ' + o.client, text: 'Giá trị ' + G.fmt.short(o.value) + ', hạn giao ngày ' + o.deadline + '. Bấm để xem.', type: 'good', sound: 'alert', toast: false, onClick: function () { B.showOffer(o.id); } });
      B.showOffer(o.id);
      return o;
    },
    offerHtml: function (o) {
      var rows = G.ui.itemGrid(o.items.map(function (i) { return { sku: i.sku, qty: i.qty, sub: 'tồn ' + G.wh.total(i.sku) }; }));
      return '<p><b>' + G.esc(o.client) + '</b> muốn đặt hàng số lượng lớn.</p>' + rows + '<table class="tbl small"><tr><td>Giá trị đơn</td><td class="r"><b>' + G.fmt.vnd(o.value) + '</b></td></tr><tr><td>Tiền cọc (nhận ngay)</td><td class="r">' + G.fmt.vnd(o.deposit) + '</td></tr><tr><td>Hạn giao</td><td class="r">ngày ' + o.deadline + ' (còn ' + (o.deadline - G.state.day) + ' ngày)</td></tr><tr><td>Phạt nếu trễ</td><td class="r neg">' + G.fmt.vnd(o.penalty) + ' + mất uy tín</td></tr></table>' + (o.negotiated ? '<p class="muted small">Đã đàm phán một lần.</p>' : '') + '<p class="muted small">Cần đủ hàng và NV Giao hàng (hoặc thuê xe ngoài); đơn lớn giao nhiều chuyến.</p>';
    },
    showOffer: function (id) {
      var o = B.offerById(id); if (!o || o.status !== 'Chờ quyết định') return;
      var neg = B.bestNegotiator();
      G.notify.modal({
        title: 'Đơn lớn: ' + o.client, sound: 'alert', def: 1, html: B.offerHtml(o),
        choices: [
          { label: 'Nhận đơn', cls: 'primary', fn: function () { B.accept(id); } },
          { label: 'Từ chối', cls: 'danger', fn: function () { B.reject(id); } },
          { label: neg ? 'Đàm phán giá' + (o.negotiated ? ' (đã dùng)' : '') : 'Đàm phán (cần NV Sale B2B)', disabled: !neg || o.negotiated, fn: function () { B.negotiate(id); } }
        ]
      });
    },
    accept: function (id) {
      var s = G.state, o = B.offerById(id); if (!o || o.status !== 'Chờ quyết định') return { ok: false, msg: 'Đơn không còn' };
      o.status = 'Đã nhận'; G.econ.cash(o.deposit);
      var ord = { id: o.id, client: o.client, items: o.items, value: o.value, deposit: o.deposit, penalty: o.penalty, deadline: o.deadline, acceptedDay: s.day, status: 'Đang thực hiện', trips: 0, cancelable: true, paid: false };
      s.b2b.orders.push(ord); s.b2b.offers = s.b2b.offers.filter(function (x) { return x.id !== id; });
      G.notify.push({ title: 'Đã nhận đơn ' + o.client, text: 'Nhận cọc ' + G.fmt.short(o.deposit) + '. Hạn giao ngày ' + o.deadline + '.', type: 'good', sound: false });
      return { ok: true, msg: 'Đã nhận đơn, nhận cọc ' + G.fmt.vnd(o.deposit) };
    },
    reject: function (id) { var s = G.state; s.b2b.offers = s.b2b.offers.filter(function (x) { return x.id !== id; }); return { ok: true, msg: 'Đã từ chối' }; },
    negotiate: function (id) {
      var o = B.offerById(id), n = B.bestNegotiator(); if (!o || !n || o.negotiated) return;
      o.negotiated = true;
      var chance = 0.35 + 0.15 * n.stars + 0.05 * (G.staff.eff(n) - 1), r = Math.random();
      if (r < chance) {
        var up = G.rand(1.08, 1.16); o.value = Math.round(o.value * up / 10000) * 10000; o.deposit = Math.round(o.value * 0.2 / 10000) * 10000; o.penalty = Math.round(o.value * 0.15 / 10000) * 10000;
        G.staff.addXp(n, 3);
        G.notify.toast('Đàm phán thành công! Giá trị tăng ' + Math.round((up - 1) * 100) + '%.', 'good');
      } else if (r > 0.8 + (n.stars - 1) * 0.04) {
        o.status = 'Rút lui'; G.state.b2b.offers = G.state.b2b.offers.filter(function (x) { return x.id !== id; });
        G.notify.push({ title: o.client + ' rút lui', text: 'Đàm phán thất bại, khách tìm nhà cung cấp khác.', type: 'warn' }); return;
      } else G.notify.toast('Khách giữ nguyên điều khoản.', 'info');
      B.showOffer(id);
    },
    remaining: function (o) { return o.items.map(function (i) { return { sku: i.sku, left: i.qty - i.done }; }); },
    done: function (o) { return o.items.every(function (i) { return i.done >= i.qty; }); },
    // lấy hàng từ kho cửa hàng, kệ, rồi kho ngoài
    takeUnits: function (sku, n) {
      var W = G.wh, s = G.state, got = 0, t;
      t = Math.min(n, W.get(sku, 'st')); if (t > 0) { W.add(sku, -t, 'st'); got += t; }
      var locs = Object.keys(s.whRent); for (var i = 0; i < locs.length && got < n; i++) { t = Math.min(n - got, W.get(sku, locs[i])); if (t > 0) { W.add(sku, -t, locs[i]); got += t; } }
      return got;
    },
    // 1 chuyến: mode 'own' (NV giao hàng) | 'hire' (thuê xe ngoài)
    trip: function (id, mode) {
      var s = G.state, o = B.orderById(id); if (!o || o.status !== 'Đang thực hiện') return { ok: false, msg: 'Đơn không còn hoạt động' };
      if (mode === 'own') {
        if (!G.staff.count('delivery')) return { ok: false, msg: 'Chưa có NV Giao hàng (hoặc thuê xe ngoài)' };
        if (G.shipping.tripsLeft() < 1) return { ok: false, msg: 'NV giao hàng hết lượt hôm nay' };
      } else if (s.money < B.HIRE_TRIP_FEE) return { ok: false, msg: 'Không đủ tiền thuê xe' };
      var cap = G.shipping.TRIP_VOL(), vol = 0, units = 0, cogs = 0;
      o.items.forEach(function (i) {
        var left = i.qty - i.done; if (left <= 0) return;
        var v = G.skus[i.sku].vol, canVol = Math.floor((cap - vol) / v), want = Math.min(left, canVol);
        if (want <= 0) return;
        var got = B.takeUnits(i.sku, want);
        if (got > 0) { i.done += got; vol += got * v; units += got; cogs += got * (s.costBasis[i.sku] || G.skus[i.sku].cost); }
      });
      if (!units) return { ok: false, msg: 'Không có hàng sẵn để chất lên xe (kiểm tra kho cửa hàng/kệ)' };
      if (mode === 'own') s.shipping.tripsUsed++; else { G.econ.expense(B.HIRE_TRIP_FEE, 'shipfee'); G.econ.income(B.HIRE_TRIP_FEE * 0.5, 'expressfee'); G.econ.addStat('expressFeeIn', B.HIRE_TRIP_FEE * 0.5); }
      G.econ.cogs(cogs); o.trips++;
      var msg = 'Chuyến ' + o.trips + ': giao ' + units + ' sản phẩm';
      if (B.done(o)) { B.settle(o, false); msg += ' - HOÀN TẤT đơn'; }
      return { ok: true, msg: msg };
    },
    autoDeliver: function () {
      var s = G.state; if (!s.b2b.auto) return;
      B.active().sort(function (a, b) { return a.deadline - b.deadline; }).forEach(function (o) {
        var guard = 0;
        while (o.status === 'Đang thực hiện' && G.staff.count('delivery') && G.shipping.tripsLeft() > 0 && guard++ < 30) { var r = B.trip(o.id, 'own'); if (!r.ok) break; }
      });
    },
    // tất toán: failed = quá hạn quá lâu, khách hủy
    settle: function (o, failed) {
      var s = G.state, st = s.b2b.stats, total = 0, frac;
      o.items.forEach(function (i) { total += i.qty; });
      var d = 0; o.items.forEach(function (i) { d += i.done; }); frac = d / total;
      var late = s.day > o.deadline, pay = failed ? Math.round(o.value * frac * 0.8) : o.value;
      G.econ.recognize(pay); G.econ.cash(pay - o.deposit);          // cọc đã nhận trước
      if (late || failed) G.econ.expense(o.penalty, 'penalty');
      o.paid = true; o.status = failed ? 'Thất bại' : (late ? 'Hoàn tất (trễ)' : 'Hoàn tất'); o.settleDay = s.day; o.cancelable = false;
      if (failed) { st.failed++; s.rep = G.clamp(s.rep - 8, 0, 100); G.reviews.add(1, { b2b: o.id }); G.reviews.add(1, { b2b: o.id }); }
      else if (late) { st.late++; st.done++; st.earned += pay; s.rep = G.clamp(s.rep - 3, 0, 100); G.reviews.add(2, { b2b: o.id }); }
      else { st.done++; st.earned += pay; s.rep = G.clamp(s.rep + 6, 0, 100); G.reviews.add(5, { b2b: o.id }); G.reviews.add(5, { b2b: o.id }); }
      G.notify.push({ title: (failed ? 'Đơn lớn thất bại: ' : late ? 'Giao trễ: ' : 'Giao đúng hạn: ') + o.client, text: failed ? 'Khách hủy, phạt ' + G.fmt.short(o.penalty) + ', mất uy tín lớn.' : (late ? 'Bị phạt ' + G.fmt.short(o.penalty) + ' và mất uy tín.' : 'Nhận ' + G.fmt.short(pay) + ' và +6 danh tiếng!'), type: failed || late ? 'bad' : 'good', sound: failed || late ? 'bad' : 'good' });
      G.emit('b2bSettled', o);
    },
    // Pass 3: khách bỏ cọc đơn B2B
    customerCancel: function (id) {
      var o = B.orderById(id); if (!o || o.status !== 'Đang thực hiện') return false;
      G.econ.recognize(o.deposit); o.status = 'Khách bỏ cọc'; o.cancelable = false; return true;
    },
    daily: function () {
      var s = G.state;
      s.b2b.offers = s.b2b.offers.filter(function (o) { if (s.day > o.validUntil && o.status === 'Chờ quyết định') { G.notify.push({ title: 'Đơn của ' + o.client + ' hết hạn trả lời', type: 'info', sound: false, toast: false }); return false; } return true; });
      B.active().forEach(function (o) {
        var left = o.deadline - s.day;
        if (left === 2 || left === 0) G.notify.push({ title: 'Đơn ' + o.client + ': còn ' + left + ' ngày', text: 'Còn thiếu hàng chưa giao.', type: 'warn', sound: 'warn' });
        if (s.day > o.deadline + 5) B.settle(o, true);
      });
      s.b2b.orders = s.b2b.orders.filter(function (o) { return o.status === 'Đang thực hiện' || s.day - (o.settleDay || s.day) < 25; });
      if (G.lvl().b2b && s.b2b.offers.length < 2 && G.chance(B.freq())) B.generate(false);
    }
  };
  G.on('dayStart', function () { B.daily(); B.autoDeliver(); });
  G.on('hour', function (h) { if (h.hour === 12 || h.hour === 17) B.autoDeliver(); });
  G.on('debug:forceB2B', function () { B.generate(true); });
})();
