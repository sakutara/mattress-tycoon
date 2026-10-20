/* Tab "Nhiệm vụ & Thành tựu" (nhóm Thêm) */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, Qs = G.quests;
  UI.st.quest = { sub: 'daily' };
  function bar(cur, goal, cls) { return '<div class="bar ' + (cls || '') + '"><i style="width:' + Math.round(G.clamp(cur / goal, 0, 1) * 100) + '%"></i></div>'; }
  function daily() {
    var q = G.state.quests, h = '', n = q.list.length;
    h += '<div class="card"><b>🔥 Chuỗi ' + q.streak + ' ngày</b> <span class="muted small">(kỷ lục ' + q.best + ') · Xong cả ' + n + ' nhiệm vụ mỗi ngày để giữ chuỗi; chuỗi càng dài, rương càng lớn (tối đa ở 7 ngày).</span></div>';
    q.list.forEach(function (x, i) {
      var t = Qs.QT[x.id], f = t.fmt || F.num;
      h += '<div class="card' + (x.done ? '' : '') + '" style="' + (x.done ? 'border-left-color:var(--good)' : '') + '"><div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><div><b>' + (x.done ? '✅ ' : '🎯 ') + E(Qs.text(x)) + '</b><div class="muted small">Thưởng ' + F.vnd(x.cash) + '</div></div>' +
        (x.claimed ? '<span class="muted small">Đã nhận</span>' : x.done ? '<button class="mini primary" style="white-space:nowrap;flex-shrink:0" data-act="qClaim" data-i="' + i + '">Nhận</button>' : '') + '</div>' +
        (t.eod ? '<div class="muted small">' + (x.done ? 'Đã đạt' : 'Chấm khi hết ngày') + '</div>' : '<div style="display:flex;gap:8px;align-items:center">' + bar(x.prog, x.goal, x.done ? 'good' : '') + '<span class="small nw">' + E(Qs.progText(x)) + '</span></div>') + '</div>';
    });
    var cc = Qs.chestCash();
    h += '<div class="card" style="border-left-color:var(--acc2)"><div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><div><b>🎁 Rương hoàn thành</b><div class="muted small">' + F.vnd(cc) + ' + 1 danh tiếng · ' + (q.chest.done ? (q.chest.claimed ? 'đã nhận' : 'sẵn sàng!') : 'còn ' + Qs.pending() + ' nhiệm vụ') + '</div></div>' +
      (q.chest.done && !q.chest.claimed ? '<button class="mini primary" style="white-space:nowrap;flex-shrink:0" data-act="qChest">Nhận rương</button>' : '') + '</div></div>';
    if (Qs.claimable() > 0) h += '<p><button class="btn primary" data-act="qAll">Nhận tất cả</button></p>';
    h += '<p class="muted small">Nhiệm vụ mới được tạo mỗi ngày; nhiệm vụ chưa nhận thưởng sẽ mất khi sang ngày. Mục tiêu và thưởng tự tăng theo cấp và doanh thu cửa hàng.</p>';
    return h;
  }
  function ach() {
    var q = G.state.quests, got = Qs.ACH.filter(function (a) { return q.ach[a.id]; }).length, h = '<div class="card"><b>🏅 ' + got + ' / ' + Qs.ACH.length + ' thành tựu</b></div>';
    var sorted = Qs.ACH.slice().sort(function (a, b) {
      function rank(x) { var r = q.ach[x.id]; return r && !r.claimed ? 0 : r ? 2 : 1; }
      return rank(a) - rank(b);
    });
    sorted.forEach(function (a) {
      var r = q.ach[a.id], cur = Math.min(a.cur(), a.goal), f = a.fmt || F.num;
      h += '<div class="card" style="' + (r ? 'border-left-color:var(--good)' : '') + '"><div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><div><b>' + a.ico + ' ' + E(a.name) + '</b><div class="muted small">' + E(a.desc) + ' · thưởng ' + F.vnd(Qs.achCash(a)) + (a.rep ? ' + ' + a.rep + ' danh tiếng' : '') + '</div></div>' +
        (r ? (r.claimed ? '<span class="muted small">Đã nhận</span>' : '<button class="mini primary" style="white-space:nowrap;flex-shrink:0" data-act="qAch" data-id="' + a.id + '">Nhận</button>') : '') + '</div>' +
        (r ? '<div class="muted small">Đạt ngày ' + r.day + '</div>' : '<div style="display:flex;gap:8px;align-items:center">' + bar(cur, a.goal) + '<span class="small nw">' + E(f(cur)) + ' / ' + E(f(a.goal)) + '</span></div>') + '</div>';
    });
    h += '<p class="muted small">Số liệu đếm dần (số đơn, đánh giá…) bắt đầu tính từ khi có tính năng này; các mốc như cấp, danh tiếng, doanh thu, số ngày tính theo tiến trình sẵn có.</p>';
    return h;
  }
  P.register({
    id: 'quests', label: 'Nhiệm vụ', after: 'more',
    badge: function () { return G.state ? Qs.claimable() : 0; },
    render: function () {
      var s = UI.st.quest;
      var h = '<div class="chips"><button class="chip ' + (s.sub === 'daily' ? 'on' : '') + '" data-act="qSub" data-s="daily">🎯 Hằng ngày</button> <button class="chip ' + (s.sub === 'ach' ? 'on' : '') + '" data-act="qSub" data-s="ach">🏅 Thành tựu</button></div>';
      return h + (s.sub === 'ach' ? ach() : daily());
    }
  });
  P.act.qSub = function (el) { UI.st.quest.sub = el.dataset.s; };
  P.act.qClaim = function (el) { Qs.claim(+el.dataset.i); };
  P.act.qChest = function () { Qs.claimChest(); };
  P.act.qAll = function () { Qs.claimAll(); Qs.ACH.forEach(function (a) { Qs.claimAch(a.id); }); };
  P.act.qAch = function (el) { Qs.claimAch(el.dataset.id); };
})();
