/* Sự kiện ngẫu nhiên: nghỉ phép, khách bỏ cọc, khách quịt tiền (công nợ khó đòi + báo phường + danh sách đen), kiểm tra QLTT/thuế, lô hàng lỗi, mất điện, KOL, NCC tăng giá */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ events: { fakeReports: 0, black: [], debts: [], nextDebt: 1, lastInspect: -99, pendingDocs: null, kol: { until: 0, mult: 1 } } });
  var EV = G.events = {
    // ---------- danh sách đen ----------
    maybeBlack: function (c) {
      var b = G.state.events.black; if (!b.length || !G.chance(0.05)) return;
      c.name = G.pick(b); c.black = true;
      G.notify.toast('⚠ Khách trong danh sách đen vừa vào cửa hàng: <b>' + G.esc(c.name) + '</b>. Cân nhắc không bán COD!', 'warn', 5000);
    },
    // ---------- NV nghỉ phép ----------
    leaveRequest: function (force) {
      var s = G.state, pool = s.staff.filter(function (x) { return x.status === 'ok'; });
      if (!pool.length) return false;
      var st = G.pick(pool), days = G.randInt(1, 3), why = G.pick(['việc gia đình', 'đi khám bệnh', 'về quê có việc', 'con nhỏ ốm', 'đám cưới người thân']);
      G.notify.modal({
        title: 'Xin nghỉ phép', def: 0,
        html: '<p><b>' + G.esc(st.name) + '</b> (' + G.roleById[st.role].name + ') xin nghỉ <b>' + days + ' ngày</b> vì ' + why + '.</p><p class="muted small">Duyệt: NV vắng, hài lòng tăng (cần chia ca bù). Từ chối: NV vẫn làm nhưng hài lòng giảm mạnh, có thể nghỉ việc.</p>',
        choices: [
          { label: 'Duyệt', cls: 'primary', fn: function () { G.staff.setLeave(st.id, days, why); st.sat = Math.min(100, st.sat + 6); G.notify.toast(G.esc(st.name) + ' nghỉ ' + days + ' ngày.', 'info'); } },
          { label: 'Từ chối', cls: 'danger', fn: function () { st.sat = Math.max(0, st.sat - 15); if (G.chance(0.12)) { G.notify.push({ title: st.name + ' nghỉ việc', text: 'Bị từ chối nghỉ phép nên nghỉ luôn.', type: 'bad' }); G.staff.remove(st.id); } else G.notify.toast(G.esc(st.name) + ' không vui.', 'warn'); } }
        ]
      });
      return true;
    },
    sickLeave: function () {
      var pool = G.state.staff.filter(function (x) { return x.status === 'ok'; }); if (!pool.length) return false;
      var st = G.pick(pool), days = G.randInt(1, 2); G.staff.setLeave(st.id, days, 'ốm');
      G.notify.push({ title: st.name + ' nghỉ ốm đột xuất', text: 'Vắng ' + days + ' ngày, không báo trước.' + (G.state.autoSchedule ? ' Quản lý sẽ bù ca.' : ' Hãy chia lại ca!'), type: 'warn', sound: 'warn' });
      G.staff.coverAbsences(); return true;
    },
    // ---------- khách bỏ cọc ----------
    cancelDeposit: function (force) {
      var s = G.state, cands = [];
      s.special.list.forEach(function (o) { if (o.status === 'Đã nhận cọc') cands.push({ kind: 'sp', o: o }); });
      s.b2b.orders.forEach(function (o) { if (o.status === 'Đang thực hiện' && o.cancelable !== false) cands.push({ kind: 'b2b', o: o }); });
      if (!cands.length) {
        if (!force) return false;
        var k = G.skuList.filter(function (x) { return G.brandAvail(x.brand) && x.brand !== 'cho'; })[0];
        var o0 = { id: s.special.nextId++, kind: 'retail', sku: k.id, qty: 1, price: k.list, deposit: Math.round(k.list * 0.3), cust: { name: 'Khách thử nghiệm' }, askedDay: s.day, due: s.day + 10, status: 'Đã nhận cọc', depositPaid: true, cancelable: true };
        G.econ.cash(o0.deposit); s.special.list.push(o0); cands.push({ kind: 'sp', o: o0 });
      }
      var c = G.pick(cands), name = c.kind === 'sp' ? c.o.cust.name : c.o.client, dep = c.o.deposit;
      var ok = c.kind === 'sp' ? G.deposits.customerCancel(c.o.id) : G.b2b.customerCancel(c.o.id);
      if (!ok) return false;
      G.notify.modal({
        title: 'Khách bỏ cọc', def: 0, sound: 'warn',
        html: '<p><b>' + G.esc(name) + '</b> đã hủy đơn ' + (c.kind === 'b2b' ? 'khách sạn/resort' : 'đặt riêng') + ' và <b>bỏ cọc</b>.</p><p>Bạn được giữ <b class="pos">' + G.fmt.vnd(dep) + '</b> tiền cọc. Hàng đã nhập / đặt riêng nằm lại kho - có thể bán xả giá.</p>',
        choices: [{ label: 'Đã hiểu', cls: 'primary' }]
      });
      return true;
    },
    // ---------- khách quịt tiền ----------
    addDebt: function (o) {
      var s = G.state, ev = s.events;
      var d = { id: ev.nextDebt++, ship: o.id, name: o.cust.name, amount: o.rev, day: s.day, status: 'Khó đòi', invoice: G.staff.count('accountant') > 0 || G.chance(0.4), tries: 0, nextTry: 0, resolveDay: 0, note: '' };
      ev.debts.push(d); o.debt = d.id;
      if (ev.black.indexOf(d.name) < 0) ev.black.push(d.name);
      G.notify.push({ title: 'Khách quịt tiền: ' + d.name, text: 'Đơn COD #' + o.id + ' (' + G.fmt.short(d.amount) + ') khách không trả. Vào tab Công nợ khó đòi.', type: 'bad', sound: 'bad', onClick: function () { G.ui.panels.active = 'debts'; G.ui.panels.buildNav(); G.ui.panels.refresh(true); } });
      G.notify.modal({ title: 'Khách quịt tiền!', def: 0, sound: 'bad', html: '<p>Khách <b>' + G.esc(d.name) + '</b> nhận hàng COD đơn #' + o.id + ' nhưng <b>không thanh toán</b> ' + G.fmt.vnd(d.amount) + '.</p><p>Khoản này chuyển sang mục <b>Công nợ khó đòi</b> (tự đòi / báo phường / xóa nợ). Khách đã bị đưa vào <b>danh sách đen</b>.</p>', choices: [{ label: 'Đã hiểu', cls: 'primary' }] });
    },
    recover: function (d, frac) { var amt = Math.round(d.amount * frac); if (amt > 0) G.econ.income(amt, 'debt'); return amt; },
    selfCollect: function (id) {
      var s = G.state, d = EV.debtById(id); if (!d || d.status !== 'Khó đòi') return { ok: false, msg: 'Không hợp lệ' };
      if (s.day < d.nextTry) return { ok: false, msg: 'Vừa gọi rồi, thử lại sau ngày ' + d.nextTry };
      d.tries++; d.nextTry = s.day + 3;
      var r = Math.random();
      if (r < 0.15) { d.status = 'Thu hồi'; EV.recover(d, 1); return { ok: true, msg: 'Khách đồng ý trả đủ ' + G.fmt.vnd(d.amount) }; }
      if (r < 0.3) { d.status = 'Thu hồi một phần'; var a = EV.recover(d, 0.4); return { ok: true, msg: 'Thu được một phần ' + G.fmt.vnd(a) }; }
      return { ok: false, msg: 'Khách không nghe máy / chây ì. Thử lại sau 3 ngày.' };
    },
    reportPolice: function (id) {
      var s = G.state, d = EV.debtById(id); if (!d || d.status !== 'Khó đòi') return { ok: false, msg: 'Không hợp lệ' };
      if (s.money < 200000) return { ok: false, msg: 'Không đủ phí hành chính 200.000đ' };
      G.econ.expense(200000, 'fees'); d.status = 'Đã báo phường'; d.resolveDay = s.day + G.randInt(3, 7);
      return { ok: true, msg: 'Đã nộp hồ sơ ' + (d.invoice ? '(đầy đủ hóa đơn)' : '(thiếu hóa đơn)') + ', dự kiến có kết quả ngày ' + d.resolveDay };
    },
    writeOff: function (id) { var d = EV.debtById(id); if (d && d.status === 'Khó đòi') d.status = 'Đã xóa'; },
    debtById: function (id) { return G.state.events.debts.filter(function (x) { return x.id === id; })[0]; },
    resolveDebts: function () {
      var s = G.state, accStars = 0; G.staff.byRole('accountant').forEach(function (a) { accStars += a.stars; });
      s.events.debts.forEach(function (d) {
        if (d.status !== 'Đã báo phường' || s.day < d.resolveDay) return;
        var p = 0.3 + (d.invoice ? 0.3 : 0) + 0.06 * Math.min(accStars, 5), r = Math.random();
        if (r < p * 0.6) { d.status = 'Thu hồi'; EV.recover(d, 1); G.notify.push({ title: 'Phường thu hồi nợ thành công', text: d.name + ' đã trả đủ ' + G.fmt.vnd(d.amount), type: 'good' }); }
        else if (r < p) { d.status = 'Thu hồi một phần'; var a = EV.recover(d, 0.6); G.notify.push({ title: 'Thu hồi một phần nợ', text: d.name + ' trả ' + G.fmt.vnd(a), type: 'info' }); }
        else { d.status = 'Thất bại'; G.notify.push({ title: 'Báo phường không thành', text: 'Không thu hồi được khoản của ' + d.name + (d.invoice ? '' : ' (thiếu hóa đơn)'), type: 'warn' }); }
      });
    },
    forceUnpaid: function () {
      var s = G.state, sh = G.shipping;
      var k = G.skuList.filter(function (x) { return G.brandAvail(x.brand) && x.type !== 'dem'; })[0];
      var o = { id: s.shipping.nextId++, day: s.day, items: [{ sku: k.id, qty: 1, price: k.list }], rev: k.list, cogs: k.cost, vol: 1, cod: true, paid: true, carrier: 'ghtk', fee: 30000, status: 'Đã giao', cust: { name: G.pick(G.data.lastNames) + ' ' + G.pick(G.data.firstNames), tol: 1 }, late: false, damaged: false, note: '', source: 'retail', arriveDay: s.day, promised: s.day + 3 };
      G.econ.income(o.rev, 'sales'); s.shipping.orders.push(o);
      G.econ.income(-o.rev, 'sales'); o.paid = false; EV.addDebt(o); return true;
    },
    // ---------- kiểm tra QLTT / thuế ----------
    accStars: function () { var t = 0; G.staff.byRole('accountant').forEach(function (a) { if (a.status === 'ok') t += a.stars; }); return t; },
    inspectData: function () {
      var s = G.state, W = G.wh, units = 0, val = 0, v = { invoice: null, tax: null, label: null };
      Object.keys(s.noInvoice).forEach(function (k) { var n = Math.min(s.noInvoice[k] || 0, W.total(k)); if (n > 0 && G.skus[k]) { units += n; val += n * (s.costBasis[k] || G.skus[k].cost); } });
      if (units > 0) v.invoice = { units: units, value: val, fine: Math.max(1000000, Math.round(val * 0.15)) };
      var cover = Math.min(0.9, EV.accStars() * 0.22);
      if (G.chance(0.3 * (1 - cover))) v.tax = { fine: Math.max(1000000, Math.round(s.month.revenue * 0.05)) };
      var bad = 0; s.slots.forEach(function (sl) { if (sl.sku && (G.pricing.base(sl.sku) > G.skus[sl.sku].list * 1.45 || (s.clearance[sl.sku] > 0 && G.chance(0.35)))) bad++; });
      if (bad > 0) v.label = { count: bad };
      return v;
    },
    inspection: function (force) {
      var s = G.state, ev = s.events, v = EV.inspectData();
      ev.lastInspect = s.day;
      s.closure = { day: s.day, until: Math.min(1260, Math.max(s.minute, 480) + 90), reason: 'Đoàn kiểm tra đang làm việc' };
      var lines = [];
      lines.push('Hóa đơn chứng từ đầu vào: ' + (v.invoice ? '<b class="neg">thiếu cho ' + v.invoice.units + ' sản phẩm (' + G.fmt.short(v.invoice.value) + ')</b>' : '<span class="pos">đầy đủ</span>'));
      lines.push('Sổ sách & kê khai thuế: ' + (v.tax ? '<b class="neg">chênh lệch doanh thu khai báo</b>' : '<span class="pos">khớp</span>'));
      lines.push('Niêm yết giá: ' + (v.label ? '<b class="warn">' + v.label.count + ' mặt hàng nhãn giá chưa đúng</b>' : '<span class="pos">đạt</span>'));
      lines.push('Hàng giả / nhái: ' + (ev.fakeReports > 0 ? '<span class="warn">đoàn nhận được ' + ev.fakeReports + ' tố cáo - kiểm tra nguồn gốc</span>' : 'không có tố cáo'));
      var acc = EV.accStars() > 0;
      function finish(deferInvoice) { EV.finishInspection(v, deferInvoice); }
      G.notify.modal({
        title: 'Đoàn kiểm tra QLTT / thuế đến ' + G.state.shopName + '!', def: 0, sound: 'alert',
        html: '<p>Cửa hàng tạm đóng cửa trong lúc kiểm tra:</p><ul class="small"><li>' + lines.join('</li><li>') + '</li></ul>' + (v.invoice && !acc ? '<p class="muted small">Chưa có Kế toán nên không thể xin gia hạn bổ sung chứng từ.</p>' : ''),
        choices: [
          { label: 'Phối hợp, chấp nhận kết quả', cls: 'primary', fn: function () { finish(false); } },
          { label: 'Xin gia hạn 3 ngày bổ sung chứng từ', disabled: !(v.invoice && acc), fn: function () { finish(true); } }
        ]
      });
      return true;
    },
    seize: function () {
      var s = G.state, val = 0, n = 0;
      Object.keys(s.noInvoice).forEach(function (k) {
        var want = s.noInvoice[k] || 0; if (!want || !G.skus[k]) return;
        var take = Math.min(want, G.wh.get(k, 'st'));
        if (take > 0) { G.wh.add(k, -take, 'st'); n += take; val += take * (s.costBasis[k] || G.skus[k].cost); want -= take; }
        s.noInvoice[k] = 0;
      });
      if (val) G.econ.cogs(val);
      return { n: n, val: val };
    },
    finishInspection: function (v, deferInvoice) {
      var s = G.state, ev = s.events, fine = 0, res = [], outcome;
      if (v.tax) { fine += v.tax.fine; res.push('Truy thu thuế/sổ sách ' + G.fmt.vnd(v.tax.fine)); }
      var seized = null;
      if (v.invoice) {
        if (deferInvoice) { ev.pendingDocs = { due: s.day + 3, inv: v.invoice }; res.push('Được gia hạn 3 ngày bổ sung hóa đơn.'); }
        else { fine += v.invoice.fine; res.push('Phạt thiếu hóa đơn ' + G.fmt.vnd(v.invoice.fine)); if (v.invoice.value >= 8e6 || G.chance(0.3)) { seized = EV.seize(); res.push('Tịch thu lô hàng không hóa đơn: ' + seized.n + ' sản phẩm (' + G.fmt.short(seized.val) + ')'); } }
      }
      if (v.label) res.push('Nhắc nhở niêm yết giá (không phạt).');
      if (fine > 0) G.econ.expense(fine, 'penalty');
      outcome = seized ? 'Tịch thu lô hàng' : fine > 0 ? 'Phạt hành chính' : (v.label || deferInvoice) ? 'Nhắc nhở' : 'Đạt';
      if (outcome === 'Đạt') { s.rep = G.clamp(s.rep + 1, 0, 100); res.push('Danh tiếng +1.'); }
      else if (fine > 0) s.rep = G.clamp(s.rep - 1.5, 0, 100);
      ev.fakeReports = Math.max(0, ev.fakeReports - 2);
      G.notify.modal({ title: 'Kết quả kiểm tra: ' + outcome, def: 0, sound: outcome === 'Đạt' ? 'good' : 'bad', html: '<ul>' + (res.length ? res.map(function (r) { return '<li>' + G.esc(r) + '</li>'; }).join('') : '<li>Không có vi phạm.</li>') + '</ul>', choices: [{ label: 'Đóng', cls: 'primary' }] });
    },
    resolveDocs: function () {
      var s = G.state, pd = s.events.pendingDocs; if (!pd || s.day < pd.due) return;
      s.events.pendingDocs = null;
      var p = 0.5 + 0.1 * Math.min(EV.accStars(), 5);
      if (G.chance(p)) {
        Object.keys(s.noInvoice).forEach(function (k) { s.noInvoice[k] = 0; });
        G.notify.modal({ title: 'Bổ sung chứng từ thành công', def: 0, sound: 'good', html: '<p>Kế toán đã bổ sung đầy đủ hóa đơn. Đoàn kiểm tra ghi nhận <b>Đạt</b>.</p>', choices: [{ label: 'Tuyệt', cls: 'primary' }] });
        s.rep = G.clamp(s.rep + 0.5, 0, 100);
      } else {
        G.econ.expense(pd.inv.fine, 'penalty'); var z = EV.seize(); s.rep = G.clamp(s.rep - 1.5, 0, 100);
        G.notify.modal({ title: 'Bổ sung chứng từ thất bại', def: 0, sound: 'bad', html: '<p>Không đủ hóa đơn: phạt <b>' + G.fmt.vnd(pd.inv.fine) + '</b>' + (z.n ? ' và tịch thu ' + z.n + ' sản phẩm.' : '.') + '</p>', choices: [{ label: 'Đóng', cls: 'danger' }] });
      }
    },
    // ---------- sự kiện nhẹ ----------
    badBatch: function () {
      var s = G.state, ks = Object.keys(s.inv).filter(function (k) { return G.skus[k] && s.inv[k].st >= 5; });
      if (!ks.length) return false;
      var k = G.pick(ks), n = Math.max(2, Math.round(s.inv[k].st * G.rand(0.2, 0.4))), cost = s.costBasis[k] || G.skus[k].cost;
      G.notify.modal({
        title: 'Lô hàng bị lỗi', def: 0, sound: 'warn',
        html: '<p>Kiểm tra kho phát hiện <b>' + n + '</b> × ' + G.esc(G.skus[k].label) + ' bị lỗi sản xuất (nấm mốc / sai kích thước).</p>',
        choices: [
          { label: 'Trả NCC (hoàn 80%)', cls: 'primary', fn: function () { n = Math.min(n, G.wh.get(k, 'st')); G.wh.add(k, -n, 'st'); G.econ.cash(Math.round(n * cost * 0.8)); G.econ.cogs(Math.round(n * cost * 0.2)); } },
          { label: 'Giữ lại bán giảm giá', fn: function () { s.bGrade[k] = (s.bGrade[k] || 0) + n; } }
        ]
      });
      return true;
    },
    blackout: function () {
      var s = G.state;
      G.notify.modal({
        title: 'Mất điện!', def: 0, sound: 'warn',
        html: '<p>Khu vực cửa hàng bị cắt điện. Cửa hàng tối om, khách không vào được.</p>',
        choices: [
          { label: 'Chờ có điện (đóng cửa ~2 giờ)', fn: function () { s.closure = { day: s.day, until: Math.min(1260, s.minute + 120), reason: 'Mất điện' }; } },
          { label: 'Thuê máy phát điện 500.000đ (đóng ~30 phút)', cls: 'primary', fn: function () { G.econ.expense(500000, 'fees'); s.closure = { day: s.day, until: Math.min(1260, s.minute + 30), reason: 'Mất điện - chạy máy phát' }; } }
        ]
      });
      return true;
    },
    kol: function () {
      var s = G.state, good = G.chance(0.7);
      s.events.kol = { until: s.day + 3, mult: good ? 1.35 : 0.85 };
      for (var i = 0; i < 3; i++) G.reviews.add(good ? 5 : 2, { force: true, kol: true });
      G.notify.modal({ title: 'KOL ghé review cửa hàng', def: 0, sound: good ? 'good' : 'bad', html: good ? '<p>Một KOL vừa đăng video review <b>rất tích cực</b> về cửa hàng! Lượng khách tăng 35% trong 3 ngày.</p>' : '<p>Một KOL review cửa hàng với giọng điệu <b>chê bai</b>. Lượng khách giảm nhẹ trong 3 ngày.</p>', choices: [{ label: 'OK', cls: 'primary' }] });
      return true;
    },
    priceHike: function () {
      var brs = G.data.brands.filter(function (b) { return !b.noBrand && G.brandAvail(b.id); }); if (!brs.length) return false;
      var b = G.pick(brs); G.purchasing.addMod({ brand: b.id, mult: 1.15, until: G.state.day + 10, label: b.short + ' tăng giá' });
      G.notify.modal({ title: b.short + ' tăng giá nhập', def: 0, html: '<p>Nhà cung cấp <b>' + G.esc(b.short) + '</b> thông báo tăng giá nhập 15% trong 10 ngày. Cân nhắc nhập sớm hoặc điều chỉnh giá bán.</p>', choices: [{ label: 'Đã rõ', cls: 'primary' }] });
      return true;
    },
    inspectProb: function () { var s = G.state; if (s.day - s.events.lastInspect < 15 || s.level < 1) return 0; return Math.min(0.25, 0.008 + 0.004 * s.level + s.events.fakeReports * 0.02); },
    daily: function () {
      var s = G.state; EV.resolveDebts(); EV.resolveDocs();
      var list = [
        [0.07, function () { return EV.leaveRequest(); }], [0.04, function () { return EV.sickLeave(); }], [0.05, function () { return EV.cancelDeposit(false); }],
        [EV.inspectProb(), function () { return EV.inspection(); }], [0.03, function () { return EV.badBatch(); }], [0.02, function () { return EV.blackout(); }],
        [s.level >= 1 ? 0.02 : 0, function () { return EV.kol(); }], [0.03, function () { return EV.priceHike(); }]
      ];
      list.sort(function () { return Math.random() - 0.5; });
      for (var i = 0; i < list.length; i++) if (G.chance(list[i][0]) && list[i][1]()) break;
    },
    force: function (t) {
      var m = { leave: function () { return EV.leaveRequest(true); }, sick: EV.sickLeave, cancelDeposit: function () { return EV.cancelDeposit(true); }, unpaid: EV.forceUnpaid, inspection: function () { return EV.inspection(true); }, badbatch: EV.badBatch, blackout: EV.blackout, kol: EV.kol, pricehike: EV.priceHike };
      if (!m[t]) { G.notify.toast('Sự kiện không có: ' + t + ' (leave|sick|cancelDeposit|unpaid|inspection|badbatch|blackout|kol|pricehike)', 'warn'); return false; }
      var ok = m[t](); if (!ok) G.notify.toast('Không đủ điều kiện để tạo sự kiện "' + t + '" (VD: cần có nhân viên / hàng tồn)', 'warn');
      return ok;
    }
  };
  // khách quịt: bọc G.shipping.arrive
  var origArrive = G.shipping.arrive;
  G.shipping.arrive = function (o) {
    var p = o.cod ? (o.cust && o.cust.black ? 0.6 : 0.06) : 0, stiff = G.chance(p);
    origArrive.call(G.shipping, o);
    if (stiff && o.status === 'Đã giao' && o.paid && !o.damaged) { G.econ.income(-o.rev, 'sales'); o.paid = false; EV.addDebt(o); }
  };
  // KOL ảnh hưởng lượng khách
  var kt = function () { var k = G.state.events.kol; return k && k.until >= G.state.day ? k.mult : 1; }; kt.label = 'KOL'; G.trafficMods.push(kt);
  G.on('dayStart', EV.daily);
  G.on('debug:forceEvent', function (t) { EV.force(t); });
  // vẽ đoàn kiểm tra khi đóng cửa
  G.on('drawOverlay', function (ctx) {
    var s = G.state; if (!G.staff.closed() || !/kiểm tra/.test(s.closure.reason || '')) return;
    var L = G.layout.get(), T = G.sprites.T;
    [[-1, '#37474f'], [0.2, '#455a64'], [1.4, '#37474f']].forEach(function (p) { var pp = G.sprites.P((L.door.x + 0.5 + p[0] * 0.8) * T, (L.door.y - 1 + 0.6) * T, 0); G.sprites.person(ctx, { x: pp[0], y: pp[1] + 4, shirt: p[1], band: '#FFD93D', skin: '#f6c9a0', hair: '#222a4a', face: 1, hat: '#3949AB' }); });
  });
})();
