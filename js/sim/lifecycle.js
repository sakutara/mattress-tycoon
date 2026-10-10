/* Vòng đời mẫu mã: Mới ra mắt -> Thịnh hành -> Bình thường -> Lỗi thời. Hãng tung dòng mới 30-60 ngày. */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ lineState: {}, dynLines: [], brandRelease: {}, sponsor: {} });
  var NAMES = ['Mới ra mắt', 'Thịnh hành', 'Bình thường', 'Lỗi thời'];
  var DUR = [25, 50, 70]; // số ngày ở mỗi giai đoạn trước khi lùi
  var ROMAN = ['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  var LC = G.life = {
    NAMES: NAMES,
    ACCEPT: [1.08, 1.0, 0.88, 0.6],   // hệ số giá khách chấp nhận (lỗi thời 50-70%)
    DEMAND: [1.5, 1.3, 1.0, 0.35],    // độ hot (trọng số khách hỏi)
    stageOfLine: function (lineId) { var ls = G.state.lineState[lineId]; return ls ? ls.stage : (G.lines[lineId] ? G.lines[lineId].stage0 : 1); },
    stage: function (skuId) { var s = G.skus[skuId]; return s ? LC.stageOfLine(s.line) : 1; },
    name: function (st) { return NAMES[st]; },
    badge: function (st) { return '<span class="stg stg' + st + '">' + NAMES[st] + '</span>'; },
    ensure: function () {
      var s = G.state;
      s.dynLines.forEach(function (d) { G.registerLine(d); });
      LC.dedupeColorways();
      G.lineList.forEach(function (l) { if (!s.lineState[l.id]) s.lineState[l.id] = { stage: l.stage0, since: s.day - G.randInt(0, 10) }; });
      G.data.brands.forEach(function (b) {
        if (b.noBrand) return;
        if (!s.brandRelease[b.id]) s.brandRelease[b.id] = s.day + G.randInt(20, 55);
      });
    },
    // sửa save cũ: màu trùng tên / gần giống nhau trong cùng bộ sưu tập -> đổi màu & tên xác định (không đổi id SKU)
    dedupeColorways: function () {
      var s = G.state, groups = {}, changed = 0;
      G.lineList.forEach(function (l) { if (l.type === 'ga' && l.cw) { var k = l.family + '|' + l.gen; (groups[k] = groups[k] || []).push(l); } });
      Object.keys(groups).forEach(function (k) {
        var keep = [];
        groups[k].slice().sort(function (a, b) { return a.id < b.id ? -1 : 1; }).forEach(function (l, i) {
          var bad = keep.some(function (c) { return c.name === l.cw.name || G.cwDist(c.hex, l.cw.hex) < 60 || c.code === l.cw.code; });
          if (bad) {
            var h = 0, j; for (j = 0; j < l.id.length; j++) h = (h * 31 + l.id.charCodeAt(j)) >>> 0;
            var nc = G.newColorway(l.brand, l.gen, i, keep, h), cw = l.cw; cw.code = nc.code; cw.name = nc.name; cw.hex = nc.hex; cw.hex2 = nc.hex2; cw.pat = nc.pat; cw.fam = nc.fam;
            l.name = l.baseName + ' ' + cw.code + ' ' + cw.name; l.skus.forEach(function (sk) { sk.cw = cw; sk.name = l.name + (G.data.types.ga.sizes === 'one' ? '' : ' ' + sk.size); sk.label = (G.brandById[l.brand].noBrand && !G.brandById[l.brand].own ? '' : G.brandById[l.brand].short + ' ') + sk.name + (sk.grade ? ' (Loại ' + sk.grade + ')' : ''); });
            var d = s.dynLines.filter(function (x) { return x.id === l.id; })[0]; if (d) d.name = l.name; changed++;
          }
          keep.push(l.cw);
        });
      });
      return changed;
    },
    // Hãng tung dòng mới
    release: function (brandId) {
      var s = G.state, b = G.brandById[brandId];
      var fams = {};
      G.lineList.forEach(function (l) { if (l.brand === brandId && (!fams[l.family] || fams[l.family].gen < l.gen)) fams[l.family] = l; });
      var cand = Object.keys(fams).map(function (k) { return fams[k]; }).filter(function (l) { return LC.stageOfLine(l.id) <= 2; });
      if (!cand.length) return null;
      var old = G.pick(cand), gen = old.gen + 1;
      var line, lines = [], oldLines = [old];
      if (old.type === 'ga') {
        oldLines = G.lineList.filter(function (l) { return l.family === old.family && l.gen === old.gen; });
        var n = 2 + (G.chance(0.4) ? 1 : 0), baseP = Math.round(old.price * 1.05 / 10000) * 10000;
        for (var k = 0; k < n; k++) {
          var cw = G.newColorway(brandId, gen, k, lines.map(function (x) { return x.cw; })); cw.mat = old.cw ? old.cw.mat : ''; cw.pieces = old.cw ? old.cw.pieces : 4;
          var dd = { id: old.family + '_g' + gen + '_' + (k + 1), family: old.family, gen: gen, brand: brandId, baseName: old.baseName, coll: old.baseName, mat: cw.mat, cw: cw, name: old.baseName + ' ' + cw.code + ' ' + cw.name, type: 'ga', sub: '', price: baseP, q: Math.min(5, old.q + (G.chance(0.3) ? 1 : 0)), stage0: 0, relDay: s.day };
          s.dynLines.push(dd); var ln = G.registerLine(dd); s.lineState[ln.id] = { stage: 0, since: s.day }; lines.push(ln);
        }
        line = lines[0];
      } else {
        var d = { id: old.family + '_g' + gen, family: old.family, gen: gen, brand: brandId, baseName: old.baseName, name: old.baseName + ' ' + (ROMAN[gen] || gen), type: old.type, sub: old.sub, price: Math.round(old.price * 1.07 / 10000) * 10000, q: Math.min(5, old.q + (G.chance(0.4) ? 1 : 0)), stage0: 0, relDay: s.day };
        s.dynLines.push(d); line = G.registerLine(d); s.lineState[line.id] = { stage: 0, since: s.day }; lines.push(line);
      }
      oldLines.forEach(function (ol) { var os = s.lineState[ol.id]; if (os) { os.stage = Math.min(3, os.stage + 1); os.since = s.day; } });
      var os0 = s.lineState[old.id];
      s.sponsor[brandId] = s.day + 14;
      G.notify.push({ title: b.short + ' ra mắt dòng mới', text: '"' + (old.type === 'ga' ? line.baseName + ' - ' + lines.length + ' màu mới' : line.name) + '" đã có hàng. Dòng cũ "' + old.name + '" lùi xuống ' + NAMES[os0.stage] + '. Hãng có thể tổ chức đào tạo miễn phí.', type: 'info', sound: 'good', toast: false });
      G.emit('lineReleased', { line: line, lines: lines, old: old, brand: brandId });
      return line;
    }
  };
  G.on('init', LC.ensure);
  G.on('dayStart', function () {
    var s = G.state;
    G.lineList.forEach(function (l) {
      var ls = s.lineState[l.id]; if (!ls || ls.stage >= 3) return;
      if (s.day - ls.since >= DUR[ls.stage]) { ls.stage++; ls.since = s.day; if (ls.stage === 3) G.notify.push({ title: 'Mẫu lỗi thời', text: l.name + ' (' + G.brandName(l.brand) + ') đã lỗi thời. Nên xả hàng sớm!', type: 'warn', sound: false, toast: false }); }
    });
    Object.keys(s.brandRelease).forEach(function (bid) {
      var due = s.brandRelease[bid];
      var rel = (s.rel && s.rel[bid]) || 0;
      if (due - s.day === 5 && rel >= 50) G.notify.push({ title: 'Tin riêng từ ' + G.brandName(bid), text: 'Hãng sắp ra dòng mới trong 5 ngày (quan hệ thân thiết nên được báo sớm).', type: 'info', sound: false });
      if (s.day >= due) { LC.release(bid); s.brandRelease[bid] = s.day + G.randInt(30, 60); }
    });
  });
  // hàng phổ thông: Loại 2 khó bán ở cửa hàng cấp cao (khách chấp nhận giá thấp hơn), Loại 1 nhỉnh hơn
  G.acceptMods.push(function (c, sku) {
    var t = G.skus[sku], lv = G.state.level; if (!t || !t.grade) return 1;
    return t.grade === 2 ? (lv >= 3 ? 0.7 : lv >= 2 ? 0.82 : lv >= 1 ? 0.93 : 1) : (lv >= 2 ? 1.05 : 1.02);
  });
})();
