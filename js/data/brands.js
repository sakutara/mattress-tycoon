/* Hãng (tên nhại). tier: 0 = hàng phổ thông/OEM, 1..5 = phân khúc. floor = giá bán tối thiểu / giá niêm yết. costRatio = giá nhập / giá niêm yết. */
(function () {
  'use strict';
  var G = window.G;
  G.data.brands = [
    { id: 'cho', name: 'Hàng phổ thông (không thương hiệu)', short: 'Phổ thông', origin: '', tier: 0, color: '#9e9e9e', floor: 0, costRatio: 0.55, seg: 'Bình dân, không hóa đơn', noBrand: true },
    { id: 'songhuong', name: 'Sông Hường', short: 'Sông Hường', origin: 'Sông Hồng', tier: 1, color: '#e57373', floor: 0.78, costRatio: 0.66, seg: 'Bình dân - trung' },
    { id: 'hanvigo', name: 'Hanvigo', short: 'Hanvigo', origin: 'Hanvico', tier: 2, color: '#64b5f6', floor: 0.85, costRatio: 0.66, seg: 'Trung' },
    { id: 'vanthanh', name: 'Vạn Thanh', short: 'Vạn Thanh', origin: 'Vạn Thành', tier: 2, color: '#81c784', floor: 0.85, costRatio: 0.66, seg: 'Trung' },
    { id: 'evenon', name: 'Evenon', short: 'Evenon', origin: 'Everon', tier: 3, color: '#ba68c8', floor: 0.85, costRatio: 0.65, seg: 'Trung - cao' },
    { id: 'liena', name: 'Liên Ả', short: 'Liên Ả', origin: 'Liên Á', tier: 3, color: '#4db6ac', floor: 0.85, costRatio: 0.65, seg: 'Trung - cao' },
    { id: 'kymdang', name: 'Kymdang', short: 'Kymdang', origin: 'Kymdan', tier: 4, color: '#ffb74d', floor: 0.88, costRatio: 0.64, seg: 'Cao' },
    { id: 'dunlopello', name: 'Dunlopello', short: 'Dunlopello', origin: 'Dunlopillo', tier: 4, color: '#f06292', floor: 0.88, costRatio: 0.64, seg: 'Cao cấp' },
    { id: 'seely', name: "Simmon's / Seely", short: "Simmon's", origin: 'Simmons / Sealy', tier: 5, color: '#5c6bc0', floor: 0.9, costRatio: 0.62, seg: 'Siêu cao cấp' },
    { id: 'tempor', name: 'Tempor', short: 'Tempor', origin: 'Tempur', tier: 5, color: '#26a69a', floor: 0.9, costRatio: 0.62, seg: 'Siêu cao cấp' },
    { id: 'own', name: 'Nhà Mình Home (thương hiệu riêng)', short: 'Nhà Mình', origin: '', tier: 0, color: '#ff7043', floor: 0, costRatio: 0.45, seg: 'Hàng OEM thương hiệu riêng', noBrand: true, own: true }
  ];
  G.brandById = {};
  G.data.brands.forEach(function (b) { G.brandById[b.id] = b; });
  G.brandName = function (id) { return G.brandById[id] ? G.brandById[id].short : id; };
})();
