/* Khách hàng: sinh theo giờ (rate = base x ★/3), đi xem kệ, chờ NV, mua hoặc bỏ về */
(function () {
  'use strict';
  var G = window.G;
  var HOUR_MULT = { 8: 0.6, 9: 0.8, 10: 1.1, 11: 1.2, 12: 0.7, 13: 0.6, 14: 0.8, 15: 0.9, 16: 1.0, 17: 1.2, 18: 1.5, 19: 1.5, 20: 1.0 };
  var BASE_W = { chan: 20, ga: 22, goi: 25, dem: 14, topper: 6, phukien: 7 };
  var TIER_P = [0.38, 0.30, 0.17, 0.10, 0.05];
  var SHIRT = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#26c6da', '#ff7043', '#8d6e63', '#78909c', '#ec407a'];
  var SKIN = ['#ffcc99', '#f1b98a', '#e0a070', '#c68642'];
  var HAIR = ['#222a44', '#3e2723', '#6d4c41', '#111', '#c2185b', '#ff8a65', '#7e57c2', '#8d6e63', '#ffca28'];
  var uid = 1;
  var C = G.customers = {
    list: [],
    rate: function () {
      var s = G.state, h = Math.floor(s.minute / 60);
      var r = G.lvl().traffic * (HOUR_MULT[h] || 0.6) * (G.cal.weekday(s.day) >= 5 ? 1.3 : 1);
      r *= G.reviews.avg() / 3;
      r *= G.season.traffic(s.day);
      r *= C.marketingMult();
      G.trafficMods.forEach(function (f) { r *= f() || 1; });
      return r;
    },
    // phân rã khách/giờ để hiện trong tooltip HUD / tab Trang trí
    breakdown: function () {
      var s = G.state, h = Math.floor(s.minute / 60), rows = [], r = G.lvl().traffic;
      rows.push(['Khách cơ bản (' + G.lvl().name + ')', r.toFixed(1)]);
      var hm = (HOUR_MULT[h] || 0.6) * (G.cal.weekday(s.day) >= 5 ? 1.3 : 1); rows.push(['Giờ / cuối tuần', '×' + hm.toFixed(2)]); r *= hm;
      var rf = G.reviews.avg() / 3; rows.push(['Sao ' + G.reviews.avg().toFixed(2) + '/3', '×' + rf.toFixed(2)]); r *= rf;
      var se = G.season.traffic(s.day); if (se !== 1) rows.push(['Mùa vụ / lễ', '×' + se.toFixed(2)]); r *= se;
      var mk = C.marketingMult(); if (mk !== 1) rows.push(['Marketing', '×' + mk.toFixed(2)]); r *= mk;
      G.trafficMods.forEach(function (f) { var v = f() || 1; if (Math.abs(v - 1) > 0.001) rows.push([f.label || 'Khác', '×' + v.toFixed(2)]); r *= v; });
      return { rows: rows, total: r };
    },
    marketingMult: function () {
      var m = 1; G.staff.ents.forEach(function (e) { if (e.role === 'marketing' && e.state !== 'leaving') { var st = G.staff.byId(e.id); if (st) m += 0.04 + 0.03 * st.stars; } });
      return Math.min(1.4, m);
    },
    baseRate: function () { return G.lvl().traffic; },
    spawn: function () {
      var s = G.state, L = G.layout.get();
      var types = Object.keys(BASE_W);
      var want = G.weighted(types, function (t) { return BASE_W[t] * G.season.demand(t, s.day) * (G.weather ? G.weather.demand(t) : 1) * (s.slots.some(function (x) { return x.sku && x.qty > 0 && G.skus[x.sku].type === t; }) ? 1 : 0.15); });
      if (!s.slots.some(function (x) { return x.sku && x.qty > 0 && G.skus[x.sku].type === want; }) && G.chance(0.5)) {
        var alt = s.slots.filter(function (x) { return x.sku && x.qty > 0; });
        if (alt.length) want = G.skus[G.pick(alt).sku].type; // mua theo cảm hứng món đang trưng bày
      }
      var r = Math.random(), aff = 1, acc = 0;
      for (var i = 0; i < TIER_P.length; i++) { acc += TIER_P[i]; if (r <= acc) { aff = i + 1; break; } }
      var sz = G.weighted(['1m2', '1m6', '1m8', '2m2'], function (z) { return { '1m2': 15, '1m6': 40, '1m8': 30, '2m2': 15 }[z]; });
      var c = { id: uid++, x: L.door.x + 0.5, y: L.door.y + 0.5, path: [], speed: G.rand(3.2, 4.2), state: 'walk', face: 1, phase: Math.random() * 6,
        want: want, aff: aff, sizePref: sz, tol: G.clamp(1 + G.gauss() * 0.14, 0.7, 1.35), patience: G.rand(36, 62) * (G.decor ? G.decor.patienceMult() : 1) * (G.weather ? G.weather.patience() : 1), waited: 0, timer: 0,
        name: G.pick(G.data.lastNames) + ' ' + G.pick(G.data.firstNames), shirt: G.pick(SHIRT), skin: G.pick(SKIN), hair: G.pick(HAIR), hairStyle: G.randInt(0, 4), items: [], seller: null, bag: false };
      G.econ.addStat('visitors', 1);
      if (G.events && G.events.maybeBlack) G.events.maybeBlack(c);
      c.colorPref = G.weighted(Object.keys(G.data.cwFamilies), function (f) { return { trang: 22, be: 16, xam: 14, xanh: 18, hong: 18, hoa: 12 }[f]; });
      // chọn mẫu trưng bày (hợp tầm giá + màu); đôi khi khách hỏi mẫu KHÔNG trưng bày (xem catalog / lookbook)
      var cands = s.slots.filter(function (x) { return x.sku && G.skus[x.sku].type === want; });
      var slot = G.weighted(cands, function (x) {
        var t = G.skus[x.sku], b = G.brandById[t.brand], tier = b.tier || (b.own ? 2.5 : 0.7);
        var w = Math.exp(-Math.abs(tier - aff) * 1.1) * G.life.DEMAND[G.life.stage(x.sku)] * (t.size === sz || t.size === 'Tiêu chuẩn' ? 1 : 0.25);
        if (t.cw) w *= t.cw.fam === c.colorPref ? 2 : 0.8;
        if (G.wh.stockQty(x.sku) <= 0) w *= 0.5;
        return w;
      });
      var ord = G.shelf.ordinals();
      if (G.chance(slot ? 0.2 : 0.35)) { // hỏi mẫu ngoài trưng bày
        var pool = G.skuList.filter(function (k) { return k.type === want && G.wh.stockQty(k.id) > 0 && G.life.stage(k.id) < 3 && (k.size === sz || k.size === 'Tiêu chuẩn') && !G.shelf.isShown(k.id) && (!k.cw || k.cw.fam === c.colorPref || G.chance(0.3)); });
        var cs = G.weighted(pool, function (k) { var b2 = G.brandById[k.brand], tr = b2.tier || (b2.own ? 2.5 : 0.7); return Math.exp(-Math.abs(tr - aff) * 1.1) * G.life.DEMAND[G.life.stage(k.id)]; });
        if (cs) { c.catalog = true; c.sku = cs.id; c.slotId = slot ? slot.id : null; c.priceR = null; c.lookStock = false; var pc = slot ? G.layout.slotPos(slot, ord) : null; if (pc) { c.tx = pc.ax; c.ty = pc.ay; } else { var w0 = G.pick(L.spots.wander); c.tx = w0.x; c.ty = w0.y; } slot = null; }
      }
      if (c.catalog) { /* đã chọn */ }
      else if (slot) { c.slotId = slot.id; c.sku = C.sizeVariant(slot.sku, sz); c.priceR = null; var p = G.layout.slotPos(slot, ord); c.tx = p.ax; c.ty = p.ay; c.lookStock = false; }
      else {
        c.lookStock = true; var any = s.slots.filter(function (x) { return x.sku; });
        var sl = any.length ? G.pick(any) : null, pp = sl ? G.layout.slotPos(sl, ord) : null;
        if (pp) { c.tx = pp.ax; c.ty = pp.ay; } else { var w = G.pick(L.spots.wander); c.tx = w.x; c.ty = w.y; }
      }
      G.path.goto(c, L.door.x, L.door.y - 1);
      c.path = c.path.concat(G.path.find(L.door.x, L.door.y - 1, c.tx, c.ty));
      c.state = 'walk';
      C.list.push(c);
    },
    // khách xem mẫu 1 cỡ nhưng mua đúng cỡ mình cần (cùng dòng)
    sizeVariant: function (sku, sz) { var t = G.skus[sku]; var v = G.lines[t.line].skus.filter(function (k) { return k.size === sz; })[0]; return v ? v.id : sku; },
    substitute: function (c) {
      var t = G.skus[c.sku], b = G.brandById[t.brand];
      var pool = G.skuList.filter(function (k) { return k.type === t.type && k.id !== c.sku && k.size === t.size && G.wh.stockQty(k.id) > 0 && G.life.stage(k.id) < 3 && Math.abs((G.brandById[k.brand].tier || 2) - (b.tier || 2)) <= 1 && k.list <= t.list * 1.25; });
      return G.weighted(pool, function (k) { return k.cw && c.colorPref && k.cw.fam === c.colorPref ? 3 : 1; });
    },
    asksAdvice: function (c) {
      var type = G.skus[c.sku].type, p = { dem: 0.75, topper: 0.6 }[type] || 0.35;
      var q = C.list.filter(function (x) { return x.state === 'wait' && x.asked; }).length;
      if (q >= 3) p *= 0.5;
      if (!G.staff.ents.some(function (e) { return (e.role === 'sales' || e.role === 'owner') && e.state !== 'leaving'; })) p = 0;
      return G.chance(p);
    },
    // khách tự chọn hàng và ra quầy thanh toán, không cần tư vấn (tỉ lệ chốt thấp hơn, giỏ nhỏ hơn)
    selfService: function (c) {
      var L = G.layout.get();
      if (c.seller) { c.seller.state = 'idle'; c.seller.cust = null; c.seller = null; }
      c.self = true; c.asked = false; G.econ.addStat('self', 1);
      var res = G.sales.resolve(c, null, true);
      if (res.sold) { c.items = res.items; c.bag = true; c.soldBy = null; c.state = 'toCounter'; G.path.goto(c, L.pay.x, L.pay.y); }
      else C.leave(c, res.reason === 'stock' ? 'stock' : 'other', false);
    },
    leave: function (c, reason, angry) {
      var L = G.layout.get();
      if (c.seller) { c.seller.state = 'idle'; c.seller.cust = null; c.seller = null; }
      if (reason === 'wait') G.econ.addStat('lostWait', 1);
      else if (reason === 'price') G.econ.addStat('lostPrice', 1);
      else if (reason === 'stock') G.econ.addStat('lostStock', 1);
      else if (reason === 'other') G.econ.addStat('lostOther', 1);
      if (angry) G.sales.leaveAngry(c, reason);
      c.state = 'leave'; c.mood = angry ? 'angry' : (c.bag ? 'happy' : null);
      G.path.goto(c, L.door.x, L.door.y);
      G.emit('customerLeft', { customer: c, reason: reason });
    },
    update: function (gm, sec) {
      var s = G.state, L = G.layout.get(), i;
      // sinh khách
      if (G.clock.isOpen() && s.minute < 1230 && !G.staff.closed()) {
        var exp = C.rate() / 60 * gm, n = Math.floor(exp);
        if (Math.random() < exp - n) n++;
        var maxC = 10 + 2 * s.level;
        for (i = 0; i < n && C.list.length < maxC; i++) C.spawn();
      }
      // điều phối NV bán hàng cho khách đang chờ
      var waiting = C.list.filter(function (c) { return c.state === 'wait' && !c.seller; }).sort(function (a, b) { return b.waited - a.waited; });
      waiting.forEach(function (c) {
        var free = G.staff.sellers(); if (!free.length) return;
        free.sort(function (a, b) { return (Math.abs(a.x - c.x) + Math.abs(a.y - c.y)) - (Math.abs(b.x - c.x) + Math.abs(b.y - c.y)); });
        var e = free[0]; e.state = 'toCustomer'; e.cust = c; c.seller = e;
        G.path.goto(e, c.x, c.y);
      });
      // cập nhật từng khách
      C.list.forEach(function (c) {
        G.path.move(c, sec);
        switch (c.state) {
          case 'walk':
            if (!c.path.length) {
              c.state = 'browse'; c.timer = G.rand(6, 14); c.x += G.rand(-0.25, 0.25);
            }
            break;
          case 'browse':
            c.timer -= gm;
            if (c.timer <= 0) {
              if (c.lookStock) { if (G.deposits && G.deposits.maybeRequest(c)) { C.leave(c, 'other', false); break; } C.leave(c, 'stock', G.chance(0.12)); break; }
              if (G.wh.stockQty(c.sku) <= 0) {
                G.wh.logLost(c.sku, 'het');
                var alt2 = C.substitute(c); // hết hàng: gợi ý mẫu thay thế còn hàng
                if (alt2 && G.chance(0.5)) { c.sku = alt2.id; c.sub = true; }
                else { if (G.deposits && G.deposits.maybeRequest(c)) { C.leave(c, 'other', false); break; } C.leave(c, 'stock', false); break; }
              }
              c.priceR = G.sales.priceRatio(c, c.sku);
              if (c.priceR > 1.45) { C.leave(c, 'price', false); break; }
              if (C.asksAdvice(c)) { c.asked = true; c.state = 'wait'; }
              else if (G.staff.sellers().length && G.chance(0.45)) { c.asked = false; c.proactive = true; c.state = 'wait'; c.waited = 0; } // NV rảnh chủ động ra tư vấn
              else C.selfService(c);
            }
            break;
          case 'wait':
            c.waited += gm;
            if (c.asked) {
              if (c.waited > c.patience) { if (G.chance(0.5)) C.selfService(c); else C.leave(c, 'wait', true); } // chờ lâu: tự mua hoặc bỏ về
            } else if (!c.seller && c.waited > 3) C.selfService(c); // không có NV rảnh ra đón: tự phục vụ
            break;
          case 'served':
            c.serveLeft -= gm;
            if (c.serveLeft <= 0) {
              var ent = c.seller, res = G.sales.resolve(c, ent);
              if (ent) { ent.state = 'idle'; ent.cust = null; ent.idleT = G.rand(1, 5); }
              c.seller = null;
              G.econ.addStat('served', 1);
              if (res.sold) {
                c.items = res.items; c.bag = true; c.soldBy = ent; c.state = 'toCounter';
                G.path.goto(c, L.pay.x, L.pay.y);
              } else C.leave(c, res.reason === 'stock' ? 'stock' : 'other', false);
            }
            break;
          case 'toCounter':
            if (!c.path.length) { c.state = 'paying'; c.timer = 1.5; }
            break;
          case 'paying':
            c.timer -= gm;
            if (c.timer <= 0) { G.sales.complete(c, c.soldBy); c.mood = 'happy'; C.leave(c, 'sold', false); c.state = 'leave'; }
            break;
          case 'leave':
            break;
        }
      });
      // NV tới nơi -> bắt đầu tư vấn
      G.staff.ents.forEach(function (e) {
        if (e.state === 'toCustomer' && !e.path.length) {
          var c = e.cust;
          if (!c || c.state !== 'wait') { e.state = 'idle'; e.cust = null; return; }
          c.state = 'served'; e.state = 'serving';
          c.serveLeft = G.rand(6, 11) / Math.max(0.5, G.sales.sellerEff(e));
          e.x = c.x + 0.4; e.y = c.y; e.face = -1;
        }
      });
      C.list = C.list.filter(function (c) {
        if (c.state === 'leave' && !c.path.length) return false;
        return true;
      });
    }
  };
  G.on('tick', function (t) { C.update(t.gm, t.sec); });
  G.on('dayEnd', function () {
    C.list.forEach(function (c) { if (c.seller) { c.seller.state = 'idle'; c.seller.cust = null; } });
    C.list = [];
  });
  G.on('init', function () { C.list = []; });
  G.on('levelUp', function () { C.list = []; });
})();
