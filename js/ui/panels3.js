/* Tab Giao hàng (ship + đơn đặt cọc) và Đơn lớn (B2B) */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, opts = UI.opts, res = UI.res;
  function grid(items) { return UI.itemGrid(items.map(function (i) { return { sku: i.sku, qty: i.qty, defect: !!i.defect }; })); }
  function itemsTxt(items) { return items.map(function (i) { return E(G.skus[i.sku].label) + ' ×' + i.qty; }).join(', '); }
  var STC = { 'Chờ đặt': 'st-wait', 'Giao sáng mai': 'st-wait', 'Chờ lấy': 'st-wait', 'Đang giao': 'st-go', 'Đã giao': 'st-ok', 'Thất bại': 'neg', 'Hủy': 'neg' };

  function depStockHtml(o) {
    var D = G.deposits, st = D.stock(o), k = G.skus[o.sku], open = o.status === 'Đã nhận cọc' || o.status === 'Chờ xử lý', h = '';
    var cls = st.ok ? 'pos' : st.status === 'part' ? 'warn' : 'neg';
    var sub = 'cần ' + st.qty + (st.held ? ' · giữ ' + st.held : '');
    h += '<div class="irow">' + UI.itemTile({ sku: o.sku, qty: st.qty, sub: sub }) + '<div style="min-width:0"><b>' + E(k.label) + '</b> <span class="chipx ' + cls + '">' + E(st.label) + '</span>' +
      '<div class="muted small">Kho cửa hàng <b>' + st.st + '</b> · mẫu trưng bày <b>' + G.state.slots.filter(function (x) { return x.sku === o.sku || x.set === o.sku; }).length + '</b>' + st.ext.map(function (x) { return ' · ' + E(x.name) + ' <b>' + x.n + '</b>'; }).join('') + '</div>' +
      '<div class="muted small">Đang về: ' + (st.inc.length ? st.inc.map(function (x) { return '<b>' + x.qty + '</b> (đơn #' + x.id + (x.mine ? ' cho đơn này' : '') + ', ' + (x.day === G.state.day ? G.cal.hm(x.min) + ' hôm nay' : 'ngày ' + x.day) + (x.express ? ' ⚡' : '') + ')'; }).join(', ') : '0') + '</div>' +
      '<div class="muted small">Đã giữ chỗ cho đơn cọc khác / đơn lớn: <b>' + st.reserved + '</b> · còn rảnh: <b>' + st.free + '</b>' + (st.short ? ' · <b class="neg">còn thiếu ' + st.short + '</b>' : '') + '</div></div></div>';
    return h;
  }
  function depSugHtml(o) {
    var D = G.deposits, sg = D.suggest(o), h = '';
    if (!sg || sg.none) return '';
    h += '<div class="card small sugbox"><b>Đề xuất nhập hàng cho đơn cọc</b>';
    var mine = D.linked(o);
    if (mine.length) h += '<div class="pos">Đã đặt ' + mine.reduce(function (a, p) { return a + (p.items[o.sku] || 0); }, 0) + ', về ' + mine.map(function (p) { return (p.arriveDay === G.state.day ? G.cal.hm(p.arriveMin) + ' hôm nay' : 'ngày ' + p.arriveDay + ' ' + G.cal.hm(p.arriveMin)) + (p.express ? ' ⚡' : ''); }).join(', ') + '</div>';
    if (!sg.best) return h + '<div class="neg">' + (G.life.stage(o.sku) >= 3 ? 'Mẫu này đã lỗi thời, các nguồn không còn bán - nên hoàn cọc hoặc đề nghị mẫu khác.' : 'Không có nguồn nhập phù hợp.') + '</div></div>';
    var b = sg.best, PUq = G.purchasing;
    h += '<div>Mua <b>' + b.qty + '</b> (thiếu ' + b.need + (b.extra ? ' + dự phòng ' + b.extra + ' vì bán chạy' : '') + ') từ <b>' + E(b.name) + '</b> · về sau ' + (b.lead[0] === b.lead[1] ? b.lead[0] : b.lead[0] + '-' + b.lead[1]) + ' ngày (hạn đơn: còn ' + Math.max(0, sg.daysLeft) + ' ngày)</div>' +
      '<div>Giá nhập <b>' + F.vnd(b.unit) + '</b>/cái · tổng <b>' + F.vnd(b.total) + '</b>' + (b.nq && (b.nq.fee || b.nq.ext) ? ' (hàng ' + F.short(b.nq.goods) + ' + phí giao NCC ' + F.short((b.nq.fee || 0) + (b.nq.ext || 0)) + ')' : '') + ' · lãi so với giá đã chốt <b class="' + (b.margin < 0.08 ? 'neg' : 'pos') + '">' + Math.round(b.margin * 100) + '%</b></div>';
    if (sg.warn) h += '<div class="neg">⚠ ' + E(sg.warn) + '</div>';
    if (b.xTotal) h += '<div class="muted">⚡ Lấy ngay: ' + F.vnd(b.xTotal) + ' (+' + F.vnd(b.xFee) + ') · còn ' + PUq.xLeft() + ' lượt hôm nay</div>';
    if (o.status === 'Đã nhận cọc') h += '<div class="row"><button class="mini primary" data-act="spBuy" data-id="' + o.id + '">Đặt hàng cho đơn này</button>' + (b.xTotal ? '<button class="mini' + (sg.warn ? ' primary' : '') + '" data-act="spBuyX" data-id="' + o.id + '"' + (b.xOk ? '' : ' disabled') + '>⚡ Nhập lấy ngay</button>' : '') + '<button class="mini" data-act="spCart" data-id="' + o.id + '">Thêm vào giỏ</button></div>';
    else h += '<div class="muted">Nhận cọc để đặt hàng cho đơn này.</div>';
    return h + '</div>';
  }
  function depCard(o) {
    var D = G.deposits, open = o.status === 'Chờ xử lý' || o.status === 'Đã nhận cọc', h = '<div class="card small ordcard">';
    if (open) h += depStockHtml(o); else h += UI.itemGrid([{ sku: o.sku, qty: o.qty || 1 }]) + '<b>' + E(G.skus[o.sku].label) + '</b>';
    h += '<div>' + E(o.cust.name) + ' · Giá ' + F.vnd(o.price) + ' · cọc ' + F.vnd(o.deposit) + ' · hạn ngày ' + o.due + ' · <span class="chipx ' + (o.status === 'Hoàn tất' ? 'st-ok' : o.status === 'Đã nhận cọc' ? 'st-go' : 'st-wait') + '">' + o.status + '</span></div>';
    if (open) h += depSugHtml(o);
    if (o.status === 'Chờ xử lý') h += '<div class="row"><button class="mini primary" data-act="spAccept" data-id="' + o.id + '">Nhận cọc</button><button class="mini" data-act="spReject" data-id="' + o.id + '">Từ chối</button></div>';
    if (o.status === 'Đã nhận cọc') {
      var st = D.stock(o);
      h += '<div class="row">' + (st.ok ? '<button class="mini primary" data-act="spFulfil" data-id="' + o.id + '">Giao ngay</button>' : '<button class="mini" disabled>Giao ngay (' + E(st.label.toLowerCase()) + ')</button>') +
        (o.held >= (o.qty || 1) ? '<button class="mini" data-act="spUnhold" data-id="' + o.id + '">Bỏ giữ hàng</button>' : '<button class="mini' + (st.free > 0 ? ' primary' : '') + '" data-act="spHold" data-id="' + o.id + '"' + (st.free > 0 && st.need > 0 ? '' : ' disabled') + '>Giữ hàng cho khách' + (st.free > 0 && !st.ok ? ' (' + Math.min(st.free, st.need) + ')' : '') + '</button>') + '</div>';
    }
    return h + '</div>';
  }
  function shipTab() {
    var s = G.state, SH = G.shipping, sh = s.shipping, h = '';
    h += '<div class="card small">NV Giao hàng: <b>' + G.staff.count('delivery') + '</b> · Lượt giao hôm nay: <b>' + SH.tripsLeft() + '/' + SH.tripsCap() + '</b> <span class="muted">(dùng chung với đơn lớn; mỗi chuyến chở tối đa ' + SH.TRIP_VOL() + ' đơn vị khối lượng)</span>' +
      '<div class="row"><label>Tự động đặt ship: <select data-chg="shipAuto">' + opts([['', 'Tắt (tự đặt tay)']].concat(G.data.carriers.map(function (c) { return [c.id, c.name]; })), sh.auto) + '</select></label></div></div>';
    var cd = SH.countdownText(), after = !SH.sameDayOk();
    h += '<div class="card small">' + (cd ? '<span class="chipx st-go">⏱ ' + cd + '</span>' : '<span class="chipx st-wait">Đã quá 17h · đơn mới giao sáng mai</span>') +
      '<div class="muted">Đặt trước 17h giao trong ngày · hỏa tốc nhận đến 20h · quá 21h chưa giao sẽ chuyển sáng mai.</div>' +
      '<div class="row"><label class="nw"><input type="checkbox" data-chg="shipExpOn"' + (sh.expressOn ? ' checked' : '') + '> Cho phép giao hỏa tốc (thu hút khách gấp)</label></div>' +
      '<div class="row"><label class="nw"><input type="checkbox" data-chg="shipExpPay"' + (sh.expPay !== false ? ' checked' : '') + '> Khách trả phí hỏa tốc (bỏ chọn = shop chịu, tăng đánh giá)</label></div></div>';
    h += '<table class="tbl small"><tr><th>Đơn vị</th><th class="r">Phí</th><th>Lấy+giao</th><th>Trễ</th><th>Hư</th></tr>' + G.data.carriers.map(function (c) {
      var a1 = c.pickup[0] + c.transit[0], a2 = c.pickup[1] + c.transit[1];
      return '<tr><td>' + E(c.name) + '<br><span class="muted">' + E(c.desc) + '</span></td><td class="r">' + (c.own ? 'miễn phí' : F.short(c.base) + '+' + F.short(c.perVol) + '/đv') + '</td><td>' + Math.round(a1 / 6) / 10 + '-' + Math.round(a2 / 6) / 10 + 'h</td><td>' + Math.round(c.late * 100) + '%</td><td>' + Math.round(c.damage * 100) + '%</td></tr>';
    }).join('') + '</table>';
    var wait = sh.orders.filter(function (o) { return o.status === 'Chờ đặt'; });
    h += '<h4>Cần đặt ship (' + wait.length + ')</h4>';
    if (!wait.length) h += '<p class="muted small">Không có đơn nào đang chờ.</p>';
    wait.forEach(function (o) {
      h += '<div class="card small ordcard">' + grid(o.items) + '<b>#' + o.id + '</b> · ' + E(o.cust.name) + ' · ' + F.vnd(o.rev) + (o.source === 'live' ? ' <span class="chipx st-go">🔴 live</span>' : o.special ? ' <span class="chipx st-ok">đặt riêng</span>' : '') + (o.urgent ? ' <span class="chipx st-go">cần gấp</span>' : '') + '<br><span class="muted">khối lượng ' + o.vol + ' · hạn đặt ngày ' + (o.day + 2) + '</span>' +
        '<div class="row"><label class="nw"><input type="checkbox" data-chg="shipCod" data-id="' + o.id + '"' + (o.cod ? ' checked' : '') + '> COD (thu khi giao, rủi ro khách không nhận)</label></div>';
      G.data.carriers.forEach(function (c) {
        if (c.express && !sh.expressOn) return;
        var pv = SH.preview(o, c.id);
        h += '<div class="row small"><button class="mini' + (c.express ? ' primary' : '') + '" data-act="shipBook" data-id="' + o.id + '" data-c="' + c.id + '"' + (pv.ok ? '' : ' disabled') + '>' + E(c.express ? '⚡ ' + c.short : c.short) + (c.own ? '' : ' ' + F.short(pv.fee)) + '</button> <span class="muted">' + E(pv.ok ? pv.text : pv.reason) + '</span></div>';
      });
      h += '</div>';
    });
    var qd = sh.orders.filter(function (o) { return o.status === 'Giao sáng mai'; });
    function ocard(o, chip, eta) { return '<div class="card small ordcard">' + grid(o.items) + '<b>#' + o.id + '</b> ' + E(o.cust.name) + (o.express ? ' ⚡' : '') + ' · ' + F.short(o.rev) + ' <span class="chipx ' + chip + '">' + o.status + '</span><br><span class="muted">' + E(G.carrierById[o.carrier].name) + (o.cod ? ' · COD' : ' · đã thanh toán') + ' · ' + E(eta) + '</span></div>'; }
    if (qd.length) h += '<h4>Giao sáng mai (' + qd.length + ')</h4><p class="muted small">Xếp hàng, sẽ lấy hàng ngay khi mở cửa và giao khoảng 8-11h.</p>' + qd.map(function (o) { return ocard(o, 'st-wait', 'Sáng mai 8–11h'); }).join('');
    var act = sh.orders.filter(function (o) { return o.status === 'Chờ lấy' || o.status === 'Đang giao'; });
    h += '<h4>Đang xử lý (' + act.length + ')</h4>' + act.map(function (o) { return ocard(o, STC[o.status], SH.etaText(o)); }).join('');
    var hist = sh.orders.filter(function (o) { return ['Đã giao', 'Thất bại', 'Hủy'].indexOf(o.status) >= 0; }).slice(-8).reverse();
    h += '<h4>Lịch sử gần đây</h4>' + hist.map(function (o) { return '<div class="card small ordcard">' + grid(o.items) + '<b>#' + o.id + '</b> ' + F.short(o.rev) + ' <span class="chipx ' + STC[o.status] + '">' + o.status + '</span><br><span class="muted">' + E(o.note) + '</span></div>'; }).join('');
    h += '<p class="muted small">Đã giao ' + sh.stats.delivered + ' · thất bại ' + sh.stats.failed + ' · trễ ' + sh.stats.late + ' · hư hàng ' + sh.stats.damaged + ' · hỏa tốc ' + (sh.stats.express || 0) + '</p>';
    // đặt riêng
    var sp = s.special.list;
    h += '<h4>Đơn đặt riêng có cọc (' + sp.filter(function (o) { return o.status === 'Chờ xử lý' || o.status === 'Đã nhận cọc'; }).length + ')</h4><p class="muted small">Khách hỏi mẫu chưa có: nhận cọc 30%, nhập hàng rồi giao trong 10 ngày. Quá hạn phải hoàn cọc.</p>';
    sp.slice().reverse().slice(0, 8).forEach(function (o) { h += depCard(o); });
    return h;
  }
  P.chg.shipAuto = function (el) { G.state.shipping.auto = el.value; };
  P.chg.shipExpOn = function (el) { G.state.shipping.expressOn = el.checked; };
  P.chg.shipExpPay = function (el) { G.state.shipping.expPay = el.checked; };
  P.chg.shipCod = function (el) { G.shipping.toggleCod(+el.dataset.id); };
  P.act.shipBook = function (el) { res(G.shipping.book(+el.dataset.id, el.dataset.c, false, { payExp: G.state.shipping.expPay !== false })); };
  P.act.spAccept = function (el) { res(G.deposits.accept(+el.dataset.id)); };
  P.act.spReject = function (el) { G.deposits.reject(+el.dataset.id); };
  P.act.spHold = function (el) { res(G.deposits.hold(+el.dataset.id)); };
  P.act.spUnhold = function (el) { res(G.deposits.unhold(+el.dataset.id)); };
  P.act.spBuy = function (el) { res(G.deposits.orderFor(+el.dataset.id, false)); };
  P.act.spBuyX = function (el) { res(G.deposits.orderFor(+el.dataset.id, true)); };
  P.act.spCart = function (el) { res(G.deposits.toCart(+el.dataset.id)); };
  P.act.spFulfil = function (el) { res(G.deposits.fulfil(+el.dataset.id)); };

  function b2bTab() {
    var s = G.state, B = G.b2b, st = s.b2b.stats, h = '';
    var offers = B.pendingOffers(), act = B.active();
    if (!G.lvl().b2b && !act.length && !offers.length) return '<div class="card"><b>Đơn khách sạn / resort</b><p class="muted">🔒 Mở từ cấp <b>Showroom</b>. Cần thêm NV Sale B2B (tăng tần suất, đàm phán), NV Giao hàng và đủ hàng tồn kho.</p></div>';
    h += '<div class="card small">Khả năng có đơn mới mỗi ngày: <b>' + Math.round(B.freq() * 100) + '%</b> (tăng theo NV Sale B2B và danh tiếng) · Hoàn tất ' + st.done + ' (trễ ' + st.late + ') · thất bại ' + st.failed + ' · tổng thu ' + F.short(st.earned) + '<div class="row"><label class="nw"><input type="checkbox" data-chg="b2bAuto"' + (s.b2b.auto ? ' checked' : '') + '> Tự động giao khi có hàng (NV Giao hàng)</label></div>' +
      '<div class="muted">Lượt giao hôm nay: ' + G.shipping.tripsLeft() + '/' + G.shipping.tripsCap() + ' · thuê xe ngoài ' + F.short(B.HIRE_TRIP_FEE) + '/chuyến</div></div>';
    h += '<h4>Đơn mới chờ quyết định (' + offers.length + ')</h4>';
    if (!offers.length) h += '<p class="muted small">Không có đơn mới.</p>';
    offers.forEach(function (o) { h += '<div class="card small"><b>' + E(o.client) + '</b> · ' + F.short(o.value) + ' · hạn ngày ' + o.deadline + ' · trả lời trước ngày ' + o.validUntil + '<br>' + grid(o.items) + '<div class="row"><button class="mini primary" data-act="b2bView" data-id="' + o.id + '">Xem & quyết định</button></div></div>'; });
    h += '<h4>Đang thực hiện (' + act.length + ')</h4>';
    if (!act.length) h += '<p class="muted small">Chưa có đơn nào đang thực hiện.</p>';
    act.forEach(function (o) {
      var left = o.deadline - s.day, tot = 0, done = 0; o.items.forEach(function (i) { tot += i.qty; done += i.done; });
      h += '<div class="card"><b>' + E(o.client) + '</b> <span class="chipx ' + (left < 0 ? 'neg' : left <= 2 ? 'neg' : 'st-go') + '">' + (left >= 0 ? 'còn ' + left + ' ngày' : 'TRỄ ' + (-left) + ' ngày') + '</span><br><span class="small">Giá trị ' + F.vnd(o.value) + ' · đã cọc ' + F.short(o.deposit) + ' · phạt trễ ' + F.short(o.penalty) + '</span>' + UI.bar(done / tot, left < 0 ? 'bad' : 'good') +
        UI.itemGrid(o.items.map(function (i) { var av = G.wh.total(i.sku); return { sku: i.sku, qty: i.qty, sub: 'giao ' + i.done + '/' + i.qty + '<br><b class="' + (av >= i.qty - i.done ? 'pos' : 'neg') + '">có ' + av + '</b>' }; })) +
        '<div class="row"><button class="mini primary" data-act="b2bTrip" data-id="' + o.id + '" data-m="own">Giao 1 chuyến (NV)</button><button class="mini" data-act="b2bTrip" data-id="' + o.id + '" data-m="hire">Thuê xe giao 1 chuyến</button></div></div>';
    });
    var hist = s.b2b.orders.filter(function (o) { return o.status !== 'Đang thực hiện'; }).slice(-5).reverse();
    if (hist.length) h += '<h4>Gần đây</h4><table class="tbl small">' + hist.map(function (o) { return '<tr><td>' + E(o.client) + '</td><td class="r">' + F.short(o.value) + '</td><td>' + o.status + '</td></tr>'; }).join('') + '</table>';
    return h;
  }
  P.chg.b2bAuto = function (el) { G.state.b2b.auto = el.checked; };
  P.act.b2bView = function (el) { G.b2b.showOffer(+el.dataset.id); };
  P.act.b2bTrip = function (el) { res(G.b2b.trip(+el.dataset.id, el.dataset.m)); };

  P.register({ id: 'ship', label: 'Giao hàng', after: 'staff', render: shipTab, badge: function () { return G.shipping.pendingCount() + G.deposits.pending(); } });
  P.register({ id: 'b2b', label: 'Đơn lớn', render: b2bTab, badge: function () { return G.b2b.pendingOffers().length; } });
})();
