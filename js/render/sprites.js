/* Sprite LOW POLY vẽ bằng code: mọi vật thể là các đa giác/tam giác phẳng 2-3 tông (sáng/tối), cạnh sắc nét, bóng đổ mềm. Không dùng asset ngoài. */
(function () {
  'use strict';
  var G = window.G;
  var T = 40;
  // ---- bảng màu rực rỡ ----
  var PAL = { sky: '#4FC3F7', coral: '#FF7A6B', mint: '#5EE0B4', sun: '#FFD93D', lav: '#B39DDB', navy: '#2A3560', wood: '#FFC27A', cream: '#FFF4D6' };
  function rgb(h) {
    if (h.charAt(0) === 'r') { var m = h.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0] || 0, +m[1] || 0, +m[2] || 0]; } // chuỗi rgb(r,g,b) do shade() trả về
    if (h.length === 4) h = '#' + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2) + h.charAt(3) + h.charAt(3);
    var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var shadeCache = {};
  function shade(h, a) { // a: -1 (đen) .. +1 (trắng)
    var key = h + a; if (shadeCache[key]) return shadeCache[key];
    var c = rgb(h), f = function (v) { return Math.max(0, Math.min(255, Math.round(a >= 0 ? v + (255 - v) * a : v * (1 + a)))); };
    return (shadeCache[key] = 'rgb(' + f(c[0]) + ',' + f(c[1]) + ',' + f(c[2]) + ')');
  }
  function poly(ctx, pts, fill, edge) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 0.8; ctx.stroke(); }
  }
  var EDGE = 'rgba(30,40,90,.16)';
  function softShadow(ctx, drawFn) { ctx.save(); ctx.shadowColor = 'rgba(40,60,120,.30)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 4; drawFn(); ctx.restore(); }
  // hộp nhìn xiên: mặt trên 2 tam giác (sáng / sáng hơn), mặt trước tối, cạnh bên tối nhất
  function box(ctx, x, y, w, h, d, col, noShadow) {
    var th = h - d;
    if (!noShadow) softShadow(ctx, function () { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); });
    poly(ctx, [[x, y], [x + w, y], [x, y + th]], shade(col, 0.22), EDGE);
    poly(ctx, [[x + w, y], [x + w, y + th], [x, y + th]], shade(col, 0.06), EDGE);
    poly(ctx, [[x, y + th], [x + w, y + th], [x + w, y + h], [x, y + h]], shade(col, -0.2), EDGE);
    poly(ctx, [[x + w * 0.5, y + th], [x + w, y + th], [x + w, y + h], [x + w * 0.7, y + h]], shade(col, -0.3));
  }
  function hexagon(ctx, cx, cy, r, col, sy) { // lục giác chia 3 mảnh
    sy = sy || 1;
    var p = []; for (var i = 0; i < 6; i++) { var a = Math.PI / 3 * i - Math.PI / 6; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy]); }
    poly(ctx, [[cx, cy], p[4], p[5], p[0]], shade(col, 0.2), EDGE);
    poly(ctx, [[cx, cy], p[0], p[1], p[2]], col, EDGE);
    poly(ctx, [[cx, cy], p[2], p[3], p[4]], shade(col, -0.2), EDGE);
  }
  var TYPE_COL = { chan: '#7FD8FF', ga: '#FF9EB8', goi: '#FFF29E', dem: '#F4F0FF', topper: '#8FF0CF', phukien: '#C9B6FF' };
  var GRADE_COL = { 1: '#F2B705', 2: '#B8C0CC' };
  var SP = G.sprites = {
    T: T, PAL: PAL, shade: shade, poly: poly, box: box, hexagon: hexagon, softShadow: softShadow,
    rr: function (ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.lineTo(x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.lineTo(x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.lineTo(x, y + h - r); ctx.lineTo(x, y + r); ctx.closePath(); }, // đa giác cắt góc
    // một ô kệ (w x h px)
    shelfSlot: function (ctx, x, y, w, h, slot) {
      poly(ctx, [[x, y], [x + w, y], [x, y + h]], '#7C6BC4'); poly(ctx, [[x + w, y], [x + w, y + h], [x, y + h]], '#6757AE');
      if (!slot || !slot.sku) { poly(ctx, [[x + w * 0.3, y + h * 0.5], [x + w * 0.5, y + h * 0.3], [x + w * 0.7, y + h * 0.5], [x + w * 0.5, y + h * 0.7]], 'rgba(255,255,255,.28)'); return; }
      var sku = G.skus[slot.sku], br = G.brandById[sku.brand], col = TYPE_COL[sku.type]; var bandc = sku.grade ? GRADE_COL[sku.grade] : br.color;
      var n = Math.min(4, Math.ceil(slot.qty / Math.max(1, sku.cap / 4)));
      if (slot.qty <= 0) n = 0;
      for (var i = 0; i < n; i++) {
        var by = y + h - 7 - i * 5.5;
        if (sku.type === 'goi') hexagon(ctx, x + w / 2, by, w / 2 - 2.5, col, 0.55);
        else box(ctx, x + 2, by - 3, w - 4, 6, 2.5, col, true);
        poly(ctx, [[x + 2, by - 3], [x + 8, by - 3], [x + 2, by + 1.5]], bandc);
      }
      if (sku.grade) { ctx.beginPath(); ctx.arc(x + w - 5, y + 5, 4, 0, 6.2832); ctx.fillStyle = GRADE_COL[sku.grade]; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#3a2f00'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(sku.grade), x + w - 5, y + 7.2); }
      if (slot.qty <= 0) { poly(ctx, [[x + 2, y + 5], [x + 5, y + 2], [x + w - 2, y + h - 5], [x + w - 5, y + h - 2]], 'rgba(255,90,90,.9)'); }
      var st = G.life.stage(slot.sku);
      if (st === 3) { poly(ctx, [[x, y], [x + 11, y], [x + 8, y + 7], [x, y + 7]], '#FF4F5E'); ctx.fillStyle = '#fff'; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('cũ', x + 1.5, y + 5.5); }
      else if (st === 0) { poly(ctx, [[x, y], [x + 12, y], [x + 9, y + 7], [x, y + 7]], '#FFD93D'); ctx.fillStyle = '#333'; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('mới', x + 1, y + 5.5); }
    },
    shelfUnit: function (ctx, u, slots) {
      var x = u.x * T, y = u.y * T, w = u.w * T, h = u.h * T;
      box(ctx, x + 1, y + 2, w - 2, h - 3, 7, '#FFC27A');
      // mặt hộc kệ
      poly(ctx, [[x + 3, y + 4], [x + w - 3, y + 4], [x + w - 5, y + 8], [x + 5, y + 8]], '#E79A4E');
      var cw = (w - 10) / 3;
      for (var j = 0; j < 3; j++) SP.shelfSlot(ctx, x + 5 + j * cw + 1, y + 9, cw - 2, h - 18, slots[j]);
    },
    bed: function (ctx, b, slot) {
      var x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T;
      box(ctx, x + 2, y + 2, w - 4, h - 4, 11, '#FF8A7A');
      var mx = x + 7, my = y + 7, mw = w - 14, mh = h - 26;
      var col = '#FFFBF0', band = '#B8C4D8';
      if (slot && slot.sku) { band = G.brandById[G.skus[slot.sku].brand].color; col = slot.qty > 0 ? '#FFFBF0' : '#C9CCD6'; }
      poly(ctx, [[mx, my], [mx + mw, my], [mx, my + mh]], col, EDGE); poly(ctx, [[mx + mw, my], [mx + mw, my + mh], [mx, my + mh]], shade(col, -0.07), EDGE);
      if (slot && slot.sku) {
        poly(ctx, [[mx, my + mh * 0.55], [mx + mw, my + mh * 0.45], [mx + mw, my + mh * 0.7], [mx, my + mh * 0.8]], band);
        hexagon(ctx, mx + 15, my + 9, 8.5, '#FFFFFF', 0.7); hexagon(ctx, mx + mw - 15, my + 9, 8.5, '#EDE7FF', 0.7);
        var st = G.life.stage(slot.sku);
        if (st === 3) { poly(ctx, [[x + w - 34, y + h - 24], [x + w - 6, y + h - 24], [x + w - 10, y + h - 12], [x + w - 34, y + h - 12]], '#FF4F5E'); ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('mẫu cũ', x + w - 20, y + h - 15); }
        if (slot.qty <= 0) { ctx.fillStyle = 'rgba(42,53,96,.55)'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HẾT', x + w / 2, my + mh / 2 + 4); }
      } else { ctx.fillStyle = 'rgba(42,53,96,.35)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('trống', x + w / 2, my + mh / 2 + 3); }
    },
    counter: function (ctx, c) {
      var x = c.x * T, y = c.y * T, w = c.w * T, h = c.h * T;
      box(ctx, x, y + 2, w, h - 2, 10, '#5BC0F8');
      poly(ctx, [[x + 3, y + 5], [x + w - 3, y + 5], [x + w - 8, y + 11], [x + 8, y + 11]], '#FFE066');
      box(ctx, x + w - 36, y - 8, 24, 16, 5, '#3D4A8A'); poly(ctx, [[x + w - 33, y - 5], [x + w - 17, y - 5], [x + w - 33, y + 1]], '#7DF0D0'); poly(ctx, [[x + w - 17, y - 5], [x + w - 17, y + 1], [x + w - 33, y + 1]], '#4FD1B0');
      poly(ctx, [[x + 8, y - 2], [x + 8, y - 16], [x + 24, y - 9]], '#FF7A6B'); ctx.fillStyle = '#6a7399'; ctx.fillRect(x + 7, y - 16, 1.6, 17);
    },
    door: function (ctx, door, open) {
      var x = door.x * T, y = door.y * T;
      poly(ctx, [[x, y - 8], [x + T, y - 8], [x + T, y + T], [x, y + T]], '#B39DDB', EDGE);
      poly(ctx, [[x + 4, y - 5], [x + T - 4, y - 5], [x + 4, y + 14]], 'rgba(190,235,255,.92)'); poly(ctx, [[x + T - 4, y - 5], [x + T - 4, y + 14], [x + 4, y + 14]], 'rgba(130,200,240,.92)');
      poly(ctx, [[x + 10, y - 5], [x + 16, y - 5], [x + 8, y + 5], [x + 4, y + 5]], 'rgba(255,255,255,.6)');
      poly(ctx, [[x + 6, y + 18], [x + T - 6, y + 18], [x + T - 10, y + T - 3], [x + 10, y + T - 3]], '#FF7A6B'); // thảm
      // cờ hiệu
      poly(ctx, [[x + 2, y - 22], [x + T - 2, y - 22], [x + T - 8, y - 11], [x + 8, y - 11]], open ? '#38C98B' : '#FF5A6B', EDGE);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(open ? 'MỞ CỬA' : 'ĐÓNG', x + T / 2, y - 14);
    },
    plant: function (ctx, x, y) {
      softShadow(ctx, function () { ctx.fillStyle = '#FF9A6B'; ctx.fillRect(x + 11, y + 26, 18, 8); });
      poly(ctx, [[x + 11, y + 24], [x + 29, y + 24], [x + 26, y + 36], [x + 14, y + 36]], '#FF9A6B', EDGE); poly(ctx, [[x + 20, y + 24], [x + 29, y + 24], [x + 26, y + 36], [x + 20, y + 36]], '#E7774A');
      poly(ctx, [[x + 20, y + 24], [x + 8, y + 10], [x + 17, y + 6]], '#3DBE6E'); poly(ctx, [[x + 20, y + 24], [x + 17, y + 6], [x + 25, y + 3]], '#62DB8E'); poly(ctx, [[x + 20, y + 24], [x + 25, y + 3], [x + 32, y + 9]], '#2FA85C'); poly(ctx, [[x + 20, y + 24], [x + 32, y + 9], [x + 33, y + 18]], '#52CF80');
    },
    truck: function (ctx, x, y) {
      softShadow(ctx, function () { ctx.fillStyle = '#fff'; ctx.fillRect(x, y + 8, 128, 24); });
      poly(ctx, [[x, y + 4], [x + 90, y + 4], [x + 90, y + 32], [x, y + 32]], '#FFFFFF', EDGE); poly(ctx, [[x, y + 4], [x + 90, y + 4], [x + 60, y + 32], [x, y + 32]], '#F1F6FF');
      poly(ctx, [[x, y + 4], [x + 90, y + 4], [x + 90, y + 11], [x, y + 11]], '#FF7A6B');
      poly(ctx, [[x + 92, y + 12], [x + 114, y + 12], [x + 126, y + 22], [x + 126, y + 32], [x + 92, y + 32]], '#4FC3F7', EDGE); poly(ctx, [[x + 100, y + 14], [x + 113, y + 14], [x + 121, y + 22], [x + 100, y + 22]], '#D6F1FF'); poly(ctx, [[x + 92, y + 22], [x + 126, y + 22], [x + 126, y + 32], [x + 92, y + 32]], '#2FA2DD');
      [x + 16, x + 70, x + 108].forEach(function (cx) { hexagon(ctx, cx, y + 33, 6.5, '#3b4268'); poly(ctx, [[cx - 2, y + 31], [cx + 2, y + 31], [cx + 2, y + 35], [cx - 2, y + 35]], '#C9D1F0'); });
      ctx.fillStyle = '#2A3560'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GIAO HÀNG', x + 45, y + 25);
    },
    // người CHIBI low-poly: đầu to ~58% chiều cao, thân nhỏ, tay chân ngắn, mắt to, má hồng.
    // p = {x,y(chân), shirt, band, skin, hair, hairStyle 0..4, role, moving, phase, face, hat, crown, apron, bag, mood, glasses, tie, vest, suit, helmet}
    person: function (ctx, p) {
      var x = p.x, y = p.y, sw = p.moving ? Math.sin(p.phase * 3) * 2.8 : 0, bob = p.moving ? Math.abs(Math.sin(p.phase * 3)) * 2.2 : Math.sin((p.phase || 0) * 0.5 + (p.x || 0)) * 0.4, f = p.face || 1;
      var role = p.role || '', yy = y - bob + (p.sit ? 5 : 0), sk = p.skin || '#f6c9a0', hr = p.hair || '#3b2f4a', sh = p.shirt || '#FFFFFF', hs = p.hairStyle || 0;
      // bóng đổ mềm
      ctx.fillStyle = 'rgba(40,60,120,.14)'; ctx.beginPath(); ctx.ellipse(x, y, 13, 5.5, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(40,60,120,.22)'; ctx.beginPath(); ctx.ellipse(x, y, 9, 3.8, 0, 0, 6.3); ctx.fill();
      var pants = role === 'b2b' ? '#2E3552' : (role === 'owner' ? '#3D5AA8' : '#46538F');
      // chân ngắn
      if (!p.sit) { poly(ctx, [[x - 6, yy - 8], [x - 1.2, yy - 8], [x - 1.4 + sw * 0.35, yy], [x - 6.4 + sw * 0.35, yy]], pants, EDGE); poly(ctx, [[x + 1.2, yy - 8], [x + 6, yy - 8], [x + 6.4 - sw * 0.35, yy], [x + 1.4 - sw * 0.35, yy]], shade(pants, -0.18), EDGE); }
      else { poly(ctx, [[x - 6, yy - 8], [x + 6, yy - 8], [x + 8, yy - 3], [x + 7, yy], [x - 7, yy], [x - 8, yy - 3]], pants, EDGE); }
      // tay ngắn (sau thân)
      var armC = role === 'b2b' ? '#2E3552' : sh;
      poly(ctx, [[x - 7, yy - 17], [x - 11, yy - 9 + sw * 0.4], [x - 8, yy - 8 + sw * 0.4], [x - 5.5, yy - 14]], shade(armC, 0.05), EDGE); poly(ctx, [[x + 7, yy - 17], [x + 11, yy - 9 - sw * 0.4], [x + 8, yy - 8 - sw * 0.4], [x + 5.5, yy - 14]], shade(armC, -0.22), EDGE);
      poly(ctx, [[x - 11, yy - 9 + sw * 0.4], [x - 8, yy - 8 + sw * 0.4], [x - 9.5, yy - 6 + sw * 0.4]], sk); poly(ctx, [[x + 11, yy - 9 - sw * 0.4], [x + 8, yy - 8 - sw * 0.4], [x + 9.5, yy - 6 - sw * 0.4]], shade(sk, -0.15));
      // thân nhỏ
      var body = p.suit ? '#2E3552' : sh;
      poly(ctx, [[x - 7, yy - 18], [x, yy - 18], [x, yy - 7], [x - 6, yy - 7]], shade(body, 0.1), EDGE); poly(ctx, [[x, yy - 18], [x + 7, yy - 18], [x + 6, yy - 7], [x, yy - 7]], shade(body, -0.2), EDGE);
      if (p.suit) { poly(ctx, [[x - 2.5, yy - 18], [x + 2.5, yy - 18], [x, yy - 9]], '#FFFFFF'); poly(ctx, [[x - 0.8, yy - 17], [x + 0.8, yy - 17], [x, yy - 11]], '#FF5A6B'); }
      if (p.vest) { poly(ctx, [[x - 7, yy - 18], [x - 2.5, yy - 18], [x - 4, yy - 7], [x - 6, yy - 7]], shade(p.vest, 0.05), EDGE); poly(ctx, [[x + 2.5, yy - 18], [x + 7, yy - 18], [x + 6, yy - 7], [x + 4, yy - 7]], shade(p.vest, -0.2), EDGE); poly(ctx, [[x + 2, yy - 15], [x + 5, yy - 15], [x + 5, yy - 13], [x + 2, yy - 13]], '#FFFFFF'); }
      if (p.tie) { poly(ctx, [[x - 1.6, yy - 18], [x + 1.6, yy - 18], [x + 2.2, yy - 11], [x, yy - 8], [x - 2.2, yy - 11]], p.tie, EDGE); }
      if (p.apron) { poly(ctx, [[x - 5, yy - 16], [x + 5, yy - 16], [x + 6, yy - 7], [x - 6, yy - 7]], '#FFFFFF', EDGE); poly(ctx, [[x, yy - 16], [x + 5, yy - 16], [x + 6, yy - 7], [x, yy - 7]], '#E6EEFF'); poly(ctx, [[x - 3, yy - 13], [x + 3, yy - 13], [x + 3, yy - 9], [x - 3, yy - 9]], '#FFD6DC'); }
      if (p.band) { poly(ctx, [[x - 7, yy - 18], [x + 7, yy - 18], [x + 6.6, yy - 15.5], [x - 6.6, yy - 15.5]], p.band); poly(ctx, [[x, yy - 18], [x + 7, yy - 18], [x + 6.6, yy - 15.5], [x, yy - 15.5]], shade(p.band, -0.2)); }
      // tóc phía sau
      var cy = yy - 29;
      if (hs === 1) { poly(ctx, [[x - 12, cy - 4], [x - 13, cy + 11], [x - 7, cy + 12], [x - 7, cy]], shade(hr, -0.1), EDGE); poly(ctx, [[x + 12, cy - 4], [x + 13, cy + 11], [x + 7, cy + 12], [x + 7, cy]], shade(hr, -0.3), EDGE); }
      if (hs === 4) { poly(ctx, [[x - 12, cy - 4], [x - 12.5, cy + 5], [x - 8, cy + 6], [x - 8, cy]], shade(hr, -0.1), EDGE); poly(ctx, [[x + 12, cy - 4], [x + 12.5, cy + 5], [x + 8, cy + 6], [x + 8, cy]], shade(hr, -0.3), EDGE); }
      // đầu lục giác lớn
      hexagon(ctx, x, cy, 12, sk, 1.0);
      // tóc mái
      var top = [[x - 12, cy - 3], [x - 8.5, cy - 11], [x - 3, cy - 13.5], [x + 3, cy - 13.5], [x + 8.5, cy - 11], [x + 12, cy - 3]];
      if (hs === 3) { // dựng đứng
        poly(ctx, [[x - 12, cy - 3], [x - 11, cy - 15], [x - 6, cy - 9]], shade(hr, 0.1), EDGE); poly(ctx, [[x - 6, cy - 9], [x - 3, cy - 18], [x + 2, cy - 10]], hr, EDGE); poly(ctx, [[x + 2, cy - 10], [x + 7, cy - 17], [x + 8, cy - 9]], shade(hr, -0.15), EDGE); poly(ctx, [[x + 8, cy - 9], [x + 13, cy - 13], [x + 12, cy - 3]], shade(hr, -0.3), EDGE);
        poly(ctx, [[x - 12, cy - 3], [x - 6, cy - 9], [x + 12, cy - 3], [x + 9, cy - 5], [x, cy - 8], [x - 9, cy - 5]], shade(hr, -0.05));
      } else {
        poly(ctx, [top[0], top[1], top[2], [x, cy - 6], [x - 8, cy - 4]], shade(hr, 0.12), EDGE); poly(ctx, [top[2], top[3], top[4], [x + 8, cy - 4], [x, cy - 6]], hr, EDGE); poly(ctx, [top[4], top[5], [x + 12, cy - 1], [x + 8, cy - 4]], shade(hr, -0.25), EDGE);
        poly(ctx, [[x - 12, cy - 3], [x - 8, cy - 4], [x - 9, cy + 2], [x - 12, cy + 2]], shade(hr, -0.05));
        if (hs === 2) { hexagon(ctx, x, cy - 16, 5.2, hr, 1); }
      }
      if (p.helmet) { poly(ctx, [[x - 13, cy - 5], [x - 9, cy - 14], [x, cy - 17], [x + 9, cy - 14], [x + 13, cy - 5]], p.helmet, EDGE); poly(ctx, [[x, cy - 17], [x + 9, cy - 14], [x + 13, cy - 5], [x, cy - 5]], shade(p.helmet, -0.2)); poly(ctx, [[x - 14, cy - 5], [x + 14, cy - 5], [x + 12, cy - 2], [x - 12, cy - 2]], shade(p.helmet, -0.3)); }
      if (p.hat) { // mũ lưỡi trai
        poly(ctx, [[x - 12, cy - 4], [x - 9, cy - 14], [x, cy - 16], [x + 9, cy - 14], [x + 12, cy - 4]], p.hat, EDGE); poly(ctx, [[x, cy - 16], [x + 9, cy - 14], [x + 12, cy - 4], [x, cy - 4]], shade(p.hat, -0.22));
        poly(ctx, [[x - 12, cy - 4], [x + 12, cy - 4], [x + f * 17, cy - 1], [x - f * 3, cy - 1]], shade(p.hat, -0.3), EDGE);
      }
      if (p.crown) { var gy = cy - 13; poly(ctx, [[x - 9, gy + 1], [x - 9, gy - 8], [x - 4.5, gy - 3], [x, gy - 10], [x + 4.5, gy - 3], [x + 9, gy - 8], [x + 9, gy + 1]], '#FFD93D', EDGE); poly(ctx, [[x, gy - 10], [x + 4.5, gy - 3], [x + 9, gy - 8], [x + 9, gy + 1], [x, gy + 1]], '#F2B91E'); hexagon(ctx, x, gy - 3, 1.8, '#FF5A6B'); }
      if (p.headset) { ctx.strokeStyle = '#2A3560'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, cy - 3, 12.5, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); hexagon(ctx, x - 13, cy + 1, 3.6, p.headset); hexagon(ctx, x + 13, cy + 1, 3.6, shade(p.headset, -0.2)); }
      // mặt: mắt to, má hồng, miệng
      var mood = p.mood || 'neutral', ex = f * 1.6;
      [[-4.8, 1], [4.8, 1]].forEach(function (e, k) {
        var cx = x + e[0] + ex, cyE = cy + 1;
        poly(ctx, [[cx - 2.3, cyE - 3.4], [cx + 2.3, cyE - 3.4], [cx + 2.6, cyE + 2.4], [cx, cyE + 3.8], [cx - 2.6, cyE + 2.4]], '#2A3560');
        if (mood === 'happy') { poly(ctx, [[cx - 2.4, cyE + 1], [cx, cyE - 2.6], [cx + 2.4, cyE + 1], [cx, cyE - 0.2]], '#2A3560'); ctx.fillStyle = sk; ctx.fillRect(cx - 3, cyE + 1, 6, 4); }
        else { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cx - 1.6, cyE - 2.6, 1.6, 1.8); ctx.fillRect(cx + 0.6, cyE + 0.4, 1, 1); }
        if (mood === 'angry') poly(ctx, [[cx - 3.4, cyE - 5.4 + (k ? 0 : 2.6)], [cx + 3.4, cyE - 5.4 + (k ? 2.6 : 0)], [cx + 3.4, cyE - 3.8 + (k ? 2.6 : 0)], [cx - 3.4, cyE - 3.8 + (k ? 0 : 2.6)]], '#2A3560');
      });
      var blush = mood === 'angry' ? 'rgba(255,60,70,.75)' : 'rgba(255,125,150,.7)';
      poly(ctx, [[x - 9.4 + ex, cy + 5], [x - 6.2 + ex, cy + 5], [x - 7.8 + ex, cy + 7.2]], blush); poly(ctx, [[x + 9.4 + ex, cy + 5], [x + 6.2 + ex, cy + 5], [x + 7.8 + ex, cy + 7.2]], blush);
      if (mood === 'happy') poly(ctx, [[x - 2.5 + ex, cy + 6], [x + 2.5 + ex, cy + 6], [x + ex, cy + 9.4]], '#C2384F');
      else if (mood === 'angry') poly(ctx, [[x - 2.4 + ex, cy + 9], [x + 2.4 + ex, cy + 9], [x + ex, cy + 6.6]], '#C2384F');
      else poly(ctx, [[x - 1.6 + ex, cy + 7.4], [x + 1.6 + ex, cy + 7.4], [x + ex, cy + 8.8]], '#D4627A');
      if (p.glasses) { ctx.strokeStyle = '#2A3560'; ctx.lineWidth = 1.2; [-4.8, 4.8].forEach(function (o) { ctx.beginPath(); for (var k = 0; k < 6; k++) { var a = Math.PI / 3 * k; var px = x + o + ex + Math.cos(a) * 4.2, py = cy + 1 + Math.sin(a) * 4.2; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke(); ctx.fillStyle = 'rgba(190,230,255,.35)'; ctx.fill(); }); ctx.beginPath(); ctx.moveTo(x - 0.6 + ex, cy + 1); ctx.lineTo(x + 0.6 + ex, cy + 1); ctx.stroke(); }
      if (p.bag) { box(ctx, x + 8 * f - 4.5, yy - 14, 9, 10, 3, '#FFB830', true); ctx.strokeStyle = '#E39A10'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x + 8 * f, yy - 14, 3, Math.PI, 0); ctx.stroke(); }
    },
    // ảnh thumbnail sản phẩm low-poly theo loại + màu hãng (cache dataURL)
    skuThumb: function (skuId, size) {
      size = size || 48; var r = Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1))); var t = G.skus[skuId], br = G.brandById[t.brand], key = t.type + br.color + (t.grade || 0) + size + '@' + r; SP._st = SP._st || {};
      if (SP._st[key]) return SP._st[key];
      var cv = document.createElement('canvas'); cv.width = size * r; cv.height = size * r; var c = cv.getContext('2d'), k = size / 48 * r;
      c.scale(k, k); poly(c, [[0, 0], [48, 0], [0, 48]], '#F4F8FF'); poly(c, [[48, 0], [48, 48], [0, 48]], '#E7EEFB');
      var col = TYPE_COL[t.type], bc = t.grade ? GRADE_COL[t.grade] : br.color;
      if (t.type === 'dem') { box(c, 6, 14, 36, 26, 9, '#F8F6FF', true); poly(c, [[6, 14], [42, 14], [6, 31]], '#FFFFFF'); poly(c, [[6, 26], [42, 24], [42, 31], [6, 33]], bc); hexagon(c, 16, 19, 5, '#FFFFFF', 0.7); }
      else if (t.type === 'chan') { for (var i = 0; i < 3; i++) box(c, 8, 28 - i * 9, 32, 10, 3, i % 2 ? shade(col, -0.05) : col, true); poly(c, [[8, 12], [20, 12], [8, 21]], bc); }
      else if (t.type === 'ga') { for (var j = 0; j < 3; j++) box(c, 9, 29 - j * 8, 30, 9, 3, j % 2 ? shade(col, -0.08) : col, true); poly(c, [[30, 13], [39, 13], [39, 22]], bc); }
      else if (t.type === 'goi') { hexagon(c, 17, 28, 11, col, 0.62); hexagon(c, 30, 20, 11, shade(col, -0.1), 0.62); poly(c, [[6, 28], [14, 24], [14, 32]], bc); }
      else if (t.type === 'topper') { box(c, 5, 22, 38, 14, 6, col, true); poly(c, [[5, 22], [43, 22], [5, 29]], shade(col, 0.2)); poly(c, [[5, 30], [43, 30], [43, 34], [5, 34]], bc); }
      else { box(c, 12, 18, 24, 22, 7, col, true); poly(c, [[24, 18], [36, 18], [36, 40], [24, 40]], shade(col, -0.15)); poly(c, [[12, 26], [36, 26], [36, 30], [12, 30]], bc); }
      if (t.grade) { c.beginPath(); c.arc(39, 9, 7.5, 0, 6.2832); c.fillStyle = GRADE_COL[t.grade]; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.stroke(); c.fillStyle = '#3a2f00'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText(String(t.grade), 39, 12.6); }
      return (SP._st[key] = cv.toDataURL());
    },
    bubble: function (ctx, x, y, txt, col) {
      var c = col || '#2A3560';
      poly(ctx, [[x - 6, y - 16], [x + 6, y - 16], [x + 10, y - 12], [x + 10, y - 5], [x + 6, y - 1], [x + 3, y - 1], [x, y + 3], [x - 3, y - 1], [x - 6, y - 1], [x - 10, y - 5], [x - 10, y - 12]], '#FFFFFF');
      ctx.beginPath(); ctx.moveTo(x - 6, y - 16); ctx.lineTo(x + 6, y - 16); ctx.lineTo(x + 10, y - 12); ctx.lineTo(x + 10, y - 5); ctx.lineTo(x + 6, y - 1); ctx.lineTo(x + 3, y - 1); ctx.lineTo(x, y + 3); ctx.lineTo(x - 3, y - 1); ctx.lineTo(x - 6, y - 1); ctx.lineTo(x - 10, y - 5); ctx.lineTo(x - 10, y - 12); ctx.closePath();
      ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = c; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, x, y - 4.5);
    }
  };
})();
