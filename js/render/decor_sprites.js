/* Đồ trang trí isometric low-poly pastel. SP.decor(ctx, def, gx, gy, t, alpha) - gx,gy là góc (px mặt đất) của ô đầu tiên; ctx đã ở hệ toạ độ trang (gốc = đỉnh ô (0,0)) */
(function () {
  'use strict';
  var G = window.G, SP = G.sprites, T = SP.T, poly = SP.poly, shade = SP.shade, P = SP.P, iso = SP.isoBox, poly3 = SP.poly3;
  function wall(gx, u, v) { return P(gx + u, T, v); } // điểm trên mặt tường sau (mặt phẳng y = T), v = độ cao
  function wallPoly(c, gx, pts, fill) { poly(c, pts.map(function (q) { return wall(gx, q[0], q[1]); }), fill); }
  var DR = {
    plant: function (c, d, x, y) { SP.plant(c, x, y); },
    quat: function (c, d, x, y) {
      SP.plant(c, x, y);
      [[-9, -30], [5, -36], [10, -24], [-3, -25], [-12, -22]].forEach(function (f) { var b = P(x + T / 2, y + T / 2, 13); c.fillStyle = '#f0a24a'; c.beginPath(); c.arc(b[0] + f[0], b[1] + f[1], 3.2, 0, 6.3); c.fill(); c.fillStyle = '#f7c27a'; c.beginPath(); c.arc(b[0] + f[0] - 1, b[1] + f[1] - 1, 1.2, 0, 6.3); c.fill(); });
    },
    rug: function (c, d, x, y) {
      var w = d.w * T, h = d.h * T;
      SP.isoDiamond(c, x + 2, y + 3, w - 4, h - 6, 0.4, '#f4b6c2'); SP.isoDiamond(c, x + 6, y + 7, w - 12, h - 14, 0.5, '#fbe3ea'); SP.isoDiamond(c, x + w / 2 - 12, y + h / 2 - 8, 24, 16, 0.6, '#8fcf7a');
      poly3(c, [[x + 2, y + h - 3, 0.4], [x + w - 2, y + h - 3, 0.4], [x + w - 2, y + h - 3, 0], [x + 2, y + h - 3, 0]], '#d889a0');
    },
    painting: function (c, d, x, y) {
      wallPoly(c, x, [[7, 24], [33, 24], [33, 54], [7, 54]], '#f0c06a'); wallPoly(c, x, [[10, 27], [30, 27], [30, 51], [10, 51]], '#bfe4f6');
      wallPoly(c, x, [[10, 27], [20, 27], [14, 40]], '#8fcf7a'); wallPoly(c, x, [[16, 27], [30, 27], [30, 38], [24, 43]], '#6fb35e'); wallPoly(c, x, [[22, 45], [27, 45], [27, 49], [22, 49]], '#ffe08a');
    },
    lamp: function (c, d, x, y, t) {
      var cx = x + T / 2, cy = y + T / 2; SP.glow(c, cx, cy, 0.2, 54, '255,236,170', 0.34);
      var top = P(cx, cy, 86), mid = P(cx, cy, 62); c.strokeStyle = '#a99fb4'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(top[0], top[1]); c.lineTo(mid[0], mid[1]); c.stroke();
      poly(c, [[mid[0] - 10, mid[1] + 2], [mid[0] + 10, mid[1] + 2], [mid[0] + 5, mid[1] - 8], [mid[0] - 5, mid[1] - 8]], '#ffe08a'); poly(c, [[mid[0], mid[1] + 2], [mid[0] + 10, mid[1] + 2], [mid[0] + 5, mid[1] - 8], [mid[0], mid[1] - 8]], '#f0c05a');
      c.fillStyle = 'rgba(255,248,210,.9)'; c.beginPath(); c.ellipse(mid[0], mid[1] + 3, 5, 2, 0, 0, 6.3); c.fill();
    },
    tank: function (c, d, x, y, t) {
      var w = d.w * T;
      iso(c, x + 3, y + 6, w - 6, T - 12, 12, '#a99fb4'); iso(c, x + 5, y + 8, w - 10, T - 16, 26, '#9fd0f0', 12, { noShadow: true, top: 'rgba(190,230,250,.8)', left: 'rgba(150,205,240,.7)', right: 'rgba(110,170,215,.75)' });
      [0, 1, 2].forEach(function (i) { var fx = x + 12 + ((t * 14 + i * 24) % (w - 30)), b = P(fx, y + T - 10, 24 + Math.sin(t * 2 + i) * 3); poly(c, [[b[0], b[1]], [b[0] + 7, b[1] - 3], [b[0] + 7, b[1] + 3]], i % 2 ? '#f0a24a' : '#f4b6c2'); poly(c, [[b[0] + 7, b[1]], [b[0] + 11, b[1] - 3], [b[0] + 11, b[1] + 3]], '#ffd06b'); });
      var g = P(x + 12, y + T - 10, 14); poly(c, [[g[0] - 1, g[1]], [g[0] + 2, g[1]], [g[0] + 1, g[1] - 12]], '#6fb35e');
    },
    tea: function (c, d, x, y, t) {
      iso(c, x + 5, y + 8, T - 10, T - 16, 20, '#f7d2b8'); iso(c, x + 9, y + 12, 8, 8, 6, '#ffffff', 20, { noShadow: true }); iso(c, x + 21, y + 14, 8, 8, 5, '#f4b6c2', 20, { noShadow: true });
      for (var i = 0; i < 2; i++) { var o = Math.sin(t * 3 + i) * 2, b = P(x + 14 + i * 12, y + 16, 30 + i * 3); poly(c, [[b[0] + o, b[1]], [b[0] + 3 + o, b[1] - 6], [b[0] - 2 + o, b[1] - 6]], 'rgba(255,255,255,.65)'); }
    },
    led: function (c, d, x, y, t) {
      var w = d.w * T;
      wallPoly(c, x, [[4, 28], [w - 4, 28], [w - 4, 52], [4, 52]], '#4a4466');
      for (var i = 0; i < 5; i++) { var px = 8 + ((i * 20 + t * 30) % (w - 22)); wallPoly(c, x, [[px, 33], [px + 8, 33], [px + 4, 47]], ['#f4b6c2', '#ffd06b', '#8fcf7a', '#9fd0f0', '#d4c6f2'][i]); }
    },
    ac: function (c, d, x, y, t) {
      iso(c, x + 5, y + T - 7, T - 10, 7, 14, '#f7efe9', 40, { noShadow: true }); wallPoly(c, x, [[10, 41], [30, 41], [30, 44], [10, 44]], '#cfdbe8');
      poly3(c, [[x + 12, y + T, 38], [x + 16, y + T, 38], [x + 14, y + T + 6, 30]], 'rgba(150,210,250,' + (0.4 + 0.3 * Math.sin(t * 3)) + ')'); poly3(c, [[x + 24, y + T, 38], [x + 28, y + T, 38], [x + 26, y + T + 6, 30]], 'rgba(150,210,250,' + (0.4 + 0.3 * Math.cos(t * 3)) + ')');
    },
    showbed: function (c, d, x, y) { SP.bed(c, { x: x / T, y: y / T, w: 2, h: 2 }, null); },
    projector: function (c, d, x, y, t) {
      var cx = x + T / 2, cy = y + T / 2, top = P(cx, cy, 90), mid = P(cx, cy, 70);
      poly3(c, [[cx - 3, cy, 66], [cx + 3, cy, 66], [cx + 26, cy + 26, 0.3], [cx - 26, cy + 26, 0.3]], 'rgba(190,225,255,' + (0.16 + 0.06 * Math.sin(t * 4)) + ')');
      c.strokeStyle = '#a99fb4'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(top[0], top[1]); c.lineTo(mid[0], mid[1]); c.stroke(); iso(c, cx - 8, cy - 6, 16, 12, 8, '#6f6a8d', 62, { noShadow: true }); poly3(c, [[cx - 3, cy + 6, 66], [cx + 3, cy + 6, 66], [cx + 3, cy + 6, 63], [cx - 3, cy + 6, 63]], '#bfeedd');
    },
    chair: function (c, d, x, y) {
      iso(c, x + 7, y + 10, T - 14, T - 14, 12, '#a99fb4'); iso(c, x + 9, y + 6, T - 18, 8, 34, '#c9bfdc', 0, { noShadow: true }); iso(c, x + 11, y + 14, T - 22, T - 22, 5, '#e6def3', 12, { noShadow: true });
      iso(c, x + 4, y + 14, 5, T - 22, 9, '#8a7ea6', 12, { noShadow: true }); iso(c, x + T - 9, y + 14, 5, T - 22, 9, '#7d7198', 12, { noShadow: true });
    },
    special: function (c, d, x, y) {
      var w = d.w * T; iso(c, x + 3, y + 8, w - 6, T - 14, 12, '#bfeedd'); iso(c, x + 4, y + 9, w - 8, T - 16, 20, '#ffffff', 12, { noShadow: true, top: 'rgba(255,255,255,.7)', left: 'rgba(215,245,235,.6)', right: 'rgba(180,230,215,.65)' });
      [0, 1, 2].forEach(function (i) { iso(c, x + 9 + i * 22, y + 14, 12, 10, 8, ['#f4b6c2', '#ffd06b', '#9fd0f0'][i], 12, { noShadow: true, facet: true }); });
    },
    trophy: function (c, d, x, y) {
      iso(c, x + 9, y + 9, T - 18, T - 18, 14, '#a99fb4'); var b = P(x + T / 2, y + T / 2, 14);
      poly(c, [[b[0] - 7, b[1] - 16], [b[0] + 7, b[1] - 16], [b[0] + 4, b[1]], [b[0] - 4, b[1]]], '#ffd06b'); poly(c, [[b[0], b[1] - 16], [b[0] + 7, b[1] - 16], [b[0] + 4, b[1]], [b[0], b[1]]], '#e8b24a'); poly(c, [[b[0] - 7, b[1] - 14], [b[0] - 12, b[1] - 12], [b[0] - 7, b[1] - 7]], '#ffe08a'); poly(c, [[b[0] + 7, b[1] - 14], [b[0] + 12, b[1] - 12], [b[0] + 7, b[1] - 7]], '#e8b24a');
      c.fillStyle = '#f08a8a'; c.beginPath(); c.arc(b[0], b[1] - 21, 3, 0, 6.3); c.fill();
    }
  };
  var THC = {}, THU = {};
  // ảnh xem trước (canvas): nền pastel + món đồ isometric vừa khung
  SP.decorThumbCanvas = function (def, size) {
    size = size || 64; var r = Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1))), key = def.id + '@' + size + 'x' + r; if (THC[key]) return THC[key];
    var cv = document.createElement('canvas'); cv.width = size * r; cv.height = size * r; var c = cv.getContext('2d'); c.scale(r, r);
    poly(c, [[0, 0], [size, 0], [0, size]], '#fdf4ec'); poly(c, [[size, 0], [size, size], [0, size]], '#f8e8de');
    var hh = def.layer === 'wall' ? 62 : def.layer === 'ceil' ? 92 : def.id === 'tank' ? 40 : 52, w = def.w * T, h = def.h * T;
    var pts = [P(0, 0, 0), P(w, 0, 0), P(0, h, 0), P(w, h, 0), P(0, 0, hh), P(w, 0, hh), P(0, h, hh), P(w, h, hh)];
    var x0 = Math.min.apply(null, pts.map(function (q) { return q[0]; })), x1 = Math.max.apply(null, pts.map(function (q) { return q[0]; })), y0 = Math.min.apply(null, pts.map(function (q) { return q[1]; })), y1 = Math.max.apply(null, pts.map(function (q) { return q[1]; }));
    var sc = Math.min((size - 8) / (x1 - x0), (size - 8) / (y1 - y0)); c.save(); c.translate(size / 2 - (x0 + x1) / 2 * sc, size / 2 - (y0 + y1) / 2 * sc + 1); c.scale(sc, sc);
    if (def.layer === 'wall') { iso(c, -4, -T, w + 8, T, 70, '#f7efe9', 0, { noShadow: true }); }
    SP.decor(c, def, 0, 0, 0.5); c.restore();
    return (THC[key] = cv);
  };
  SP.decorThumb = function (def, size) { var key = def.id + '@' + (size || 64) + 'x' + (window.devicePixelRatio || 1); return THU[key] || (THU[key] = SP.decorThumbCanvas(def, size).toDataURL()); };
  SP.decor = function (ctx, def, gx, gy, t, alpha) {
    var f = DR[def.id]; if (!f) return;
    if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
    f(ctx, def, gx, gy, t || 0, alpha);
    ctx.globalAlpha = 1;
  };
})();
