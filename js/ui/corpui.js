/* Tab "Doanh nghiệp" (nhóm Thêm) */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, res = UI.res, Co = G.corp;
  function I() { return G.icon.apply(null, arguments); }
  function ok(b) { return b ? '<span class="pos">✔</span> ' : '<span class="neg">✘</span> '; }
  function upgradeCard() {
    var s = G.state, n = Co.next(), k = s.corp; if (!n) return '<div class="card"><b>Đã đạt cấp cao nhất: Tập đoàn</b></div>';
    var c = Co.canUpgrade();
    return '<div class="card"><b>' + I('trophy', 16) + ' ' + (k.tier ? 'Nâng cấp lên ' : 'Thành lập ') + E(n.name) + '</b><ul class="small" style="margin:4px 0 6px 16px;padding:0"><li>' + ok(s.level >= 5) + 'Cấp Chuỗi cửa hàng</li><li>' + ok(s.totalRevenue >= n.rev) + 'Doanh thu tích lũy ' + F.short(n.rev) + ' (hiện ' + F.short(s.totalRevenue) + ')</li>' + (n.dept ? '<li>' + ok(Co.deptCount() >= n.dept) + 'Ít nhất ' + n.dept + ' phòng ban</li>' : '') + '<li>' + ok(s.money >= n.fee) + 'Phí ' + F.vnd(n.fee) + '</li></ul>' +
      '<div class="small muted">Mở: tối đa ' + n.branches + ' chi nhánh, ' + n.maxDept + ' phòng ban' + (n.fr ? ', ' + n.fr + ' đại lý nhượng quyền' : '') + (k.tier ? '' : ', vay doanh nghiệp, gọi vốn') + '.</div><button class="btn primary" data-act="coUp"' + (c.ok ? '' : ' disabled') + '>' + (k.tier ? 'Nâng cấp' : 'Thành lập') + ' · ' + F.short(n.fee) + '</button></div>';
  }
  P.register({
    id: 'corp', label: 'Doanh nghiệp', after: 'online',
    badge: function () { return 0; },
    render: function () {
      var s = G.state, k = s.corp, h = '';
      if (!k.tier) return '<div class="card empty">' + I('briefcase', 40) + '<p><b>Phát triển thành doanh nghiệp</b></p><p class="muted small">Khi đã là Chuỗi cửa hàng và đủ doanh thu, bạn có thể lập công ty: phòng ban chuyên trách, mở rộng thêm chi nhánh, vay ngân hàng, gọi vốn nhà đầu tư và nhượng quyền thương hiệu.</p></div>' + upgradeCard();
      var r = Co.revenue12(), val = Co.valuation(), tr = Co.cur();
      h += '<div class="card"><b>' + I('briefcase', 16) + ' ' + E(k.name) + '</b> <span class="muted small">· ' + E(tr.name) + ' · thành lập ngày ' + k.founded + '</span><div class="kpis"><div><b>' + F.short(val) + '</b><small>định giá</small></div><div><b>' + F.short(r.rev) + '</b><small>doanh thu 12 tháng</small></div><div><b class="' + (r.profit >= 0 ? 'pos' : 'neg') + '">' + F.short(r.profit) + '</b><small>lãi 12 tháng</small></div><div><b>' + (100 - k.stake) + '%</b><small>bạn sở hữu</small></div></div></div>';
      h += upgradeCard();
      // phòng ban
      h += '<div class="card"><b>Phòng ban (' + Co.deptCount() + '/' + tr.maxDept + ')</b> <span class="muted small">· chi phí vận hành ' + F.short(Co.deptMonthly()) + '/tháng</span>' + Co.DEPT.map(function (d) {
        var on = Co.has(d.id);
        return '<div class="card small" style="margin:6px 0"><div style="display:flex;gap:8px;justify-content:space-between;align-items:center"><div><b>' + E(d.name) + '</b><div class="muted">' + E(d.note) + ' · ' + F.short(d.month) + '/tháng</div></div>' + (on ? '<button class="mini" style="white-space:nowrap" data-act="coDept" data-id="' + d.id + '" data-on="0">Giải thể</button>' : '<button class="mini primary" style="white-space:nowrap;flex-shrink:0" data-act="coDept" data-id="' + d.id + '" data-on="1"' + (s.money < d.setup ? ' disabled' : '') + '>Lập · ' + F.short(d.setup) + '</button>') + '</div></div>';
      }).join('') + '</div>';
      // chi nhánh
      var mx = G.progress.maxBranches();
      h += '<div class="card"><b>Chi nhánh (' + s.branches + '/' + mx + ')</b> <button class="mini" data-act="openChainMap">🗺 Xem bản đồ chuỗi</button><p class="small muted">Mỗi chi nhánh cần 1 Quản lý; thu nhập thụ động ×' + Co.branchMult().toFixed(1).replace('.', ',') + ' nhờ công ty. Quản lý hiện có: ' + G.staff.count('manager') + '.</p><button class="btn" data-act="coBranch"' + (s.branches >= mx ? ' disabled' : '') + '>Mở chi nhánh · ' + F.short(G.progress.branchCost()) + '</button></div>';
      // vay
      h += '<div class="card"><b>Vay doanh nghiệp</b><p class="small muted">Hạn mức ' + F.short(Co.limit()) + ' (40% định giá) · dư nợ ' + F.short(Co.owed()) + ' · lãi ' + (Co.rate() * 100).toFixed(1).replace('.', ',') + '%/tháng trên dư nợ, trả gốc đều 12 tháng, phí 1%. Không đủ tiền trả thì bị phạt và mất danh tiếng.</p>' +
        k.loans.map(function (l) { return '<div class="small" style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin:4px 0"><span>Vay ' + F.short(l.principal) + ' (ngày ' + l.day + ') · còn ' + F.short(l.remaining) + ' · ' + l.monthsLeft + ' tháng</span><button class="mini" style="white-space:nowrap" data-act="coRepay" data-id="' + l.id + '"' + (s.money < l.remaining ? ' disabled' : '') + '>Tất toán</button></div>'; }).join('') +
        '<div class="chips">' + Co.LOAN_STEPS.map(function (a) { return '<button class="chip" data-act="coBorrow" data-n="' + a + '"' + (Co.owed() + a > Co.limit() ? ' disabled' : '') + '>Vay ' + F.short(a) + '</button>'; }).join('') + '</div></div>';
      // gọi vốn
      h += '<div class="card"><b>Gọi vốn nhà đầu tư</b><p class="small muted">Bán cổ phần theo ' + F.short(val) + ' × 0,9 (mua lại ×1,15). Nhà đầu tư nhận 50% lợi nhuận tháng theo tỉ lệ cổ phần (cổ tức). Đã bán <b>' + k.stake + '%</b> (tối đa ' + Co.STAKE_MAX + '%), đã chi cổ tức ' + F.short(k.divPaid) + '.</p><div class="chips">' +
        [5, 10, 15].map(function (p) { return '<button class="chip" data-act="coSell" data-n="' + p + '"' + (k.stake + p > Co.STAKE_MAX ? ' disabled' : '') + '>Bán ' + p + '% · +' + F.short(Co.sellPrice(p)) + '</button>'; }).join('') +
        '<button class="chip" data-act="coBuy" data-n="5"' + (k.stake < 5 ? ' disabled' : '') + '>Mua lại 5% · ' + F.short(Co.buyPrice(5)) + '</button></div></div>';
      // nhượng quyền
      if (Co.frMax()) h += '<div class="card"><b>Nhượng quyền (' + k.franchises + '/' + Co.frMax() + ')</b><p class="small muted">Mỗi đại lý: phí ký ' + F.short(Co.frFee()) + ', bản quyền ' + F.short(Co.frRoyalty()) + '/tháng (theo danh tiếng), +1% lượng khách. Cần Phòng Kinh doanh. Danh tiếng dưới 50 thì đại lý có thể làm ăn ẩu.</p><button class="btn" data-act="coRecruit"' + (k.franchises >= Co.frMax() ? ' disabled' : '') + '>Ký đại lý mới</button></div>';
      if (k.log.length) h += '<div class="card small"><b>Nhật ký</b>' + k.log.slice(0, 6).map(function (l) { return '<div>Ngày ' + l.day + ': ' + E(l.text) + '</div>'; }).join('') + '</div>';
      return h;
    }
  });
  P.act.coUp = function () { res(Co.upgrade()); };
  P.act.coDept = function (el) { res(Co.setDept(el.dataset.id, el.dataset.on === '1')); };
  P.act.coBranch = function () { res(G.progress.buyBranch()); };
  P.act.coBorrow = function (el) { res(Co.borrow(+el.dataset.n)); };
  P.act.coRepay = function (el) { res(Co.repay(+el.dataset.id)); };
  P.act.coSell = function (el) { res(Co.sell(+el.dataset.n)); };
  P.act.coBuy = function (el) { res(Co.buyback(+el.dataset.n)); };
  P.act.coRecruit = function () { res(Co.recruit()); };
})();
