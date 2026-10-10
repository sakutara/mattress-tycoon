/* Tab Trang trí */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, bar = UI.bar, res = UI.res;
  function fx(d) {
    var a = [];
    if (d.tr) a.push('khách +' + (d.tr * 100).toFixed(1).replace('.0', '') + '%'); if (d.cv) a.push('chốt đơn +' + (d.cv * 100).toFixed(1).replace('.0', '') + '%');
    if (d.pa) a.push('kiên nhẫn +' + Math.round(d.pa * 100) + '%'); if (d.rt) a.push('đánh giá +' + d.rt + '★');
    if (d.season) Object.keys(d.season).forEach(function (k) { a.push({ cold: 'mùa lạnh', hot: 'mùa hè', tet: 'Tết' }[k] + ' khách +' + Math.round((d.season[k].tr || 0) * 100) + '%'); });
    return a.join(' · ');
  }
  function thumb(d, size, locked) { return '<span class="dthumbw' + (locked ? ' locked' : '') + '"><img class="dthumb" width="' + size + '" height="' + size + '" alt="' + E(d.name) + '" src="' + G.sprites.decorThumb(d, size) + '">' + (locked ? '<i>🔒</i>' : '') + '</span>'; }
  function detail(d) {
    var s = G.state, locked = s.level < d.level, layer = { wall: 'treo tường', flat: 'trải sàn (đi lên được)', ceil: 'treo trần', floor: 'đặt trên sàn (chiếm chỗ)' }[d.layer];
    return '<div class="card dpick"><div class="dcard">' + thumb(d, 112, locked) + '<div class="dinfo"><b>' + d.icon + ' ' + E(d.name) + '</b><div class="muted small">' + E(d.desc) + '</div>' +
      '<div class="small">Kích thước <b>' + d.w + '×' + d.h + '</b> ô · chiếm <b>' + d.slots + '</b> ô trang trí · ' + layer + '</div><div class="small pos">' + E(fx(d)) + '</div>' +
      '<div class="small">Giá <b>' + F.vnd(d.price) + '</b>' + (d.upkeep ? ' · duy trì <b>' + F.vnd(d.upkeep) + '/ngày</b>' : ' · không tốn duy trì') + ' · bán lại ' + F.short(d.price * G.decor.SELL_RATE) + '</div>' +
      '<div class="row"><button class="mini primary" data-act="dcBuy" data-id="' + d.id + '"' + (locked ? ' disabled' : '') + '>' + (locked ? '🔒 mở ở cấp ' + G.data.levels[d.level].name : 'Mua') + '</button></div></div></div></div>';
  }
  function decorTab() {
    var s = G.state, D = G.decor, h = '', a = D.agg(), bd = G.customers.breakdown();
    h += '<div class="card"><b>Ô trang trí: ' + D.slotsUsed() + '/' + D.slotsMax() + '</b> ' + bar(D.slotsUsed() / D.slotsMax()) + '<div class="small muted">Số ô tăng theo cấp cửa hàng. Đặt đồ trong pha chuẩn bị hoặc bất cứ lúc nào: bấm vào sơ đồ cửa hàng để đặt, bấm lại món đã đặt để chọn.</div>' +
      '<div class="small" style="margin-top:6px"><b>Tổng bonus:</b> khách <b class="pos">+' + (a.tr * 100).toFixed(1) + '%</b> · chốt đơn <b class="pos">+' + (a.cv * 100).toFixed(1) + '%</b> · kiên nhẫn <b class="pos">+' + Math.round(a.pa * 100) + '%</b> · đánh giá <b class="pos">+' + a.rt.toFixed(2) + '★</b>' + (a.upkeep ? ' · duy trì <b>' + F.vnd(a.upkeep) + '/ngày</b>' : '') + '</div>' +
      '<details class="det" data-key="trafficbd"' + (UI.st.open.trafficbd ? ' open' : '') + '><summary>Khách/giờ hiện tại: ' + bd.total.toFixed(1) + ' (xem chi tiết)</summary><table class="tbl small">' + bd.rows.map(function (r) { return '<tr><td>' + E(r[0]) + '</td><td class="r">' + E(r[1]) + '</td></tr>'; }).join('') + '</table></details></div>';
    if (D.placing) { var pi = D.item(D.placing), pd = G.decorById[pi.id]; h += '<div class="card warnbox"><div class="dcard">' + thumb(pd, 64) + '<div class="dinfo"><b>Đang đặt: ' + E(pd.name) + '</b> (' + pd.w + '×' + pd.h + ')<br><span class="small">Bấm lên sơ đồ cửa hàng. Xanh = đặt được, đỏ = không (đồ nội thất / lối đi / hết ô).</span><div class="row"><button class="mini" data-act="dcCancelPlace">Để vào kho (Esc)</button></div></div></div></div>'; }
    var sel = D.selected && D.item(D.selected);
    if (sel) { var sd = G.decorById[sel.id]; h += '<div class="card sel"><div class="dcard">' + thumb(sd, 96) + '<div class="dinfo"><b>' + sd.icon + ' ' + E(sd.name) + '</b> <span class="muted">(' + sel.x + ',' + sel.y + ')</span><div class="small">' + sd.w + '×' + sd.h + ' · ' + (sd.upkeep ? 'duy trì ' + F.vnd(sd.upkeep) + '/ngày' : 'không duy trì') + '</div><div class="small pos">' + E(fx(sd)) + '</div><div class="row"><button class="mini" data-act="dcMove" data-uid="' + sel.uid + '">Di chuyển</button><button class="mini danger" data-act="dcSell" data-uid="' + sel.uid + '">Bán lại ' + F.short(sd.price * D.SELL_RATE) + '</button><button class="mini" data-act="dcDesel">Bỏ chọn</button></div></div></div></div>'; }
    var inv = s.decor.items.filter(function (x) { return !x.placed && x.uid !== D.placing; });
    if (inv.length) h += '<h4>Trong kho (' + inv.length + ')</h4>' + inv.map(function (it) { var d = G.decorById[it.id]; return '<div class="card small"><div class="dcard">' + thumb(d, 48) + '<div class="dinfo"><b>' + d.icon + ' ' + E(d.name) + '</b> <span class="muted">' + d.w + '×' + d.h + '</span><div class="row"><button class="mini primary" data-act="dcPlace" data-uid="' + it.uid + '">Đặt</button><button class="mini danger" data-act="dcSell" data-uid="' + it.uid + '">Bán lại ' + F.short(d.price * D.SELL_RATE) + '</button></div></div></div></div>'; }).join('');
    var pl = D.placed();
    if (pl.length) h += '<h4>Đã đặt (' + pl.length + ')</h4>' + pl.map(function (it) { var d = G.decorById[it.id]; return '<div class="card small clk' + (D.selected === it.uid ? ' sel' : '') + '"><div class="dcard" data-act="dcSel" data-uid="' + it.uid + '">' + thumb(d, 48) + '<div class="dinfo"><b>' + d.icon + ' ' + E(d.name) + '</b> <span class="muted">(' + it.x + ',' + it.y + ')</span><div class="muted">' + E(fx(d)) + '</div></div></div></div>'; }).join('');
    var pick = G.decorById[UI.st.decorPick]; if (!pick || (s.level < pick.level && !G.unlock.showAll('decor'))) pick = G.data.decor.filter(function (d) { return s.level >= d.level; })[0];
    h += '<h4>Cửa hàng đồ trang trí</h4>' + detail(pick) + '<div class="dgrid">' + G.data.decor.filter(function (d) { return s.level >= d.level || G.unlock.showAll('decor'); }).map(function (d) {
      var locked = s.level < d.level;
      return '<button class="dtile' + (pick.id === d.id ? ' on' : '') + (locked ? ' lk' : '') + '" data-act="dcPick" data-id="' + d.id + '">' + thumb(d, 64, locked) + '<span class="dn">' + E(d.name) + '</span><span class="dp">' + F.short(d.price) + '</span></button>';
    }).join('') + '</div>' + G.unlock.teaser('decor', G.data.decor.some(function (d) { return s.level < d.level; })) + '<p class="muted small">Nhiều món cùng loại hiệu quả giảm dần (×0,6 mỗi bản thêm); các món khác loại cộng dồn kiểu giảm dần.</p>';
    return h;
  }
  P.act.dcPick = function (el) { UI.st.decorPick = el.dataset.id; };
  P.act.dcSel = function (el) { G.decor.selected = +el.dataset.uid; };
  P.act.dcDesel = function () { G.decor.selected = null; };
  P.act.dcBuy = function (el) { var r = G.decor.buy(el.dataset.id); res(r); };
  P.act.dcPlace = function (el) { G.decor.placing = +el.dataset.uid; };
  P.act.dcCancelPlace = function () { G.decor.placing = null; };
  P.act.dcMove = function (el) { var uid = +el.dataset.uid; G.decor.pickUp(uid); G.decor.placing = uid; };
  P.act.dcSell = function (el) { var uid = +el.dataset.uid; if (confirm('Bán lại với giá 60% giá mua?')) res(G.decor.sell(uid)); };
  P.register({ id: 'decor', label: 'Trang trí', after: 'price', render: decorTab, badge: function () { return G.decor.placing ? '!' : ''; } });
})();
