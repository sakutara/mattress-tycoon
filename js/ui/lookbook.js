/* Lookbook: tạp chí giường ngủ - bìa (collage) + trang theo bộ sưu tập; tranh phòng ngủ isometric đúng màu (vẽ lười, cache); đơn khách / hết hàng được ưu tiên; bộ lọc; phím mũi tên. */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, SP = G.sprites, T = SP.T;
  function I() { return G.icon.apply(null, arguments); }
  G.addDefaults({ lookbook: { boostDay: 0, boostUntil: 0, opened: 0 } });
  function hexRGB(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { var x = hexRGB(a), y = hexRGB(b), f = function (i) { return Math.round(x[i] + (y[i] - x[i]) * t); }; return 'rgb(' + f(0) + ',' + f(1) + ',' + f(2) + ')'; }
  function mixHex(a, b, t) { var x = hexRGB(a), y = hexRGB(b), f = function (i) { var v = Math.round(x[i] + (y[i] - x[i]) * t); return ('0' + v.toString(16)).slice(-2); }; return '#' + f(0) + f(1) + f(2); }
  function hash(s) { var h = 0, i; for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  var LB = G.lookbook = {
    boostActive: function () { var l = G.state.lookbook; return l.boostDay === G.state.day && G.state.minute < l.boostUntil; },
    season: function (day) { var m = G.cal.moy(day), y = 2027 + Math.floor((day - 1) / 360); return (m >= 3 && m <= 8 ? 'Xuân Hè ' : 'Thu Đông ') + y; },
    STORY: ['Lấy cảm hứng từ những buổi sáng chủ nhật lười, {n} mang {mat} mềm mịn vào giấc ngủ của bạn.', 'Một bảng màu dịu nhẹ cho căn phòng ngủ thêm bình yên: {n} - chất liệu {mat}, dễ giặt, giữ màu bền.', '{n} kể câu chuyện về sự giản dị: đường may tỉ mỉ, {mat} thoáng khí, hợp mọi mùa.', 'Phối cùng ánh đèn vàng ấm và cây xanh, {n} biến phòng ngủ thành góc chill của riêng bạn.', 'Bộ sưu tập {n}: nhẹ như mây, êm như nắng sớm - {mat} cao cấp được chọn lọc kỹ.'],
    rep: function (line) { return line.skus.filter(function (k) { return k.size === '1m6'; })[0] || line.skus[0]; },
    // số đơn khách đang chờ 1 màu (cọc đã nhận / B2B / livestream) + lượt khách hỏi hết hàng 7 ngày
    orderCount: function (line) {
      var s = G.state, n = 0;
      s.special.list.forEach(function (o) { if ((o.status === 'Đã nhận cọc' || o.status === 'Chờ xử lý') && G.skus[o.sku] && G.skus[o.sku].line === line.id) n += o.qty || 1; });
      s.b2b.orders.forEach(function (o) { if (o.status === 'Đang thực hiện') o.items.forEach(function (i) { if (G.skus[i.sku] && G.skus[i.sku].line === line.id && i.qty - i.done > 0) n += 1; }); });
      s.live.sessions.forEach(function (x) { if (x.status === 'Đã đặt' && (x.feat || []).some(function (k) { return G.skus[k] && G.skus[k].line === line.id; })) n += 1; });
      return n;
    },
    lostCount: function (line) { var s = G.state, n = 0; s.lostLog.forEach(function (e) { if (s.day - e.day <= 7 && G.skus[e.sku] && G.skus[e.sku].line === line.id) n += e.n || 1; }); return n; },
    collections: function () {
      var map = {}, out = [], s = G.state;
      G.lineList.forEach(function (l) {
        if (l.type !== 'ga' || !G.brandAvail(l.brand)) return;
        var id = l.family + '|' + l.gen; if (!map[id]) { map[id] = { id: id, brand: l.brand, name: l.baseName, gen: l.gen, relDay: l.relDay || 0, lines: [] }; out.push(map[id]); }
        map[id].lines.push(l);
      });
      out.forEach(function (c) {
        var h = hash(c.id); c.story = LB.STORY[h % LB.STORY.length].replace('{n}', '“' + c.name + '”').replace('{mat}', (c.lines[0].cw.mat || 'cotton')); c.season = LB.season(c.relDay || s.day); c.variant = h % 4;
        c.cust = 0; c.lost = 0; c.shown = false; c.out = false; c.isNew = !!c.relDay && s.day - c.relDay <= 45;
        c.lines.forEach(function (l) { c.cust += LB.orderCount(l); c.lost += LB.lostCount(l); if (G.shelf.isShown(LB.rep(l).id)) c.shown = true; if (G.wh.lineStock(LB.rep(l).id) <= 0) c.out = true; });
      });
      out.sort(function (a, b) { return ((b.cust > 0 || b.lost > 0) - (a.cust > 0 || a.lost > 0)) || (b.cust * 3 + b.lost) - (a.cust * 3 + a.lost) || b.relDay - a.relDay || (G.brandById[b.brand].tier || 0) - (G.brandById[a.brand].tier || 0); });
      return out;
    }
  };
  // ---------- tranh phòng ngủ isometric ----------
  var ARTC = {}, ARTU = {};
  function artCanvas(skuId, w, h, variant) {
    var r = Math.min(2, Math.max(1, Math.ceil(window.devicePixelRatio || 1))), t = G.skus[skuId], cw = t.cw || { hex: '#f6c7d6', hex2: '#e48caa', pat: 'tron', code: 'XX' };
    var key = skuId.split('|')[0] + '|' + cw.hex + cw.hex2 + '@' + w + 'x' + h + 'v' + variant + 'r' + r; if (ARTC[key]) return ARTC[key];
    var cv = document.createElement('canvas'); cv.width = Math.round(w * r); cv.height = Math.round(h * r); var c = cv.getContext('2d'); c.scale(r, r);
    var g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, mix(cw.hex, '#ffffff', 0.55)); g.addColorStop(1, '#fdeee2'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (var i = 0; i < 7; i++) { var tx = (i * 83 + 20) % w, ty = (i * 47) % (h * 0.5); SP.poly(c, [[tx, ty], [tx + 90, ty + 30], [tx + 20, ty + 80]], 'rgba(255,255,255,' + (0.1 + 0.05 * (i % 3)) + ')'); }
    // khung cảnh 6x6 ô: rộng ~370, cao ~280 (tường 84 + nền 188)
    var sc = Math.min((w - 16) / 372, (h - 14) / 284); c.save(); c.translate(w / 2, (h - 284 * sc) / 2 + 92 * sc); c.scale(sc, sc);
    var C = 6, Rr = 6, wallc = mixHex('#f7efe9', cw.hex, 0.16), wallL = mixHex('#f2e6dc', cw.hex, 0.12), rug1 = mixHex('#ffffff', cw.hex2, 0.45), rug2 = mixHex('#ffffff', cw.hex2, 0.22);
    SP.plate(c, -0.3 * T, -0.3 * T, (C + 0.3) * T, (Rr + 0.3) * T, 12, '#f7d2b8', '#e9b79f', '#d79f8d');
    SP.woodFloor(c, 0, 0, C, Rr);
    SP.isoDiamond(c, 0.7 * T, 1.2 * T, 4.6 * T, 4.2 * T, 0.3, rug1); SP.isoDiamond(c, 0.95 * T, 1.45 * T, 4.1 * T, 3.7 * T, 0.4, rug2);
    SP.leftWall(c, Rr, 84, wallL, null); SP.backWall(c, C, 84, wallc);
    SP.window(c, 'b', 1.0 * T, 8, 60, 34, 36); SP.window(c, 'b', 4.0 * T, 8, 60, 34, 36); SP.window(c, 'l', 2.4 * T, 8, 60, 34, 36);
    var tp = function (u, v) { return SP.wallBack(2.35 * T, u, v); };       // tranh trên đầu giường tông theo màu
    SP.poly(c, [tp(0, 52), tp(34, 52), tp(34, 74), tp(0, 74)], '#f0c06a'); SP.poly(c, [tp(3, 55), tp(31, 55), tp(31, 71), tp(3, 71)], mixHex(cw.hex, '#ffffff', 0.35)); SP.poly(c, [tp(3, 55), tp(17, 55), tp(10, 66)], cw.hex2); SP.poly(c, [tp(16, 55), tp(31, 55), tp(31, 63), tp(24, 66)], mixHex(cw.hex2, '#ffffff', 0.3));
    var lamp = mixHex('#fff3c4', cw.hex, 0.25); var glow = hexRGB(mixHex('#ffeeb0', cw.hex, 0.3)).join(',');
    SP.bed(c, { x: 2.2, y: 1.6, w: 2, h: 2 }, { sku: 'l1_dem|1m6', set: skuId });
    SP.nightstand(c, 1.2 * T, 1.7 * T); SP.nightstand(c, 4.4 * T, 1.7 * T); SP.glow(c, 1.7 * T, 2.2 * T, 16, 44, glow, 0.42); SP.glow(c, 4.9 * T, 2.2 * T, 16, 44, glow, 0.42);
    var lm = SP.P(1.7 * T, 2.2 * T, 28); c.fillStyle = lamp; c.beginPath(); c.arc(lm[0], lm[1], 3.4, 0, 6.3); c.fill();
    SP.plant(c, 0.3 * T, 4.9 * T, 1.15);
    if (variant === 0) { SP.isoBox(c, 0.8 * T, 3.4 * T, 0.8 * T, 0.8 * T, 12, cw.hex2); SP.isoBox(c, 0.84 * T, 3.44 * T, 0.72 * T, 0.72 * T, 4, cw.hex, 12, { noShadow: true, facet: true }); SP.plant(c, 4.9 * T, 4.9 * T, 1); }
    else if (variant === 1) { SP.isoBox(c, 2.25 * T, 3.35 * T, 1.9 * T, 0.5 * T, 10, mixHex(cw.hex, '#c9a27a', 0.3)); SP.isoBox(c, 2.3 * T, 3.4 * T, 1.8 * T, 0.4 * T, 3, cw.hex2, 10, { noShadow: true }); var fl = SP.P(5.3 * T, 4.8 * T, 0), ft = SP.P(5.3 * T, 4.8 * T, 70); c.strokeStyle = '#8d86a8'; c.lineWidth = 2; c.beginPath(); c.moveTo(fl[0], fl[1]); c.lineTo(ft[0], ft[1]); c.stroke(); SP.poly(c, [[ft[0] - 11, ft[1] + 4], [ft[0] + 11, ft[1] + 4], [ft[0] + 7, ft[1] - 10], [ft[0] - 7, ft[1] - 10]], lamp); SP.glow(c, 5.3 * T, 4.8 * T, 0.5, 48, glow, 0.25); }
    else if (variant === 2) { SP.isoBox(c, 4.8 * T, 3.6 * T, 0.9 * T, 0.9 * T, 5, cw.hex2); SP.isoBox(c, 4.88 * T, 3.68 * T, 0.7 * T, 0.7 * T, 9, mixHex(cw.hex, '#ffffff', 0.2), 5, { noShadow: true, facet: true }); var pt = SP.P(3.2 * T, 3.5 * T, 96), pm = SP.P(3.2 * T, 3.5 * T, 66); c.strokeStyle = '#a99fb4'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(pt[0], pt[1]); c.lineTo(pm[0], pm[1]); c.stroke(); SP.poly(c, [[pm[0] - 12, pm[1] + 4], [pm[0] + 12, pm[1] + 4], [pm[0] + 7, pm[1] - 9], [pm[0] - 7, pm[1] - 9]], lamp); SP.glow(c, 3.2 * T, 3.5 * T, 0.5, 58, glow, 0.3); SP.plant(c, 5.1 * T, 5.2 * T, 0.95); }
    else { var cl = function (u, v) { return SP.wallBack(1.0 * T, u, v); }; SP.poly(c, [cl(-6, 76), cl(10, 76), cl(10, 4), cl(-6, 4)], mixHex(cw.hex, '#ffffff', 0.2)); SP.poly(c, [cl(52, 76), cl(68, 76), cl(68, 4), cl(52, 4)], mixHex(cw.hex, '#ffffff', 0.2)); SP.isoDiamond(c, 1.6 * T, 3.2 * T, 2.4 * T, 1.6 * T, 0.5, mixHex(cw.hex2, '#ffffff', 0.3)); SP.plant(c, 5.0 * T, 5.0 * T, 1.05); }
    c.restore();
    return (ARTC[key] = cv);
  }
  SP.bedroomArtCanvas = artCanvas;
  SP.bedroomArt = function (skuId, w, h, variant) { w = w || 480; h = h || 300; variant = variant == null ? hash(G.skus[skuId].line) % 4 : variant; var k = skuId.split('|')[0] + '@' + w + 'x' + h + 'v' + variant + (window.devicePixelRatio || 1) + G.skus[skuId].cw.hex; return ARTU[k] || (ARTU[k] = artCanvas(skuId, w, h, variant).toDataURL()); };
  SP.bedroomArt.cache = ARTC;
  // bìa: collage tối đa 3 minh họa
  var COV = {};
  function collage(cols, w, h) {
    var list = cols.slice(0, 3), key = list.map(function (c) { return c.id + (UI.lb.sel[c.id] || ''); }).join(',') + '@' + w + (window.devicePixelRatio || 1); if (COV[key]) return COV[key];
    var r = Math.min(2, Math.max(1, Math.ceil(window.devicePixelRatio || 1))), cv = document.createElement('canvas'); cv.width = w * r; cv.height = h * r; var c = cv.getContext('2d'); c.scale(r, r);
    var g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#fdeadf'); g.addColorStop(1, '#f4d6ea'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    var pos = [[0.02, 0.1, 0.62, -0.03], [0.4, 0.02, 0.5, 0.04], [0.45, 0.5, 0.5, -0.02]];
    list.forEach(function (col, i) {
      var ln = (UI.lb.sel[col.id] && G.lines[UI.lb.sel[col.id]]) || col.lines[0], iw = Math.round(w * pos[i][2]), ih = Math.round(iw * 0.62), art = artCanvas(LB.rep(ln).id, 360, 224, col.variant);
      c.save(); c.translate(w * pos[i][0] + iw / 2, h * pos[i][1] + ih / 2); c.rotate(pos[i][3]); c.shadowColor = 'rgba(80,60,60,.3)'; c.shadowBlur = 8; c.shadowOffsetY = 3; c.fillStyle = '#fff'; c.fillRect(-iw / 2 - 5, -ih / 2 - 5, iw + 10, ih + 10); c.shadowColor = 'transparent'; c.drawImage(art, -iw / 2, -ih / 2, iw, ih); c.restore();
    });
    return (COV[key] = cv.toDataURL());
  }
  // ---------- giao diện ----------
  UI.lb = UI.lb || { sel: {}, f: 'all' };
  function bodyHtml(c) {
    var cur = UI.lb.sel[c.id] || c.lines[0].id, ln = G.lines[cur], rep = LB.rep(ln), br = G.brandById[c.brand], oc = LB.orderCount(ln), lc = LB.lostCount(ln);
    return '<div class="lb-brand" style="color:' + br.color + '">' + E(br.name) + '</div><h2>' + E(c.name) + '</h2><div class="lb-cur"><b>' + E(ln.cw.code) + '</b> · ' + E(ln.cw.name) + ' · ' + E(ln.cw.mat) + ' · ' + E(G.data.cwPatterns[ln.cw.pat]) + ' · bộ ' + ln.cw.pieces + ' món</div>' +
      '<div class="lb-chips">' + (oc ? '<span class="chipx neg">' + I('gift', 11) + ' đang có khách đặt: ' + oc + '</span>' : '') + (lc ? '<span class="chipx warn">' + lc + ' khách hỏi hết hàng (7 ngày)</span>' : '') + (G.shelf.isShown(rep.id) ? '<span class="chipx pos">đang trưng bày</span>' : '') + '</div>' +
      '<p class="lb-story">' + E(c.story) + '</p><div class="lb-sw">' + c.lines.map(function (l) { var st = G.wh.lineStock(LB.rep(l).id), o = LB.orderCount(l); return '<button class="lb-s' + (l.id === cur ? ' on' : '') + '" data-lb="cw" data-coll="' + E(c.id) + '" data-line="' + l.id + '"><i style="background:' + l.cw.hex + ';border-color:' + l.cw.hex2 + '"></i><b>' + E(l.cw.code) + '</b><small>' + E(l.cw.name) + '</small><em class="' + (st ? '' : 'neg') + '">' + (st ? 'còn ' + st : 'hết') + (o ? ' · ' + o + ' đơn' : '') + '</em></button>'; }).join('') + '</div>' +
      '<div class="lb-price">Từ <b>' + F.short(rep.list) + '</b> (1m6) · ' + G.life.badge(G.life.stageOfLine(ln.id)) + ' · tồn kho <b>' + G.wh.lineStock(rep.id) + '</b> bộ</div>' +
      '<div class="row"><button class="btn primary" data-lb="show" data-line="' + ln.id + '">' + I('shop', 16) + ' Trưng bày mẫu này</button><button class="btn" data-lb="buy" data-line="' + ln.id + '">' + I('cart', 16) + ' Nhập hàng</button></div>';
  }
  function pageHtml(c) {
    var cur = UI.lb.sel[c.id] || c.lines[0].id, rep = LB.rep(G.lines[cur]);
    return '<section class="lb-page" data-coll="' + E(c.id) + '"><div class="lb-art"><div class="lb-ph">Đang vẽ minh họa…</div><img alt="" data-sku="' + E(rep.id) + '" data-v="' + c.variant + '"><span class="lb-badge">' + E(c.season) + '</span>' + (c.isNew ? '<span class="lb-new">MỚI</span>' : '') + ((c.cust || c.lost) ? '<span class="lb-hot">' + I('gift', 12) + ' ' + (c.cust ? c.cust + ' đơn khách' : c.lost + ' khách hỏi') + '</span>' : '') + '</div><div class="lb-body">' + bodyHtml(c) + '</div></section>';
  }
  function coverHtml(cols) {
    return '<section class="lb-page lb-cover"><div class="lb-art"><div class="lb-ph">Đang vẽ…</div><img alt="" data-cover="1"></div><div class="lb-body"><div class="lb-brand">LOOKBOOK</div><h1>' + E(G.state.shopName || 'Cửa hàng') + '</h1><div class="lb-cur">' + E(LB.season(G.state.day)) + ' · ' + cols.length + ' bộ sưu tập</div><p class="lb-story">Bộ sưu tập chăn ga gối của cửa hàng. Vuốt ngang hoặc bấm ← → để lật trang, chạm mã màu để xem phòng ngủ phối đúng màu. Các bộ sưu tập có khách đặt / khách hỏi hết hàng nằm đầu sách.</p><div class="small muted">Lật sang phải ' + I('arrowr', 14) + '</div></div></section>';
  }
  var FILTERS = [['all', 'Tất cả'], ['new', 'Mới'], ['cust', 'Có khách đặt'], ['out', 'Hết hàng'], ['shown', 'Đang trưng bày']];
  function filtered(all) { var f = UI.lb.f; return all.filter(function (c) { return f === 'all' || (f === 'new' && c.isNew) || (f === 'cust' && (c.cust > 0 || c.lost > 0)) || (f === 'out' && c.out) || (f === 'shown' && c.shown); }); }
  function paintArt(root) { // vẽ lười: trang đang xem và 2 trang bên cạnh
    var pg = root.querySelector('#lb-pages'), i = Math.round(pg.scrollLeft / Math.max(1, pg.clientWidth)), secs = pg.children, cols = UI.lb.cols;
    [i, i + 1, i - 1].forEach(function (k, n) { var sec = secs[k]; if (!sec) return; var img = sec.querySelector('img'); if (!img || img.dataset.done) return; img.dataset.done = '1';
      setTimeout(function () { if (!document.body.contains(img)) return; if (img.dataset.cover) img.src = collage(cols, 480, 300); else img.src = SP.bedroomArt(img.dataset.sku, 480, 300, +img.dataset.v); img.onload = function () { img.classList.add('on'); var ph = img.parentNode.querySelector('.lb-ph'); if (ph) ph.style.display = 'none'; }; }, n * 30); });
  }
  UI.openLookbook = function (collId) {
    var old = document.getElementById('lookbook'); if (old) old.remove();
    var all = LB.collections(), root = document.createElement('div'); root.id = 'lookbook'; root.className = 'lb'; root.tabIndex = -1; root.setAttribute('data-noicon', ''); root.setAttribute('role', 'dialog');
    document.body.appendChild(root); UI.lb.all = all;
    var st = G.state.lookbook; st.boostDay = G.state.day; st.boostUntil = G.state.minute + 90; st.opened++;
    function build(goto) {
      var cols = filtered(all); UI.lb.cols = cols;
      root.innerHTML = '<div class="lb-top"><b>' + I('book', 18) + ' Lookbook</b><span id="lb-ct"></span><button class="icon" data-lb="close" aria-label="Đóng">✕</button></div><div class="lb-filters">' + FILTERS.map(function (x) { return '<button class="chip' + (UI.lb.f === x[0] ? ' on' : '') + '" data-lb="f" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="lb-pages" id="lb-pages">' + coverHtml(cols) + (cols.length ? cols.map(pageHtml).join('') : '<section class="lb-page"><div class="lb-body"><p class="muted">Không có bộ sưu tập phù hợp bộ lọc.</p></div></section>') + '</div><div class="lb-dots" id="lb-dots">' + [0].concat(cols).map(function (c, i) { return '<i data-i="' + i + '"></i>'; }).join('') + '</div>';
      var pg = root.querySelector('#lb-pages'); pg.addEventListener('scroll', function () { clearTimeout(pg._t); pg._t = setTimeout(sync, 40); });
      if (goto != null) { var i = cols.findIndex(function (c) { return c.id === goto; }); if (i >= 0) pg.scrollLeft = (i + 1) * pg.clientWidth; }
      sync(); root.focus();
    }
    function sync() { var pg = root.querySelector('#lb-pages'); if (!pg) return; var n = pg.children.length, i = Math.round(pg.scrollLeft / Math.max(1, pg.clientWidth)); [].forEach.call(root.querySelectorAll('#lb-dots i'), function (d, k) { d.classList.toggle('on', k === i); }); var ct = root.querySelector('#lb-ct'); if (ct) ct.textContent = (i + 1) + '/' + n; paintArt(root); }
    function go(k) { var pg = root.querySelector('#lb-pages'); if (!pg) return; var n = pg.children.length; k = Math.max(0, Math.min(n - 1, k)); pg.scrollLeft = k * pg.clientWidth; sync(); }
    function cur() { var pg = root.querySelector('#lb-pages'); return Math.round(pg.scrollLeft / Math.max(1, pg.clientWidth)); }
    function close() { document.removeEventListener('keydown', onKey, true); root.remove(); }
    function onKey(e) {
      if (!document.body.contains(root)) { document.removeEventListener('keydown', onKey, true); return; }
      if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
      var k = e.key, used = true;
      if (k === 'ArrowRight' || k === 'PageDown') go(cur() + 1); else if (k === 'ArrowLeft' || k === 'PageUp') go(cur() - 1); else if (k === 'Home') go(0); else if (k === 'End') go(1e6); else if (k === 'Escape') close(); else used = false;
      if (used) { e.preventDefault(); e.stopPropagation(); }
    }
    document.addEventListener('keydown', onKey, true);
    root.addEventListener('click', function (e) {
      var d = e.target.closest('#lb-dots i'); if (d) { go(+d.dataset.i); return; }
      var b = e.target.closest('[data-lb]'); if (!b) return; var a = b.dataset.lb, ln = G.lines[b.dataset.line];
      if (a === 'close') close();
      else if (a === 'f') { UI.lb.f = b.dataset.v; build(); }
      else if (a === 'cw') { UI.lb.sel[b.dataset.coll] = b.dataset.line; var sec = b.closest('.lb-page'), c = UI.lb.cols.filter(function (x) { return x.id === b.dataset.coll; })[0]; sec.querySelector('.lb-body').innerHTML = bodyHtml(c); var img = sec.querySelector('img'), ph = sec.querySelector('.lb-ph'); img.dataset.sku = LB.rep(G.lines[b.dataset.line]).id; img.classList.remove('on'); requestAnimationFrame(function () { img.src = SP.bedroomArt(img.dataset.sku, 480, 300, +img.dataset.v); img.onload = function () { img.classList.add('on'); if (ph) ph.style.display = 'none'; }; }); }
      else if (a === 'show') { var r = LB.display(LB.rep(ln).id); G.notify.toast(E(r.msg), r.ok ? 'good' : 'warn'); }
      else if (a === 'buy') { LB.buy(ln); close(); }
    });
    build(collId);
  };
  // trưng bày mẫu: ưu tiên giường chưa phủ bộ, rồi ô kệ trống
  LB.display = function (skuId) {
    var s = G.state, W = G.wh;
    if (!W.pickSize(skuId)) return { ok: false, msg: 'Kho chưa có bộ này - hãy nhập ít nhất 1 bộ làm mẫu' };
    var bed = s.slots.filter(function (x) { return x.kind === 'bed' && x.sku && !x.set; })[0] || s.slots.filter(function (x) { return x.kind === 'bed' && x.sku; })[0];
    if (bed) return G.shelf.assignSet(bed.id, skuId);
    var sl = s.slots.filter(function (x) { return x.kind === 'shelf' && !x.sku; })[0];
    return sl ? G.shelf.assign(sl.id, skuId) : { ok: false, msg: 'Không còn ô trống - gỡ bớt một mẫu cũ' };
  };
  LB.buy = function (line) {
    var c = G.state.cart, rep = LB.rep(line); c.source = line.brand === 'cho' ? 'cho' : line.brand === 'own' ? 'oem' : 'daily'; G.purchasing.cartAdd(c.source, rep.id, 5); UI.st.buyBrand = line.brand; P.show('buy');
  };
  // ---- thông báo BST mới có minh họa ----
  G.on('lineReleased', function (e) {
    if (!e.line || e.line.type !== 'ga') return;
    var s = G.state, ln = e.lines[0], rep = LB.rep(ln), br = G.brandById[e.brand], coll = e.line.family + '|' + e.line.gen;
    var offer = s.camp.offers.filter(function (o) { return o.lineId === ln.id; })[0];
    G.notify.modal({
      title: 'Hãng ' + br.short + ' ra mắt BST mới', def: 3, sound: 'good',
      html: '<img class="lb-modal-img" alt="" src="' + SP.bedroomArt(rep.id, 480, 300) + '"><p><b>' + E(ln.baseName) + '</b> · ' + E(LB.season(s.day)) + '<br>' + e.lines.map(function (l) { return '<span class="swt" style="background:' + l.cw.hex + ';border-color:' + l.cw.hex2 + '"></span><b>' + E(l.cw.code) + '</b> ' + E(l.cw.name); }).join(' · ') + '</p><p class="small muted">Dòng cũ lùi xuống. Đã thêm trang mới vào Lookbook.</p>',
      choices: [{ label: 'Xem Lookbook', cls: 'primary', fn: function () { UI.openLookbook(coll); } }, { label: 'Tổ chức sự kiện ra mắt', fn: function () { if (offer && UI.openCamp) UI.openCamp(offer.id); } }, { label: 'Nhập hàng mẫu', fn: function () { LB.buy(ln); } }, { label: 'Đóng' }]
    });
  });
})();
