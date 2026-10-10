/* Bảo hành & đổi trả: chính sách cửa hàng, sinh yêu cầu theo tình trạng hàng, duyệt/từ chối/chuyển hãng, CSKH tự xử lý, báo cáo */
(function () {
  'use strict';
  var G = window.G;
  G.data.claimKinds = {
    factory: { name: 'Lỗi nhà sản xuất', grade: 'Hư lỗi sản xuất', desc: ['Đệm bị lún / xẹp chỗ sau thời gian ngắn.', 'Đường may bung chỉ, vải bị rách.', 'Mùi hôi lạ, có dấu hiệu ẩm mốc.', 'Lò xo kêu, lệch một bên.'], valid: true },
    shipdamage: { name: 'Hư hại khi giao', grade: 'Hư lỗi sản xuất', desc: ['Hàng đến nơi bị móp méo, rách bao bì.'], valid: true },
    regret: { name: 'Không ưng ý', grade: 'Mới nguyên tem', desc: ['Mua về thấy không hợp, muốn đổi mẫu khác.', 'Nằm không êm như mong đợi, hàng còn nguyên tem.'], valid: false },
    wear: { name: 'Hao mòn do dùng lâu', grade: 'Đã dùng nhẹ', desc: ['Dùng gần cả năm, thấy xẹp nhẹ và muốn đổi cái mới.', 'Vỏ gối bạc màu sau nhiều lần giặt.'], valid: false },
    custdmg: { name: 'Hư do khách', grade: 'Hư do khách', desc: ['Khách làm đổ nước / thú cưng cắn rách nhưng đòi bảo hành.', 'Gập đệm sai cách làm gãy lò xo.'], valid: false },
    dirty: { name: 'Biến dạng / bẩn', grade: 'Biến dạng/bẩn', desc: ['Hàng đã bóc tem, có vết bẩn và biến dạng.', 'Có mùi thuốc lá, vết ố lớn.'], valid: false },
    fraud: { name: 'Nghi gian lận', grade: 'Đã dùng nhẹ', desc: ['Hóa đơn có dấu hiệu chỉnh sửa / không khớp ngày mua.', 'Mẫu mã không khớp hàng của cửa hàng (nghi hàng nơi khác).'], valid: false }
  };
  G.addDefaults({ returns: {
    policy: { days: 7, warranty: 12, cond: 'defect', fee: 0.05, needInvoice: true, acceptUsed: false, vip: true, brandPolicy: true },
    claims: [], pending: [], nextId: 1, auto: true, complaints: 0,
    stats: { claims: 0, cost: 0, approved: 0, rejected: 0, unjust: 0, byBrand: {}, bySku: {}, soldBySku: {}, soldBySource: {}, claimBySource: {}, monthClaims: 0, monthCost: 0 },
    log: [], factory: []
  } });
  var RT = G.returns = {
    GRADES: ['Mới nguyên tem', 'Đã dùng nhẹ', 'Hư lỗi sản xuất', 'Hư do khách', 'Biến dạng/bẩn'],
    pol: function () { return G.state.returns.policy; },
    sourceOfSku: function (k) { var b = G.skus[k].brand; return b === 'cho' ? 'cho' : b === 'own' ? 'oem' : 'daily'; },
    // mức độ hào phóng của chính sách (-1..+1): tăng khách/chốt/đánh giá nhưng tăng chi phí
    score: function () {
      var p = RT.pol(), g = { 0: -0.4, 3: -0.15, 7: 0, 15: 0.2, 30: 0.35 }[p.days] || 0;
      g += { 6: -0.2, 12: 0, 24: 0.15, 36: 0.25 }[p.warranty] || 0; g += { defect: 0, exchange: 0.2, refund: 0.35 }[p.cond] || 0; g -= p.fee * 1.5; if (!p.needInvoice) g += 0.05; if (p.acceptUsed) g += 0.1; if (p.vip) g += 0.03;
      return G.clamp(g, -1, 1);
    },
    ratingBonus: function () { return RT.score() * 0.2; },
    propensity: function () { var p = RT.pol(); return 1 + p.days / 30 * 0.4 + ({ defect: 0, exchange: 0.5, refund: 0.8 }[p.cond] || 0) + (p.warranty - 12) / 36 * 0.4; },
    cskh: function () { var t = 0, n = 0; G.staff.byRole('cskh').forEach(function (x) { if (x.status === 'ok') { t += x.stars; n++; } }); var acc = 0; G.staff.byRole('accountant').forEach(function (x) { if (x.status === 'ok') acc += x.stars; }); return { stars: t, n: n, acc: acc }; },
    // chi phí bảo hành do hãng chịu: số tháng theo phân khúc / loại đệm
    brandWarranty: function (sku) { var t = G.skus[sku], b = G.brandById[t.brand]; if (b.noBrand) return 0; var m = [0, 6, 12, 12, 24, 36][b.tier] || 12; if (t.type === 'dem' && t.sub === 'caosu') m += 12; return m; },
    shopWarranty: function (sku) { var t = G.skus[sku], m = RT.pol().warranty; if (t.type === 'dem') m += 12; if (t.type === 'goi' || t.type === 'phukien') m = Math.min(m, 6); return m; },
    // ---- ghi nhận một đơn đã bán (cửa hàng / giao hàng / livestream) và quyết định có yêu cầu bảo hành hay không ----
    register: function (e) {
      var s = G.state, st = s.returns.stats, t = G.skus[e.sku]; if (!t) return;
      st.soldBySku[e.sku] = (st.soldBySku[e.sku] || 0) + 1; var src = RT.sourceOfSku(e.sku); st.soldBySource[src] = (st.soldBySource[src] || 0) + 1;
      var p = 0.02 + (5 - t.q) * 0.012 + (t.grade === 2 ? 0.07 : t.grade === 1 ? 0.015 : 0) + (e.defect === 'hidden' ? 0.55 : e.defect === 'bgrade' ? 0.2 : 0) + (e.damaged ? 0.4 : 0) + (t.type === 'dem' ? 0.01 : 0) + (G.life.stage(e.sku) === 3 ? 0.01 : 0);
      var c = RT.cskh(); p *= RT.propensity() * (1 - Math.min(0.3, c.stars * 0.05 + c.acc * 0.02));
      if (!G.chance(p)) return;
      // loại yêu cầu
      var cs = RT.cskh(), fraudF = (RT.pol().needInvoice ? 0.6 : 1.3) * (1 - Math.min(0.6, cs.stars * 0.08 + cs.acc * 0.03));
      var w = { factory: 0.45 + (e.defect ? 0.45 : 0) + (t.grade === 2 ? 0.12 : t.grade === 1 ? 0.02 : 0), regret: RT.pol().cond === 'defect' ? 0.12 : 0.2, wear: 0.1, custdmg: 0.1, dirty: 0.05, fraud: 0.12 * fraudF };
      if (e.damaged) { w = { shipdamage: 1 }; }
      var kind = G.weighted(Object.keys(w), function (k) { return w[k]; }) || 'factory';
      var delay = { factory: [3, 60], shipdamage: [1, 4], regret: [1, 9], wear: [60, 300], custdmg: [20, 200], dirty: [3, 40], fraud: [5, 90] }[kind];
      var d = G.randInt(delay[0], delay[1]);
      s.returns.pending.push({ day: s.day + d, soldDay: s.day, sku: e.sku, price: e.price, kind: kind, defect: e.defect || null, cust: e.cust || (G.pick(G.data.lastNames) + ' ' + G.pick(G.data.firstNames)), source: e.source || 'shop', invoice: kind === 'fraud' ? (G.chance(0.5) ? 'giả' : false) : G.chance(e.source === 'shop' ? 0.9 : 0.97), notMine: kind === 'fraud' && G.chance(0.4), member: !!e.member });
    },
    // ---- kiểm tra chính sách ----
    check: function (c) {
      var p = RT.pol(), age = G.state.day - c.soldDay, inRet = age <= p.days, inW = age <= RT.shopWarranty(c.sku) * 30, K = G.data.claimKinds[c.kind];
      var used = c.grade === 'Đã dùng nhẹ' || c.grade === 'Biến dạng/bẩn', invOk = !p.needInvoice || c.invoice === true || (p.vip && c.member);
      var covered;
      if (c.kind === 'fraud') covered = false;
      else if (K.valid) covered = inW;
      else if (c.kind === 'regret') covered = p.cond !== 'defect' && inRet && (!used || p.acceptUsed);
      else if (c.kind === 'wear') covered = p.cond === 'refund' && inW && p.acceptUsed;
      else covered = p.acceptUsed && p.cond !== 'defect' && c.kind === 'dirty' && inRet;
      var brandM = RT.brandWarranty(c.sku), brandOk = brandM > 0 && age <= brandM * 30 && K.valid && c.kind === 'factory' && c.invoice === true;
      var valid = covered && invOk;
      var lines = [
        { ok: inRet, text: 'Trong thời hạn đổi trả (' + p.days + ' ngày) - đã ' + age + ' ngày' },
        { ok: inW, text: 'Trong thời hạn bảo hành (' + RT.shopWarranty(c.sku) + ' tháng)' },
        { ok: invOk, text: p.needInvoice ? (c.invoice === true ? 'Có hóa đơn hợp lệ' : c.invoice === 'giả' ? 'Hóa đơn nghi giả mạo' : 'Không có hóa đơn') : 'Không yêu cầu hóa đơn' },
        { ok: K.valid, text: 'Lỗi thuộc diện bảo hành: ' + K.name },
        { ok: !used || p.acceptUsed || K.valid, text: 'Tình trạng: ' + c.grade + (used && !p.acceptUsed && !K.valid ? ' (chính sách không nhận hàng đã dùng)' : '') },
        { ok: brandOk, text: G.brandById[G.skus[c.sku].brand].noBrand ? 'Hàng không thương hiệu: không có bảo hành hãng' : 'Hãng bảo hành ' + brandM + ' tháng' + (brandOk ? ' - có thể chuyển hãng' : ' - không đủ điều kiện chuyển hãng'), info: true }
      ];
      var rec, clear = true;
      if (c.kind === 'fraud') rec = 'reject';
      else if (!inW && !inRet) rec = 'reject';
      else if (!valid) { rec = (c.kind === 'regret' || c.kind === 'wear' || c.kind === 'dirty' || c.kind === 'custdmg') && (inW || inRet) ? 'discount' : 'reject'; clear = rec === 'reject'; }
      else if (c.kind === 'factory' || c.kind === 'shipdamage') { var dem = G.skus[c.sku].type === 'dem'; rec = brandOk && dem ? 'brand' : (dem && c.defect !== 'hidden' && c.kind === 'factory' ? 'repair' : 'replace'); clear = rec === 'replace'; }
      else rec = p.cond === 'refund' ? 'refund' : 'replace';
      if (c.kind === 'regret' || c.kind === 'wear') clear = false;
      return { lines: lines, valid: valid, covered: covered, inRet: inRet, inW: inW, invOk: invOk, brandOk: brandOk, recommended: rec, clear: clear };
    },
    thumb: function (c) { return G.sprites.skuThumb(c.sku, 56); },
    pendingList: function () { return G.state.returns.claims.filter(function (c) { return c.status === 'Chờ xử lý'; }); },
    byId: function (id) { return G.state.returns.claims.filter(function (c) { return c.id === id; })[0]; },
    // ---- tạo claim từ danh sách chờ ----
    spawn: function () {
      var s = G.state, R = s.returns, due = R.pending.filter(function (x) { return x.day <= s.day; }), n = 0;
      R.pending = R.pending.filter(function (x) { return x.day > s.day; });
      due.forEach(function (x) {
        var K = G.data.claimKinds[x.kind], c = { id: R.nextId++, day: s.day, soldDay: x.soldDay, cust: x.cust, sku: x.sku, label: G.skus[x.sku].label, price: x.price, kind: x.kind, grade: K.grade, desc: G.pick(K.desc), invoice: x.invoice, source: x.source, member: x.member, defect: x.defect, notMine: x.notMine, status: 'Chờ xử lý', deadline: s.day + 5 };
        var tk = G.skus[x.sku]; if (tk.type === 'ga' && tk.cw) { // bộ chăn ga gối: lỗi về màu / vải
          if (x.kind === 'factory') c.desc = G.pick(['Bộ ' + tk.cw.code + ' bị phai màu sau vài lần giặt.', 'Vải bị xù, đường may bung chỉ ở vỏ gối.', 'Màu ' + tk.cw.name + ' lệch nhiều so với ảnh trong Lookbook.']);
          else if (x.kind === 'regret') c.desc = G.pick(['Mua về thấy màu ' + tk.cw.name + ' không hợp phòng, muốn đổi mã khác.', 'Màu ngoài đời đậm hơn trong ảnh, muốn đổi.']);
          else if (x.kind === 'wear') c.desc = 'Bộ ' + tk.cw.code + ' bạc màu sau nhiều lần giặt.';
        }
        if (x.kind === 'fraud' && x.notMine) c.desc = 'Mẫu mã không khớp hàng của cửa hàng (nghi hàng nơi khác).';
        R.claims.push(c); n++; var st = R.stats; st.claims++; st.monthClaims++; st.byBrand[G.skus[x.sku].brand] = (st.byBrand[G.skus[x.sku].brand] || 0) + 1; st.bySku[x.sku] = (st.bySku[x.sku] || 0) + 1; var src = RT.sourceOfSku(x.sku); st.claimBySource[src] = (st.claimBySource[src] || 0) + 1;
      });
      if (R.claims.length > 120) R.claims = R.claims.filter(function (c) { return c.status === 'Chờ xử lý' || s.day - (c.closedDay || c.day) < 30; });
      return n;
    },
    close: function (c, status, cost) { var R = G.state.returns; c.status = status; c.closedDay = G.state.day; c.cost = (c.cost || 0) + (cost || 0); R.stats.cost += cost || 0; R.stats.monthCost += cost || 0; },
    shipFee: function (c) { return G.skus[c.sku].vol >= 6 ? 120000 : 40000; },
    restock: function (c, how) { // trả hàng về kho
      var cost = G.state.costBasis[c.sku] || G.skus[c.sku].cost;
      if (how === 'new') { G.wh.add(c.sku, 1, 'st'); G.econ.cogs(-cost); }
      else if (how === 'used') { G.wh.add(c.sku, 1, 'st'); G.state.bGrade[c.sku] = (G.state.bGrade[c.sku] || 0) + 1; G.econ.cogs(-Math.round(cost * 0.6)); }
    },
    restockHow: function (c) { return c.grade === 'Mới nguyên tem' ? 'new' : (c.grade === 'Đã dùng nhẹ' ? 'used' : 'none'); },
    review: function (c, r, meta) { G.reviews.add(r, Object.assign({ force: true, claim: c.id, sku: c.sku }, meta || {})); },
    // ---- quyết định ----
    decide: function (id, action, extra) {
      var s = G.state, c = RT.byId(id), R = s.returns, p = RT.pol(); if (!c || c.status !== 'Chờ xử lý') return { ok: false, msg: 'Yêu cầu không còn' };
      extra = extra || {}; var chk = RT.check(c), K = G.data.claimKinds[c.kind], cost0 = G.state.costBasis[c.sku] || G.skus[c.sku].cost, ship = RT.shipFee(c);
      var fee = K.valid ? 0 : Math.round(c.price * p.fee);
      if (action === 'replace') {
        if (!G.deposits.take(c.sku)) return { ok: false, msg: 'Không còn hàng để đổi - hãy hoàn tiền hoặc nhập thêm' };
        G.econ.cogs(cost0); if (fee) G.econ.income(fee, 'fee'); G.econ.expense(ship, 'shipfee'); RT.restock(c, RT.restockHow(c));
        RT.close(c, 'Đã đổi mới', cost0 + ship - fee); RT.review(c, K.valid ? 5 : 4, {}); R.stats.approved++;
        return { ok: true, msg: 'Đã đổi mới cho ' + c.cust };
      }
      if (action === 'refund') {
        var refund = Math.max(0, c.price - fee); G.econ.income(-refund, 'sales'); G.econ.expense(ship, 'shipfee'); RT.restock(c, RT.restockHow(c));
        RT.close(c, 'Đã hoàn tiền', refund + ship); RT.review(c, K.valid ? 4 : 3, {}); R.stats.approved++;
        return { ok: true, msg: 'Đã hoàn ' + G.fmt.vnd(refund) };
      }
      if (action === 'repair') {
        var rc = Math.round(c.price * 0.12); G.econ.expense(rc, 'repair');
        if (G.chance(0.9)) { RT.close(c, 'Đã sửa', rc); RT.review(c, 4, {}); R.stats.approved++; return { ok: true, msg: 'Sửa xong (phí ' + G.fmt.vnd(rc) + ')' }; }
        c.cost = (c.cost || 0) + rc; c.desc += ' (Sửa chữa thất bại, cần xử lý lại)'; return { ok: false, msg: 'Sửa không thành công - hãy đổi hoặc hoàn tiền' };
      }
      if (action === 'reject') {
        var unjust = chk.valid, reason = extra.reason || (unjust ? 'Từ chối' : chk.lines.filter(function (l) { return !l.ok && !l.info; })[0].text);
        c.reason = reason; RT.close(c, 'Đã từ chối', 0); R.stats.rejected++;
        if (unjust) { R.stats.unjust++; if (G.chance(0.85)) RT.review(c, G.randInt(1, 2), { angry: 'rebut', unjust: true }); s.rep = G.clamp(s.rep - 0.6, 0, 100); if (G.chance(0.15)) { R.complaints++; s.events.fakeReports += 1; G.notify.push({ title: 'Khách khiếu nại lên cơ quan quản lý', text: c.cust + ' khiếu nại vì bị từ chối bảo hành hợp lệ. Nguy cơ bị kiểm tra tăng.', type: 'bad', sound: 'bad' }); } }
        else if (c.kind !== 'fraud' && G.chance(p.cond === 'defect' ? 0.06 : 0.12)) RT.review(c, 2, { angry: 'rebut' });
        return { ok: true, msg: unjust ? 'Đã từ chối (ca hợp lệ: rủi ro đánh giá xấu)' : 'Đã từ chối: ' + reason };
      }
      if (action === 'discount') {
        var pct = extra.pct || 0.15, acc = { 'Mới nguyên tem': 0.3, 'Đã dùng nhẹ': 0.7, 'Biến dạng/bẩn': 0.7, 'Hư do khách': 0.7, 'Hư lỗi sản xuất': 0.5 }[c.grade] || 0.5;
        if (G.chance(acc)) { var amt = Math.round(c.price * pct); G.econ.income(-amt, 'sales'); RT.close(c, 'Giữ lại (giảm giá)', amt); RT.review(c, 4, {}); return { ok: true, msg: 'Khách đồng ý giữ hàng, hoàn ' + G.fmt.vnd(amt) }; }
        c.desc += ' (Khách không đồng ý giảm giá)'; return { ok: false, msg: 'Khách không đồng ý - chọn cách xử lý khác' };
      }
      if (action === 'brand') {
        if (!chk.brandOk) return { ok: false, msg: 'Không đủ điều kiện chuyển hãng (cần lỗi nhà sản xuất, hàng thương hiệu, trong bảo hành hãng, có hóa đơn)' };
        c.status = 'Đã chuyển hãng'; c.brandDue = s.day + G.randInt(3, 7); R.factory.push(c.id); return { ok: true, msg: 'Đã gửi hãng ' + G.brandName(G.skus[c.sku].brand) + ', dự kiến ' + (c.brandDue - s.day) + ' ngày' };
      }
      return { ok: false, msg: 'Hành động không hợp lệ' };
    },
    brandResults: function () {
      var s = G.state, R = s.returns;
      R.factory = R.factory.filter(function (id) {
        var c = RT.byId(id); if (!c || c.status !== 'Đã chuyển hãng') return false;
        if (s.day < c.brandDue) { if (s.day - c.day > 8 && !c.waitPen) { c.waitPen = true; if (G.chance(0.3)) RT.review(c, 2, { late: true }); } return true; }
        var b = G.skus[c.sku].brand, rel = s.rel[b] || 0, p = G.clamp(0.5 + rel / 200 + 0.15 + (c.invoice === true ? 0.1 : -0.2), 0.1, 0.95), cost = s.costBasis[c.sku] || G.skus[c.sku].cost;
        if (G.chance(p)) { G.econ.cash(Math.round(cost * 0.9)); RT.close(c, 'Hãng đã đổi', RT.shipFee(c) - Math.round(cost * 0.9)); s.rel[b] = Math.min(100, rel + 1); RT.review(c, 5, {}); G.notify.push({ title: G.brandName(b) + ' chấp nhận bảo hành', text: c.label + ': hãng đổi mới, hoàn ' + G.fmt.short(cost * 0.9) + ' giá vốn.', type: 'good', sound: false }); }
        else { var refund = c.price; G.econ.income(-refund, 'sales'); RT.close(c, 'Hãng từ chối - đã hoàn tiền', refund); s.rel[b] = Math.max(0, rel - 1); G.notify.push({ title: G.brandName(b) + ' từ chối bảo hành', text: c.label + ': cửa hàng tự hoàn tiền ' + G.fmt.short(refund) + ' cho khách.', type: 'warn', sound: false }); }
        return false;
      });
    },
    // ---- CSKH / Kế toán tự xử lý ----
    autoHandle: function () {
      var R = G.state.returns; if (!R.auto) return 0; var cs = RT.cskh(); if (!cs.n && !cs.acc) return 0;
      var stars = cs.n ? cs.stars / cs.n : cs.acc / 2, acc = cs.n ? 0.7 + 0.08 * stars : 0.55 + 0.05 * stars, n = 0;
      RT.pendingList().forEach(function (c) {
        var chk = RT.check(c); if (!chk.clear) return;
        var act = chk.recommended; if (!G.chance(acc)) act = act === 'reject' ? 'replace' : 'reject'; // quyết sai
        var r = RT.decide(c.id, act === 'brand' ? 'replace' : act, { reason: 'Tự động xử lý theo chính sách' }); if (!r.ok && act !== 'refund') r = RT.decide(c.id, 'refund'); if (r.ok) { c.auto = true; n++; }
      });
      return n;
    },
    skuRate: function (k) { var st = G.state.returns.stats; return (st.bySku[k] || 0) / Math.max(5, st.soldBySku[k] || 0); },
    sourceRate: function (src) { var st = G.state.returns.stats; return (st.claimBySource[src] || 0) / Math.max(10, st.soldBySource[src] || 0); },
    daily: function () {
      var s = G.state, R = s.returns, n = RT.spawn();
      RT.brandResults(); var auto = RT.autoHandle();
      R.claims.forEach(function (c) { if (c.status === 'Chờ xử lý' && s.day > c.deadline) { RT.close(c, 'Quá hạn - khách bỏ đi', 0); RT.review(c, 2, { angry: 'wait' }); s.rep = G.clamp(s.rep - 0.4, 0, 100); } });
      var pend = RT.pendingList().length;
      if (n) G.notify.push({ title: '🛠 ' + n + ' yêu cầu bảo hành mới', text: (auto ? 'Nhân viên đã tự xử lý ' + auto + ' ca. ' : '') + pend + ' ca chờ bạn quyết định (hạn 5 ngày).', type: 'warn', sound: 'warn', onClick: function () { G.ui.panels.show('warranty'); } });
      R.log.push({ day: s.day, claims: n, cost: R.stats.monthCost }); if (R.log.length > 60) R.log.shift();
    }
  };
  G.conversionMods.push(function () { return 1 + 0.12 * RT.score(); });
  var tm = function () { return 1 + 0.06 * RT.score(); }; tm.label = 'Chính sách đổi trả'; G.trafficMods.push(tm);
  G.on('sale', function (e) {
    if (e.shipping) return; var m = G.campaigns && G.state.camp.member.on && G.chance(0.35);
    e.items.forEach(function (it) { for (var i = 0; i < it.qty; i++) RT.register({ sku: it.sku, price: it.price, defect: it.defect, cust: e.customer && e.customer.name, source: 'shop', member: m }); });
  });
  G.on('shipDelivered', function (o) { if (o.status !== 'Đã giao') return; o.items.forEach(function (it) { for (var i = 0; i < it.qty; i++) RT.register({ sku: it.sku, price: it.price, defect: it.defect, damaged: o.damaged, cust: o.cust && o.cust.name, source: o.source === 'live' ? 'live' : 'ship' }); }); });
  G.on('dayStart', RT.daily);
  G.on('monthStart', function () { var st = G.state.returns.stats; st.monthClaims = 0; st.monthCost = 0; });
  G.econ.EXP_NAMES.repair = 'Sửa chữa bảo hành';
  // dev
  RT.force = function (n) {
    var s = G.state, ks = G.skuList.filter(function (k) { return G.brandAvail(k.brand); }), kinds = ['factory', 'regret', 'wear', 'custdmg', 'dirty', 'fraud', 'factory', 'shipdamage'], made = 0;
    for (var i = 0; i < (n || 3); i++) { var k = G.pick(ks), kind = G.pick(kinds); s.returns.pending.push({ day: s.day, soldDay: s.day - G.randInt(1, 40), sku: k.id, price: G.pricing.base(k.id), kind: kind, defect: kind === 'factory' && G.chance(0.4) ? 'hidden' : null, cust: G.pick(G.data.lastNames) + ' ' + G.pick(G.data.firstNames), source: 'shop', invoice: kind === 'fraud' ? 'giả' : G.chance(0.85), notMine: false, member: G.chance(0.2) }); made++; }
    var c = RT.spawn(); G.ui && G.ui.panels && G.ui.panels.refresh(true); return c;
  };
})();
