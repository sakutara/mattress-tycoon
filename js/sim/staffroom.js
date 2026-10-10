/* Phòng nhân viên: khu nghỉ cạnh cửa hàng (annex bên phải), NV hết ca / rảnh lâu / đang học vào nghỉ, nâng cấp tiện nghi, hồi phục mệt & hài lòng */
(function () {
  'use strict';
  var G = window.G;
  G.data.roomUps = [
    { id: 'sofa', name: 'Ghế sofa', cost: 6e6, upkeep: 0, desc: '+2 chỗ ngồi, nghỉ hồi phục nhanh hơn 30%' },
    { id: 'coffee', name: 'Máy pha cà phê', cost: 9e6, upkeep: 40000, desc: '+0,4 hài lòng/ngày cho mọi NV, NV nghỉ uống cà phê ☕' },
    { id: 'locker', name: 'Tủ locker', cost: 7e6, upkeep: 0, desc: '+0,2 hài lòng/ngày (có chỗ cất đồ)' },
    { id: 'ac', name: 'Máy lạnh', cost: 12e6, upkeep: 80000, desc: 'Ít mệt hơn (ngưỡng mệt +1 ngày), +0,2 hài lòng/ngày' },
    { id: 'nap', name: 'Phòng nghỉ trưa', cost: 15e6, upkeep: 60000, desc: 'Nghỉ ngơi hồi sức gấp đôi, NV có thể ngủ 💤' },
    { id: 'study', name: 'Góc học tập', cost: 8e6, upkeep: 20000, desc: 'Khóa đào tạo nhận thêm 20% XP' }
  ];
  G.addDefaults({ staffroom: { built: false, up: {}, rev: 0 } });
  var T = 40;
  var R = G.staffroom = {
    BUILD_COST: 8e6, UPKEEP: 50000, MIN_LEVEL: 1, occ: [],
    built: function () { return !!G.state.staffroom.built; },
    has: function (id) { return !!G.state.staffroom.up[id]; },
    cy: function () { return Math.floor(G.layout.get().rows / 2); },
    x0: function () { return G.layout.get().cols * T; },
    seats: function () { return Math.min(10, 3 + G.state.level + (R.has('sofa') ? 2 : 0)); },
    bonus: function () {
      var b = { rest: 1, sat: 0, fat: 0, train: 0 }; if (!R.built()) return b;
      if (R.has('sofa')) b.rest += 0.3; if (R.has('nap')) b.rest += 1;
      if (R.has('coffee')) b.sat += 0.4; if (R.has('locker')) b.sat += 0.2; if (R.has('ac')) { b.sat += 0.2; b.fat = 1; } if (R.has('study')) b.train = 0.2;
      return b;
    },
    upkeep: function () { var u = R.UPKEEP; G.data.roomUps.forEach(function (x) { if (R.has(x.id)) u += x.upkeep; }); return u; },
    build: function () {
      var s = G.state; if (R.built()) return { ok: false, msg: 'Đã có phòng nhân viên' };
      if (s.level < R.MIN_LEVEL) return { ok: false, msg: 'Mở từ cấp Cửa hàng nhỏ' };
      if (s.money < R.BUILD_COST) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(R.BUILD_COST) + ')' };
      G.econ.cash(-R.BUILD_COST); s.staffroom.built = true; s.staffroom.rev++; G.emit('roomChanged');
      return { ok: true, msg: 'Đã xây phòng nhân viên! Duy trì ' + G.fmt.vnd(R.UPKEEP) + '/ngày.' };
    },
    buyUp: function (id) {
      var s = G.state, u = G.data.roomUps.filter(function (x) { return x.id === id; })[0];
      if (!R.built() || !u || R.has(id)) return { ok: false, msg: 'Không hợp lệ' };
      if (s.money < u.cost) return { ok: false, msg: 'Không đủ tiền' };
      G.econ.cash(-u.cost); s.staffroom.up[id] = 1; s.staffroom.rev++; G.emit('roomChanged'); return { ok: true, msg: 'Đã nâng cấp: ' + u.name };
    },
    door: function () { return { x: 0, y: R.cy() }; }, // cửa sang phòng NV nằm ở mép TRÁI cửa hàng
    occOf: function (id) { return R.occ.filter(function (o) { return String(o.id) === String(id); })[0]; },
    freeSeat: function () { var n = R.seats(), used = {}; R.occ.forEach(function (o) { used[o.seat] = 1; }); for (var i = 0; i < n; i++) if (!used[i]) return i; return -1; },
    canBreak: function (id) { return R.built() && id !== 'owner' && R.freeSeat() >= 0 && !R.occOf(id); },
    // NV đã tới cửa phòng nghỉ
    enter: function (e) {
      var seat = R.freeSeat(); if (seat < 0) { G.staff.leave(e); return; }
      var st = G.staff.byId(e.id), tired = st && st.fatigue > 0.2, r = Math.random(), state = R.has('coffee') && r < 0.5 ? 'coffee' : (tired || (R.has('nap') && r < 0.4)) ? 'sleep' : 'sit';
      R.occ.push({ id: e.id, name: e.name, role: e.role, color: e.color, look: e.look, seat: seat, until: G.state.minute + (e.breakMin || 30), reason: e.reason || 'shift', state: state });
      G.staff.ents = G.staff.ents.filter(function (x) { return x !== e; });
    },
    leaveRoom: function (o) {
      var s = G.state; R.occ = R.occ.filter(function (x) { return x !== o; });
      var st = G.staff.byId(o.id); if (!st || st.status !== 'ok' || !G.clock.isOpen() || G.staff.closed()) return;
      if (G.staff.shiftOn(st, s.day, s.minute) && !G.staff.ent(o.id)) { // về lại cửa hàng từ cửa phòng nghỉ
        var e = G.staff.spawnEnt(st.id, st.role, st.name, G.roleById[st.role].color), L = G.layout.get(), d = R.door();
        e.x = d.x + 0.5; e.y = d.y + 0.5; e.state = 'enter'; var h = G.staff.homeFor(e); G.path.goto(e, h.x, h.y);
      }
    },
    update: function (gm) {
      var s = G.state; if (!R.built()) { R.occ = []; return; }
      // học: NV đang đi học ngồi đọc sách trong phòng
      s.staff.forEach(function (st) {
        var o = R.occOf(st.id);
        if (st.status === 'training' && G.clock.isOpen() && !o && R.freeSeat() >= 0) R.occ.push({ id: st.id, name: st.name, role: st.role, color: G.roleById[st.role].color, seat: R.freeSeat(), until: 99999, reason: 'train', state: 'read' });
        if (o && o.reason === 'train' && st.status !== 'training') R.occ = R.occ.filter(function (x) { return x !== o; });
        if (o && o.reason !== 'train' && st.status !== 'ok') R.occ = R.occ.filter(function (x) { return x !== o; });
      });
      R.occ.slice().forEach(function (o) {
        var st = G.staff.byId(o.id); if (!st) { R.occ = R.occ.filter(function (x) { return x !== o; }); return; }
        if (o.reason !== 'train') { st.rest = (st.rest || 0) + gm; if (G.state.minute >= o.until) R.leaveRoom(o); }
      });
    }
  };
  G.on('tick', function (t) { R.update(t.gm); });
  G.on('dayStart', function () { if (R.built()) G.econ.expense(R.upkeep(), 'staffroom'); });
  G.on('dayEnd', function () { R.occ = []; });
  G.on('init', function () { R.occ = []; });
  G.econ.EXP_NAMES.staffroom = 'Duy trì phòng nhân viên';

  // ---------- vẽ: phòng NV là một cảnh isometric riêng 8x7 ô (toạ độ đất px, 1 ô = 40px) ----------
  var SP = function () { return G.sprites; };
  var W = 320, H = 280;
  function wallText(c, gx, u, v, txt, font, col, align) { var sp = SP(), o = sp.P(gx + u, 40, v); c.save(); c.transform(sp.HX / 40, sp.HY / 40, 0, 1, o[0], o[1]); c.fillStyle = col; c.font = font; c.textAlign = align || 'left'; c.fillText(txt, 0, 0); c.restore(); }
  R.wallText = wallText;
  R.paintStatic = function (c) {
    var sp = SP(), P = sp.P, iso = sp.isoBox, pl = G.render.plateOf('room'), x, y;
    sp.plate(c, pl.gx0, pl.gy0, pl.gx1, pl.gy1, G.render.TH, '#f7d2b8', '#e9b79f', '#d79f8d');
    sp.woodFloor(c, 0, 1, 8, 7, ['#ffe9d2', '#fbdfc2', '#fff1de']);
    sp.leftWall(c, 7, 62, '#e6f4ee', null); sp.backWall(c, 8, 62, '#eaf7f1');
    sp.window(c, 'b', 4 * 40, 8, 40, 22, 26); sp.window(c, 'l', 3 * 40, 10, 54, 22, 26);
    // biển phòng
    function wb(u, v) { return sp.wallBack(100, u, v); }
    sp.poly(c, [wb(0, 40), wb(120, 40), wb(120, 58), wb(0, 58)], '#4a4466'); wallText(c, 100, 60, 45, 'PHÒNG NHÂN VIÊN', 'bold 9px sans-serif', '#bfeedd', 'center');
    // bảng lịch ca (nội dung vẽ động) + tủ locker / móc áo
    sp.poly(c, [sp.wallBack(0, 14, 22), sp.wallBack(0, 138, 22), sp.wallBack(0, 138, 56), sp.wallBack(0, 14, 56)], '#ffffff'); wallText(c, 0, 18, 49, 'LỊCH CA HÔM NAY', 'bold 7px sans-serif', '#8FA0C8');
    iso(c, 226, 44, 80, 22, 52, R.has('locker') ? '#a8bcff' : '#d9d2e4');
    if (R.has('locker')) for (var k = 0; k < 3; k++) sp.poly(c, [sp.P(232 + k * 24, 66, 8), sp.P(250 + k * 24, 66, 8), sp.P(250 + k * 24, 66, 46), sp.P(232 + k * 24, 66, 46)], k % 2 ? '#c4d1ff' : '#b3c3ff');
    else wallText(c, 0, 232, 30, 'móc áo', '8px sans-serif', '#9aa7c7');
    if (R.has('study')) { iso(c, 148, 44, 66, 16, 50, '#f0a24a'); [0, 1, 2, 3].forEach(function (i) { sp.poly(c, [sp.P(154 + i * 14, 60, 12), sp.P(164 + i * 14, 60, 12), sp.P(164 + i * 14, 60, 44), sp.P(154 + i * 14, 60, 44)], ['#f4b6c2', '#9fd0f0', '#8fcf7a', '#d4c6f2'][i]); }); }
    if (R.has('ac')) iso(c, 262, 52, 46, 10, 14, '#f7efe9', 40, { noShadow: true });
    // sofa / bàn / máy cà phê / giường nghỉ
    iso(c, 16, 150, 108, 42, 16, '#e99aae'); iso(c, 16, 148, 108, 9, 34, '#dc8aa0', 0, { noShadow: true }); iso(c, 22, 158, 48, 30, 5, '#f4b6c2', 16, { noShadow: true }); iso(c, 72, 158, 48, 30, 5, '#f7c4cf', 16, { noShadow: true });
    if (R.has('sofa')) { iso(c, 16, 206, 108, 42, 16, '#a99fb4'); iso(c, 16, 204, 108, 9, 34, '#968ba3', 0, { noShadow: true }); iso(c, 22, 214, 96, 30, 5, '#c9bfdc', 16, { noShadow: true }); }
    iso(c, 140, 164, 70, 36, 10, '#f0c9a0'); iso(c, 150, 172, 10, 10, 5, '#ffffff', 10, { noShadow: true }); iso(c, 178, 176, 10, 10, 5, '#f4b6c2', 10, { noShadow: true });
    iso(c, 244, 168, 42, 30, 40, R.has('coffee') ? '#4a4466' : '#d9d2e4'); if (R.has('coffee')) { sp.poly(c, [sp.P(250, 198, 30), sp.P(280, 198, 30), sp.P(280, 198, 24), sp.P(250, 198, 24)], '#bfeedd'); iso(c, 258, 190, 12, 8, 8, '#ffd06b', 0, { noShadow: true }); }
    if (R.has('nap')) { iso(c, 138, 226, 70, 34, 10, '#9fd0f0'); iso(c, 142, 230, 20, 26, 6, '#ffffff', 10, { noShadow: true, facet: true }); }
    sp.plant(c, 0, 224); sp.plant(c, 276, 90, 0.9);
    // khung cửa sang cửa hàng (mép phải)
    iso(c, W - 6, 136, 8, 6, 56, '#f0a24a'); iso(c, W - 6, 200, 8, 6, 56, '#f0a24a'); iso(c, W - 6, 136, 8, 70, 6, '#f0a24a', 56, { noShadow: true });
    sp.poly(c, [sp.P(W + 2, 150, 40), sp.P(W + 2, 190, 40), sp.P(W + 2, 190, 52), sp.P(W + 2, 150, 52)], '#fffaf4');
  };
  R.seatPos = function (i) {
    var P = [[44, 184], [96, 184], [44, 240], [96, 240], [152, 220], [176, 150], [190, 244], [120, 144], [268, 232], [226, 208]];
    return P[i % P.length];
  };
  R.drawScene = function (ctx) {
    var s = G.state; if (!R.built()) return;
    var sp = SP(), now = performance.now();
    // lịch ca hôm nay (chữ trên tường)
    var rows = s.staff.slice(0, 5);
    rows.forEach(function (st, i) {
      var sh = G.staff.shiftFor(st, s.day), col = { am: '#4FC3F7', pm: '#FF9A5B', full: '#34C997', off: '#C9D1E6' }[sh], v = 44 - i * 6.2, u = 18;
      wallText(ctx, 0, u, v, st.name.split(' ').pop().slice(0, 9), '7px sans-serif', '#2A3560');
      sp.poly(ctx, [sp.wallBack(0, 74, v - 1), sp.wallBack(0, 108, v - 1), sp.wallBack(0, 108, v + 5), sp.wallBack(0, 74, v + 5)], col); wallText(ctx, 0, 78, v, G.data.shifts[sh].short, 'bold 6px sans-serif', '#fff');
    });
    if (!rows.length) wallText(ctx, 0, 22, 36, '(chưa có NV)', '8px sans-serif', '#9aa7c7');
    // đồng hồ treo tường
    var ck = sp.wallBack(200, 20, 38), cxk = ck[0], cyk = ck[1]; sp.hexagon(ctx, cxk, cyk, 9, '#FFFFFF', 1); var mm = s.minute, ang = (mm % 60) / 60 * 6.283 - 1.5708, ah = (mm / 60 % 12) / 12 * 6.283 - 1.5708;
    ctx.strokeStyle = '#2A3560'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cxk, cyk); ctx.lineTo(cxk + Math.cos(ang) * 7, cyk + Math.sin(ang) * 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cxk, cyk); ctx.lineTo(cxk + Math.cos(ah) * 4.5, cyk + Math.sin(ah) * 4.5); ctx.stroke();
    // người trong phòng
    R.occ.slice().sort(function (a, b) { var pa = R.seatPos(a.seat), pb = R.seatPos(b.seat); return pa[0] + pa[1] - pb[0] - pb[1]; }).forEach(function (o) {
      var p = R.seatPos(o.seat), pp = sp.P(p[0], p[1], 0), px = pp[0], py = pp[1];
      var look = G.render.staffLook({ id: o.id, role: o.role, color: o.color });
      sp.person(ctx, Object.assign({}, look, { x: px, y: py, shirt: '#FFFFFF', band: o.color, face: 1, mood: o.state === 'sleep' ? 'neutral' : 'happy', moving: false, phase: now / 700 + o.seat, sit: o.state !== 'coffee', role: o.role }));
      sp.bubble(ctx, px, py - 46, { coffee: '☕', sleep: '💤', read: '📖', sit: '💬' }[o.state] || '☕', '#7C6BC4');
      ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(42,53,96,.8)'; ctx.fillText(o.name.split(' ').pop(), px, py + 11);
    });
  };
})();
