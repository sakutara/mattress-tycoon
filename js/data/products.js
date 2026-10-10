/* Loại sản phẩm, dòng (line) và SKU (dòng x kích thước). Dòng có thể thêm động khi hãng ra mẫu mới. */
(function () {
  'use strict';
  var G = window.G;
  G.data.types = {
    chan: { name: 'Ruột chăn', vol: 2, cap: 8, sizes: 'big', icon: '🛏' },
    ga: { name: 'Bộ chăn ga gối', vol: 1, cap: 12, sizes: 'big', icon: '🧺' },
    goi: { name: 'Ruột gối', vol: 1, cap: 15, sizes: 'one', icon: '💤' },
    dem: { name: 'Đệm', vol: 6, cap: 3, sizes: 'dem', icon: '🛌' },
    topper: { name: 'Topper', vol: 2, cap: 6, sizes: 'big', icon: '📏' },
    phukien: { name: 'Phụ kiện', vol: 0.5, cap: 15, sizes: 'one', icon: '🧷' }
  };
  G.data.typeOrder = ['dem', 'topper', 'chan', 'ga', 'goi', 'phukien'];
  G.data.demSubs = { caosu: 'Cao su', loxo: 'Lò xo', foam: 'Foam', bongep: 'Bông ép' };
  var SIZES = {
    dem: [['1m2', 0.75], ['1m6', 1], ['1m8', 1.18], ['2m2', 1.5]],
    big: [['1m6', 1], ['1m8', 1.12], ['2m2', 1.3]],
    one: [['Tiêu chuẩn', 1]]
  };
  // [id, brand, tên dòng, loại, loại đệm, giá niêm yết (cỡ chuẩn), chất lượng 1-5, giai đoạn ban đầu 0..2]
  var L = [
    // hàng phổ thông không thương hiệu: Loại 1 (tốt hơn, đắt hơn, ít lỗi) và Loại 2 (rẻ, nhiều lỗi). id cũ cho_* = Loại 2 (l2_*)
    ['l2_goi', 'cho', 'Gối bông ép thường', 'goi', '', 60000, 1, 1, 2],
    ['l2_ga', 'cho', 'Ga cotton thường', 'ga', '', 180000, 1, 1, 2],
    ['l2_chan', 'cho', 'Chăn bông thường', 'chan', '', 260000, 1, 1, 2],
    ['l2_dem', 'cho', 'Đệm bông ép mỏng', 'dem', 'bongep', 900000, 1, 1, 2],
    ['l2_vo', 'cho', 'Vỏ gối cotton', 'phukien', '', 40000, 1, 1, 2],
    ['l1_goi', 'cho', 'Gối bông ép thường', 'goi', '', 85000, 2, 1, 1],
    ['l1_ga', 'cho', 'Ga cotton thường', 'ga', '', 250000, 2, 1, 1],
    ['l1_chan', 'cho', 'Chăn bông thường', 'chan', '', 360000, 2, 1, 1],
    ['l1_dem', 'cho', 'Đệm bông ép mỏng', 'dem', 'bongep', 1250000, 2, 1, 1],
    ['l1_vo', 'cho', 'Vỏ gối cotton', 'phukien', '', 58000, 2, 1, 1],

    ['sh_chan', 'songhuong', 'Chăn bông', 'chan', '', 380000, 2, 1],
    ['sh_dem', 'songhuong', 'Đệm bông ép gấp 3', 'dem', 'bongep', 1600000, 2, 1],
    ['sh_ga', 'songhuong', 'Ga cotton hoa', 'ga', '', 260000, 2, 1],
    ['sh_goi', 'songhuong', 'Gối bông', 'goi', '', 90000, 2, 2],

    ['hv_dem', 'hanvigo', 'Đệm bông ép', 'dem', 'bongep', 3200000, 3, 1],
    ['hv_ga', 'hanvigo', 'Ga cotton', 'ga', '', 420000, 3, 1],
    ['hv_goi', 'hanvigo', 'Gối sợi', 'goi', '', 160000, 3, 0],
    ['hv_chan', 'hanvigo', 'Chăn lông cừu', 'chan', '', 650000, 3, 2],

    ['vt_dem', 'vanthanh', 'Đệm lò xo túi', 'dem', 'loxo', 5500000, 3, 1],
    ['vt_foam', 'vanthanh', 'Đệm foam', 'dem', 'foam', 3800000, 3, 1],
    ['vt_top', 'vanthanh', 'Topper foam', 'topper', '', 1200000, 3, 0],

    ['ev_ga', 'evenon', 'Chăn ga Lụa Tencel', 'ga', '', 1400000, 4, 1],
    ['ev_goi', 'evenon', 'Gối lông vũ', 'goi', '', 480000, 4, 1],
    ['ev_chan', 'evenon', 'Chăn lông vũ', 'chan', '', 1900000, 4, 2],
    ['ev_pk', 'evenon', 'Bảo vệ đệm', 'phukien', '', 350000, 4, 1],

    ['la_dem', 'liena', 'Đệm cao su', 'dem', 'caosu', 9000000, 4, 1],
    ['la_goi', 'liena', 'Gối massage', 'goi', '', 520000, 3, 0],
    ['la_top', 'liena', 'Topper cao su', 'topper', '', 2400000, 4, 1],

    ['kd_dem', 'kymdang', 'Đệm cao su thiên nhiên', 'dem', 'caosu', 14000000, 5, 1],
    ['kd_goi', 'kymdang', 'Gối cao su', 'goi', '', 650000, 4, 1],
    ['kd_top', 'kymdang', 'Topper cao su thiên nhiên', 'topper', '', 3200000, 5, 0],

    ['dl_dem', 'dunlopello', 'Đệm cao su Latex', 'dem', 'caosu', 19000000, 5, 1],
    ['dl_goi', 'dunlopello', 'Gối Latex', 'goi', '', 900000, 5, 1],

    ['se_dem', 'seely', 'Đệm lò xo khách sạn 5 sao', 'dem', 'loxo', 28000000, 5, 1],
    ['se_top', 'seely', 'Topper 5 sao', 'topper', '', 4500000, 5, 0],
    ['se_ga', 'seely', 'Bộ ga 5 sao', 'ga', '', 2800000, 5, 1],

    ['tp_dem', 'tempor', 'Đệm foam hoạt tính', 'dem', 'foam', 35000000, 5, 1],
    ['tp_goi', 'tempor', 'Gối foam hoạt tính', 'goi', '', 1500000, 5, 0],
    ['tp_ga', 'tempor', 'Bộ chăn ga Cloud', 'ga', '', 3000000, 5, 1],

    ['own_dem', 'own', 'Đệm cao su OEM', 'dem', 'caosu', 8000000, 3, 1],
    ['own_ga', 'own', 'Bộ ga OEM', 'ga', '', 700000, 3, 1],
    ['own_goi', 'own', 'Gối OEM', 'goi', '', 250000, 3, 1],
    ['own_chan', 'own', 'Chăn OEM', 'chan', '', 900000, 3, 1]
  ];
  // ---------- BỘ CHĂN GA GỐI theo bộ sưu tập + màu (mã màu kiểu hãng thật) ----------
  // [mã, tên màu, màu chính, màu phụ, hoa văn (tron/ke/hoa/hoatiet), họ màu (trang/be/xam/xanh/hong/hoa), giai đoạn đầu]
  var CW = {
    sh_ga: { mat: 'cotton', coll: 'Cotton', list: [['SH-3021', 'Kẻ Caro Be', '#EFE0C8', '#CFAF86', 'ke', 'be', 1], ['SH-3015', 'Hoa Nhí Hồng', '#F8CAD6', '#E58BA4', 'hoa', 'hong', 1], ['SH-3008', 'Xanh Dương Trơn', '#B8D8F2', '#7FB1DE', 'tron', 'xanh', 1], ['SH-3030', 'Trắng Kem', '#FBF6EA', '#E8DCC2', 'tron', 'trang', 2]] },
    hv_ga: { mat: 'cotton', coll: 'Cotton', list: [['HV-118', 'Hồng Pastel', '#F9CFDB', '#EC9DB5', 'tron', 'hong', 1], ['HV-120', 'Xanh Mint', '#BDEBD6', '#7FCBA8', 'tron', 'xanh', 1], ['HV-102', 'Xám Ghi', '#CBCDD6', '#9EA2B2', 'ke', 'xam', 1], ['HV-110', 'Be Kem', '#F1E4CE', '#D8C29A', 'tron', 'be', 2]] },
    ev_ga: { mat: 'tencel', coll: 'Lụa Tencel', list: [['EV-2405', 'Xanh Mint', '#B6E8D4', '#6FC3A0', 'tron', 'xanh', 1], ['EV-2411', 'Hồng Phấn', '#F6C7D6', '#E48CAA', 'tron', 'hong', 1], ['EV-2398', 'Xám Lụa', '#D3D4DE', '#A2A5B8', 'tron', 'xam', 1], ['EV-2420', 'Trắng Ngà', '#FAF4E6', '#E6D8B8', 'tron', 'trang', 1], ['EV-2432', 'Họa Tiết Lá', '#CFE8D2', '#6BAE7E', 'hoatiet', 'hoa', 0]] },
    se_ga: { mat: 'lụa satin', coll: 'Satin 5 sao', list: [['SE-5101', 'Trắng Ngà', '#FBF6EA', '#E8DCC0', 'tron', 'trang', 1], ['SE-5110', 'Xám Khói', '#C2C4D0', '#8E92A6', 'tron', 'xam', 1], ['SE-5122', 'Be Champagne', '#EBDCC0', '#C9AE80', 'tron', 'be', 1]] },
    tp_ga: { mat: 'microfiber cao cấp', coll: 'Cloud', list: [['TM-901', 'Trắng Ngà', '#FAF5EA', '#E4D8BE', 'tron', 'trang', 1], ['TM-905', 'Xám Titan', '#B9BCC8', '#8588A0', 'tron', 'xam', 1]] },
    own_ga: { mat: 'cotton', coll: 'Home', list: [['NM-01', 'Trắng Tinh', '#FDFBF4', '#E9E2CE', 'tron', 'trang', 1], ['NM-02', 'Xanh Biển', '#B3D7F0', '#78AEDB', 'tron', 'xanh', 1], ['NM-03', 'Hồng Đào', '#F9D2C6', '#EB9E8A', 'tron', 'hong', 1], ['NM-04', 'Kẻ Sọc Xám', '#D6D8E0', '#A1A5B5', 'ke', 'xam', 1]] },
    l1_ga: { mat: 'cotton', coll: 'Cotton phổ thông Loại 1', list: [['PT-101', 'Trắng', '#FCFAF2', '#E8E1CC', 'tron', 'trang', 1], ['PT-102', 'Xanh Nhạt', '#C4DEF2', '#8BB6DA', 'tron', 'xanh', 1], ['PT-103', 'Hoa Nhí', '#F7D6DF', '#E6A0B5', 'hoa', 'hoa', 1]] },
    l2_ga: { mat: 'microfiber', coll: 'Poly phổ thông Loại 2', list: [['PT-201', 'Trắng Đục', '#F2EFE6', '#D8D2BF', 'tron', 'trang', 1], ['PT-202', 'Hoa Lớn', '#F4C8C8', '#DE8C8C', 'hoa', 'hoa', 1], ['PT-203', 'Caro Xám', '#D9DAE0', '#A9ACB8', 'ke', 'xam', 1]] }
  };
  G.data.cwPalette = [['Xanh Mint', '#B6E8D4', '#6FC3A0', 'tron', 'xanh'], ['Hồng Phấn', '#F6C7D6', '#E48CAA', 'tron', 'hong'], ['Xám Lụa', '#D3D4DE', '#A2A5B8', 'tron', 'xam'], ['Trắng Ngà', '#FAF4E6', '#E6D8B8', 'tron', 'trang'], ['Be Kem', '#F1E4CE', '#D8C29A', 'tron', 'be'], ['Xanh Dương Nhạt', '#B8D8F2', '#7FB1DE', 'tron', 'xanh'], ['Tím Lavender', '#DCD0F2', '#A890D8', 'tron', 'hong'], ['Vàng Bơ', '#FBEDB8', '#E9CB6A', 'tron', 'be'], ['Kẻ Caro Be', '#EFE0C8', '#CFAF86', 'ke', 'be'], ['Kẻ Sọc Xanh', '#CFE3F4', '#86B3DA', 'ke', 'xanh'], ['Hoa Nhí', '#F8D6E0', '#E58BA4', 'hoa', 'hong'], ['Họa Tiết Lá', '#CFE8D2', '#6BAE7E', 'hoatiet', 'hoa'], ['Họa Tiết Hình Học', '#E2DCF0', '#9A8CC4', 'hoatiet', 'hoa'], ['Xanh Rêu', '#C9DDB4', '#8DB26A', 'tron', 'xanh'], ['Cam Đào', '#FAD8C0', '#EDA27C', 'tron', 'hong'], ['Xanh Ngọc Bích', '#9FDDDB', '#4FB3B0', 'tron', 'xanh'], ['Xanh Navy', '#6E8BC4', '#34528C', 'tron', 'xanh'], ['Đỏ Rượu Vang', '#D98593', '#9C3F50', 'tron', 'hong'], ['Xám Than', '#9A9FAF', '#5E6375', 'tron', 'xam'], ['Nâu Cà Phê', '#D2B196', '#9A7357', 'tron', 'be'], ['Hồng Sen', '#F2A9C0', '#D9709A', 'tron', 'hong'], ['Vàng Chanh', '#F3F0A0', '#D4CE5A', 'tron', 'be'], ['Xanh Olive', '#B5BE8A', '#818F4E', 'tron', 'xanh'], ['Tím Khói', '#B7A9C9', '#85739E', 'tron', 'hong'], ['Kẻ Sọc Hồng', '#F7D2DC', '#E597AE', 'ke', 'hong'], ['Hoa Cúc', '#FFF1C2', '#F0B94C', 'hoa', 'hoa'], ['Họa Tiết Sóng', '#CBE6F2', '#69A8C7', 'hoatiet', 'hoa'], ['Trắng Tinh', '#FDFBF4', '#E9E2CE', 'tron', 'trang']];
  G.data.cwFamilies = { trang: 'Trắng / ngà', be: 'Be / kem', xam: 'Xám', xanh: 'Xanh', hong: 'Hồng / tím', hoa: 'Họa tiết' };
  G.data.cwPatterns = { tron: 'Trơn', ke: 'Kẻ', hoa: 'Hoa', hoatiet: 'Họa tiết' };
  G.data.cwPrefix = { songhuong: 'SH', hanvigo: 'HV', vanthanh: 'VT', evenon: 'EV', liena: 'LA', kymdang: 'KD', dunlopello: 'DL', seely: 'SE', tempor: 'TM', own: 'NM', cho: 'PT' };
  // màu mới khi hãng ra BST: tên + màu KHÁC NHAU trong cùng bộ sưu tập (taken = các màu đã có), mã duy nhất. seed != null -> chọn xác định (dùng khi sửa save cũ)
  function hexRGB(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  G.cwDist = function (a, b) { var x = hexRGB(a), y = hexRGB(b); return Math.sqrt(Math.pow(x[0] - y[0], 2) + Math.pow(x[1] - y[1], 2) + Math.pow(x[2] - y[2], 2)); };
  function lcg(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  G.newColorway = function (brandId, gen, k, taken, seed) {
    taken = taken || []; var rnd = seed == null ? Math.random : lcg(seed), pal = G.data.cwPalette, pre = G.data.cwPrefix[brandId] || 'XX', idx = [], i;
    for (i = 0; i < pal.length; i++) idx.push(i);
    for (i = idx.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    function okc(p) { return taken.every(function (c) { return c.name !== p[0] && G.cwDist(c.hex, p[1]) >= 70 && G.cwDist(c.hex2, p[2]) >= 45; }); }
    var pick = null; for (i = 0; i < idx.length; i++) if (okc(pal[idx[i]])) { pick = pal[idx[i]]; break; }
    if (!pick) { var best = -1; idx.forEach(function (ix) { var p = pal[ix], d = Math.min.apply(null, taken.map(function (c) { return taken.some(function (x) { return x.name === p[0]; }) ? 0 : G.cwDist(c.hex, p[1]); }).concat([999])); if (d > best) { best = d; pick = p; } }); }
    var num = (gen * 100 + Math.floor(rnd() * 90) + 10) * 10 + (k || 0), code = pre + '-' + num, guard = 0;
    while (taken.some(function (c) { return c.code === code; }) && guard++ < 50) { num += 7; code = pre + '-' + num; }
    return { code: code, name: pick[0], hex: pick[1], hex2: pick[2], pat: pick[3], fam: pick[4], mat: '' };
  };
  var SETM = 2.6; // giá bộ = 2.6 lần giá ga lẻ cũ
  G.data.SETM = SETM;
  G.lines = {}; G.lineList = []; G.skus = {}; G.skuList = [];
  // bổ sung cw cho dòng 'ga' lưu từ bản cũ (không có cw)
  function ensureCW(d) {
    if (d.type !== 'ga' || d.cw) return;
    var fam = CW[d.family] && CW[d.family].list, h = 0, i; for (i = 0; i < d.id.length; i++) h = (h * 31 + d.id.charCodeAt(i)) >>> 0;
    var c = G.newColorway(d.brand, d.gen || 1, h % 7); d.cw = c; d.price = Math.round(d.price * SETM / 1000) * 1000; d.coll = d.baseName || d.name;
  }
  G.registerLine = function (d) {
    if (G.lines[d.id]) return G.lines[d.id];
    ensureCW(d);
    var line = {
      id: d.id, brand: d.brand, name: d.name, baseName: d.baseName || d.name, type: d.type, sub: d.sub || '',
      grade: d.grade || 0, cw: d.cw || null, mat: d.mat || '', coll: d.coll || d.baseName || d.name, relDay: d.relDay || 0, price: d.price, q: d.q, stage0: d.stage0 == null ? 1 : d.stage0, family: d.family || d.id, gen: d.gen || 1, skus: []
    };
    G.lines[line.id] = line; G.lineList.push(line);
    var br = G.brandById[line.brand], ty = G.data.types[line.type];
    SIZES[ty.sizes].forEach(function (sz) {
      var list = Math.round(line.price * sz[1] / 1000) * 1000;
      var sku = {
        id: line.id + '|' + sz[0], line: line.id, brand: line.brand, type: line.type, sub: line.sub, size: sz[0],
        list: list, cost: Math.round(list * br.costRatio / 100) * 100, q: line.q, vol: ty.vol, cap: ty.cap,
        grade: line.grade, cw: line.cw, name: line.name + (ty.sizes === 'one' ? '' : ' ' + sz[0])
      };
      if (line.cw) sku.cost = Math.round(list * br.costRatio / 100) * 100;
      sku.label = (br.noBrand && !br.own ? '' : br.short + ' ') + sku.name + (sku.grade ? ' (Loại ' + sku.grade + ')' : '');
      G.skus[sku.id] = sku; G.skuList.push(sku); line.skus.push(sku);
    });
    return line;
  };
  L.forEach(function (r) {
    var cwd = r[3] === 'ga' && CW[r[0]];
    if (!cwd) { G.registerLine({ id: r[0], brand: r[1], name: r[2], type: r[3], sub: r[4], price: r[5], q: r[6], stage0: r[7], grade: r[8] }); return; }
    var br = G.brandById[r[1]], pieces = (br.tier || 0) >= 3 ? 5 : 4;
    cwd.list.forEach(function (c, i) {
      var cw = { code: c[0], name: c[1], hex: c[2], hex2: c[3], pat: c[4], fam: c[5], mat: cwd.mat, pieces: pieces };
      G.registerLine({ id: r[0] + '_' + (i + 1), family: r[0], brand: r[1], name: cwd.coll + ' ' + c[0] + ' ' + c[1], baseName: cwd.coll, coll: cwd.coll, mat: cwd.mat, cw: cw, type: 'ga', sub: '', price: Math.round(r[5] * SETM / 1000) * 1000, q: r[6], stage0: c[6], grade: r[8] });
    });
  });
  // tp_ga: thêm dòng bộ chăn ga gối cho Tempor (siêu cao cấp)
})();
