/* Sự kiện ra mắt sản phẩm: wizard 5 bước (dòng SP -> quy mô -> ngày -> ngân sách -> xác nhận) + danh sách sự kiện */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, bar = UI.bar, res = UI.res;
  function I() { return G.icon.apply(null, arguments); }
  var STEPS = ['Dòng SP', 'Quy mô', 'Ngày', 'Ngân sách', 'Xác nhận'], SCI = { small: 'shop', mc: 'megaphone', kol: 'live' };
  var f0 = function () { return UI.st.cmp; };
  function chk(ok, txt) { return '<div class="chk ' + (ok ? 'ok' : 'no') + '">' + I(ok ? 'check' : 'cross', 16) + ' ' + txt + '</div>'; }
  function infoBtn() { var f = f0(); return '<button class="mini" data-act="cmpInfo">' + I('bulb', 16) + ' Thông tin</button>' + (f.info ? '<div class="card small infobox">Ngân sách cao hơn thì hiệu ứng mạnh hơn (tối đa ×1.4). Hãng tài trợ 30% nếu quan hệ NCC ≥ 60, 50% nếu ≥ 80. Đủ hàng mẫu và người bán có mặt trong ngày thì khách hài lòng, uy tín tăng, 3 đánh giá 5★. Thiếu thì khách thất vọng, bị đánh giá xấu và trừ uy tín. Có thể hủy trước ngày diễn ra (hoàn 50% ngân sách).</div>' : ''); }
  function stepBar(f) {
    return '<div class="wzbar">' + bar(f.step / 5, 'good') + '<div class="wzsteps">' + STEPS.map(function (n, i) { return '<button class="wzs' + (f.step === i + 1 ? ' on' : '') + (f.step > i + 1 ? ' done' : '') + '" data-act="cmpStep" data-v="' + (i + 1) + '"><b>' + (i + 1) + '</b><span>' + n + '</span></button>'; }).join('') + '</div></div>';
  }
  function offerCard(o, sel) {
    var s = G.state, C = G.campaigns, f = f0(), ln = G.lines[o.lineId], sk = C.sampleSku(o.lineId), have = C.sampleUnits(o.lineId), need = C.SC[f.scale].needStock, left = o.expires - s.day, st = G.life.stage(sk.id);
    var h = '<div class="card offer' + (sel ? ' sel' : '') + '"><div class="irow">' + UI.itemTile({ sku: sk.id, qty: have }) + '<div style="min-width:0;flex:1"><b>' + E(o.name) + '</b><div class="muted small">' + E(G.brandById[o.brand].name) + '</div>' +
      '<div><span class="chipx st-go">' + I('sparkle', 12) + ' Mới ra mắt</span> <span class="chipx ' + (left <= 2 ? 'neg' : 'st-wait') + '">còn ' + left + ' ngày</span> <span class="chipx ' + (have >= need ? 'pos' : 'neg') + '">' + (have >= need ? 'đủ mẫu (' + have + ')' : 'thiếu ' + (need - have) + ' mẫu') + '</span></div></div></div>';
    h += '<div class="row"><button class="mini primary" data-act="cmpPick" data-id="' + o.id + '">' + (sel ? 'Đã chọn ✓' : 'Chọn dòng này') + '</button>';
    if (have < need) h += '<button class="mini" data-act="cmpSample" data-id="' + o.id + '">Nhập hàng mẫu</button>' + (left <= 3 || true ? '<button class="mini' + (left <= 2 ? ' primary' : '') + '" data-act="cmpSample" data-id="' + o.id + '" data-x="1">' + I('bolt', 14) + ' lấy ngay</button>' : '');
    return h + '</div></div>';
  }
  function step1(f) {
    var cp = G.state.camp, h = '';
    if (!cp.offers.length) return '<div class="card small muted">' + I('emptybox', 20) + ' Chưa có dòng sản phẩm mới nào. Khi hãng tung dòng mới (30-60 ngày/lần) bạn có 14 ngày để tổ chức sự kiện ra mắt.</div>';
    h += '<div class="small muted">Chọn dòng sản phẩm mới để ra mắt:</div>';
    cp.offers.forEach(function (o) { h += offerCard(o, +f.offer === o.id); });
    return h;
  }
  function step2(f) {
    var C = G.campaigns, s = G.state, o = C.offerById(f.offer), day = s.day + f.inDays, h = '<div class="small muted">Chọn quy mô sự kiện:</div>';
    var have = o ? C.sampleUnits(o.lineId) : 0, sellers = C.sellersOn(day);
    Object.keys(C.SC).forEach(function (k) {
      var sc = C.SC[k], est = C.estimate(k, sc.cost, o ? o.brand : '', day), sel = f.scale === k;
      h += '<button class="card scale' + (sel ? ' sel' : '') + '" data-act="cmpScale2" data-v="' + k + '"><div class="irow">' + I(SCI[k], 36) + '<div style="flex:1;min-width:0"><b>' + E(sc.name) + '</b><div class="muted small">từ ' + F.short(sc.cost) + '</div></div>' + (sel ? I('check', 24) : '') + '</div>' +
        chk(have >= sc.needStock, 'Hàng mẫu ≥ ' + sc.needStock + ' (có ' + have + ')') + chk(sellers >= sc.needStaff, 'Người bán có mặt ≥ ' + sc.needStaff + ' (ngày ' + day + ': ' + sellers + ')') +
        '<div class="eff"><span>Khách +' + est.traffic + '%</span>' + bar(Math.min(1, est.traffic / 120), 'good') + '<span>Chốt đơn +' + est.conv + '%</span>' + bar(Math.min(1, est.conv / 60), 'good') + '<span>Uy tín +' + sc.rep + ' · 3 đánh giá 5★</span>' + bar(sc.rep / 8, '') + '</div></button>';
    });
    return h;
  }
  function step3(f) {
    var s = G.state, C = G.campaigns, o = C.offerById(f.offer), hol = G.season.upcoming(s.day, 12), h = '<div class="small muted">Chọn ngày tổ chức (vuốt ngang):</div><div class="dchips">';
    for (var d = 1; d <= 10; d++) {
      var day = s.day + d, wd = G.cal.weekday(day), we = wd >= 5, hh = hol.filter(function (x) { return day >= x.start && day <= x.end; })[0], late = o && day > o.expires, cf = C.conflicts(day).some(function (x) { return x.block; });
      h += '<button class="dchip' + (f.inDays === d ? ' on' : '') + (we ? ' we' : '') + (hh ? ' hol' : '') + (late || cf ? ' bad' : '') + '" data-act="cmpDay2" data-v="' + d + '"><small>' + G.cal.WD[wd] + '</small><b>' + day + '</b>' + (hh ? '<i>' + I('gift', 12) + '</i>' : late ? '<i>' + I('warn', 12) + '</i>' : '') + '</button>';
    }
    h += '</div>';
    var day2 = s.day + f.inDays, sc = C.SC[f.scale], sellers = C.sellersOn(day2), hh2 = hol.filter(function (x) { return day2 >= x.start && day2 <= x.end; })[0];
    h += '<div class="card small"><b>Ngày ' + day2 + ' (' + G.cal.WD[G.cal.weekday(day2)] + ')</b>' + (hh2 ? ' <span class="chipx st-go">' + E(hh2.name) + '</span>' : '') + (G.cal.weekday(day2) >= 5 ? ' <span class="chipx pos">cuối tuần: khách đông</span>' : '') +
      chk(sellers >= sc.needStaff, 'Người bán có mặt: ' + sellers + ' / cần ' + sc.needStaff + (sellers < sc.needStaff ? ' - hãy xếp thêm ca ngày này' : ''));
    if (o && day2 > o.expires) h += '<div class="neg small">' + I('warn', 14) + ' Sau thời hạn ra mắt của dòng này (hết hạn ngày ' + o.expires + ').</div>';
    C.conflicts(day2).forEach(function (x) { h += '<div class="' + (x.block ? 'neg' : 'warn') + ' small">' + I(x.block ? 'cross' : 'warn', 14) + ' ' + E(x.t) + '</div>'; });
    return h + '</div>';
  }
  function step4(f) {
    var s = G.state, C = G.campaigns, o = C.offerById(f.offer), sc = C.SC[f.scale], max = sc.cost * 3, nc = C.netCost(o ? o.brand : '', f.budget), pc = C.sponsorPct(o ? o.brand : '');
    var h = '<div class="small muted">Ngân sách cho sự kiện:</div><div class="card small"><div class="row"><b style="font-size:20px">' + F.vnd(f.budget) + '</b></div>' +
      '<input type="range" class="slider" min="' + sc.cost + '" max="' + max + '" step="500000" value="' + f.budget + '" data-chg="cmpBudget">' +
      '<div class="chips">' + [1, 1.5, 2, 3].map(function (m) { return '<button class="chip' + (Math.round(f.budget) === Math.round(sc.cost * m) ? ' on' : '') + '" data-act="cmpPreset" data-v="' + m + '">×' + m + ' · ' + F.short(sc.cost * m) + '</button>'; }).join('') + '</div>' +
      '<table class="tbl small"><tr><td>Ngân sách</td><td class="r">' + F.vnd(f.budget) + '</td></tr><tr><td>Hãng tài trợ ' + Math.round(pc * 100) + '% ' + (pc ? '' : '(cần quan hệ NCC ≥ 60, hiện ' + Math.round(s.rel[o ? o.brand : ''] || 0) + ')') + '</td><td class="r pos">-' + F.vnd(nc.sponsor) + '</td></tr><tr class="tot"><td>Chi phí thực</td><td class="r">' + F.vnd(nc.net) + '</td></tr></table>' + chk(s.money >= f.budget, 'Tiền mặt ' + F.vnd(s.money) + (s.money >= f.budget ? ' - đủ trả ngay' : ' - không đủ, cần ' + F.vnd(f.budget)) ) + '<div class="muted">Hãng trả khoản tài trợ vào sáng ngày diễn ra sự kiện.</div></div>';
    return h;
  }
  function step5(f) {
    var s = G.state, C = G.campaigns, o = C.offerById(f.offer), sc = C.SC[f.scale], day = s.day + f.inDays;
    if (!o) return '<div class="card small neg">Hãy chọn dòng sản phẩm ở bước 1.</div>';
    var est = C.estimate(f.scale, f.budget, o.brand, day), have = C.sampleUnits(o.lineId), sellers = C.sellersOn(day), nc = C.netCost(o.brand, f.budget);
    var h = '<div class="card summary"><div class="irow">' + UI.itemTile({ sku: C.sampleSku(o.lineId).id, qty: have }) + '<div style="flex:1;min-width:0"><b>' + E(o.name) + '</b><div class="small">' + I(SCI[f.scale], 16) + ' ' + E(sc.name) + '</div><div class="small">' + I('clock', 14) + ' Ngày ' + day + ' (' + G.cal.WD[G.cal.weekday(day)] + ') · ngân sách ' + F.short(f.budget) + ' (thực ' + F.short(nc.net) + ')</div></div></div>' +
      '<div class="kpis"><div><b>' + est.vis[0] + '-' + est.vis[1] + '</b><small>khách</small></div><div><b>' + F.short(est.rev[0]) + '-' + F.short(est.rev[1]) + '</b><small>doanh thu</small></div><div><b class="' + (est.roi[1] >= 0 ? 'pos' : 'neg') + '">' + est.roi[0] + '..' + est.roi[1] + '%</b><small>ROI</small></div><div><b>+' + est.rep + '</b><small>uy tín</small></div></div></div>';
    h += '<div class="card small"><b>Lưu ý</b>' + chk(have >= sc.needStock, 'Hàng mẫu: ' + have + '/' + sc.needStock) + chk(sellers >= sc.needStaff, 'Người bán ngày đó: ' + sellers + '/' + sc.needStaff) + chk(s.money >= f.budget, 'Đủ tiền mặt') +
      '<ul class="alist"><li>Thiếu mẫu / người bán lúc 10h: khách thất vọng, đánh giá 2★, mất uy tín.</li><li>Có thể hủy trước ngày diễn ra, hoàn 50% ngân sách.</li><li>Kết quả chỉ là ước tính theo khách trung bình gần đây.</li></ul></div>';
    var blocked = C.conflicts(day).some(function (x) { return x.block; });
    h += '<button class="btn primary big" data-act="cmpBook"' + (blocked || s.money < f.budget ? ' disabled' : '') + '>' + I('gift', 20) + ' Đặt sự kiện</button>';
    return h;
  }
  function eventCards() {
    var s = G.state, C = G.campaigns, h = '', evs = s.camp.events.filter(function (e) { return e.status !== 'Hủy'; }).slice().sort(function (a, b) { return b.day - a.day; });
    if (!evs.length) return '';
    h += '<h4>Sự kiện của bạn</h4>';
    evs.slice(0, 8).forEach(function (e) {
      var sc = C.SC[e.scale], left = e.day - s.day, chip = e.status === 'Đã đặt' ? ['st-wait', 'Đã lên lịch'] : e.status === 'Đang diễn ra' ? ['st-go', 'Đang diễn ra'] : ['st-ok', 'Hoàn tất'];
      h += '<div class="card small evcard"><div class="irow">' + I(SCI[e.scale], 30) + '<div style="flex:1;min-width:0"><b>' + E(e.name) + '</b><div class="muted">' + E(sc.name) + ' · ngày ' + e.day + '</div></div><span class="chipx ' + chip[0] + '">' + chip[1] + '</span></div>';
      if (e.status === 'Đã đặt') {
        var have = C.sampleUnits(e.lineId), sellers = C.sellersOn(e.day);
        h += '<div class="muted">' + (left === 1 ? 'Ngày mai diễn ra' : 'Còn ' + left + ' ngày') + '</div>' + chk(have >= sc.needStock, 'Hàng mẫu ' + have + '/' + sc.needStock + (have < sc.needStock ? ' <button class="mini" data-act="cmpSampleEv" data-id="' + e.id + '">Nhập mẫu</button><button class="mini" data-act="cmpSampleEv" data-id="' + e.id + '" data-x="1">' + I('bolt', 12) + ' lấy ngay</button>' : '')) +
          chk(sellers >= sc.needStaff, 'Người bán ngày đó ' + sellers + '/' + sc.needStaff + (sellers < sc.needStaff ? ' <button class="mini" data-act="goTab" data-id="staff">Xếp ca</button>' : '')) +
          '<div class="row"><button class="mini" data-act="cmpCancelEv" data-id="' + e.id + '">Hủy (hoàn ' + F.short(e.budget * 0.5) + ')</button></div>';
      } else if (e.status === 'Đang diễn ra') {
        h += chk(e.stockOk !== false, 'Hàng mẫu ' + C.sampleUnits(e.lineId) + '/' + sc.needStock) + chk(e.staffOk !== false, 'Người bán có mặt ' + C.staffOnDuty() + '/' + sc.needStaff);
      } else if (e.result) {
        h += '<div class="kpis"><div>' + I('people', 18) + '<b>' + e.result.visitors + '</b><small>khách</small></div><div>' + I('coin', 18) + '<b>' + F.short(e.result.revenue) + '</b><small>doanh thu</small></div><div>' + I('crown', 18) + '<b>' + (e.result.ok ? '+' + sc.rep : '-1') + '</b><small>uy tín</small></div><div>' + I('star', 18) + '<b>' + (e.result.ok ? '3×5★' : '2★') + '</b><small>đánh giá</small></div></div>';
      }
      h += '</div>';
    });
    return h;
  }
  UI.campLaunch = function () {
    var s = G.state, C = G.campaigns, f = f0(), cp = s.camp;
    if (!f.step) f.step = 1; if (!f.scale || !C.SC[f.scale]) f.scale = 'small'; if (!f.inDays) f.inDays = 2;
    if (!cp.offers.some(function (o) { return o.id === +f.offer; })) f.offer = cp.offers.length ? String(cp.offers[0].id) : '';
    var sc = C.SC[f.scale]; if (!f.budget || f.budget < sc.cost) f.budget = sc.cost; if (f.budget > sc.cost * 3) f.budget = sc.cost * 3;
    var h = '<div class="row"><b>Sự kiện ra mắt sản phẩm</b> ' + infoBtn() + '</div>';
    if (cp.offers.length) {
      h += '<div class="card wiz">' + stepBar(f) + '<div class="wzbody">' + [step1, step2, step3, step4, step5][f.step - 1](f) + '</div>' +
        '<div class="row wznav"><button class="btn" data-act="cmpStep" data-v="' + Math.max(1, f.step - 1) + '"' + (f.step === 1 ? ' disabled' : '') + '>‹ Quay lại</button>' + (f.step < 5 ? '<button class="btn primary" data-act="cmpStep" data-v="' + (f.step + 1) + '">Tiếp tục ›</button>' : '') + '</div></div>';
    } else h += step1(f);
    return h + eventCards();
  };
  var A = P.act, Ch = P.chg;
  A.cmpInfo = function () { var f = f0(); f.info = !f.info; };
  A.cmpStep = function (el) { f0().step = Math.max(1, Math.min(5, +el.dataset.v)); };
  A.cmpPick = function (el) { var f = f0(); f.offer = el.dataset.id; if (f.step === 1) f.step = 2; };
  A.cmpScale2 = function (el) { var f = f0(); f.scale = el.dataset.v; f.budget = 0; };
  A.cmpDay2 = function (el) { f0().inDays = +el.dataset.v; };
  A.cmpPreset = function (el) { var f = f0(); f.budget = Math.round(G.campaigns.SC[f.scale].cost * +el.dataset.v); };
  A.cmpSample = function (el) { res(G.campaigns.sampleOrder(+el.dataset.id, !!el.dataset.x)); };
  A.cmpSampleEv = function (el) { var e = G.state.camp.events.filter(function (x) { return x.id === +el.dataset.id; })[0]; if (!e) return; var o = G.campaigns.sampleSku(e.lineId), sc = G.campaigns.SC[e.scale], it = {}; it[o.id] = Math.max(1, sc.needStock - G.campaigns.sampleUnits(e.lineId) + 1); res(G.purchasing.place('daily', it, 'st', false, !!el.dataset.x)); };
  Ch.cmpBudget = function (el) { f0().budget = Math.round((+el.value || 0) / 500000) * 500000; };
  A.cmpBook = function () { var f = f0(), r = G.campaigns.book(+f.offer, f.scale, G.state.day + f.inDays, f.budget); res(r); if (r.ok) { f.step = 1; f.budget = 0; } };
  UI.openCamp = function (offerId) { var f = f0(); f.seg = 'launch'; f.offer = String(offerId); f.step = 2; P.show('camp'); };
})();
