/* Tab Nhân viên / Đơn lớn / Nâng cấp / Báo cáo */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, opts = UI.opts, bar = UI.bar, res = UI.res;

  // ======================= NHÂN VIÊN =======================
  function stars(n) { return '<span class="stars">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(3 - n) + '</span></span>'; }
  function staffTabOld() {
    var st = UI.st, sub = st.staffSub;
    var h = '<div class="subtabs">' + [['list', 'Danh sách'], ['sched', 'Lịch ca'], ['train', 'Đào tạo']].map(function (x) { return '<button class="chip ' + (sub === x[0] ? 'on' : '') + '" data-act="staffSub" data-id="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    return h + (sub === 'sched' ? schedView() : sub === 'train' ? trainView() : listView());
  }
  function staffTab() { return UI.staffTab(); }
  UI.staffOld = { roomCard: function () { return roomCard(); }, trainView: function () { return trainView(); } };
  function statusChip(x) {
    if (x.status === 'training') return '<span class="chipx st-go">Đang học (về ngày ' + (x.until + 1) + ')</span>';
    if (x.status === 'live') return '<span class="chipx st-go">Đang livestream</span>';
    if (x.status === 'leave') return '<span class="chipx neg">Nghỉ phép (đến ngày ' + x.until + ')</span>';
    return '';
  }
  function roomCard() {
    var s = G.state, R = G.staffroom, h = '';
    if (!R.built() && s.level < R.MIN_LEVEL && !G.unlock.showAll('room')) return G.unlock.teaser('room', true);
    if (!R.built()) return '<div class="card"><b>☕ Phòng nhân viên</b><p class="small muted">Khu nghỉ ngơi cạnh cửa hàng: NV hết ca / rảnh lâu vào nghỉ, hồi phục mệt và hài lòng, có thể nâng cấp. Mở từ cấp Cửa hàng nhỏ.</p><button class="btn primary" data-act="srBuild"' + (s.level < R.MIN_LEVEL ? ' disabled' : '') + '>' + (s.level < R.MIN_LEVEL ? '🔒 Chưa đủ cấp' : 'Xây phòng nhân viên · ' + F.short(R.BUILD_COST)) + '</button></div>';
    var b = R.bonus();
    h += '<div class="card"><b>☕ Phòng nhân viên</b> <span class="muted small">chỗ ngồi ' + R.occ.length + '/' + R.seats() + ' · duy trì ' + F.vnd(R.upkeep()) + '/ngày</span>';
    h += '<div class="small">Đang nghỉ: ' + (R.occ.length ? R.occ.map(function (o) { return E(o.name.split(' ').pop()) + ' ' + ({ coffee: '☕', sleep: '💤', read: '📖', sit: '💬' }[o.state] || '') + ' <span class="muted">(' + ({ shift: 'hết ca', idle: 'rảnh', train: 'đang học' }[o.reason] || '') + ')</span>'; }).join(' · ') : '<span class="muted">chưa có ai</span>') + '</div>';
    h += '<div class="small muted">Bonus: nghỉ hồi phục ×' + b.rest.toFixed(1) + ' · hài lòng +' + b.sat.toFixed(1) + '/ngày · ngưỡng mệt +' + b.fat + ' ngày · đào tạo +' + Math.round(b.train * 100) + '% XP. NV nghỉ ≥20 phút/ngày được giảm mệt.</div>';
    h += '<table class="tbl small">' + G.data.roomUps.map(function (u) { return '<tr><td><b>' + E(u.name) + '</b><br><span class="muted">' + E(u.desc) + '</span></td><td class="r nw">' + (R.has(u.id) ? '<span class="pos">✓ Đã có</span>' : '<button class="mini primary" data-act="srUp" data-id="' + u.id + '">' + F.short(u.cost) + '</button>') + (u.upkeep ? '<br><span class="muted">' + F.short(u.upkeep) + '/ngày</span>' : '') + '</td></tr>'; }).join('') + '</table></div>';
    return h;
  }
  P.act.srBuild = function () { res(G.staffroom.build()); };
  P.act.srUp = function (el) { res(G.staffroom.buyUp(el.dataset.id)); };
  function listView() {
    var s = G.state, S = G.staff, h = '<p class="muted small">Không giới hạn số nhân viên - nhưng lương trả vào ngày 1 hàng tháng và lương ứng viên tăng theo quy mô. Hài lòng thấp → xin nghỉ việc. Bạn (chủ) luôn đứng quầy; khách có thể tự phục vụ, NV chỉ tư vấn khi rảnh hoặc khi khách cần.</p>';
    h += roomCard();
    var pr = S.payroll(), lm = s.history.months.length ? s.history.months[s.history.months.length - 1].revenue : (s.month.revenue || 0), ratio = lm > 0 ? pr / lm : 0;
    h += '<div class="card small ' + (s.money < pr ? 'warnbox' : '') + '"><b>Quỹ lương hằng tháng: ' + F.vnd(pr) + '</b> (' + s.staff.length + ' NV)' + (lm > 0 ? ' · = ' + Math.round(ratio * 100) + '% doanh thu tháng trước' : '') + (s.money < pr ? '<br><span class="neg">⚠ Tiền mặt hiện không đủ trả lương tháng!</span>' : ratio > 0.5 ? '<br><span class="neg">⚠ Quỹ lương quá cao so với doanh thu.</span>' : ratio > 0.3 ? '<br><span class="warn">Quỹ lương khá nặng, cân nhắc trước khi thuê thêm.</span>' : '') + '</div>';
    G.data.roles.forEach(function (r) {
      var grp = S.byRole(r.id), unlocked = S.unlocked(r.id);
      h += '<div class="card"><div class="rolehead"><b style="color:' + r.color + '">' + E(r.name) + '</b> <span class="muted">' + grp.length + ' người</span></div><div class="muted small">' + E(r.desc) + '</div>';
      if (!unlocked) { h += '<div class="small warn">🔒 Mở ở cấp ' + G.data.levels[r.unlock].name + '</div></div>'; return; }
      grp.forEach(function (x) {
        var need = G.data.xpForStar[x.stars + 1];
        h += '<div class="staffcard"><div><b>' + E(x.name) + '</b> ' + stars(x.stars) + ' ' + statusChip(x) + (x.fatigue > 0 ? ' <span class="chipx neg">mệt</span>' : '') + '</div>' +
          '<div class="small muted">Lương ' + F.vnd(x.salary) + ' (thị trường ' + F.short(S.market(x.role, x.stars)) + ') · XP ' + Math.floor(x.xp) + (need ? '/' + need : ' (tối đa)') + ' · làm ' + Math.floor((G.state.day - x.hiredDay) / 30) + ' tháng</div>' +
          '<div class="row small"><span>Hài lòng</span>' + bar(x.sat / 100, x.sat < 35 ? 'bad' : x.sat > 70 ? 'good' : '') + '<span>' + Math.round(x.sat) + '</span> <button class="mini" data-act="bonus" data-id="' + x.id + '" title="Thưởng nửa tháng lương: +12 hài lòng">Thưởng</button><button class="mini danger" data-act="fire" data-id="' + x.id + '">Sa thải</button></div></div>';
      });
      {
        var cs = s.cand[r.id] || [];
        h += '<div class="small"><b>Ứng viên</b> (đổi mới hàng tuần)</div>' + cs.map(function (c) {
          return '<div class="cand"><span>' + E(c.name) + ' ' + stars(c.stars) + ' · ' + F.vnd(c.salary) + '/th</span><button class="mini primary" data-act="hire" data-id="' + c.id + '">Thuê</button></div>';
        }).join('');
      }
      h += '</div>';
    });
    return h;
  }
  function schedView() {
    var s = G.state, S = G.staff, h = '';
    var mgr = S.hasManager();
    h += '<p class="small">Cửa hàng mở 8h-21h: <b>Ca sáng</b> 8-14h · <b>Ca chiều</b> 14-21h · <b>Full</b> cả ngày. Bấm vào ô để đổi ca. NV chỉ xuất hiện trên cửa hàng trong ca; làm full quá 5 ngày liên tiếp sẽ mệt. Giờ cao điểm: 10-11h & 17-20h.</p>';
    h += '<div class="row">' + (mgr ? '<button class="btn primary" data-act="autoSched">Tự động chia ca</button><label class="nw"><input type="checkbox" data-chg="autoSchedOn"' + (s.autoSchedule ? ' checked' : '') + '> Tự bù ca khi NV vắng</label>' : '<button class="btn" disabled>Tự động chia ca 🔒</button><span class="muted small">Cần thuê Quản lý cửa hàng. Hiện tại bạn tự chia ca thủ công.</span>') + '</div>';
    if (!s.staff.length) return h + '<p class="muted">Chưa thuê nhân viên nào.</p>';
    var today = G.cal.weekday(s.day);
    h += '<div class="tblwrap"><table class="tbl sched"><tr><th>NV</th>' + G.cal.WD.map(function (d, i) { return '<th class="' + (i === today ? 'today' : '') + '">' + d + '</th>'; }).join('') + '</tr>';
    s.staff.forEach(function (x) {
      h += '<tr><td class="nw small">' + E(x.name.split(' ').pop()) + '<br><span class="muted" style="color:' + G.roleById[x.role].color + '">' + E(G.roleById[x.role].name) + '</span>' + (x.status !== 'ok' ? '<br>' + statusChip(x) : '') + '</td>' +
        x.sched.map(function (sh, i) { var aw = S.awayOn(x, i); if (aw) return '<td class="' + (i === today ? 'today' : '') + '"><button class="sh sh-away" disabled title="' + (aw === 'training' ? 'Đang đi đào tạo' : 'Đã duyệt nghỉ') + ' - không sửa được ca">' + (aw === 'training' ? 'Học' : 'Nghỉ phép') + '</button></td>'; return '<td class="' + (i === today ? 'today' : '') + '"><button class="sh sh-' + sh + '" data-act="cycle" data-id="' + x.id + '" data-wd="' + i + '">' + G.data.shifts[sh].short + '</button></td>'; }).join('') + '</tr>';
    });
    // phủ ca bán hàng
    h += '<tr class="tot"><td class="small">Bán hàng (sáng/chiều)</td>' + [0, 1, 2, 3, 4, 5, 6].map(function (d) {
      var am = 1, pm = 1; // chủ luôn đứng quầy
      s.staff.forEach(function (x) { if (x.role !== 'sales') return; var sh = x.sched[d]; if (sh === 'am' || sh === 'full') am++; if (sh === 'pm' || sh === 'full') pm++; });
      return '<td class="small ' + (d === today ? 'today' : '') + '">' + am + '/' + pm + '</td>';
    }).join('') + '</tr></table></div><p class="muted small">Hàng cuối: số người bán (gồm chủ) ca sáng / ca chiều. Ca trống giờ cao điểm → khách chờ lâu bỏ về, bị đánh giá thấp.</p>';
    return h;
  }
  function trainView() {
    var s = G.state, T = G.training, tr = UI.st.tr, h = '';
    var elig = s.staff.filter(function (x) { return x.status === 'ok'; });
    if (!elig.some(function (x) { return String(x.id) === String(tr.staff); })) tr.staff = elig.length ? String(elig[0].id) : '';
    var who = tr.staff ? G.staff.byId(+tr.staff) : null;
    h += '<div class="card"><b>Đăng ký khóa học</b>';
    if (!who) h += '<p class="muted">Không có nhân viên rảnh.</p>';
    else {
      var courses = G.data.courses.filter(function (c) { return c.role === who.role; });
      if (!courses.some(function (c) { return c.id === tr.course; })) tr.course = courses[0].id;
      var c = T.courseById(tr.course), forms = G.data.trainForms;
      var brands = G.data.brands.filter(function (b) { return !b.noBrand && G.brandAvail(b.id); });
      if (c.brand && !brands.some(function (b) { return b.id === tr.brand; })) tr.brand = brands[0] ? brands[0].id : '';
      h += '<div class="row"><select data-chg="trStaff">' + opts(elig.map(function (x) { return [x.id, x.name + ' (' + G.roleById[x.role].name + ')']; }), tr.staff) + '</select></div>' +
        '<div class="row"><select data-chg="trCourse">' + opts(courses.map(function (x) { return [x.id, x.name + (who.skills[x.id] ? ' ✓' : '')]; }), tr.course) + '</select>' + (c.brand ? '<select data-chg="trBrand">' + opts(brands.map(function (b) { return [b.id, b.short + (who.brandSkill[b.id] ? ' ✓' : '')]; }), tr.brand) + '</select>' : '') + '</div>' +
        '<div class="row"><select data-chg="trForm">' + opts(Object.keys(forms).map(function (k) { return [k, forms[k].name + ' · ' + forms[k].days + ' ngày · ' + (k === 'sponsor' ? 'miễn phí' : F.short(T.cost(c, k)))]; }), tr.form) + '</select></div>' +
        '<p class="muted small">' + E(forms[tr.form].note) + '. NV vắng ca trong lúc học (cần chia ca bù). Hoàn thành: +XP, +hài lòng' + (c.brand ? ', tăng tỉ lệ chốt hãng đó' : ', +5% hiệu suất') + '.' + (tr.form === 'sponsor' && !T.sponsorOk(c, tr.brand) ? ' <span class="warn">Hãng chưa tài trợ.</span>' : '') + '</p>' +
        '<button class="btn primary" data-act="trStart">Bắt đầu học</button>';
    }
    h += '</div>';
    var learning = s.staff.filter(function (x) { return x.status === 'training'; });
    if (learning.length) h += '<div class="card small"><b>Đang học</b>' + learning.map(function (x) { var c = T.courseById(x.train.course); return '<div>' + E(x.name) + ': ' + E(c.name) + ' (về ngày ' + (x.until + 1) + ')</div>'; }).join('') + '</div>';
    h += '<div class="card"><b>Training tập thể cuối tuần</b><p class="muted small">Cả cửa hàng đóng cửa tới 14h Thứ Bảy để đào tạo; sau đó buff +10% hiệu suất trong 3 ngày, +5 hài lòng, +5 XP. Chi phí ' + F.vnd(T.groupCost()) + '.</p>' +
      (s.groupTraining ? '<p>Đã đặt vào ngày ' + s.groupTraining + ' <button class="mini" data-act="grpCancel">Hủy</button></p>' : '<button class="btn" data-act="grpSet">Đặt lịch Thứ Bảy tới</button>') + '</div>';
    return h;
  }
  P.act.staffSub = function (el) { UI.st.staffSub = el.dataset.id; };
  P.act.hire = function (el) { res(G.staff.hire(el.dataset.id)); };
  P.act.fire = function (el) {
    var x = G.staff.byId(+el.dataset.id); if (!x) return;
    if (confirm('Sa thải ' + x.name + '? Phải trả trợ cấp ' + F.vnd(x.salary * 0.5) + '.')) { G.staff.fire(x.id); G.notify.toast('Đã sa thải ' + E(x.name), 'info'); }
  };
  P.act.bonus = function (el) { var x = G.staff.byId(+el.dataset.id); if (!x) return; var c = Math.round(x.salary * 0.5); G.econ.expense(c, 'wages'); x.sat = Math.min(100, x.sat + 12); res({ ok: true, msg: 'Đã thưởng ' + x.name + ' ' + F.vnd(c) }); };
  P.act.cycle = function (el) { G.staff.cycleShift(+el.dataset.id, +el.dataset.wd); };
  P.act.autoSched = function () { res({ ok: G.staff.runAuto(), msg: 'Quản lý đã chia ca tối ưu theo giờ cao điểm' }); };
  P.chg.autoSchedOn = function (el) { G.state.autoSchedule = el.checked; if (el.checked) G.staff.runAuto(); };
  P.chg.trStaff = function (el) { UI.st.tr.staff = el.value; UI.st.tr.course = ''; };
  P.chg.trCourse = function (el) { UI.st.tr.course = el.value; };
  P.chg.trBrand = function (el) { UI.st.tr.brand = el.value; };
  P.chg.trForm = function (el) { UI.st.tr.form = el.value; };
  P.act.trStart = function () { var t = UI.st.tr; res(G.training.start(+t.staff, t.course, t.form, t.brand)); };
  P.act.grpSet = function () { res(G.training.scheduleGroup()); };
  P.act.grpCancel = function () { G.training.cancelGroup(); };

  // ======================= ĐƠN LỚN (stub, pass 2 thay thế) =======================
  function b2bTab() {
    var lv = G.state.level;
    if (!G.lvl().b2b) return '<div class="card"><b>Đơn khách sạn / resort</b><p class="muted">🔒 Mở từ cấp <b>Showroom</b>. Cần thêm NV Sale B2B, NV Giao hàng và đủ hàng tồn kho.</p></div>';
    return '<div class="card"><b>Đơn khách sạn / resort</b><p class="muted">Chưa có đơn nào. Đơn lớn sẽ được thông báo bằng cửa sổ chặn game + chuông. (Tính năng hoàn thiện ở bản sau.)</p></div>';
  }

  // ======================= NÂNG CẤP =======================
  function upgradeTab() {
    var s = G.state, lv = G.lvl(), n = G.progress.next(), st = G.progress.status(), h = '';
    h += '<div class="card"><b>Cấp hiện tại: ' + E(lv.name) + '</b><p class="small muted">' + E(lv.desc) + '</p></div>';
    if (n) {
      h += '<div class="card"><b>Mục tiêu: ' + E(n.name) + '</b><p class="small">' + E(n.desc) + '</p>' +
        '<div class="rel"><span>Doanh thu tích lũy</span>' + bar(s.totalRevenue / n.req.revenue, st.revenueOk ? 'good' : '') + '<span class="small">' + F.short(s.totalRevenue) + '/' + F.short(n.req.revenue) + '</span></div>' +
        (n.req.rep ? '<div class="rel"><span>Danh tiếng</span>' + bar(s.rep / n.req.rep, st.repOk ? 'good' : '') + '<span class="small">' + Math.floor(s.rep) + '/' + n.req.rep + '</span></div>' : '') +
        '<div class="rel"><span>Vốn tối thiểu</span>' + bar(s.money / st.capital.need, st.capitalOk ? 'good' : '') + '<span class="small">' + F.short(s.money) + '/' + F.short(st.capital.need) + '</span></div>' +
        '<p class="small">Phí nâng cấp: <b>' + F.vnd(n.fee) + '</b>. Tiền thuê → ' + F.short(n.rent) + '/tháng.</p>' +
        '<p class="small muted">Quy định vốn: cần có sẵn tối thiểu <b>' + F.vnd(st.capital.need) + '</b> tiền mặt = phí nâng cấp + dự trữ vận hành 3 tháng (thuê mặt bằng mới ' + F.short(st.capital.rentReserve) + ' + quỹ lương ' + F.short(st.capital.payReserve) + '). ' + (st.capitalOk ? '' : 'Còn thiếu <b class="neg">' + F.vnd(st.capital.need - s.money) + '</b>.') + '</p><ul class="small">' + n.unlocks.map(function (u) { return '<li>' + E(u) + '</li>'; }).join('') + '</ul>' +
        '<button class="btn primary" data-act="lvlUp"' + (st.ok && st.capitalOk ? '' : ' disabled') + '>Nâng cấp lên ' + E(n.name) + '</button></div>';
    } else h += '<div class="card"><b>Bạn đã đạt cấp cao nhất!</b></div>';
    h += '<div class="card"><b>Cửa hàng</b><table class="tbl small"><tr><td>Số kệ / chỗ đệm</td><td class="r">' + lv.shelves + ' / ' + lv.beds + '</td></tr><tr><td>Tiền thuê</td><td class="r">' + F.short(lv.rent) + '/tháng</td></tr><tr><td>Điện nước</td><td class="r">' + F.short(lv.power) + '/ngày</td></tr><tr><td>Khách cơ bản</td><td class="r">' + lv.traffic + '/giờ</td></tr><tr><td>Hãng mở khóa</td><td class="r">' + G.data.brands.filter(function (b) { return !b.noBrand && G.brandAvail(b.id); }).map(function (b) { return b.short; }).join(', ') + '</td></tr></table></div>';
    h += '<div class="card"><b>Nhân viên</b><p class="small muted">Không giới hạn số lượng mỗi vai trò. Quỹ lương hiện tại: ' + F.vnd(G.staff.payroll()) + '/tháng.</p></div>';
    h += '<div class="card"><b>Xe tải riêng</b><p class="small muted">Giảm 30% phí vận chuyển nội bộ giữa kho ↔ cửa hàng.</p>' + (s.ownTruck ? '<span class="pos">Đã sở hữu</span>' : '<button class="btn" data-act="truck">Mua xe tải · ' + F.short(150e6) + '</button>') + '</div>';
    if (!lv.branches) h += G.unlock.teaser('branch', false);
    if (lv.branches) h += '<div class="card"><b>Chi nhánh (' + s.branches + '/' + G.progress.maxBranches() + ')</b><p class="small muted">Thu nhập thụ động ~15tr/ngày mỗi chi nhánh (nhân với ★/3), cần 1 Quản lý cho mỗi chi nhánh.</p><button class="btn" data-act="branch"' + (s.branches >= G.progress.maxBranches() ? ' disabled' : '') + '>Mở chi nhánh · ' + F.short(G.progress.branchCost()) + '</button></div>';
    return h;
  }
  P.act.lvlUp = function () { res(G.progress.upgrade()); };
  P.act.truck = function () { res(G.progress.buyTruck()); };
  P.act.branch = function () { res(G.progress.buyBranch()); };

  // ======================= BÁO CÁO =======================
  function reportTab() {
    var s = G.state, t = s.today, E2 = G.econ, h = '';
    var detail = G.staff.count('accountant') > 0;
    var sub = UI.st.repSub;
    h += '<div class="card"><b>Hôm nay (ngày ' + s.day + ')</b><table class="tbl small">' +
      '<tr><td>Doanh thu</td><td class="r">' + F.vnd(t.revenue) + '</td></tr><tr><td>Giá vốn</td><td class="r">' + F.vnd(t.cogs) + '</td></tr><tr><td>Chi phí</td><td class="r">' + F.vnd(E2.expTotal(t)) + '</td></tr>' +
      '<tr class="tot"><td>Lãi tạm tính</td><td class="r ' + (E2.profit(t) >= 0 ? 'pos' : 'neg') + '">' + F.vnd(E2.profit(t)) + '</td></tr>' +
      '<tr><td>Khách vào / được tư vấn / tự phục vụ / mua</td><td class="r">' + t.visitors + ' / ' + t.served + ' / ' + (t.self || 0) + ' / ' + t.sales + '</td></tr>' +
      '<tr><td>Mất khách: chờ lâu / giá cao / hết hàng / không chốt</td><td class="r">' + t.lostWait + ' / ' + t.lostPrice + ' / ' + t.lostStock + ' / ' + t.lostOther + '</td></tr></table></div>';
    var days = s.history.days.slice(-14);
    if (days.length) {
      var mx = Math.max.apply(null, days.map(function (d) { return Math.max(d.revenue, 1); }));
      h += '<div class="card"><b>Doanh thu 14 ngày gần nhất</b><div class="chart">' + days.map(function (d) {
        return '<div class="col" title="Ngày ' + d.day + ': ' + F.vnd(d.revenue) + ' · lãi ' + F.vnd(d.profit) + '"><i class="' + (d.profit >= 0 ? 'p' : 'n') + '" style="height:' + Math.round(d.revenue / mx * 100) + '%"></i><span>' + d.day + '</span></div>';
      }).join('') + '</div><div class="muted small">Cột xanh: ngày có lãi · đỏ: ngày lỗ</div></div>';
      h += '<table class="tbl small"><tr><th>Ngày</th><th class="r">Doanh thu</th><th class="r">Lãi</th><th class="r">Đơn</th><th class="r">★</th></tr>' + days.slice().reverse().map(function (d) { return '<tr><td>' + d.day + '</td><td class="r">' + F.short(d.revenue) + '</td><td class="r ' + (d.profit >= 0 ? 'pos' : 'neg') + '">' + F.short(d.profit) + '</td><td class="r">' + d.sales + '</td><td class="r">' + d.rating.toFixed(1) + '</td></tr>'; }).join('') + '</table>';
    }
    h += '<div class="card"><b>Chi phí tháng này</b>';
    if (!detail) h += '<p class="muted small">🔒 Thuê Kế toán để mở báo cáo chi tiết theo từng khoản và theo hãng.</p>';
    else {
      h += '<table class="tbl small">' + Object.keys(s.month.exp).map(function (k) { return '<tr><td>' + (E2.EXP_NAMES[k] || k) + '</td><td class="r">' + F.vnd(s.month.exp[k]) + '</td></tr>'; }).join('') + (s.month.expressFeeIn ? '<tr><td>Thu phí ship từ khách (đã tính vào doanh thu)</td><td class="r pos">+' + F.vnd(s.month.expressFeeIn) + '</td></tr>' : '') + '</table>';
      var bb = t.byBrand; var ks = Object.keys(bb);
      if (ks.length) h += '<b class="small">Doanh thu hôm nay theo hãng</b><table class="tbl small">' + ks.map(function (k) { return '<tr><td>' + E(G.brandName(k)) + '</td><td class="r">' + F.vnd(bb[k]) + '</td></tr>'; }).join('') + '</table>';
    }
    h += '</div>';
    var ms = s.history.months.slice(-6).reverse();
    if (ms.length) h += '<div class="card"><b>Các tháng trước</b><table class="tbl small"><tr><th>Tháng</th><th class="r">Doanh thu</th><th class="r">Lãi</th></tr>' + ms.map(function (m) { return '<tr><td>' + m.month + '</td><td class="r">' + F.short(m.revenue) + '</td><td class="r ' + (m.profit >= 0 ? 'pos' : 'neg') + '">' + F.short(m.profit) + '</td></tr>'; }).join('') + '</table></div>';
    h += '<p class="small muted">Tổng doanh thu tích lũy: ' + F.vnd(s.totalRevenue) + ' · Tổng lãi: ' + F.vnd(s.totalProfit) + '</p>';
    return h;
  }

  P.register({ id: 'staff', label: 'Nhân viên', render: staffTab });
  P.register({ id: 'b2b', label: 'Đơn lớn', render: b2bTab });
  P.register({ id: 'upgrade', label: 'Nâng cấp', render: upgradeTab, badge: function () { var st = G.progress.status(); return st && st.ok && st.capitalOk ? '!' : ''; } });
  P.register({ id: 'report', label: 'Báo cáo', render: reportTab });
})();
