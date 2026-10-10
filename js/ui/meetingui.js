/* Giao diện họp nhân viên: wizard (bottom sheet) + tab "Họp" trong Nhân viên */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, res = UI.res;
  function I() { return G.icon.apply(null, arguments); }
  function M() { return G.meeting; }
  var KIND = { idea: ['Ý kiến', 'st-go'], complaint: ['Khiếu nại', 'neg'], conflict: ['Mâu thuẫn', 'neg'], issue: ['Phản ánh', 'warn'], followup: ['Việc đã hứa', 'st-wait'] };
  function av(id, w, h) { var st = G.staff.byId(+id); return st ? '<img class="avt" width="' + (w || 36) + '" height="' + (h || 44) + '" alt="" src="' + UI.staffThumb(st, w || 36, h || 44) + '">' : ''; }
  function moodIcon(sat) { return sat < 35 ? 'cross' : sat < 60 ? 'warn' : 'check'; }
  function arrow(d) { return d > 0.4 ? '<b class="pos">▲ +' + Math.round(d) + '</b>' : d < -0.4 ? '<b class="neg">▼ ' + Math.round(d) + '</b>' : '<span class="muted">–</span>'; }
  function header(cur) {
    var s = G.state, st = s.staff.filter(function (x) { return cur.attendees.indexOf(x.id) >= 0; }), avg = st.length ? st.reduce(function (a, x) { return a + x.sat; }, 0) / st.length : 0;
    return '<div class="card"><b>' + I('people', 16) + ' Họp nhân viên · tuần ' + cur.week + '</b> <span class="muted small">(' + cur.len + ' phút' + (cur.prep ? ', trước giờ mở cửa' : ', cửa hàng vẫn mở') + ')</span><div class="avrow">' + st.slice(0, 10).map(function (x) { return '<span class="avm">' + av(x.id, 30, 38) + '<i>' + I(moodIcon(x.sat), 12) + '</i></span>'; }).join('') + '</div>' +
      '<div class="mb"><span>Tinh thần chung</span>' + UI.bar(avg / 100, avg < 40 ? 'bad' : avg > 65 ? 'good' : '') + '<b>' + Math.round(avg) + '</b></div></div>';
  }
  function itemCard(it, cur) {
    var k = KIND[it.kind] || ['', ''], tp = M().TOPICS[it.topic], h = '<div class="card mtitem"><div class="row"><span class="chipx ' + k[1] + '">' + k[0] + '</span> <b>' + I(tp.icon, 14) + ' ' + E(tp.name) + '</b></div>';
    h += '<div class="irow">' + it.who.map(function (id) { return '<div class="mtsp">' + av(id, 44, 54) + '<small>' + E(M().staffName(id).split(' ').pop()) + '</small></div>'; }).join('') + '<div class="mtq">“' + E(it.quote.replace(/^[^:]+: "(.*)"$/, '$1')) + '”</div></div>';
    h += '<div class="chips">' + it.chips.map(function (c) { return '<span class="chipx st-wait">' + E(c) + '</span>'; }).join(' ') + '</div>';
    var r = cur.results[cur.idx];
    if (r) return h + '<div class="card ' + (r.ok ? 'sugbox' : 'warnbox') + '"><b>' + E(r.label) + '</b><div class="small">' + (r.ok ? I('check', 12) : I('warn', 12)) + ' ' + E(r.text) + '</div></div><button class="btn primary big" data-act="mtNext">' + (cur.idx + 1 < cur.items.length ? 'Vấn đề tiếp theo ›' : 'Xem tổng kết ›') + '</button></div>';
    return h + '<div class="mtch">' + M().choices(it).map(function (c) { return '<button class="btn mtbtn" data-act="mtChoose" data-id="' + c.id + '"' + (c.cost && G.state.money < c.cost ? ' disabled' : '') + '><b>' + E(c.label) + '</b><small>' + E(c.desc) + '</small></button>'; }).join('') + '</div></div>';
  }
  function summary(cur) {
    var s = G.state, h = '<div class="card"><b>' + I('receipt', 16) + ' Tổng kết buổi họp</b>';
    if (!cur.results.length) h += '<div class="pos small">' + I('check', 12) + ' Không có vấn đề nào cần giải quyết - cả nhóm vui vẻ.</div>';
    h += cur.results.map(function (r) { return '<div class="small">' + (r.ok ? I('check', 12) : I('warn', 12)) + ' <b>' + E(r.who.map(function (i) { return M().staffName(i).split(' ').pop(); }).join(' & ')) + ':</b> ' + E(r.label) + ' - ' + E(r.text) + '</div>'; }).join('');
    var rows = s.staff.filter(function (x) { return cur.startSat[x.id] != null; }).map(function (x) { return '<div class="mtd">' + av(x.id, 24, 30) + '<span>' + E(x.name.split(' ').pop()) + '</span>' + arrow(x.sat - cur.startSat[x.id]) + '</div>'; }).join('');
    h += '<div class="small"><b>Hài lòng thay đổi</b></div><div class="mtdl">' + rows + '</div><div class="small">Chi phí: <b>' + F.vnd(cur.cost) + '</b>' + (cur.overtime ? ' (gồm tăng ca ' + F.short(cur.overtime) + ')' : '') + ' · hứa sau: ' + M().st().followups.filter(function (f) { return !f.done; }).length + ' việc</div></div>';
    return h + '<button class="btn primary big" data-act="mtFinish">Kết thúc họp & lưu biên bản</button>';
  }
  UI.meetingRender = function () {
    var m = M().st(), cur = m.current;
    if (!cur) { var last = m.history[0]; return last ? UI.minutesHtml(last) : '<p class="muted">Chưa có buổi họp nào.</p>'; }
    var h = header(cur);
    if (cur.idx === 0 && !cur.results.length && cur.items.length && G.staff.hasManager() && !cur.escMode) h += '<div class="card small">Có Quản lý: có thể để <b>Quản lý chủ trì</b> - tự xử lý các việc thường, chuyển việc nghiêm trọng cho bạn. <button class="btn" data-act="mtDelegate">' + I('crown', 14) + ' Quản lý chủ trì</button></div>';
    if (cur.idx >= cur.items.length) return h + summary(cur);
    h += '<div class="small muted">Vấn đề ' + (cur.idx + 1) + '/' + cur.items.length + '</div>' + UI.bar((cur.idx + 1) / cur.items.length, 'good');
    return h + itemCard(cur.items[cur.idx], cur);
  };
  UI.minutesHtml = function (r) {
    if (r.skipped) return '<div class="card"><b>Biên bản - ngày ' + r.day + '</b><div class="neg small">' + E(r.text) + '</div></div>';
    var h = '<div class="card"><b>' + I('receipt', 16) + ' Biên bản họp tuần ' + r.week + ' (ngày ' + r.day + ')</b><div class="small">' + r.att + ' người dự · ' + r.len + ' phút' + (r.delegated ? ' · Quản lý chủ trì' : '') + ' · chất lượng <b>' + r.q + '%</b> · chi phí ' + F.vnd(r.cost) + '</div>';
    h += r.items.length ? r.items.map(function (i) { return '<div class="small">' + (i.ok ? I('check', 12) : I('warn', 12)) + ' ' + E(M().TOPICS[i.topic].name) + ' - ' + E(i.who.map(function (x) { return M().staffName(x).split(' ').pop(); }).join(' & ')) + ': ' + E(i.choice) + '</div>'; }).join('') : '<div class="muted small">Không có vấn đề.</div>';
    h += '<div class="small"><b>Hài lòng:</b> ' + Object.keys(r.deltas).map(function (k) { var d = r.deltas[k]; return E(M().staffName(k).split(' ').pop()) + ' ' + (d > 0.4 ? '▲' + Math.round(d) : d < -0.4 ? '▼' + Math.round(d) : '–'); }).join(' · ') + '</div></div>';
    return h;
  };
  UI.openMeeting = function (esc) {
    var m = M().st(), s = G.state;
    if (!s.staff.length) { G.notify.toast('Chưa có nhân viên để họp', 'warn'); return; }
    if (!m.current) {
      if (esc) { if (!m.escalated.length) { G.notify.toast('Không có vấn đề nào cần xử lý', 'info'); return; } var c = M().begin(true); c.escMode = true; m.escalated = []; }
      else { M().begin(false); m.held = true; }
    }
    UI.sheet2.open('Họp nhân viên', UI.meetingRender);
  };
  var A = P.act;
  A.mtChoose = function (el) { var cur = M().st().current; if (!cur) return; var it = cur.items[cur.idx]; if (!it || cur.results[cur.idx]) return; var r = M().resolve(it, el.dataset.id); cur.results[cur.idx] = { topic: it.topic, who: it.who, label: M().label(it, el.dataset.id), text: r.text, ok: r.ok }; };
  A.mtNext = function () { var cur = M().st().current; if (cur) cur.idx++; };
  A.mtFinish = function () { var rec = M().finish(); if (rec) G.notify.toast('Đã lưu biên bản họp (chất lượng ' + rec.q + '%)', 'good'); };
  A.mtDelegate = function () { var rec = M().autoRun(true); if (rec) G.notify.toast('Quản lý đã chủ trì họp' + (M().st().escalated.length ? ' - ' + M().st().escalated.length + ' việc cần bạn xử lý' : ''), 'good'); };
  A.mtOpen = function () { UI.openMeeting(); };
  A.mtEsc = function () { UI.openMeeting(true); };
  A.mtPostpone = function () { res(M().postpone()); };
  A.mtSkip = function () { if (!M().isDue()) { res({ ok: false, msg: 'Chưa tới ngày họp' }); return; } res(M().skip()); };
  A.mtDay = function (el) { var m = M().st(); m.weekday = +el.dataset.v; if (!m.due && !m.current) m.nextDay = M().nextWeekday(G.state.day + (m.nextDay <= G.state.day ? 1 : 0)); };
  A.mtLen = function (el) { M().st().len = +el.dataset.v; };
  A.mtDelegateOn = function () { var m = M().st(); m.delegate = !m.delegate; };
  A.mtFollow = function (el) { var f = M().st().followups.filter(function (x) { return x.id === +el.dataset.id; })[0]; if (f) { f.done = true; var st = G.staff.byId(f.who); if (st) st.sat = Math.min(100, st.sat + 4); G.notify.toast('Đã ghi nhận hoàn thành việc đã hứa', 'good'); } };
  A.mtMinutes = function (el) { var r = M().st().history.filter(function (x) { return x.id === +el.dataset.id; })[0]; if (r) UI.sheet2.open('Biên bản họp', function () { return UI.minutesHtml(r); }); };
  // ---------- tab Họp ----------
  UI.meetingView = function () {
    var m = M().st(), s = G.state, h = '', due = M().isDue(), left = M().daysLeft();
    h += '<div class="card"><b>' + I('clock', 16) + ' Họp tuần ' + (m.week + 1) + '</b> ' + (due ? '<span class="chipx neg">Hôm nay</span>' : '<span class="chipx st-wait">còn ' + left + ' ngày (ngày ' + m.nextDay + ', ' + G.cal.WDFULL[G.cal.weekday(m.nextDay)] + ')</span>') +
      '<div class="small muted">Nghe ý kiến, xử lý khiếu nại & mâu thuẫn. Họp đều đặn tăng tinh thần, giảm nghỉ việc; bỏ họp thì nhân viên bức xúc.</div>' +
      '<div class="row"><button class="btn primary" data-act="mtOpen">' + I('people', 16) + (m.current ? ' Tiếp tục họp' : due ? ' Họp ngay' : ' Họp ngay (ngoài lịch)') + '</button><button class="btn" data-act="mtPostpone"' + (due && !m.postponed && !m.current ? '' : ' disabled') + '>Hoãn 1 ngày</button><button class="btn" data-act="mtSkip"' + (due && !m.current ? '' : ' disabled') + '>Bỏ qua tuần này</button></div>' +
      (m.escalated.length ? '<button class="btn primary" data-act="mtEsc">' + I('warn', 14) + ' ' + m.escalated.length + ' vấn đề Quản lý chuyển lên cần bạn xử lý</button>' : '') + '</div>';
    h += '<div class="card small"><b>Cài đặt</b><div class="chips">' + G.cal.WD.map(function (d, i) { return '<button class="chip' + (m.weekday === i ? ' on' : '') + '" data-act="mtDay" data-v="' + i + '">' + d + '</button>'; }).join('') + '</div><div class="chips">' + [15, 30, 60].map(function (v) { return '<button class="chip' + (m.len === v ? ' on' : '') + '" data-act="mtLen" data-v="' + v + '">' + (v === 60 ? '1 giờ' : v + ' phút') + '</button>'; }).join('') + '</div>' +
      '<div class="muted">Họp trước giờ mở cửa không ảnh hưởng khách (có tiền tăng ca); họp trong ngày thì cửa hàng giảm người phục vụ.</div>' +
      '<label class="nw"><input type="checkbox" data-chg="mtDelegateOn"' + (m.delegate ? ' checked' : '') + (G.staff.hasManager() ? '' : ' disabled') + '> Quản lý chủ trì (tự xử lý việc thường)' + (G.staff.hasManager() ? '' : ' <span class="muted">- cần Quản lý</span>') + '</label>' +
      '<div class="mb"><span>Bức xúc</span>' + UI.bar(m.grievance / 100, m.grievance > 40 ? 'bad' : '') + '<b>' + Math.round(m.grievance) + '</b></div>' + (s.day <= m.buff.until ? '<div class="pos">' + I('check', 12) + ' Tinh thần nhóm tốt: hiệu suất +' + Math.round((m.buff.mult - 1) * 100) + '% đến ngày ' + m.buff.until + '</div>' : '') + '</div>';
    var pv = M().preview(); h += '<h4>Sắp bàn (đang nóng)</h4>' + (pv.length ? pv.map(function (it) { return '<div class="card small"><div class="irow">' + it.who.map(function (id) { return av(id, 28, 34); }).join('') + '<div style="flex:1;min-width:0"><b>' + E(M().TOPICS[it.topic].name) + '</b> <span class="chipx ' + (KIND[it.kind] || ['', ''])[1] + '">' + (KIND[it.kind] || [''])[0] + '</span><div class="muted">' + it.chips.map(E).join(' · ') + '</div></div></div></div>'; }).join('') : '<p class="muted small">Chưa có vấn đề nào nổi cộm.</p>');
    var fl = m.followups.filter(function (f) { return !f.done; }); if (fl.length) h += '<h4>Việc đã hứa (' + fl.length + ')</h4>' + fl.map(function (f) { return '<div class="card small"><div class="irow">' + av(f.who, 28, 34) + '<div style="flex:1;min-width:0"><b>' + E(M().staffName(f.who).split(' ').pop()) + '</b>: ' + E(f.text) + '<div class="muted">hứa ngày ' + f.day + ' · hạn họp sau (ngày ' + f.due + ')</div></div><button class="mini primary" data-act="mtFollow" data-id="' + f.id + '">Đã xử lý</button></div></div>'; }).join('');
    // quan hệ
    var st = s.staff.slice(0, 10), cf = m.conflicts.filter(function (c) { return !c.done; });
    h += '<h4>Quan hệ trong nhóm</h4>';
    if (st.length < 2) h += '<p class="muted small">Cần ít nhất 2 nhân viên.</p>';
    else h += '<div class="schedwrap"><table class="relm"><tr><th></th>' + st.map(function (x) { return '<th>' + av(x.id, 22, 28) + '</th>'; }).join('') + '</tr>' + st.map(function (a) { return '<tr><th>' + av(a.id, 22, 28) + '</th>' + st.map(function (b) { if (a.id === b.id) return '<td class="rs"></td>'; var v = M().rel(a.id, b.id); return '<td class="' + (v >= 25 ? 'rg' : v <= -25 ? 'rb' : 'rn') + '" title="' + E(a.name + ' - ' + b.name + ': ' + M().relLabel(v)) + '"></td>'; }).join('') + '</tr>'; }).join('') + '</table></div><div class="small muted"><span class="rlg rg"></span> tốt <span class="rlg rn"></span> bình thường <span class="rlg rb"></span> căng thẳng</div>';
    if (cf.length) h += '<div class="card small"><b>' + I('warn', 14) + ' Mâu thuẫn đang mở (' + cf.length + ')</b>' + cf.map(function (c) { return '<div>' + E(M().staffName(c.a).split(' ').pop()) + ' ↔ ' + E(M().staffName(c.b).split(' ').pop()) + ': ' + E(c.cause) + ' · ' + (s.day - c.day) + ' ngày</div>'; }).join('') + '</div>';
    h += '<h4>Lịch sử họp (' + m.history.length + ')</h4>' + (m.history.length ? m.history.map(function (r) { return '<button class="card small mthist" data-act="mtMinutes" data-id="' + r.id + '"><b>Ngày ' + r.day + '</b> ' + (r.skipped ? '<span class="chipx neg">bỏ họp</span>' : '<span class="chipx pos">' + r.q + '%</span> ' + r.items.length + ' vấn đề · ' + F.short(r.cost)) + '</button>'; }).join('') : '<p class="muted small">Chưa có buổi họp nào.</p>');
    return h;
  };
  P.chg.mtDelegateOn = function () { A.mtDelegateOn(); };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-mtopen]')) UI.openMeeting(); });
})();
