/* Giá bán, giá sàn chống phá giá của hãng, vi phạm & chế tài */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ prices: {}, violations: {}, brandCut: {}, brandRevoked: {}, breachToday: {} });
  var P = G.pricing = {
    MAXMUL: 1.6,
    base: function (sku) { var p = G.state.prices[sku]; return p ? p : G.skus[sku].list; },
    effective: function (sku) { var c = G.state.clearance[sku] || 0, d = Math.max(G.campaigns ? G.campaigns.discount(sku) : 0, G.live ? G.live.discount(sku) : 0); return Math.round(P.base(sku) * (1 - c) * (1 - d) / 1000) * 1000; },
    floor: function (sku) {
      var t = G.skus[sku], b = G.brandById[t.brand];
      if (!b.floor) return 0;
      var st = G.life.stage(sku), f = b.floor * [1, 1, 0.93, 0.7][st];
      return Math.round(t.list * f / 1000) * 1000;
    },
    isBelowFloor: function (sku, price) { var f = P.floor(sku); return f > 0 && price < f; },
    setPrice: function (sku, p) {
      p = Math.round(p / 1000) * 1000;
      var t = G.skus[sku], f = P.floor(sku), max = Math.round(t.list * P.MAXMUL / 1000) * 1000;
      if (!(p > 0)) return { ok: false, msg: 'Giá không hợp lệ' };
      if (f && p < f) { G.state.prices[sku] = f; return { ok: false, price: f, msg: 'Giá sàn của hãng ' + G.brandName(t.brand) + ' là ' + G.fmt.vnd(f) + ' - không được bán thấp hơn. Đã đặt về giá sàn.' }; }
      if (p > max) { G.state.prices[sku] = max; return { ok: false, price: max, msg: 'Giá tối đa ' + G.fmt.vnd(max) + ' (160% niêm yết)' }; }
      G.state.prices[sku] = p; return { ok: true, price: p };
    },
    // ghi nhận bán dưới sàn (qua xả hàng/combo/voucher quá sâu)
    flagBreach: function (brand, n) { G.state.breachToday[brand] = (G.state.breachToday[brand] || 0) + (n || 1); },
    checkBreaches: function () {
      var s = G.state;
      Object.keys(s.breachToday).forEach(function (b) {
        var n = s.breachToday[b]; if (!n || s.brandRevoked[b]) return;
        if (!G.chance(Math.min(0.75, 0.25 + 0.05 * n))) return;
        var v = s.violations[b] = (s.violations[b] || 0) + 1, name = G.brandName(b);
        if (v === 1) {
          G.notify.modal({ title: 'Cảnh cáo từ hãng ' + name, def: 0, html: '<p>Hãng phát hiện bạn bán <b>dưới giá sàn</b> quy định. Đây là <b>cảnh cáo lần 1</b>. Tiếp tục vi phạm sẽ bị cắt chiết khấu/thưởng và có thể bị rút quyền đại lý.</p>', choices: [{ label: 'Đã hiểu', cls: 'primary' }] });
        } else if (v === 2) {
          s.brandCut[b] = true; if (s.rel) s.rel[b] = Math.max(0, (s.rel[b] || 0) - 25);
          G.notify.modal({ title: name + ' cắt chiết khấu', def: 0, html: '<p>Tái phạm bán dưới giá sàn: hãng <b>cắt chiết khấu & thưởng riêng</b> và giảm mức thân thiết 25 điểm. Lần nữa sẽ bị rút quyền đại lý.</p>', choices: [{ label: 'Đã hiểu', cls: 'primary' }] });
        } else {
          s.brandRevoked[b] = true;
          G.notify.modal({ title: name + ' rút quyền đại lý!', sound: 'bad', def: 0, html: '<p>Vi phạm giá sàn nhiều lần: <b>' + G.esc(name) + ' đã rút quyền đại lý</b>. Bạn không thể nhập hàng của hãng này nữa (hàng còn trong kho vẫn bán được).</p>', choices: [{ label: 'Chấp nhận', cls: 'danger' }] });
        }
        G.emit('brandViolation', { brand: b, level: v });
      });
      s.breachToday = {};
    }
  };
  G.on('dayEnd', P.checkBreaches);
  // hãng hạ sàn khi mẫu lỗi thời: nếu giá đang đặt < sàn mới thì không cần làm gì; nếu giá > max thì kẹp
})();
