/* Cấp cửa hàng & mốc mở khóa. rent = tiền thuê/tháng, power = điện/ngày, whBase = sức chứa kho (đơn vị khối lượng) */
(function () {
  'use strict';
  var G = window.G;
  G.data.levels = [
    { id: 0, name: 'Sạp chợ', req: { revenue: 0, rep: 0 }, fee: 0, shelves: 2, beds: 1, rent: 3e6, power: 30e3, whBase: 60, whUpMax: 2, maxTier: 1, traffic: 4, cols: 12, rows: 8,
      desc: 'Chủ tự bán hàng ở sạp chợ (có thể thuê nhân viên bất cứ lúc nào). Chỉ nhập được hàng phổ thông (Loại 1/2) và hãng bình dân.', unlocks: ['2 kệ trưng bày, 1 chỗ trưng bày đệm', 'Hãng bình dân (Sông Hường) & hàng phổ thông Loại 1/2', 'Thuê nhân viên mọi vai trò, không giới hạn số lượng (chú ý quỹ lương)'] },
    { id: 1, name: 'Cửa hàng nhỏ', req: { revenue: 50e6, rep: 0 }, fee: 20e6, minCapital: 40e6, shelves: 4, beds: 2, rent: 8e6, power: 60e3, whBase: 120, whUpMax: 3, maxTier: 2, traffic: 7, cols: 14, rows: 9,
      desc: 'Có mặt bằng riêng, nhiều khách hơn.', unlocks: ['4 kệ, 2 chỗ đệm', 'Hãng phân khúc trung (Hanvigo, Vạn Thanh)', 'Thuê kho ngoài'] },
    { id: 2, name: 'Cửa hàng mặt phố', req: { revenue: 200e6, rep: 30 }, fee: 60e6, minCapital: 150e6, shelves: 6, beds: 4, rent: 20e6, power: 120e3, whBase: 200, whUpMax: 4, maxTier: 3, traffic: 10, cols: 16, rows: 10,
      desc: 'Mặt phố đông người, có khu trưng bày đệm.', unlocks: ['6 kệ, 4 chỗ đệm', 'Hãng trung - cao (Evenon, Liên Ả)'] },
    { id: 3, name: 'Showroom', req: { revenue: 1e9, rep: 60 }, fee: 250e6, minCapital: 600e6, shelves: 8, beds: 6, rent: 50e6, power: 300e3, whBase: 350, whUpMax: 5, maxTier: 4, traffic: 14, cols: 18, rows: 11, b2b: true,
      desc: 'Showroom lớn, nhận đơn khách sạn/resort, có kho riêng.', unlocks: ['8 kệ, 6 chỗ đệm', 'Hãng cao cấp (Kymdang, Dunlopello)', 'Nhập thẳng nhà máy (MOQ)', 'Đơn khách sạn / resort (cần NV Sale B2B & Giao hàng để làm tốt)'] },
    { id: 4, name: 'Đại lý ủy quyền', req: { revenue: 5e9, rep: 0 }, fee: 1e9, minCapital: 2.5e9, shelves: 10, beds: 8, rent: 120e6, power: 600e3, whBase: 600, whUpMax: 6, maxTier: 5, traffic: 18, cols: 22, rows: 12, b2b: true, oem: true,
      desc: 'Đại lý ủy quyền chính thức của các hãng lớn.', unlocks: ['10 kệ, 8 chỗ đệm', "Simmon's / Seely, Tempor", 'Xưởng OEM: hàng thương hiệu riêng', 'Đơn resort lớn, giá trị cao hơn'] },
    { id: 5, name: 'Chuỗi cửa hàng', req: { revenue: 20e9, rep: 0 }, fee: 4e9, minCapital: 10e9, shelves: 12, beds: 10, rent: 250e6, power: 1.2e6, whBase: 1000, whUpMax: 8, maxTier: 5, traffic: 24, cols: 24, rows: 14, b2b: true, oem: true, branches: true,
      desc: 'Chuỗi cửa hàng: mở chi nhánh cho thu nhập thụ động.', unlocks: ['12 kệ, 10 chỗ đệm', 'Mở chi nhánh 2, 3 (thu nhập thụ động, cần Quản lý)'] }
  ];
  G.data.shelfSlotsPerUnit = 3;
})();
