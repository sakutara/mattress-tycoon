/* Đối thủ cạnh tranh: 1-3 cửa hàng cùng khu, kéo bớt khách, khuyến mãi, săn nhân viên, mở rộng/gặp sự cố. Người chơi: khảo sát, đáp trả, thâu tóm. */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ rivals: { list: [], nextOpen: 0, nextId: 1, absorbed: 0, intel: 0, shield: 0, log: [] } });
  // base = % khách bị kéo khi str = 100; promo = trọng số khuyến mãi; poach = trọng số săn người; bias = lệch mức mạnh mục tiêu
  var TYPES = {
    cheap: { label: 'Giá rẻ', base: 0.12, promo: 55, poach: 10, bias: 0, names: ['Chăn Ga Giá Sốc', 'Kho Đệm Bình Dân', 'Chăn Ga 99k', 'Đệm Rẻ Số 1'], desc: 'Bán hàng phổ thông giá thấp, hay khuyến mãi lớn.' },
    lux: { label: 'Cao cấp', base: 0.09, promo: 25, poach: 35, bias: 6, names: ['Royal Bedding', 'Hoàng Gia Home', 'Luxe Sleep', 'Nệm Quý Tộc'], desc: 'Showroom sang, hay săn nhân viên giỏi.' },
    online: { label: 'Bán online', base: 0.10, promo: 40, poach: 10, bias: 3, names: ['Ngủ Ngon Online', 'Ga Gối 24h', 'ĐệmXinh.vn', 'Giường Mơ Store'], desc: 'Giao tận nhà, khuyến mãi liên tục, lớn dần theo thời gian.' }
  };
  var CAP = [0, 1, 1, 2, 3, 3];
  var STRN = ['Yếu', 'Vừa phải', 'Mạnh', 'Rất mạnh'];
  function R() { return G.state.rivals; }
  function unit() { return G.quests ? G.quests.unit() : 100e3; }
  function log(t) { var l = R().log; l.unshift({ day: G.state.day, text: t }); if (l.length > 10) l.pop(); }
  var Rv = G.rivals = {
    TYPES: TYPES,
    strLabel: function (r) { return STRN[Math.min(3, Math.floor(r.str / 26))]; },
    active: function () { return R().list.filter(function (r) { return !(r.closedUntil >= G.state.day); }); },
    promoting: function (r) { return r.promo && r.promo.until >= G.state.day; },
    shielded: function () { return R().shield >= G.state.day; },
    intel: function () { return R().intel >= G.state.day; },
    // phần khách bị kéo đi bởi một đối thủ (0-0.3)
    impact: function (r) {
      if (r.closedUntil >= G.state.day) return 0;
      var i = TYPES[r.type].base * (r.str / 100) * (1.15 - 0.6 * G.state.rep / 100);
      if (Rv.promoting(r)) i *= 1 + r.promo.off * 4;       // khuyến mãi 10-30% => x1.4-2.2
      if (Rv.shielded()) i *= 0.5;
      return G.clamp(i, 0, 0.3);
    },
    trafficMult: function () {
      var m = 1; R().list.forEach(function (r) { m *= 1 - Rv.impact(r); });
      return m * (1 + 0.03 * R().absorbed);
    },
    counterCost: function () { return Math.round(unit() * 10 / 1e5) * 1e5; },
    surveyCost: function () { return Math.round(unit() * 3 / 1e5) * 1e5; },
    buyoutCost: function (r) { return Math.round(12 * G.lvl().rent * (0.5 + r.str / 100) / 1e6) * 1e6; },
    survey: function () {
      var s = G.state, c = Rv.surveyCost();
      if (!R().list.length) return { ok: false, msg: 'Chưa có đối thủ để khảo sát' };
      if (s.money < c) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(c) + ')' };
      G.econ.expense(c, 'ads'); R().intel = s.day + 14;
      return { ok: true, msg: 'Đã khảo sát thị trường: nắm rõ đối thủ trong 14 ngày' };
    },
    counter: function (quiet) {
      var s = G.state, c = Rv.counterCost();
      if (!R().list.length) return { ok: false, msg: 'Chưa có đối thủ' };
      if (Rv.shielded()) return { ok: false, msg: 'Chiến dịch đáp trả đang chạy' };
      if (s.money < c) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(c) + ')' };
      G.econ.expense(c, 'ads'); R().shield = s.day + 7;
      return { ok: true, msg: 'Đã chạy chiến dịch đáp trả: ảnh hưởng của đối thủ giảm một nửa trong 7 ngày' };
    },
    buyout: function (id) {
      var s = G.state, r = R().list.filter(function (x) { return x.id === id; })[0]; if (!r) return { ok: false };
      if (s.level < 3) return { ok: false, msg: 'Thâu tóm mở từ cấp Showroom' };
      var c = Rv.buyoutCost(r); if (s.money < c) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(c) + ')' };
      G.econ.cash(-c); R().list = R().list.filter(function (x) { return x.id !== id; }); R().absorbed++; R().nextOpen = s.day + 120; s.rep = G.clamp(s.rep + 2, 0, 100);
      log('Thâu tóm ' + r.name); G.notify.push({ title: '🏢 Thâu tóm ' + r.name, text: 'Chi ' + G.fmt.vnd(c) + '. Khách của họ chuyển sang bạn (+3% khách vĩnh viễn, +2 danh tiếng). Một đối thủ mới có thể xuất hiện sau ~4 tháng.', type: 'good', sound: 'good' });
      return { ok: true };
    },
    // ---- vòng đời ----
    open: function () {
      var s = G.state, used = R().list.map(function (r) { return r.type; });
      var pool = Object.keys(TYPES).filter(function (t) { return used.indexOf(t) < 0 && (t !== 'lux' || s.level >= 3); });
      if (!pool.length) return;
      var type = pool.indexOf('cheap') >= 0 && s.level <= 2 ? 'cheap' : G.pick(pool), T = TYPES[type];
      var usedN = R().list.map(function (r) { return r.name; }), nm = T.names.filter(function (n) { return usedN.indexOf(n) < 0; });
      var r = { id: R().nextId++, name: G.pick(nm.length ? nm : T.names), type: type, str: G.randInt(22, 34), opened: s.day, promo: null, closedUntil: 0, bias: G.randInt(-6, 8), next: null };
      R().list.push(r); Rv.plan(r); log(r.name + ' khai trương');
      G.notify.modal({ title: '⚔ Đối thủ mới: ' + r.name, sound: 'warn', def: 0,
        html: '<p><b>' + G.esc(r.name) + '</b> (' + T.label + ') vừa khai trương gần cửa hàng bạn. ' + G.esc(T.desc) + '</p><p>Họ sẽ kéo bớt khách. Danh tiếng cao, nhân viên hài lòng và chiến dịch đáp trả giúp bạn chống đỡ. Xem tab <b>Thêm → Đối thủ</b>.</p>',
        choices: [{ label: 'Hiểu rồi', cls: 'primary' }] });
    },
    plan: function (r) {
      var T = TYPES[r.type], kinds = [['promo', T.promo], ['expand', 20], ['poach', T.poach], ['stumble', 14]];
      r.next = { day: G.state.day + G.randInt(9, 18), kind: G.weighted(kinds, function (k) { return k[1]; })[0] };
    },
    run: function (r) {
      var s = G.state, k = r.next.kind, T = TYPES[r.type];
      if (k === 'promo') {
        var off = G.pick([0.1, 0.15, 0.2, 0.3]), days = G.randInt(4, 6); r.promo = { until: s.day + days - 1, off: off };
        log(r.name + ' khuyến mãi ' + Math.round(off * 100) + '%');
        var cost = Rv.counterCost(), can = !Rv.shielded() && s.money >= cost;
        G.notify.modal({ title: '🏷 ' + r.name + ' khuyến mãi ' + Math.round(off * 100) + '%', def: 1,
          html: '<p>Đối thủ giảm giá <b>' + Math.round(off * 100) + '%</b> trong ' + days + ' ngày; khách sẽ bị kéo sang đó nhiều hơn bình thường (ảnh hưởng tạm tăng gấp ' + (1 + off * 4).toFixed(1).replace('.', ',') + ').</p>' + (Rv.shielded() ? '<p class="muted">Chiến dịch đáp trả của bạn đang chạy, ảnh hưởng đã được giảm.</p>' : ''),
          choices: [{ label: 'Đáp trả (' + G.fmt.short(cost) + ', 7 ngày)', cls: 'primary', disabled: !can, fn: function () { G.ui && G.ui.res ? G.ui.res(Rv.counter()) : Rv.counter(); } }, { label: 'Giữ nguyên' }] });
      } else if (k === 'expand') {
        var up = G.randInt(8, 14); r.str = Math.min(95, r.str + up); log(r.name + ' mở rộng');
        G.notify.push({ title: r.name + ' mở rộng', text: 'Đối thủ nhập thêm hàng, trang trí lại cửa hàng: mạnh lên (' + Rv.strLabel(r) + ').', type: 'warn', sound: false });
      } else if (k === 'stumble') {
        r.str = Math.max(10, r.str - G.randInt(6, 12)); r.closedUntil = s.day + G.randInt(3, 5); log(r.name + ' gặp sự cố');
        G.notify.push({ title: r.name + ' gặp sự cố', text: 'Đối thủ tạm đóng cửa vài ngày (kiểm tra hàng/thiếu nhân sự). Khách quay lại cửa hàng bạn!', type: 'good', sound: 'good' });
      } else if (k === 'poach') Rv.poach(r);
      Rv.plan(r);
    },
    poach: function (r) {
      var s = G.state, st = s.staff.filter(function (x) { return x.status === 'ok'; }).sort(function (a, b) { return b.stars - a.stars || a.sat - b.sat; })[0];
      if (!st) { G.notify.push({ title: r.name + ' tuyển người', text: 'Họ đăng tin tuyển dụng rầm rộ nhưng bạn chưa có nhân viên nào để bị săn.', type: 'info', sound: false, toast: false }); return; }
      log(r.name + ' săn ' + st.name);
      if (st.sat >= 70) { G.notify.push({ title: st.name + ' từ chối đối thủ', text: r.name + ' mời ' + st.name + ' sang làm nhưng nhân viên hài lòng nên ở lại.', type: 'good', sound: false }); st.sat = Math.min(100, st.sat + 3); return; }
      var pay = Math.round(st.salary * 0.15 / 1e5) * 1e5;
      G.notify.modal({ title: '🕵 ' + r.name + ' săn nhân viên', def: 0, sound: 'warn',
        html: '<p><b>' + G.esc(st.name) + '</b> (' + G.roleById[st.role].name + ', ' + st.stars + '★, hài lòng ' + Math.round(st.sat) + ') được ' + G.esc(r.name) + ' mời sang với lương cao hơn.</p><p>Giữ lại: tăng lương thêm ' + G.fmt.vnd(pay) + '/tháng. Nếu không, nhiều khả năng họ nghỉ.</p>',
        choices: [{ label: 'Tăng lương để giữ', cls: 'primary', fn: function () { if (!G.staff.byId(st.id)) return; G.ui && G.ui.res ? G.ui.res(G.staff.raise(st.id, 0.15)) : G.staff.raise(st.id, 0.15); } },
          { label: 'Để họ tự quyết', fn: function () { if (G.staff.byId(st.id) && G.chance(0.7)) { G.notify.push({ title: st.name + ' sang đối thủ', text: 'Nghỉ việc để làm cho ' + r.name + '.', type: 'bad' }); G.staff.remove(st.id); r.str = Math.min(95, r.str + 3); } else G.notify.push({ title: st.name + ' ở lại', text: 'Cân nhắc rồi quyết định không đi.', type: 'info', sound: false }); } }] });
    }
  };
  // ---- ảnh hưởng tới bán hàng ----
  var tm = function () { return Rv.trafficMult(); }; tm.label = 'Đối thủ'; G.trafficMods.push(tm);
  G.conversionMods.push(function () { if (Rv.shielded()) return 1; var n = R().list.filter(Rv.promoting).length; return n ? 1 - 0.04 * n : 1; });
  G.acceptMods.push(function (c, sku) { // đối thủ giá rẻ kéo giá chấp nhận của hàng phổ thông xuống
    var t = G.skus[sku], r = R().list.filter(function (x) { return x.type === 'cheap'; })[0];
    return r && t && t.grade ? 1 - 0.05 * r.str / 100 : 1;
  });
  G.on('dayStart', function () {
    var s = G.state, w = R();
    // ngày thực thi sự kiện đã lên kế hoạch; khảo sát thì báo trước 1 ngày
    w.list.forEach(function (r) {
      if (r.promo && r.promo.until < s.day) r.promo = null;
      var target = Math.min(95, 28 + s.level * 8 + (TYPES[r.type].bias || 0) + r.bias + (r.type === 'online' ? Math.min(12, (s.day - r.opened) / 20) : 0));
      r.str += G.clamp(target - r.str, -0.5, 0.5);
      if (r.next && Rv.intel() && r.next.day === s.day + 1) G.notify.push({ title: '🔎 Tin tình báo: ' + r.name, text: 'Ngày mai đối thủ sẽ ' + ({ promo: 'khuyến mãi lớn', expand: 'mở rộng', poach: 'săn nhân viên', stumble: 'gặp sự cố' }[r.next.kind]) + '.', type: 'info', sound: false });
      if (r.next && r.next.day <= s.day) Rv.run(r);
    });
    var cap = CAP[s.level] || 0;
    if (!w.nextOpen && cap) w.nextOpen = s.day + G.randInt(5, 12);
    if (w.list.length < cap && w.nextOpen && s.day >= w.nextOpen && s.day >= 15) { w.nextOpen = s.day + G.randInt(30, 60); Rv.open(); }
  });
  // thành tựu liên quan
  if (G.quests) G.quests.ACH.push({ id: 'rivalBuy', ico: '🏢', name: 'Nuốt chửng đối thủ', desc: 'Thâu tóm một đối thủ cạnh tranh', cur: function () { return G.state.rivals.absorbed; }, goal: 1, m: 10, rep: 2 });
})();
