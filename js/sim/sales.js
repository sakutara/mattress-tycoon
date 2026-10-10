/* Chốt đơn, tư vấn, upsell combo, ghi nhận doanh thu. (Đánh giá: xem reviews.js) */
(function () {
  'use strict';
  var G = window.G;
  var COMPLEMENT = { dem: ['ga', 'goi', 'topper', 'phukien'], ga: ['goi', 'chan'], chan: ['goi', 'ga'], goi: ['ga', 'phukien'], topper: ['ga', 'goi'], phukien: ['goi'] };
  var SL = G.sales = {
    ownFactor: function (sku) { var t = G.skus[sku]; return t.brand === 'own' ? 0.62 + 0.4 * G.state.ownRep / 100 : 1; },
    ref: function (c, sku) {
      var m = G.life.ACCEPT[G.life.stage(sku)] * c.tol * SL.ownFactor(sku);
      G.acceptMods.forEach(function (f) { m *= f(c, sku) || 1; });
      return G.skus[sku].list * m;
    },
    priceRatio: function (c, sku) { return G.pricing.effective(sku) / SL.ref(c, sku); },
    sellerEff: function (ent) {
      if (!ent) return 0.8;
      if (ent.id === 'owner') return G.staff.eff({ id: 'owner' });
      var st = G.staff.byId(ent.id); return st ? G.staff.eff(st) : 0.8;
    },
    conv: function (c, ent, sku, self) {
      var eff = SL.sellerEff(ent), r = SL.priceRatio(c, sku), t = G.skus[sku];
      var priceF = r <= 0.9 ? 1.1 : G.clamp(1.1 - (r - 0.9) * 1.6, 0.05, 1.1);
      var p = 0.72 * (0.75 + 0.25 * eff) * priceF * (0.9 + 0.1 * G.life.DEMAND[G.life.stage(sku)]) * (0.9 + G.state.rep / 500);
      var st = ent && ent.id !== 'owner' ? G.staff.byId(ent.id) : null;
      if (st && st.brandSkill[t.brand]) p *= 1.1;
      G.conversionMods.forEach(function (f) { p *= f(c, eff, { sku: sku }) || 1; });
      if (t.type === 'ga' && t.cw && c.colorPref) p *= t.cw.fam === c.colorPref ? 1.25 : 0.8; // hợp màu khách thích
      if (c.catalog) p *= (G.lookbook && G.lookbook.boostActive() ? 1.12 : 0.88); // hỏi mẫu không trưng bày; xem lookbook thì dễ chốt hơn
      if (self) p *= 0.7; // tự phục vụ: tỉ lệ chốt thấp hơn có tư vấn
      return G.clamp(p, 0.03, 0.95);
    },
    // trả về {sold, items:[{sku,qty,price,from}], reason}. BÁN TỪ KHO (kho cửa hàng trước, rồi kho ngoài); mẫu trưng bày không bị bán
    resolve: function (c, ent, self) {
      var s = G.state, W = G.wh;
      if (W.stockQty(c.sku) <= 0) { W.logLost(c.sku, 'het'); return { sold: false, reason: 'stock' }; }
      if (Math.random() > SL.conv(c, ent, c.sku, self)) return { sold: false, reason: 'no' };
      var tk = W.take(c.sku, 1), loc = Object.keys(tk.locs)[0];
      var items = [{ sku: c.sku, qty: 1, price: G.pricing.effective(c.sku), from: loc }];
      // upsell / combo: món trưng bày bổ trợ còn hàng trong kho (kể cả bộ chăn ga phủ trên giường mẫu)
      var eff = SL.sellerEff(ent), pu = self ? 0.05 : 0.16 + 0.08 * eff;
      if (G.chance(pu)) {
        var comp = COMPLEMENT[G.skus[c.sku].type] || [], seen = {}, cands = [];
        s.slots.forEach(function (x) { [x.sku, x.set].forEach(function (k) { if (k && !seen[k] && k !== c.sku && comp.indexOf(G.skus[k].type) >= 0 && W.stockQty(k) > 0 && SL.priceRatio(c, k) <= 1.15) { seen[k] = 1; cands.push(k); } }); });
        if (cands.length) { var u = G.pick(cands), tu = W.take(u, 1); if (tu.n) items.push({ sku: u, qty: 1, price: G.pricing.effective(u), upsell: true, from: Object.keys(tu.locs)[0] }); }
      }
      return { sold: true, items: items };
    },
    complete: function (c, ent) {
      var s = G.state, rev = 0, cogs = 0, hiddenHit = false, belowFloor = false, units = 0, fromExt = false, extFee = 0;
      c.items.forEach(function (it) {
        var sku = it.sku, t = G.skus[sku], tot = G.wh.total(sku) + 1, price = it.price;
        if ((s.showUnits[sku] || 0) > 0 && G.chance(Math.min(1, s.showUnits[sku] / tot))) { s.showUnits[sku]--; price = Math.round(price * 0.85); it.display = true; }
        if (it.from && it.from !== 'st') { fromExt = true; extFee += G.wh.transportCost(it.from, 'st', t.vol * it.qty); }
        if ((s.bGrade[sku] || 0) > 0 && G.chance(s.bGrade[sku] / tot)) { s.bGrade[sku]--; price = Math.round(price * 0.7); it.defect = 'bgrade'; }
        if ((s.hidden[sku] || 0) > 0 && G.chance(s.hidden[sku] / tot)) { s.hidden[sku]--; price = Math.round(price * 0.5); hiddenHit = true; it.defect = 'hidden'; }
        if (G.pricing.isBelowFloor(sku, it.price)) { G.pricing.flagBreach(t.brand, it.qty); belowFloor = true; }
        rev += price * it.qty; cogs += (s.costBasis[sku] || t.cost) * it.qty; units += it.qty;
        var a = s.sold7[sku] || (s.sold7[sku] = [0, 0, 0, 0, 0, 0, 0]); a[0] += it.qty; s.lastSold[sku] = s.day;
        s.today.byBrand[t.brand] = (s.today.byBrand[t.brand] || 0) + price * it.qty;
        if (t.brand === 'own') s.ownRep = Math.min(100, s.ownRep + 0.2 * (s.avgRating >= 3.5 ? 1 : 0.2));
      });
      G.econ.cogs(cogs); if (extFee) G.econ.expense(extFee, 'transport');
      // giao hàng tận nhà? (tiền COD chỉ vào khi giao xong - xem shipping.js)
      var ship = G.shipping ? G.shipping.createFromSale(c, rev, cogs, fromExt) : null;
      if (!ship) G.econ.income(rev, 'sales');
      G.econ.addStat('sales', 1); G.econ.addStat('units', units);
      var wait = c.waited || 0;
      var rating = 4.2 + (G.skus[c.sku].q - 3) * 0.15 + G.gauss() * 0.6 - Math.max(0, wait - 8) / 14 + (c.priceR < 0.95 ? 0.35 : (c.priceR > 1.1 ? -0.4 : 0));
      if (G.decor) rating += G.decor.ratingBonus();
      if (G.returns) rating += G.returns.ratingBonus();
      if (hiddenHit) rating = Math.min(rating, 1.8);
      rating = G.clamp(Math.round(rating), 1, 5);
      var stf = ent && ent.id !== 'owner' ? G.staff.byId(ent.id) : null;
      G.reviews.add(rating, { wait: wait, hiddenDefect: hiddenHit, priceR: c.priceR, sku: c.sku, seller: stf ? stf.name.split(' ').pop() : null });
      s.rep = G.clamp(s.rep + 0.05 + (rating - 3) * 0.05, 0, 100);
      if (ent && ent.id !== 'owner') { var st = G.staff.byId(ent.id); if (st) G.staff.addXp(st, 1); }
      G.emit('sale', { customer: c, items: c.items, revenue: rev, cogs: cogs, rating: rating, seller: ent ? ent.id : null, belowFloor: belowFloor, shipping: ship });
      return rev;
    },
    leaveAngry: function (c, why) {
      var r = G.randInt(1, 2);
      if (G.chance(why === 'wait' ? 0.6 : 0.4)) G.reviews.add(r, { angry: why });
      G.state.rep = G.clamp(G.state.rep - 0.08, 0, 100);
    }
  };
})();
