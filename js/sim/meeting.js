/* Họp nhân viên mỗi tháng: nghe ý kiến, giải quyết khiếu nại & mâu thuẫn. Tính cách, quan hệ từng cặp NV, chương trình họp tự sinh từ dữ liệu game, hiệu ứng tinh thần / nghỉ việc / bức xúc. */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ meeting: { nextDay: 0, weekday: 0, len: 30, delegate: false, postponed: false, due: false, held: false, history: [], followups: [], rel: {}, traits: {}, trust: {}, conflicts: [], escalated: [], skipped: 0, grievance: 0, buff: { until: 0, mult: 1 }, active: null, current: null, nextId: 1, week: 0 } });
  var TRAITS = { nong: { name: 'Nóng tính', icon: 'bolt' }, hoa: { name: 'Hòa nhã', icon: 'heart' }, cham: { name: 'Chăm chỉ', icon: 'tool' }, luoi: { name: 'Lười', icon: 'pillow' }, tham: { name: 'Tham vọng', icon: 'trophy' }, trung: { name: 'Trung thành', icon: 'shield' } };
  var TOPICS = {
    luong: { kind: 'complaint', name: 'Lương thấp / chậm tăng lương', icon: 'coin' }, ca: { kind: 'complaint', name: 'Xếp ca / quá nhiều ca liên tiếp', icon: 'clock' }, thieu: { kind: 'complaint', name: 'Thiếu người giờ cao điểm', icon: 'people' },
    khachkho: { kind: 'complaint', name: 'Khách khó tính / khách chờ lâu', icon: 'warn' }, moitruong: { kind: 'complaint', name: 'Môi trường làm việc (nóng / lạnh / ồn)', icon: 'hot' }, thuong: { kind: 'complaint', name: 'Thưởng / lương không đều', icon: 'gift' },
    hethang: { kind: 'idea', name: 'Khách hỏi mẫu hết hàng', icon: 'box' }, doimau: { kind: 'idea', name: 'Đổi mẫu trưng bày', icon: 'shop' }, phongnghi: { kind: 'idea', name: 'Xin phòng nghỉ nhân viên', icon: 'cup' }, maylanh: { kind: 'idea', name: 'Xin máy lạnh / quạt', icon: 'cloud' },
    giamgia: { kind: 'idea', name: 'Đề xuất chương trình giảm giá', icon: 'tag' }, training: { kind: 'idea', name: 'Xin đi đào tạo', icon: 'book' }, phanmem: { kind: 'idea', name: 'Nâng cấp phần mềm quản lý', icon: 'chart' },
    baohanh: { kind: 'issue', name: 'Yêu cầu bảo hành tồn đọng', icon: 'shield' }, dontre: { kind: 'issue', name: 'Đơn giao trễ', icon: 'truck' }, danhgia: { kind: 'issue', name: 'Đánh giá xấu chưa phản hồi', icon: 'star' },
    conflict: { kind: 'conflict', name: 'Mâu thuẫn giữa 2 nhân viên', icon: 'cross' }, followup: { kind: 'followup', name: 'Việc đã hứa kỳ họp trước', icon: 'check' }
  };
  var CAUSES = ['tranh khách / hoa hồng', 'phân công công việc', 'tính cách không hợp', 'lời nói khó nghe', 'đổ lỗi cho nhau'];
  var M = G.meeting = {
    TRAITS: TRAITS, TOPICS: TOPICS,
    st: function () { return G.state.meeting; },
    nextWeekday: function (from) { var m = M.st(), d = from; for (var i = 0; i < 8; i++, d++) if (G.cal.weekday(d) === m.weekday) return d; return from + 7; },
    monthStart: function (d) { return Math.floor((d - 1) / 30) * 30 + 1; },
    nextMeet: function (d) { return M.nextWeekday(M.monthStart(d) + 30); },
    trait: function (id) { return M.st().traits[id]; },
    staffName: function (id) { var x = G.staff.byId(+id); return x ? x.name : '?'; },
    mgrStars: function () { return G.staff.bestStars('manager'); },
    ensure: function () {
      var m = M.st(), s = G.state; if (!m.nextDay || m.nextDay < s.day && !m.due) m.nextDay = M.nextWeekday(Math.max(s.day, m.nextDay || 0));
      var ids = {}; s.staff.forEach(function (x) { ids[x.id] = 1; if (!m.traits[x.id]) m.traits[x.id] = G.pick(Object.keys(TRAITS)); if (m.trust[x.id] == null) m.trust[x.id] = 50; });
      Object.keys(m.traits).forEach(function (k) { if (!ids[k]) { delete m.traits[k]; delete m.trust[k]; } });
      Object.keys(m.rel).forEach(function (k) { var p = k.split('-'); if (!ids[p[0]] || !ids[p[1]]) delete m.rel[k]; });
      m.conflicts = m.conflicts.filter(function (c) { return !c.done && ids[c.a] && ids[c.b]; });
    },
    key: function (a, b) { return a < b ? a + '-' + b : b + '-' + a; },
    rel: function (a, b) { return M.st().rel[M.key(a, b)] || 0; },
    addRel: function (a, b, d) { var m = M.st(), k = M.key(a, b); m.rel[k] = G.clamp((m.rel[k] || 0) + d, -100, 100); },
    // ---------- diễn biến hằng ngày: quan hệ, mâu thuẫn leo thang ----------
    daily: function () {
      var m = M.st(), s = G.state, day = s.day; M.ensure();
      var on = s.staff.filter(function (x) { return x.status === 'ok'; });
      for (var i = 0; i < on.length; i++) for (var j = i + 1; j < on.length; j++) {
        var a = on[i], b = on[j], ta = m.traits[a.id], tb = m.traits[b.id], d = 0, sa = G.staff.shiftFor(a, day), sb = G.staff.shiftFor(b, day);
        if (sa !== 'off' && sb !== 'off' && (sa === sb || sa === 'full' || sb === 'full')) d += 0.4;
        if (ta === 'nong' && tb === 'nong') d -= 0.9; else if (ta === 'nong' || tb === 'nong') d -= 0.25;
        if (ta === 'hoa' || tb === 'hoa') d += 0.3;
        if ((ta === 'luoi' && tb === 'cham') || (ta === 'cham' && tb === 'luoi')) d -= 0.6;
        if (ta === 'tham' && tb === 'tham') d -= 0.5;
        if ((a.fatigue || 0) > 0 || (b.fatigue || 0) > 0) d -= 0.5;
        var cur = M.rel(a.id, b.id); d -= cur * 0.02; if (d) M.addRel(a.id, b.id, d);
        if (M.rel(a.id, b.id) < -30 && !m.conflicts.some(function (c) { return !c.done && M.key(c.a, c.b) === M.key(a.id, b.id); }) && G.chance(0.12)) M.addConflict(a.id, b.id);
      }
      m.conflicts.forEach(function (c) {
        if (c.done) return; var age = day - c.day, A = G.staff.byId(c.a), B = G.staff.byId(c.b); if (!A || !B) { c.done = true; return; }
        if (age > 8) { A.sat = Math.max(0, A.sat - 0.4); B.sat = Math.max(0, B.sat - 0.4); }
        if (age >= 12 && !c.esc) { c.esc = true; var pick = A.sat < B.sat ? A : B; pick.status = 'leave'; pick.until = day + 1; G.notify.push({ title: 'Xích mích: ' + pick.name + ' bỏ ca', text: 'Mâu thuẫn với ' + (pick === A ? B.name : A.name) + ' không được giải quyết, ' + pick.name + ' nghỉ ca.', type: 'bad', sound: 'warn' }); G.reviews.add(2, { force: true, angry: 'wait' }); }
        if (age >= 16 && G.chance(0.15)) { var q = A.sat < B.sat ? A : B; G.notify.push({ title: q.name + ' xin nghỉ việc', text: 'Lý do: mâu thuẫn kéo dài với đồng nghiệp.', type: 'bad' }); c.done = true; G.staff.remove(q.id); }
      });
      // bức xúc tích tụ -> sự kiện xấu
      if (m.grievance >= 40 && G.chance(0.18)) M.grievanceEvent();
      if (m.grievance > 0 && !m.skippedRecent) m.grievance = Math.max(0, m.grievance - 0.3);
    },
    addConflict: function (a, b, cause) {
      var m = M.st(); a = a == null ? null : a; var st = G.state.staff; if (a == null) { if (st.length < 2) return null; var p = G.pick(st); a = p.id; var q = G.pick(st.filter(function (x) { return x.id !== a; })); b = q.id; }
      if (m.conflicts.some(function (c) { return !c.done && M.key(c.a, c.b) === M.key(a, b); })) return null;
      var c = { id: m.nextId++, a: a, b: b, cause: cause || G.pick(CAUSES), day: G.state.day, done: false, esc: false }; m.conflicts.push(c); M.addRel(a, b, -20); return c;
    },
    grievanceEvent: function () {
      var s = G.state, m = M.st(), st = G.pick(s.staff.filter(function (x) { return x.status === 'ok'; })); if (!st) return; var r = Math.random();
      if (r < 0.4 && G.training && G.training.raiseModal && !st.raiseAsked) { G.notify.push({ title: 'Bức xúc dồn nén: ' + st.name + ' đòi tăng lương', type: 'warn', sound: false }); G.training.raiseModal(st); }
      else if (r < 0.7) { var o = G.pick(s.staff.filter(function (x) { return x.id !== st.id; })); if (o) M.addConflict(st.id, o.id, 'bức xúc dồn nén'); G.notify.push({ title: 'Xích mích trong nhóm', text: 'Vì lâu không họp, bức xúc dồn nén gây cãi vã.', type: 'warn', sound: false }); }
      else if (st.sat < 40) { G.notify.push({ title: st.name + ' xin nghỉ việc', text: 'Lý do: không được lắng nghe, bức xúc kéo dài.', type: 'bad' }); G.staff.remove(st.id); }
    },
    quitMult: function () { var m = M.st(), mul = 1 + m.grievance / 40; if (G.state.day <= m.buff.until) mul *= 0.6; return mul; },
    buffMult: function () { var m = M.st(); return G.state.day <= m.buff.until ? m.buff.mult : 1; },
    // ---------- lịch họp ----------
    isDue: function () { var m = M.st(); return !!(m.due && !m.held); },
    daysLeft: function () { var m = M.st(); return Math.max(0, m.nextDay - G.state.day); },
    postpone: function () { var m = M.st(); if (!M.isDue()) return { ok: false, msg: 'Chưa tới ngày họp' }; if (m.postponed) return { ok: false, msg: 'Đã hoãn một lần rồi' }; m.postponed = true; m.due = false; m.nextDay = G.state.day + 1; G.state.staff.forEach(function (x) { x.sat = Math.max(0, x.sat - 1); }); return { ok: true, msg: 'Đã hoãn họp sang ngày mai (nhân viên hơi phật ý)' }; },
    skip: function (silent) {
      var m = M.st(), s = G.state; if (!m.due && !silent) return { ok: false, msg: 'Chưa tới ngày họp' };
      m.skipped++; m.grievance = Math.min(100, m.grievance + 8); s.staff.forEach(function (x) { x.sat = Math.max(0, x.sat - 3); m.trust[x.id] = Math.max(0, (m.trust[x.id] || 50) - 2); });
      m.history.unshift({ id: m.nextId++, day: s.day, week: m.week + 1, skipped: true, items: [], text: 'Bỏ họp - bức xúc +8' }); if (m.history.length > 12) m.history.pop();
      m.due = false; m.postponed = false; m.held = false; m.nextDay = M.nextMeet(s.day); m.week++;
      return { ok: true, msg: 'Đã bỏ họp tháng này (nhân viên bức xúc)' };
    },
    // ---------- chương trình họp ----------
    pickBy: function (role) { var s = G.state, l = s.staff.filter(function (x) { return x.status !== 'leave' && (!role || x.role === role); }); return l.length ? G.pick(l) : null; },
    quote: function (topic, st, d) {
      var t = M.st().traits[st.id], T = {
        luong: { def: 'Em làm khá lâu rồi mà lương còn thấp hơn mặt bằng ' + d.p + '%, mong chị / anh xem lại.', nong: 'Lương thế này thì làm sao sống nổi? Thấp hơn người ta ' + d.p + '% mà việc thì nhiều!', hoa: 'Dạ, em xin phép góp ý nhỏ: lương của em hiện thấp hơn mặt bằng khoảng ' + d.p + '%, mong được xem xét ạ.' },
        ca: { def: 'Em phải làm ' + d.n + ' ca liên tiếp rồi, mệt quá, mong được nghỉ bù.', nong: 'Làm ' + d.n + ' ca liền không nghỉ, ai chịu nổi! Xếp ca kiểu gì vậy?', luoi: 'Cho em nghỉ một hôm với, ' + d.n + ' ca liên tục rồi...' },
        thieu: { def: 'Giờ cao điểm khách đông quá, ca chiều chỉ có ' + d.n + ' người bán, không xuể ạ.' },
        khachkho: { def: 'Dạo này khách hay chờ lâu rồi bực, ' + d.n + ' khách bỏ về hôm nay. Mình cần xử lý thế nào ạ?' },
        moitruong: { def: 'Cửa hàng ' + d.w + ' quá, làm việc rất khó chịu, mong có quạt / máy lạnh hoặc chỗ nghỉ.' },
        thuong: { def: 'Cùng vị trí mà lương / thưởng không đều, em thấy chưa công bằng lắm.', nong: 'Người làm ít lại được lương cao hơn em? Không công bằng!' },
        hethang: { def: 'Có ' + d.n + ' khách hỏi mẫu ' + d.code + ' mà kho hết hàng, mất đơn uổng quá. Mình nhập thêm đi ạ?', cham: 'Em ghi lại: ' + d.n + ' khách hỏi ' + d.code + ' hết hàng. Nên nhập gấp để không mất khách.' },
        doimau: { def: 'Mẫu ' + d.code + ' trưng bày lâu rồi mà ít khách hỏi, đổi mẫu mới cho cửa hàng tươi hơn nhé?', tham: 'Mình nên trưng mẫu mới bắt mắt hơn để đẩy doanh số, em đề xuất đổi ' + d.code + '.' },
        phongnghi: { def: 'Cửa hàng mình chưa có phòng nghỉ cho nhân viên, nghỉ giữa ca không có chỗ ngồi.' },
        maylanh: { def: 'Trời ' + d.w + ' thế này mà không có máy lạnh, khách và nhân viên đều mệt.' },
        giamgia: { def: 'Dạo này khách ít, mình chạy chương trình giảm giá vài ngày kéo khách được không ạ?', tham: 'Làm flash sale cuối tuần đi, em chắc chắn kéo được khách và doanh số.' },
        training: { def: 'Em muốn được đi đào tạo thêm kỹ năng để bán tốt hơn.', cham: 'Em muốn học thêm để làm việc hiệu quả hơn, mong được hỗ trợ khóa đào tạo.', tham: 'Cho em đi học nâng cao, em muốn lên vị trí cao hơn.' },
        phanmem: { def: 'Phần mềm quản lý hơi cũ, ghi đơn lâu. Nâng cấp thì làm việc nhanh hơn nhiều ạ.' },
        baohanh: { def: 'Có ' + d.n + ' yêu cầu bảo hành tồn đọng, khách giục nhiều, em xử lý không kịp.' },
        dontre: { def: 'Đơn giao trễ ' + d.n + ' đơn do phát sinh mưa gió và thiếu chuyến, khách phàn nàn.' },
        danhgia: { def: 'Có ' + d.n + ' đánh giá xấu chưa phản hồi, ảnh hưởng uy tín cửa hàng ạ.' }
      };
      var tp = T[topic] || { def: '...' }; return tp[t] || tp.def;
    },
    buildAgenda: function () {
      var s = G.state, m = M.st(), items = [], used = {}, nid = 1; M.ensure();
      function add(topic, st, sev, chips, d, extra) { if (!st || (used[st.id] || 0) >= 2) return; used[st.id] = (used[st.id] || 0) + 1; items.push(Object.assign({ id: nid++, kind: TOPICS[topic].kind, topic: topic, who: [st.id], quote: M.quote(topic, st, d || {}), chips: chips || [], sev: Math.round(sev), data: d || {} }, extra || {})); }
      var avgSal = {}; s.staff.forEach(function (x) { avgSal[x.role] = avgSal[x.role] || { t: 0, n: 0 }; avgSal[x.role].t += x.salary; avgSal[x.role].n++; });
      s.staff.forEach(function (st) {
        if (st.status === 'leave') return; var mk = G.staff.market(st.role, st.stars), p = Math.round((1 - st.salary / mk) * 100);
        if ((p >= 4 && st.sat < 65) || st.raiseAsked || s.day - st.lastRaise >= 150) add('luong', st, 25 + Math.max(0, 70 - st.sat) + Math.max(0, p) * 1.5 + (st.raiseAsked ? 15 : 0), ['Hài lòng ' + Math.round(st.sat), p > 0 ? 'lương thấp hơn TB ' + p + '%' : 'đã ' + (s.day - st.lastRaise) + ' ngày chưa tăng lương'], { p: Math.max(1, p) });
        if ((st.consec || 0) >= 5 || (st.fatigue || 0) > 0) add('ca', st, 30 + (st.consec || 0) * 6 + (st.fatigue || 0) * 40, [(st.consec || 0) + ' ca liên tiếp', 'Mệt ' + Math.round(Math.min(1, st.fatigue || 0) * 100)], { n: st.consec || 0 });
        var rs = avgSal[st.role]; if (rs && rs.n > 1 && st.salary < rs.t / rs.n * 0.88) add('thuong', st, 35 + (60 - st.sat) * 0.5, ['lương thấp hơn đồng nghiệp cùng vị trí'], {});
        if (st.sat < 35) add('luong', st, 40 + (50 - st.sat), ['Hài lòng ' + Math.round(st.sat)], { p: 5 });
      });
      var sales = s.staff.filter(function (x) { return x.role === 'sales' && x.status === 'ok'; });
      var lw = s.today.lostWait || 0, gap = 0; for (var d = 0; d < 7; d++) { var am = 0, pm = 0; s.staff.forEach(function (x) { if (x.role !== 'sales' || x.status === 'leave') return; var sh = x.sched[d]; if (sh === 'am' || sh === 'full') am++; if (sh === 'pm' || sh === 'full') pm++; }); if (!pm) gap++; }
      if (sales.length && (gap || lw >= 3)) add('thieu', G.pick(sales), 45 + gap * 8 + lw * 3, [gap ? gap + ' ngày ca chiều chỉ có chủ' : 'khách chờ lâu bỏ về ' + lw], { n: sales.length ? 1 : 0 });
      if (sales.length && lw >= 2) add('khachkho', G.pick(sales), 30 + lw * 5, ['khách bỏ về vì chờ: ' + lw], { n: lw });
      // khách hỏi hết hàng (mất đơn)
      var lost = {}; s.lostLog.forEach(function (e) { if (s.day - e.day <= 7) lost[e.sku] = (lost[e.sku] || 0) + (e.n || 1); });
      var topLost = Object.keys(lost).sort(function (a, b) { return lost[b] - lost[a]; })[0];
      if (topLost && lost[topLost] >= 2) { var sp = M.pickBy('warehouse') || M.pickBy('sales'); add('hethang', sp, 40 + lost[topLost] * 8, ['mất ' + lost[topLost] + ' đơn / 7 ngày', G.sprites.codeOf(topLost)], { n: lost[topLost], code: G.sprites.codeOf(topLost), sku: topLost }); }
      if (G.weather && (G.weather.cur().t === 'nong' || G.weather.cur().t === 'ret') && !G.decor.placed().some(function (x) { return x.id === 'ac'; })) add('moitruong', M.pickBy(), 35, ['thời tiết ' + G.weather.def().name.toLowerCase()], { w: G.weather.cur().t === 'nong' ? 'nóng' : 'lạnh' });
      if (s.level >= 1 && !s.staffroom.built) add('phongnghi', M.pickBy(), 28, ['chưa có phòng NV'], {});
      if (G.weather && G.weather.cur().t === 'nong' && !G.decor.placed().some(function (x) { return x.id === 'ac'; })) add('maylanh', M.pickBy(), 30, ['nắng nóng ' + G.weather.cur().temp + '°'], { w: 'nóng' });
      var shown = s.slots.filter(function (x) { return x.sku && (!s.lastSold[x.sku] || s.day - s.lastSold[x.sku] > 14); })[0]; if (shown) add('doimau', M.pickBy('sales') || M.pickBy(), 24, ['mẫu ' + G.sprites.codeOf(shown.sku) + ' lâu chưa bán'], { code: G.sprites.codeOf(shown.sku), sku: shown.sku });
      if (G.campaigns && G.campaigns.heatMult && !G.campaigns.active().length && s.today.visitors < 6) add('giamgia', M.pickBy(), 20, ['khách ít'], {});
      var nosk = s.staff.filter(function (x) { return !Object.keys(x.skills || {}).length && x.status === 'ok'; })[0]; if (nosk) add('training', nosk, 22, ['chưa có khóa nào'], {});
      if (G.state.level >= 2 && G.chance(0.3)) add('phanmem', M.pickBy('accountant') || M.pickBy(), 15, [], {});
      var cl = G.returns && G.returns.pendingList ? G.returns.pendingList().length : 0; if (cl >= 3 && M.pickBy('cskh')) add('baohanh', M.pickBy('cskh'), 35 + cl * 4, [cl + ' yêu cầu chờ'], { n: cl });
      if (s.shipping.stats.late > 0 && M.pickBy('delivery')) add('dontre', M.pickBy('delivery'), 28 + s.shipping.stats.late * 2, ['trễ ' + s.shipping.stats.late + ' đơn'], { n: s.shipping.stats.late });
      var un = G.reviews.unanswered().filter(function (r) { return r.rating <= 2; }).length; if (un >= 3) add('danhgia', M.pickBy('sales') || M.pickBy(), 25 + un * 3, [un + ' đánh giá xấu'], { n: un });
      // mâu thuẫn
      m.conflicts.forEach(function (c) { if (c.done) return; var A = G.staff.byId(c.a), B = G.staff.byId(c.b); if (!A || !B) return; items.push({ id: nid++, kind: 'conflict', topic: 'conflict', who: [A.id, B.id], quote: A.name.split(' ').pop() + ': "' + (M.trait(A.id) === 'nong' ? 'Em chịu hết nổi ' + B.name.split(' ').pop() + ' rồi, ' : 'Em và ' + B.name.split(' ').pop() + ' đang có chuyện: ') + c.cause + '."', chips: ['quan hệ ' + M.relLabel(M.rel(A.id, B.id)), 'kéo dài ' + (s.day - c.day) + ' ngày', M.TRAITS[M.trait(A.id)].name + ' / ' + M.TRAITS[M.trait(B.id)].name], sev: 60 + Math.min(30, (s.day - c.day) * 2), data: { cid: c.id, cause: c.cause } }); });
      // việc đã hứa
      m.followups.forEach(function (f) { if (f.done) return; var st = G.staff.byId(f.who); if (!st) return; items.push({ id: nid++, kind: 'followup', topic: 'followup', who: [st.id], quote: st.name.split(' ').pop() + ': "Tuần trước anh / chị hứa ' + f.text + ' - tình hình thế nào ạ?"', chips: ['hứa ngày ' + f.day], sev: 55, data: { fid: f.id } }); });
      items.sort(function (a, b) { return b.sev - a.sev; });
      var tc = {}; items = items.filter(function (i) { tc[i.topic] = (tc[i.topic] || 0) + 1; return i.kind === 'conflict' || i.kind === 'followup' || tc[i.topic] <= 2; });
      return items.slice(0, 6);
    },
    relLabel: function (v) { return v >= 25 ? 'tốt' : v <= -25 ? 'căng thẳng' : 'bình thường'; },
    // ---------- lựa chọn xử lý ----------
    choices: function (it) {
      var c = [];
      function ch(id, label, desc, cost) { c.push({ id: id, label: label, desc: desc, cost: cost || 0 }); }
      var st = G.staff.byId(it.who[0]), sal = st ? st.salary : 0;
      switch (it.topic) {
        case 'luong': ch('raise', 'Tăng lương 8%', '+15 hài lòng, tốn ' + G.fmt.short(Math.round(sal * 0.08)) + '/tháng', 0); ch('bonus', 'Thưởng nóng', '+12 hài lòng, tốn ' + G.fmt.short(Math.round(sal * 0.5)), Math.round(sal * 0.5)); ch('neg', 'Thương lượng / giải thích', 'Có thể thành công, tùy tính cách & quản lý'); ch('later', 'Hứa xem xét kỳ họp sau', '+3 hài lòng, nhưng phải thực hiện'); ch('refuse', 'Từ chối', '−8 hài lòng, tiết kiệm'); break;
        case 'ca': ch('dayoff', 'Cho nghỉ bù ngày mai', '+8 hài lòng, giảm mệt, thiếu người 1 ngày'); ch('shift', 'Điều chỉnh ca ngay', 'Giảm số ca liên tiếp, +6 hài lòng'); ch('neg', 'Giải thích tình hình', 'Có thể được thông cảm'); ch('later', 'Hứa sắp xếp lại', '+3 hài lòng, phải thực hiện'); ch('refuse', 'Từ chối', '−8 hài lòng'); break;
        case 'thieu': ch('hire', 'Hứa tuyển thêm người bán', '+6 hài lòng, phải tuyển trước kỳ họp sau'); ch('neg', 'Giải thích / xin cố gắng', 'Có thể được thông cảm'); ch('later', 'Hứa xử lý sau', '+3 hài lòng'); ch('refuse', 'Từ chối', '−8 hài lòng'); break;
        case 'khachkho': case 'danhgia': case 'baohanh': case 'dontre': ch('train', 'Cho đi đào tạo kỹ năng', 'Tốn ' + G.fmt.short(1500000) + ', +8 hài lòng, +XP', 1500000); ch('neg', 'Hướng dẫn cách xử lý', 'Có thể thành công'); ch('later', 'Hứa hỗ trợ thêm', '+3 hài lòng, phải thực hiện'); ch('crit', 'Phê bình', 'Rủi ro: −6 hài lòng'); break;
        case 'moitruong': case 'maylanh': ch('fan', 'Mua quạt / đồ dùng ngay', 'Tốn ' + G.fmt.short(2000000) + ', +10 hài lòng', 2000000); ch('neg', 'Giải thích sẽ cải thiện dần', 'Có thể thành công'); ch('later', 'Hứa xử lý sau', '+3 hài lòng, phải thực hiện'); ch('refuse', 'Từ chối', '−8 hài lòng'); break;
        case 'phongnghi': ch('room', s0().staffroom.built ? 'Mua thêm đồ phòng nghỉ' : 'Xây phòng nhân viên', 'Tốn ' + G.fmt.short(s0().staffroom.built ? 6e6 : G.staffroom.BUILD_COST) + ', +12 hài lòng', s0().staffroom.built ? 6e6 : G.staffroom.BUILD_COST); ch('neg', 'Giải thích ngân sách', 'Có thể được thông cảm'); ch('later', 'Hứa xây khi có điều kiện', '+3 hài lòng, phải thực hiện'); ch('refuse', 'Từ chối', '−8 hài lòng'); break;
        case 'thuong': ch('bonus', 'Thưởng nóng cân bằng', 'Tốn ' + G.fmt.short(Math.round(sal * 0.5)), Math.round(sal * 0.5)); ch('raise', 'Tăng lương 8%', 'Tốn thêm ' + G.fmt.short(Math.round(sal * 0.08)) + '/tháng'); ch('neg', 'Giải thích tiêu chí lương', 'Có thể thành công'); ch('refuse', 'Từ chối', '−8 hài lòng'); break;
        case 'hethang': ch('order', 'Giao Thủ kho nhập ngay', 'Ghi nhận vào danh sách mua của Thủ kho, +10 hài lòng'); ch('neg', 'Giải thích ngân sách / nguồn hàng', 'Có thể thành công'); ch('later', 'Hứa nhập tháng này', '+3 hài lòng, phải thực hiện'); ch('refuse', 'Từ chối', '−6 hài lòng'); break;
        case 'doimau': case 'giamgia': case 'phanmem': ch('agree', 'Đồng ý thử', '+8 hài lòng' + (it.topic === 'phanmem' ? ', tốn ' + G.fmt.short(3e6) : ''), it.topic === 'phanmem' ? 3e6 : 0); ch('neg', 'Ghi nhận, cân nhắc', '+3 hài lòng'); ch('later', 'Hứa xem xét', '+3 hài lòng, phải thực hiện'); ch('refuse', 'Từ chối', '−6 hài lòng'); break;
        case 'training': ch('train', 'Cho đi đào tạo', 'Tốn ' + G.fmt.short(1500000) + ', +10 hài lòng, +XP', 1500000); ch('neg', 'Hẹn sắp xếp lịch học', '+3 hài lòng'); ch('later', 'Hứa sắp xếp kỳ họp sau', '+3 hài lòng, phải thực hiện'); ch('refuse', 'Từ chối', '−6 hài lòng'); break;
        case 'conflict': ch('mediate', 'Hòa giải', 'Có thể thành công, tùy tính cách & quản lý'); ch('teambuild', 'Bữa ăn team building', 'Tốn ' + G.fmt.short(300000) + ', quan hệ +15 (nếu hợp)', 300000); ch('separate', 'Tách ca / khu vực', 'Hết va chạm nhưng giảm phối hợp'); ch('order', 'Ra lệnh phải hòa thuận', 'Hai người −3 hài lòng, hiệu quả tạm thời'); ch('sideA', 'Bênh ' + M.staffName(it.who[0]).split(' ').pop(), 'Người được bênh +8, người kia −10'); ch('sideB', 'Bênh ' + M.staffName(it.who[1]).split(' ').pop(), 'Người được bênh +8, người kia −10'); ch('warn', 'Cảnh cáo cả hai', '−6 hài lòng mỗi người, ghi kỷ luật'); break;
        case 'followup': ch('done', 'Đã xử lý xong', 'Tôi đã thực hiện'); ch('later', 'Xin thêm một kỳ họp', '−3 hài lòng, hứa lại'); ch('refuse', 'Xin lỗi, chưa làm được', '−8 hài lòng, giảm tin tưởng'); break;
        default: ch('agree', 'Đồng ý', '+8 hài lòng'); ch('later', 'Hứa xử lý sau', '+3 hài lòng'); ch('refuse', 'Từ chối', '−6 hài lòng');
      }
      return c;
    },
    traitMod: function (id) { var t = M.trait(id); return { hoa: 0.15, trung: 0.1, nong: -0.15, tham: -0.05, luoi: 0, cham: 0.05 }[t] || 0; },
    adj: function (id, d) { var st = G.staff.byId(+id), cur = M.st().current; if (!st) return; st.sat = G.clamp(st.sat + d, 0, 100); if (cur) cur.delta[id] = (cur.delta[id] || 0) + d; },
    pay: function (n) { if (n > 0) { G.econ.expense(n, 'wages'); var cur = M.st().current; if (cur) cur.cost += n; } },
    // áp dụng 1 lựa chọn: trả {text, ok}
    resolve: function (it, choice, bonusP) {
      var s = G.state, m = M.st(), cur = m.current, a = it.who[0], st = G.staff.byId(a), r = { text: '', ok: true }, mgr = M.mgrStars(), p;
      function follow(text, type, extra) { m.followups.push(Object.assign({ id: m.nextId++, who: a, text: text, day: s.day, due: m.nextDay, done: false, type: type || 'generic' }, extra || {})); }
      var tn = st ? st.name.split(' ').pop() : '';
      if (it.topic === 'conflict') {
        var c = m.conflicts.filter(function (x) { return x.id === it.data.cid; })[0], A = G.staff.byId(it.who[0]), B = G.staff.byId(it.who[1]); if (!c || !A || !B) return { text: 'Mâu thuẫn không còn.', ok: true };
        var pm = 0.42 + 0.12 * mgr + (M.traitMod(A.id) + M.traitMod(B.id)) / 2 + (M.rel(A.id, B.id) > -50 ? 0.1 : 0) + (bonusP || 0);
        if (choice === 'mediate') { if (G.chance(pm)) { c.done = true; M.addRel(A.id, B.id, 25); M.adj(A.id, 4); M.adj(B.id, 4); r.text = 'Hòa giải thành công: ' + A.name.split(' ').pop() + ' và ' + B.name.split(' ').pop() + ' bắt tay làm lành.'; } else { M.adj(A.id, -2); M.adj(B.id, -2); r.ok = false; r.text = 'Hòa giải chưa thành, hai người vẫn còn căng.'; } }
        else if (choice === 'teambuild') { M.pay(300000); if (G.chance(Math.min(0.9, pm + 0.25))) { c.done = true; M.addRel(A.id, B.id, 30); M.adj(A.id, 5); M.adj(B.id, 5); r.text = 'Bữa ăn team giúp hai người cởi mở, hết hiềm khích.'; } else { M.adj(A.id, 2); M.adj(B.id, 2); M.addRel(A.id, B.id, 8); r.ok = false; r.text = 'Ăn xong vui vẻ nhưng chuyện cũ vẫn chưa hết.'; } }
        else if (choice === 'separate') { c.done = true; M.addRel(A.id, B.id, 8); [A, B].forEach(function (x, i) { x.ov = null; for (var d = 0; d < 7; d++) { if (A.sched[d] === 'full' && B.sched[d] === 'full') { (i ? B : A).sched[d] = i ? 'pm' : 'am'; } } }); r.text = 'Đã tách ca để hai người ít gặp nhau (phối hợp giảm nhẹ).'; M.st().sepPenalty = (M.st().sepPenalty || 0) + 1; }
        else if (choice === 'order') { M.adj(A.id, -3); M.adj(B.id, -3); M.addRel(A.id, B.id, 6); if (G.chance(0.45)) c.done = true; r.text = 'Ra lệnh phải hòa thuận: tạm yên nhưng hai người không vui.'; }
        else if (choice === 'sideA' || choice === 'sideB') { var win = choice === 'sideA' ? A : B, lose = choice === 'sideA' ? B : A; M.adj(win.id, 8); M.adj(lose.id, -10); M.addRel(A.id, B.id, -10); c.done = G.chance(0.5); m.trust[lose.id] = Math.max(0, (m.trust[lose.id] || 50) - 6); r.text = win.name.split(' ').pop() + ' hả hê, ' + lose.name.split(' ').pop() + ' cảm thấy bị bất công.'; }
        else { M.adj(A.id, -6); M.adj(B.id, -6); M.addRel(A.id, B.id, 10); G.chance(0.5) && (c.done = true); r.text = 'Cảnh cáo cả hai, ghi nhận kỷ luật; cả hai đều buồn.'; }
        return r;
      }
      if (it.topic === 'followup') {
        var f = m.followups.filter(function (x) { return x.id === it.data.fid; })[0]; if (f) { if (choice === 'done') { f.done = true; M.adj(a, 6); r.text = 'Ghi nhận đã xử lý.'; } else if (choice === 'later') { f.due = m.nextDay; M.adj(a, -3); r.text = 'Gia hạn thêm một kỳ họp.'; } else { f.done = true; M.adj(a, -8); m.trust[a] = Math.max(0, (m.trust[a] || 50) - 8); r.text = 'Thất hứa - ' + tn + ' mất lòng tin.'; } }
        return r;
      }
      p = 0.5 + 0.12 * mgr + M.traitMod(a) + (bonusP || 0);
      switch (choice) {
        case 'raise': r.text = G.staff.raise(a, 0.08).msg; M.adj(a, 15); break;
        case 'bonus': M.pay(Math.round(st.salary * 0.5)); M.adj(a, 12); r.text = 'Thưởng nóng ' + G.fmt.short(Math.round(st.salary * 0.5)) + ' cho ' + tn + '.'; break;
        case 'neg': if (G.chance(p)) { M.adj(a, 6); r.text = tn + ' hiểu và thông cảm.'; } else { M.adj(a, -4); r.ok = false; r.text = tn + ' vẫn chưa hài lòng với lời giải thích.'; } break;
        case 'later': M.adj(a, 3); follow({ luong: 'xem xét tăng lương', ca: 'sắp xếp lại ca', thieu: 'xử lý thiếu người', moitruong: 'cải thiện môi trường', maylanh: 'lắp máy lạnh / quạt', phongnghi: 'xây / mua đồ phòng nghỉ', hethang: 'nhập thêm hàng', training: 'cho đi đào tạo' }[it.topic] || 'hỗ trợ thêm'); r.text = 'Đã hứa với ' + tn + ' - sẽ kiểm tra ở buổi họp sau.'; break;
        case 'refuse': M.adj(a, -8); m.trust[a] = Math.max(0, (m.trust[a] || 50) - 5); r.text = tn + ' thất vọng vì bị từ chối.'; break;
        case 'crit': if (M.trait(a) === 'cham' || M.trait(a) === 'trung') { M.adj(a, -2); r.text = tn + ' nhận lỗi và hứa làm tốt hơn.'; } else { M.adj(a, -6); r.ok = false; r.text = tn + ' bị phê bình, tỏ ra khó chịu.'; } break;
        case 'dayoff': M.adj(a, 8); st.ov = { day: s.day + 1, shift: 'off' }; st.consec = Math.max(0, (st.consec || 0) - 3); r.text = tn + ' được nghỉ bù ngày mai.'; break;
        case 'shift': M.adj(a, 6); st.consec = Math.max(0, (st.consec || 0) - 2); for (var d2 = 0; d2 < 7; d2++) if (st.sched[d2] === 'full') { st.sched[d2] = 'am'; break; } r.text = 'Đã giảm bớt một ca full của ' + tn + '.'; break;
        case 'hire': M.adj(a, 6); follow('tuyển thêm người bán', 'hire', { base: G.staff.count('sales') }); r.text = 'Hứa tuyển thêm người bán trước buổi họp sau.'; break;
        case 'train': M.pay(1500000); M.adj(a, 8); G.staff.addXp(st, 15); r.text = tn + ' được đi đào tạo (+XP).'; break;
        case 'fan': M.pay(2000000); M.adj(a, 10); r.text = 'Đã mua quạt / đồ dùng cho nhân viên.'; break;
        case 'room': { var cost = s.staffroom.built ? 6e6 : G.staffroom.BUILD_COST; if (s.money >= cost) { if (s.staffroom.built) { G.econ.expense(cost, 'wages'); M.adj(a, 12); r.text = 'Đã mua thêm đồ cho phòng nghỉ.'; } else { var b = G.staffroom.build(); r.text = b.msg; if (b.ok) M.adj(a, 12); else r.ok = false; } if (cur) cur.cost += cost; } else { M.adj(a, -2); r.ok = false; r.text = 'Không đủ tiền.'; } break; }
        case 'order': M.adj(a, 10); if (G.autobuy && G.autobuy.active()) G.autobuy.run(false); r.text = 'Đã giao Thủ kho ưu tiên nhập mẫu ' + (it.data.code || '') + '.'; break;
        case 'agree': M.pay(it.topic === 'phanmem' ? 3e6 : 0); M.adj(a, 8); r.text = 'Đồng ý thử đề xuất của ' + tn + '.'; if (it.topic === 'doimau' && it.data.sku) { var sl = s.slots.filter(function (x) { return x.sku === it.data.sku; })[0]; if (sl) { G.shelf.clear(sl); G.shelf.autoArrange(); } } break;
        default: M.adj(a, 3); r.text = 'Đã ghi nhận.';
      }
      return r;
    },
    // ---------- buổi họp ----------
    begin: function (onlyEscalated) {
      var m = M.st(), s = G.state; if (m.current) return m.current; M.ensure();
      var attendees = s.staff.filter(function (x) { return x.status !== 'leave'; }).map(function (x) { return x.id; }), start = {}; s.staff.forEach(function (x) { start[x.id] = x.sat; });
      var items = onlyEscalated ? m.escalated.slice() : M.buildAgenda();
      // kiểm tra việc đã hứa tự động
      m.followups.forEach(function (f) { if (f.done) return; var st = G.staff.byId(f.who); if (!st) { f.done = true; return; } if (f.type === 'hire' && G.staff.count('sales') > (f.base || 0)) { f.done = true; st.sat = Math.min(100, st.sat + 4); G.notify.toast('Đã giữ lời hứa tuyển người - ' + st.name.split(' ').pop() + ' vui hơn', 'good'); } });
      var cur = m.current = { id: m.nextId++, day: s.day, week: m.week + 1, items: items, idx: 0, results: [], delta: {}, cost: 0, startSat: start, attendees: attendees, len: m.len, prep: !!s.prep, finished: false, delegated: false };
      // chi phí phụ trội: họp trước giờ làm / NV ngoài ca được trả tăng ca
      var ot = 0; s.staff.forEach(function (x) { if (attendees.indexOf(x.id) < 0) return; var hr = x.salary / 208, on = G.staff.shiftOn(x, s.day, s.minute) && !s.prep; if (!on) ot += Math.round(hr * (m.len / 60) * 1.5); });
      if (ot) { G.econ.expense(ot, 'wages'); cur.cost += ot; cur.overtime = ot; }
      if (!s.prep) M.seat(attendees, m.len);
      return cur;
    },
    seat: function (attendees, len) {
      var s = G.state, m = M.st(); m.active = { day: s.day, endMin: s.minute + len, ids: attendees.slice(), done: false };
      var R = G.staffroom, built = R && R.built();
      G.staff.ents.slice().forEach(function (e) {
        if (e.id === 'owner' || attendees.indexOf(e.id) < 0) return;
        if (e.cust) { e.cust.seller = null; if (e.cust.state === 'served') e.cust.state = 'wait'; e.cust = null; }
        if (built && R.freeSeat() >= 0) { R.occ.push({ id: e.id, name: e.name, role: e.role, color: e.color, seat: R.freeSeat(), until: 99999, reason: 'meeting', state: 'sit' }); G.staff.ents = G.staff.ents.filter(function (x) { return x !== e; }); }
        else { var sp = G.pick(G.layout.get().spots.counter); e.state = 'meeting'; G.path.goto(e, sp.x, sp.y); }
      });
    },
    release: function () {
      var m = M.st(), R = G.staffroom; if (!m.active) return;
      if (R) R.occ = R.occ.filter(function (o) { return o.reason !== 'meeting'; });
      G.staff.ents.forEach(function (e) { if (e.state === 'meeting') { e.state = 'idle'; e.idleT = G.rand(2, 8); } });
      m.active = null;
    },
    inMeeting: function () { var a = M.st().active; return !!(a && a.day === G.state.day); },
    finish: function () {
      var m = M.st(), s = G.state, cur = m.current; if (!cur || cur.finished) return null; cur.finished = true;
      var ds = Object.keys(cur.delta).map(function (k) { return cur.delta[k]; }), avg = ds.length ? ds.reduce(function (x, y) { return x + y; }, 0) / ds.length : 0;
      var resolved = cur.results.filter(function (r) { return r.ok; }).length, total = Math.max(1, cur.results.length), q = G.clamp(0.4 + avg / 20 + resolved / total * 0.3, 0, 1);
      m.buff = { until: s.day + 30, mult: 1 + 0.05 * q }; m.grievance = Math.max(0, m.grievance - 12 * (0.4 + q)); m.skippedRecent = false;
      var deltas = {}; s.staff.forEach(function (x) { if (cur.startSat[x.id] != null) deltas[x.id] = Math.round((x.sat - cur.startSat[x.id]) * 10) / 10; });
      s.staff.forEach(function (x) { if (cur.attendees.indexOf(x.id) >= 0) x.sat = Math.min(100, x.sat + 1.5); });
      var rec = { id: cur.id, day: s.day, week: cur.week, skipped: false, delegated: cur.delegated, items: cur.results.map(function (r) { return { topic: r.topic, who: r.who, choice: r.label, text: r.text, ok: r.ok }; }), deltas: deltas, cost: cur.cost, q: Math.round(q * 100), len: cur.len, att: cur.attendees.length };
      m.history.unshift(rec); if (m.history.length > 12) m.history.pop();
      m.due = false; m.held = false; m.postponed = false; m.nextDay = M.nextMeet(s.day); m.week++; m.current = null;
      if (!s.prep && m.active) m.active.done = true; else M.release();
      G.emit('meetingDone', rec); return rec;
    },
    // Quản lý chủ trì / tua nhanh: xử lý tự động
    autoRun: function (delegated) {
      var m = M.st(), cur = M.begin(false), mgr = M.mgrStars(); cur.delegated = true;
      cur.items.forEach(function (it) {
        var easy = it.sev < 55 || it.kind === 'conflict' && mgr >= 2 || G.clock.skipping;
        if (!easy && delegated) { m.escalated.push(it); return; }
        var pick = it.kind === 'conflict' ? (mgr >= 1 ? 'mediate' : 'teambuild') : it.kind === 'followup' ? 'later' : (it.topic === 'luong' && G.state.money > 5e7 && it.sev > 70) ? 'raise' : 'neg';
        var r = M.resolve(it, pick, 0.08 * mgr); cur.results.push({ topic: it.topic, who: it.who, label: M.label(it, pick), text: r.text, ok: r.ok });
      });
      return M.finish();
    },
    label: function (it, id) { var c = M.choices(it).filter(function (x) { return x.id === id; })[0]; return c ? c.label : id; },
    // kỳ họp tới: chương trình dự kiến (cảnh báo tâm trạng)
    preview: function () { return M.buildAgenda().slice(0, 4); }
  };
  function s0() { return G.state; }
  G.on('init', M.ensure);
  G.on('staffChanged', M.ensure);
  G.on('dayStart', function () {
    var m = M.st(), s = G.state; M.ensure();
    if (m.active && m.active.day !== s.day) M.release();
    M.daily();
    if (s.day >= m.nextDay && !m.due) { m.due = true; m.held = false; if (s.staff.length) {
      if (G.clock.skipping) { M.autoRun(false); }
      else if (m.delegate && M.mgrStars() > 0 && G.staff.hasManager()) { var rec = M.autoRun(true); G.notify.push({ title: 'Quản lý đã chủ trì họp tháng', text: m.escalated.length ? m.escalated.length + ' vấn đề nghiêm trọng cần bạn xử lý.' : 'Các vấn đề thường đã được xử lý.', type: 'info', sound: false, action: m.escalated.length ? { label: 'Xử lý vấn đề', fn: function () { G.ui.openMeeting && G.ui.openMeeting(true); } } : null }); }
      else G.notify.push({ title: 'Họp nhân viên tháng này', text: 'Hôm nay có buổi họp ' + m.len + ' phút để nghe ý kiến và giải quyết khiếu nại.', type: 'info', sound: 'info', action: { label: 'Mở buổi họp', fn: function () { G.ui.openMeeting && G.ui.openMeeting(); } } });
    } else { m.due = false; m.nextDay = M.nextWeekday(s.day + 1); } }
  });
  G.on('dayEnd', function () { var m = M.st(), s = G.state, any = s.staff.some(function (x) { return x.status !== 'leave' && G.staff.shiftFor(x, s.day) !== 'off'; }); if (m.due && !m.held && !m.current && !any) { m.due = false; m.postponed = false; m.nextDay = s.day + 1; } else if (m.due && !m.held && !m.current) { M.skip(true); G.notify.push({ title: 'Bỏ lỡ buổi họp tháng', text: 'Nhân viên bức xúc vì không được họp (+8 bức xúc).', type: 'warn', sound: false }); m.skippedRecent = true; } if (m.current) m.current = null; M.release(); });
  G.on('tick', function () { var m = M.st(); if (m.active && m.active.day === G.state.day && G.state.minute >= m.active.endMin && m.active.done) M.release(); else if (m.active && m.active.day === G.state.day && G.state.minute >= m.active.endMin + 5) M.release(); });
  G.conversionMods.push(function () { return M.buffMult(); });
  var trm = function () { var m = M.st(), pen = (m.sepPenalty || 0) * 0.01; return M.buffMult() * (1 - Math.min(0.05, pen)); }; trm.label = 'Tinh thần nhóm'; G.trafficMods.push(trm);
})();
