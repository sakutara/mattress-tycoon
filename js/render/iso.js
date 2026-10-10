/* Bộ vẽ ISOMETRIC (2:1) low-poly pastel: hộp 3 tông (mặt trên sáng nhất, mặt trái vừa, mặt phải tối nhất), bóng mềm, cây / đá / cỏ.
   Toạ độ vào là px mặt đất (1 ô = T px, T=40). P(gx,gy,gz) -> toạ độ màn hình cục bộ của trang (gốc = đỉnh trên của ô (0,0)); gz = độ cao (px màn hình). */
(function () {
  'use strict';
  var G = window.G, SP = G.sprites, T = SP.T, poly = SP.poly, shade = SP.shade;
  var HX = 28, HY = 14;
  SP.HX = HX; SP.HY = HY;
  var P = SP.P = function (gx, gy, gz) { return [(gx - gy) * HX / T, (gx + gy) * HY / T - (gz || 0)]; };
  // gương ngược: màn hình -> mặt đất (gz = 0)
  SP.unP = function (sx, sy) { var a = sx / HX * T, b = sy / HY * T; return { x: (a + b) / 2, y: (b - a) / 2 }; };
  function pp(pts) { var o = []; for (var i = 0; i < pts.length; i++) o.push(P(pts[i][0], pts[i][1], pts[i][2])); return o; }
  var poly3 = SP.poly3 = function (ctx, pts, fill) { poly(ctx, pp(pts), fill); };
  SP.TONE = { top: 0.16, left: -0.05, right: -0.24 };
  var iso = SP.isoBox = function (ctx, gx, gy, gw, gd, gh, col, z0, o) {
    z0 = z0 || 0; o = o || {}; var zt = z0 + gh;
    if (!o.noShadow && z0 === 0) { ctx.fillStyle = 'rgba(80,60,110,.15)'; var s = pp([[gx + 2, gy + 5, 0], [gx + gw + 5, gy + 5, 0], [gx + gw + 5, gy + gd + 8, 0], [gx + 2, gy + gd + 8, 0]]); ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); for (var i = 1; i < 4; i++) ctx.lineTo(s[i][0], s[i][1]); ctx.closePath(); ctx.fill(); }
    var cl = o.left || shade(col, SP.TONE.left), cr = o.right || shade(col, SP.TONE.right), ct = o.top || shade(col, SP.TONE.top);
    poly3(ctx, [[gx, gy + gd, zt], [gx + gw, gy + gd, zt], [gx + gw, gy + gd, z0], [gx, gy + gd, z0]], cl);
    poly3(ctx, [[gx + gw, gy, zt], [gx + gw, gy + gd, zt], [gx + gw, gy + gd, z0], [gx + gw, gy, z0]], cr);
    if (o.facet) { poly3(ctx, [[gx, gy, zt], [gx + gw, gy, zt], [gx + gw, gy + gd, zt]], ct); poly3(ctx, [[gx, gy, zt], [gx + gw, gy + gd, zt], [gx, gy + gd, zt]], shade(col, SP.TONE.top - 0.06)); }
    else poly3(ctx, [[gx, gy, zt], [gx + gw, gy, zt], [gx + gw, gy + gd, zt], [gx, gy + gd, zt]], ct);
  };
  SP.isoDiamond = function (ctx, gx, gy, gw, gd, z, fill) { poly3(ctx, [[gx, gy, z], [gx + gw, gy, z], [gx + gw, gy + gd, z], [gx, gy + gd, z]], fill); };
  // vòng sáng mềm (hồ ánh sáng) trên sàn
  SP.glow = function (ctx, gx, gy, gz, r, rgb, a) {
    var p = P(gx, gy, gz); ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(1, 0.5);
    var g = ctx.createRadialGradient(0, 0, 2, 0, 0, r); g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
  };
  // ---- thiên nhiên low-poly ----
  SP.pine = function (ctx, gx, gy, s) { // thông nón: 3 tầng nón 2 tông
    s = s || 1; var base = P(gx, gy, 0), x = base[0], y = base[1];
    ctx.fillStyle = 'rgba(80,60,110,.16)'; ctx.beginPath(); ctx.ellipse(x - 6 * s, y + 3 * s, 22 * s, 8 * s, 0, 0, 6.3); ctx.fill();
    poly(ctx, [[x - 3 * s, y], [x + 3 * s, y], [x + 3 * s, y - 12 * s], [x - 3 * s, y - 12 * s]], '#b07a4c'); poly(ctx, [[x, y], [x + 3 * s, y], [x + 3 * s, y - 12 * s], [x, y - 12 * s]], '#946238');
    [[14, 24, 0], [11, 22, 16], [8, 20, 31]].forEach(function (t, i) { var w = t[0] * s, h = t[1] * s, by = y - 8 * s - t[2] * s; poly(ctx, [[x - w, by], [x, by - h], [x, by + w * 0.35]], i % 2 ? '#8fcf7a' : '#7dc06a'); poly(ctx, [[x + w, by], [x, by - h], [x, by + w * 0.35]], '#5fa855'); poly(ctx, [[x - w, by], [x, by + w * 0.35], [x + w, by]], '#6aa95c'); });
  };
  SP.roundTree = function (ctx, gx, gy, s) { // cây tán tròn nhiều mảng
    s = s || 1; var b = P(gx, gy, 0), x = b[0], y = b[1];
    ctx.fillStyle = 'rgba(80,60,110,.16)'; ctx.beginPath(); ctx.ellipse(x - 8 * s, y + 3 * s, 24 * s, 8 * s, 0, 0, 6.3); ctx.fill();
    poly(ctx, [[x - 3.5 * s, y], [x + 3.5 * s, y], [x + 2.5 * s, y - 24 * s], [x - 2.5 * s, y - 24 * s]], '#b5714a'); poly(ctx, [[x, y], [x + 3.5 * s, y], [x + 2.5 * s, y - 24 * s], [x, y - 24 * s]], '#96593a');
    poly(ctx, [[x - 2 * s, y - 20 * s], [x - 14 * s, y - 30 * s], [x - 12 * s, y - 32 * s]], '#96593a');
    var blobs = [[-12, -34, 12], [10, -36, 11], [0, -44, 15], [0, -32, 14]];
    blobs.forEach(function (bl, i) { var cx = x + bl[0] * s, cy = y + bl[1] * s, r = bl[2] * s, p = []; for (var k = 0; k < 7; k++) { var a = Math.PI * 2 / 7 * k - 0.4; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9]); }
      poly(ctx, [[cx, cy], p[4], p[5], p[6], p[0]], i === 2 ? '#c4e8a8' : '#b4de98'); poly(ctx, [[cx, cy], p[0], p[1], p[2]], '#9ccf80'); poly(ctx, [[cx, cy], p[2], p[3], p[4]], '#7fb866'); });
  };
  SP.rock = function (ctx, gx, gy, s, col) {
    s = s || 1; col = col || '#a99fb4'; var b = P(gx, gy, 0), x = b[0], y = b[1];
    ctx.fillStyle = 'rgba(80,60,110,.18)'; ctx.beginPath(); ctx.ellipse(x - 5 * s, y + 3 * s, 20 * s, 7 * s, 0, 0, 6.3); ctx.fill();
    var p = [[-14, 0], [-10, -12], [-2, -17], [8, -13], [14, -4], [10, 2], [-6, 3]].map(function (q) { return [x + q[0] * s, y + q[1] * s]; });
    poly(ctx, [p[0], p[1], p[2], p[6]], shade(col, 0.1)); poly(ctx, [p[1], p[2], p[3]], shade(col, 0.28)); poly(ctx, [p[2], p[3], p[4], p[5], p[6]], shade(col, -0.12)); poly(ctx, [p[3], p[4], p[5]], shade(col, -0.25));
  };
  SP.tuft = function (ctx, gx, gy, s) { s = s || 1; var b = P(gx, gy, 0), x = b[0], y = b[1]; [[-7, -9, '#7fb866'], [-3, -12, '#8fcf7a'], [1, -10, '#6fb35e'], [5, -13, '#8fcf7a'], [8, -8, '#7fb866']].forEach(function (t) { poly(ctx, [[x + t[0] * s - 1.5, y], [x + t[0] * s + 1.5, y], [x + t[0] * s * 1.2, y + t[1] * s]], t[2]); }); };
  SP.bush = function (ctx, gx, gy, s, col) { s = s || 1; col = col || '#8fcf7a'; var b = P(gx, gy, 0), x = b[0], y = b[1]; ctx.fillStyle = 'rgba(80,60,110,.15)'; ctx.beginPath(); ctx.ellipse(x - 3 * s, y + 2 * s, 14 * s, 5 * s, 0, 0, 6.3); ctx.fill();
    poly(ctx, [[x - 11 * s, y], [x - 8 * s, y - 9 * s], [x, y - 12 * s], [x, y]], shade(col, 0.1)); poly(ctx, [[x, y], [x, y - 12 * s], [x + 9 * s, y - 8 * s], [x + 12 * s, y]], shade(col, -0.18)); poly(ctx, [[x - 8 * s, y - 9 * s], [x, y - 12 * s], [x + 9 * s, y - 8 * s], [x, y - 5 * s]], shade(col, 0.22)); };
  // ---- đồ nội thất ----
  var TYPE_COL = { chan: '#a8d8f0', ga: '#f6b7c8', goi: '#fff0b5', dem: '#fffaf4', topper: '#bfeedd', phukien: '#d4c6f2' };
  var GRADE_COL = { 1: '#F2B705', 2: '#B8C0CC' };
  SP.TYPE_COL = TYPE_COL;
  // mã ngắn của mẫu (mã màu cho bộ chăn ga, còn lại: tiền tố hãng + dòng)
  SP.codeOf = function (skuId) {
    var t = G.skus[skuId]; if (!t) return ''; if (t.cw) return t.cw.code;
    var pre = (G.data.cwPrefix && G.data.cwPrefix[t.brand]) || 'XX', id = t.line.split('_'), suf = id[id.length > 1 ? 1 : 0].toUpperCase();
    return pre + '-' + suf + (t.grade ? '·' + t.grade : '');
  };
  // 1 mẫu trưng bày trên ô kệ: (gx,gy,gw,gd) mặt đất của ô, z0 = độ cao mặt kệ
  function stack(ctx, gx, gy, gw, gd, z0, slot) {
    if (!slot || !slot.sku) { var c = P(gx + gw / 2, gy + gd / 2, z0 + 0.5); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(c[0], c[1], 7, 3.6, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = 'rgba(159,208,240,.95)'; ctx.fillRect(c[0] - 3.2, c[1] - 0.6, 6.4, 1.3); ctx.fillRect(c[0] - 0.6, c[1] - 1.8, 1.3, 3.2); return; }
    var sku = G.skus[slot.sku], br = G.brandById[sku.brand], col = TYPE_COL[sku.type], band = sku.grade ? GRADE_COL[sku.grade] : br.color, mx = gw * 0.08, my = gd * 0.1, w = gw - mx * 2, d = gd - my * 2, x = gx + mx, y = gy + my;
    if (sku.type === 'ga' && sku.cw) { // bộ chăn ga gối gấp gọn đúng màu
      var cw = sku.cw;
      iso(ctx, x, y, w, d, 5, cw.hex, z0, { noShadow: true }); iso(ctx, x + 1, y + 1, w - 2, d - 2, 5, shade(cw.hex, -0.04), z0 + 5, { noShadow: true }); iso(ctx, x + 2, y + 2, w - 4, d - 4, 5, cw.hex, z0 + 10, { noShadow: true });
      poly3(ctx, [[x, y + d, z0 + 4], [x + w, y + d, z0 + 4], [x + w, y + d, z0 + 1.5], [x, y + d, z0 + 1.5]], cw.hex2); poly3(ctx, [[x + 1, y + d - 1, z0 + 9], [x + w - 1, y + d - 1, z0 + 9], [x + w - 1, y + d - 1, z0 + 6.5], [x + 1, y + d - 1, z0 + 6.5]], cw.hex2);
      iso(ctx, x + w * 0.25, y + d * 0.2, w * 0.5, d * 0.55, 4, '#ffffff', z0 + 15, { noShadow: true, facet: true, top: shade(cw.hex, 0.4) });
    } else if (sku.type === 'goi') { iso(ctx, x, y + d * 0.1, w, d * 0.8, 10, col, z0, { noShadow: true, facet: true }); iso(ctx, x + w * 0.15, y + d * 0.2, w * 0.7, d * 0.6, 5, shade(col, 0.1), z0 + 8, { noShadow: true, facet: true }); }
    else if (sku.type === 'chan') { for (var i = 0; i < 3; i++) iso(ctx, x + i * 0.8, y, w - i * 1.6, d, 5, i % 2 ? shade(col, -0.04) : col, z0 + i * 5, { noShadow: true }); }
    else if (sku.type === 'topper') { iso(ctx, x, y, w, d, 8, col, z0, { noShadow: true }); iso(ctx, x, y, w, d, 3, '#ffffff', z0 + 8, { noShadow: true, top: '#effaf5' }); }
    else { iso(ctx, x + w * 0.1, y + d * 0.05, w * 0.8, d * 0.9, 13, col, z0, { noShadow: true }); iso(ctx, x + w * 0.4, y + d * 0.05, w * 0.2, d * 0.9, 1, '#f7efe9', z0 + 13, { noShadow: true }); }
    if (sku.type !== 'ga') poly3(ctx, [[x, y + d, z0 + 5], [x + w, y + d, z0 + 5], [x + w, y + d, z0 + 2], [x, y + d, z0 + 2]], band);
    var st = G.life.stage(slot.sku), fc = st === 3 ? '#f06a78' : st === 0 ? '#ffd06b' : null;
    if (fc) { var fl = P(gx + gw - 4, gy + 4, z0 + 20); poly(ctx, [[fl[0] - 1, fl[1]], [fl[0] + 1, fl[1]], [fl[0] + 1, fl[1] - 11], [fl[0] - 1, fl[1] - 11]], '#8a7a98'); poly(ctx, [[fl[0] + 1, fl[1] - 11], [fl[0] + 8, fl[1] - 9], [fl[0] + 1, fl[1] - 6]], fc); }
    if (G.wh.lineStock(slot.sku) <= 0) { var c2 = P(gx + gw / 2, gy + gd / 2, z0 + 24); ctx.fillStyle = '#e8505b'; ctx.beginPath(); ctx.arc(c2[0], c2[1], 4, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(c2[0] - 2.2, c2[1] - 0.5, 4.4, 1); }
  }
  // kệ sát tường: u={x,y,w,h,vert}; slots[j]
  SP.shelfUnit = function (ctx, u, slots) {
    var x = u.x * T, y = u.y * T, w = u.w * T, h = u.h * T, H = 28, vert = u.h > u.w;
    iso(ctx, x + 1, y + 1, w - 2, h - 2, H, '#f0c9a0');
    // vách sau (sát tường) cao hơn
    if (!vert) iso(ctx, x + 1, y + 1, w - 2, 5, 14, '#e3b88a', H, { noShadow: true }); else iso(ctx, x + 1, y + 1, 5, h - 2, 14, '#e3b88a', H, { noShadow: true });
    var n = 3;
    for (var j = 0; j < n; j++) {
      var gx, gy, gw, gd;
      if (!vert) { gw = (w - 10) / n; gx = x + 5 + j * gw; gy = y + 8; gd = h - 14; } else { gd = (h - 10) / n; gy = y + 5 + j * gd; gx = x + 8; gw = w - 14; }
      SP.isoDiamond(ctx, gx + 1, gy + 1, gw - 2, gd - 2, H + 0.4, '#e2ad7c');
      stack(ctx, gx + 1, gy + 1, gw - 2, gd - 2, H + 0.4, slots[j]);
    }
  };
  SP.bed = function (ctx, b, slot) {
    var x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T, cw = null;
    if (slot && slot.set && G.skus[slot.set]) cw = G.skus[slot.set].cw;
    iso(ctx, x + 3, y + 3, w - 6, h - 6, 9, '#f4b6c2');                         // khung giường
    iso(ctx, x + 3, y + 3, w - 6, 5, 30, '#e99aae', 0, { noShadow: true });    // đầu giường
    var mcol = '#fffaf4', band = '#b8c4d8';
    if (slot && slot.sku) { var sk = G.skus[slot.sku]; band = sk.grade ? GRADE_COL[sk.grade] : G.brandById[sk.brand].color; }
    iso(ctx, x + 8, y + 9, w - 16, h - 16, 10, mcol, 9, { noShadow: true });
    if (slot && slot.sku) { poly3(ctx, [[x + 8, y + h - 7, 17], [x + w - 8, y + h - 7, 17], [x + w - 8, y + h - 7, 11], [x + 8, y + h - 7, 11]], band); poly3(ctx, [[x + w - 8, y + 9, 17], [x + w - 8, y + h - 7, 17], [x + w - 8, y + h - 7, 11], [x + w - 8, y + 9, 11]], shade(band, -0.15)); }
    if (cw) { // giường đã dọn đúng màu: ga trải + chăn gấp ngang + 2 gối + gối ôm
      iso(ctx, x + 9, y + 10, w - 18, h - 18, 2, cw.hex, 19, { noShadow: true });
      iso(ctx, x + 10, y + h * 0.42, w - 20, h * 0.5, 5, cw.hex, 21, { noShadow: true }); iso(ctx, x + 10, y + h * 0.42, w - 20, 5, 6, cw.hex2, 21, { noShadow: true });
      if (cw.pat === 'ke') for (var q = 0; q < 4; q++) SP.isoDiamond(ctx, x + 14 + q * (w - 30) / 4, y + h * 0.42 + 5, 4, h * 0.5 - 8, 26.2, cw.hex2);
      else if (cw.pat === 'hoa' || cw.pat === 'hoatiet') for (var q2 = 0; q2 < 6; q2++) SP.isoDiamond(ctx, x + 16 + (q2 % 3) * (w - 36) / 3, y + h * 0.5 + Math.floor(q2 / 3) * 14, 5, 5, 26.2, cw.hex2);
      iso(ctx, x + 12, y + 10, (w - 28) / 2, 12, 6, shade(cw.hex, 0.45), 21, { noShadow: true, facet: true }); iso(ctx, x + 16 + (w - 28) / 2, y + 10, (w - 28) / 2, 12, 6, shade(cw.hex, 0.4), 21, { noShadow: true, facet: true });
      iso(ctx, x + w * 0.4, y + 20, w * 0.2, 6, 5, cw.hex2, 26, { noShadow: true, facet: true });
    } else {
      iso(ctx, x + 12, y + 10, (w - 28) / 2, 12, 6, '#ffffff', 19, { noShadow: true, facet: true }); iso(ctx, x + 16 + (w - 28) / 2, y + 10, (w - 28) / 2, 12, 6, '#ffeef2', 19, { noShadow: true, facet: true });
      var c = P(x + w / 2, y + h * 0.58, 21); ctx.fillStyle = 'rgba(159,208,240,.9)'; ctx.fillRect(c[0] - 3.2, c[1] - 0.6, 6.4, 1.3); ctx.fillRect(c[0] - 0.6, c[1] - 1.8, 1.3, 3.2);
    }
    if (slot && slot.sku && G.life.stage(slot.sku) === 3) { var fl = P(x + w - 6, y + h - 6, 19); poly(ctx, [[fl[0] - 1, fl[1]], [fl[0] + 1, fl[1]], [fl[0] + 1, fl[1] - 13], [fl[0] - 1, fl[1] - 13]], '#8a7a98'); poly(ctx, [[fl[0] + 1, fl[1] - 13], [fl[0] + 9, fl[1] - 10], [fl[0] + 1, fl[1] - 7]], '#f06a78'); }
  };
  SP.nightstand = function (ctx, x, y, lit) { // x,y px góc ô
    iso(ctx, x + 6, y + 6, T - 12, T - 12, 14, '#f7d2b8'); poly3(ctx, [[x + 8, y + T - 6, 9], [x + T - 8, y + T - 6, 9], [x + T - 8, y + T - 6, 6], [x + 8, y + T - 6, 6]], '#e9b79f');
    iso(ctx, x + 17, y + 17, 6, 6, 3, '#f7efe9', 14, { noShadow: true }); iso(ctx, x + 18, y + 18, 4, 4, 11, '#fff3c4', 17, { noShadow: true });
  };
  SP.counter = function (ctx, c) {
    var x = c.x * T, y = c.y * T, w = c.w * T, h = c.h * T;
    iso(ctx, x, y + 3, w, h - 3, 22, '#9fd0f0'); iso(ctx, x - 2, y + 1, w + 4, h + 1, 4, '#f7efe9', 22, { noShadow: true });
    // máy tính tiền
    iso(ctx, x + w - 34, y + 8, 22, 14, 6, '#8d86a8', 26, { noShadow: true }); iso(ctx, x + w - 30, y + 9, 14, 3, 12, '#6f6a8d', 32, { noShadow: true }); poly3(ctx, [[x + w - 30, y + 12, 44], [x + w - 16, y + 12, 44], [x + w - 16, y + 12, 34], [x + w - 30, y + 12, 34]], '#bfeedd');
    // chuông nhỏ
    var b = P(x + 16, y + 20, 26); poly(ctx, [[b[0] - 5, b[1]], [b[0] + 5, b[1]], [b[0] + 3, b[1] - 6], [b[0] - 3, b[1] - 6]], '#ffd06b'); poly(ctx, [[b[0], b[1]], [b[0] + 5, b[1]], [b[0] + 3, b[1] - 6], [b[0], b[1] - 6]], '#e8b24a'); ctx.fillStyle = '#e8b24a'; ctx.fillRect(b[0] - 1, b[1] - 8, 2, 2);
    SP.plant(ctx, x + w - 14, y + 4, 0.75, 26);
  };
  SP.plant = function (ctx, gx, gy, s, z0) { // chậu cây: gx,gy = góc ô (px)
    s = s || 1; z0 = z0 || 0; var cx = gx + T / 2, cy = gy + T / 2, b = P(cx, cy, z0), x = b[0], y = b[1];
    if (!z0) { ctx.fillStyle = 'rgba(80,60,110,.16)'; ctx.beginPath(); ctx.ellipse(x - 3, y + 3, 14 * s, 5 * s, 0, 0, 6.3); ctx.fill(); }
    poly(ctx, [[x - 8 * s, y - 12 * s], [x + 8 * s, y - 12 * s], [x + 6 * s, y], [x - 6 * s, y]], '#f4b6c2'); poly(ctx, [[x, y - 12 * s], [x + 8 * s, y - 12 * s], [x + 6 * s, y], [x, y]], '#dc94aa'); poly(ctx, [[x - 8 * s, y - 12 * s], [x + 8 * s, y - 12 * s], [x + 6 * s, y - 14 * s], [x - 6 * s, y - 14 * s]], '#6f4e3a');
    var by = y - 13 * s;
    [[-12, -20, '#7fc66d'], [-5, -30, '#9bd681'], [1, -34, '#6fb35e'], [8, -26, '#8fcf7a'], [13, -17, '#6fb35e']].forEach(function (l, i) { var tx = x + l[0] * s, ty = by + l[1] * s; poly(ctx, [[x - 2 * s, by], [x + 2 * s, by], [tx, ty]], l[2]); poly(ctx, [[x, by], [x + 2 * s, by], [tx, ty]], shade(l[2], -0.15)); });
  };
  // cửa ra vào ở hàng cuối (khung + mái hiên sọc + biển MỞ CỬA)
  SP.door = function (ctx, door, open) {
    var x = door.x * T, y = door.y * T;
    iso(ctx, x + 4, y + 6, T - 8, T - 10, 0.6, '#f4b6c2', 0, { noShadow: true });       // thảm
    iso(ctx, x - 3, y + T - 7, 8, 8, 60, '#f7efe9'); iso(ctx, x + T - 5, y + T - 7, 8, 8, 60, '#f7efe9');
    iso(ctx, x - 3, y + T - 7, T + 8, 8, 8, '#f0a24a', 60, { noShadow: true });
    var n = 7, i;
    for (i = 0; i < n; i++) { var a = x - 5 + i * (T + 10) / n, b = x - 5 + (i + 1) * (T + 10) / n; poly3(ctx, [[a, y + T - 4, 72], [b, y + T - 4, 72], [b, y + T + 20, 54], [a, y + T + 20, 54]], i % 2 ? '#f7efe9' : '#f4b6c2'); }
    poly3(ctx, [[x - 5, y + T + 20, 54], [x + T + 5, y + T + 20, 54], [x + T + 5, y + T + 20, 49], [x - 5, y + T + 20, 49]], '#e99aae');
    var f = P(x + T / 2, y + T + 20, 38); poly(ctx, [[f[0] - 19, f[1]], [f[0] + 19, f[1]], [f[0] + 16, f[1] + 12], [f[0] - 16, f[1] + 12]], open ? '#8fcf7a' : '#f08a8a'); ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(open ? 'MỞ CỬA' : 'ĐÓNG', f[0], f[1] + 9.4);
  };
  SP.truck = function (ctx, gx, gy) {
    iso(ctx, gx, gy, 2.2 * T, 1.0 * T, 30, '#f7efe9', 6); iso(ctx, gx + 2.2 * T, gy + 0.05 * T, 0.8 * T, 0.9 * T, 20, '#9fd0f0', 6);
    poly3(ctx, [[gx, gy + T, 22], [gx + 2.2 * T, gy + T, 22], [gx + 2.2 * T, gy + T, 16], [gx, gy + T, 16]], '#f4b6c2');
    [0.4, 2.3].forEach(function (o) { var w = P(gx + o * T, gy + T, 6); ctx.fillStyle = '#6f6a8d'; ctx.beginPath(); ctx.ellipse(w[0], w[1], 6, 6, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#d4d0e4'; ctx.beginPath(); ctx.arc(w[0], w[1], 2.2, 0, 6.3); ctx.fill(); });
    var t = P(gx + 1.1 * T, gy + T, 31); ctx.save(); ctx.transform(HX / T, HY / T, 0, 1, t[0], t[1]); ctx.fillStyle = '#e99aae'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GIAO HÀNG', 0, 0); ctx.restore();
  };
  // ---- ảnh sản phẩm (thumbnail) kiểu iso pastel nhỏ ----
  SP.skuThumb = function (skuId, size) {
    size = size || 48; var r = Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1))), t = G.skus[skuId], br = G.brandById[t.brand], gk = t.grade || 0, key = skuId.split('|')[0] + (t.type) + br.color + gk + size + '@' + r; SP._st = SP._st || {};
    if (SP._st[key]) return SP._st[key];
    var cv = document.createElement('canvas'); cv.width = size * r; cv.height = size * r; var c = cv.getContext('2d'), k = size / 48 * r;
    c.scale(k, k); poly(c, [[0, 0], [48, 0], [0, 48]], '#fdf4ec'); poly(c, [[48, 0], [48, 48], [0, 48]], '#f8e8de');
    c.fillStyle = 'rgba(80,60,110,.12)'; c.beginPath(); c.ellipse(24, 38, 20, 7, 0, 0, 6.3); c.fill();
    c.save(); c.translate(24, 30); var s = 0.52; c.scale(s, s);
    var col = TYPE_COL[t.type], bc = gk ? GRADE_COL[gk] : br.color;
    var ib = function (gx, gy, gw, gd, gh, cc, z0, o) { o = o || {}; o.noShadow = true; iso(c, gx, gy, gw, gd, gh, cc, z0, o); };
    // gốc: (0,0,0) = tâm đáy; dùng toạ độ đất âm/dương quanh 0
    if (t.type === 'dem') { ib(-36, -26, 72, 52, 18, '#fffaf4', 0); poly3(c, [[-36, 26, 12], [36, 26, 12], [36, 26, 8], [-36, 26, 8]], bc); ib(-30, -22, 24, 14, 6, '#ffffff', 18, { facet: true }); ib(4, -22, 24, 14, 6, '#ffeef2', 18, { facet: true }); }
    else if (t.type === 'chan') { for (var i = 0; i < 3; i++) ib(-34 + i * 2, -22, 68 - i * 4, 44, 9, i % 2 ? shade(col, -0.04) : col, i * 9); poly3(c, [[-34, 22, 24], [34, 22, 24], [34, 22, 20], [-34, 22, 20]], bc); }
    else if (t.type === 'ga') {
      var cw = t.cw || { hex: '#fde0e8', hex2: '#f6b7c8', pat: 'tron' };
      ib(-34, -22, 68, 44, 7, cw.hex, 0); ib(-32, -20, 64, 40, 7, shade(cw.hex, -0.03), 7); ib(-30, -18, 60, 36, 7, cw.hex, 14);
      poly3(c, [[-34, 22, 7], [34, 22, 7], [34, 22, 3], [-34, 22, 3]], cw.hex2); poly3(c, [[-32, 20, 14], [32, 20, 14], [32, 20, 10], [-32, 20, 10]], cw.hex2);
      if (cw.pat === 'ke') for (var q = 0; q < 4; q++) poly3(c, [[-30 + q * 15, -18, 21.2], [-26 + q * 15, -18, 21.2], [-26 + q * 15, 18, 21.2], [-30 + q * 15, 18, 21.2]], cw.hex2);
      else if (cw.pat === 'hoa' || cw.pat === 'hoatiet') for (var q2 = 0; q2 < 6; q2++) poly3(c, [[-22 + (q2 % 3) * 20, -12 + Math.floor(q2 / 3) * 22, 21.2], [-16 + (q2 % 3) * 20, -12 + Math.floor(q2 / 3) * 22, 21.2], [-16 + (q2 % 3) * 20, -6 + Math.floor(q2 / 3) * 22, 21.2], [-22 + (q2 % 3) * 20, -6 + Math.floor(q2 / 3) * 22, 21.2]], cw.hex2);
      ib(-24, -14, 22, 14, 5, '#ffffff', 21, { facet: true, top: shade(cw.hex, 0.35) }); ib(2, -14, 22, 14, 5, '#ffffff', 21, { facet: true, top: shade(cw.hex, 0.3) });
    }
    else if (t.type === 'goi') { ib(-34, -20, 40, 30, 12, col, 0, { facet: true }); ib(-6, -4, 40, 30, 12, shade(col, -0.05), 0, { facet: true }); poly3(c, [[-34, 10, 9], [6, 10, 9], [6, 10, 5], [-34, 10, 5]], bc); }
    else if (t.type === 'topper') { ib(-38, -26, 76, 52, 9, col, 0); ib(-38, -26, 76, 52, 3, '#fff', 9, { top: '#effaf5' }); poly3(c, [[-38, 26, 5], [38, 26, 5], [38, 26, 2], [-38, 26, 2]], bc); }
    else { ib(-22, -18, 44, 36, 24, col, 0); poly3(c, [[-22, 18, 15], [22, 18, 15], [22, 18, 9], [-22, 18, 9]], bc); ib(-3, -18, 6, 36, 1, '#f7efe9', 24); }
    c.restore();
    if (t.cw) { c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(2, 39, 44, 8); c.fillStyle = '#5a3a2e'; c.font = 'bold 6.5px sans-serif'; c.textAlign = 'center'; c.fillText(t.cw.code, 24, 45.4); c.beginPath(); c.arc(8, 8, 5.5, 0, 6.3); c.fillStyle = t.cw.hex; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.stroke(); c.strokeStyle = t.cw.hex2; c.lineWidth = 1; c.stroke(); }
    if (gk) { c.beginPath(); c.arc(39, 9, 7.5, 0, 6.2832); c.fillStyle = GRADE_COL[gk]; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.stroke(); c.fillStyle = '#3a2f00'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText(String(gk), 39, 12.6); }
    return (SP._st[key] = cv.toDataURL());
  };

  // ---- vỏ phòng / tấm nền diorama ----
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) ^ (a * b); h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; }
  SP.hash = hash;
  SP.plate = function (c, gx0, gy0, gx1, gy1, TH, top, left, right) {
    poly3(c, [[gx0, gy1, 0], [gx1, gy1, 0], [gx1, gy1, -TH], [gx0, gy1, -TH]], left); poly3(c, [[gx1, gy0, 0], [gx1, gy1, 0], [gx1, gy1, -TH], [gx1, gy0, -TH]], right);
    poly3(c, [[gx0, gy0, 0], [gx1, gy0, 0], [gx1, gy1, 0], [gx0, gy1, 0]], top);
  };
  // tường lệch pha: mặt tường sau (y = T) và tường trái (x = 0); trả về hàm gắn vật lên tường
  SP.wallBack = function (gx, u, v) { return P(gx + u, T, v); };
  SP.wallLeft = function (gy, u, v) { return P(0, gy + u, v); };
  // tường sau: slab hàng 0, cao WH
  SP.backWall = function (c, C, WH, col) {
    var w = C * T; iso(c, 0, 0, w, T, WH, col, 0, { noShadow: true, top: shade(col, 0.3), left: shade(col, -0.02), right: shade(col, -0.2) });
    poly3(c, [[0, T, 9], [w, T, 9], [w, T, 0], [0, T, 0]], '#f4b6c2');            // chân tường hồng
    poly3(c, [[0, T, WH], [w, T, WH], [w, T, WH - 5], [0, T, WH - 5]], '#f4b6c2'); // gờ trên
  };
  SP.leftWall = function (c, Rr, WH, col, gaps) { // gaps: [[y0,y1]] khoảng hở (cửa)
    var th = 0.4 * T, segs = [], cur = 0; (gaps || []).forEach(function (g) { segs.push([cur, g[0] * T]); cur = g[1] * T; }); segs.push([cur, Rr * T]);
    segs.forEach(function (sg) { if (sg[1] - sg[0] < 1) return; iso(c, -th, sg[0], th, sg[1] - sg[0], WH, col, 0, { noShadow: true, top: shade(col, 0.3), left: shade(col, -0.02), right: shade(col, -0.16) }); poly3(c, [[0, sg[0], 9], [0, sg[1], 9], [0, sg[1], 0], [0, sg[0], 0]], '#f4b6c2'); poly3(c, [[0, sg[0], WH], [0, sg[1], WH], [0, sg[1], WH - 5], [0, sg[0], WH - 5]], '#f4b6c2'); });
    (gaps || []).forEach(function (g) { var y0 = g[0] * T, y1 = g[1] * T; iso(c, -th, y0, th, y1 - y0, WH - 40, col, 40, { noShadow: true, top: shade(col, 0.3), left: shade(col, -0.02), right: shade(col, -0.16) }); iso(c, -th - 1, y0 - 3, th + 2, 4, 44, '#f0a24a', 0, { noShadow: true }); iso(c, -th - 1, y1 - 1, th + 2, 4, 44, '#f0a24a', 0, { noShadow: true }); });
  };
  SP.window = function (c, plane, pos, u0, w, v0, h) { // plane 'b' (tường sau y=T, pos = gx) hoặc 'l' (tường trái x=0, pos = gy)
    var pt = plane === 'b' ? function (u, v) { return SP.wallBack(pos, u, v); } : function (u, v) { return SP.wallLeft(pos, u, v); };
    function q(a, b, cc, d, fill) { poly(c, [pt(a, b), pt(cc, b), pt(cc, d), pt(a, d)], fill); }
    q(u0, v0, u0 + w, v0 + h, '#fffaf4'); q(u0 + 3, v0 + 3, u0 + w - 3, v0 + h - 3, '#bfe0f4'); q(u0 + 3, v0 + h * 0.5 + 6, u0 + w - 3, v0 + h - 3, '#d6edf9');
    poly(c, [pt(u0 + w / 2 - 1.2, v0 + 3), pt(u0 + w / 2 + 1.2, v0 + 3), pt(u0 + w / 2 + 1.2, v0 + h - 3), pt(u0 + w / 2 - 1.2, v0 + h - 3)], '#fffaf4'); poly(c, [pt(u0 + 3, v0 + h / 2 - 1.2), pt(u0 + w - 3, v0 + h / 2 - 1.2), pt(u0 + w - 3, v0 + h / 2 + 1.2), pt(u0 + 3, v0 + h / 2 + 1.2)], '#fffaf4');
    q(u0 - 2, v0 - 3, u0 + w + 2, v0, '#f4b6c2');
  };
  SP.awning = function (c, gx, u0, w, v) { // mái hiên sọc nhô ra từ tường sau
    var n = Math.max(4, Math.round(w / 7)), i;
    for (i = 0; i < n; i++) { var a = gx + u0 + i * w / n, b = gx + u0 + (i + 1) * w / n; poly3(c, [[a, T, v + 8], [b, T, v + 8], [b, T + 13, v], [a, T + 13, v]], i % 2 ? '#f7efe9' : '#f4b6c2'); }
    poly3(c, [[gx + u0, T + 13, v], [gx + u0 + w, T + 13, v], [gx + u0 + w, T + 13, v - 4], [gx + u0, T + 13, v - 4]], '#e99aae');
  };
  // sàn gỗ: các ô kim cương 3 tông gỗ + đường ghép
  SP.woodFloor = function (c, x0, y0, x1, y1, tones) {
    tones = tones || ['#f3d6b0', '#ecc89c', '#f7e0c0'];
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      var h = hash(x, y), col = tones[Math.floor(h * 3) % 3], gx = x * T, gy = y * T;
      SP.isoDiamond(c, gx, gy, T, T, 0, col);
      var seam = 'rgba(190,140,100,.22)'; for (var k = 1; k < 3; k++) { var a = P(gx, gy + k * T / 3, 0), b = P(gx + T, gy + k * T / 3, 0); c.strokeStyle = seam; c.lineWidth = 0.7; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    }
  };
})();
