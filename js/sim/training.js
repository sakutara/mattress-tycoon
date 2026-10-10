/* Đào tạo, training tập thể cuối tuần, đòi tăng lương mỗi 6 tháng game */
(function () {
  'use strict';
  var G = window.G;
  var T = G.training = {
    courseById: function (id) { return G.data.courses.filter(function (c) { return c.id === id; })[0]; },
    sponsorOk: function (course, brand) {
      var s = G.state;
      if (course.brand) return !!brand && ((s.sponsor[brand] || 0) >= s.day || (s.rel[brand] || 0) >= 70);
      var any = false;
      Object.keys(s.sponsor).forEach(function (b) { if (s.sponsor[b] >= s.day) any = true; });
      Object.keys(s.rel).forEach(function (b) { if (s.rel[b] >= 80) any = true; });
      return any;
    },
    cost: function (course, form) { return Math.round(course.cost * G.data.trainForms[form].costMul / 1000) * 1000; },
    start: function (staffId, courseId, form, brand) {
      var s = G.state, st = G.staff.byId(staffId), c = T.courseById(courseId), f = G.data.trainForms[form];
      if (!st || !c) return { ok: false, msg: 'Dữ liệu không hợp lệ' };
      if (st.role !== c.role) return { ok: false, msg: 'Khóa học không dành cho vai trò này' };
      if (st.status !== 'ok') return { ok: false, msg: 'Nhân viên đang bận / vắng' };
      if (c.brand && !brand) return { ok: false, msg: 'Chọn hãng cho khóa học' };
      if (form === 'sponsor' && !T.sponsorOk(c, brand)) return { ok: false, msg: 'Hãng chưa tài trợ (cần quan hệ NCC cao hoặc dịp hãng ra mẫu mới)' };
      var cost = T.cost(c, form);
      if (s.money < cost) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(cost) + ')' };
      if (cost) G.econ.expense(cost, 'training');
      st.status = 'training'; st.until = s.day + f.days; st.train = { course: courseId, form: form, brand: brand || null };
      return { ok: true, msg: st.name + ' đi học "' + c.name + '" ' + f.days + ' ngày' + (cost ? ' (' + G.fmt.vnd(cost) + ')' : ' (miễn phí)') };
    },
    complete: function (st) {
      var c = T.courseById(st.train.course), f = G.data.trainForms[st.train.form];
      st.status = 'ok';
      if (c.brand) st.brandSkill[st.train.brand] = true; else st.skills[c.id] = true;
      st.sat = Math.min(100, st.sat + 4);
      var tb = G.staffroom ? G.staffroom.bonus().train : 0; G.staff.addXp(st, Math.round(c.xp * f.xpMul * (1 + tb)));
      G.notify.push({ title: st.name + ' hoàn thành khóa học', text: c.name + (st.train.brand ? ' (' + G.brandName(st.train.brand) + ')' : '') + ' · +' + Math.round(c.xp * f.xpMul) + ' xp', type: 'good', sound: false });
      st.train = null;
    },
    scheduleGroup: function () {
      var s = G.state, d = s.day + 1;
      while (G.cal.weekday(d) !== 5) d++;
      var n = s.staff.length;
      if (!n) return { ok: false, msg: 'Chưa có nhân viên để đào tạo' };
      s.groupTraining = d;
      return { ok: true, msg: 'Đã đặt training tập thể vào ' + G.cal.WDFULL[5] + ' (ngày ' + d + '). Cửa hàng đóng cửa tới 14h.' };
    },
    cancelGroup: function () { G.state.groupTraining = 0; },
    groupCost: function () { return 1500000 * (G.state.staff.length + 1); },
    raisePct: function (st) { var p = G.clamp(Math.round(5 + (st.stars - 1) * 4 + (st.sat < 50 ? 4 : 0) + G.rand(0, 4)), 5, 20) / 100, gap = G.staff.market(st.role, st.stars) / st.salary - 1; return Math.min(0.2, Math.max(p, Math.round(gap * 100) / 100)); },
    raiseModal: function (st) {
      var s = G.state, pct = T.raisePct(st), half = Math.max(0.03, Math.round(pct * 50) / 100);
      var newSal = Math.round(st.salary * (1 + pct) / 100000) * 100000, halfSal = Math.round(st.salary * (1 + half) / 100000) * 100000;
      st.raiseAsked = true;
      function agree() { st.salary = newSal; st.sat = Math.min(100, st.sat + 15); st.lastRaise = s.day; st.refusals = 0; st.raiseAsked = false; G.notify.toast(st.name + ' rất vui với mức lương mới.', 'good'); }
      function negotiate() {
        var p = st.sat >= 60 ? 0.65 : st.sat >= 40 ? 0.45 : 0.25;
        st.raiseAsked = false;
        if (G.chance(p)) { st.salary = halfSal; st.sat = Math.min(100, st.sat + 5); st.lastRaise = s.day; G.notify.push({ title: 'Thương lượng thành công', text: st.name + ' chấp nhận mức ' + G.fmt.vnd(halfSal) + '.', type: 'good', sound: false }); }
        else { st.sat = Math.max(0, st.sat - 10); st.refusals++; st.lastRaise = s.day - 150; G.notify.push({ title: 'Thương lượng thất bại', text: st.name + ' phật ý, sẽ đề nghị lại sau 30 ngày.', type: 'warn', sound: false }); }
      }
      function refuse() {
        st.raiseAsked = false; st.sat = Math.max(0, st.sat - 20); st.refusals++; st.lastRaise = s.day - 120;
        var pq = st.refusals >= 2 ? (st.stars >= 2 ? 0.5 : 0.3) : (st.stars >= 2 ? 0.15 : 0.05);
        if (G.chance(pq)) { G.notify.push({ title: st.name + ' nghỉ việc', text: 'Bị từ chối tăng lương' + (st.refusals >= 2 ? ' nhiều lần' : ' và bị đối thủ lôi kéo') + '.', type: 'bad' }); G.staff.remove(st.id); }
        else G.notify.push({ title: st.name + ' thất vọng', text: 'Hài lòng giảm mạnh.', type: 'warn', sound: false });
      }
      G.notify.modal({
        title: 'Đề nghị tăng lương', def: 0,
        html: '<p><b>' + G.esc(st.name) + '</b> (' + G.roleById[st.role].name + ', ' + st.stars + '★) đã làm đủ ' + Math.floor((s.day - st.hiredDay) / 30) + ' tháng và đề nghị tăng lương.</p><table class="tbl"><tr><td>Lương hiện tại</td><td class="r">' + G.fmt.vnd(st.salary) + '</td></tr><tr><td>Đề nghị (+' + Math.round(pct * 100) + '%)</td><td class="r">' + G.fmt.vnd(newSal) + '</td></tr><tr><td>Mặt bằng thị trường</td><td class="r">' + G.fmt.vnd(G.staff.market(st.role, st.stars)) + '</td></tr><tr><td>Hài lòng</td><td class="r">' + Math.round(st.sat) + '/100</td></tr></table>',
        choices: [{ label: 'Đồng ý (+' + Math.round(pct * 100) + '%)', cls: 'primary', fn: agree }, { label: 'Thương lượng (+' + Math.round(half * 100) + '%)', fn: negotiate }, { label: 'Từ chối', cls: 'danger', fn: refuse }]
      });
    }
  };
  G.on('dayStart', function () {
    var s = G.state;
    s.staff.slice().forEach(function (st) {
      if (st.status === 'training' && s.day > st.until) T.complete(st);
    });
    if (s.groupTraining === s.day) {
      s.closure = { day: s.day, until: 840, reason: 'Đóng cửa: training tập thể' };
      G.econ.expense(T.groupCost(), 'training');
      G.notify.push({ title: 'Training tập thể', text: 'Cửa hàng đóng cửa đến 14h để cả nhóm đi đào tạo.', type: 'info' });
    }
    s.staff.slice().forEach(function (st) {
      if (st.status === 'ok' && !st.raiseAsked && s.day - st.lastRaise >= 180) T.raiseModal(st);
    });
  });
})();
G.on('init', function () { G.state.staff.forEach(function (st) { st.raiseAsked = false; }); });
