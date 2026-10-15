/* Đồng hồ game: 1 ngày = 13 giờ mở cửa (8h-21h) x 23s thật (1x) = ~5 phút. Hết ngày: xử lý báo cáo rồi sang ngày mới 8h. */
(function () {
  'use strict';
  var G = window.G;
  var C = G.clock = {
    SEC_PER_HOUR: 23, OPEN: 480, CLOSE: 1260,
    modalCount: 0, skipping: false,
    isPaused: function () { return G.state.speed === 0 || C.modalCount > 0; },
    setSpeed: function (s) { G.state.speed = s; G.emit('speed', s); },
    pushPause: function () { C.modalCount++; },
    popPause: function () { C.modalCount = Math.max(0, C.modalCount - 1); },
    isOpen: function () { var m = G.state.minute; return !G.state.prep && m >= C.OPEN && m < C.CLOSE; },
    // Pha chuẩn bị đầu ngày: đồng hồ đứng yên cho tới khi người chơi bấm "Mở cửa"
    openShop: function () { var s = G.state; if (!s.prep) return; s.prep = false; G.emit('shopOpen', { day: s.day }); },
    // tiến game `gm` phút game
    advance: function (gm) {
      var s = G.state, left = gm, guard = 0;
      if (s.prep) return;
      while (left > 1e-6 && guard++ < 400) {
        var step = Math.min(left, 5, C.CLOSE - s.minute);
        if (step <= 1e-9) { C.endDay(); if (s.prep) return; continue; }
        var h0 = Math.floor(s.minute / 60);
        s.minute += step;
        var h1 = Math.floor(s.minute / 60);
        for (var h = h0 + 1; h <= h1 && s.minute < C.CLOSE; h++) G.emit('hour', { hour: h, day: s.day });
        G.emit('tick', { gm: step, sec: step * C.SEC_PER_HOUR / 60 });
        left -= step;
        if (s.minute >= C.CLOSE - 1e-9) { C.endDay(); if (s.prep) return; }
      }
    },
    endDay: function () {
      var s = G.state;
      G.emit('dayEnd', { day: s.day });
      s.day++;
      s.minute = C.OPEN;
      if ((s.day - 1) % 30 === 0) G.emit('monthStart', { day: s.day });
      G.emit('dayStart', { day: s.day });
      G.emit('hour', { hour: 8, day: s.day });
      s.prep = C.skipping ? false : !G.settings.autoOpen;
      if (!s.prep) G.emit('shopOpen', { day: s.day });
      if (!C.skipping && G.save) G.save.save();
    },
    // lỗi vẽ: không để chết cả vòng lặp, hiện chi tiết lên canvas để chẩn đoán trên thiết bị
    showDrawError: function (e) {
      var msg = String(e && e.message || e), st = String(e && e.stack || '').split('\n').slice(0, 4).join('\n');
      if (C._lastErr !== msg) { C._lastErr = msg; try { console.error('[draw]', e); } catch (x) {} }
      try {
        var cv = document.getElementById('shop'), ctx = cv && cv.getContext('2d'); if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = '#c00'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
        var lines = ['LỖI VẼ: ' + msg].concat(st.split('\n').map(function (l) { return l.trim(); })).concat([navigator.userAgent, 'dpr=' + window.devicePixelRatio + ' win=' + innerWidth + 'x' + innerHeight + ' cv=' + cv.width + 'x' + cv.height]);
        var y = 22, maxW = cv.width - 16;
        lines.forEach(function (ln) { while (ln.length) { var n = ln.length; while (n > 1 && ctx.measureText(ln.slice(0, n)).width > maxW) n--; ctx.fillText(ln.slice(0, n), 8, y); y += 18; ln = ln.slice(n); } });
      } catch (x) {}
    },
    start: function () {
      var last = performance.now(), uiAcc = 0;
      function frame(ts) {
        var dt = Math.min(0.2, (ts - last) / 1000); last = ts;
        if (!C.isPaused()) C.advance(dt * G.state.speed * 60 / C.SEC_PER_HOUR);
        if (G.render && G.render.draw) { try { G.render.draw(dt); } catch (e) { C.showDrawError(e); } }
        uiAcc += dt;
        if (uiAcc > 0.25) { uiAcc = 0; try { G.emit('uiRefresh'); } catch (e) { C.showDrawError(e); } }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  };
})();
