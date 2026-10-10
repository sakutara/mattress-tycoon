/* Trang trí cửa hàng: mua đồ trang trí, đặt lên lưới sàn/tường, hiệu ứng khách/chốt/kiên nhẫn/đánh giá/mùa vụ, phí duy trì */
(function () {
  'use strict';
  var G = window.G;
  // layer: floor (chắn lối), flat (thảm, đi lên được), ceil (trần), wall (treo tường hàng 0). tr/cv/pa là tỉ lệ (0.03 = +3%), rt = cộng sao mỗi đơn
  G.data.decor = [
    { id: 'plant', name: 'Cây cảnh', icon: '🪴', price: 1.5e6, w: 1, h: 1, slots: 1, level: 0, layer: 'floor', upkeep: 0, tr: 0.02, rt: 0.02, desc: 'Xanh mát, cửa hàng dễ thương hơn.' },
    { id: 'quat', name: 'Cây quất Tết', icon: '🍊', price: 3e6, w: 1, h: 1, slots: 1, level: 0, layer: 'floor', upkeep: 20000, tr: 0.01, season: { tet: { tr: 0.1 } }, desc: 'Cực hút khách dịp Tết.' },
    { id: 'rug', name: 'Thảm trải sàn', icon: '🟧', price: 2.5e6, w: 2, h: 1, slots: 1, level: 0, layer: 'flat', upkeep: 0, cv: 0.015, rt: 0.05, desc: 'Đi lên được, khách thấy ấm cúng.' },
    { id: 'painting', name: 'Tranh treo tường', icon: '🖼', price: 1.2e6, w: 1, h: 1, slots: 1, level: 0, layer: 'wall', upkeep: 0, tr: 0.015, rt: 0.03, desc: 'Treo ở tường phía trên.' },
    { id: 'lamp', name: 'Đèn chùm', icon: '💡', price: 8e6, w: 1, h: 1, slots: 1, level: 1, layer: 'ceil', upkeep: 40000, tr: 0.03, cv: 0.015, desc: 'Ánh sáng sang trọng, treo trần.' },
    { id: 'tank', name: 'Bể cá', icon: '🐠', price: 12e6, w: 2, h: 1, slots: 2, level: 1, layer: 'floor', upkeep: 60000, tr: 0.04, pa: 0.15, desc: 'Khách đứng ngắm, kiên nhẫn hơn khi chờ.' },
    { id: 'tea', name: 'Quầy nước / trà miễn phí', icon: '🍵', price: 6e6, w: 1, h: 1, slots: 1, level: 1, layer: 'floor', upkeep: 120000, tr: 0.02, pa: 0.25, rt: 0.08, season: { cold: { tr: 0.03 } }, desc: 'Khách chờ lâu cũng vui, mùa lạnh đông hơn.' },
    { id: 'led', name: 'Biển LED', icon: '🔆', price: 9e6, w: 2, h: 1, slots: 1, level: 1, layer: 'wall', upkeep: 100000, tr: 0.04, desc: 'Biển quảng cáo chạy chữ trên tường.' },
    { id: 'ac', name: 'Máy lạnh', icon: '❄', price: 16e6, w: 1, h: 1, slots: 1, level: 1, layer: 'wall', upkeep: 150000, tr: 0.01, cv: 0.01, season: { hot: { tr: 0.06, cv: 0.02 } }, desc: 'Mùa hè khách đổ vào hóng mát.' },
    { id: 'showbed', name: 'Giường mẫu showroom', icon: '🛏', price: 20e6, w: 2, h: 2, slots: 3, level: 2, layer: 'floor', upkeep: 0, tr: 0.02, cv: 0.04, desc: 'Khách nằm thử, dễ chốt đơn.' },
    { id: 'projector', name: 'Máy chiếu quảng cáo', icon: '📽', price: 15e6, w: 1, h: 1, slots: 1, level: 2, layer: 'ceil', upkeep: 80000, tr: 0.05, desc: 'Chiếu video quảng cáo xuống sàn.' },
    { id: 'chair', name: 'Ghế massage thử', icon: '💺', price: 18e6, w: 1, h: 1, slots: 1, level: 2, layer: 'floor', upkeep: 50000, cv: 0.05, rt: 0.1, desc: 'Khách ngồi thử rất thích.' },
    { id: 'special', name: 'Kệ trưng bày đặc biệt', icon: '🗄', price: 14e6, w: 2, h: 1, slots: 2, level: 2, layer: 'floor', upkeep: 0, tr: 0.02, cv: 0.03, desc: 'Kệ kính nổi bật cho hàng mới.' },
    { id: 'trophy', name: 'Bảng xếp hạng / cúp', icon: '🏆', price: 25e6, w: 1, h: 1, slots: 1, level: 3, layer: 'floor', upkeep: 0, tr: 0.02, rt: 0.15, desc: 'Khẳng định uy tín, khách tin tưởng.' }
  ];
  G.decorById = {}; G.data.decor.forEach(function (d) { G.decorById[d.id] = d; });
  var SLOTS = [4, 6, 9, 12, 16, 20];
  G.addDefaults({ decor: { items: [], nextUid: 1 } });
  var D = G.decor = {
    placing: null, selected: null, SELL_RATE: 0.6,
    slotsMax: function () { return SLOTS[G.state.level]; },
    item: function (uid) { return G.state.decor.items.filter(function (x) { return x.uid === uid; })[0]; },
    placed: function () { return G.state.decor.items.filter(function (x) { return x.placed; }); },
    slotsUsed: function (skip) { var t = 0; D.placed().forEach(function (x) { if (x.uid !== skip) t += G.decorById[x.id].slots; }); return t; },
    cells: function (def, x, y) { var o = []; for (var j = 0; j < def.h; j++) for (var i = 0; i < def.w; i++) o.push([x + i, y + j]); return o; },
    reserved: function (L) {
      var r = {}, C = L.cols;
      function add(x, y) { r[y * C + x] = 1; }
      L.shelfUnits.concat(L.beds).forEach(function (u) { (u.appr || [[u.ax, u.ay]]).forEach(function (a) { add(a[0], a[1]); }); });
      (L.rugs || []).length; // thảm chỉ trang trí
      add(L.pay.x, L.pay.y); add(L.cashier.x, L.cashier.y); add(L.door.x, L.door.y - 1); add(L.door.x, L.door.y - 2);
      L.spots.counter.forEach(function (p) { add(p.x, p.y); });
      for (var yy = 1; yy < L.rows - 1; yy++) add(0, yy); // cột sát tường trái = lối sang phòng nhân viên
      (L.plants || [{ x: C - 1, y: 1 }, { x: 0, y: L.rows - 3 }]).forEach(function (p) { add(p.x, p.y); }); // chậu cây cố định ở góc
      return r;
    },
    refreshMask: function () {
      var L = G.layout.get(), i;
      for (i = 0; i < L.blocked.length; i++) if (L.blocked[i] === 2) L.blocked[i] = 0;
      D.placed().forEach(function (it) { var d = G.decorById[it.id]; if (d.layer !== 'floor') return; D.cells(d, it.x, it.y).forEach(function (c) { if (c[0] >= 0 && c[1] >= 0 && c[0] < L.cols && c[1] < L.rows && !L.blocked[c[1] * L.cols + c[0]]) L.blocked[c[1] * L.cols + c[0]] = 2; }); });
    },
    // mọi ô tiếp cận + quầy vẫn đi tới được từ cửa?
    reachable: function (extra) {
      var L = G.layout.get(), C = L.cols, R = L.rows, ex = {}; extra.forEach(function (c) { ex[c[1] * C + c[0]] = 1; });
      var seen = new Uint8Array(C * R), q = [(L.door.y - 1) * C + L.door.x], qi = 0; seen[q[0]] = 1;
      while (qi < q.length) {
        var cur = q[qi++], cx = cur % C, cy = (cur - cx) / C;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = cx + d[0], ny = cy + d[1]; if (nx < 0 || ny < 1 || nx >= C || ny >= R - 1) return; var ni = ny * C + nx; if (seen[ni] || L.blocked[ni] === 1 || ex[ni]) return; if (L.blocked[ni] === 2 && !D._ignoreMask) return; seen[ni] = 1; q.push(ni); });
      }
      var ok = true; L.shelfUnits.concat(L.beds).forEach(function (u) { if (!seen[u.ay * C + u.ax]) ok = false; });
      if (!seen[L.pay.y * C + L.pay.x]) ok = false;
      return ok;
    },
    canPlace: function (it, x, y) {
      var d = G.decorById[it.id], L = G.layout.get(), C = L.cols, R = L.rows;
      if (G.state.level < d.level) return { ok: false, msg: 'Chưa mở khóa' };
      if (d.layer === 'wall') { if (y !== 0 || x < 0 || x + d.w > C) return { ok: false, msg: 'Tranh/biển phải treo ở tường phía trên' }; }
      else if (x < 0 || y < 1 || x + d.w > C || y + d.h > R - 1) return { ok: false, msg: 'Ngoài khu vực cửa hàng' };
      if (D.slotsUsed(it.uid) + d.slots > D.slotsMax()) return { ok: false, msg: 'Hết chỗ trang trí của cấp này (' + D.slotsMax() + ' ô)' };
      var cells = D.cells(d, x, y), res = D.reserved(L), bad = null;
      cells.forEach(function (c) {
        var i = c[1] * C + c[0];
        if (d.layer === 'floor' || d.layer === 'flat') { if (L.blocked[i] === 1) bad = 'Có đồ nội thất chắn'; else if (d.layer === 'floor' && res[i]) bad = 'Đây là lối đi / chỗ khách đứng xem hàng'; }
      });
      if (bad) return { ok: false, msg: bad };
      var overlap = false;
      D.placed().forEach(function (o) {
        if (o.uid === it.uid) return; var od = G.decorById[o.id]; if (od.layer !== d.layer) return;
        D.cells(od, o.x, o.y).forEach(function (oc) { cells.forEach(function (c) { if (c[0] === oc[0] && c[1] === oc[1]) overlap = true; }); });
      });
      if (overlap) return { ok: false, msg: 'Đã có đồ khác ở đó' };
      if (d.layer === 'floor') {
        // tạm bỏ mặc của chính nó rồi kiểm tra đường đi
        var saved = it.placed; it.placed = false; D.refreshMask(); var ok = D.reachable(cells); it.placed = saved; D.refreshMask();
        if (!ok) return { ok: false, msg: 'Đặt ở đây sẽ chắn lối đi của khách' };
      }
      return { ok: true };
    },
    buy: function (id) {
      var s = G.state, d = G.decorById[id]; if (!d) return { ok: false, msg: 'Không có' };
      if (s.level < d.level) return { ok: false, msg: 'Mở ở cấp ' + G.data.levels[d.level].name };
      if (s.money < d.price) return { ok: false, msg: 'Không đủ tiền' };
      G.econ.cash(-d.price);
      var it = { uid: s.decor.nextUid++, id: id, x: 0, y: 0, placed: false }; s.decor.items.push(it);
      D.placing = it.uid;
      return { ok: true, msg: 'Đã mua ' + d.name + '. Bấm lên sơ đồ cửa hàng để đặt (Esc để để vào kho).', uid: it.uid };
    },
    give: function (id, n, auto) { var s = G.state; for (var k = 0; k < (n || 1); k++) { var it = { uid: s.decor.nextUid++, id: id, x: 0, y: 0, placed: false }; s.decor.items.push(it); if (auto) D.autoPlace(it); } },
    autoPlace: function (it) {
      var L = G.layout.get(), d = G.decorById[it.id], y0 = d.layer === 'wall' ? 0 : 1, y1 = d.layer === 'wall' ? 0 : L.rows - 2;
      for (var y = y0; y <= y1; y++) for (var x = 0; x < L.cols; x++) { if (D.canPlace(it, x, y).ok) { it.x = x; it.y = y; it.placed = true; D.refreshMask(); return true; } }
      return false;
    },
    tryPlace: function (uid, x, y) {
      var it = D.item(uid); if (!it) return { ok: false, msg: 'Không còn món này' };
      var r = D.canPlace(it, x, y); if (!r.ok) return r;
      it.x = x; it.y = y; it.placed = true; D.placing = null; D.refreshMask(); G.emit('decorChanged');
      return { ok: true, msg: 'Đã đặt ' + G.decorById[it.id].name };
    },
    pickUp: function (uid) { var it = D.item(uid); if (!it) return; it.placed = false; D.refreshMask(); G.emit('decorChanged'); },
    sell: function (uid) {
      var s = G.state, it = D.item(uid); if (!it) return { ok: false };
      var d = G.decorById[it.id], back = Math.round(d.price * D.SELL_RATE);
      s.decor.items = s.decor.items.filter(function (x) { return x.uid !== uid; }); if (D.placing === uid) D.placing = null;
      G.econ.cash(back); D.refreshMask(); G.emit('decorChanged');
      return { ok: true, msg: 'Đã bán lại ' + d.name + ' thu ' + G.fmt.vnd(back) + ' (lỗ ' + G.fmt.vnd(d.price - back) + ')' };
    },
    revalidate: function () { // sau khi lên cấp, bản đồ đổi
      D.refreshMask();
      D.placed().slice().forEach(function (it) { it.placed = false; D.refreshMask(); if (!D.autoPlace(it)) { it.placed = false; } });
      D.refreshMask();
    },
    // ---- hiệu ứng ----
    combine: function (list) { var p = 1; list.sort(function (a, b) { return b - a; }); var seen = 0; list.forEach(function (v, k) { p *= 1 - v; }); return 1 - p; },
    agg: function () {
      var s = G.state, tr = [], cv = [], pa = [], rt = 0, up = 0, cnt = {};
      D.placed().forEach(function (it) {
        var d = G.decorById[it.id], k = cnt[it.id] = (cnt[it.id] || 0) + 1, f = Math.pow(0.6, k - 1); // bản thứ 2, 3 cùng loại giảm hiệu quả
        var t = d.tr || 0, c = d.cv || 0, p = d.pa || 0, r = d.rt || 0;
        if (d.season) Object.keys(d.season).forEach(function (key) {
          var on = (key === 'cold' || key === 'hot') ? G.season.base(s.day) === key : G.season.isActive(key, s.day);
          if (on) { t += d.season[key].tr || 0; c += d.season[key].cv || 0; }
        });
        if (t) tr.push(t * f); if (c) cv.push(c * f); if (p) pa.push(p * f); rt += r * f; up += d.upkeep || 0;
      });
      return { tr: D.combine(tr), cv: D.combine(cv), pa: Math.min(0.6, D.combine(pa)), rt: Math.min(0.6, rt), upkeep: up };
    },
    trafficMult: function () { return 1 + D.agg().tr; },
    convMult: function () { return 1 + D.agg().cv; },
    patienceMult: function () { return 1 + D.agg().pa; },
    ratingBonus: function () { return D.agg().rt; },
    summary: function () { var a = D.agg(); return 'Trang trí: khách +' + (a.tr * 100).toFixed(1) + '%, chốt đơn +' + (a.cv * 100).toFixed(1) + '%, kiên nhẫn +' + Math.round(a.pa * 100) + '%, đánh giá +' + a.rt.toFixed(2) + '★' + (a.upkeep ? ', duy trì ' + G.fmt.short(a.upkeep) + '/ngày' : ''); }
  };
  var tm = function () { return D.trafficMult(); }; tm.label = 'Trang trí'; G.trafficMods.push(tm);
  G.conversionMods.push(function () { return D.convMult(); });
  // PASS 18: bố cục isometric mới -> đồ trang trí không còn vừa chỗ thì trả về kho
  D.migrateLayout = function () {
    var s = G.state; if (s.layoutVer === 2) return;
    s.layoutVer = 2; D.refreshMask(); var moved = 0;
    D.placed().slice().forEach(function (it) { var ok = D.canPlace(it, it.x, it.y); if (!ok.ok) { it.placed = false; moved++; D.refreshMask(); } });
    D.refreshMask();
    if (moved) setTimeout(function () { G.notify.toast('Bố cục cửa hàng mới: ' + moved + ' món trang trí không còn vừa chỗ, đã trả về kho - hãy đặt lại!', 'warn'); }, 800);
  };
  G.on('init', function () { D.refreshMask(); D.migrateLayout(); });
  G.on('levelUp', D.revalidate);
  G.on('dayStart', function () { var u = D.agg().upkeep; if (u) G.econ.expense(u, 'decor'); });
  G.econ.EXP_NAMES.decor = 'Duy trì trang trí';
})();
