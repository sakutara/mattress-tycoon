/* Mốc phát triển cửa hàng: điều kiện, nâng cấp, mở khóa; chi nhánh (thu nhập thụ động); xe tải riêng */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ branches: 0, reqNotified: -1 });
  var P = G.progress = {
    next: function () { return G.data.levels[G.state.level + 1] || null; },
    // Vốn tối thiểu: phải đủ phí nâng cấp + dự trữ vận hành 3 tháng (tiền thuê mặt bằng mới + quỹ lương), và không thấp hơn mức sàn của cấp đó
    capital: function () {
      var n = P.next(); if (!n) return null;
      var reserve = Math.round(3 * (n.rent + G.staff.payroll()) / 1e6) * 1e6;
      var need = Math.max(n.minCapital || 0, n.fee + reserve);
      return { need: need, reserve: need - n.fee, fee: n.fee, rentReserve: 3 * n.rent, payReserve: 3 * G.staff.payroll() };
    },
    status: function () {
      var n = P.next(), s = G.state; if (!n) return null;
      var cap = P.capital();
      return { revenueOk: s.totalRevenue >= n.req.revenue, repOk: s.rep >= n.req.rep, moneyOk: s.money >= n.fee, capitalOk: s.money >= cap.need, capital: cap, ok: s.totalRevenue >= n.req.revenue && s.rep >= n.req.rep };
    },
    upgrade: function () {
      var n = P.next(), st = P.status(), s = G.state;
      if (!n) return { ok: false, msg: 'Đã ở cấp cao nhất' };
      if (!st.ok) return { ok: false, msg: 'Chưa đủ điều kiện (doanh thu tích lũy / danh tiếng)' };
      if (!st.moneyOk) return { ok: false, msg: 'Không đủ tiền nâng cấp (' + G.fmt.vnd(n.fee) + ')' };
      if (!st.capitalOk) return { ok: false, msg: 'Chưa đủ vốn tối thiểu: cần có ' + G.fmt.vnd(st.capital.need) + ' tiền mặt (phí nâng cấp + dự trữ vận hành 3 tháng), hiện có ' + G.fmt.vnd(s.money) };
      G.econ.cash(-n.fee);
      s.level++;
      G.emit('levelUp', { level: s.level });
      G.notify.modal({
        title: 'Chúc mừng! ' + n.name, sound: 'good', def: 0,
        html: '<p>' + G.esc(n.desc) + '</p><p><b>Mở khóa:</b></p><ul>' + n.unlocks.map(function (u) { return '<li>' + G.esc(u) + '</li>'; }).join('') + '</ul><p class="muted">Cửa hàng đã được mở rộng - bản đồ lớn hơn, nhiều khách hơn, tiền thuê cao hơn.</p>',
        choices: [{ label: 'Tuyệt vời!', cls: 'primary' }]
      });
      return { ok: true };
    },
    maxBranches: function () { return 2; },   // doanh nghiệp (corp.js) nâng lên theo cấp công ty
    branchCost: function () { return [1.5e9, 3e9, 5e9, 7.5e9, 10e9, 14e9, 18e9, 24e9][G.state.branches] || 0; },
    buyBranch: function () {
      var s = G.state;
      if (!G.lvl().branches) return { ok: false, msg: 'Cần cấp Chuỗi cửa hàng' };
      if (s.branches >= P.maxBranches()) return { ok: false, msg: 'Đã mở tối đa ' + P.maxBranches() + ' chi nhánh' + (P.maxBranches() < 8 ? ' (nâng cấp công ty để mở thêm)' : '') };
      if (G.staff.count('manager') < s.branches + 1) return { ok: false, msg: 'Mỗi chi nhánh cần 1 Quản lý cửa hàng (hiện có ' + G.staff.count('manager') + ')' };
      var c = P.branchCost(); if (s.money < c) return { ok: false, msg: 'Không đủ tiền' };
      G.econ.cash(-c); s.branches++;
      return { ok: true, msg: 'Đã mở chi nhánh ' + (s.branches + 1) };
    },
    buyTruck: function () {
      var s = G.state, c = 150e6;
      if (s.ownTruck) return { ok: false, msg: 'Đã có xe tải' };
      if (s.money < c) return { ok: false, msg: 'Không đủ tiền' };
      G.econ.cash(-c); s.ownTruck = true; return { ok: true, msg: 'Đã mua xe tải riêng: giảm 30% phí vận chuyển nội bộ' };
    }
  };
  G.on('dayEnd', function () {
    var s = G.state;
    if (s.branches > 0 && G.staff.count('manager') >= s.branches) {
      var inc = s.branches * 15e6 * (G.reviews.avg() / 3) * (G.corp ? G.corp.branchMult() : 1);
      G.econ.income(Math.round(inc), 'branch');
    }
  });
  G.on('dayStart', function () {
    var s = G.state, n = P.next(), st = P.status();
    if (n && st && st.ok && s.reqNotified !== s.level) {
      s.reqNotified = s.level;
      G.notify.push({ title: 'Đủ điều kiện lên "' + n.name + '"', text: 'Vào tab Nâng cấp để mở rộng (phí ' + G.fmt.short(n.fee) + '). Cần có sẵn vốn tối thiểu ' + G.fmt.short(st.capital.need) + (st.capitalOk ? '.' : ' - bạn còn thiếu ' + G.fmt.short(st.capital.need - s.money) + '.'), type: 'good', sound: 'good' });
    }
  });
})();
