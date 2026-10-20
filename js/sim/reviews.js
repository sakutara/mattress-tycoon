/* Đánh giá khách hàng: danh sách 1-5★ + bình luận tiếng Việt sinh từ meta, phản hồi của chủ cửa hàng. Thay stub trong sales.js. */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ revs: { list: [], nextId: 1, answered: 0, total: 0, auto: true }, events: { fakeReports: 0 } });
  var NEG = {
    late: ['Giao hàng trễ hơn hẹn cả mấy ngày, hỏi mãi mới có tin.', 'Đặt ship mà chờ hoài, mất cả tuần mới nhận được hàng.'],
    damaged: ['Hàng tới nơi bị móp méo, đóng gói ẩu quá.', 'Nhận hàng bị hư hại, thất vọng.'],
    wait: ['Vào cửa hàng chờ nhân viên tư vấn rất lâu, bỏ về luôn.', 'Cửa hàng thiếu người, đứng chờ cả buổi không ai ra.'],
    stock: ['Đi xa tới mà hết hàng, uổng công.', 'Mẫu trưng bày mà không có hàng để mua.'],
    defect: ['Dùng vài hôm thì hàng bị lỗi, đường may bung chỉ.', 'Đệm xẹp lún chỉ sau thời gian ngắn, nghi hàng lỗi.'],
    price: ['Giá hơi chát so với chất lượng.', 'Chỗ khác bán rẻ hơn mà vẫn tương tự.'],
    fake: ['Nghi hàng giả, hàng nhái mác hãng. Mọi người cẩn thận!', 'Hàng không rõ nguồn gốc, tem mác lạ. Sẽ báo cơ quan chức năng.']
  };
  var MID = ['Tạm ổn, không có gì đặc biệt.', 'Hàng bình thường, giá được.', 'Dùng được, nhân viên tư vấn ở mức khá.'];
  var POS = ['Nhân viên tư vấn nhiệt tình, hàng đẹp.', 'Đệm nằm êm, giá hợp lý, sẽ giới thiệu bạn bè.', 'Shop sạch sẽ, nhiều mẫu để chọn.', 'Chăn ga mềm mịn, đúng như mô tả.', 'Mua lần thứ hai rồi, rất hài lòng.'];
  var POS_SHIP = ['Giao hàng nhanh, đóng gói cẩn thận.'];
  var RV = G.reviews = {
    avg: function () { return G.state.avgRating; },
    setAvg: function (x) { G.state.avgRating = G.clamp(x, 1, 5); },
    gen: function (r, meta) {
      meta = meta || {}; var parts = [], tags = [];
      if (r <= 3) {
        if (meta.late) { parts.push(G.pick(NEG.late)); tags.push('late'); }
        if (meta.damaged) { parts.push(G.pick(NEG.damaged)); tags.push('damaged'); }
        if (meta.hiddenDefect) { parts.push(G.pick(NEG.defect)); tags.push('defect'); }
        if (meta.angry === 'wait' || (meta.wait || 0) > 15) { parts.push(G.pick(NEG.wait)); tags.push('wait'); }
        if (meta.angry === 'stock') { parts.push(G.pick(NEG.stock)); tags.push('stock'); }
        if ((meta.priceR || 0) > 1.1 && parts.length < 2) { parts.push(G.pick(NEG.price)); tags.push('price'); }
        if (r <= 1 && (meta.fake || (!parts.length && G.chance(0.12)))) { parts.push(G.pick(NEG.fake)); tags.push('fake'); }
        if (!parts.length) parts.push(r === 3 ? G.pick(MID) : G.pick(NEG.price.concat(NEG.wait)));
      } else {
        parts.push(meta.ship && G.chance(0.5) ? G.pick(POS_SHIP) : G.pick(POS));
        if (meta.seller && G.chance(0.6)) parts.push('Bạn ' + meta.seller + ' tư vấn rất tận tình.');
      }
      var tsk = meta.sku && G.skus[meta.sku] && G.skus[meta.sku].cw ? G.skus[meta.sku] : null;
      if (tsk && r >= 4 && G.chance(0.4)) parts.push(G.pick(['Màu ' + tsk.cw.name + ' đẹp như ảnh, mua đúng mã ' + tsk.cw.code + '.', 'Bộ ' + tsk.cw.code + ' ' + tsk.cw.mat + ' mềm, màu lên rất xinh.', 'Phối đúng màu như Lookbook, phòng ngủ đẹp hẳn.']));
      else if (tsk && r <= 3 && (meta.hiddenDefect || meta.claim || G.chance(0.2))) { parts.push(G.pick(['Giặt vài lần bị phai màu.', 'Màu ngoài đời lệch so với ảnh.', 'Vải ' + tsk.cw.mat + ' hơi xù sau khi giặt.'])); tags.push('defect'); }
      var gk = meta.sku && G.skus[meta.sku] ? G.skus[meta.sku].grade : 0;
      if (gk === 2 && (r <= 2 ? (meta.hiddenDefect || meta.claim || G.chance(0.35)) : false)) { parts.push(G.pick(['Mua hàng loại 2 rẻ nhưng nhanh hỏng, hối hận.', 'Hàng loại 2 dùng vài tuần đã xuống cấp.'])); tags.push('defect'); }
      else if (gk === 2 && r >= 4 && G.chance(0.25)) parts.push('Hàng loại 2 giá mềm, dùng tạm ổn.');
      else if (gk === 1 && r >= 4 && G.chance(0.35)) parts.push(G.pick(['Hàng loại 1 chắc chắn, đáng đồng tiền.', 'Loại 1 chất lượng hơn hẳn hàng thường.']));
      var nm = G.state && G.state.shopName; if (nm && r >= 4 && G.chance(0.3)) parts.push('Recommend ' + nm + '!');
      return { text: parts.join(' '), tags: tags };
    },
    add: function (r, meta) {
      var s = G.state; meta = meta || {};
      s.avgRating = G.clamp(s.avgRating + (r - s.avgRating) * 0.015, 1, 5); s.ratingN++;
      s.today.ratingSum += r; s.today.ratingN++;
      var forced = meta.late || meta.damaged || meta.b2b || meta.special || meta.hiddenDefect;
      var p = forced ? 0.9 : (r <= 2 ? 0.7 : r >= 5 ? 0.35 : 0.2);
      if (G.chance(p)) {
        var g = RV.gen(r, meta);
        var rec = { id: s.revs.nextId++, day: s.day, rating: r, text: g.text, tags: g.tags, author: G.pick(G.data.lastNames) + ' ' + G.pick(G.data.firstNames), replied: false, reply: null, penalized: false, sku: meta.sku || null };
        s.revs.list.unshift(rec); if (s.revs.list.length > 80) s.revs.list.pop();
        if (g.tags.indexOf('fake') >= 0) s.events.fakeReports++;
      }
      G.emit('reviewAdded', { rating: r, meta: meta });
    },
    byId: function (id) { return G.state.revs.list.filter(function (x) { return x.id === id; })[0]; },
    unanswered: function () { return G.state.revs.list.filter(function (x) { return !x.replied; }); },
    replyRate: function () { var r = G.state.revs; return r.total ? r.answered / r.total : 0; },
    // type: thanks | sorry | explain | rebut. text: nội dung tự do (tuỳ chọn)
    reply: function (id, type, text) {
      var s = G.state, rv = RV.byId(id); if (!rv || rv.replied) return { ok: false, msg: 'Đánh giá không hợp lệ' };
      text = (text || '').trim();
      if (text) {
        if (text.length < 5) return { ok: false, msg: 'Nội dung phản hồi quá ngắn' };
        type = rv.rating >= 4 ? 'thanks' : 'explain';
      }
      var msg = '', up = 0;
      if (type === 'thanks') { s.rep = G.clamp(s.rep + 0.1, 0, 100); msg = 'Cảm ơn bạn đã ủng hộ ' + s.shopName + '!'; }
      else if (type === 'sorry') {
        if (s.money < 100000) return { ok: false, msg: 'Không đủ tiền tặng voucher' };
        G.econ.expense(100000, 'fees'); s.rep = G.clamp(s.rep + 0.2, 0, 100); msg = 'Xin lỗi bạn, ' + s.shopName + ' tặng voucher 100k.';
        if (rv.rating <= 3 && G.chance(0.45)) { up = 2; }
      } else if (type === 'explain') { s.rep = G.clamp(s.rep + 0.15, 0, 100); msg = s.shopName + ' xin giải thích và rút kinh nghiệm.'; if (rv.rating <= 3 && G.chance(0.2)) up = 1; }
      else if (type === 'rebut') {
        s.rep = G.clamp(s.rep - 1, 0, 100); s.avgRating = G.clamp(s.avgRating - 0.02, 1, 5); msg = G.state.shopName + ' không đồng ý với đánh giá này!';
        if (G.chance(0.25)) { RV.add(1, { angry: 'rebut', force: true }); }
      }
      if (text) { rv.reply = text; } else rv.reply = msg;
      rv.replied = true; rv.replyType = type;
      if (up) { rv.rating = Math.min(5, rv.rating + up); s.avgRating = G.clamp(s.avgRating + up * 0.015, 1, 5); rv.upgraded = true; }
      s.revs.answered++; s.revs.total++;
      G.emit('reviewReplied', rv);
      return { ok: true, msg: up ? 'Khách hài lòng và nâng đánh giá lên ' + rv.rating + '★!' : (type === 'rebut' ? 'Phản bác gay gắt - rủi ro mất danh tiếng.' : 'Đã phản hồi.') };
    }
  };
  G.conversionMods.push(function () { return 1 + 0.08 * RV.replyRate(); });
  // CSKH tự phản hồi đánh giá ★3-5: ★4-5 cảm ơn, ★3 giải thích. ★1-2 để người chơi tự xử lý. Không bao giờ phản bác.
  RV.cskhCap = function () { var t = 0; G.staff.byRole('cskh').forEach(function (x) { if (x.status === 'ok') t += 8 + 4 * x.stars; }); return t; };
  RV.autoReply = function () {
    var s = G.state; if (!s.revs.auto) return 0;
    var cap = RV.cskhCap(), n = 0; if (!cap) return 0;
    var cs = G.staff.byRole('cskh').filter(function (x) { return x.status === 'ok'; });
    RV.unanswered().filter(function (x) { return x.rating >= 3; }).sort(function (a, b) { return a.rating - b.rating; }).forEach(function (rv) {
      if (n >= cap) return;
      var t = rv.rating >= 4 ? 'thanks' : 'explain';
      var r = RV.reply(rv.id, t); if (!r.ok) return; rv.auto = true; n++;
    });
    if (n) cs.forEach(function (x) { G.staff.addXp(x, Math.ceil(n / cs.length)); });
    return n;
  };
  G.on('dayStart', function () {
    var s = G.state, n = 0, auto = RV.autoReply();
    if (auto) G.notify.push({ title: '💬 CSKH đã phản hồi ' + auto + ' đánh giá', text: 'Nhân viên chăm sóc khách hàng tự trả lời đánh giá của khách.', type: 'good', sound: false, toast: false });
    s.revs.list.forEach(function (rv) {
      if (!rv.replied && !rv.penalized && s.day - rv.day > 3 && rv.rating <= 3) { rv.penalized = true; n++; s.revs.total++; }
    });
    if (n) { s.rep = G.clamp(s.rep - 0.1 * n, 0, 100); G.notify.push({ title: n + ' đánh giá chưa được phản hồi', text: 'Trên 3 ngày chưa trả lời: trừ nhẹ danh tiếng.', type: 'warn', sound: false, toast: false }); }
    if (s.day % 10 === 0 && s.events.fakeReports > 0) s.events.fakeReports--;
  });
})();
