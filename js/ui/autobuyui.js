/* Giao diện Thủ kho tự đặt hàng: panel ở tab Nhập + màn hình DUYỆT DANH SÁCH CẦN MUA (bottom sheet) */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, res = UI.res;
  function I() { return G.icon.apply(null, arguments); }
  function AB() { return G.autobuy; }
  var MODES = [['list', 'Duyệt danh sách'], ['approve', 'Duyệt từng món'], ['auto', 'Tự động']];
  UI.autobuyHtml = function () {
    var a = AB().st(), act = AB().active(), h = '<h4>' + I('box', 16) + ' Thủ kho tự đặt hàng</h4><div class="card small">';
    if (!act) return h + '<div class="muted">' + I('lock', 14) + ' Cần thuê <b>Thủ kho</b> (tab Nhân viên → Tuyển dụng). Không có Thủ kho thì cửa hàng không có đề xuất mua hàng.</div></div>';
    var frac = a.budget ? a.spent / a.budget : 0, b = AB().open();
    h += '<div class="chips">' + MODES.map(function (m) { return '<button class="chip' + (a.mode === m[0] ? ' on' : '') + '" data-act="abMode" data-v="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '<button class="chip' + (a.paused ? ' on' : '') + '" data-act="abPause">' + (a.paused ? 'Đang tạm dừng' : 'Tạm dừng') + '</button></div>';
    if (b) { var T = AB().totals(b); h += '<button class="btn primary big" data-act="abOpen">' + I('receipt', 18) + ' ' + AB().unreviewed() + ' mặt hàng cần duyệt · tổng ' + F.short(T.total) + ' - Xem &amp; duyệt</button>'; }
    else if (a.mode === 'list') h += '<div class="pos">' + I('check', 14) + ' Không có danh sách nào đang chờ duyệt.</div>';
    h += '<div class="row"><label class="small">Ngân sách tháng <input type="number" class="price" step="5000000" data-chg="abBudget" value="' + a.budget + '"></label><label class="small">Đơn tối thiểu <input type="number" class="price" step="1000000" min="0" data-chg="abMinOrder" value="' + AB().minOrder() + '"></label><label class="small">Tối đa tồn <input type="number" class="qty" min="3" max="60" data-chg="abCover" value="' + a.maxCover + '"> ngày bán</label></div>' +
      '<div class="small">Đã dùng <b>' + F.vnd(a.spent) + '</b> / ' + F.vnd(a.budget) + '</div>' + UI.bar(frac, frac > 0.85 ? 'bad' : 'good') +
      '<div class="muted">Mỗi sáng (giai đoạn chuẩn bị) Thủ kho phân tích tốc độ bán, khách hỏi mẫu hết hàng, đơn cọc / B2B, livestream và dự báo thời tiết, rồi gom <b>một danh sách</b> để bạn duyệt trước khi mở cửa.</div>';
    if (a.pending.length) h += '<b>Đơn chờ duyệt (' + a.pending.length + ')</b>' + a.pending.map(function (p) { var its = AB().pItems(p); return '<div class="card abcart"><b>' + I('box', 14) + ' ' + E(G.srcById[p.src] ? G.srcById[p.src].name : '') + ' · ' + F.vnd(p.cost) + '</b>' + its.map(function (i) { return '<div class="irow">' + UI.itemTile({ sku: i.sku, qty: i.qty }) + '<div style="min-width:0;flex:1" class="small"><b>' + E(G.skus[i.sku].label) + '</b><div class="muted">' + E(i.reason || '') + '</div></div></div>'; }).join('') + '<div class="row"><button class="mini primary" data-act="abApprove" data-id="' + p.id + '">Duyệt đặt</button><button class="mini" data-act="abSkip" data-id="' + p.id + '">Bỏ qua</button></div></div>'; }).join('');
    if (a.hist.length) h += '<details class="det"><summary>Lịch sử đề xuất (' + a.hist.length + ')</summary>' + a.hist.slice(0, 8).map(function (x) { return '<div class="small">Ngày ' + x.day + ': <span class="chipx ' + (x.status === 'Đã duyệt' ? 'pos' : x.status === 'Duyệt một phần' ? 'st-go' : 'st-wait') + '">' + E(x.status) + '</span> ' + x.n + '/' + x.planned + ' mặt hàng' + (x.total ? ' · ' + F.short(x.total) : '') + '</div>'; }).join('') + '</details>';
    h += '<details class="det"><summary>Nhật ký tự đặt hàng (' + a.log.length + ')</summary>' + (a.log.length ? a.log.slice(0, 12).map(function (l) { return '<div class="small ' + (l.ok ? '' : 'muted') + '">Ngày ' + l.day + ': ' + E(l.text) + '</div>'; }).join('') : '<div class="muted small">Chưa có đơn tự đặt.</div>') + '</details></div>';
    return h;
  };
  // ---------- màn hình duyệt ----------
  function srcShort(o) { return { cho: 'Chợ', daily: 'Đại lý', nhamay: 'Nhà máy', oem: 'OEM' }[o.src] || o.name; }
  function eta(o) { return o.lead[1] === 0 ? 'về ngay' : o.lead[0] === o.lead[1] ? o.lead[0] + ' ngày' : o.lead[0] + '-' + o.lead[1] + ' ngày'; }
  function itemCard(i, T) {
    var k = G.skus[i.sku], cw = k.cw, opts = AB().options(i), PU = G.purchasing, xok = (i.src === 'daily' || i.src === 'nhamay') && PU.xLeft() > 0;
    var custChips = (i.cust || []).map(function (o) { return '<span class="chipx neg">' + (o.type === 'dep' ? I('gift', 10) + ' ' + E(o.name) + ' · hạn ngày ' + o.due + ' (còn ' + Math.max(0, o.left) + ' ngày) · cọc ' + F.short(o.deposit) : o.type === 'b2b' ? 'B2B ' + E(o.name) + ' · hạn ngày ' + o.due : E(o.name)) + '</span>'; }).join(' ');
    var chips = custChips + ' ' + i.reason.split('; ').map(function (r) { return '<span class="chipx st-go">' + E(r) + '</span>'; }).join(' ');
    var warn = [];
    if (i.covered) warn.push('<div class="pos small">' + I('check', 12) + ' Đã đủ hàng (có đơn khác bù) - đã bỏ chọn</div>');
    else if (i.err) warn.push('<div class="neg small">' + I('warn', 12) + ' ' + E(i.err) + '</div>');
    if (i.overBudget && i.include) warn.push('<div class="neg small">' + I('warn', 12) + ' Vượt ngân sách tháng còn lại</div>');
    if (G.state.brandCut[k.brand]) warn.push('<div class="warn small">' + I('warn', 12) + ' Hãng ' + E(G.brandName(k.brand)) + ' đang cắt chiết khấu</div>');
    var line = '<div class="small">Đơn giá <b>' + F.vnd(i.unit || PU.unit(i.src, i.sku, 0)) + '</b> · thành tiền <b>' + F.vnd(i.line || (i.unit || PU.unit(i.src, i.sku, 0)) * i.qty) + '</b></div>';
    return '<div class="card abitem' + (i.include && !i.covered ? '' : ' off') + '"><div class="irow"><label class="abchk"><input type="checkbox" data-chg="abInc" data-uid="' + i.uid + '"' + (i.include ? ' checked' : '') + (i.covered ? ' disabled' : '') + '></label>' + UI.itemTile({ sku: i.sku, qty: i.qty, sub: cw ? E(cw.code) : '' }) +
      '<div style="min-width:0;flex:1"><b>' + E(k.label) + '</b> ' + (i.urgent ? '<span class="chipx neg">GẤP</span>' : '') + ' <span class="muted small">' + E(G.suggest.TIERS[i.tier || 6]) + '</span><div>' + chips + '</div></div></div>' +
      '<div class="row abqty"><button class="mini" data-act="abStep" data-uid="' + i.uid + '" data-d="-1">−</button><input type="number" class="qty" min="1" data-chg="abQty" data-uid="' + i.uid + '" value="' + i.qty + '"><button class="mini" data-act="abStep" data-uid="' + i.uid + '" data-d="1">+</button><button class="mini" data-act="abStep" data-uid="' + i.uid + '" data-d="5">+5</button><button class="mini" data-act="abDel" data-uid="' + i.uid + '">Bỏ khỏi giỏ</button></div>' + line +
      '<div class="chips">' + opts.map(function (o) { return '<button class="chip' + (i.src === o.src && !i.express ? ' on' : '') + (o.ok ? '' : ' dis') + '" data-act="abSrc" data-uid="' + i.uid + '" data-src="' + o.src + '"' + (o.ok ? '' : ' disabled') + '>' + E(srcShort(o)) + ' ' + F.short(o.unit) + ' · ' + eta(o) + (o.late ? ' ⚠' : '') + '</button>'; }).join('') +
      (xok && (i.urgent || i.risk === 'cao') ? '<button class="chip' + (i.express ? ' on' : '') + '" data-act="abExp" data-uid="' + i.uid + '">' + I('bolt', 12) + ' lấy ngay</button>' : '') + '</div>' + warn.join('') + '</div>';
  }
  UI.abRender = function () {
    var AB_ = AB(), b = AB_.open(), a = AB_.st(), h = '';
    if (!b) {
      h += '<div class="card empty">' + I('check', 36) + '<p><b>Kho ổn, không cần nhập.</b></p><p class="muted small">Thủ kho chưa đề xuất mặt hàng nào cần mua.</p></div>';
      if (a.hist.length) h += '<h4>Lịch sử đề xuất</h4>' + a.hist.slice(0, 6).map(function (x) { return '<div class="small">Ngày ' + x.day + ': <b>' + E(x.status) + '</b> - ' + x.n + '/' + x.planned + ' mặt hàng' + (x.total ? ' · ' + F.short(x.total) : '') + '</div>'; }).join('');
      return h;
    }
    AB_.refresh(); var T = AB_.totals(b), s = G.state, bar = '<div class="abbar"><button class="btn primary" data-act="abDoSel"' + (T.n ? '' : ' disabled') + '>Duyệt đã chọn (' + T.n + ' · ' + F.short(T.total) + ')</button><button class="btn" data-act="abDoAll">Duyệt tất cả</button><button class="btn" data-act="abLater">Để sau</button><button class="btn" data-act="abSkipAll">Bỏ qua hôm nay</button></div>';
    h += '<div class="card"><b>' + I('receipt', 16) + ' Danh sách cần mua - ngày ' + b.day + '</b><div class="small">' + T.n + ' mặt hàng được chọn · tổng <b>' + F.vnd(T.total) + '</b></div>' +
      '<div class="small ' + (T.cashShort ? 'neg' : '') + '">Tiền mặt: ' + F.vnd(T.cash) + (T.cashShort ? ' - thiếu ' + F.vnd(T.total - T.cash) + ' (sẽ mua chịu nếu đủ quan hệ NCC, nếu không bỏ bớt món)' : ' - đủ') + '</div>' +
      '<div class="small ' + (T.overBudget ? 'neg' : '') + '">Ngân sách tháng còn: ' + F.vnd(T.budgetLeft) + (T.overBudget ? ' - danh sách vượt ngân sách' : '') + '</div>' +
      '<div class="small ' + (T.overCap ? 'neg' : '') + '">Sức chứa kho cửa hàng: cần ' + Math.ceil(T.vol) + ' / trống ' + Math.max(0, Math.floor(T.free)) + (T.overCap ? ' - không đủ chỗ' : '') + '</div>' + bar + '</div>';
    // GIỎ HÀNG: các món cùng nguồn gom vào MỘT đơn hàng (hưởng chiết khấu số lượng); sửa số lượng / bỏ món ngay trong giỏ
    var carts = {}, gq = {}; T.groups.forEach(function (g) { gq[g.key] = g; });
    b.items.filter(function (i) { return !i.done; }).forEach(function (i) { var k = i.src + (i.express ? '|x' : ''), c = carts[k] || (carts[k] = { key: k, src: i.src, express: !!i.express, items: [] }); c.items.push(i); });
    Object.keys(carts).map(function (k) { return carts[k]; }).sort(function (x, y) { function mt(c) { return Math.min.apply(null, c.items.map(function (i) { return i.tier || 6; })); } return mt(x) - mt(y); }).forEach(function (c) {
      var sd = G.srcById[c.src], g = gq[c.key], n = c.items.filter(function (i) { return i.include && !i.covered && !i.err; }).length;
      var items = c.items.slice().sort(function (x, y) { return (x.tier || 6) - (y.tier || 6) || (x.minDays || 99) - (y.minDays || 99); });
      h += '<div class="card abcart"><h4 class="carth">' + I('box', 16) + ' Đơn hàng · ' + E(sd.name) + (c.express ? ' ⚡' : '') + ' <span class="muted small">· ' + items.length + ' mặt hàng</span></h4>' +
        '<div class="small">' + (g ? 'Tổng <b>' + F.vnd(g.total || 0) + '</b>' + (g.quote && g.quote.tier ? ' <span class="muted">(CK số lượng ' + Math.round(g.quote.tier * 100) + '%)</span>' : '') : '<span class="muted">Chưa chọn món nào</span>') +
        (sd.noInvoice ? ' <span class="warn">không hóa đơn</span>' : '') + (g && g.err ? ' <span class="neg">' + E(g.err) + '</span>' : '') + '</div>' +
        (g && !g.err && AB().belowMin(g.total, c.items.some(function (i) { return i.include && (i.urgent || i.tier === 1); })) ? '<div class="neg small">' + I('warn', 12) + ' Dưới mức đơn tối thiểu ' + F.vnd(AB().minOrder()) + ' - thêm món hoặc chuyển nguồn để đặt được</div>' : '') +
        items.map(function (i) { return itemCard(i, T); }).join('') +
        '<div class="row"><button class="btn primary" data-act="abDoCart" data-key="' + E(c.key) + '"' + (n && g && !g.err ? '' : ' disabled') + '>Đặt đơn này (' + n + ' món' + (g ? ' · ' + F.short(g.total || 0) : '') + ')</button></div></div>';
    });
    h += bar;
    return h;
  };
  UI.openAbReview = function () { var b = AB().open(); if (b) b.shown = true; UI.sheet2.open('Thủ kho đề xuất mua hàng', UI.abRender); };
  function it(uid) { var b = AB().open(); return b && b.items.filter(function (x) { return x.uid === +uid; })[0]; }
  var A = P.act, C = P.chg;
  A.abOpen = function () { UI.openAbReview(); };
  A.abStep = function (el) { var i = it(el.dataset.uid); if (i) i.qty = Math.max(1, Math.min(500, Math.floor(i.qty + +el.dataset.d))); };
  A.abDel = function (el) { var b = AB().open(), i = it(el.dataset.uid); if (b && i) { b.items = b.items.filter(function (x) { return x !== i; }); if (!b.items.length) AB().closeBatch('Bỏ qua'); } };
  A.abSrc = function (el) { var i = it(el.dataset.uid); if (i) { i.src = el.dataset.src; i.express = false; } };
  A.abExp = function (el) { var i = it(el.dataset.uid); if (i) i.express = !i.express; };
  A.abDoSel = function () { var b = AB().open(); if (!b) return; var r = AB().commit(b); report(r); };
  A.abDoCart = function (el) { var b = AB().open(); if (!b) return; report(AB().commit(b, el.dataset.key)); };
  A.abDoAll = function () { var r = AB().approveAll(); report(r); };
  A.abLater = function () { UI.sheet2.close(); };
  A.abSkipAll = function () { AB().skipBatch('bỏ qua hôm nay'); G.notify.toast('Đã bỏ qua danh sách hôm nay', 'info'); };
  function report(r) { if (!r) return; if (r.placed) G.notify.toast('Đã đặt ' + r.placed + ' mặt hàng theo danh sách của Thủ kho', 'good'); if (r.failed && r.failed.length) G.notify.toast(E(r.failed[0]), 'warn'); if (!r.placed && !(r.failed && r.failed.length)) G.notify.toast('Chưa chọn mặt hàng nào', 'warn'); }
  C.abInc = function (el) { var i = it(el.dataset.uid); if (i) i.include = el.checked; };
  C.abQty = function (el) { var i = it(el.dataset.uid); if (i) i.qty = Math.max(1, Math.min(500, Math.floor(+el.value || 1))); };
  A.abMode = function (el) { AB().st().mode = el.dataset.v; };
  A.abPause = function () { var a = AB().st(); a.paused = !a.paused; };
  A.abApprove = function (el) { res(AB().approve(+el.dataset.id)); };
  A.abSkip = function (el) { AB().skip(+el.dataset.id); };
  C.abBudget = function (el) { AB().st().budget = Math.max(0, +el.value || 0); };
  C.abMinOrder = function (el) { AB().st().minOrder = Math.max(0, +el.value || 0); };
  C.abCover = function (el) { AB().st().maxCover = Math.max(3, Math.min(60, +el.value || 14)); };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-abopen]')) UI.openAbReview(); });
  // cổng trước khi mở cửa: còn danh sách chưa duyệt -> hỏi
  UI.abGate = function (go) {
    var n = AB().unreviewed(); if (!n || G.clock.skipping) { go(); return; }
    G.notify.modal({ title: 'Còn ' + n + ' mặt hàng chưa duyệt', def: 1, sound: 'warn', html: '<p>Thủ kho đã lập danh sách cần mua nhưng bạn chưa duyệt. Nếu mở cửa luôn, danh sách sẽ bị bỏ qua.</p>', choices: [{ label: 'Duyệt ngay', cls: 'primary', fn: function () { UI.openAbReview(); } }, { label: 'Mở cửa luôn (bỏ qua)', fn: go }, { label: 'Quay lại' }] });
  };
})();
