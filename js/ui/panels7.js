/* Tab Bảo hành: yêu cầu chờ xử lý, chính sách, báo cáo */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, opts = UI.opts, bar = UI.bar, res = UI.res, RT = G.returns;
  UI.st.clm = { pct: 0.15 };
  var GC = { 'Mới nguyên tem': 'st-ok', 'Đã dùng nhẹ': 'st-wait', 'Hư lỗi sản xuất': 'neg', 'Hư do khách': 'neg', 'Biến dạng/bẩn': 'neg' };
  var ACT = { replace: 'Duyệt đổi mới', refund: 'Duyệt hoàn tiền', repair: 'Sửa chữa', reject: 'Từ chối', discount: 'Đề nghị giảm giá giữ lại', brand: 'Chuyển hãng xử lý' };
  function warrantyTab() {
    var s = G.state, R = s.returns, pol = R.policy, h = '', pend = RT.pendingList(), st = R.stats, sc = RT.score();
    h += '<h4>Yêu cầu chờ xử lý (' + pend.length + ')</h4>';
    if (!pend.length) h += '<p class="muted small">Chưa có yêu cầu nào. Khách gửi yêu cầu theo thời gian sau khi mua (trong thời hạn bảo hành).</p>';
    pend.slice().sort(function (a, b) { return a.deadline - b.deadline; }).forEach(function (c) {
      var left = c.deadline - s.day;
      h += '<button class="card clmcard" data-act="clmOpen" data-id="' + c.id + '"><div class="dcard"><img class="dthumb" width="48" height="48" alt="" src="' + G.sprites.skuThumb(c.sku, 48) + '"><div class="dinfo"><b>' + E(c.label) + '</b> <span class="chipx ' + (GC[c.grade] || '') + '">' + E(c.grade) + '</span><div class="small muted">' + E(c.cust) + ' · mua ngày ' + c.soldDay + ' · ' + F.short(c.price) + ' · hạn ' + (left >= 0 ? left + ' ngày' : 'quá hạn') + '</div><div class="small">' + E(c.desc) + '</div></div></div></button>';
    });
    var fac = R.claims.filter(function (c) { return c.status === 'Đã chuyển hãng'; });
    if (fac.length) h += '<h4>Đang chờ hãng (' + fac.length + ')</h4><table class="tbl small">' + fac.map(function (c) { return '<tr><td>' + E(c.label) + '<br><span class="muted">' + E(c.cust) + '</span></td><td class="r">còn ~' + Math.max(0, c.brandDue - s.day) + ' ngày</td></tr>'; }).join('') + '</table>';
    // chính sách
    var cs = RT.cskh();
    h += '<h4>Chính sách bảo hành - đổi trả</h4><div class="card small">' +
      '<div class="row"><label>Đổi trả trong <select data-chg="polSet" data-k="days">' + opts([[0, 'Không đổi trả'], [3, '3 ngày'], [7, '7 ngày'], [15, '15 ngày'], [30, '30 ngày']], pol.days) + '</select></label>' +
      '<label>Bảo hành <select data-chg="polSet" data-k="warranty">' + opts([[6, '6 tháng'], [12, '12 tháng'], [24, '24 tháng'], [36, '36 tháng']], pol.warranty) + '</select></label></div><div class="muted">Đệm +12 tháng, gối/phụ kiện tối đa 6 tháng. Hãng có điều khoản bảo hành riêng.</div>' +
      '<div class="row"><label>Điều kiện <select data-chg="polSet" data-k="cond">' + opts([['defect', 'Chỉ lỗi nhà sản xuất'], ['exchange', 'Lỗi + không ưng ý (1 đổi 1)'], ['refund', 'Hoàn tiền']], pol.cond) + '</select></label>' +
      '<label>Phí đổi trả <select data-chg="polSet" data-k="fee">' + opts([[0, '0%'], [0.05, '5%'], [0.1, '10%'], [0.15, '15%'], [0.2, '20%']], pol.fee) + '</select></label></div>' +
      '<div class="row"><label class="nw"><input type="checkbox" data-chg="polChk" data-k="needInvoice"' + (pol.needInvoice ? ' checked' : '') + '> Cần hóa đơn</label><label class="nw"><input type="checkbox" data-chg="polChk" data-k="acceptUsed"' + (pol.acceptUsed ? ' checked' : '') + '> Nhận hàng đã dùng / bóc tem</label></div>' +
      '<div class="row"><label class="nw"><input type="checkbox" data-chg="polChk" data-k="vip"' + (pol.vip ? ' checked' : '') + '> Ưu tiên VIP / hội viên (miễn hóa đơn)</label><label class="nw"><input type="checkbox" data-chg="polChk" data-k="brandPolicy"' + (pol.brandPolicy ? ' checked' : '') + '> Theo điều khoản bảo hành hãng</label></div>' +
      '<div>Mức hào phóng: <b class="' + (sc >= 0 ? 'pos' : 'neg') + '">' + (sc >= 0 ? '+' : '') + Math.round(sc * 100) + '</b> ' + bar((sc + 1) / 2, sc >= 0 ? 'good' : 'bad') + '<div class="muted">Khách ' + (sc >= 0 ? '+' : '') + (sc * 6).toFixed(1) + '% · chốt đơn ' + (sc >= 0 ? '+' : '') + (sc * 12).toFixed(1) + '% · đánh giá ' + (sc >= 0 ? '+' : '') + (sc * 0.2).toFixed(2) + '★ · số yêu cầu ×' + RT.propensity().toFixed(2) + '. Chính sách chặt: ít yêu cầu nhưng đánh giá/danh tiếng kém.</div></div></div>';
    h += '<h4>Chăm sóc khách hàng (CSKH)</h4><div class="card small">Nhân viên CSKH: <b>' + cs.n + '</b>' + (cs.acc ? ' · Kế toán hỗ trợ: ' + G.staff.count('accountant') : '') + '<div class="muted">Tự duyệt các ca <b>rõ ràng</b> theo chính sách (lỗi hãng trong hạn có hóa đơn, gian lận, quá hạn); ca khó chuyển cho bạn. Sao càng cao càng ít quyết sai và ít gian lận lọt.</div>' +
      '<label class="nw"><input type="checkbox" data-chg="polAuto"' + (R.auto ? ' checked' : '') + '> Tự động xử lý ca rõ ràng</label>' + (cs.n || cs.acc ? '' : '<div class="warn">Chưa có CSKH / Kế toán: thuê ở tab Nhân viên.</div>') + '</div>';
    // báo cáo
    var sold = 0; Object.keys(st.soldBySku).forEach(function (k) { sold += st.soldBySku[k]; });
    var br = Object.keys(st.byBrand).sort(function (a, b) { return st.byBrand[b] - st.byBrand[a]; }).slice(0, 4);
    var bad = Object.keys(st.bySku).filter(function (k) { return RT.skuRate(k) > 0.12 && (st.soldBySku[k] || 0) >= 5; }).sort(function (a, b) { return RT.skuRate(b) - RT.skuRate(a); }).slice(0, 4);
    h += '<h4>Báo cáo đổi trả</h4><div class="card small"><table class="tbl small"><tr><td>Tổng yêu cầu / đã bán</td><td class="r">' + st.claims + ' / ' + sold + ' (' + (sold ? Math.round(st.claims / sold * 1000) / 10 : 0) + '%)</td></tr><tr><td>Tháng này: yêu cầu / chi phí</td><td class="r">' + st.monthClaims + ' / ' + F.vnd(st.monthCost) + '</td></tr><tr><td>Đã duyệt / từ chối (oan)</td><td class="r">' + st.approved + ' / ' + st.rejected + ' (' + st.unjust + ')</td></tr><tr><td>Khiếu nại lên cơ quan quản lý</td><td class="r">' + R.complaints + '</td></tr><tr><td>Tổng chi phí bảo hành</td><td class="r">' + F.vnd(st.cost) + '</td></tr></table>' +
      (br.length ? '<b>Theo hãng:</b> ' + br.map(function (b) { return E(G.brandName(b)) + ' ' + st.byBrand[b]; }).join(' · ') + '<br>' : '') +
      '<b>Theo nguồn:</b> ' + ['cho', 'daily', 'oem'].map(function (x) { var n = st.soldBySource[x] || 0; return G.srcById[x].name.split(' ').slice(0, 3).join(' ') + ': ' + (n ? Math.round(RT.sourceRate(x) * 100) + '%' : '—'); }).join(' · ') +
      (bad.length ? '<div class="neg">⚠ SKU hay bị trả: ' + bad.map(function (k) { return E(G.skus[k].label) + ' (' + Math.round(RT.skuRate(k) * 100) + '%)'; }).join('; ') + '. Xem gợi ý ở mục Nhập.</div>' : '') + '</div>';
    var hist = R.claims.filter(function (c) { return c.status !== 'Chờ xử lý' && c.status !== 'Đã chuyển hãng'; }).slice(-8).reverse();
    if (hist.length) h += '<h4>Đã xử lý gần đây</h4><table class="tbl small">' + hist.map(function (c) { return '<tr><td>' + E(c.label) + '<br><span class="muted">' + E(c.cust) + (c.auto ? ' · tự động' : '') + '</span></td><td>' + E(c.status) + '</td></tr>'; }).join('') + '</table>';
    return h;
  }
  function claimSheet() {
    var c = RT.byId(UI.st.clm.id); if (!c) return '<p class="muted">Yêu cầu không còn.</p>';
    var s = G.state, chk = RT.check(c), h = '', K = G.data.claimKinds[c.kind], have = G.wh.total(c.sku);
    document.getElementById('sheet2-title').textContent = 'Bảo hành #' + c.id;
    h += '<div class="card"><div class="dcard"><span class="dthumbw"><img class="dthumb" width="72" height="72" alt="" src="' + G.sprites.skuThumb(c.sku, 72) + '" style="' + (c.grade === 'Hư do khách' || c.grade === 'Biến dạng/bẩn' ? 'filter:sepia(.7) saturate(.6)' : c.grade === 'Hư lỗi sản xuất' ? 'filter:hue-rotate(-20deg) contrast(.9)' : '') + '"></span><div class="dinfo"><b>' + E(c.label) + '</b><div><span class="chipx ' + (GC[c.grade] || '') + '">' + E(c.grade) + '</span> <span class="chipx">' + E(K.name) + '</span></div><div class="small muted">' + E(c.cust) + ' · mua ngày ' + c.soldDay + ' (' + (s.day - c.soldDay) + ' ngày trước) · giá ' + F.vnd(c.price) + ' · nguồn: ' + ({ shop: 'tại quầy', ship: 'giao hàng', live: 'livestream' }[c.source] || c.source) + '</div></div></div><p class="small">“' + E(c.desc) + '”</p></div>';
    h += '<h4>Kiểm tra chính sách</h4><ul class="chk">' + chk.lines.map(function (l) { return '<li class="' + (l.info ? 'inf' : l.ok ? 'ok' : 'no') + '">' + (l.info ? 'ℹ️' : l.ok ? '✅' : '❌') + ' ' + E(l.text) + '</li>'; }).join('') + '</ul>';
    h += '<div class="card ' + (chk.valid ? '' : 'warnbox') + '"><b>Khuyến nghị: ' + E(ACT[chk.recommended]) + '</b><div class="small muted">' + (chk.valid ? 'Yêu cầu hợp lệ theo chính sách.' : 'Yêu cầu không thuộc diện bảo hành/đổi trả theo chính sách hiện tại - từ chối hợp lý; từ chối ca hợp lệ sẽ bị đánh giá xấu.') + ' · Còn ' + have + ' sản phẩm trong kho/kệ.</div></div>';
    h += '<div class="row">' + ['replace', 'refund', 'repair', 'discount', 'brand', 'reject'].map(function (a) { var dis = (a === 'brand' && !chk.brandOk) || (a === 'repair' && !(K.valid || c.kind === 'wear')); return '<button class="btn' + (a === chk.recommended ? ' primary' : (a === 'reject' ? ' danger' : '')) + '" data-act="clmDo" data-id="' + c.id + '" data-a="' + a + '"' + (dis ? ' disabled' : '') + '>' + ACT[a] + '</button>'; }).join('') + '</div>';
    h += '<div class="row small"><label>Giảm giá giữ lại <select data-chg="clmPct">' + opts([[0.1, '10%'], [0.15, '15%'], [0.25, '25%']], UI.st.clm.pct) + '</select></label></div><div class="muted small">Đổi mới lấy hàng từ kho (' + F.short(G.state.costBasis[c.sku] || G.skus[c.sku].cost) + ' vốn); hoàn tiền trừ phí ' + Math.round(RT.pol().fee * 100) + '% với lỗi do khách. Hàng trả về: nguyên tem → bán lại; đã dùng → hàng giảm giá; hư → xóa sổ.</div>';
    return h;
  }
  P.act.clmOpen = function (el) { UI.st.clm.id = +el.dataset.id; UI.sheet2.open('Bảo hành #' + el.dataset.id, claimSheet); };
  P.act.clmDo = function (el) {
    var r = RT.decide(+el.dataset.id, el.dataset.a, { pct: UI.st.clm.pct }); res(r);
    var c = RT.byId(+el.dataset.id); if (!c || c.status !== 'Chờ xử lý') UI.sheet2.close();
  };
  P.chg.clmPct = function (el) { UI.st.clm.pct = +el.value; };
  P.chg.polSet = function (el) { var v = el.dataset.k === 'cond' ? el.value : +el.value; RT.pol()[el.dataset.k] = v; };
  P.chg.polChk = function (el) { RT.pol()[el.dataset.k] = el.checked; };
  P.chg.polAuto = function (el) { G.state.returns.auto = el.checked; };
  P.register({ id: 'warranty', label: 'Bảo hành', render: warrantyTab, badge: function () { return RT.pendingList().length; } });
})();
