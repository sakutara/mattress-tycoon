/* Vẽ cửa hàng 2D top-down lên canvas: sàn, kệ, đệm trưng bày, quầy, cửa; khách & NV di chuyển */
(function () {
  'use strict';
  var G = window.G, SP = G.sprites, T = SP.T, poly = SP.poly, poly3 = SP.poly3;
  var R = G.render = {
    canvas: null, ctx: null, tip: null, truckT: 0, lastLevel: -1, hover: null,
    // ---------------- TRANG (PAGE) + CAMERA ----------------
    // Ba "phòng" xếp ngang: [Phòng NV] ← [Khu bán hàng] → [Livestream]. Mỗi phòng là một cảnh riêng; vuốt trái/phải để chuyển.
    page: 'shop',
    cam: { x: 0, y: 0, s: 1 }, camT: null, cssW: 390, cssH: 300, dpr: 1, pts: {}, _pinch: null,
    // ---- KHUNG TRANG (screen-world): mỗi trang là một cảnh isometric riêng nằm cạnh nhau theo chiều ngang ----
    GRID: { room: [8, 7], studio: [8, 7] },
    MARG: { shop: { l: 1.1, r: 1.0, b: 0.4, f: 2.3 }, room: { l: 0.5, r: 0.5, b: 0.3, f: 0.7 }, studio: { l: 0.5, r: 0.5, b: 0.3, f: 0.7 } },
    WALLH: 74, HILLS: 74, TH: 16, PADX: 14,
    gridOf: function (id, lv) { if (id === 'shop') { var L = G.layout.get(lv); return [L.cols, L.rows]; } return R.GRID[id]; },
    plateOf: function (id, lv) { var g = R.gridOf(id, lv), m = R.MARG[id]; return { gx0: -m.l * T, gx1: (g[0] + m.r) * T, gy0: -m.b * T, gy1: (g[1] + m.f) * T }; },
    frames: function () {
      var key = G.state.level + '|' + (G.state.staffroom.built ? 1 : 0) + (G.state.live.built ? 1 : 0); if (R._fr && R._frKey === key) return R._fr;
      var fr = {}, ids = ['room', 'shop', 'studio'];
      ids.forEach(function (id) {
        var p = R.plateOf(id), a = SP.P(p.gx0, p.gy0, 0), b = SP.P(p.gx1, p.gy0, 0), c = SP.P(p.gx0, p.gy1, 0), d = SP.P(p.gx1, p.gy1, 0);
        var minx = c[0], maxx = b[0], miny = a[1] - R.WALLH - R.HILLS, maxy = d[1] + R.TH + 14;
        fr[id] = { w: maxx - minx + 2 * R.PADX, h: maxy - miny, minx: minx, miny: miny };
      });
      fr.shop.x0 = 0; fr.room.x0 = -fr.room.w; fr.studio.x0 = fr.shop.w;
      ids.forEach(function (id) { var f = fr[id]; f.y0 = 0; f.x1 = f.x0 + f.w; f.y1 = f.h; f.ox = f.x0 + R.PADX - f.minx; f.oy = -f.miny; });
      R._fr = fr; R._frKey = key; return fr;
    },
    minX: function () { return G.state.staffroom.built ? R.frames().room.x0 : 0; },
    maxX: function () { var f = R.frames(); return G.state.live.built ? f.studio.x1 : f.shop.x1; },
    worldW: function () { return R.maxX() - R.minX(); }, worldH: function () { var f = R.frames(); return Math.max(f.shop.h, f.room.h, f.studio.h); },
    pageList: function () { var a = []; if (G.state.staffroom.built) a.push('room'); a.push('shop'); if (G.state.live.built) a.push('studio'); return a; },
    pageName: function (id) { return { room: 'Phòng NV', shop: 'Cửa hàng', studio: 'Livestream' }[id]; },
    bounds: function (id) { var f = R.frames()[id]; return { x0: f.x0, x1: f.x1, y0: f.y0, y1: f.y1 }; },
    pageCam: function (id) {
      var b = R.bounds(id), bw = b.x1 - b.x0, bh = b.y1 - b.y0, s = G.clamp(R.cssW / bw, id === 'shop' ? 0.42 : 0.3, id === 'shop' ? 1.3 : 1.7);
      return { s: s, x: b.x0 + bw / 2 - R.cssW / (2 * s), y: b.y0 + bh / 2 - R.cssH / (2 * s) + (id === 'shop' ? bh * 0.04 : 0) };
    },
    minScale: function () { var b = R.bounds(R.page); return Math.max(0.3, Math.min(R.cssW / (b.x1 - b.x0), R.cssH / (b.y1 - b.y0), R.pageCam(R.page).s)); },
    clampCam: function (c) {
      c = c || R.cam; if (R._swiping && c === R.cam) return c;
      var b = R.bounds(R.page); c.s = G.clamp(c.s, R.minScale(), 2.6); var vw = R.cssW / c.s, vh = R.cssH / c.s;
      c.x = (b.x1 - b.x0) <= vw ? (b.x0 + b.x1 - vw) / 2 : G.clamp(c.x, b.x0, b.x1 - vw); c.y = (b.y1 - b.y0) <= vh ? (b.y0 + b.y1 - vh) / 2 : G.clamp(c.y, b.y0, b.y1 - vh); return c;
    },
    zoomed: function () { return R.cam.s > R.pageCam(R.page).s * 1.12; },
    // chuyển trang (có animation snap)
    goPage: function (id, instant) {
      if (R.pageList().indexOf(id) < 0) id = 'shop';
      var changed = id !== R.page; R.page = id; R._swiping = false;
      var c = R.pageCam(id); if (instant) { R.cam = c; R.camT = null; } else R.camT = c;
      if (changed) { try { localStorage.setItem('vcg_swipe_hint', '1'); } catch (e) {} G.emit('pageChanged', id); }
      if (R.updatePageUI) { var ui = document.getElementById('page-ui'); if (ui) ui._k = null; R.updatePageUI(); }
    },
    stepPage: function (d) { var l = R.pageList(), i = l.indexOf(R.page) + d; if (i < 0 || i >= l.length) return false; R.goPage(l[i]); return true; },
    jump: function (where, instant) {
      if (where === 'fit') { R.camT = null; var c = R.pageCam(R.page); c.s = R.minScale(); R.clampCam(c); R.camT = c; return; }
      R.goPage(where, instant);
    },
    toWorld: function (cx, cy) { var r = R.canvas.getBoundingClientRect(); return { x: R.cam.x + (cx - r.left) * (R.cssW / r.width) / R.cam.s, y: R.cam.y + (cy - r.top) * (R.cssH / r.height) / R.cam.s }; },
    zoomAt: function (cx, cy, ns) {
      var w = R.toWorld(cx, cy), r = R.canvas.getBoundingClientRect(); ns = G.clamp(ns, R.minScale(), 2.6); R.camT = null;
      R.cam.s = ns; R.cam.x = w.x - (cx - r.left) * (R.cssW / r.width) / ns; R.cam.y = w.y - (cy - r.top) * (R.cssH / r.height) / ns; R.clampCam();
    },
    init: function (canvas, tip) {
      R.canvas = canvas; R.ctx = canvas.getContext('2d'); R.tip = tip;
      canvas.addEventListener('mousemove', R.onMove);
      canvas.addEventListener('mouseleave', function () { if (tip) tip.style.display = 'none'; R.hover = null; R.hoverSlot = null; });
      canvas.addEventListener('click', R.onClick);
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      canvas.addEventListener('wheel', function (e) { e.preventDefault(); if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { if (!R._wheelT) { R._wheelT = setTimeout(function () { R._wheelT = null; }, 350); R.stepPage((e.deltaX || e.deltaY) > 0 ? 1 : -1); } return; } R.zoomAt(e.clientX, e.clientY, R.cam.s * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });
      canvas.addEventListener('pointerdown', function (e) {
        try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
        R.pts[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), v: 0 }; var n = Object.keys(R.pts).length;
        if (n === 1) { R._lp = false; R._panned = false; R._mode = null; R._ov = 0; clearTimeout(R._lpT); R.camT = null; var sl = R.slotAtClient(e.clientX, e.clientY); R._lpS = null; if (sl && !G.decor.placing) { R._lpS = { x: e.clientX, y: e.clientY }; R._lpT = setTimeout(function () { R._lp = true; R._mode = 'none'; G.ui.shelf.quick(sl.id, e.clientX, e.clientY); }, 520); } }
        else if (n === 2) { clearTimeout(R._lpT); R._lpS = null; R._mode = 'pinch'; var k = Object.keys(R.pts), a = R.pts[k[0]], b = R.pts[k[1]]; R._pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: R.cam.s }; R._panned = true; if (R._swiping) { R._swiping = false; R.clampCam(); } }
      });
      canvas.addEventListener('pointermove', function (e) {
        var p = R.pts[e.pointerId]; if (!p) return; var n = Object.keys(R.pts).length, now = performance.now();
        if (n >= 2 && R._pinch) { p.x = e.clientX; p.y = e.clientY; var k = Object.keys(R.pts), a = R.pts[k[0]], b = R.pts[k[1]], d = Math.hypot(a.x - b.x, a.y - b.y) || 1; R.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, R._pinch.s * d / R._pinch.d); return; }
        if (R._mode === 'none') return;
        var tdx = e.clientX - p.sx, tdy = e.clientY - p.sy, dx = e.clientX - p.x, dy = e.clientY - p.y;
        if (R._lpS && Math.abs(e.clientX - R._lpS.x) + Math.abs(e.clientY - R._lpS.y) > 12) { clearTimeout(R._lpT); R._lpS = null; }
        if (!R._mode && Math.hypot(tdx, tdy) > 9) {
          clearTimeout(R._lpT); R._lpS = null; R._panned = true;
          var bb = R.bounds(R.page), fits = (bb.x1 - bb.x0) * R.cam.s <= R.cssW + 2;
          R._mode = (!G.decor.placing && fits && !R.zoomed() && Math.abs(tdx) > Math.abs(tdy) * 1.05) ? 'swipe' : 'pan';
          if (R._mode === 'swipe') { R._swiping = true; R._base = R.cam.x; R._ov = 0; }
        }
        if (!R._mode) return;
        var dt = Math.max(1, now - p.t); p.v = 0.7 * p.v + 0.3 * (dx / dt); p.t = now;
        if (R._mode === 'swipe') {
          var l = R.pageList(), i = l.indexOf(R.page), noPrev = i <= 0, noNext = i >= l.length - 1, off = tdx;
          if ((tdx > 0 && noPrev) || (tdx < 0 && noNext)) off = Math.sign(tdx) * Math.min(70, Math.abs(tdx) * 0.35); // rubber-band ở hai đầu
          R.cam.x = R._base - off / R.cam.s;
        } else {
          var b = R.bounds(R.page), vw = R.cssW / R.cam.s, nx = R.cam.x - dx / R.cam.s, cl = G.clamp(nx, b.x0, Math.max(b.x0, b.x1 - vw));
          if ((b.x1 - b.x0) > vw) R._ov += (nx - cl) * R.cam.s; else R._ov += -dx; // kéo vượt mép (hoặc phòng nhỏ hơn khung) = đà chuyển phòng
          if (Math.sign(dx) * Math.sign(R._ov) > 0 && Math.abs(R._ov) > 0) R._ov = 0; // đổi hướng thì reset
          R.cam.x -= dx / R.cam.s; R.cam.y -= dy / R.cam.s; R.clampCam();
        }
        p.x = e.clientX; p.y = e.clientY;
      });
      ['pointerup', 'pointercancel'].forEach(function (ev) { canvas.addEventListener(ev, function (e) {
        clearTimeout(R._lpT); R._lpS = null; var p = R.pts[e.pointerId]; delete R.pts[e.pointerId]; if (Object.keys(R.pts).length < 2) R._pinch = null;
        if (Object.keys(R.pts).length === 0) {
          if (R._mode === 'swipe') {
            var tdx = p ? e.clientX - p.sx : 0, v = p ? p.v : 0, dir = 0; R._swiping = false;
            if (Math.abs(tdx) > R.cssW * 0.18 || (Math.abs(v) > 0.45 && Math.abs(tdx) > 30)) dir = (tdx < 0 || v < -0.45) ? 1 : -1;
            if (dir && R.stepPage(dir)) { /* đã chuyển */ } else { R.camT = R.pageCam(R.page); R.camT.s = R.cam.s; R.clampCam(R.camT); }
          } else if (R._mode === 'pan' && Math.abs(R._ov) > 60) { R.stepPage(R._ov > 0 ? 1 : -1); }
          R._mode = null; R._ov = 0;
        }
        if (ev === 'pointerup' && !R._panned && !R._lp) { // chạm đúp vào chỗ trống = phóng to/thu nhỏ
          var now = performance.now(), last = R._lastTap;
          if (last && now - last.t < 320 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 24 && !R.slotAtClient(e.clientX, e.clientY) && !G.decor.placing) { var base = R.pageCam(R.page).s; R.zoomAt(e.clientX, e.clientY, R.cam.s > base * 1.4 ? base : base * 2); R._lastTap = null; R._dbl = true; setTimeout(function () { R._dbl = false; }, 30); }
          else R._lastTap = { t: now, x: e.clientX, y: e.clientY };
        }
      }); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && G.decor.placing) { G.decor.placing = null; G.ui.panels.refresh(true); }
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && !document.querySelector('.modal-back')) R.stepPage(e.key === 'ArrowRight' ? 1 : -1);
      });
      var cb = document.getElementById('cam-btns');
      if (cb) cb.onclick = function (e) { var b = e.target.closest('[data-cam]'); if (!b) return; var c = b.dataset.cam, rc = R.canvas.getBoundingClientRect(); if (c === 'in') R.zoomAt(rc.left + R.cssW / 2, rc.top + R.cssH / 2, R.cam.s * 1.3); else if (c === 'out') R.zoomAt(rc.left + R.cssW / 2, rc.top + R.cssH / 2, R.cam.s / 1.3); else if (c === 'lookbook') { if (G.ui.openLookbook) G.ui.openLookbook(); } else R.jump(c); };
      var pui = document.getElementById('page-ui');
      if (pui) pui.addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (b) R.goPage(b.dataset.p); else if (e.target.id === 'live-chip') R.goPage('studio'); });
      window.addEventListener('resize', function () { R.layoutCanvas(true); });
      if (window.ResizeObserver) new ResizeObserver(function () { R.layoutCanvas(true); }).observe(R.canvas.parentNode);
      if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { R.layoutCanvas(true); });
    },
    updateCamBtns: function () {
      var cb = document.getElementById('cam-btns'); if (!cb) return; var key = (G.state.staffroom.built ? 1 : 0) + (G.state.live.built ? 2 : 0);
      if (cb._k !== key) { cb._k = key; cb.innerHTML = '<button data-cam="room" title="Phòng nhân viên" ' + (G.state.staffroom.built ? '' : 'style="display:none"') + '>☕</button><button data-cam="shop" title="Khu bán hàng">🏪</button><button data-cam="studio" title="Phòng livestream" ' + (G.state.live.built ? '' : 'style="display:none"') + '>🎥</button><button data-cam="lookbook" title="Lookbook">📖</button><button data-cam="fit" title="Vừa khung / thu nhỏ">⤢</button>'; }
    },
    // mũi tên mép, chấm trang, nhãn phòng, chip LIVE (DOM phủ lên canvas)
    updatePageUI: function () {
      var ui = document.getElementById('page-ui'); if (!ui) return;
      var l = R.pageList(), i = l.indexOf(R.page), s = G.state, run = G.live.running(), n = G.staffroom.occ.length + G.staff.ents.filter(function (e) { return e.state === 'toRoom'; }).length;
      var enroute = G.staff.ents.filter(function (e) { return e.state === 'toRoom'; }).length;
      var left = i > 0 ? l[i - 1] : null, right = i < l.length - 1 ? l[i + 1] : null;
      var lbl = function (id) { return id === 'room' ? '☕ ' + n : id === 'studio' ? (run ? '🔴 LIVE' : '🎥') : '🏪'; };
      var hint = !localStorage.getItem('vcg_swipe_hint') && l.length > 1;
      var key = [R.page, l.join(','), n, enroute, run ? 1 : 0, hint ? 1 : 0, run ? Math.round(run.st.viewers / 5) : 0].join('|');
      if (ui._k === key) return; ui._k = key;
      var L = document.getElementById('pg-l'), Rr = document.getElementById('pg-r');
      L.style.display = left ? 'flex' : 'none'; Rr.style.display = right ? 'flex' : 'none';
      if (left) { L.dataset.p = left; L.className = 'pgedge l' + (enroute && left === 'room' ? ' pulse' : '') + (hint ? ' hint' : ''); L.innerHTML = '<span>◀</span><b>' + lbl(left) + '</b><small>' + R.pageName(left) + '</small>' + (enroute && left === 'room' ? '<i class="cue">→ đến Phòng NV</i>' : ''); }
      if (right) { Rr.dataset.p = right; Rr.className = 'pgedge r' + (hint ? ' hint' : '') + (right === 'studio' && run ? ' live' : ''); Rr.innerHTML = '<b>' + lbl(right) + '</b><small>' + R.pageName(right) + '</small><span>▶</span>'; }
      document.getElementById('pg-dots').innerHTML = l.length < 2 ? '' : l.map(function (id) { return '<button class="dot' + (id === R.page ? ' on' : '') + (id === 'studio' && run ? ' live' : '') + '" data-p="' + id + '" aria-label="' + R.pageName(id) + '"><i></i></button>'; }).join('') + '<span class="pgname">' + R.pageName(R.page) + (R.page === 'room' ? ' · ☕ ' + G.staffroom.occ.length : R.page === 'shop' ? ' · 👥 ' + G.staff.ents.filter(function (e) { return e.state !== 'toRoom'; }).length : (run ? ' · 🔴 LIVE' : '')) + '</span>';
      document.getElementById('pg-hint').style.display = hint ? 'block' : 'none';
      var chip = document.getElementById('live-chip'); chip.style.display = run && R.page !== 'studio' ? 'block' : 'none'; if (run) chip.textContent = '🔴 LIVE · 👁 ' + Math.round(run.st.viewers);
    },
    annexKey: function () { return (G.state.live.built ? 1 : 0) + (G.state.staffroom.built ? 2 : 0) + 10 * G.state.staffroom.rev; },
    // kích thước canvas theo khung hiển thị (có DPR) - chiều cao bị chặn để vừa nav + nút Mở cửa + chip thông tin
    wantHeight: function (w) {
      var vh = window.innerHeight, app = document.getElementById('app');
      if (app && app.classList.contains('game-view')) { var nv = document.getElementById('bottom-nav'), hd = document.getElementById('hud'), cs = getComputedStyle(app); return Math.max(210, Math.round(app.clientHeight - (nv ? nv.offsetHeight : 0) - (hd ? hd.offsetHeight : 0) - (parseFloat(cs.paddingTop) || 0))); }
      return Math.round(G.clamp(Math.min(w * 0.82, vh * 0.35), 210, 360)); },
    layoutCanvas: function (keepCam) {
      var wrap = R.canvas.parentNode, w = Math.max(200, Math.round(wrap.clientWidth || wrap.getBoundingClientRect().width || 390)), h = R.wantHeight(w), dpr = Math.min(3, window.devicePixelRatio || 1);
      if (w === R.cssW && h === R.cssH && dpr === R.dpr && R.canvas.width === Math.round(w * dpr)) return;
      R.cssW = w; R.cssH = h; R.dpr = dpr; R.canvas.style.width = w + 'px'; R.canvas.style.height = h + 'px'; R.canvas.width = Math.round(w * dpr); R.canvas.height = Math.round(h * dpr);
      if (!keepCam || !R._init) { R._init = true; R.goPage('shop', true); } else { var pc = R.pageCam(R.page); if (!R.zoomed()) { R.cam = pc; } R.clampCam(); }
      if (G.ui && G.ui.layoutSheets) G.ui.layoutSheets();
    },
    resize: function () {
      var lvChanged = R.lastLevel !== G.state.level; R.annex = R.annexKey(); R.lastLevel = G.state.level; R.stat = null; R.layoutCanvas(true); if (lvChanged) R.goPage('shop', true); if (R.pageList().indexOf(R.page) < 0) R.goPage('shop', true); R.clampCam();
    },
    // ================= HÌNH HỌC Ô KỆ / GIƯỜNG (isometric) =================
    SHELF_H: 28, STACK_H: 22,
    hull: function (pts) {
      pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }); if (pts.length < 3) return pts;
      function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
      var lo = [], up = [], i; for (i = 0; i < pts.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 0) lo.pop(); lo.push(pts[i]); }
      for (i = pts.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop(); up.push(pts[i]); }
      lo.pop(); up.pop(); return lo.concat(up);
    },
    inPoly: function (poly, x, y) { var inside = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; },
    // hình học 1 ô: {gx,gy,gw,gd,z (độ cao mặt),top (đỉnh), cx,cy (tâm đất), key (độ sâu), bed}
    slotGeom: function (sl, ord) {
      var p = G.layout.slotPos(sl, ord); if (!p) return null; var r = p.rect, g;
      if (p.kind === 'bed') { g = { gx: r.x * T + 3, gy: r.y * T + 3, gw: r.w * T - 6, gd: r.h * T - 6, z: 19, top: 40, bed: true }; }
      else if (!p.vert) { var cw = (r.w * T - 10) / 3; g = { gx: r.x * T + 5 + p.j * cw + 1, gy: r.y * T + 8 + 1, gw: cw - 2, gd: T - 16, z: R.SHELF_H + 0.4, top: R.SHELF_H + R.STACK_H + 6 }; }
      else { var ch = (r.h * T - 10) / 3; g = { gx: r.x * T + 8 + 1, gy: r.y * T + 5 + p.j * ch + 1, gw: T - 16, gd: ch - 2, z: R.SHELF_H + 0.4, top: R.SHELF_H + R.STACK_H + 6 }; }
      g.cx = g.gx + g.gw / 2; g.cy = g.gy + g.gd / 2; g.key = (g.cx + g.cy) / T; g.sl = sl;
      var fr = R.frames().shop, ox = fr.ox, oy = fr.oy, pts = [];
      [[g.gx, g.gy], [g.gx + g.gw, g.gy], [g.gx + g.gw, g.gy + g.gd], [g.gx, g.gy + g.gd]].forEach(function (q) { var a = SP.P(q[0], q[1], 0), b = SP.P(q[0], q[1], g.top); pts.push([a[0] + ox, a[1] + oy], [b[0] + ox, b[1] + oy]); });
      g.poly = R.hull(pts); var c = SP.P(g.cx, g.cy, (g.z + g.top) / 2); g.sx = c[0] + ox; g.sy = c[1] + oy;
      return g;
    },
    // ô tại toạ độ screen-world: trúng đa giác -> chọn ô gần người xem nhất; không thì ô gần nhất trong bán kính ~26px màn hình (đủ ngón tay)
    slotAtPx: function (wx, wy) {
      if (R.page !== 'shop') return null;
      var ord = G.shelf.ordinals(), best = null, bk = -1e9, near = null, nd = 1e9, rad = 26 / R.cam.s;
      G.state.slots.forEach(function (sl) {
        var g = R.slotGeom(sl, ord); if (!g) return;
        if (R.inPoly(g.poly, wx, wy)) { if (g.key > bk) { bk = g.key; best = sl; } }
        var d = Math.hypot(g.sx - wx, g.sy - wy); if (d < nd) { nd = d; near = sl; }
      });
      return best || (nd < rad ? near : null);
    },
    slotAtClient: function (cx, cy) {
      if (!R.canvas) return null; var rect = R.canvas.getBoundingClientRect(); if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) return null;
      var w = R.toWorld(cx, cy); return R.slotAtPx(w.x, w.y);
    },
    groundAt: function (wx, wy, id) { var f = R.frames()[id || 'shop']; return SP.unP(wx - f.ox, wy - f.oy); },
    tileAt: function (e) { var w = R.toWorld(e.clientX, e.clientY), g = R.groundAt(w.x, w.y, 'shop'); return { x: Math.floor(g.x / T), y: Math.floor(g.y / T) }; },
    decorGeom: function (it) {
      var d = G.decorById[it.id], L = G.layout.get(), fr = R.frames().shop, w = d.w * T, h = d.h * T, gx = it.x * T, gy = it.y * T, hh = d.layer === 'ceil' ? 90 : d.layer === 'wall' ? 60 : d.layer === 'flat' ? 2 : 48, z0 = d.layer === 'wall' ? 20 : d.layer === 'ceil' ? 56 : 0, pts = [];
      if (d.layer === 'wall') { gy = 0; h = T; }
      [[gx, gy], [gx + w, gy], [gx + w, gy + h], [gx, gy + h]].forEach(function (q) { var a = SP.P(q[0], q[1], z0), b = SP.P(q[0], q[1], hh); pts.push([a[0] + fr.ox, a[1] + fr.oy], [b[0] + fr.ox, b[1] + fr.oy]); });
      return { poly: R.hull(pts), key: (gx + w / 2 + gy + h / 2) / T + (d.layer === 'wall' ? -5 : 0) };
    },
    decorAtClient: function (cx, cy) {
      var w = R.toWorld(cx, cy), best = null, bk = -1e9;
      G.decor.placed().forEach(function (it) { var g = R.decorGeom(it); if (R.inPoly(g.poly, w.x, w.y) && g.key > bk) { bk = g.key; best = it; } });
      return best;
    },
    onClick: function (e) {
      if (R._panned || R._dbl) { R._panned = false; return; }
      var D = G.decor, t = R.tileAt(e);
      if (D.placing) { var r = D.tryPlace(D.placing, t.x, (D.placing && G.decorById[D.item(D.placing).id].layer === 'wall') ? 0 : t.y); G.notify.toast(G.esc(r.msg), r.ok ? 'good' : 'warn'); G.ui.panels.refresh(true); return; }
      var sl0 = R._lp ? null : R.slotAtClient(e.clientX, e.clientY); if (R._lp) { R._lp = false; return; }
      if (sl0) { G.ui.shelf.open(sl0.id); return; }
      var hit = R.page === 'shop' ? R.decorAtClient(e.clientX, e.clientY) : null;
      if (hit) { D.selected = hit.uid; G.ui.panels.active = 'decor'; G.ui.panels.buildNav(); G.ui.panels.refresh(true); }
    },
    onMove: function (e) {
      var w = R.toWorld(e.clientX, e.clientY), g = R.groundAt(w.x, w.y, 'shop'); R.hover = { x: Math.floor(g.x / T), y: Math.floor(g.y / T) }; var hs = R.slotAtPx(w.x, w.y); R.hoverSlot = hs ? hs.id : null;
      if (R.tip) R.tip.style.display = 'none';
    },
    // ================= LỚP TĨNH (cache theo trang) =================
    hills: function (c, fr, id) {
      var W = fr.w, top = R.HILLS + 30, baseY = top + 40;
      function ridge(x0, x1, hgt, seed, cols) {
        var n = 8, pts = []; for (var i = 0; i <= n; i++) { var u = i / n; pts.push([x0 + (x1 - x0) * u, baseY - hgt * (0.35 + 0.65 * Math.sin(Math.PI * u)) * (0.75 + 0.5 * SP.hash(i + seed, seed))]); }
        for (i = 0; i < n; i++) { var a = pts[i], b = pts[i + 1], m = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 10 * (SP.hash(i, seed + 3) - 0.3)];
          poly(c, [a, m, [a[0], baseY + 60]], cols[i % 3]); poly(c, [m, b, [b[0], baseY + 60], [a[0], baseY + 60]], cols[(i + 1) % 3]); poly(c, [[a[0], a[1]], [m[0], m[1]], [b[0], b[1]], [b[0], b[1] + 14], [a[0], a[1] + 14]], cols[(i + 2) % 3]); }
      }
      ridge(-20, W * 0.62, 78, 3, ['#9fd0f0', '#8cc2ea', '#b4dcf6']);
      ridge(W * 0.38, W + 20, 92, 9, ['#f4b6c2', '#e99aae', '#f8c9d3']);
    },
    paintBG: function (c, fr) {
      var g = c.createLinearGradient(0, 0, 0, fr.h); g.addColorStop(0, '#fdeadf'); g.addColorStop(1, '#f9d9c8'); c.fillStyle = g; c.fillRect(0, 0, fr.w, fr.h);
      R.hills(c, fr);
    },
    paintShop: function (c, lv, opts) {
      var L = G.layout.get(lv), C = L.cols, Rr = L.rows, p = R.plateOf('shop', lv), s = G.state, o = opts || {}, hasRoom = !o.noRoom && G.state.staffroom.built, x, y;
      SP.plate(c, p.gx0, p.gy0, p.gx1, p.gy1, R.TH, '#f7d2b8', '#e9b79f', '#d79f8d');
      // mảng đất low-poly (3 tông nhẹ)
      for (y = -1; y < Rr + 3; y += 2) for (x = -1; x < C + 2; x += 2) { var h = SP.hash(x + 40, y + 40); if (h < 0.5) SP.isoDiamond(c, Math.max(p.gx0, x * T), Math.max(p.gy0, y * T), Math.min(2 * T, p.gx1 - Math.max(p.gx0, x * T)), Math.min(2 * T, p.gy1 - Math.max(p.gy0, y * T)), 0, h < 0.25 ? 'rgba(255,240,226,.35)' : 'rgba(233,170,150,.16)'); }
      // vỉa hè trước cửa
      for (x = Math.ceil(p.gx0 / T); x < Math.floor(p.gx1 / T); x++) { SP.isoDiamond(c, x * T, Rr * T, T, T, 0.2, (x + 99) % 2 ? '#f1e6dc' : '#ece0d4'); }
      // bậc thềm + đá lót lối đi từ cửa ra ngoài
      var dx = L.door.x * T; for (var k = 0; k < 4; k++) { SP.isoBox(c, dx + 6 + (k % 2 ? 5 : 0), (Rr + 1.0 + k * 0.38) * T, T - 14, T * 0.28, 2.4, k % 2 ? '#ddd3df' : '#d4cada', 0, { noShadow: true }); }
      // sàn gỗ ấm + ngưỡng cửa
      SP.woodFloor(c, 0, 1, C, Rr - 1);
      for (x = 0; x < C; x++) SP.isoDiamond(c, x * T, (Rr - 1) * T, T, T, 0, x % 2 ? '#f1e6dc' : '#ece0d4');
      // thảm
      L.rugs.forEach(function (r) { SP.isoDiamond(c, r.x * T, r.y * T, r.w * T, r.h * T, 0.3, r.col); SP.isoDiamond(c, (r.x + 0.18) * T, (r.y + 0.18) * T, (r.w - 0.36) * T, (r.h - 0.36) * T, 0.4, r.col2); SP.isoDiamond(c, (r.x + 0.42) * T, (r.y + 0.42) * T, (r.w - 0.84) * T, (r.h - 0.84) * T, 0.5, r.col); poly3(c, [[r.x * T, (r.y + r.h) * T, 0.3], [(r.x + r.w) * T, (r.y + r.h) * T, 0.3], [(r.x + r.w) * T, (r.y + r.h) * T, 0], [r.x * T, (r.y + r.h) * T, 0]], 'rgba(150,100,110,.35)'); });
      // hồ ánh sáng ấm dưới đèn thả
      L.lamps.forEach(function (l) { SP.glow(c, (l.x + 0.5) * T, (l.y + 0.5) * T, 0.5, 70, '255,226,160', 0.3); });
      SP.pine(c, -0.62 * T, (Rr * 0.6) * T, 1.1); SP.pine(c, -0.55 * T, (Rr * 0.85) * T, 0.9);
      // tường sau + tường trái (cắt thấp)
      var cy = G.staffroom.cy ? G.staffroom.cy() : Math.floor(Rr / 2), WH = R.WALLH;
      SP.leftWall(c, Rr, WH, '#f2e6dc', hasRoom ? [[cy, cy + 1]] : null);
      SP.backWall(c, C, WH, '#f7efe9');
      for (x = 1; x + 2 <= C - 1; x += 3) { if (x > C / 2 - 4 && x < C / 2 + 4) continue; SP.window(c, 'b', x * T, 8, 54, 26, 30); if ((x + 1) % 2) SP.awning(c, x * T, 4, 62, 62); }
      for (y = 3; y + 2 <= Rr - 1; y += 3) if (!(hasRoom && y <= cy && y + 2 >= cy)) SP.window(c, 'l', y * T, 10, 54, 26, 30);
      // biển hiệu giữa tường sau
      var cxs = C * T / 2, sgn = (o.name || s.shopName || 'Cửa hàng').toUpperCase(), tx = SP.wallBack(cxs, 0, 0);
      var bw = 150; function wb(u, v) { return SP.wallBack(cxs, u, v); }
      poly(c, [wb(-bw, 46), wb(bw, 46), wb(bw, 68), wb(-bw, 68)], '#fffaf4'); poly(c, [wb(-bw + 4, 49), wb(bw - 4, 49), wb(bw - 4, 65), wb(-bw + 4, 65)], '#f0a24a');
      c.save(); var o = wb(0, 53); c.transform(SP.HX / T, SP.HY / T, 0, 1, o[0], o[1]); c.fillStyle = '#fffaf4'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillText((sgn + ' · ' + (o.sub || G.lvl().name)).slice(0, 34), 0, 0); c.restore();
      // dây cờ nhỏ trên tường
      for (var i = -5; i <= 5; i++) { var a = wb(i * 28, 70 - Math.abs(i) * 0.3); poly(c, [[a[0] - 4, a[1]], [a[0] + 4, a[1]], [a[0], a[1] + 8]], ['#f4b6c2', '#9fd0f0', '#ffd06b', '#8fcf7a'][(i + 8) % 4]); }
      // thiên nhiên xung quanh
      var gtx = [[-0.7, 1.2], [C + 0.5, 0.8], [C + 0.6, 6.4], [-0.6, Rr + 0.7]];
      SP.roundTree(c, (C + 0.45) * T, 1.6 * T, 1.0); SP.pine(c, (C + 0.5) * T, 4.6 * T, 1.0); SP.rock(c, (C + 0.45) * T, 7.2 * T, 1.0); SP.rock(c, (C + 0.4) * T, (Rr + 0.5) * T, 0.7, '#b7a9c2');
      SP.bush(c, (L.door.x - 0.6) * T, (Rr + 0.55) * T, 1.0); SP.bush(c, (L.door.x + 1.7) * T, (Rr + 0.6) * T, 0.9, '#9bd681'); SP.tuft(c, (C - 2) * T, (Rr + 1.4) * T, 1.1); SP.tuft(c, 2 * T, (Rr + 1.3) * T, 1.0); SP.tuft(c, (C + 0.3) * T, (Rr + 1.5) * T, 0.9);
      SP.isoDiamond(c, (C - 4.5) * T, (Rr + 0.7) * T, 2.6 * T, 1.2 * T, 0.2, '#a8dc8c'); SP.isoDiamond(c, (C - 4.2) * T, (Rr + 0.85) * T, 2.0 * T, 0.9 * T, 0.3, '#bde8a2');
    },
    getStatic: function (id, k) {
      R._st = R._st || {}; var f = R.frames()[id], key = id + '|' + k + '|' + G.state.level + '|' + (G.state.shopName || '') + '|' + G.state.staffroom.rev + '|' + (G.state.live.built ? 1 : 0) + (G.state.staffroom.built ? 1 : 0) + '|' + Object.keys(G.state.staffroom.up || {}).join(',') + '|' + (G.state.layoutVer || 0);
      var e = R._st[id]; if (e && e.key === key) return e.cv;
      var cv = document.createElement('canvas'); cv.width = Math.ceil(f.w * k); cv.height = Math.ceil(f.h * k); var c = cv.getContext('2d'); c.scale(k, k);
      R.paintBG(c, f); c.save(); c.translate(f.ox - f.x0, f.oy - f.y0);
      if (id === 'shop') R.paintShop(c); else if (id === 'room') G.staffroom.paintStatic(c); else G.live.paintStatic(c);
      c.restore(); R._st[id] = { key: key, cv: cv }; return cv;
    },
    // ================= VẼ ĐỘNG =================
    draw: function (dt) {
      if (!R.ctx || !G.state) return;
      if (R.lastLevel !== G.state.level || R.annex !== R.annexKey()) { R.resize(); R._st = null; }
      var ctx = R.ctx, L = G.layout.get(), s = G.state, C = L.cols, Rr = L.rows, x, y, F = R.frames();
      if (R.truckT > 0) R.truckT -= dt;
      if (!R.cssW || R.canvas.width !== Math.round(R.cssW * R.dpr)) R.layoutCanvas(true);
      if (R.camT) { var f = Math.min(1, dt * 9), cm = R.cam, ct = R.camT; cm.x += (ct.x - cm.x) * f; cm.y += (ct.y - cm.y) * f; cm.s += (ct.s - cm.s) * f; if (Math.abs(ct.x - cm.x) + Math.abs(ct.y - cm.y) < 0.6 && Math.abs(ct.s - cm.s) < 0.005) { R.cam = ct; R.camT = null; } }
      R.clampCam();
      var kb = [1, 1.5, 2, 3].filter(function (v) { return v >= R.dpr * R.cam.s - 0.01; })[0] || 3;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#fbe3d3'; ctx.fillRect(0, 0, R.canvas.width, R.canvas.height);
      var ks = R.dpr * R.cam.s; ctx.setTransform(ks, 0, 0, ks, -R.cam.x * ks, -R.cam.y * ks);
      R.updateCamBtns(); R.updatePageUI();
      var vx0 = R.cam.x, vx1 = R.cam.x + R.cssW / R.cam.s, tt = performance.now() / 1000;
      R.pageList().forEach(function (id) {
        var fr = F[id]; if (fr.x1 < vx0 || fr.x0 > vx1) return;
        var kk = Math.max(1, Math.min(kb, 3900 / fr.w, Math.sqrt(6e6 / (fr.w * fr.h))));
        ctx.drawImage(R.getStatic(id, kk), fr.x0, fr.y0, fr.w, fr.h);
        ctx.save(); ctx.translate(fr.ox, fr.oy);
        if (id === 'shop') R.drawShop(ctx, tt, dt); else if (id === 'room') G.staffroom.drawScene(ctx); else G.live.drawScene(ctx);
        ctx.restore();
      });
      var fs = F.shop, m = s.minute;
      if (R.page === 'shop' || R._camBlend) R.drawWeather(ctx, fs, tt);
      // ánh sáng: bình minh (chuẩn bị) / buổi tối ấm dần (chỉ khung cửa hàng)
      if (s.prep) { ctx.fillStyle = 'rgba(255,214,150,.13)'; ctx.fillRect(fs.x0, fs.y0, fs.w, fs.h); }
      else if (m > 1020) { ctx.fillStyle = 'rgba(255,160,90,' + (Math.min(0.2, (m - 1020) / 240 * 0.2)) + ')'; ctx.fillRect(fs.x0, fs.y0, fs.w, fs.h); ctx.fillStyle = 'rgba(70,50,140,' + (Math.min(0.16, (m - 1100) / 160 * 0.16)) + ')'; if (m > 1100) ctx.fillRect(fs.x0, fs.y0, fs.w, fs.h); }
      if (G.staff.closed()) {
        ctx.fillStyle = 'rgba(70,60,110,.45)'; ctx.fillRect(fs.x0, fs.y0, fs.w, fs.h);
        var tx = fs.x0 + fs.w / 2, ty = fs.y0 + fs.h * 0.55; SP.poly(ctx, [[tx - 190, ty - 18], [tx - 170, ty - 34], [tx + 170, ty - 34], [tx + 190, ty - 18], [tx + 190, ty + 14], [tx + 170, ty + 28], [tx - 170, ty + 28], [tx - 190, ty + 14]], '#f08a8a', 'rgba(255,255,255,.6)');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s.closure.reason || 'Đóng cửa', tx, ty + 6);
      }
      // nhãn cố định theo màn hình
      ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
      if (s.prep) { var bx0 = 8, by0 = R.cssH - 36; SP.poly(ctx, [[bx0, by0], [bx0 + 168, by0], [bx0 + 178, by0 + 14], [bx0 + 168, by0 + 28], [bx0, by0 + 28]], '#FFD93D', 'rgba(30,40,90,.25)'); ctx.fillStyle = '#2A3560'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('☀ CHUẨN BỊ NGÀY MỚI', bx0 + 10, by0 + 19); }
    },
    drawShop: function (ctx, tt, dt) {
      var L = G.layout.get(), s = G.state, C = L.cols, Rr = L.rows, DP = G.decor.placed(), ord = G.shelf.ordinals(), objs = [], open = G.clock.isOpen() && !G.staff.closed();
      // trang trí tường / thảm (trước)
      DP.forEach(function (it) { var d = G.decorById[it.id]; if (d.layer === 'wall' || d.layer === 'flat') SP.decor(ctx, d, it.x * T, it.y * T, tt); });
      var byShelf = {}, byBed = {};
      s.slots.forEach(function (sl) { var n = ord[sl.id]; if (sl.kind === 'bed') byBed[n] = sl; else { var u = Math.floor(n / G.data.shelfSlotsPerUnit); (byShelf[u] = byShelf[u] || [])[n % G.data.shelfSlotsPerUnit] = sl; } });
      L.shelfUnits.forEach(function (u, i) { objs.push({ k: (u.x + u.w / 2) + (u.y + u.h / 2), f: function () { SP.shelfUnit(ctx, u, byShelf[i] || []); } }); });
      L.beds.forEach(function (b, i) { objs.push({ k: (b.x + b.w / 2) + (b.y + b.h / 2), f: function () { SP.bed(ctx, b, byBed[i]); } }); });
      L.nights.forEach(function (n) { objs.push({ k: n.x + n.y + 1, f: function () { SP.nightstand(ctx, n.x * T, n.y * T); } }); });
      objs.push({ k: (L.counter.x + L.counter.w / 2) + L.counter.y + 0.5, f: function () { SP.counter(ctx, L.counter); } });
      L.props.forEach(function (p) { objs.push({ k: (p.x + p.w / 2) + (p.y + p.h / 2), f: function () { R.drawProp(ctx, p); } }); });
      L.plants.forEach(function (p) { objs.push({ k: p.x + p.y + 1, f: function () { SP.plant(ctx, p.x * T, p.y * T); } }); });
      objs.push({ k: L.door.x + L.door.y + 1.4, f: function () { SP.door(ctx, L.door, open); } });
      if (R.truckT > 0) objs.push({ k: L.door.x + Rr + 3, f: function () { SP.truck(ctx, (L.door.x + 1.6) * T, (Rr + 0.3) * T); } });
      DP.forEach(function (it) { var d = G.decorById[it.id]; if (d.layer === 'floor') objs.push({ k: it.x + d.w / 2 + it.y + d.h / 2, f: function () { SP.decor(ctx, d, it.x * T, it.y * T, tt); } }); });
      G.customers.list.forEach(function (c) { objs.push({ k: c.x + c.y + 0.15, f: function () { R.drawCust(ctx, c); } }); });
      G.staff.ents.forEach(function (e) { objs.push({ k: e.x + e.y + 0.15, f: function () { R.drawStaff(ctx, e); } }); });
      objs.sort(function (a, b) { return a.k - b.k; }).forEach(function (o) { o.f(); });
      // đèn thả (trên đầu mọi thứ)
      L.lamps.forEach(function (l) { var t0 = SP.P((l.x + 0.5) * T, (l.y + 0.5) * T, 92), t1 = SP.P((l.x + 0.5) * T, (l.y + 0.5) * T, 66); ctx.strokeStyle = '#a99fb4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); ctx.stroke(); SP.poly(ctx, [[t1[0] - 9, t1[1] + 3], [t1[0] + 9, t1[1] + 3], [t1[0] + 5, t1[1] - 6], [t1[0] - 5, t1[1] - 6]], '#ffe6a8'); SP.poly(ctx, [[t1[0], t1[1] + 3], [t1[0] + 9, t1[1] + 3], [t1[0] + 5, t1[1] - 6], [t1[0], t1[1] - 6]], '#f2c776'); });
      DP.forEach(function (it) { var d = G.decorById[it.id]; if (d.layer === 'ceil') SP.decor(ctx, d, it.x * T, it.y * T, tt); });
      G.emit('drawFloor', ctx);
      R.drawSlotLabels(ctx, ord);
      // bóng ma khi đặt đồ trang trí
      var pl = G.decor.placing && G.decor.item(G.decor.placing);
      if (pl && R.hover) {
        var gd = G.decorById[pl.id], gx = R.hover.x, gy = gd.layer === 'wall' ? 0 : R.hover.y, ok = G.decor.canPlace(pl, gx, gy).ok;
        G.decor.cells(gd, gx, gy).forEach(function (cc) { SP.isoDiamond(ctx, cc[0] * T + 1, cc[1] * T + 1, T - 2, T - 2, 0.8, ok ? 'rgba(80,200,150,.5)' : 'rgba(240,90,110,.5)'); });
        SP.decor(ctx, gd, gx * T, gy * T, tt, 0.65);
        var lp = SP.P((gx + gd.w / 2) * T, (gy + gd.h / 2) * T, 0), lbw = Math.max(76, gd.name.length * 5.6 + 40), lx = lp[0] - lbw / 2, ly = lp[1] - 96;
        SP.poly(ctx, [[lx, ly], [lx + lbw, ly], [lx + lbw + 5, ly + 13], [lx + lbw, ly + 26], [lx, ly + 26]], 'rgba(255,255,255,.95)', 'rgba(30,40,90,.3)'); ctx.drawImage(SP.decorThumbCanvas(gd, 40), lx + 2, ly - 1, 28, 28);
        ctx.fillStyle = '#2A3560'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(gd.name, lx + 32, ly + 11); ctx.font = '9px sans-serif'; ctx.fillStyle = ok ? '#1FAE74' : '#E5384F'; ctx.fillText(ok ? 'bấm để đặt' : 'không đặt được', lx + 32, ly + 21);
      }
      G.emit('drawOverlay', ctx);
    },
    // thời tiết trên sơ đồ: mưa, vỉa hè ướt, bóng mây, sắc trời (vẽ rẻ, không cache lớn)
    drawWeather: function (ctx, fs, tt) {
      if (!G.weather) return; var w = G.weather.cur().t, L = G.layout.get(), i;
      if (w === 'muanhe' || w === 'muato') {
        var pl = R.plateOf('shop'); ctx.save(); ctx.translate(fs.ox, fs.oy);
        SP.poly3(ctx, [[pl.gx0, L.rows * T, 0.4], [pl.gx1, L.rows * T, 0.4], [pl.gx1, (L.rows + 1) * T, 0.4], [pl.gx0, (L.rows + 1) * T, 0.4]], 'rgba(130,170,225,.32)');
        SP.poly3(ctx, [[0, (L.rows - 1) * T, 0.3], [L.cols * T, (L.rows - 1) * T, 0.3], [L.cols * T, L.rows * T, 0.3], [0, L.rows * T, 0.3]], 'rgba(130,170,225,.18)'); ctx.restore();
        var n = w === 'muato' ? 110 : 50; ctx.strokeStyle = w === 'muato' ? 'rgba(90,115,180,.6)' : 'rgba(110,140,200,.5)'; ctx.lineWidth = 1.2; ctx.beginPath();
        for (i = 0; i < n; i++) { var x = fs.x0 + ((i * 97.3 + tt * (140 + (i % 3) * 60)) % fs.w), y = fs.y0 + ((i * 53.7 + tt * (420 + (i % 4) * 90)) % fs.h); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13); }
        ctx.stroke();
      }
      if (w === 'may' || w === 'muanhe' || w === 'muato') { for (i = 0; i < 3; i++) { var cx = fs.x0 + ((i * 260 + tt * (6 + i * 3)) % (fs.w + 200)) - 100, cy = fs.y0 + fs.h * (0.35 + 0.18 * i); ctx.fillStyle = 'rgba(70,80,130,' + (w === 'muato' ? 0.12 : 0.07) + ')'; ctx.beginPath(); ctx.ellipse(cx, cy, 130, 45, -0.45, 0, 6.3); ctx.fill(); } }
      var tint = { nong: 'rgba(255,190,90,.08)', ret: 'rgba(130,160,240,.1)', nom: 'rgba(255,255,255,.16)', muato: 'rgba(50,60,110,.14)', muanhe: 'rgba(80,100,150,.06)' }[w];
      if (tint) { ctx.fillStyle = tint; ctx.fillRect(fs.x0, fs.y0, fs.w, fs.h); }
    },
    drawProp: function (ctx, p) {
      var x = p.x * T, y = p.y * T, iso = SP.isoBox;
      if (p.kind === 'sofa') { iso(ctx, x + 2, y + 6, p.w * T - 4, T - 10, 12, '#e99aae'); iso(ctx, x + 2, y + 3, p.w * T - 4, 9, 28, '#dc8aa0', 0, { noShadow: true }); iso(ctx, x + 6, y + 13, (p.w * T - 12) / 2 - 1, T - 22, 5, '#f4b6c2', 12, { noShadow: true }); iso(ctx, x + 7 + (p.w * T - 12) / 2, y + 13, (p.w * T - 12) / 2 - 1, T - 22, 5, '#f7c4cf', 12, { noShadow: true }); iso(ctx, x + 2, y + 6, 6, T - 10, 20, '#dc8aa0', 0, { noShadow: true }); iso(ctx, x + p.w * T - 8, y + 6, 6, T - 10, 20, '#d4809a', 0, { noShadow: true }); }
      else if (p.kind === 'table') { iso(ctx, x + 6, y + 8, T - 12, T - 16, 4, '#f0c9a0', 10); iso(ctx, x + 8, y + 10, 3, 3, 10, '#d9a97a', 0, { noShadow: true }); iso(ctx, x + T - 11, y + T - 13, 3, 3, 10, '#d9a97a', 0, { noShadow: true }); iso(ctx, x + 12, y + 14, 6, 6, 4, '#ffffff', 14, { noShadow: true }); iso(ctx, x + 22, y + 16, 5, 5, 3, '#8fcf7a', 14, { noShadow: true }); }
      else if (p.kind === 'armchair') { iso(ctx, x + 5, y + 5, T - 10, T - 8, 12, '#8fcf7a'); iso(ctx, x + 5, y + 5, T - 10, 8, 26, '#7bbd68', 0, { noShadow: true }); iso(ctx, x + 10, y + 13, T - 20, T - 19, 4, '#a8dc8c', 12, { noShadow: true }); }
      else if (p.kind === 'tallplant') { SP.plant(ctx, x, y, 1.15); }
    },
    // nhãn số lượng trên từng ô + highlight ô đang chọn / rê chuột / kéo thả
    thumbImg: function (sku) { R._ti = R._ti || {}; var im = R._ti[sku]; if (!im) { im = R._ti[sku] = new Image(); im.src = SP.skuThumb(sku, 48); } return im; },
    drawSlotLabels: function (ctx, ord) {
      var s = G.state, hl = null, selId = (G.ui.sheet2 && G.ui.sheet2.openFlag) ? G.ui.shelf.cur : null, fr = R.frames().shop;
      s.slots.forEach(function (sl) {
        var g = R.slotGeom(sl, ord); if (!g) return; var cx = g.sx - fr.ox, cy0 = g.sy - fr.oy, bed = !!g.bed, ay = SP.P(g.cx, g.cy, g.top + (bed ? 6 : 8))[1];
        if (sl.sku) {
          var stk = G.wh.lineStock(sl.sku), col = stk <= 0 ? '#E5384F' : stk <= 2 ? '#F2B91E' : '#1FAE74', code = SP.codeOf(sl.sku), txt = code + ' · ' + (stk <= 0 ? 'HẾT' : stk);
          ctx.font = 'bold 9px sans-serif'; var w = Math.max(30, ctx.measureText(txt).width + 12), sk0 = G.skus[sl.sku];
          SP.poly(ctx, [[cx - w / 2 + 3, ay - 7], [cx + w / 2 - 3, ay - 7], [cx + w / 2, ay - 3], [cx + w / 2 - 3, ay + 3], [cx - w / 2 + 3, ay + 3], [cx - w / 2, ay - 3]], col); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(txt, cx, ay + 0.6);
          if (sk0.cw && !bed) { ctx.beginPath(); ctx.arc(cx - w / 2 - 1, ay - 3, 5, 0, 6.3); ctx.fillStyle = sk0.cw.hex; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = sk0.cw.hex2; ctx.stroke(); }
        } else if (sl.last) { var im = R.thumbImg(sl.last); if (im.complete && im.naturalWidth) { var gs = bed ? 38 : 24; ctx.globalAlpha = 0.4; ctx.drawImage(im, cx - gs / 2, ay - gs - 2, gs, gs); ctx.globalAlpha = 1; } }
        if (sl.id === R.dragHover || sl.id === selId || sl.id === R.hoverSlot) hl = { sl: sl, g: g };
      });
      if (hl) {
        var g2 = hl.g, drag = hl.sl.id === R.dragHover, hs = hl.sl;
        SP.poly3(ctx, [[g2.gx - 1, g2.gy - 1, g2.z + 1], [g2.gx + g2.gw + 1, g2.gy - 1, g2.z + 1], [g2.gx + g2.gw + 1, g2.gy + g2.gd + 1, g2.z + 1], [g2.gx - 1, g2.gy + g2.gd + 1, g2.z + 1]], drag ? 'rgba(80,200,150,.4)' : 'rgba(255,208,107,.4)');
        var t1 = hs.sku ? G.skus[hs.sku].label : (hs.last ? 'Ô trống (trước: ' + G.skus[hs.last].label + ')' : 'Ô trống'), stkH = hs.sku ? G.wh.lineStock(hs.sku) : 0, t2 = hs.sku ? 'Mẫu: ' + SP.codeOf(hs.sku) + ' · tồn kho ' + stkH + ' · ' + G.fmt.short(G.pricing.effective(hs.sku)) + (hs.set ? ' · bộ ' + SP.codeOf(hs.set) : '') : (drag ? 'Thả để trưng bày mẫu' : 'Chạm để chọn mẫu trưng bày');
        ctx.font = 'bold 10px sans-serif'; var lw = Math.min(190, Math.max(ctx.measureText(t1).width, 70) + 14), lc = SP.P(g2.cx, g2.cy, g2.top + 22), lx = lc[0] - lw / 2, ly = lc[1] - 26;
        SP.poly(ctx, [[lx, ly], [lx + lw, ly], [lx + lw + 4, ly + 13], [lx + lw, ly + 26], [lx, ly + 26]], 'rgba(255,255,255,.96)', 'rgba(30,40,90,.3)'); ctx.fillStyle = '#2A3560'; ctx.textAlign = 'left'; ctx.fillText(t1.length > 30 ? t1.slice(0, 29) + '…' : t1, lx + 6, ly + 11); ctx.font = '9px sans-serif'; ctx.fillStyle = hs.sku && stkH <= 0 ? '#E5384F' : '#6C79A3'; ctx.fillText(t2, lx + 6, ly + 21);
      }
    },
    drawCust: function (ctx, c) {
      var pp = SP.P(c.x * T, c.y * T, 0), px = pp[0], py = pp[1] + 4, mood = 'neutral';
      if (c.state === 'paying' || c.state === 'toCounter' || (c.state === 'leave' && c.mood === 'happy')) mood = 'happy'; else if (c.state === 'leave' && c.mood === 'angry') mood = 'angry';
      SP.person(ctx, { x: px, y: py, shirt: c.shirt, skin: c.skin, hair: c.hair, hairStyle: c.hairStyle, moving: c.moving, phase: c.phase, face: c.face, bag: c.bag, mood: mood, role: 'customer' });
      var by = py - 50;
      if (c.state === 'wait' && !c.asked) SP.bubble(ctx, px, by, '💬', '#1e88e5');
      else if (c.state === 'wait') {
        SP.bubble(ctx, px, by, '❓', '#f57c00');
        var f = 1 - c.waited / c.patience;
        ctx.fillStyle = '#E3EBF7'; ctx.fillRect(px - 11, by - 22, 22, 3); ctx.fillStyle = f > 0.5 ? '#34C997' : f > 0.25 ? '#FF9A3D' : '#F0475B'; ctx.fillRect(px - 11, by - 22, 22 * Math.max(0, f), 3);
      } else if (c.state === 'browse') SP.bubble(ctx, px, by, '…', '#607d8b');
      else if (c.state === 'served') SP.bubble(ctx, px, by, '💬', '#1e88e5');
      else if (c.state === 'paying') SP.bubble(ctx, px, by, '😊', '#2e7d32');
      else if (c.state === 'leave' && c.mood === 'angry') SP.bubble(ctx, px, by, '😠', '#c62828');
      else if (c.state === 'leave' && c.mood === 'happy') SP.bubble(ctx, px, by, '😊', '#d81b60');
      if (c.black) { SP.poly(ctx, [[px - 12, py + 5], [px + 12, py + 5], [px + 15, py + 9], [px + 12, py + 14], [px - 12, py + 14], [px - 15, py + 9]], '#E53950'); ctx.fillStyle = '#fff'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ĐEN', px, py + 12); }
    },
    staffLook: function (e) {
      if (e.look) return e.look;
      var hairC = ['#3b2f4a', '#1f2a44', '#6d4c41', '#ff8a65', '#7e57c2', '#26a69a', '#c2185b', '#455a64'], skins = ['#f6c9a0', '#f1b98a', '#e0a070', '#fbd9bd'];
      var h = ((typeof e.id === 'number' ? e.id : 7) * 2654435761) >>> 0, L = { hairStyle: h % 5, hair: hairC[(h >> 3) % hairC.length], skin: skins[(h >> 6) % skins.length] };
      var r = e.role;
      if (r === 'sales') L.vest = e.color; else if (r === 'accountant') L.glasses = true; else if (r === 'delivery') L.hat = '#FFA726'; else if (r === 'manager') { L.tie = '#E5384F'; L.suit = true; } else if (r === 'b2b') L.suit = true; else if (r === 'warehouse') L.helmet = '#FFD93D'; else if (r === 'marketing') L.headset = '#EC407A';
      return (e.look = L);
    },
    drawStaff: function (ctx, e) {
      var pp = SP.P(e.x * T, e.y * T, 0), px = pp[0], py = pp[1] + 4, st = G.state, o = e.role === 'owner', L = o ? null : R.staffLook(e), pl = st.player || {};
      var mood = e.state === 'serving' ? 'happy' : 'neutral';
      var look = o ? { shirt: pl.outfit || '#FF7A6B', skin: '#f6c9a0', hair: pl.hair || '#3b2f4a', hairStyle: pl.hairStyle || 0, crown: true, apron: true } : { shirt: '#FFFFFF', band: e.color, skin: L.skin, hair: L.hair, hairStyle: L.hairStyle, vest: L.vest, glasses: L.glasses, hat: L.hat, tie: L.tie, suit: L.suit, helmet: L.helmet, headset: L.headset };
      look.x = px; look.y = py; look.moving = e.moving; look.phase = e.phase; look.face = e.face; look.mood = mood; look.role = e.role;
      SP.person(ctx, look);
      // thẻ tên bên dưới chân
      ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      var nm = (e.name || '').split(' ').pop(), w = ctx.measureText(nm).width + 10, col = o ? '#FF7A6B' : (e.color || '#2A3560');
      SP.poly(ctx, [[px - w / 2 + 2, py + 6], [px + w / 2 - 2, py + 6], [px + w / 2, py + 10], [px + w / 2 - 2, py + 15], [px - w / 2 + 2, py + 15], [px - w / 2, py + 10]], col);
      ctx.fillStyle = '#fff'; ctx.fillText(nm, px, py + 13);
      var by = py - 50;
      if (e.state === 'serving') SP.bubble(ctx, px, by, '💬', '#1e88e5');
      else if (e.state === 'idle' && !e.moving && !G.customers.list.some(function (c) { return c.state === 'wait'; })) SP.bubble(ctx, px, by, '💤', '#7C6BC4');
    }
  };
  G.on('truck', function () { R.truckT = 6; });
})();
