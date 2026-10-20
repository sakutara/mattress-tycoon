/* Tab con "Phúc lợi" trong Nhân viên: team building & thưởng lễ Tết */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, res = UI.res, Wf = G.welfare;
  function I() { return G.icon.apply(null, arguments); }
  UI.st.welf = { day: 0 };
  function dayOpts() {
    var s = G.state, w = UI.st.welf, out = [];
    for (var d = s.day + 1; d <= s.day + 7; d++) out.push([d, G.cal.WDFULL[G.cal.weekday(d)] + ' (ngày ' + d + ')']);
    if (!w.day || w.day <= s.day || w.day > s.day + 7) w.day = s.day + 1;
    return out;
  }
  UI.welfareView = function () {
    var s = G.state, w = s.welfare, h = '';
    if (!s.staff.length) return '<div class="card empty">' + I('people', 40) + '<p>Cần có nhân viên để tổ chức phúc lợi.</p></div>';
    var avg = s.staff.reduce(function (a, x) { return a + x.sat; }, 0) / s.staff.length;
    h += '<div class="card"><b>' + I('heart', 16) + ' Tinh thần đội ngũ</b><div class="mb"><span>Hài lòng TB</span>' + UI.bar(avg / 100, avg < 40 ? 'bad' : avg > 65 ? 'good' : '') + '<b>' + Math.round(avg) + '</b></div></div>';
    // ---- team building ----
    h += '<div class="card"><b>' + I('people', 16) + ' Team building</b>';
    if (w.event) {
      var a = Wf.ACT[w.event.id];
      h += '<p>Đã đặt <b>' + E(a.name) + '</b> vào ngày ' + w.event.day + ' (' + G.cal.WDFULL[G.cal.weekday(w.event.day)] + '). Chi ' + F.vnd(Wf.cost(w.event.id)) + (a.until ? ', cửa hàng đóng cửa tới ' + G.cal.hm(a.until) : '') + '. <button class="mini" data-act="wfCancel">Hủy</button></p>';
    } else {
      h += '<div class="row"><select data-chg="wfDay">' + UI.opts(dayOpts(), UI.st.welf.day) + '</select></div>';
    }
    Object.keys(Wf.ACT).forEach(function (id) {
      var a = Wf.ACT[id], cd = Wf.cooldown(id), lock = s.level < a.min;
      h += '<div class="card small" style="margin:6px 0"><div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><div><b>' + I(a.icon, 14) + ' ' + E(a.name) + '</b><div class="muted">' + E(a.note) + '</div><div class="muted">Hài lòng +' + a.sat + ' · ' + F.vnd(Wf.cost(id)) + ' (' + F.short(a.per) + '/người, tính cả chủ)</div></div>' +
        (lock ? '<span class="muted small">🔒 ' + E(G.data.levels[a.min].name) + '</span>' : cd ? '<span class="muted small nw">Chờ ' + cd + ' ngày</span>' : w.event ? '' : '<button class="mini primary" style="white-space:nowrap;flex-shrink:0" data-act="wfSet" data-id="' + id + '">Đặt lịch</button>') + '</div></div>';
    });
    h += '</div>';
    // ---- thưởng lễ ----
    h += '<div class="card"><b>' + I('gift', 16) + ' Thưởng lễ Tết</b><p class="muted small">Đúng ngày lễ game sẽ hỏi bạn có thưởng không. Thưởng Tết nên có: bỏ qua sẽ làm cả đội buồn.</p><table class="tbl small"><tr><th>Dịp</th><th>Còn</th><th class="r">Chi dự kiến</th></tr>' +
      Wf.nextHol().map(function (x) { var t = x.h.tiers; return '<tr><td>' + E(x.h.name) + '</td><td>' + (x.day - s.day) + ' ngày</td><td class="r">' + F.short(Wf.bonusCost(t[t.length > 1 ? 1 : 0][1])) + (x.h.big ? ' - ' + F.short(Wf.bonusCost(1)) : '') + '</td></tr>'; }).join('') + '</table></div>';
    if (w.log.length) h += '<div class="card small"><b>Gần đây</b>' + w.log.slice(0, 6).map(function (l) { return '<div>Ngày ' + l.day + ': ' + E(l.name) + ' · ' + F.vnd(l.cost) + '</div>'; }).join('') + '</div>';
    return h;
  };
  P.act.wfSet = function (el) { res(Wf.schedule(el.dataset.id, +UI.st.welf.day)); };
  P.act.wfCancel = function () { Wf.cancel(); };
  P.chg.wfDay = function (el) { UI.st.welf.day = +el.value; };
})();
