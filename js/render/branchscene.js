/* Nội thất chi nhánh: vẽ lại cảnh cửa hàng theo cấp (bố cục/kệ/giường) với biển hiệu riêng, mẫu trưng bày đồng bộ trụ sở, có Quản lý, nhân viên và khách đi lại (không ảnh hưởng mô phỏng thật). */
(function () {
  'use strict';
  var G = window.G, SP = G.sprites, T = SP.T, R = G.render;
  var SHIRT = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#26c6da', '#ff7043', '#ec407a'], SKIN = ['#ffcc99', '#f1b98a', '#e0a070', '#c68642'], HAIR = ['#222a44', '#3e2723', '#6d4c41', '#111', '#c2185b', '#7e57c2'];
  var BV = G.branchView = { cur: null, raf: 0, cache: null };
  function size(idx) { return idx < 2 ? 3 : 2; }
  function frame(lv) {
    var p = R.plateOf('shop', lv), a = SP.P(p.gx0, p.gy0, 0), b = SP.P(p.gx1, p.gy0, 0), c = SP.P(p.gx0, p.gy1, 0), d = SP.P(p.gx1, p.gy1, 0);
    var minx = c[0], maxx = b[0], miny = a[1] - R.WALLH - R.HILLS, maxy = d[1] + R.TH + 14, w = maxx - minx + 2 * R.PADX;
    return { w: w, h: maxy - miny, ox: R.PADX - minx, oy: -miny };
  }
  function statics(v) {
    var key = v.lv + '|' + v.name, k = 2;
    if (BV.cache && BV.cache.key === key) return BV.cache.cv;
    var f = v.fr, cv = document.createElement('canvas'); cv.width = Math.ceil(f.w * k); cv.height = Math.ceil(f.h * k);
    var c = cv.getContext('2d'); c.scale(k, k); R.paintBG(c, f); c.save(); c.translate(f.ox, f.oy); R.paintShop(c, v.lv, { name: v.name, sub: v.sub, noRoom: true }); c.restore();
    BV.cache = { key: key, cv: cv }; return cv;
  }
  function look(i) { return { shirt: SHIRT[i % SHIRT.length], skin: SKIN[(i * 3) % SKIN.length], hair: HAIR[(i * 5) % HAIR.length], hairStyle: i % 5 }; }
  function pt(p, wait, st) { return { x: p.x != null ? p.x : p[0], y: p.y != null ? p.y : p[1], wait: wait, st: st }; }
  function mkCust(v) {
    var L = v.L, i = v.seq++, c = Object.assign(look(i + v.id * 7), { x: L.door.x + 0.5, y: L.door.y + 0.5, path: [], speed: 1.5 + (i % 3) * 0.25, state: 'walk', face: 1, phase: Math.random() * 6, bag: false, kind: 'cust', idx: 0, cur: null, wait: 0 });
    var tg = L.shelfUnits.concat(L.beds), a = tg.length ? tg[(i * 7 + v.id) % tg.length].appr[0] : [L.door.x, L.door.y - 2], b = tg.length ? tg[(i * 3 + 1 + v.id) % tg.length].appr[0] : a;
    c.plan = [pt(a, 2.5 + (i % 3), 'browse'), pt(b, 2 + (i % 2) * 2, 'browse')];
    if (i % 3) c.plan.push(pt(L.pay, 2.2, 'paying'));
    c.plan.push(pt(L.door, 0, 'leave'));
    return c;
  }
  function stepCust(v, c, dt) {
    G.path.move(c, dt);
    if (c.path.length) { c.state = 'walk'; return; }
    if (c.cur) {
      if (c.wait > 0) { c.wait -= dt; c.state = c.cur.st === 'leave' ? 'walk' : c.cur.st; return; }
      if (c.cur.st === 'paying') { c.bag = true; c.mood = 'happy'; }
      if (c.cur.st === 'leave') { c.dead = true; return; }
    }
    var t = c.plan[c.idx++]; if (!t) { c.dead = true; return; }
    c.cur = t; c.wait = t.wait; G.path.goto(c, t.x, t.y, v.lv);
  }
  function mkStaff(v, id, role, name, spot) {
    var L = v.L; return { id: id, role: role, name: name, color: G.roleById[role].color, x: spot.x + 0.5, y: spot.y + 0.5, path: [], speed: 1.3, state: role === 'manager' ? 'idle' : 'idle', face: 1, phase: 0, idleT: 1 + Math.random() * 3, kind: 'staff', home: role === 'manager' || role === 'accountant' };
  }
  function stepStaff(v, e, dt) {
    G.path.move(e, dt); if (e.path.length) return;
    e.idleT -= dt; if (e.idleT > 0) return;
    e.idleT = 3 + Math.random() * 6; var sp = v.L.spots.wander; if (!sp.length) return;
    var t = e.role === 'manager' ? v.L.cashier : sp[Math.floor(Math.random() * sp.length)]; G.path.goto(e, t.x, t.y, v.lv);
  }
  BV.open = function (b, idx) {
    var s = G.state, lv = Math.min(s.level, size(idx) === 3 ? 3 : 2), name = s.shopName + ' ' + b.district, v = { id: b.id, idx: idx, lv: lv, name: name, sub: 'Chi nhánh ' + (idx + 1), seq: 1, ents: [], t: 0 };
    v.L = G.layout.get(lv); v.fr = frame(lv);
    var paying = G.chain.paying(), mg = G.staff.byRole('manager')[idx];
    v.paying = paying; v.manager = mg ? mg.name : null;
    if (paying) {
      v.ents.push(mkStaff(v, 'bm' + b.id, 'manager', mg ? mg.name : 'Quản lý', v.L.cashier));
      var ns = size(idx) === 3 ? 2 : 1; for (var i = 0; i < ns; i++) v.ents.push(mkStaff(v, 'bs' + b.id + i, 'sales', ['Mai', 'Lan', 'Hùng', 'Nam'][(b.id + i) % 4], v.L.spots.wander[(i * 7 + 3) % Math.max(1, v.L.spots.wander.length)] || v.L.cashier));
      var nc = 3 + Math.round(b.f * 2); for (var j = 0; j < nc; j++) { var c = mkCust(v); c.wait = j * 2.2; v.ents.push(c); }
    }
    v.last = 0; BV.cur = v; BV.start();
  };
  BV.close = function () { BV.cur = null; };
  BV.start = function () { if (BV.raf) return; BV.last = performance.now(); BV.raf = requestAnimationFrame(BV.frame); };
  BV.frame = function (now) {
    BV.raf = 0; var v = BV.cur; if (!v) return;
    var cv = document.getElementById('branch-cv'); if (!cv) { v.miss = (v.miss || 0) + 1; if (v.miss > 120) { BV.cur = null; return; } BV.raf = requestAnimationFrame(BV.frame); return; }
    v.miss = 0; var dt = Math.min(0.1, (now - BV.last) / 1000); BV.last = now; BV.draw(cv, v, dt);
    BV.raf = requestAnimationFrame(BV.frame);
  };
  BV.draw = function (cv, v, dt) {
    var f = v.fr, L = v.L, dpr = Math.min(2, window.devicePixelRatio || 1), cw = cv.clientWidth || 340, ch = Math.round(cw * f.h / f.w);
    if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    var ctx = cv.getContext('2d'), k = cw * dpr / f.w; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(statics(v), 0, 0, cv.width, cv.height);
    ctx.setTransform(k, 0, 0, k, f.ox * k, f.oy * k);
    // cập nhật người
    v.ents.forEach(function (e) { if (e.kind === 'cust') stepCust(v, e, dt); else stepStaff(v, e, dt); });
    var dead = v.ents.filter(function (e) { return e.dead; }).length; v.ents = v.ents.filter(function (e) { return !e.dead; });
    for (var q = 0; q < dead; q++) { var c = mkCust(v); c.wait = 1 + Math.random() * 3; v.ents.push(c); }
    // đồ vật (sắp theo độ sâu) — mẫu trưng bày lấy theo trụ sở
    var s = G.state, ord = G.shelf.ordinals(), objs = [], byShelf = {}, byBed = {};
    s.slots.forEach(function (sl) { var n = ord[sl.id]; if (sl.kind === 'bed') byBed[n] = sl; else { var u = Math.floor(n / G.data.shelfSlotsPerUnit); (byShelf[u] = byShelf[u] || [])[n % G.data.shelfSlotsPerUnit] = sl; } });
    L.shelfUnits.forEach(function (u, i) { objs.push({ k: (u.x + u.w / 2) + (u.y + u.h / 2), f: function () { SP.shelfUnit(ctx, u, byShelf[i] || []); } }); });
    L.beds.forEach(function (b, i) { objs.push({ k: (b.x + b.w / 2) + (b.y + b.h / 2), f: function () { SP.bed(ctx, b, byBed[i]); } }); });
    L.nights.forEach(function (n) { objs.push({ k: n.x + n.y + 1, f: function () { SP.nightstand(ctx, n.x * T, n.y * T); } }); });
    objs.push({ k: (L.counter.x + L.counter.w / 2) + L.counter.y + 0.5, f: function () { SP.counter(ctx, L.counter); } });
    L.props.forEach(function (p) { objs.push({ k: (p.x + p.w / 2) + (p.y + p.h / 2), f: function () { R.drawProp(ctx, p); } }); });
    L.plants.forEach(function (p) { objs.push({ k: p.x + p.y + 1, f: function () { SP.plant(ctx, p.x * T, p.y * T); } }); });
    objs.push({ k: L.door.x + L.door.y + 1.4, f: function () { SP.door(ctx, L.door, v.paying); } });
    v.ents.forEach(function (e) { objs.push({ k: e.x + e.y + 0.15, f: function () { if (e.kind === 'cust') R.drawCust(ctx, e); else R.drawStaff(ctx, e); } }); });
    objs.sort(function (a, b) { return a.k - b.k; }).forEach(function (o) { o.f(); });
    L.lamps.forEach(function (l) { var t0 = SP.P((l.x + 0.5) * T, (l.y + 0.5) * T, 92), t1 = SP.P((l.x + 0.5) * T, (l.y + 0.5) * T, 66); ctx.strokeStyle = '#a99fb4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); ctx.stroke(); SP.poly(ctx, [[t1[0] - 9, t1[1] + 3], [t1[0] + 9, t1[1] + 3], [t1[0] + 5, t1[1] - 6], [t1[0] - 5, t1[1] - 6]], '#ffe6a8'); });
    if (!v.paying) {
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.fillStyle = 'rgba(70,60,110,.5)'; ctx.fillRect(0, 0, f.w, f.h);
      var tx = f.w / 2, ty = f.h * 0.55; ctx.fillStyle = '#f08a8a'; ctx.fillRect(tx - 150, ty - 20, 300, 40); ctx.fillStyle = '#fff'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Thiếu Quản lý - tạm đóng cửa', tx, ty + 6);
    }
  };
})();
