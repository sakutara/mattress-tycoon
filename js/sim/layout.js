/* Bản đồ cửa hàng theo cấp + tìm đường BFS trên lưới ô (tile). Tọa độ thực thể = ô (số thực). */
(function () {
  'use strict';
  var G = window.G;
  var cache = {};
  // Bố cục ẤM CÚNG (isometric): kệ dựa tường sau & tường trái, "phòng ngủ trưng bày" trên thảm, góc nghỉ gần cửa, quầy cạnh cửa
  function build(level) {
    var lv = G.data.levels[level], C = lv.cols, R = lv.rows;
    var blocked = new Uint8Array(C * R);
    function block(x, y, w, h) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < C && j < R) blocked[j * C + i] = 1; }
    function free(x, y, w, h) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) if (i < 1 || j < 1 || i >= C - 1 || j >= R - 1 || blocked[j * C + i]) return false; return true; }
    var doorX = Math.floor(C / 2) - 2, x, y, i;
    for (x = 0; x < C; x++) { blocked[x] = 1; if (x !== doorX) blocked[(R - 1) * C + x] = 1; }
    // quầy cạnh cửa (bên phải lối vào), người thu ngân đứng phía sau, khách trả tiền phía trước
    var counter = { x: doorX + 2, y: R - 3, w: 3, h: 1 }, cx = counter.x + 1;
    block(counter.x, counter.y, counter.w, counter.h);
    var cashier = { x: cx, y: R - 4 }, pay = { x: cx, y: R - 2 };
    // góc nghỉ: sofa + bàn trà + ghế bành + cây
    var props = [{ kind: 'sofa', x: 1, y: R - 4, w: 2, h: 1 }, { kind: 'table', x: 1, y: R - 3, w: 1, h: 1 }, { kind: 'armchair', x: 2, y: R - 3, w: 1, h: 1 }, { kind: 'tallplant', x: 3, y: R - 4, w: 1, h: 1 }];
    props.forEach(function (p) { block(p.x, p.y, p.w, p.h); });
    // kệ: dọc tường sau (hàng y=1, tiếp cận y=2) rồi dọc tường trái (cột x=1, tiếp cận x=2)
    var units = [];
    for (x = 3; x + 1 <= C - 2; x += 2) units.push({ x: x, y: 1, w: 2, h: 1, ax: x, ay: 2, appr: [[x, 2], [x + 1, 2]] });
    for (y = 3; y + 1 <= R - 6; y += 2) units.push({ x: 1, y: y, w: 1, h: 2, ax: 2, ay: y, appr: [[2, y], [2, y + 1]], vert: true });
    units = units.slice(0, Math.max(lv.shelves, 0));
    units.forEach(function (u) { block(u.x, u.y, u.w, u.h); });
    // phòng ngủ trưng bày: giường 2x2 (cách nhau 1 ô, tiếp cận phía dưới)
    var beds = [], nights = [];
    var avoid = {}; function av(x0, y0, w, h) { for (var j = y0; j < y0 + h; j++) for (var k = x0; k < x0 + w; k++) avoid[j * C + k] = 1; }
    av(counter.x, R - 4, counter.w + 1, 2); av(1, R - 4, 3, 2);
    function apprFor(x, y) { var dn = [[x, y + 2], [x + 1, y + 2]], up = [[x, y - 1], [x + 1, y - 1]]; function ok(a) { return a.every(function (p) { return p[0] >= 1 && p[0] < C - 1 && p[1] >= 1 && p[1] < R - 1 && !blocked[p[1] * C + p[0]] && !avoid[p[1] * C + p[0]]; }); } return ok(dn) ? dn : ok(up) ? up : null; }
    for (y = 3; y <= R - 5; y += 3) for (x = 4; x + 1 <= C - 3; x += 3) {
      var okc = true; for (var j = y; j < y + 2; j++) for (var k = x; k < x + 2; k++) if (avoid[j * C + k] || blocked[j * C + k]) okc = false;
      var ap = okc ? apprFor(x, y) : null;
      if (ap && beds.length < lv.beds) beds.push({ x: x, y: y, w: 2, h: 2, ax: ap[0][0], ay: ap[0][1], appr: ap });
    }
    // dự phòng: nếu thiếu chỗ giường thì quét thêm bất kỳ vị trí 2x2 trống
    if (beds.length < lv.beds) for (y = 3; y <= R - 4 && beds.length < lv.beds; y++) for (x = 4; x + 1 <= C - 3 && beds.length < lv.beds; x++) {
      if (!free(x, y, 2, 3) || beds.some(function (b) { return Math.abs(b.x - x) < 3 && Math.abs(b.y - y) < 3; })) continue; var bad = false; for (var j2 = y; j2 < y + 2; j2++) for (var k2 = x; k2 < x + 2; k2++) if (avoid[j2 * C + k2]) bad = true;
      var ap2 = bad ? null : apprFor(x, y); if (ap2) beds.push({ x: x, y: y, w: 2, h: 2, ax: ap2[0][0], ay: ap2[0][1], appr: ap2 });
    }
    beds.forEach(function (b) { block(b.x, b.y, b.w, b.h); });
    // bàn đầu giường + đèn ngủ ở khe giữa 2 giường cùng hàng
    beds.forEach(function (b) { var nb = beds.filter(function (o) { return o.y === b.y && o.x === b.x + 3; })[0]; if (nb && !blocked[b.y * C + b.x + 2]) { nights.push({ x: b.x + 2, y: b.y }); block(b.x + 2, b.y, 1, 1); } });
    // thảm + đèn thả + cây cố định (trang trí)
    var rugs = [], lamps = [];
    if (beds.length) { var bx0 = Math.min.apply(null, beds.map(function (b) { return b.x; })), bx1 = Math.max.apply(null, beds.map(function (b) { return b.x + 2; })), by0 = Math.min.apply(null, beds.map(function (b) { return b.y; })), by1 = Math.max.apply(null, beds.map(function (b) { return b.y + 2; })); rugs.push({ x: bx0 - 0.4, y: by0 - 0.3, w: bx1 - bx0 + 0.8, h: by1 - by0 + 1.7, col: '#f6c9d4', col2: '#fbe3ea' }); }
    rugs.push({ x: 0.8, y: R - 4.4, w: 3.4, h: 3.4, col: '#c9e4f4', col2: '#e2f1fa' });
    rugs.push({ x: doorX - 0.4, y: R - 3.2, w: 1.8, h: 2.2, col: '#fbd6b0', col2: '#fde7cf' });
    beds.forEach(function (b, k) { if (k % 2 === 0) lamps.push({ x: b.x + 1, y: b.y + 1 }); });
    lamps.push({ x: counter.x + 1.5, y: R - 2.5 }); lamps.push({ x: 2, y: R - 2.5 });
    units.forEach(function (u, k) { if (k % 3 === 1 && !u.vert) lamps.push({ x: u.x + 1, y: 2 }); });
    var plants = [{ x: C - 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: R - 3 }];
    var spots = { wander: [], counter: [] };
    for (x = 1; x < C - 1; x++) { spots.wander.push({ x: x, y: 2 }); spots.wander.push({ x: x, y: R - 2 }); }
    spots.counter = [{ x: cx, y: R - 4 }, { x: cx - 1, y: R - 4 }, { x: cx + 1, y: R - 4 }, { x: cx - 2, y: R - 2 }, { x: cx + 2, y: R - 2 }];
    spots.wander = spots.wander.filter(function (p) { return !blocked[p.y * C + p.x]; });
    spots.counter = spots.counter.filter(function (p) { return !blocked[p.y * C + p.x]; });
    return {
      level: level, cols: C, rows: R, blocked: blocked, door: { x: doorX, y: R - 1 }, shelfUnits: units, beds: beds, counter: counter, props: props, nights: nights, rugs: rugs, lamps: lamps, plants: plants,
      cashier: cashier, pay: pay, spots: spots
    };
  }
  G.layout = {
    get: function () { var l = G.state.level; return cache[l] || (cache[l] = build(l)); },
    // vị trí ô kệ theo slot id: trả {kind, ax, ay, unit/bed, j}
    slotPos: function (slot, ord) {
      var L = G.layout.get(), n = ord[slot.id];
      if (slot.kind === 'bed') { var b = L.beds[n]; return b ? { kind: 'bed', rect: b, ax: b.ax, ay: b.ay, n: n } : null; }
      var u = L.shelfUnits[Math.floor(n / G.data.shelfSlotsPerUnit)]; if (!u) return null;
      var j = n % G.data.shelfSlotsPerUnit;
      return { kind: 'shelf', rect: u, ax: u.vert ? u.ax : u.ax + (j === 2 ? 1 : 0), ay: u.vert ? u.ay + (j === 2 ? 1 : 0) : u.ay, j: j, n: n, vert: !!u.vert };
    }
  };
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  G.path = {
    find: function (sx, sy, tx, ty) {
      var L = G.layout.get(), C = L.cols, R = L.rows;
      sx = G.clamp(Math.floor(sx), 0, C - 1); sy = G.clamp(Math.floor(sy), 0, R - 1);
      tx = G.clamp(Math.floor(tx), 0, C - 1); ty = G.clamp(Math.floor(ty), 0, R - 1);
      if (sx === tx && sy === ty) return [{ x: tx + 0.5, y: ty + 0.5 }];
      var prev = new Int16Array(C * R).fill(-1), q = [sy * C + sx], qi = 0, goal = ty * C + tx;
      prev[sy * C + sx] = sy * C + sx;
      while (qi < q.length) {
        var cur = q[qi++]; if (cur === goal) break;
        var cx = cur % C, cy = (cur - cx) / C;
        for (var d = 0; d < 4; d++) {
          var nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
          if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
          var ni = ny * C + nx; if (prev[ni] >= 0 || (L.blocked[ni] && ni !== goal)) continue;
          prev[ni] = cur; q.push(ni);
        }
      }
      if (prev[goal] < 0) return [{ x: tx + 0.5, y: ty + 0.5 }];
      var path = [], c = goal;
      while (c !== sy * C + sx) { path.push({ x: (c % C) + 0.5, y: Math.floor(c / C) + 0.5 }); c = prev[c]; }
      return path.reverse();
    },
    goto: function (ent, tx, ty) { ent.path = G.path.find(ent.x, ent.y, tx, ty); },
    // di chuyển thực thể theo `sec` giây mô phỏng
    move: function (ent, sec) {
      var step = (ent.speed || 2) * sec; ent.moving = false;
      while (step > 1e-6 && ent.path && ent.path.length) {
        var t = ent.path[0], dx = t.x - ent.x, dy = t.y - ent.y, d = Math.sqrt(dx * dx + dy * dy);
        ent.moving = true;
        if (Math.abs(dx) > 0.01) ent.face = dx > 0 ? 1 : -1;
        if (d <= step) { ent.x = t.x; ent.y = t.y; ent.path.shift(); step -= d; }
        else { ent.x += dx / d * step; ent.y += dy / d * step; step = 0; }
        ent.phase = (ent.phase || 0) + 0.1;
      }
    }
  };
})();
