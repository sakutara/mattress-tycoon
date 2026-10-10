/* Phòng livestream: xây phòng, lên lịch phiên live, người dẫn (NV / KOL), sản phẩm, giảm giá, quảng cáo; mô phỏng người xem + đơn online qua hệ thống giao hàng */
(function () {
  'use strict';
  var G = window.G;
  G.data.platforms = {
    tiktak: { name: 'TikTak Live', reach: 1.25, conv: 0.8, fee: 0.12, cod: 0.75, desc: 'Nhiều người xem nhất, chốt đơn thấp hơn, phí sàn cao.' },
    shopee: { name: 'Shopee-ee Live', reach: 1.0, conv: 1.1, fee: 0.08, cod: 0.6, desc: 'Cân bằng, khách mua sắm chốt tốt.' },
    facebuc: { name: 'Facebúc Live', reach: 0.85, conv: 1.0, fee: 0.05, cod: 0.8, desc: 'Ít người xem hơn, phí rẻ, khách lớn tuổi.' }
  };
  G.data.liveSlots = { 9: 0.6, 10: 0.7, 11: 0.9, 12: 0.8, 13: 0.8, 14: 0.85, 15: 0.9, 16: 0.95, 17: 1.0, 18: 1.2, 19: 1.4, 20: 1.55 };
  var KOLN = ['Mai Mơ Review', 'Streamer Bảo Bối', 'Cô Giáo Chăn Ga', 'Anh Trai Say Hi', 'Review Queen Tú', 'Bà Tám Mua Sắm', 'Hot Girl Nệm Êm'];
  var CHAT = ['Chốt đơn!', 'Còn size 1m8 không shop?', 'Giá tốt quá ❤', 'Ship tỉnh được không?', 'Đệm này nằm êm không ạ?', 'Cho mình voucher với!', 'Đã đặt rồi nha', 'Chị host xinh quá', 'Bảo hành bao lâu vậy?', 'Combo mua được 2 bộ không?', 'Lên đơn cho em!', 'Hàng thật không shop?'];
  G.addDefaults({ live: { built: false, followers: { tiktak: 0, shopee: 0, facebuc: 0 }, rep: 30, sessions: [], nextId: 1, running: null, reports: [], kols: [], kolDay: 0, studioCost: 40e6 } });
  var L = G.live = {
    fx: { chats: [], hearts: [] },
    UPKEEP: 150000, MIN_LEVEL: 2,
    st: function () { return G.state.live; },
    byId: function (id) { return G.state.live.sessions.filter(function (x) { return x.id === id; })[0]; },
    running: function () { var r = G.state.live.running; return r ? L.byId(r) : null; },
    discount: function (sku) { var r = L.running(); return r && r.status === 'Đang live' && r.feat.indexOf(sku) >= 0 ? r.disc : 0; },
    build: function () {
      var s = G.state;
      if (s.live.built) return { ok: false, msg: 'Đã có phòng livestream' };
      if (s.level < L.MIN_LEVEL) return { ok: false, msg: 'Mở từ cấp Cửa hàng mặt phố' };
      if (s.money < s.live.studioCost) return { ok: false, msg: 'Không đủ tiền (' + G.fmt.vnd(s.live.studioCost) + ')' };
      G.econ.cash(-s.live.studioCost); s.live.built = true; L.refreshKols(true);
      return { ok: true, msg: 'Đã xây phòng livestream! Phí duy trì ' + G.fmt.vnd(L.UPKEEP) + '/ngày.' };
    },
    refreshKols: function (force) {
      var s = G.state; if (!force && s.day - s.live.kolDay < 7 && s.live.kols.length) return;
      s.live.kolDay = s.day; s.live.kols = [];
      for (var i = 0; i < 3; i++) { var f = Math.round(G.rand(20000, 600000) / 1000) * 1000; s.live.kols.push({ id: 'k' + s.day + '_' + i, name: G.pick(KOLN), followers: f, fee: Math.round((f * 35 + 2e6) / 100000) * 100000, charisma: Math.round((0.9 + f / 600000 * 0.8) * 100) / 100, look: { hairStyle: G.randInt(0, 4), hair: G.pick(['#c2185b', '#7e57c2', '#ff8a65', '#1f2a44']), skin: '#fbd9bd' } }); }
    },
    hostOf: function (sess) {
      if (sess.host.type === 'kol') return { name: sess.host.kol.name, charisma: sess.host.kol.charisma, followers: sess.host.kol.followers, kol: true, look: sess.host.kol.look };
      var st = G.staff.byId(sess.host.id); if (!st) return null;
      var c = 0.7 + 0.25 * st.stars + (st.skills.mkt ? 0.1 : 0) + (st.role === 'marketing' ? 0.15 : 0); c *= (1 - 0.3 * st.fatigue);
      return { name: st.name, charisma: c, followers: 0, kol: false, staff: st, stars: st.stars };
    },
    slotMult: function (h) { return G.data.liveSlots[h] || 0.7; },
    // ước lượng nhanh (UI)
    viewersTarget: function (cfg, host, minute) {
      var s = G.state, pf = G.data.platforms[cfg.platform], F = s.live.followers[cfg.platform] || 0;
      var v = (40 + F * 0.03 + (host.kol ? host.followers * 0.012 : 0) + (cfg.ad || 0) / 1e5 * 5) * pf.reach * host.charisma * L.slotMult(cfg.start + Math.floor((minute || 0) / 60));
      v *= (1 + (cfg.disc || 0) * 1.5) * (1 + G.decor.agg().tr) * (G.reviews.avg() / 3) * (0.75 + s.live.rep / 200);
      return v;
    },
    convRate: function (cfg, host) { // tỉ lệ đơn / người xem / giờ
      var pf = G.data.platforms[cfg.platform], s = G.state;
      return 0.03 * pf.conv * (1 + (cfg.disc || 0) * 2) * (0.8 + 0.2 * host.charisma) * (1 + (cfg.voucher || 0) / 1e6) * (0.9 + s.live.rep / 500);
    },
    estimate: function (cfg) {
      var host = cfg.hostObj; if (!host) return null;
      var v = L.viewersTarget(cfg, host, 60), c = L.convRate(cfg, host), orders = v * c * cfg.dur, avg = 0, n = 0;
      cfg.feat.forEach(function (k) { if (k) { avg += G.pricing.base(k) * (1 - (cfg.disc || 0)); n++; } });
      avg = n ? avg / n : 0; return { viewers: Math.round(v), orders: orders, rev: orders * avg };
    },
    validate: function (cfg) {
      var s = G.state;
      if (!s.live.built) return 'Chưa có phòng livestream';
      if (cfg.dayIn < 0 || cfg.dayIn > 7) return 'Ngày không hợp lệ';
      if (cfg.dayIn === 0 && !s.prep && cfg.start * 60 <= s.minute) return 'Khung giờ đã qua';
      if (cfg.start < 9 || cfg.start + cfg.dur > 21) return 'Phiên live phải nằm trong 9h-21h';
      if (s.live.sessions.some(function (x) { return x.day === s.day + cfg.dayIn && x.status === 'Đã đặt'; })) return 'Ngày này đã có phiên live khác';
      var feat = cfg.feat.filter(Boolean); if (!feat.length) return 'Chọn ít nhất 1 sản phẩm giới thiệu';
      for (var i = 0; i < feat.length; i++) if (L.sellable(feat[i]) < 1) return 'Cần có hàng mẫu/hàng bán: ' + G.skus[feat[i]].label;
      if (cfg.hostKind === 'staff') { var st = G.staff.byId(+cfg.hostId); if (!st || st.status !== 'ok') return 'Chọn nhân viên làm host (đang rảnh)'; if (cfg.crewId && +cfg.crewId === st.id) return 'Host và trợ lý phải khác nhau'; }
      else if (!s.live.kols.some(function (k) { return k.id === cfg.kolId; })) return 'Chọn KOL';
      return null;
    },
    sellable: function (sku) { return G.wh.stockQty(sku); },
    schedule: function (cfg) {
      var s = G.state, err = L.validate(cfg); if (err) return { ok: false, msg: err };
      var host = cfg.hostKind === 'kol' ? { type: 'kol', kol: G.clone(s.live.kols.filter(function (k) { return k.id === cfg.kolId; })[0]) } : { type: 'staff', id: +cfg.hostId };
      var cost = (cfg.ad || 0) + (host.type === 'kol' ? host.kol.fee : 0);
      if (s.money < cost) return { ok: false, msg: 'Không đủ tiền (quảng cáo + phí KOL ' + G.fmt.vnd(cost) + ')' };
      if (cost) G.econ.expense(cost, 'ads');
      var sess = { id: s.live.nextId++, platform: cfg.platform, day: s.day + cfg.dayIn, start: cfg.start, dur: cfg.dur, host: host, crew: cfg.crewId ? +cfg.crewId : null, feat: cfg.feat.filter(Boolean), combo: !!cfg.combo, disc: (cfg.disc || 0), voucher: { value: cfg.voucher || 0, min: cfg.vmin || 0 }, ad: cfg.ad || 0, kolFee: host.type === 'kol' ? host.kol.fee : 0, status: 'Đã đặt', st: null };
      s.live.sessions.push(sess);
      var fl = 0; sess.feat.forEach(function (k) { if (G.pricing.isBelowFloor(k, Math.round(G.pricing.base(k) * (1 - sess.disc) / 1000) * 1000)) fl++; });
      return { ok: true, msg: 'Đã đặt lịch live ' + G.data.platforms[sess.platform].name + ' ngày ' + sess.day + ' lúc ' + sess.start + 'h' + (fl ? '. ⚠ ' + fl + ' sản phẩm giảm dưới giá sàn hãng!' : ''), sess: sess };
    },
    cancel: function (id) { var sess = L.byId(id); if (!sess || sess.status !== 'Đã đặt') return; sess.status = 'Hủy'; G.econ.cash(Math.round((sess.ad + sess.kolFee) * 0.5)); },
    startSession: function (sess) {
      var s = G.state, host = L.hostOf(sess);
      if (!host) { sess.status = 'Hủy'; G.notify.push({ title: 'Live bị hủy', text: 'Không còn host.', type: 'warn' }); return; }
      if (host.staff && host.staff.status !== 'ok') { sess.status = 'Hủy'; G.econ.cash(Math.round((sess.ad + sess.kolFee) * 0.5)); G.notify.push({ title: 'Live bị hủy', text: host.name + ' đang vắng. Hoàn 50% chi phí.', type: 'bad' }); return; }
      if (host.staff) host.staff.status = 'live';
      var crew = sess.crew ? G.staff.byId(sess.crew) : null; if (crew && crew.status === 'ok') crew.status = 'live'; else sess.crew = null;
      sess.status = 'Đang live'; s.live.running = sess.id;
      sess.st = { min: 0, viewers: 0, peak: 0, orders: 0, rev: 0, cogs: 0, fee: 0, newF: 0, ev: 0, mishaps: 0, bad: 0, oos: {}, pin: 0, vc: 0, ans: 0, lag: 0, flash: 0, breach: 0, soldAny: false, chatAcc: 0 };
      var lack = sess.feat.filter(function (k) { return L.sellable(k) < 1; }).length;
      if (lack) { sess.st.mishaps++; sess.st.flash = -1; G.notify.push({ title: 'Live: thiếu hàng mẫu', text: lack + ' sản phẩm giới thiệu đã hết hàng!', type: 'bad', sound: 'bad' }); }
      G.notify.push({ title: '🔴 Bắt đầu live ' + G.data.platforms[sess.platform].name, text: 'Host ' + host.name + ' · ' + sess.dur + ' giờ', type: 'good', sound: 'good' });
      if (G.settings.autoLive && G.render) G.render.goPage('studio');
      G.emit('liveStart', sess);
    },
    endSession: function (sess, early) {
      var s = G.state, st = sess.st, host = L.hostOf(sess), pf = G.data.platforms[sess.platform];
      if (host && host.staff && host.staff.status === 'live') host.staff.status = 'ok';
      var crew = sess.crew ? G.staff.byId(sess.crew) : null; if (crew && crew.status === 'live') crew.status = 'ok';
      var hc = host ? host.charisma : 1;
      st.newF = Math.round(st.peak * 0.1 * hc * (0.5 + Math.min(1, st.orders / 8))) + (st.shout || 0);
      if (st.bad > 1) st.newF = Math.round(st.newF * 0.5);
      s.live.followers[sess.platform] += st.newF;
      s.live.rep = G.clamp(s.live.rep + (st.orders >= 5 ? 2 : 0.5) + (st.mishaps ? -1.5 * st.mishaps : 1) + (st.bad ? -2 : 0), 0, 100);
      var profit = st.rev - st.cogs - st.fee - sess.ad - sess.kolFee;
      var rep = { id: sess.id, day: sess.day, platform: pf.name, host: host ? host.name : '?', peak: st.peak, orders: st.orders, revenue: st.rev, ad: sess.ad, kol: sess.kolFee, fee: st.fee, cogs: st.cogs, profit: profit, newF: st.newF, mishaps: st.mishaps };
      s.live.reports.unshift(rep); if (s.live.reports.length > 8) s.live.reports.pop();
      sess.status = 'Xong'; s.live.running = null; sess.st.ended = true;
      G.notify.modal({
        title: 'Báo cáo phiên live ' + pf.name, def: 0, sound: profit >= 0 ? 'good' : 'bad',
        html: '<table class="tbl small"><tr><td>Người xem cao nhất</td><td class="r">' + st.peak + '</td></tr><tr><td>Đơn chốt</td><td class="r">' + st.orders + '</td></tr><tr><td>Doanh thu</td><td class="r">' + G.fmt.vnd(st.rev) + '</td></tr><tr><td>Giá vốn</td><td class="r">' + G.fmt.vnd(st.cogs) + '</td></tr><tr><td>Phí sàn</td><td class="r">' + G.fmt.vnd(st.fee) + '</td></tr><tr><td>Quảng cáo + KOL</td><td class="r">' + G.fmt.vnd(sess.ad + sess.kolFee) + '</td></tr><tr class="tot"><td>Lợi nhuận</td><td class="r ' + (profit >= 0 ? 'pos' : 'neg') + '">' + G.fmt.vnd(profit) + '</td></tr><tr><td>Follow mới</td><td class="r">+' + st.newF + '</td></tr><tr><td>Sự cố</td><td class="r">' + st.mishaps + '</td></tr></table><p class="muted small">Đơn online đang chờ đặt ship ở tab Giao hàng (COD có rủi ro hoàn/quịt).' + (early ? ' Phiên kết thúc sớm.' : '') + '</p>',
        choices: [{ label: 'Đóng', cls: 'primary' }]
      });
      G.emit('liveEnd', sess);
    },
    // ---- mô phỏng mỗi tick ----
    cfgOf: function (sess) { return { platform: sess.platform, start: sess.start, dur: sess.dur, ad: sess.ad, disc: sess.disc, voucher: sess.voucher.value }; },
    orderOne: function (sess, host) {
      var s = G.state, st = sess.st, pf = G.data.platforms[sess.platform], items = [], rev = 0, cogs = 0, picks;
      var avail = sess.feat.filter(function (k) { return !st.oos[k]; });
      if (!avail.length) return;
      picks = sess.combo && sess.feat.length > 1 ? sess.feat.slice() : [G.pick(avail)];
      var taken = [];
      for (var i = 0; i < picks.length; i++) {
        var k = picks[i];
        if (!G.deposits.take(k)) { if (!st.oos[k]) { st.oos[k] = true; st.mishaps++; st.bad++; st.flash = 0; G.reviews.add(2, { force: true, angry: 'stock' }); G.notify.push({ title: 'Live: hết hàng giữa phiên!', text: G.skus[k].label + ' đã hết, khán giả phàn nàn.', type: 'bad', sound: 'bad' }); } taken.forEach(function (t) { G.wh.add(t, 1, 'st'); }); return; }
        taken.push(k);
      }
      taken.forEach(function (k) {
        var price = G.pricing.effective(k) * (sess.combo && taken.length > 1 ? 0.95 : 1); price = Math.round(price / 1000) * 1000;
        items.push({ sku: k, qty: 1, price: price }); rev += price; cogs += s.costBasis[k] || G.skus[k].cost;
        if (G.pricing.isBelowFloor(k, price)) { G.pricing.flagBreach(G.skus[k].brand, 1); st.breach++; }
        var a = s.sold7[k] || (s.sold7[k] = [0, 0, 0, 0, 0, 0, 0]); a[0] += 1; s.lastSold[k] = s.day; s.today.byBrand[G.skus[k].brand] = (s.today.byBrand[G.skus[k].brand] || 0) + price;
      });
      if (sess.voucher.value && rev >= sess.voucher.min) rev -= sess.voucher.value;
      rev = Math.max(0, Math.round(rev));
      var fee = Math.round(rev * pf.fee); if (fee) G.econ.expense(fee, 'platform');
      G.econ.cogs(cogs); G.econ.addStat('sales', 1); G.econ.addStat('units', items.length); G.econ.addStat('online', 1);
      G.shipping.createOnline({ items: items, rev: rev, cogs: cogs, cod: G.chance(pf.cod), source: 'live', note: 'Đơn livestream' });
      st.orders++; st.rev += rev; st.cogs += cogs; st.fee += fee; st.soldAny = true;
      L.addHeart(); L.addChat('Đã đặt rồi nha 🛒');
      if (host && host.staff) G.staff.addXp(host.staff, 1);
    },
    addChat: function (t) { var f = L.fx; f.chats.push({ born: performance.now(), text: t || G.pick(CHAT), k: Math.random() }); if (f.chats.length > 7) f.chats.shift(); },
    addHeart: function () { var f = L.fx; f.hearts.push({ born: performance.now(), x: Math.random() }); if (f.hearts.length > 14) f.hearts.shift(); },
    tickSession: function (sess, gm) {
      var s = G.state, st = sess.st, host = L.hostOf(sess), pf = G.data.platforms[sess.platform], cfg = L.cfgOf(sess);
      if (!host) { L.endSession(sess, true); return; }
      st.min += gm;
      var hour = sess.start + Math.floor(st.min / 60);
      var tgt = L.viewersTarget(cfg, host, st.min); tgt *= G.weather ? G.weather.online() : 1; if (st.flash > 0 && st.min < st.flash) tgt *= 1.5; if (st.lag && st.min < st.lag) tgt *= 0.6; if (Object.keys(st.oos).length) tgt *= Math.max(0.6, 1 - 0.15 * Object.keys(st.oos).length); if (st.vc && st.min < st.vc) tgt *= 1.15;
      if (st.flash === -1) tgt *= 0.85;
      tgt *= 1 + (Math.sin(st.min / 7) * 0.08); // dao động tự nhiên
      st.viewers += (tgt - st.viewers) * Math.min(1, 0.08 * gm) + G.gauss() * 1.2 * Math.sqrt(gm);
      st.viewers = Math.max(1, st.viewers); st.peak = Math.max(st.peak, Math.round(st.viewers));
      // đơn hàng
      var conv = L.convRate(cfg, host); if (st.pin && st.min < st.pin) conv *= 1.6; if (st.vc && st.min < st.vc) conv *= 2; if (st.ans && st.min < st.ans) conv *= 1.1; if (st.lag && st.min < st.lag) conv *= 0.7;
      var exp = st.viewers * conv * gm / 60, n = Math.floor(exp); if (Math.random() < exp - n) n++;
      for (var i = 0; i < n; i++) L.orderOne(sess, host);
      // chat
      st.chatAcc += gm * Math.min(3, st.viewers / 60); while (st.chatAcc > 1) { st.chatAcc--; L.addChat(); if (G.chance(0.4)) L.addHeart(); }
      // sự kiện nhỏ mỗi ~12 phút game
      st.evAcc = (st.evAcc || 0) + gm;
      if (st.evAcc >= 12) { st.evAcc = 0; L.randomEvent(sess, host); }
      if (st.min >= sess.dur * 60 || s.minute >= 1255) L.endSession(sess, s.minute >= 1255 && st.min < sess.dur * 60);
    },
    randomEvent: function (sess, host) {
      var st = sess.st, r = Math.random(), crew = sess.crew && G.staff.byId(sess.crew);
      if (st.breach > 0 && G.chance(0.2)) {
        st.mishaps++; var brs = {}; sess.feat.forEach(function (k) { if (G.pricing.isBelowFloor(k, Math.round(G.pricing.base(k) * (1 - sess.disc) / 1000) * 1000)) brs[G.skus[k].brand] = 1; });
        Object.keys(brs).forEach(function (b) { G.pricing.flagBreach(b, 3); }); G.state.live.rep = G.clamp(G.state.live.rep - 6, 0, 100);
        G.notify.modal({ title: 'Bị báo cáo vi phạm giá sàn!', def: 0, sound: 'bad', html: '<p>Người xem báo cáo bạn bán <b>dưới giá sàn</b> quy định của hãng ngay trên live. Hãng có thể phát hiện (cảnh cáo → cắt chiết khấu → rút quyền đại lý), uy tín kênh giảm.</p>', choices: [{ label: 'Hiểu rồi', cls: 'danger' }] });
        return;
      }
      if (r < 0.5) {
        var evs = [
          { t: 'Khán giả hỏi: "Đệm này bảo hành bao lâu, có đổi trả không?"', a: [['Trả lời chi tiết (chốt +10%)', function () { st.ans = st.min + 10; if (host.staff) G.staff.addXp(host.staff, 1); }], ['Nhờ trợ lý trả lời' + (crew ? '' : ' (không có trợ lý)'), function () { if (crew) st.ans = st.min + 6; }], ['Bỏ qua', function () { st.viewers *= 0.97; }]] },
          { t: 'Sản phẩm đang được nhiều người hỏi. Ghim lên màn hình?', a: [['Ghim ngay (đơn ×1,6 trong 8 phút)', function () { st.pin = st.min + 8; }], ['Không', function () {}]] },
          { t: 'Thả voucher flash 50.000đ cho khán giả? (chi ~1tr)', a: [['Thả voucher (đơn ×2 trong 5 phút)', function () { if (G.state.money >= 1e6) { G.econ.expense(1e6, 'ads'); st.vc = st.min + 5; st.viewers *= 1.1; } }], ['Không thả', function () {}]] },
          { t: 'Có nhiều bạn mới follow kênh! Cảm ơn và bốc thăm quà (300.000đ)?', a: [['Cảm ơn + tặng quà', function () { if (G.state.money >= 3e5) { G.econ.expense(3e5, 'ads'); st.shout = (st.shout || 0) + Math.round(st.viewers * 0.06); G.state.live.rep = G.clamp(G.state.live.rep + 1, 0, 100); } }], ['Bỏ qua', function () {}]] }
        ];
        var e = G.pick(evs);
        G.notify.modal({ title: '🔴 Đang live: chốt đơn!', def: 0, html: '<p>' + G.esc(e.t) + '</p>', sound: 'info', choices: e.a.map(function (c, i) { return { label: c[0], cls: i === 0 ? 'primary' : '', fn: c[1] }; }) });
      } else if (r < 0.62) {
        st.mishaps++; st.lag = st.min + 6; G.notify.push({ title: 'Mạng lag!', text: 'Livestream giật lag, người xem tụt trong vài phút.', type: 'warn', sound: 'warn' });
      } else if (r < 0.7 && host.stars && host.stars <= 2) {
        st.mishaps++;
        G.notify.modal({ title: 'Host nói sai thông tin!', def: 0, sound: 'warn', html: '<p><b>' + G.esc(host.name) + '</b> lỡ nói sai kích thước/chất liệu sản phẩm. Khán giả bắt đầu xì xào.</p>', choices: [{ label: 'Đính chính ngay (mất ít người xem)', cls: 'primary', fn: function () { st.viewers *= 0.92; } }, { label: 'Lờ đi', fn: function () { st.bad++; G.reviews.add(2, { force: true, wrongInfo: true }); G.reviews.add(2, { force: true, wrongInfo: true }); } }] });
      } else if (r < 0.82) { st.flash = st.min + 8; G.notify.toast('⚡ Khoảnh khắc bùng nổ: người xem tăng mạnh!', 'good'); }
    },
    update: function (gm) {
      var s = G.state; if (!s.live.built) return;
      var run = L.running(); if (run) { L.tickSession(run, gm); return; }
      if (s.prep || !G.clock.isOpen()) return;
      s.live.sessions.forEach(function (sess) { if (!L.running() && sess.status === 'Đã đặt' && sess.day === s.day && s.minute >= sess.start * 60) L.startSession(sess); });
    },
    // ---- phòng live: cảnh isometric riêng 8x7 ô (toạ độ đất px) ----
    drawScene: function (ctx) {
      var s = G.state; if (!s.live.built) return;
      var SP = G.sprites, P = SP.P, now = performance.now(), run = L.running(), fr = G.render.frames().studio, fx = fr.x0 - fr.ox, fy = fr.y0 - fr.oy;
      var ringX = 42, ringY = 176, deskX = 84, deskY = 196, camX = 268, camY = 232;
      SP.isoBox(ctx, deskX, deskY, 120, 40, 26, '#f0c9a0'); SP.isoBox(ctx, deskX - 2, deskY - 2, 124, 44, 3, '#fffaf4', 26, { noShadow: true });
      // đèn ring: cột + vòng sáng
      var rb = P(ringX, ringY, 0), rt = P(ringX, ringY, 74); ctx.strokeStyle = '#8d86a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rb[0], rb[1]); ctx.lineTo(rt[0], rt[1]); ctx.stroke();
      var glow = run ? 0.55 + 0.15 * Math.sin(now / 200) : 0.15; SP.glow(ctx, ringX + 20, ringY + 20, 0.5, 70, '255,245,190', glow * 0.7);
      ctx.fillStyle = 'rgba(255,248,200,' + (0.35 + glow * 0.5) + ')'; ctx.beginPath(); ctx.ellipse(rt[0], rt[1], 17, 17, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fffaf4'; ctx.beginPath(); ctx.ellipse(rt[0], rt[1], 12, 12, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.ellipse(rt[0], rt[1], 6, 6, 0, 0, 6.3); ctx.fill();
      // máy quay trên chân ba
      var cb = P(camX, camY, 0), ct = P(camX, camY, 36); ctx.strokeStyle = '#8d86a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ct[0], ct[1]); ctx.lineTo(cb[0] - 10, cb[1] + 4); ctx.moveTo(ct[0], ct[1]); ctx.lineTo(cb[0] + 10, cb[1] + 4); ctx.moveTo(ct[0], ct[1]); ctx.lineTo(cb[0], cb[1] + 6); ctx.stroke();
      SP.isoBox(ctx, camX - 10, camY - 8, 20, 16, 14, '#6f6a8d', 34, { noShadow: true }); var lens = P(camX - 10, camY + 8, 41); ctx.fillStyle = '#bfe0f4'; ctx.beginPath(); ctx.arc(lens[0], lens[1], 3.5, 0, 6.3); ctx.fill();
      if (run) { var lp = P(camX + 10, camY, 46); ctx.fillStyle = Math.sin(now / 300) > 0 ? '#FF3B4E' : '#7a2330'; ctx.beginPath(); ctx.arc(lp[0], lp[1], 2.6, 0, 6.3); ctx.fill(); }
      if (!run) { ctx.fillStyle = 'rgba(74,68,102,.6)'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; var tc = P(160, 262, 0); ctx.fillText('Phòng livestream - chưa có phiên nào', tc[0], tc[1] + 18); return; }
      var host = L.hostOf(run), st = run.st;
      if (host) {
        var look = host.kol ? { skin: host.look.skin, hair: host.look.hair, hairStyle: host.look.hairStyle, headset: '#EC407A' } : G.render.staffLook({ id: host.staff.id, role: host.staff.role, color: G.roleById[host.staff.role].color }), hp = P(144, deskY + 52, 0);
        SP.person(ctx, Object.assign({}, look, { x: hp[0], y: hp[1], face: -1, mood: 'happy', moving: false, phase: now / 400, shirt: host.kol ? '#FF9EB8' : '#FFFFFF', band: host.kol ? null : G.roleById[host.staff.role].color }));
        ctx.fillStyle = 'rgba(42,53,96,.85)'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(host.name.split(' ').slice(-2).join(' '), hp[0], hp[1] + 12);
      }
      var crew = run.crew && G.staff.byId(run.crew); if (crew) { var cl = G.render.staffLook({ id: crew.id, role: crew.role, color: G.roleById[crew.role].color }), cp = P(232, 176, 0); SP.person(ctx, Object.assign({}, cl, { x: cp[0], y: cp[1], face: -1, shirt: '#FFFFFF', band: G.roleById[crew.role].color, mood: 'neutral', phase: now / 500 })); }
      // chỉ số LIVE gắn theo khung màn hình của trang
      SP.poly(ctx, [[fx + 8, fy + 48], [fx + 72, fy + 48], [fx + 80, fy + 57], [fx + 72, fy + 66], [fx + 8, fy + 66]], Math.sin(now / 350) > 0 ? '#FF3B4E' : '#D9243A'); ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('● LIVE', fx + 16, fy + 61);
      SP.poly(ctx, [[fx + 86, fy + 48], [fx + 150, fy + 48], [fx + 150, fy + 66], [fx + 86, fy + 66]], 'rgba(42,53,96,.85)'); ctx.fillStyle = '#fff'; ctx.fillText('👁 ' + Math.round(st.viewers), fx + 92, fy + 61);
      ctx.fillStyle = 'rgba(42,53,96,.9)'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('Đơn: ' + st.orders + ' · ' + G.fmt.short(st.rev), fx + 8, fy + 82);
      var cts = L.fx.chats.filter(function (c) { return now - c.born < 4500; });
      cts.forEach(function (c, i) { var age = (now - c.born) / 4500, yy = fy + 150 - i * 20 - age * 8; ctx.globalAlpha = 1 - age * age; ctx.font = '10px sans-serif'; var w = Math.min(190, ctx.measureText(c.text).width + 14); SP.poly(ctx, [[fx + 8, yy - 14], [fx + 8 + w, yy - 14], [fx + 12 + w, yy - 7], [fx + 8 + w, yy], [fx + 8, yy]], 'rgba(255,255,255,.92)', 'rgba(30,40,90,.2)'); ctx.fillStyle = '#2A3560'; ctx.textAlign = 'left'; ctx.fillText(c.text, fx + 14, yy - 4); ctx.globalAlpha = 1; });
      L.fx.hearts.forEach(function (h) { var age = (now - h.born) / 2200; if (age > 1) return; ctx.globalAlpha = 1 - age; SP.hexagon(ctx, fx + 230 + h.x * 100 + Math.sin(age * 8 + h.x * 9) * 5, fy + 190 - age * 110, 6, '#FF5A7A', 0.9); ctx.globalAlpha = 1; });
    },
    paintStatic: function (c) {
      var SP = G.sprites, P = SP.P, T = SP.T, pl = G.render.plateOf('studio'), W = 320, x, y;
      SP.plate(c, pl.gx0, pl.gy0, pl.gx1, pl.gy1, G.render.TH, '#f7d2b8', '#e9b79f', '#d79f8d');
      SP.woodFloor(c, 0, 1, 8, 7, ['#f3eaff', '#eadffc', '#f8f0ff']);
      SP.leftWall(c, 7, 62, '#efe6fb', null); SP.backWall(c, 8, 62, '#f3ecfd');
      // phông nền sau lưng host: lưới tam giác pastel trên tường
      var tri = ['#f4b6c2', '#ffd06b', '#9fd0f0', '#bfeedd'], bx = 10, bw = W - 20, i, j;
      for (i = 0; i < 6; i++) for (j = 0; j < 2; j++) { var u0 = bx + i * bw / 6, u1 = u0 + bw / 6, v0 = 12 + j * 22, v1 = v0 + 22, k = (i + j) % 4, a = SP.wallBack(0, u0, v1), b = SP.wallBack(0, u1, v1), cc = SP.wallBack(0, u1, v0), d = SP.wallBack(0, u0, v0); SP.poly(c, [a, b, cc], tri[k]); SP.poly(c, [a, cc, d], tri[(k + 1) % 4]); }
      var o = SP.wallBack(0, W / 2, 46), sb = SP.wallBack(0, 80, 46); SP.poly(c, [SP.wallBack(0, 80, 46), SP.wallBack(0, W - 80, 46), SP.wallBack(0, W - 80, 60), SP.wallBack(0, 80, 60)], '#4a4466');
      c.save(); c.transform(SP.HX / T, SP.HY / T, 0, 1, SP.wallBack(0, W / 2, 49)[0], SP.wallBack(0, W / 2, 49)[1]); c.fillStyle = '#ff9ec2'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('LIVE STUDIO', 0, 0); c.restore();
      SP.plant(c, 276, 220, 0.95); SP.plant(c, 4, 100, 0.9);
      SP.isoBox(c, 150, 120, 80, 24, 5, '#f4b6c2', 0, { noShadow: true });
    }
  };
  G.on('tick', function (t) { L.update(t.gm); });
  G.on('dayStart', function () {
    var s = G.state; if (!s.live.built) return;
    G.econ.expense(L.UPKEEP, 'live'); L.refreshKols(false);
    s.live.sessions = s.live.sessions.filter(function (x) { return (x.status === 'Đã đặt' && x.day >= s.day - 0) || x.status === 'Đang live' || s.day - x.day < 10; });
    s.live.sessions.forEach(function (x) { if (x.status === 'Đã đặt' && x.day < s.day) { x.status = 'Hủy'; } });
    var today = s.live.sessions.filter(function (x) { return x.status === 'Đã đặt' && x.day === s.day; })[0];
    if (today) G.notify.push({ title: 'Hôm nay có phiên live lúc ' + today.start + 'h', text: G.data.platforms[today.platform].name + ' - đảm bảo đủ hàng mẫu và host rảnh!', type: 'info', sound: 'info' });
  });
  G.on('dayEnd', function () { var r = L.running(); if (r) L.endSession(r, true); });
  G.on('init', function () { var s = G.state; if (s.live.running && !L.running()) s.live.running = null; s.staff.forEach(function (st) { if (st.status === 'live' && !s.live.running) st.status = 'ok'; }); });
  G.on('debug:forceLive', function () { L.force(); });
  L.force = function () {
    var s = G.state, W = G.wh;
    if (!s.live.built) { s.live.built = true; L.refreshKols(true); }
    if (G.clock.isOpen() === false && s.prep) G.clock.openShop();
    var feat = G.skuList.filter(function (k) { return G.brandAvail(k.brand) && k.brand !== 'cho' && k.type !== 'dem' && L.sellable(k.id) >= 1; }).slice(0, 2).map(function (k) { return k.id; });
    if (!feat.length) { var k = G.skuList.filter(function (x) { return G.brandAvail(x.brand) && x.brand !== 'cho' && x.type === 'ga'; })[0]; G.wh.add(k.id, 20, 'st'); s.costBasis[k.id] = k.cost; feat = [k.id]; }
    var kol = s.live.kols[0], sess = { id: s.live.nextId++, platform: 'shopee', day: s.day, start: Math.max(9, Math.min(19, Math.floor(s.minute / 60))), dur: 1, host: { type: 'kol', kol: G.clone(kol) }, crew: null, feat: feat, combo: false, disc: 0.1, voucher: { value: 50000, min: 500000 }, ad: 0, kolFee: 0, status: 'Đã đặt', st: null };
    s.live.sessions.push(sess); if (!L.running()) L.startSession(sess); return sess;
  };
  G.econ.EXP_NAMES.live = 'Duy trì phòng livestream'; G.econ.EXP_NAMES.platform = 'Phí sàn livestream';
})();
