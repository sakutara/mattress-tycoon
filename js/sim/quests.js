/* Nhiệm vụ hằng ngày (3 nhiệm vụ/ngày, chuỗi ngày liên tiếp, rương) & thành tựu (mở một lần, theo mốc tích lũy). Thưởng tiền mặt không tính vào doanh thu/thuế. */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ quests: { day: 0, list: [], chest: { done: false, claimed: false }, streak: 0, best: 0, doneDays: 0, ach: {}, st: { sales: 0, units: 0, upsells: 0, star5: 0, replies: 0, ship: 0, deposits: 0, lives: 0, orders: 0, meetings: 0, perfect: 0, quests: 0 } } });
  var FLOOR = [100e3, 300e3, 800e3, 2.5e6, 6e6, 15e6];
  function Q() { return G.state.quests; }
  // đơn vị thưởng: ~4% doanh thu ngày gần đây, có sàn theo cấp (để thưởng luôn tương xứng quy mô cửa hàng)
  function unit() {
    var d = G.state.history.days.slice(-5), avg = d.length ? d.reduce(function (a, r) { return a + r.revenue; }, 0) / d.length : 0;
    return Math.max(FLOOR[G.state.level] || FLOOR[0], Math.round(avg * 0.04 / 1e4) * 1e4);
  }
  function round2(n) { var p = Math.pow(10, Math.max(0, String(Math.round(n)).length - 2)); return Math.max(p, Math.round(n / p) * p); }
  function avgRev() {
    var d = G.state.history.days.slice(-3); if (!d.length) return 0;
    return d.reduce(function (a, r) { return a + r.revenue; }, 0) / d.length;
  }
  function traffic() { return Math.max(1, G.lvl().traffic / 4); }

  // ---- mẫu nhiệm vụ ngày ----
  // ev: sự kiện tăng tiến độ; inc(data,q) -> số cộng thêm (hoặc dùng set để gán tuyệt đối); eod(rep) -> true nếu đạt khi hết ngày
  var QT = {
    sales: { m: 1, ev: 'sale', goal: function () { return Math.max(4, Math.round(5 * traffic())); }, text: function (n) { return 'Chốt ' + n + ' đơn hàng'; }, inc: function () { return 1; }, w: 3 },
    revenue: { m: 1.5, ev: 'sale', goal: function () { return round2(Math.max(avgRev() * 1.1, FLOOR[G.state.level] * 3)); }, text: function (n) { return 'Doanh thu trong ngày đạt ' + G.fmt.short(n); }, set: function () { return G.state.today.revenue; }, fmt: G.fmt.short, w: 2 },
    upsell: { m: 1, ev: 'sale', goal: function () { return 2 + Math.floor(G.state.level / 2); }, text: function (n) { return 'Bán kèm (combo) thành công ' + n + ' lần'; }, inc: function (d) { return d.items.some(function (i) { return i.upsell; }) ? 1 : 0; }, w: 2 },
    star5: { m: 1.2, ev: 'reviewAdded', goal: function () { return 2; }, text: function (n) { return 'Nhận ' + n + ' đánh giá 5 sao'; }, inc: function (d) { return d.rating >= 5 ? 1 : 0; }, w: 2 },
    reply: { m: 0.8, ev: 'reviewReplied', elig: function () { return G.reviews.unanswered().length > 0; }, goal: function () { return Math.min(3, G.reviews.unanswered().length); }, text: function (n) { return 'Phản hồi ' + n + ' đánh giá của khách'; }, inc: function () { return 1; }, w: 2 },
    order: { m: 0.8, ev: 'orderPlaced', goal: function () { return 2; }, text: function (n) { return 'Đặt nhập hàng ' + n + ' đơn'; }, inc: function () { return 1; }, w: 2 },
    ship: { m: 1, min: 1, ev: 'shipDelivered', goal: function () { return 2; }, text: function (n) { return 'Giao thành công ' + n + ' đơn cho khách'; }, inc: function () { return 1; }, w: 1 },
    deposit: { m: 1.5, min: 1, ev: 'specialDone', goal: function () { return 1; }, text: function () { return 'Hoàn tất 1 đơn đặt cọc / đơn đặc biệt'; }, inc: function () { return 1; }, elig: function () { return G.state.special.list.length > 0; }, w: 2 },
    live: { m: 2, min: G.live ? G.live.MIN_LEVEL : 2, ev: 'liveEnd', goal: function () { return 1; }, text: function () { return 'Hoàn thành 1 buổi livestream'; }, inc: function () { return 1; }, elig: function () { return G.state.live.built; }, w: 1 },
    // chấm khi hết ngày
    nostock: { m: 1.5, eod: function (r) { return r.visitors >= 10 && r.lostStock === 0; }, text: function () { return 'Không để khách nào bỏ đi vì hết hàng (≥ 10 khách vào)'; }, w: 3 },
    nowait: { m: 1.2, eod: function (r) { return r.visitors >= 10 && r.lostWait === 0; }, text: function () { return 'Không để khách nào bỏ đi vì chờ lâu (≥ 10 khách vào)'; }, w: 2 },
    profit: { m: 1, eod: function (r) { return r.profit > 0; }, text: function () { return 'Kết ngày có lãi (doanh thu trừ mọi chi phí > 0)'; }, w: 2 }
  };
  var ORDER = Object.keys(QT);

  var Qs = G.quests = {
    QT: QT, unit: unit,
    list: function () { return Q().list; },
    // ---- tạo nhiệm vụ ngày ----
    generate: function () {
      var s = G.state, q = Q();
      if (q.day === s.day) return;
      // chuỗi: giữ nếu hôm trước (ngay liền trước) hoàn thành đủ, ngược lại về 0
      if (!(q.day === s.day - 1 && q.chest.done)) q.streak = 0;
      var pool = ORDER.filter(function (id) { var t = QT[id]; return (t.min || 0) <= s.level && (!t.elig || t.elig()); }), pick = [];
      while (pick.length < 3 && pool.length) {
        var id = G.weighted(pool, function (x) { return QT[x].w; }); pool.splice(pool.indexOf(id), 1); pick.push(id);
      }
      var u = unit();
      q.day = s.day; q.chest = { done: false, claimed: false };
      q.list = pick.map(function (id) {
        var t = QT[id], g = t.goal ? t.goal() : 1;
        return { id: id, goal: g, prog: 0, done: false, claimed: false, cash: Math.round(u * t.m / 1e4) * 1e4 };
      });
    },
    text: function (qq) { var t = QT[qq.id]; return t.text(qq.goal); },
    progText: function (qq) {
      var t = QT[qq.id]; if (t.eod) return qq.done ? 'Đạt' : 'Chấm khi hết ngày';
      var f = t.fmt || G.fmt.num; return f(Math.min(qq.prog, qq.goal)) + ' / ' + f(qq.goal);
    },
    chestCash: function () { var q = Q(); return Math.round(unit() * (2 + Math.min(q.streak, 7) * 0.5) / 1e4) * 1e4; },
    allDone: function () { var l = Q().list; return l.length > 0 && l.every(function (x) { return x.done; }); },
    claim: function (i) {
      var qq = Q().list[i]; if (!qq || !qq.done || qq.claimed) return { ok: false };
      qq.claimed = true; G.econ.cash(qq.cash);
      G.notify.toast('🎯 Nhận ' + G.fmt.vnd(qq.cash), 'good'); return { ok: true };
    },
    claimChest: function () {
      var q = Q(); if (!q.chest.done || q.chest.claimed) return { ok: false };
      var c = Qs.chestCash(); q.chest.claimed = true; G.econ.cash(c); G.state.rep = G.clamp(G.state.rep + 1, 0, 100);
      G.notify.toast('🎁 Rương nhiệm vụ: ' + G.fmt.vnd(c) + ' và +1 danh tiếng', 'good'); return { ok: true };
    },
    claimAll: function () {
      var q = Q(); q.list.forEach(function (x, i) { Qs.claim(i); }); Qs.claimChest();
    },
    claimable: function () { var q = Q(); return q.list.filter(function (x) { return x.done && !x.claimed; }).length + (q.chest.done && !q.chest.claimed ? 1 : 0) + Qs.achClaimable(); },
    pending: function () { return Q().list.filter(function (x) { return !x.done; }).length; },
    complete: function (qq) {
      var q = Q(); qq.done = true; qq.prog = Math.max(qq.prog, qq.goal); q.st.quests++;
      G.notify.push({ title: '🎯 Hoàn thành nhiệm vụ', text: Qs.text(qq) + ' - vào Thêm → Nhiệm vụ để nhận thưởng.', type: 'good', sound: 'good', toast: true });
      if (!q.chest.done && Qs.allDone()) {
        q.chest.done = true; q.streak++; q.best = Math.max(q.best, q.streak); q.doneDays++;
        G.notify.push({ title: '🎁 Xong hết nhiệm vụ hôm nay', text: 'Chuỗi ' + q.streak + ' ngày. Rương thưởng đang chờ bạn nhận.', type: 'good', sound: 'good' });
      }
    },
    bump: function (ev, d) {
      var q = Q(); if (!q.list.length) return;
      q.list.forEach(function (qq) {
        var t = QT[qq.id]; if (qq.done || t.ev !== ev) return;
        if (t.set) qq.prog = t.set(d, qq); else qq.prog += t.inc(d, qq) || 0;
        if (qq.prog >= qq.goal) Qs.complete(qq);
      });
    },
    // ---- thành tựu ----
    // cur: tiến độ hiện tại; goal: mốc; m: hệ số thưởng tiền (× đơn vị); rep: danh tiếng thưởng
    ACH: (function () {
      var A = [], st = function (k) { return function () { return Q().st[k]; }; };
      function add(id, ico, name, desc, cur, goal, m, rep, fmt) { A.push({ id: id, ico: ico, name: name, desc: desc, cur: cur, goal: goal, m: m, rep: rep || 0, fmt: fmt }); }
      add('sale1', '🛍', 'Đơn hàng đầu tiên', 'Chốt đơn đầu tiên', st('sales'), 1, 1);
      add('sale100', '🧾', 'Bán đều tay', 'Chốt 100 đơn', st('sales'), 100, 3);
      add('sale1000', '📈', 'Cửa hàng quen mặt', 'Chốt 1.000 đơn', st('sales'), 1000, 10, 2);
      add('sale10000', '🏭', 'Vua đơn hàng', 'Chốt 10.000 đơn', st('sales'), 10000, 30, 3);
      add('unit500', '📦', 'Xuất kho 500 món', 'Bán tổng cộng 500 sản phẩm', st('units'), 500, 6);
      add('upsell50', '🛒', 'Tay bán kèm', 'Bán kèm (combo) 50 lần', st('upsells'), 50, 4);
      add('rev100m', '💰', 'Trăm triệu đầu tiên', 'Doanh thu tích lũy 100 triệu', function () { return G.state.totalRevenue; }, 100e6, 3, 0, G.fmt.short);
      add('rev1b', '💎', 'Tỷ phú nhỏ', 'Doanh thu tích lũy 1 tỷ', function () { return G.state.totalRevenue; }, 1e9, 8, 1, G.fmt.short);
      add('rev10b', '🏆', 'Đế chế chăn ga', 'Doanh thu tích lũy 10 tỷ', function () { return G.state.totalRevenue; }, 10e9, 20, 3, G.fmt.short);
      [[1, 'Có mặt bằng', 3], [2, 'Lên mặt phố', 5], [3, 'Showroom đầu tiên', 8], [4, 'Đại lý ủy quyền', 12], [5, 'Chuỗi cửa hàng', 20]].forEach(function (x) {
        add('lvl' + x[0], '⬆', x[1], 'Nâng cấp lên cấp ' + x[0] + ' (' + G.data.levels[x[0]].name + ')', function () { return G.state.level; }, x[0], x[2], 1);
      });
      add('rep30', '🌟', 'Có tiếng trong vùng', 'Danh tiếng đạt 30', function () { return G.state.rep; }, 30, 3);
      add('rep60', '🌟', 'Thương hiệu được tin', 'Danh tiếng đạt 60', function () { return G.state.rep; }, 60, 6, 1);
      add('rep90', '🌠', 'Tiếng lành đồn xa', 'Danh tiếng đạt 90', function () { return G.state.rep; }, 90, 12, 2);
      add('star5x20', '⭐', 'Khách mê tít', 'Nhận 20 đánh giá 5 sao', st('star5'), 20, 4);
      add('star5x100', '🤩', 'Đánh giá vàng', 'Nhận 100 đánh giá 5 sao', st('star5'), 100, 12, 1);
      add('avg45', '🥇', 'Chất lượng 4,5 sao', 'Điểm đánh giá trung bình ≥ 4,5 (sau ≥ 30 đánh giá)', function () { return G.state.ratingN >= 30 ? G.reviews.avg() : 0; }, 4.5, 8, 2, function (v) { return v.toFixed(1).replace('.', ','); });
      add('reply30', '💬', 'Biết lắng nghe', 'Phản hồi 30 đánh giá', st('replies'), 30, 4);
      add('ship30', '🚚', 'Giao hàng đúng hẹn', 'Giao thành công 30 đơn', st('ship'), 30, 4);
      add('dep10', '🤝', 'Giữ chữ tín', 'Hoàn tất 10 đơn đặt cọc / đơn đặc biệt', st('deposits'), 10, 5);
      add('live5', '🎥', 'Ngôi sao livestream', 'Hoàn thành 5 buổi livestream', st('lives'), 5, 6);
      add('order50', '🏷', 'Nhập hàng chuyên nghiệp', 'Đặt 50 đơn nhập hàng', st('orders'), 50, 5);
      add('meet4', '👥', 'Đội ngũ gắn kết', 'Tổ chức 4 buổi họp nhân viên', st('meetings'), 4, 4);
      add('staff5', '🧑‍🤝‍🧑', 'Đội ngũ 5 người', 'Có 5 nhân viên cùng lúc', function () { return G.state.staff.filter(function (x) { return x.status !== 'quit'; }).length; }, 5, 4);
      add('perfect5', '✨', 'Ngày hoàn hảo', '5 ngày không khách nào bỏ đi vì hết hàng hoặc chờ lâu (≥ 10 khách/ngày)', st('perfect'), 5, 6, 1);
      add('day30', '📅', 'Trụ vững một tháng', 'Kinh doanh tới ngày 30', function () { return G.state.day; }, 30, 2);
      add('day120', '🗓', 'Một năm bốn mùa', 'Kinh doanh tới ngày 120', function () { return G.state.day; }, 120, 6);
      add('day360', '🎂', 'Một năm tròn', 'Kinh doanh tới ngày 360', function () { return G.state.day; }, 360, 15, 2);
      add('quest30', '🎯', 'Chăm chỉ', 'Hoàn thành 30 nhiệm vụ ngày', st('quests'), 30, 5);
      add('streak7', '🔥', 'Chuỗi 7 ngày', 'Xong hết nhiệm vụ 7 ngày liên tiếp', function () { return Q().best; }, 7, 8, 1);
      return A;
    })(),
    achById: function (id) { return Qs.ACH.filter(function (a) { return a.id === id; })[0]; },
    achCash: function (a) { return Math.round(unit() * a.m / 1e4) * 1e4; },
    achClaimable: function () { var q = Q(); return Qs.ACH.filter(function (a) { return q.ach[a.id] && !q.ach[a.id].claimed; }).length; },
    claimAch: function (id) {
      var q = Q(), a = Qs.achById(id), r = q.ach[id]; if (!a || !r || r.claimed) return { ok: false };
      var c = Qs.achCash(a); r.claimed = true; G.econ.cash(c); if (a.rep) G.state.rep = G.clamp(G.state.rep + a.rep, 0, 100);
      G.notify.toast('🏅 ' + a.name + ': ' + G.fmt.vnd(c) + (a.rep ? ' và +' + a.rep + ' danh tiếng' : ''), 'good'); return { ok: true };
    },
    checkAch: function () {
      var q = Q(), fresh = [];
      Qs.ACH.forEach(function (a) {
        if (q.ach[a.id]) return;
        if (a.cur() >= a.goal) { q.ach[a.id] = { day: G.state.day, claimed: false }; fresh.push(a); }
      });
      if (!fresh.length) return;
      if (fresh.length <= 2) fresh.forEach(function (a) { G.notify.push({ title: '🏅 Thành tựu: ' + a.name, text: a.desc + ' - vào Thêm → Nhiệm vụ để nhận thưởng.', type: 'good', sound: 'good' }); });
      else G.notify.push({ title: '🏅 ' + fresh.length + ' thành tựu mới', text: fresh.map(function (a) { return a.name; }).join(', ') + ' - vào Thêm → Nhiệm vụ để nhận thưởng.', type: 'good', sound: 'good' });
    }
  };

  // ---- nối sự kiện ----
  function stat(k, n) { Q().st[k] += n || 1; }
  G.on('init', function () { Qs.generate(); Qs.checkAch(); });
  G.on('dayStart', function () { Qs.generate(); Qs.checkAch(); });
  G.on('sale', function (d) {
    stat('sales'); d.items.forEach(function (i) { stat('units', i.qty || 1); if (i.upsell) stat('upsells'); });
    Qs.bump('sale', d); Qs.checkAch();
  });
  G.on('reviewAdded', function (d) { if (d.rating >= 5) stat('star5'); Qs.bump('reviewAdded', d); });
  G.on('reviewReplied', function (d) { stat('replies'); Qs.bump('reviewReplied', d); });
  G.on('shipDelivered', function (d) { stat('ship'); Qs.bump('shipDelivered', d); });
  G.on('specialDone', function (d) { stat('deposits'); Qs.bump('specialDone', d); });
  G.on('liveEnd', function (d) { stat('lives'); Qs.bump('liveEnd', d); });
  G.on('orderPlaced', function (d) { stat('orders'); Qs.bump('orderPlaced', d); });
  G.on('meetingDone', function () { stat('meetings'); });
  G.on('levelUp', function () { Qs.checkAch(); });
  // 'report' phát ra trước khi số liệu ngày bị đặt lại
  G.on('report', function (r) {
    var q = Q();
    q.list.forEach(function (qq) { var t = QT[qq.id]; if (!qq.done && t.eod && t.eod(r)) Qs.complete(qq); });
    if (r.visitors >= 10 && r.lostStock === 0 && r.lostWait === 0) stat('perfect');
    Qs.checkAch();
  });
})();
