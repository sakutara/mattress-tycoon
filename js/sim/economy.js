/* Kinh tế: thu chi, báo cáo ngày/tháng. P&L: doanh thu - giá vốn - chi phí (không tính tiền nhập hàng, vì đã vào giá vốn). */
(function () {
  'use strict';
  var G = window.G;
  function blank() { return { revenue: 0, cogs: 0, sales: 0, units: 0, visitors: 0, served: 0, lostWait: 0, lostPrice: 0, lostStock: 0, lostOther: 0, exp: {}, byBrand: {}, ratingSum: 0, ratingN: 0 }; }
  G.addDefaults({ today: blank(), month: blank(), history: { days: [], months: [] }, tax: { rate: 0.015 } });
  var E = G.econ = {
    blank: blank,
    EXP_NAMES: { rent: 'Thuê mặt bằng', wages: 'Lương nhân viên', power: 'Điện nước', tax: 'Thuế & phí', transport: 'Vận chuyển nội bộ', whrent: 'Thuê kho ngoài', training: 'Đào tạo', ads: 'Quảng cáo', fees: 'Phí khác', shipfee: 'Phí giao hàng', loss: 'Thất thoát', penalty: 'Phạt', branch: 'Chi nhánh' },
    income: function (amt, cat) { var s = G.state; s.money += amt; s.today.revenue += amt; s.month.revenue += amt; s.totalRevenue += amt; },
    // ghi nhận doanh thu không phát sinh tiền mới (VD: cọc đã nhận trước)
    recognize: function (amt) { var s = G.state; s.today.revenue += amt; s.month.revenue += amt; s.totalRevenue += amt; },
    cogs: function (amt) { G.state.today.cogs += amt; G.state.month.cogs += amt; },
    expense: function (amt, cat) {
      var s = G.state; s.money -= amt;
      s.today.exp[cat] = (s.today.exp[cat] || 0) + amt; s.month.exp[cat] = (s.month.exp[cat] || 0) + amt;
    },
    // dòng tiền không vào P&L (nhập hàng, hoàn tiền NCC, cọc...)
    cash: function (amt) { G.state.money += amt; },
    expTotal: function (r) { var t = 0; Object.keys(r.exp).forEach(function (k) { t += r.exp[k]; }); return t; },
    profit: function (r) { return r.revenue - r.cogs - E.expTotal(r); },
    addStat: function (key, n) { var s = G.state; s.today[key] = (s.today[key] || 0) + (n || 1); s.month[key] = (s.month[key] || 0) + (n || 1); },
    taxReduction: function () { // kế toán giảm 5-10%
      var st = (G.staff ? G.staff.byRole('accountant') : []).filter(function (x) { return x.status !== 'quit'; });
      var r = 0; st.forEach(function (a) { r += 0.04 + a.stars * 0.02; });
      return Math.min(0.4, r);
    }
  };
  G.on('dayEnd', function () {
    var s = G.state, t = s.today, lvl = G.lvl();
    E.expense(lvl.power, 'power');
    var tax = Math.round(t.revenue * s.tax.rate * (1 - E.taxReduction()));
    if (tax > 0) E.expense(tax, 'tax');
    var rep = { day: s.day, revenue: t.revenue, cogs: t.cogs, exp: G.clone(t.exp), expTotal: E.expTotal(t), profit: E.profit(t), sales: t.sales, units: t.units, visitors: t.visitors, served: t.served, lostWait: t.lostWait, lostPrice: t.lostPrice, lostStock: t.lostStock, lostOther: t.lostOther, rating: s.avgRating, money: s.money };
    s.totalProfit += rep.profit;
    // gộp vào tháng
    ['visitors', 'served', 'lostWait', 'lostPrice', 'lostStock', 'lostOther', 'sales', 'units', 'cogs'].forEach(function (k) { /* month đã cộng dồn qua addStat/cogs */ });
    s.history.days.push(rep); if (s.history.days.length > 60) s.history.days.shift();
    G.emit('report', rep);
    G.notify.push({ title: s.shopName + ' - báo cáo ngày ' + s.day, text: 'Doanh thu ' + G.fmt.short(rep.revenue) + ' · Lãi ' + G.fmt.short(rep.profit) + ' · ' + rep.sales + ' đơn', type: rep.profit >= 0 ? 'good' : 'warn', sound: false, toast: false });
    s.today = blank();
  });
  G.on('monthStart', function () {
    var s = G.state, m = s.month;
    var rep = { month: G.cal.monthNo(s.day) - 1, revenue: m.revenue, cogs: m.cogs, exp: G.clone(m.exp), expTotal: E.expTotal(m), profit: E.profit(m), sales: m.sales, units: m.units, visitors: m.visitors };
    s.history.months.push(rep); if (s.history.months.length > 24) s.history.months.shift();
    s.month = blank();
    G.emit('monthReport', rep);
    var lines = Object.keys(rep.exp).map(function (k) { return '<tr><td>' + (E.EXP_NAMES[k] || k) + '</td><td class="r">' + G.fmt.vnd(rep.exp[k]) + '</td></tr>'; }).join('');
    G.notify.modal({
      title: s.shopName + ' - báo cáo tháng ' + rep.month, sound: 'info', def: 0,
      html: '<table class="tbl"><tr><td>Doanh thu</td><td class="r">' + G.fmt.vnd(rep.revenue) + '</td></tr><tr><td>Giá vốn hàng bán</td><td class="r">' + G.fmt.vnd(rep.cogs) + '</td></tr>' + lines +
        '<tr class="tot"><td>Lợi nhuận</td><td class="r ' + (rep.profit >= 0 ? 'pos' : 'neg') + '">' + G.fmt.vnd(rep.profit) + '</td></tr></table><p class="muted">Tiền thuê, lương và thuê kho sẽ được trừ ngay bây giờ (ngày 1 hàng tháng).</p>',
      choices: [{ label: 'Đóng', cls: 'primary' }]
    });
    // tiền thuê mặt bằng
    E.expense(G.lvl().rent, 'rent');
  });
})();
