/* Hồ sơ: tên cửa hàng, tên người chơi, ngoại hình chủ cửa hàng (chạy lần đầu, sửa lại bằng nút 👤) */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ player: { name: 'Minh', hairStyle: 0, hair: '#3b2f4a', outfit: '#FF7A6B', done: false } });
  var SHOPS = ['Vua Chăn Ga', 'Nhà Chăn Ấm', 'Giấc Mơ Xanh', 'Gối Đệm An Nhiên', 'Ga Gối Hạnh Phúc', 'Mây Trắng Bedding'];
  var NAMES = ['Minh', 'Lan', 'Hùng', 'Thảo', 'Bảo', 'Quỳnh', 'Khoa', 'Mai'];
  var HAIRS = ['#3b2f4a', '#1f2a44', '#6d4c41', '#ff8a65', '#7e57c2', '#26a69a', '#c2185b', '#ffca28'];
  var OUTFITS = ['#FF7A6B', '#4FC3F7', '#5EE0B4', '#FFD93D', '#B39DDB', '#FF9EB8', '#7C9BFF', '#FFA24D'];
  var P = G.profile = {
    open: false,
    clean: function (s, max) { return String(s || '').replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); },
    apply: function () {
      var s = G.state; s.ownerName = s.player.name;
      document.title = s.shopName + ' - Tycoon chăn ga gối đệm';
      G.emit('profileChanged');
    },
    show: function (first) {
      if (P.open) return; P.open = true; G.clock.pushPause();
      var s = G.state, pl = G.clone(s.player), shop = s.shopName;
      var root = document.createElement('div'); root.id = 'profile-root'; document.body.appendChild(root);
      function render() {
        root.innerHTML = '<div class="modal-back"><div class="modal profile"><h3>' + (first ? 'Chào mừng! Hãy tạo hồ sơ' : 'Hồ sơ cửa hàng') + '</h3>' +
          '<div class="pf-grid"><div><label class="pf-l">Tên cửa hàng<input id="pf-shop" maxlength="24" value="' + G.esc(shop) + '"></label>' +
          '<label class="pf-l">Tên của bạn (chủ cửa hàng)<input id="pf-name" maxlength="20" value="' + G.esc(pl.name) + '"></label>' +
          '<div class="pf-l">Kiểu tóc</div><div class="pf-row">' + [0, 1, 2, 3, 4].map(function (i) { return '<button class="chip' + (pl.hairStyle === i ? ' on' : '') + '" data-hs="' + i + '">' + ['Ngắn', 'Dài', 'Búi', 'Dựng', 'Bob'][i] + '</button>'; }).join('') + '</div>' +
          '<div class="pf-l">Màu tóc</div><div class="pf-row">' + HAIRS.map(function (c) { return '<button class="sw' + (pl.hair === c ? ' on' : '') + '" style="background:' + c + '" data-hc="' + c + '"></button>'; }).join('') + '</div>' +
          '<div class="pf-l">Màu áo</div><div class="pf-row">' + OUTFITS.map(function (c) { return '<button class="sw' + (pl.outfit === c ? ' on' : '') + '" style="background:' + c + '" data-oc="' + c + '"></button>'; }).join('') + '</div></div>' +
          '<div class="pf-prev"><canvas id="pf-cv" width="150" height="170"></canvas><div class="small muted">Vương miện &amp; tạp dề = chủ cửa hàng</div></div></div>' +
          '<div class="pf-err neg small" id="pf-err"></div>' +
          '<div class="modal-actions"><button class="btn" id="pf-rand">🎲 Gợi ý tên</button>' + (first ? '' : '<button class="btn" id="pf-cancel">Hủy</button>') + '<button class="btn primary" id="pf-ok">' + (first ? 'Bắt đầu!' : 'Lưu') + '</button></div></div></div>';
        draw();
        root.querySelectorAll('[data-hs]').forEach(function (b) { b.onclick = function () { keep(); pl.hairStyle = +b.dataset.hs; render(); }; });
        root.querySelectorAll('[data-hc]').forEach(function (b) { b.onclick = function () { keep(); pl.hair = b.dataset.hc; render(); }; });
        root.querySelectorAll('[data-oc]').forEach(function (b) { b.onclick = function () { keep(); pl.outfit = b.dataset.oc; render(); }; });
        root.querySelector('#pf-rand').onclick = function () { shop = G.pick(SHOPS); pl.name = G.pick(NAMES); render(); };
        var c = root.querySelector('#pf-cancel'); if (c) c.onclick = close;
        root.querySelector('#pf-ok').onclick = function () {
          keep(); var sn = P.clean(shop, 24), pn = P.clean(pl.name, 20), err = root.querySelector('#pf-err');
          if (sn.length < 2) { err.textContent = 'Tên cửa hàng cần từ 2 đến 24 ký tự.'; return; }
          if (pn.length < 1) { err.textContent = 'Hãy nhập tên của bạn (tối đa 20 ký tự).'; return; }
          s.shopName = sn; pl.name = pn; pl.done = true; s.player = pl; P.apply(); close(); if (first && P.onFirst) P.onFirst();
        };
      }
      function keep() { var a = root.querySelector('#pf-shop'), b = root.querySelector('#pf-name'); if (a) shop = a.value; if (b) pl.name = b.value; }
      function draw() {
        var cv = root.querySelector('#pf-cv'), dp = Math.min(3, window.devicePixelRatio || 1); cv.width = 150 * dp; cv.height = 170 * dp; cv.style.width = '150px'; cv.style.height = '170px'; var c = cv.getContext('2d'); c.scale(dp, dp); c.clearRect(0, 0, 150, 170);
        c.fillStyle = '#EAF6FF'; c.fillRect(0, 0, 150, 170); G.sprites.poly(c, [[0, 150], [150, 150], [150, 170], [0, 170]], '#D6CEF0');
        c.save(); c.translate(75, 140); c.scale(2.9, 2.9);
        G.sprites.person(c, { x: 0, y: 0, shirt: pl.outfit, skin: '#f6c9a0', hair: pl.hair, hairStyle: pl.hairStyle, crown: true, apron: true, face: 1, mood: 'happy', role: 'owner', phase: 0 });
        c.restore();
      }
      function close() { P.open = false; if (root.parentNode) root.parentNode.removeChild(root); G.clock.popPause(); if (G.ui.hud) G.ui.hud.update(); G.ui.panels.refresh(true); }
      render();
    }
  };
  G.on('init', function () { if (G.state.player.done || G.state.day > 1 || G.state.totalRevenue > 0) { G.state.player.done = true; } P.apply(); });
})();
