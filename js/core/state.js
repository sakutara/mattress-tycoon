/* State gốc. Mỗi module gọi G.addDefaults({...}) khi load; state được dựng từ defaults + save. */
(function () {
  'use strict';
  var G = window.G;
  G.defaults = {
    v: 1,
    shopName: 'Vua Chăn Ga',
    day: 1, minute: 480, speed: 1, prep: true,
    money: 30000000,
    totalRevenue: 0, totalProfit: 0,
    rep: 5,            // danh tiếng 0-100
    level: 0,
    avgRating: 3.5,    // sao trung bình (stub; pass 3 thay bằng reviews.js)
    ratingN: 0,
    started: 0
  };
  G.addDefaults = function (obj) { Object.keys(obj).forEach(function (k) { G.defaults[k] = G.clone(obj[k]); }); };
  G.state = null;
  G.buildState = function (saved) {
    var s = G.clone(G.defaults);
    if (saved) G.deepMerge(s, saved);
    G.state = s;
    return s;
  };
  G.lvl = function () { return G.data.levels[G.state.level]; };
})();
