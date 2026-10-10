/* Mùa vụ & dịp lễ: lạnh (chăn), hè (ga mát), cưới, Tết, 20/10, 8/3, Black Friday */
(function () {
  'use strict';
  var G = window.G;
  var HOL = [
    { id: 'tet', name: 'Tết Nguyên Đán', traffic: 1.7, demand: { ga: 1.4, chan: 1.2, goi: 1.3 }, test: function (m, d) { return (m === 1 && d >= 18) || (m === 2 && d <= 7); } },
    { id: 'posttet', name: 'Sau Tết (vắng khách)', traffic: 0.65, demand: {}, test: function (m, d) { return m === 2 && d >= 8 && d <= 18; } },
    { id: '83', name: '8/3', traffic: 1.25, demand: { goi: 1.3, ga: 1.2 }, test: function (m, d) { return m === 3 && d >= 1 && d <= 8; } },
    { id: '2010', name: '20/10', traffic: 1.3, demand: { goi: 1.2, ga: 1.2 }, test: function (m, d) { return m === 10 && d >= 14 && d <= 20; } },
    { id: 'bf', name: 'Black Friday', traffic: 1.9, demand: {}, test: function (m, d) { return m === 11 && d >= 24 && d <= 27; } },
    { id: 'cuoi', name: 'Mùa cưới', traffic: 1.1, demand: { ga: 1.25, dem: 1.2, chan: 1.1 }, test: function (m, d) { return m >= 10 || (m === 1 && d < 18); } }
  ];
  function dayInfo(day) { return { m: G.cal.moy(day), d: G.cal.dom(day) }; }
  var S = G.season = {
    HOL: HOL,
    active: function (day) { var x = dayInfo(day); return HOL.filter(function (h) { return h.test(x.m, x.d); }); },
    isActive: function (id, day) { return S.active(day).some(function (h) { return h.id === id; }); },
    base: function (day) { var m = G.cal.moy(day); return [11, 12, 1, 2].indexOf(m) >= 0 ? 'cold' : (m >= 5 && m <= 8 ? 'hot' : 'mild'); },
    name: function (day) {
      var b = S.base(day), n = b === 'cold' ? 'Mùa lạnh' : b === 'hot' ? 'Mùa hè' : 'Mùa mát';
      var a = S.active(day).filter(function (h) { return h.id !== 'posttet'; }).map(function (h) { return h.name; });
      return n + (a.length ? ' · ' + a.join(', ') : '');
    },
    demand: function (type, day) {
      var b = S.base(day), m = 1;
      if (b === 'cold') m *= { chan: 1.8, ga: 1.1, topper: 1.2 }[type] || 1;
      else if (b === 'hot') m *= { chan: 0.5, ga: 1.3, topper: 0.8 }[type] || 1;
      S.active(day).forEach(function (h) { m *= h.demand[type] || 1; });
      return m;
    },
    traffic: function (day) { var t = 1; S.active(day).forEach(function (h) { t *= h.traffic; }); return t; },
    // các dịp sắp tới trong `within` ngày: [{id,name,start,end}]
    upcoming: function (day, within) {
      var out = [], seen = {};
      for (var d = day; d <= day + within; d++) {
        S.active(d).forEach(function (h) {
          if (h.id === 'cuoi' || h.id === 'posttet') return;
          if (!seen[h.id]) { seen[h.id] = { id: h.id, name: h.name, start: d, end: d }; out.push(seen[h.id]); } else seen[h.id].end = d;
        });
      }
      return out;
    }
  };
  G.on('dayStart', function () {
    var s = G.state, y = S.active(s.day).map(function (h) { return h.id; }), prev = S.active(s.day - 1).map(function (h) { return h.id; });
    S.active(s.day).forEach(function (h) {
      if (prev.indexOf(h.id) < 0 && h.id !== 'cuoi') G.notify.push({ title: 'Bắt đầu: ' + h.name, text: h.traffic >= 1 ? 'Lượng khách dự kiến tăng ×' + h.traffic + '. Hãy chuẩn bị hàng và chương trình ưu đãi!' : 'Khách vắng hơn bình thường.', type: h.traffic >= 1 ? 'good' : 'info', sound: false });
    });
  });
})();
