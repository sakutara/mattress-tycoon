/* Ẩn nội dung chưa mở khóa: chỉ hiện cái đang dùng được + 1 dòng gợi ý "mở ở cấp ..." cho mỗi khu vực, có nút "Xem tất cả" */
(function () {
  'use strict';
  var G = window.G, UI = G.ui = G.ui || {};
  UI.st = UI.st || {}; UI.st.showLocked = UI.st.showLocked || {};
  var U = G.unlock = {
    AREAS: ['src', 'brand', 'wh', 'decor', 'room', 'live', 'b2b', 'branch'],
    items: function (area, L) {
      var lv = G.data.levels, prev = lv[L - 1], cur = lv[L], out = [];
      if (area === 'src') G.data.sources.forEach(function (x) { if (x.minLevel === L) out.push(x.name); });
      else if (area === 'brand') { if (prev && cur.maxTier > prev.maxTier) G.data.brands.forEach(function (b) { if (!b.noBrand && b.tier > prev.maxTier && b.tier <= cur.maxTier) out.push(b.short); }); }
      else if (area === 'wh') G.data.warehouses.forEach(function (w) { if (w.minLevel === L) out.push(w.name.replace(/ \(.*\)/, '')); });
      else if (area === 'decor') G.data.decor.forEach(function (d) { if (d.level === L) out.push(d.name); });
      else if (area === 'room') { if (L === 1) out.push('Phòng nhân viên'); }
      else if (area === 'live') { if (L === G.live.MIN_LEVEL) out.push('Phòng livestream'); }
      else if (area === 'b2b') { if (L === 3) out.push('Đơn khách sạn / resort'); }
      else if (area === 'branch') { if (L === 5) out.push('Chi nhánh'); }
      return out;
    },
    next: function (area) { var L, s = G.state; for (L = s.level + 1; L < G.data.levels.length; L++) { var it = U.items(area, L); if (it.length) return { level: L, names: it }; } return null; },
    showAll: function (area) { return !!(G.settings.showLocked || UI.st.showLocked[area]); },
    // html gợi ý + nút xem tất cả. extra: true nếu đang có mục khóa để hiện
    teaser: function (area, hasLocked) {
      var n = U.next(area), all = U.showAll(area); if (!n && !hasLocked) return '';
      return '<div class="teaser">' + (n ? '🔒 Mở ở cấp <b>' + G.esc(G.data.levels[n.level].name) + '</b>: ' + G.esc(n.names.join(', ')) : '🔒 Còn mục chưa mở khóa') + ' <button class="mini" data-act="lockToggle" data-id="' + area + '">' + (all ? 'Ẩn mục khóa' : 'Xem tất cả') + '</button></div>';
    },
    describeLevel: function (L) {
      var out = []; var names = { src: 'nguồn nhập', brand: 'hãng', wh: 'kho ngoài', decor: 'đồ trang trí', room: '', live: '', b2b: '', branch: '' };
      U.AREAS.forEach(function (a) { var it = U.items(a, L); if (it.length) out.push((names[a] ? names[a] + ': ' : '') + it.join(', ')); });
      return out;
    }
  };
  // một dòng gợi ý chung cho các tính năng lớn chưa mở (dùng ở trang Thêm)
  UI.unlockTeasers = function () {
    var s = G.state, areas = ['room', 'live', 'b2b', 'branch'], best = null;
    areas.forEach(function (a) { var n = U.next(a); if (n && (!best || n.level < best.level)) best = { level: n.level, names: [] }; });
    if (!best) return '';
    areas.forEach(function (a) { U.items(a, best.level).forEach(function (x) { best.names.push(x); }); });
    return '<div class="teaser">🔒 Mở ở cấp <b>' + G.esc(G.data.levels[best.level].name) + '</b>: ' + G.esc(best.names.join(', ')) + '</div>';
  };
  G.on('levelUp', function (e) {
    var d = U.describeLevel(e.level);
    if (d.length) G.notify.push({ title: '🔓 Mở khóa tính năng mới', text: d.join(' · '), type: 'good', sound: 'good' });
  });
  UI.panels.act.lockToggle = function (el) { var a = el.dataset.id; UI.st.showLocked[a] = !UI.st.showLocked[a]; };
})();
