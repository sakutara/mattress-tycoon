/* Doanh nghiệp: từ chuỗi cửa hàng lên Công ty TNHH → Cổ phần → Tập đoàn. Phòng ban, chi nhánh mở rộng, vay doanh nghiệp, gọi vốn (bán cổ phần), nhượng quyền. Tiền chi cổ tức/gốc vay là dòng tiền, không vào P&L. */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ corp: { tier: 0, name: '', founded: 0, dept: {}, loans: [], nextLoan: 1, stake: 0, franchises: 0, divPaid: 0, lateLoans: 0, log: [] } });
  G.econ.EXP_NAMES.corp = 'Chi phí doanh nghiệp'; G.econ.EXP_NAMES.interest = 'Lãi vay';
  var TIERS = [
    { name: 'Chưa thành lập' },
    { name: 'Công ty TNHH', fee: 1.5e9, rev: 25e9, dept: 0, maxDept: 3, branches: 4, fr: 0, val: 1 },
    { name: 'Công ty cổ phần', fee: 8e9, rev: 80e9, dept: 2, maxDept: 5, branches: 6, fr: 5, val: 1.25 },
    { name: 'Tập đoàn', fee: 30e9, rev: 250e9, dept: 4, maxDept: 6, branches: 8, fr: 12, val: 1.5 }
  ];
  var DEPT = [
    { id: 'purch', name: 'Phòng Mua hàng', setup: 1.2e9, month: 20e6, note: 'Chiết khấu sản lượng: hoàn 5% giá vốn mỗi tháng.' },
    { id: 'sales', name: 'Phòng Kinh doanh', setup: 1.5e9, month: 25e6, note: '+6% lượng khách; cần để nhượng quyền.' },
    { id: 'fin', name: 'Phòng Tài chính - Kế toán', setup: 2e9, month: 20e6, note: 'Giảm thêm 8% thuế & phí; lãi vay thấp hơn 0,2%/tháng.' },
    { id: 'hr', name: 'Phòng Nhân sự', setup: 1e9, month: 15e6, note: '+0,25 hài lòng mỗi ngày cho mọi nhân viên.' },
    { id: 'mkt', name: 'Phòng Marketing', setup: 1.2e9, month: 25e6, note: '+4% lượng khách, +4% tỉ lệ chốt.' },
    { id: 'logi', name: 'Phòng Logistics', setup: 1.5e9, month: 20e6, note: 'Giảm 20% phí giao hàng (ship) cho khách.' }
  ];
  var STAKE_MAX = 45, LOAN_STEPS = [2e9, 5e9, 10e9, 25e9];
  function C() { return G.state.corp; }
  function log(t) { var l = C().log; l.unshift({ day: G.state.day, text: t }); if (l.length > 12) l.pop(); }
  var Co = G.corp = {
    TIERS: TIERS, DEPT: DEPT, STAKE_MAX: STAKE_MAX, LOAN_STEPS: LOAN_STEPS,
    tier: function () { return C().tier; },
    cur: function () { return TIERS[C().tier]; },
    has: function (id) { return !!C().dept[id]; },
    deptCount: function () { return Object.keys(C().dept).filter(function (k) { return C().dept[k]; }).length; },
    deptById: function (id) { return DEPT.filter(function (d) { return d.id === id; })[0]; },
    maxBranches: function () { return C().tier ? TIERS[C().tier].branches : 2; },
    branchMult: function () { return 1 + 0.4 * C().tier; },
    deptMonthly: function () { var t = 0; DEPT.forEach(function (d) { if (Co.has(d.id)) t += d.month; }); return t; },
    // ---- định giá ----
    revenue12: function () {
      var m = G.state.history.months.slice(-12), rev = 0, prof = 0;
      m.forEach(function (x) { rev += x.revenue; prof += x.profit; });
      if (m.length && m.length < 12) { rev = rev / m.length * 12; prof = prof / m.length * 12; }
      return { rev: rev, profit: prof };
    },
    valuation: function () {
      var r = Co.revenue12(), margin = r.rev > 0 ? r.profit / r.rev : 0, tier = Math.max(1, C().tier), mf = G.clamp(1 + margin * 2, 0.7, 1.4);
      return Math.round((r.rev * 1.2 * TIERS[tier].val * mf + Math.max(0, G.state.money - Co.owed()) * 0.5) / 1e7) * 1e7;
    },
    // ---- thành lập / nâng cấp ----
    next: function () { return TIERS[C().tier + 1] || null; },
    canUpgrade: function () {
      var n = Co.next(), s = G.state; if (!n) return { ok: false, msg: 'Đã là Tập đoàn' };
      if (s.level < 5) return { ok: false, msg: 'Cần đạt cấp Chuỗi cửa hàng' };
      if (s.totalRevenue < n.rev) return { ok: false, msg: 'Cần doanh thu tích lũy ' + G.fmt.short(n.rev) };
      if (Co.deptCount() < n.dept) return { ok: false, msg: 'Cần có ít nhất ' + n.dept + ' phòng ban' };
      if (s.money < n.fee) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(n.fee) + ')' };
      return { ok: true };
    },
    upgrade: function () {
      var c = Co.canUpgrade(); if (!c.ok) return c;
      var n = Co.next(), s = G.state, k = C();
      G.econ.cash(-n.fee); k.tier++; if (!k.name) k.name = 'Công ty ' + s.shopName; if (k.tier === 1) k.founded = s.day;
      log('Nâng cấp lên ' + n.name);
      G.notify.modal({ title: '🏢 ' + n.name, sound: 'good', def: 0, html: '<p>Bạn đã nâng cấp lên <b>' + G.esc(n.name) + '</b>!</p><ul><li>Tối đa ' + n.branches + ' chi nhánh, thu nhập mỗi chi nhánh ×' + Co.branchMult().toFixed(1).replace('.', ',') + '</li><li>Tối đa ' + n.maxDept + ' phòng ban' + (n.fr ? '</li><li>Nhượng quyền tối đa ' + n.fr + ' đại lý' : '') + '</li><li>Mở vay doanh nghiệp và gọi vốn từ nhà đầu tư</li></ul>', choices: [{ label: 'Tuyệt vời!', cls: 'primary' }] });
      return { ok: true };
    },
    setDept: function (id, on) {
      var d = Co.deptById(id), k = C(); if (!d || !k.tier) return { ok: false, msg: 'Chưa thành lập công ty' };
      if (!on) { k.dept[id] = false; return { ok: true, msg: 'Đã giải thể ' + d.name }; }
      if (k.dept[id]) return { ok: false };
      if (Co.deptCount() >= TIERS[k.tier].maxDept) return { ok: false, msg: 'Hết chỗ phòng ban (' + TIERS[k.tier].maxDept + '), nâng cấp công ty để mở thêm' };
      if (G.state.money < d.setup) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(d.setup) + ')' };
      G.econ.expense(d.setup, 'corp'); k.dept[id] = true; log('Thành lập ' + d.name);
      return { ok: true, msg: 'Đã thành lập ' + d.name };
    },
    // ---- vay doanh nghiệp ----
    owed: function () { return C().loans.reduce(function (a, l) { return a + l.remaining; }, 0); },
    limit: function () { return Math.round(0.4 * Co.valuation() / 1e8) * 1e8; },
    rate: function () { return 0.011 - (Co.has('fin') ? 0.002 : 0); },
    borrow: function (amt) {
      var k = C(); if (!k.tier) return { ok: false, msg: 'Chưa thành lập công ty' };
      if (Co.owed() + amt > Co.limit()) return { ok: false, msg: 'Vượt hạn mức tín dụng (' + G.fmt.short(Co.limit()) + ', gồm dư nợ ' + G.fmt.short(Co.owed()) + ')' };
      var fee = Math.round(amt * 0.01);
      G.econ.cash(amt); G.econ.expense(fee, 'interest');
      k.loans.push({ id: k.nextLoan++, day: G.state.day, principal: amt, remaining: amt, monthsLeft: 12, rate: Co.rate() }); log('Vay ' + G.fmt.short(amt));
      return { ok: true, msg: 'Đã vay ' + G.fmt.vnd(amt) + ' (12 tháng, lãi ' + (Co.rate() * 100).toFixed(1).replace('.', ',') + '%/tháng, phí 1%)' };
    },
    repay: function (id) {
      var k = C(), l = k.loans.filter(function (x) { return x.id === id; })[0]; if (!l) return { ok: false };
      if (G.state.money < l.remaining) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(l.remaining) + ')' };
      G.econ.cash(-l.remaining); k.loans = k.loans.filter(function (x) { return x.id !== id; }); log('Tất toán khoản vay ' + G.fmt.short(l.principal));
      return { ok: true, msg: 'Đã tất toán khoản vay' };
    },
    // ---- gọi vốn ----
    sellPrice: function (pct) { return Math.round(pct / 100 * Co.valuation() * 0.9 / 1e7) * 1e7; },
    buyPrice: function (pct) { return Math.round(pct / 100 * Co.valuation() * 1.15 / 1e7) * 1e7; },
    sell: function (pct) {
      var k = C(); if (!k.tier) return { ok: false, msg: 'Chưa thành lập công ty' };
      if (k.stake + pct > STAKE_MAX) return { ok: false, msg: 'Tối đa bán ' + STAKE_MAX + '% cổ phần (đã bán ' + k.stake + '%)' };
      var p = Co.sellPrice(pct); G.econ.cash(p); k.stake += pct; log('Bán ' + pct + '% cổ phần: ' + G.fmt.short(p));
      return { ok: true, msg: 'Đã gọi vốn ' + G.fmt.vnd(p) + ' cho ' + pct + '% cổ phần. Nhà đầu tư sẽ nhận cổ tức hằng tháng.' };
    },
    buyback: function (pct) {
      var k = C(); if (k.stake < pct) return { ok: false, msg: 'Chỉ có ' + k.stake + '% đang bán ra' };
      var p = Co.buyPrice(pct); if (G.state.money < p) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(p) + ')' };
      G.econ.cash(-p); k.stake -= pct; log('Mua lại ' + pct + '% cổ phần: ' + G.fmt.short(p));
      return { ok: true, msg: 'Đã mua lại ' + pct + '% cổ phần' };
    },
    // ---- nhượng quyền ----
    frMax: function () { return C().tier ? TIERS[C().tier].fr : 0; },
    frFee: function () { return 300e6; },
    frRoyalty: function () { return Math.round(18e6 * G.clamp(G.state.rep / 60, 0.5, 1.5) / 1e6) * 1e6; },
    recruit: function () {
      var k = C();
      if (!Co.frMax()) return { ok: false, msg: 'Nhượng quyền mở từ Công ty cổ phần' };
      if (!Co.has('sales')) return { ok: false, msg: 'Cần Phòng Kinh doanh' };
      if (k.franchises >= Co.frMax()) return { ok: false, msg: 'Đã đủ ' + Co.frMax() + ' đại lý' };
      k.franchises++; G.econ.cash(Co.frFee()); log('Ký đại lý nhượng quyền #' + k.franchises);
      return { ok: true, msg: 'Đã ký đại lý nhượng quyền: nhận phí ' + G.fmt.vnd(Co.frFee()) + ', thu phí bản quyền mỗi tháng' };
    }
  };
  G.progress.maxBranches = Co.maxBranches;
  // ---- hiệu ứng ----
  var tm = function () { var m = 1; if (Co.has('sales')) m *= 1.06; if (Co.has('mkt')) m *= 1.04; return m * (1 + 0.01 * C().franchises); }; tm.label = 'Doanh nghiệp'; G.trafficMods.push(tm);
  G.conversionMods.push(function () { return Co.has('mkt') ? 1.04 : 1; });
  var oldTax = G.econ.taxReduction; G.econ.taxReduction = function () { return Math.min(0.5, oldTax() + (Co.has('fin') ? 0.08 : 0)); };
  if (G.shipping) { var oldFee = G.shipping.fee; G.shipping.fee = function (car, vol) { var f = oldFee(car, vol); return Co.has('logi') ? Math.round(f * 0.8 / 1000) * 1000 : f; }; }
  G.on('dayStart', function () { if (!Co.has('hr')) return; G.state.staff.forEach(function (st) { st.sat = Math.min(100, st.sat + 0.25); }); });
  G.on('monthReport', function (rep) {
    var s = G.state, k = C(); if (!k.tier) return;
    var out = [];
    var dm = Co.deptMonthly(); if (dm) { G.econ.expense(dm, 'corp'); }
    if (Co.has('purch') && rep.cogs > 0) { var rb = Math.round(rep.cogs * 0.05); G.econ.cash(rb); G.econ.cogs(-rb); out.push('Chiết khấu mua hàng +' + G.fmt.short(rb)); }
    var interest = 0, princ = 0, late = 0;
    k.loans.slice().forEach(function (l) {
      var pr = Math.round(l.principal / 12), intr = Math.round(l.remaining * l.rate);
      if (s.money < pr + intr) { late++; G.econ.expense(Math.round(l.remaining * 0.03), 'interest'); s.rep = G.clamp(s.rep - 2, 0, 100); return; }
      G.econ.expense(intr, 'interest'); G.econ.cash(-pr); interest += intr; princ += pr; l.remaining -= pr; l.monthsLeft--;
      if (l.remaining <= 0 || l.monthsLeft <= 0) k.loans = k.loans.filter(function (x) { return x.id !== l.id; });
    });
    if (interest || princ) out.push('Trả nợ: gốc ' + G.fmt.short(princ) + ', lãi ' + G.fmt.short(interest));
    if (late) { k.lateLoans += late; G.notify.push({ title: '🏦 Trễ hạn trả nợ', text: late + ' khoản vay không đủ tiền trả: phạt 3% dư nợ, -2 danh tiếng mỗi khoản.', type: 'bad' }); }
    if (k.stake > 0 && rep.profit > 0) { var dv = Math.round(rep.profit * 0.5 * k.stake / 100); G.econ.cash(-dv); k.divPaid += dv; out.push('Cổ tức nhà đầu tư -' + G.fmt.short(dv)); }
    if (k.franchises) {
      var roy = k.franchises * Co.frRoyalty(); G.econ.income(roy, 'royalty'); out.push('Bản quyền ' + k.franchises + ' đại lý +' + G.fmt.short(roy));
      if (s.rep < 50 && G.chance(0.1 * k.franchises)) { s.rep = G.clamp(s.rep - 3, 0, 100); G.notify.push({ title: '⚠ Đại lý nhượng quyền làm ăn ẩu', text: 'Một đại lý bị khách phản ánh làm ảnh hưởng thương hiệu (-3 danh tiếng). Giữ danh tiếng cao để đại lý chuẩn mực.', type: 'warn' }); }
    }
    if (dm) out.unshift('Phòng ban -' + G.fmt.short(dm));
    if (out.length) G.notify.push({ title: '🏢 Báo cáo doanh nghiệp tháng', text: out.join(' · '), type: 'info', sound: false });
  });
  if (G.quests) {
    G.quests.ACH.push({ id: 'corp1', ico: '🏢', name: 'Ông chủ doanh nghiệp', desc: 'Thành lập Công ty TNHH', cur: function () { return G.state.corp.tier; }, goal: 1, m: 20, rep: 2 });
    G.quests.ACH.push({ id: 'corp3', ico: '🌐', name: 'Tập đoàn', desc: 'Nâng cấp lên Tập đoàn', cur: function () { return G.state.corp.tier; }, goal: 3, m: 60, rep: 3 });
    G.quests.ACH.push({ id: 'val10b', ico: '💹', name: 'Định giá 10 tỷ', desc: 'Doanh nghiệp được định giá 10 tỷ', cur: function () { return G.state.corp.tier ? Co.valuation() : 0; }, goal: 10e9, m: 25, rep: 1, fmt: G.fmt.short });
  }
})();
