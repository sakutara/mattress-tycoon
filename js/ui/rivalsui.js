/* Tab "Đối thủ" (nhóm Thêm) */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, res = UI.res, Rv = G.rivals;
  function I() { return G.icon.apply(null, arguments); }
  function card(r) {
    var s = G.state, T = Rv.TYPES[r.type], known = Rv.intel(), imp = Rv.impact(r), h = '<div class="card' + (Rv.promoting(r) ? ' warnbox' : '') + '"><div style="display:flex;gap:8px;justify-content:space-between;align-items:flex-start"><div><b>' + E(r.name) + '</b> <span class="muted small">· ' + E(T.label) + ' · mở ngày ' + r.opened + '</span></div></div>';
    h += '<div class="mb"><span>Sức mạnh</span>' + UI.bar(known ? r.str / 100 : G.clamp(Math.round(r.str / 26) / 4 + 0.12, 0, 1), r.str > 60 ? 'bad' : '') + '<b>' + (known ? Math.round(r.str) : E(Rv.strLabel(r))) + '</b></div>';
    var st = r.closedUntil >= s.day ? '<span class="pos">Tạm đóng cửa tới ngày ' + r.closedUntil + '</span>' : Rv.promoting(r) ? '<b class="neg">Đang khuyến mãi ' + Math.round(r.promo.off * 100) + '% tới ngày ' + r.promo.until + '</b>' : 'Hoạt động bình thường';
    h += '<div class="small">' + st + ' · kéo khách: <b>' + (imp * 100).toFixed(1).replace('.', ',') + '%</b></div>';
    if (known && r.next) h += '<div class="small muted">🔎 Dự kiến ngày ' + r.next.day + ': ' + { promo: 'khuyến mãi', expand: 'mở rộng', poach: 'săn nhân viên', stumble: 'gặp sự cố' }[r.next.kind] + '</div>';
    if (s.level >= 3) { var c = Rv.buyoutCost(r); h += '<div style="margin-top:6px"><button class="mini" style="white-space:nowrap" data-act="rvBuy" data-id="' + r.id + '"' + (s.money < c ? ' disabled' : '') + '>Thâu tóm · ' + F.short(c) + '</button></div>'; }
    return h + '</div>';
  }
  P.register({
    id: 'rivals', label: 'Đối thủ', after: 'quests',
    badge: function () { return G.state ? G.state.rivals.list.filter(Rv.promoting).length : 0; },
    render: function () {
      var s = G.state, w = s.rivals, h = '', tm = Rv.trafficMult();
      h += '<div class="card"><b>' + I('shop', 16) + ' Cạnh tranh trong khu</b><div class="small">Khách bị ảnh hưởng bởi đối thủ: <b class="' + (tm < 0.95 ? 'neg' : '') + '">' + ((tm - 1) * 100).toFixed(1).replace('.', ',').replace('-', '−') + '%</b>' + (w.absorbed ? ' (gồm +' + w.absorbed * 3 + '% nhờ thâu tóm)' : '') + '</div>' +
        '<div class="small muted">Danh tiếng cao làm đối thủ kéo được ít khách hơn. Nhân viên hài lòng thì không bị săn.</div></div>';
      if (!w.list.length) h += '<div class="card empty">' + I('shop', 40) + '<p>Chưa có đối thủ trong khu vực.' + (s.level < 1 ? ' Khi cửa hàng lớn hơn sẽ có người mở cửa gần bạn.' : '') + '</p></div>';
      else {
        h += w.list.map(card).join('');
        h += '<div class="card"><b>Hành động</b><div class="small muted" style="margin:4px 0">Khảo sát: thấy rõ sức mạnh và lịch hành động của đối thủ trong 14 ngày' + (Rv.intel() ? ' (còn tới ngày ' + w.intel + ')' : '') + '. Đáp trả: quảng bá, giảm ảnh hưởng của mọi đối thủ một nửa trong 7 ngày' + (Rv.shielded() ? ' (còn tới ngày ' + w.shield + ')' : '') + '.</div>' +
          '<button class="btn" data-act="rvSurvey"' + (Rv.intel() ? ' disabled' : '') + '>Khảo sát · ' + F.short(Rv.surveyCost()) + '</button> <button class="btn primary" data-act="rvCounter"' + (Rv.shielded() ? ' disabled' : '') + '>Đáp trả · ' + F.short(Rv.counterCost()) + '</button></div>';
      }
      if (w.log.length) h += '<div class="card small"><b>Diễn biến</b>' + w.log.slice(0, 6).map(function (l) { return '<div>Ngày ' + l.day + ': ' + E(l.text) + '</div>'; }).join('') + '</div>';
      return h;
    }
  });
  P.act.rvSurvey = function () { res(Rv.survey()); };
  P.act.rvCounter = function () { res(Rv.counter()); };
  P.act.rvBuy = function (el) { var r = Rv.buyout(+el.dataset.id); if (r.msg) res(r); };
})();
