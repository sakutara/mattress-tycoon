/* Vua Chăn Ga - tiện ích lõi: namespace G, event bus, format, lịch */
(function () {
  'use strict';
  var G = window.G = window.G || {};
  G.data = G.data || {};
  G.hooks = G.hooks || {};
  G.trafficMods = G.trafficMods || [];      // fn() -> hệ số nhân lượng khách (pass 2/3 cắm vào)
  G.conversionMods = G.conversionMods || []; // fn(cust, sellerEff, ctx) -> hệ số nhân tỉ lệ chốt
  G.acceptMods = G.acceptMods || [];         // fn(cust, sku) -> hệ số nhân giá chấp nhận

  var handlers = {};
  G.on = function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); };
  G.off = function (ev, fn) { var h = handlers[ev]; if (!h) return; var i = h.indexOf(fn); if (i >= 0) h.splice(i, 1); };
  G.emit = function (ev, data) {
    var hs = handlers[ev]; if (!hs) return 0;
    hs.slice().forEach(function (fn) { try { fn(data); } catch (e) { console.error('[G.emit ' + ev + ']', e); } });
    return hs.length;
  };

  G.rand = function (a, b) { return a + Math.random() * (b - a); };
  G.randInt = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
  G.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  G.chance = function (p) { return Math.random() < p; };
  G.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  G.gauss = function () { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  G.weighted = function (items, wfn) {
    var tot = 0, i, w = [];
    for (i = 0; i < items.length; i++) { w[i] = Math.max(0, wfn(items[i])); tot += w[i]; }
    if (tot <= 0) return null;
    var r = Math.random() * tot;
    for (i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  };
  G.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  G.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  G.isObj = function (o) { return o && typeof o === 'object' && !Array.isArray(o); };
  G.deepMerge = function (t, s) {
    Object.keys(s || {}).forEach(function (k) {
      if (G.isObj(s[k]) && G.isObj(t[k])) G.deepMerge(t[k], s[k]); else t[k] = s[k];
    });
    return t;
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  G.fmt = {
    vnd: function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'; },
    short: function (n) {
      var s = n < 0 ? '-' : '', a = Math.abs(n);
      if (a >= 1e15) return s + (a / 1e12).toFixed(1).replace('.', ',') + ' nghìn tỷ';
      if (a >= 1e12) return s + Math.round(a / 1e9).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' tỷ';
      if (a >= 1e9) return s + (a / 1e9).toFixed(2).replace('.', ',') + ' tỷ';
      if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace('.', ',') + 'tr';
      if (a >= 1e3) return s + Math.round(a / 1e3) + 'k';
      return s + Math.round(a) + 'đ';
    },
    pct: function (x) { return Math.round(x * 100) + '%'; },
    num: function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  };

  // Lịch game: ngày 1 = Thứ Hai, tháng game = 30 ngày, năm = 12 tháng, ngày 1 rơi vào tháng 9
  G.cal = {
    WD: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    WDFULL: ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'],
    weekday: function (d) { return (d - 1) % 7; },
    dom: function (d) { return (d - 1) % 30 + 1; },
    monthNo: function (d) { return Math.floor((d - 1) / 30) + 1; },
    moy: function (d) { return (Math.floor((d - 1) / 30) + 8) % 12 + 1; },
    hm: function (m) { return pad(Math.floor(m / 60)) + ':' + pad(Math.floor(m % 60)); }
  };
})();
