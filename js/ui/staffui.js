/* Giao diện Nhân viên (thiết kế lại): tổng quan, Đội ngũ, Tuyển dụng, Lịch ca, Đào tạo, Phòng NV */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, bar = UI.bar, res = UI.res, opts = UI.opts;
  function I() { return G.icon.apply(null, arguments); }
  var RI = { sales: 'user', b2b: 'hotel', accountant: 'receipt', warehouse: 'box', delivery: 'truck', marketing: 'megaphone', cskh: 'shield', manager: 'crown' };
  var BEN = { sales: 'Tư vấn khách, chốt đơn nhiều hơn', b2b: 'Nhiều đơn khách sạn, đàm phán giá', accountant: 'Giảm thuế/phí, báo cáo chi tiết', warehouse: 'Tự bổ sung kệ, kiểm hàng, gợi ý nhập', delivery: 'Giao đơn tại nhà trong ngày, miễn phí ship', marketing: 'Thêm khách, chạy chiến dịch', cskh: 'Tự xử lý bảo hành / đổi trả & phản hồi đánh giá', manager: 'Buff cả đội, tự chia ca' };
  var SUBS = [['team', 'Đội ngũ', 'people'], ['hire', 'Tuyển dụng', 'user2'], ['sched', 'Lịch ca', 'clock'], ['train', 'Đào tạo', 'book'], ['room', 'Phòng NV', 'cup'], ['meeting', 'Họp', 'chat']];
  UI.st.staffFilter = ''; UI.st.hireRole = ''; UI.st.staffSel = null; UI.st.staffInfo = false; UI.st.fireAsk = null;
  // ---- ảnh chibi (cache) ----
  var TH = {};
  function lookOf(o) { var num = typeof o.id === 'number' ? o.id : (parseInt(String(o.id).replace(/\D/g, ''), 10) || 7); return G.render.staffLook({ id: num, role: o.role, color: G.roleById[o.role].color }); }
  UI.staffThumb = function (o, w, h) {
    w = w || 48; h = h || 60; var r = Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1))), key = o.id + o.role + w + 'x' + h + '@' + r;
    if (TH[key]) return TH[key];
    var L = lookOf(o), cv = document.createElement('canvas'); cv.width = w * r; cv.height = h * r; var c = cv.getContext('2d'); c.scale(r, r);
    c.fillStyle = '#EAF6FF'; c.fillRect(0, 0, w, h); G.sprites.poly(c, [[0, h - 8], [w, h - 8], [w, h], [0, h]], '#D6CEF0');
    c.save(); c.translate(w / 2, h - 6); c.scale(h / 50, h / 50);
    G.sprites.person(c, { x: 0, y: 0, shirt: '#FFFFFF', band: G.roleById[o.role].color, skin: L.skin, hair: L.hair, hairStyle: L.hairStyle, vest: L.vest, glasses: L.glasses, hat: L.hat, tie: L.tie, suit: L.suit, helmet: L.helmet, headset: L.headset, face: 1, mood: 'happy', role: o.role, phase: 0 });
    c.restore(); return (TH[key] = cv.toDataURL());
  };
  function av(o, w, h) { return '<img class="avt" width="' + (w || 48) + '" height="' + (h || 60) + '" alt="" src="' + UI.staffThumb(o, w, h) + '">'; }
  function stars(n) { var h = '<span class="stars3">'; for (var i = 1; i <= 3; i++) h += I('star', 14, i <= n ? '' : 'off'); return h + '</span>'; }
  function roleChip(rid) { var r = G.roleById[rid]; return '<span class="rchip" style="background:' + r.color + '">' + I(RI[rid] || 'user', 12) + ' ' + E(r.name) + '</span>'; }
  function today() { return G.cal.weekday(G.state.day); }
  function shiftChip(x) { var sh = G.staff.shiftFor(x, G.state.day); return '<span class="schip sh-' + sh + '">' + (sh === 'off' ? 'Nghỉ hôm nay' : G.data.shifts[sh].label) + '</span>'; }
  function statusChip(x) {
    var s = G.state, e = G.staff.ent && G.staff.ent(x.id);
    if (x.status === 'training') return '<span class="chipx st-go">Đang học · về ngày ' + (x.until + 1) + '</span>';
    if (x.status === 'live') return '<span class="chipx st-go">Livestream</span>';
    if (x.status === 'leave') return '<span class="chipx neg">Nghỉ phép · đến ngày ' + x.until + '</span>';
    if (e && (e.state === 'inRoom' || e.state === 'toRoom' || e.state === 'rest')) return '<span class="chipx st-wait">Ở phòng NV</span>';
    if (G.staff.shiftOn(x, s.day, s.minute)) return '<span class="chipx pos">Đang làm</span>';
    return '<span class="chipx st-wait">Ngoài ca</span>';
  }
  function mini(label, v, cls) { return '<div class="mb"><span>' + label + '</span>' + bar(v / 100, cls) + '<b>' + Math.round(v) + '</b></div>'; }
  function satCls(v) { return v < 35 ? 'bad' : v > 70 ? 'good' : ''; }
  // ---- tổng quan ----
  function summary() {
    var s = G.state, S = G.staff, st = s.staff, n = st.length, h = '';
    var pr = S.payroll(), lm = s.history.months.length ? s.history.months[s.history.months.length - 1].revenue : (s.month.revenue || 0), ratio = lm > 0 ? pr / lm : 0;
    var onNow = st.filter(function (x) { return S.shiftOn(x, s.day, s.minute); }).length, onToday = st.filter(function (x) { return S.shiftFor(x, s.day) !== 'off' && x.status === 'ok'; }).length;
    var sat = n ? st.reduce(function (a, x) { return a + x.sat; }, 0) / n : 0, fat = n ? st.reduce(function (a, x) { return a + Math.min(1, x.fatigue || 0); }, 0) / n * 100 : 0;
    var pcol = ratio > 0.35 ? 'neg' : ratio > 0.25 ? 'warn' : 'pos';
    h += '<div class="card staffsum"><div class="kpis"><div>' + I('people', 22) + '<b>' + n + '</b><small>nhân viên</small></div><div>' + I('clock', 22) + '<b>' + onNow + '/' + onToday + '</b><small>đang làm / hôm nay</small></div><div>' + I('coin', 22) + '<b class="' + pcol + '">' + F.short(pr) + '</b><small>lương/tháng' + (lm > 0 ? ' · ' + Math.round(ratio * 100) + '% DT' : '') + '</small></div></div>';
    if (n) h += mini('Hài lòng TB', sat, satCls(sat)) + mini('Mệt TB', fat, fat > 50 ? 'bad' : '');
    var w = [];
    var quit = st.filter(function (x) { return x.sat < 30; }), tired = st.filter(function (x) { return (x.fatigue || 0) > 0; }), raise = st.filter(function (x) { return x.raiseAsked || s.day - x.lastRaise >= 150; });
    if (quit.length) w.push(['bad', I('warn', 14) + ' ' + quit.length + ' người sắp nghỉ việc: ' + quit.map(function (x) { return E(x.name.split(' ').pop()); }).join(', ')]);
    if (tired.length) w.push(['warn', I('pillow', 14) + ' ' + tired.length + ' người đang mệt: ' + tired.map(function (x) { return E(x.name.split(' ').pop()); }).join(', ')]);
    if (raise.length) w.push(['warn', I('coin', 14) + ' ' + raise.length + ' người sắp / đang đòi tăng lương']);
    var gap = coverageGaps(); if (gap.length) w.push(['bad', I('clock', 14) + ' Ca trống NV bán hàng: ' + gap.slice(0, 4).join(', ') + (gap.length > 4 ? '...' : '')]);
    if (s.money < pr) w.push(['bad', I('warn', 14) + ' Tiền mặt chưa đủ trả lương tháng']);
    h += w.length ? '<div class="swarn">' + w.map(function (x) { return '<div class="' + x[0] + ' small">' + x[1] + '</div>'; }).join('') + '</div>' : '<div class="pos small">' + I('check', 14) + ' Mọi thứ ổn</div>';
    return h + '</div>';
  }
  function coverage(d) { var am = 0, pm = 0; G.state.staff.forEach(function (x) { if (x.role !== 'sales' || x.status === 'leave') return; var sh = x.sched[d]; if (sh === 'am' || sh === 'full') am++; if (sh === 'pm' || sh === 'full') pm++; }); return [am, pm]; }
  function coverageGaps() { var out = []; for (var i = 0; i < 7; i++) { var c = coverage(i); if (!c[0]) out.push(G.cal.WD[i] + ' sáng'); if (!c[1]) out.push(G.cal.WD[i] + ' chiều'); } return out; }
  // ---- Đội ngũ ----
  function teamView() {
    var s = G.state, S = G.staff, f = UI.st.staffFilter, h = '';
    if (!s.staff.length) return '<div class="card empty">' + I('people', 40) + '<p>Chưa có nhân viên nào.</p><button class="btn primary" data-act="staffSub" data-id="hire">Tuyển người</button></div>';
    var roles = G.data.roles.filter(function (r) { return S.count(r.id) > 0; });
    if (f && !S.count(f)) f = UI.st.staffFilter = '';
    h += '<div class="chips"><button class="chip' + (!f ? ' on' : '') + '" data-act="staffFilter" data-id="">Tất cả (' + s.staff.length + ')</button>' + roles.map(function (r) { return '<button class="chip' + (f === r.id ? ' on' : '') + '" data-act="staffFilter" data-id="' + r.id + '">' + I(RI[r.id], 14) + ' ' + E(r.name.split(' ')[0]) + ' (' + S.count(r.id) + ')</button>'; }).join('') + '</div>';
    s.staff.filter(function (x) { return !f || x.role === f; }).forEach(function (x) {
      var need = G.data.xpForStar[x.stars + 1], xp = need ? Math.min(1, (x.xp - G.data.xpForStar[x.stars]) / (need - G.data.xpForStar[x.stars])) : 1;
      h += '<button class="card scard" data-act="staffOpen" data-id="' + x.id + '"><div class="irow">' + av(x) + '<div class="sinfo"><div><b>' + E(x.name) + '</b> ' + stars(x.stars) + '</div><div>' + roleChip(x.role) + ' ' + shiftChip(x) + ' ' + statusChip(x) + '</div>' +
        mini('Hài lòng', x.sat, satCls(x.sat)) + mini('Mệt', Math.min(1, x.fatigue || 0) * 100, (x.fatigue || 0) > 0.5 ? 'bad' : '') +
        '<div class="small muted">' + F.short(x.salary) + '/th · XP ' + (need ? Math.floor(x.xp) + '/' + need : 'tối đa') + '</div>' + (need ? bar(xp, 'good') : '') + '</div></div></button>';
    });
    return h;
  }
  function detail() {
    var s = G.state, S = G.staff, x = S.byId(+UI.st.staffSel); if (!x) return '<p class="muted">Nhân viên không còn.</p>';
    var need = G.data.xpForStar[x.stars + 1], days = s.day - x.hiredDay, nextRaise = Math.max(0, 180 - (s.day - x.lastRaise)), mk = S.market(x.role, x.stars), ask = UI.st.fireAsk === x.id;
    var h = '<div class="irow">' + av(x, 64, 80) + '<div><b style="font-size:17px">' + E(x.name) + '</b><div>' + stars(x.stars) + '</div><div>' + roleChip(x.role) + '</div><div>' + statusChip(x) + '</div></div></div>';
    h += mini('Hài lòng', x.sat, satCls(x.sat)) + mini('Mệt', Math.min(1, x.fatigue || 0) * 100, (x.fatigue || 0) > 0.5 ? 'bad' : '') + (need ? '<div class="mb"><span>XP</span>' + bar((x.xp - G.data.xpForStar[x.stars]) / (need - G.data.xpForStar[x.stars]), 'good') + '<b>' + Math.floor(x.xp) + '/' + need + '</b></div>' : '<div class="small pos">Đã đạt tối đa 3 sao</div>');
    h += '<table class="tbl small"><tr><td>Lương</td><td class="r">' + F.vnd(x.salary) + '/tháng <span class="muted">(thị trường ' + F.short(mk) + ')</span></td></tr><tr><td>Đã làm</td><td class="r">' + days + ' ngày (từ ngày ' + x.hiredDay + ')</td></tr><tr><td>Đòi tăng lương</td><td class="r">' + (x.raiseAsked ? 'đang đòi' : 'sau ~' + nextRaise + ' ngày') + '</td></tr><tr><td>Tính cách</td><td class="r">' + (G.meeting && G.meeting.trait(x.id) ? E(G.meeting.TRAITS[G.meeting.trait(x.id)].name) : '-') + '</td></tr><tr><td>Hiệu suất</td><td class="r">×' + S.eff(x).toFixed(2) + '</td></tr><tr><td>Kỹ năng</td><td class="r">' + (Object.keys(x.skills || {}).length || 'chưa có') + ' khóa</td></tr></table>';
    if (x.role === 'warehouse') h += '<div class="card small">' + I('box', 14) + ' <b>Tự đặt hàng:</b> ' + (G.autobuy.st().paused ? 'đang tạm dừng' : G.autobuy.st().mode === 'auto' ? 'tự động đặt' : G.autobuy.st().mode === 'list' ? 'gom danh sách cần mua mỗi sáng, bạn duyệt trước khi mở cửa' : 'đề xuất từng món, cần bạn duyệt') + ' · đã dùng ' + F.short(G.autobuy.st().spent) + '/' + F.short(G.autobuy.st().budget) + ' tháng này<div class="muted">Chỉnh trong tab Nhập.</div></div>';
    h += '<div class="small"><b>Ca tuần này</b> (bấm để đổi)</div><div class="wkrow">' + x.sched.map(function (sh, i) { return '<button class="sh sh-' + sh + (i === today() ? ' today' : '') + '" data-act="cycle" data-id="' + x.id + '" data-wd="' + i + '"><small>' + G.cal.WD[i] + '</small><br>' + shCode(sh) + '</button>'; }).join('') + '</div>';
    h += '<div class="row"><button class="btn primary" data-act="staffTrain" data-id="' + x.id + '"' + (x.status === 'ok' ? '' : ' disabled') + '>' + I('book', 16) + ' Đào tạo</button><button class="btn" data-act="staffRaise" data-id="' + x.id + '">' + I('coin', 16) + ' Tăng lương 10%</button><button class="btn" data-act="bonus" data-id="' + x.id + '">' + I('gift', 16) + ' Thưởng ' + F.short(x.salary * 0.5) + '</button></div>';
    h += ask ? '<div class="card warnbox small">Sa thải ' + E(x.name) + '? Phải trả trợ cấp ' + F.vnd(x.salary * 0.5) + '.<div class="row"><button class="btn danger" data-act="staffFire" data-id="' + x.id + '">Xác nhận sa thải</button><button class="btn" data-act="staffFireNo">Hủy</button></div></div>' : '<div class="row"><button class="btn danger" data-act="staffFireAsk" data-id="' + x.id + '">Sa thải</button></div>';
    return h;
  }
  function shCode(sh) { return { off: 'Nghỉ', am: 'S', pm: 'C', full: 'F' }[sh]; }
  // ---- Tuyển dụng ----
  function recommend(rid) {
    var s = G.state, S = G.staff, n = S.count(rid), t = s.today || {};
    if (rid === 'cskh') return n === 0 && (G.returns.pendingList().length >= 2 || G.reviews.unanswered().length >= 3);
    if (rid === 'delivery') return G.shipping.pendingCount() >= 3 || (n === 0 && s.shipping.orders.length > 4);
    if (rid === 'sales') return n === 0 || (t.lostWait || 0) >= 3;
    if (rid === 'warehouse') return n === 0 && s.slots.filter(function (x) { return !x.sku; }).length >= 3;
    if (rid === 'b2b') return n === 0 && s.b2b.orders.length + G.b2b.pendingOffers().length > 0;
    if (rid === 'marketing') return n === 0 && s.camp.promos.length > 0;
    if (rid === 'manager') return n === 0 && s.staff.length >= 6;
    if (rid === 'accountant') return n === 0 && s.level >= 2;
    return false;
  }
  function hireView() {
    var s = G.state, S = G.staff, st = UI.st, h = '';
    var roles = G.data.roles; if (!st.hireRole || !G.roleById[st.hireRole]) st.hireRole = roles[0].id;
    h += '<div class="rgrid">' + roles.map(function (r) {
      var un = S.unlocked(r.id), rec = un && recommend(r.id);
      return '<button class="rcard' + (st.hireRole === r.id ? ' on' : '') + (un ? '' : ' lk') + '" data-act="hireRole" data-id="' + r.id + '"><div class="rhd">' + I(RI[r.id], 28) + '<span class="cnt">' + S.count(r.id) + '</span></div><b>' + E(r.name) + '</b><small>' + (un ? E(BEN[r.id]) : 'Mở ở cấp ' + E(G.data.levels[r.unlock].name)) + '</small>' + (rec ? '<span class="rec">Nên thuê</span>' : '') + '</button>';
    }).join('') + '</div>';
    var r = G.roleById[st.hireRole], cs = s.cand[r.id] || [], dleft = 7 - ((s.day - 1) % 7);
    h += '<div class="row"><b>' + I(RI[r.id], 20) + ' ' + E(r.name) + '</b><button class="mini" data-act="hireInfo">' + I('bulb', 14) + ' Mô tả</button><span class="muted small">Ứng viên mới sau ' + dleft + ' ngày</span></div>';
    if (st.staffInfo) h += '<div class="card small infobox">' + E(r.desc) + '<br><span class="muted">Không giới hạn số lượng. Lương trả ngày 1 hàng tháng; lương ứng viên tăng theo quy mô đội ngũ.</span></div>';
    if (!S.unlocked(r.id)) return h + '<div class="card small warn">' + I('lock', 16) + ' Mở ở cấp ' + E(G.data.levels[r.unlock].name) + '</div>';
    if (!cs.length) h += '<p class="muted small">Chưa có ứng viên.</p>';
    cs.forEach(function (c) {
      var mk = S.market(c.role, c.stars), ratio = c.salary / mk, tag = ratio < 0.97 ? ['pos', 'rẻ'] : ratio > 1.05 ? ['neg', 'đắt'] : ['', 'đúng giá'], eff = [0, 0.8, 1, 1.25][c.stars];
      h += '<div class="card cand2"><div class="irow">' + av(c) + '<div class="sinfo"><div><b>' + E(c.name) + '</b> ' + stars(c.stars) + '</div><div class="small">Lương <b>' + F.vnd(c.salary) + '</b>/th <span class="chipx ' + (tag[0] || 'st-wait') + '">' + tag[1] + '</span> <span class="muted">(TT ' + F.short(mk) + ')</span></div>' +
        '<div class="mb"><span>Hiệu suất</span>' + bar(eff / 1.25, 'good') + '<b>×' + eff + '</b></div><div class="mb"><span>Tiềm năng</span>' + bar(c.stars / 3, '') + '<b>' + c.stars + '/3</b></div></div></div><button class="btn primary big" data-act="hire" data-id="' + c.id + '">Thuê · ' + F.short(c.salary) + '/tháng</button></div>';
    });
    return h;
  }
  // ---- Lịch ca ----
  function schedView() {
    var s = G.state, S = G.staff, h = '', mgr = S.hasManager(), td = today();
    h += '<div class="row">' + (mgr ? '<button class="btn primary" data-act="autoSched">' + I('clock', 16) + ' Tự động chia ca</button><label class="nw"><input type="checkbox" data-chg="autoSchedOn"' + (s.autoSchedule ? ' checked' : '') + '> Tự bù ca khi NV vắng</label>' : '<span class="muted small">' + I('crown', 14) + ' Thuê Quản lý để mở tự động chia ca.</span>') + '</div>';
    h += '<div class="small muted">Sáng 8-14h · Chiều 14-21h · Full cả ngày · bấm ô để đổi (Nghỉ → Sáng → Chiều → Full). Full quá 5 ngày liên tiếp sẽ mệt.</div>';
    if (!s.staff.length) return h + '<p class="muted">Chưa thuê nhân viên nào.</p>';
    h += '<div class="schedwrap"><table class="sched2"><tr><th class="stk">NV</th>' + G.cal.WD.map(function (d, i) { return '<th class="' + (i === td ? 'today' : '') + '">' + d + '</th>'; }).join('') + '</tr>';
    s.staff.forEach(function (x) {
      h += '<tr><td class="stk">' + av(x, 28, 34) + '<span>' + E(x.name.split(' ').pop()) + '</span></td>' + x.sched.map(function (sh, i) { return '<td class="' + (i === td ? 'today' : '') + '"><button class="sh sh-' + sh + '" data-act="cycle" data-id="' + x.id + '" data-wd="' + i + '">' + shCode(sh) + '</button></td>'; }).join('') + '</tr>';
    });
    h += '<tr class="cov"><td class="stk"><b>Bán hàng</b><br><small>sáng/chiều</small></td>' + [0, 1, 2, 3, 4, 5, 6].map(function (d) { var c = coverage(d); return '<td class="' + (d === td ? 'today' : '') + '"><span class="cv ' + (c[0] ? '' : 'red') + '">' + c[0] + '</span>/<span class="cv ' + (c[1] ? '' : 'red') + '">' + c[1] + '</span></td>'; }).join('') + '</tr></table></div>';
    h += '<p class="muted small">Hàng cuối: số NV bán hàng (chưa kể chủ) ca sáng / chiều, <b class="neg">đỏ</b> = trống ca. Chủ luôn đứng quầy nhưng ca trống giờ cao điểm → khách chờ lâu, đánh giá thấp.</p>';
    return h;
  }
  // ---- Đào tạo / Phòng NV ----
  function trainView() {
    var s = G.state, tr = UI.st.tr, elig = s.staff.filter(function (x) { return x.status === 'ok'; }), h = '';
    if (!elig.some(function (x) { return String(x.id) === String(tr.staff); })) tr.staff = elig.length ? String(elig[0].id) : '';
    if (elig.length) h += '<div class="avchips">' + elig.map(function (x) { return '<button class="avc' + (String(x.id) === String(tr.staff) ? ' on' : '') + '" data-act="trPick" data-id="' + x.id + '">' + av(x, 36, 44) + '<small>' + E(x.name.split(' ').pop()) + '</small></button>'; }).join('') + '</div>';
    var tmp = document.createElement('div'); tmp.innerHTML = UI.staffOld.trainView();
    // bỏ ô chọn nhân viên (đã thay bằng avatar)
    var sel = tmp.querySelector('[data-chg=trStaff]'); if (sel) { var row = sel.closest('.row'); if (row) row.remove(); }
    return h + tmp.innerHTML;
  }
  function roomView() { return UI.staffOld.roomCard() || '<p class="muted">Chưa mở khóa.</p>'; }
  UI.staffTab = function () {
    var st = UI.st, sub = st.staffSub; if (['team', 'hire', 'sched', 'train', 'room', 'meeting'].indexOf(sub) < 0) sub = st.staffSub = sub === 'list' ? 'team' : 'team';
    var h = summary() + '<div class="segs sg5">' + SUBS.map(function (x) { return '<button class="seg' + (sub === x[0] ? ' on' : '') + '" data-act="staffSub" data-id="' + x[0] + '">' + I(x[2], 16) + '<span>' + x[1] + '</span></button>'; }).join('') + '</div>';
    return h + ({ team: teamView, hire: hireView, sched: schedView, train: trainView, room: roomView, meeting: function () { return UI.meetingView ? UI.meetingView() : ''; } }[sub])();
  };
  var A = P.act;
  A.staffFilter = function (el) { UI.st.staffFilter = el.dataset.id; };
  A.hireRole = function (el) { UI.st.hireRole = el.dataset.id; };
  A.hireInfo = function () { UI.st.staffInfo = !UI.st.staffInfo; };
  A.trPick = function (el) { UI.st.tr.staff = el.dataset.id; UI.st.tr.course = ''; };
  A.staffOpen = function (el) { UI.st.staffSel = +el.dataset.id; UI.st.fireAsk = null; UI.sheet2.open('Nhân viên', detail); };
  A.staffTrain = function (el) { UI.st.tr.staff = el.dataset.id; UI.st.tr.course = ''; UI.st.staffSub = 'train'; UI.sheet2.close && UI.sheet2.close(); };
  A.staffRaise = function (el) { res(G.staff.raise(+el.dataset.id, 0.1)); };
  A.staffFireAsk = function (el) { UI.st.fireAsk = +el.dataset.id; };
  A.staffFireNo = function () { UI.st.fireAsk = null; };
  A.staffFire = function (el) { var x = G.staff.byId(+el.dataset.id); if (!x) return; G.staff.fire(x.id); UI.st.fireAsk = null; G.notify.toast('Đã sa thải ' + E(x.name), 'info'); UI.sheet2.close && UI.sheet2.close(); };
})();
