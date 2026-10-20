/* Phúc lợi nhân viên: team building (lên lịch, có thể đóng cửa) & thưởng lễ Tết (hỏi chủ vào đúng ngày lễ). Thưởng/chi phí ghi vào chi phí 'welfare' / 'bonus'. */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ welfare: { event: null, last: {}, log: [], hol: {} } });
  G.econ.EXP_NAMES.welfare = 'Team building'; G.econ.EXP_NAMES.bonus = 'Thưởng lễ Tết';
  // per = chi phí/người (tính cả chủ); until = giờ đóng cửa tới (phút trong ngày) hoặc 0 = không đóng; cd = số ngày chờ giữa 2 lần
  var ACT = {
    lunch: { name: 'Liên hoan sau giờ làm', icon: 'cup', per: 120e3, until: 0, sat: 5, fat: 0, buff: 0, xp: 0, cd: 14, min: 0, note: 'Ăn uống tối sau giờ đóng cửa, không ảnh hưởng bán hàng.' },
    half: { name: 'Team building nửa ngày', icon: 'people', per: 400e3, until: 780, sat: 10, fat: 2, buff: 0.05, bd: 3, xp: 3, cd: 21, min: 0, note: 'Trò chơi gắn kết, đóng cửa tới 13h. Giảm mệt mỏi, +5% hiệu suất 3 ngày.' },
    trip: { name: 'Dã ngoại cả ngày', icon: 'sun', per: 900e3, until: 1260, sat: 18, fat: 99, buff: 0.08, bd: 5, xp: 6, cd: 45, min: 1, note: 'Đóng cửa cả ngày. Hết mệt mỏi, +8% hiệu suất 5 ngày, nhiều XP.' }
  };
  // lễ: m/d theo lịch game; tiers = mức thưởng theo tỉ lệ lương tháng; none = hài lòng bị trừ nếu không thưởng
  var HOL = [
    { id: 'tet', name: 'Tết Nguyên Đán', m: 1, d: 20, big: true, tiers: [['Thưởng 1 tháng lương', 1, 16], ['Thưởng nửa tháng lương', 0.5, 9], ['Lì xì tượng trưng (10% lương)', 0.1, 3]], none: -10 },
    { id: '83', name: 'Quốc tế Phụ nữ 8/3', m: 3, d: 8, tiers: [['Quà 20% lương', 0.2, 6], ['Quà nhỏ 8% lương', 0.08, 3]], none: 0 },
    { id: '3004', name: 'Lễ 30/4 - 1/5', m: 4, d: 30, tiers: [['Thưởng lễ 25% lương', 0.25, 7], ['Thưởng lễ 10% lương', 0.1, 3]], none: 0 },
    { id: 'tt', name: 'Tết Trung thu', m: 9, d: 15, tiers: [['Quà Trung thu 20% lương', 0.2, 6], ['Bánh Trung thu 8% lương', 0.08, 3]], none: 0 },
    { id: '2010', name: 'Phụ nữ Việt Nam 20/10', m: 10, d: 20, tiers: [['Quà 20% lương', 0.2, 6], ['Quà nhỏ 8% lương', 0.08, 3]], none: 0 },
    { id: 'noel', name: 'Giáng sinh', m: 12, d: 24, tiers: [['Quà 15% lương', 0.15, 5], ['Quà nhỏ 6% lương', 0.06, 2]], none: 0 }
  ];
  function W() { return G.state.welfare; }
  function year(day) { return Math.floor((day - 1) / 360); }
  function match(h, day) { return G.cal.moy(day) === h.m && G.cal.dom(day) === h.d; }
  function crew() { return G.state.staff.length + 1; }
  function log(name, cost) { var l = W().log; l.unshift({ day: G.state.day, name: name, cost: cost }); if (l.length > 12) l.pop(); }
  var Wf = G.welfare = {
    ACT: ACT, HOL: HOL,
    cost: function (id) { return ACT[id].per * crew(); },
    cooldown: function (id) { var l = W().last[id]; return l ? Math.max(0, l + ACT[id].cd - G.state.day) : 0; },
    // tỉ lệ nhận thưởng theo thâm niên: đủ 3 tháng nhận trọn, NV mới nhận ít nhất 30%
    tenure: function (st) { return G.clamp((G.state.day - st.hiredDay) / 90, 0.3, 1); },
    bonusCost: function (mult) { var t = 0; G.state.staff.forEach(function (st) { t += Math.round(st.salary * mult * Wf.tenure(st) / 1e4) * 1e4; }); return t; },
    nextHol: function () {
      var day = G.state.day, out = [];
      for (var d = day; d <= day + 120; d++) HOL.forEach(function (h) { if (match(h, d)) out.push({ h: h, day: d }); });
      return out.sort(function (a, b) { return a.day - b.day; }).slice(0, 3);
    },
    schedule: function (id, day) {
      var s = G.state, a = ACT[id], w = W();
      if (!a) return { ok: false, msg: 'Hoạt động không tồn tại' };
      if (!s.staff.length) return { ok: false, msg: 'Chưa có nhân viên' };
      if (s.level < a.min) return { ok: false, msg: 'Chưa mở khóa (cần cấp ' + G.data.levels[a.min].name + ')' };
      if (w.event) return { ok: false, msg: 'Đã có một buổi được đặt lịch (ngày ' + w.event.day + ')' };
      if (Wf.cooldown(id)) return { ok: false, msg: 'Vừa tổ chức gần đây, chờ thêm ' + Wf.cooldown(id) + ' ngày' };
      if (day <= s.day) return { ok: false, msg: 'Chỉ đặt từ ngày mai trở đi' };
      if (a.until && s.groupTraining === day) return { ok: false, msg: 'Ngày đó đã có training tập thể' };
      if (s.money < Wf.cost(id)) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(Wf.cost(id)) + ')' };
      w.event = { id: id, day: day };
      return { ok: true, msg: 'Đã đặt "' + a.name + '" vào ngày ' + day + ' (' + G.cal.WDFULL[G.cal.weekday(day)] + ')' };
    },
    cancel: function () { W().event = null; },
    run: function (ev) {
      var s = G.state, a = ACT[ev.id], w = W(), cost = Wf.cost(ev.id);
      var n = 0;
      s.staff.forEach(function (st) {
        if (st.status !== 'ok') return; n++;
        st.sat = G.clamp(st.sat + a.sat, 0, 100); if (a.fat) st.consec = a.fat >= 99 ? 0 : Math.max(0, st.consec - a.fat); if (a.fat) st.fatigue = G.clamp((st.consec - 6) * 0.25, 0, 1);
        if (a.xp) G.staff.addXp(st, a.xp);
      });
      G.econ.expense(cost, 'welfare'); w.last[ev.id] = s.day; log(a.name, cost);
      if (a.until) s.closure = { day: s.day, until: Math.max(a.until, s.closure.day === s.day ? s.closure.until : 0), reason: 'Đóng cửa: ' + a.name.toLowerCase() };
      if (a.buff && 1 + a.buff >= G.staff.buffMult()) s.buff = { until: s.day + a.bd, mult: 1 + a.buff };
      G.notify.push({ title: '🎉 ' + a.name, text: n + ' nhân viên tham gia, chi ' + G.fmt.vnd(cost) + '. Hài lòng +' + a.sat + (a.until ? '; cửa hàng đóng cửa tới ' + G.cal.hm(a.until) : '') + '.', type: 'good', sound: 'good' });
    },
    // thưởng lễ: áp dụng một mức (tier = null: không thưởng)
    giveBonus: function (h, tier) {
      var s = G.state;
      if (!tier) { s.staff.forEach(function (st) { st.sat = G.clamp(st.sat + h.none, 0, 100); }); if (h.none) G.notify.push({ title: 'Không thưởng ' + h.name, text: 'Nhân viên hơi thất vọng (hài lòng ' + h.none + ').', type: 'warn', sound: false }); return; }
      var cost = Wf.bonusCost(tier[1]);
      if (s.money < cost) { G.notify.push({ title: 'Không đủ tiền thưởng ' + h.name, text: 'Cần ' + G.fmt.vnd(cost) + '. Nhân viên thất vọng.', type: 'bad' }); s.staff.forEach(function (st) { st.sat = G.clamp(st.sat + (h.none || -3), 0, 100); }); return; }
      G.econ.expense(cost, 'bonus'); log('Thưởng ' + h.name, cost);
      s.staff.forEach(function (st) { st.sat = G.clamp(st.sat + tier[2], 0, 100); st.lastBonus = s.day; });
      G.notify.push({ title: '🧧 Thưởng ' + h.name, text: tier[0] + ': đã chi ' + G.fmt.vnd(cost) + ' cho ' + s.staff.length + ' nhân viên. Hài lòng +' + tier[2] + '.', type: 'good', sound: 'good' });
    },
    holidayPrompt: function (h) {
      var s = G.state, w = W(); w.hol[h.id + '@' + year(s.day)] = 1;
      var rows = h.tiers.map(function (t) { return '<tr><td>' + G.esc(t[0]) + '</td><td class="r">' + G.fmt.vnd(Wf.bonusCost(t[1])) + '</td></tr>'; }).join('');
      G.notify.modal({
        title: (h.big ? '🧧 ' : '🎁 ') + h.name + ': thưởng nhân viên?', def: Math.min(1, h.tiers.length - 1),
        html: '<p>Đúng dịp <b>' + G.esc(h.name) + '</b>, nhân viên chờ xem chủ có thưởng không.' + (h.big ? ' Tết mà không có thưởng thì cả đội sẽ rất buồn.' : ' Thưởng không bắt buộc.') + '</p><table class="tbl small">' + rows + '</table><p class="muted small">Nhân viên làm dưới 3 tháng nhận theo tỉ lệ thâm niên (tối thiểu 30%). Tiền mặt hiện có: ' + G.fmt.vnd(s.money) + '.</p>',
        choices: h.tiers.map(function (t, i) { return { label: t[0] + ' · ' + G.fmt.short(Wf.bonusCost(t[1])), cls: i === 0 ? 'primary' : '', fn: function () { Wf.giveBonus(h, t); } }; }).concat([{ label: 'Không thưởng', cls: 'danger', fn: function () { Wf.giveBonus(h, null); } }])
      });
    }
  };
  G.on('dayStart', function () {
    var s = G.state, w = W();
    if (w.event && w.event.day <= s.day) { var ev = w.event; w.event = null; if (ev.day === s.day && s.staff.length) Wf.run(ev); }
    if (!s.staff.length) return;
    HOL.forEach(function (h) {
      if (match(h, s.day + 5) && h.big) G.notify.push({ title: 'Sắp ' + h.name, text: 'Còn 5 ngày. Nhân viên mong có thưởng Tết: chuẩn bị khoảng ' + G.fmt.short(Wf.bonusCost(1)) + ' cho mức 1 tháng lương.', type: 'info', sound: false });
      if (match(h, s.day) && !w.hol[h.id + '@' + year(s.day)]) Wf.holidayPrompt(h);
    });
  });
})();
