/* Tab Đánh giá, Công nợ khó đòi, Sự kiện & Ưu đãi */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, opts = UI.opts, bar = UI.bar, res = UI.res;
  UI.st.revText = {}; UI.st.cmp = { offer: '', scale: 'small', inDays: 2, budget: 0, kind: 'pct', scopeType: 'all', scopeVal: '', pct: 10, days: 3, startIn: 0, fromH: 18, toH: 21, buyType: 'dem', giftType: 'goi', value: 100000, minBill: 1000000, channel: 'none' };
  function stars(n) { return '<span class="stars">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(5 - n) + '</span></span>'; }

  // ======================= ĐÁNH GIÁ =======================
  function revTab() {
    var s = G.state, R = G.reviews, list = s.revs.list, h = '';
    var dist = [0, 0, 0, 0, 0, 0]; list.forEach(function (x) { dist[x.rating]++; });
    h += '<div class="card"><div style="font-size:26px;color:#ffc107"><b>' + R.avg().toFixed(2) + '</b> ★</div><div class="small muted">Lượng khách/giờ = khách cơ bản × (★ / 3) = ×' + (R.avg() / 3).toFixed(2) + '. Tỉ lệ phản hồi: ' + Math.round(R.replyRate() * 100) + '% (tăng nhẹ tỉ lệ chốt đơn).</div>' +
      [5, 4, 3, 2, 1].map(function (r) { return '<div class="rel"><span>' + r + '★</span>' + bar(list.length ? dist[r] / list.length : 0, r >= 4 ? 'good' : r <= 2 ? 'bad' : '') + '<span class="small">' + dist[r] + '</span></div>'; }).join('') + '</div>';
    var un = R.unanswered();
    h += '<h4>Chờ phản hồi (' + un.length + ')</h4>';
    if (!un.length) h += '<p class="muted small">Không có đánh giá nào chờ phản hồi.</p>';
    un.slice(0, 8).forEach(function (rv) {
      var late = s.day - rv.day > 3 && rv.rating <= 3;
      h += '<div class="card small"><div>' + stars(rv.rating) + ' <b>' + E(rv.author) + '</b> <span class="muted">· ngày ' + rv.day + '</span>' + (late ? ' <span class="chipx neg">quá 3 ngày</span>' : '') + '</div><div>' + E(rv.text) + '</div>' +
        '<div class="row"><button class="mini" data-act="rvReply" data-id="' + rv.id + '" data-t="thanks">Cảm ơn</button><button class="mini" data-act="rvReply" data-id="' + rv.id + '" data-t="sorry" title="Tốn 100.000đ, có thể nâng ★">Xin lỗi + voucher</button><button class="mini" data-act="rvReply" data-id="' + rv.id + '" data-t="explain">Giải thích</button><button class="mini danger" data-act="rvReply" data-id="' + rv.id + '" data-t="rebut">Phản bác gay gắt</button></div>' +
        '<div class="row"><input type="text" style="flex:1;min-width:0" placeholder="Hoặc tự viết phản hồi..." data-chg="rvText" data-id="' + rv.id + '" value="' + E(UI.st.revText[rv.id] || '') + '"><button class="mini primary" data-act="rvSend" data-id="' + rv.id + '">Gửi</button></div></div>';
    });
    var done = list.filter(function (x) { return x.replied; }).slice(0, 6);
    if (done.length) h += '<h4>Đã phản hồi</h4>' + done.map(function (rv) { return '<div class="card small">' + stars(rv.rating) + (rv.upgraded ? ' <span class="chipx st-ok">đã nâng ★</span>' : '') + ' ' + E(rv.text) + '<div class="muted">↳ ' + E(rv.reply || '') + '</div></div>'; }).join('');
    return h;
  }
  P.act.rvReply = function (el) { res(G.reviews.reply(+el.dataset.id, el.dataset.t)); };
  P.chg.rvText = function (el) { UI.st.revText[el.dataset.id] = el.value; };
  P.act.rvSend = function (el) { var id = +el.dataset.id, inp = document.querySelector('[data-chg="rvText"][data-id="' + id + '"]'); var t = inp ? inp.value : UI.st.revText[id]; var r = G.reviews.reply(id, 'thanks', t || ''); if (!t) r = { ok: false, msg: 'Hãy nhập nội dung phản hồi' }; res(r); if (r.ok) delete UI.st.revText[id]; };

  // ======================= CÔNG NỢ KHÓ ĐÒI =======================
  function debtTab() {
    var s = G.state, ev = s.events, h = '';
    var open = ev.debts.filter(function (d) { return d.status === 'Khó đòi' || d.status === 'Đã báo phường'; });
    var total = 0; open.forEach(function (d) { total += d.amount; });
    h += '<div class="card small">Tổng nợ khó đòi đang treo: <b class="neg">' + F.vnd(total) + '</b>. Có Kế toán thì hồ sơ báo phường đầy đủ hóa đơn và tỉ lệ thành công cao hơn.</div>';
    if (!open.length) h += '<p class="muted small">Không có khoản nợ nào.</p>';
    open.forEach(function (d) {
      h += '<div class="card small"><b>' + E(d.name) + '</b> · ' + F.vnd(d.amount) + ' · đơn #' + d.ship + ' · ngày ' + d.day + '<br><span class="chipx ' + (d.status === 'Khó đòi' ? 'neg' : 'st-go') + '">' + d.status + '</span> ' + (d.invoice ? '<span class="chipx st-ok">có hóa đơn</span>' : '<span class="chipx neg">thiếu hóa đơn</span>') + (d.status === 'Đã báo phường' ? ' <span class="muted">kết quả ngày ' + d.resolveDay + '</span>' : '');
      if (d.status === 'Khó đòi') h += '<div class="row"><button class="mini" data-act="dbSelf" data-id="' + d.id + '"' + (s.day < d.nextTry ? ' disabled' : '') + '>Tự đòi (tỉ lệ thấp)</button><button class="mini primary" data-act="dbPolice" data-id="' + d.id + '">Báo phường (phí 200k, 3-7 ngày)</button><button class="mini danger" data-act="dbOff" data-id="' + d.id + '">Xóa nợ</button></div>';
      h += '</div>';
    });
    var closed = ev.debts.filter(function (d) { return d.status !== 'Khó đòi' && d.status !== 'Đã báo phường'; }).slice(-6).reverse();
    if (closed.length) h += '<h4>Đã xử lý</h4><table class="tbl small">' + closed.map(function (d) { return '<tr><td>' + E(d.name) + '</td><td class="r">' + F.short(d.amount) + '</td><td>' + d.status + '</td></tr>'; }).join('') + '</table>';
    h += '<h4>Danh sách đen (' + ev.black.length + ')</h4><p class="muted small">Khách quịt nợ sẽ bị cảnh báo khi quay lại cửa hàng. Nên tắt COD với họ.</p><div class="small">' + (ev.black.map(E).join(', ') || '—') + '</div>';
    return h;
  }
  P.act.dbSelf = function (el) { res(G.events.selfCollect(+el.dataset.id)); };
  P.act.dbPolice = function (el) { res(G.events.reportPolice(+el.dataset.id)); };
  P.act.dbOff = function (el) { if (confirm('Xóa nợ? Bạn sẽ mất khoản tiền này.')) G.events.writeOff(+el.dataset.id); };

  // ======================= SỰ KIỆN & ƯU ĐÃI =======================
  function promoPart(f, s, C, cp) {
    var h = '';
    // --- ưu đãi ---
    h += '<h4>Chương trình ưu đãi</h4>';
    var up = G.season.upcoming(s.day, 30);
    if (up.length) h += '<div class="small">Dịp sắp tới: ' + up.map(function (u) { return '<span class="chipx st-go">' + E(u.name) + ' (ngày ' + u.start + '-' + u.end + ')</span> <button class="mini" data-act="cmpHoliday" data-id="' + u.id + '">Tạo CT</button>'; }).join(' ') + '</div>';
    var kinds = [['pct', 'Giảm % theo hãng/loại/toàn cửa hàng'], ['flash', 'Flash sale khung giờ vàng'], ['bxgy', 'Mua X tặng Y'], ['combo', 'Combo phòng ngủ (đệm+ga+gối)'], ['voucher', 'Voucher']];
    var brands = G.data.brands.filter(function (b) { return !b.noBrand && G.brandAvail(b.id); });
    if (f.scopeType === 'brand' && !brands.some(function (b) { return b.id === f.scopeVal; })) f.scopeVal = brands[0] ? brands[0].id : '';
    if (f.scopeType === 'type' && !G.data.types[f.scopeVal]) f.scopeVal = 'dem';
    var typeOpts = G.data.typeOrder.map(function (t) { return [t, G.data.types[t].name]; });
    h += '<div class="card small"><div class="chips">' + kinds.map(function (k) { return '<button class="chip' + (f.kind === k[0] ? ' on' : '') + '" data-act="cmpSet" data-k="kind" data-v="' + k[0] + '">' + E(k[1]) + '</button>'; }).join('') + '</div>';
    if (f.kind === 'pct' || f.kind === 'flash') {
      h += '<div class="chips">' + [['all', 'Toàn cửa hàng'], ['brand', 'Theo hãng'], ['type', 'Theo loại']].map(function (k) { return '<button class="chip' + (f.scopeType === k[0] ? ' on' : '') + '" data-act="cmpSet" data-k="scopeType" data-v="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div><div class="row">' + (f.scopeType === 'brand' ? '<select data-chg="cmpScopeVal">' + opts(brands.map(function (b) { return [b.id, b.short]; }), f.scopeVal) + '</select>' : f.scopeType === 'type' ? '<select data-chg="cmpScopeVal">' + opts(typeOpts, f.scopeVal) + '</select>' : '') + '<label>Giảm <input type="number" class="qty" min="2" max="70" data-chg="cmpPct" value="' + f.pct + '">%</label></div>';
      var w = C.floorWarn({ type: f.scopeType, value: f.scopeVal }, f.pct / 100);
      if (w) h += '<div class="neg">⚠ ' + w + ' mặt hàng sẽ bán dưới giá sàn của hãng: bị hãng phát hiện thì cảnh cáo → cắt chiết khấu → rút quyền đại lý!</div>';
      if (f.pct >= 40) h += '<div class="warn">Giảm quá sâu (≥40%) làm khách "chờ sale" và hại thương hiệu.</div>';
      if (f.kind === 'flash') h += '<div class="row"><label>Từ <input type="number" class="qty" min="8" max="20" data-chg="cmpFrom" value="' + f.fromH + '">h</label><label>đến <input type="number" class="qty" min="9" max="21" data-chg="cmpTo" value="' + f.toH + '">h</label></div>';
    } else if (f.kind === 'bxgy') h += '<div class="row"><label>Mua <select data-chg="cmpBuy">' + opts(typeOpts, f.buyType) + '</select></label><label>tặng <select data-chg="cmpGift">' + opts(typeOpts, f.giftType) + '</select></label></div><div class="muted">Quà lấy từ hàng tồn kho (món rẻ nhất), tính vào giá vốn.</div>';
    else if (f.kind === 'combo') h += '<div class="row"><label>Giảm combo <input type="number" class="qty" min="2" max="50" data-chg="cmpPct" value="' + f.pct + '">%</label></div><div class="muted">Áp dụng khi khách mua đủ đệm + ga + gối trong 1 đơn.</div>';
    else h += '<div class="row"><label>Giá trị <input type="number" class="price" step="10000" data-chg="cmpValue" value="' + f.value + '"></label><label>Hóa đơn từ <input type="number" class="price" step="100000" data-chg="cmpMin" value="' + f.minBill + '"></label></div>';
    h += '<div class="row"><label>Bắt đầu sau <input type="number" class="qty" min="0" max="14" data-chg="cmpStart" value="' + f.startIn + '"> ngày</label><label>Chạy <input type="number" class="qty" min="1" max="30" data-chg="cmpDays" value="' + f.days + '"> ngày</label></div>' +
      '<div class="small"><b>Quảng bá</b></div><div class="chips">' + Object.keys(C.CHANNEL).map(function (k) { return '<button class="chip' + (f.channel === k ? ' on' : '') + '" data-act="cmpSet" data-k="channel" data-v="' + k + '">' + E(C.CHANNEL[k].name + (C.CHANNEL[k].day ? ' · ' + F.short(C.CHANNEL[k].day) + '/ngày' : '')) + '</button>'; }).join('') + '</div><button class="btn primary" data-act="cmpCreate">Tạo chương trình</button></div>';
    var ps = cp.promos;
    if (ps.length) h += '<table class="tbl small">' + ps.map(function (p) { return '<tr><td><b>' + E(p.name) + '</b><br><span class="muted">ngày ' + p.start + '-' + p.end + (p.kind === 'flash' ? ' · ' + p.fromH + 'h-' + p.toH + 'h' : '') + (p.holiday ? ' · ' + E(p.holiday) : '') + '</span></td><td><span class="chipx ' + (p.status === 'Đang chạy' ? 'st-go' : 'st-wait') + '">' + p.status + '</span><br><span class="muted">' + p.st.sales + ' đơn · ' + F.short(p.st.revenue) + '</span></td><td><button class="mini" data-act="cmpCancelPromo" data-id="' + p.id + '">Hủy</button></td></tr>'; }).join('') + '</table>';
    if (cp.heat > 5) h += '<p class="warn small">Mức "chờ sale" của khách: ' + Math.round(cp.heat) + ' → tỉ lệ chốt giá gốc giảm ' + Math.round((1 - C.heatMult()) * 100) + '% khi không có khuyến mãi.</p>' + bar(cp.heat / 60, 'bad');
    return h;
  }
  function memberPart(f, s, C, cp) {
    var h = '';
    // --- thành viên ---
    var m = cp.member, tiers = {}; m.list.forEach(function (r) { var t = C.tierOf(r.spend); if (t) tiers[t[0]] = (tiers[t[0]] || 0) + 1; });
    h += '<h4>Thẻ thành viên</h4><div class="card small"><label class="nw"><input type="checkbox" data-chg="cmpMember"' + (m.on ? ' checked' : '') + '> Bật chương trình (1.000.000đ/tháng)</label><div class="muted">Hạng Bạc ≥5tr (-2%), Vàng ≥20tr (-4%), Kim cương ≥60tr (-6%). Thành viên giúp khách quay lại nhiều hơn.</div><div>Thành viên: <b>' + m.list.length + '</b> · ' + ['Kim cương', 'Vàng', 'Bạc'].map(function (n) { return n + ': ' + (tiers[n] || 0); }).join(' · ') + '</div></div>';
    if (cp.reports.length) h += '<h4>Báo cáo CT gần đây</h4><table class="tbl small">' + cp.reports.map(function (r) { return '<tr><td>' + E(r.name) + '</td><td class="r">' + F.short(r.revenue) + '</td><td class="r ' + (r.profit >= 0 ? 'pos' : 'neg') + '">' + F.short(r.profit) + '</td></tr>'; }).join('') + '</table>';
    return h;
  }
  function campTab() {
    var s = G.state, C = G.campaigns, cp = s.camp, f = UI.st.cmp, h = '';
    var segs = [['launch', 'Ra mắt sản phẩm', cp.offers.length || cp.events.some(function (e) { return e.status === 'Đã đặt' || e.status === 'Đang diễn ra'; }) ? ' (' + (cp.offers.length) + ')' : ''], ['promo', 'Ưu đãi', cp.promos.length ? ' (' + cp.promos.length + ')' : ''], ['member', 'Thành viên', cp.member.on ? ' ✓' : '']];
    if (!f.seg) f.seg = 'launch';
    h += '<div class="segs">' + segs.map(function (g) { return '<button class="seg' + (f.seg === g[0] ? ' on' : '') + '" data-act="cmpSeg" data-v="' + g[0] + '">' + g[1] + g[2] + '</button>'; }).join('') + '</div>';
    if (f.seg === 'launch') h += UI.campLaunch();
    else if (f.seg === 'promo') h += promoPart(f, s, C, cp);
    else h += memberPart(f, s, C, cp);
    return h;
  }
  var C0 = function () { return UI.st.cmp; };
  P.act.cmpSeg = function (el) { C0().seg = el.dataset.v; };
  P.act.cmpSet = function (el) { var f = C0(), k = el.dataset.k; f[k] = el.dataset.v; if (k === 'scopeType') f.scopeVal = ''; };
  P.chg.cmpOffer = function (el) { C0().offer = el.value; };
  P.chg.cmpScale = function (el) { C0().scale = el.value; C0().budget = 0; };
  P.chg.cmpDay = function (el) { C0().inDays = +el.value; };
  P.chg.cmpBudget = function (el) { C0().budget = +el.value || 0; };
  P.act.cmpBook = function () { var f = C0(); res(G.campaigns.book(+f.offer, f.scale, G.state.day + f.inDays, f.budget)); };
  P.act.cmpCancelEv = function (el) { G.campaigns.cancelEvent(+el.dataset.id); };
  P.chg.cmpKind = function (el) { C0().kind = el.value; };
  P.chg.cmpScopeType = function (el) { C0().scopeType = el.value; C0().scopeVal = ''; };
  P.chg.cmpScopeVal = function (el) { C0().scopeVal = el.value; };
  P.chg.cmpPct = function (el) { C0().pct = +el.value || 0; };
  P.chg.cmpFrom = function (el) { C0().fromH = +el.value; };
  P.chg.cmpTo = function (el) { C0().toH = +el.value; };
  P.chg.cmpBuy = function (el) { C0().buyType = el.value; };
  P.chg.cmpGift = function (el) { C0().giftType = el.value; };
  P.chg.cmpValue = function (el) { C0().value = +el.value || 0; };
  P.chg.cmpMin = function (el) { C0().minBill = +el.value || 0; };
  P.chg.cmpStart = function (el) { C0().startIn = +el.value || 0; };
  P.chg.cmpDays = function (el) { C0().days = +el.value || 1; };
  P.chg.cmpChannel = function (el) { C0().channel = el.value; };
  P.chg.cmpMember = function (el) { G.state.camp.member.on = el.checked; };
  P.act.cmpCancelPromo = function (el) { G.campaigns.cancelPromo(+el.dataset.id); };
  P.act.cmpCreate = function () {
    var f = C0(), o = { kind: f.kind, scope: f.kind === 'pct' || f.kind === 'flash' ? { type: f.scopeType, value: f.scopeVal } : { type: 'all' }, pct: f.pct / 100, days: f.days, startIn: f.startIn, fromH: f.fromH, toH: f.toH, buyType: f.buyType, giftType: f.giftType, value: f.value, minBill: f.minBill, channel: f.channel };
    res(G.campaigns.create(o));
  };
  P.act.cmpHoliday = function (el) {
    var u = G.season.upcoming(G.state.day, 30).filter(function (x) { return x.id === el.dataset.id; })[0]; if (!u) return;
    var f = C0(), r = G.campaigns.create({ kind: 'pct', scope: { type: 'all' }, pct: 0.12, days: Math.max(1, u.end - u.start + 1), startIn: Math.max(0, u.start - G.state.day), channel: 'flyer', name: 'Ưu đãi ' + u.name, holiday: u.name });
    res(r);
  };

  P.register({ id: 'rev', label: 'Đánh giá', render: revTab, badge: function () { return G.reviews.unanswered().length; } });
  P.register({ id: 'debts', label: 'Công nợ khó đòi', render: debtTab, badge: function () { return G.state.events.debts.filter(function (d) { return d.status === 'Khó đòi'; }).length; } });
  P.register({ id: 'camp', label: 'Sự kiện & Ưu đãi', render: campTab, badge: function () { return G.state.camp.offers.length; } });
})();
