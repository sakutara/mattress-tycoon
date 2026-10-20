/* Chuỗi chi nhánh: dữ liệu từng chi nhánh (khu vực, hiệu suất, thu nhập) để hiển thị trên bản đồ. Tổng thu nhập vẫn do progress.js tính; ở đây chỉ chia theo hiệu suất từng chi nhánh. */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ chain: { list: [], nextId: 1 } });
  var DIST = ['Cầu Giấy', 'Tây Hồ', 'Thanh Xuân', 'Long Biên', 'Hà Đông', 'Hai Bà Trưng', 'Hoàng Mai', 'Đống Đa'];
  var Ch = G.chain = {
    DIST: DIST,
    list: function () { Ch.ensure(); return G.state.chain.list; },
    ensure: function () {
      var s = G.state, c = s.chain;
      while (c.list.length < s.branches) { var i = c.list.length; c.list.push({ id: c.nextId++, slot: i, district: DIST[i % DIST.length], f: Math.round(G.rand(0.85, 1.15) * 100) / 100, opened: s.day, total: 0, last: [] }); }
      if (c.list.length > s.branches) c.list.length = s.branches;
    },
    // đủ quản lý cho mọi chi nhánh thì mới có thu nhập
    paying: function () { return G.state.branches > 0 && G.staff.count('manager') >= G.state.branches; },
    avg7: function (b) { return b.last.length ? b.last.reduce(function (a, x) { return a + x; }, 0) / b.last.length : 0; },
    totalPerDay: function () { return Ch.list().reduce(function (a, b) { return a + Ch.avg7(b); }, 0); }
  };
  G.on('init', Ch.ensure);
  G.on('branchIncome', function (d) {
    Ch.ensure(); var l = G.state.chain.list, sum = l.reduce(function (a, b) { return a + b.f; }, 0) || 1;
    l.forEach(function (b) { var v = Math.round(d.total * b.f / sum); b.total += v; b.last.push(v); if (b.last.length > 7) b.last.shift(); });
  });
  G.on('dayEnd', function () { Ch.ensure(); });
})();
