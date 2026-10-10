/* Vai trò nhân viên, tên, khóa đào tạo */
(function () {
  'use strict';
  var G = window.G;
  // Không giới hạn số lượng NV mỗi vai trò, mở từ đầu game; chi phí lương là giới hạn thực tế
  G.data.roles = [
    { id: 'sales', name: 'Bán hàng', color: '#42a5f5', salary: 7000000, unlock: 0, desc: 'Tư vấn khách tại kệ, tăng tỉ lệ chốt & giỏ hàng. Mỗi NV tư vấn 1 khách một lúc; khách có thể tự phục vụ.' },
    { id: 'b2b', name: 'Sale B2B', color: '#ab47bc', salary: 12000000, unlock: 0, desc: 'Tăng tần suất & giá trị đơn khách sạn/resort, đàm phán giá.' },
    { id: 'accountant', name: 'Kế toán', color: '#26a69a', salary: 10000000, unlock: 0, desc: 'Giảm thuế/phí 5-10%, giảm thất thoát, mở báo cáo chi tiết.' },
    { id: 'warehouse', name: 'Thủ kho', color: '#8d6e63', salary: 8000000, unlock: 0, desc: 'Tự bổ sung kệ từ kho, kiểm hàng tốt hơn, gợi ý & tự động đặt hàng.' },
    { id: 'delivery', name: 'Giao hàng / lắp đặt', color: '#ffa726', salary: 8000000, unlock: 0, desc: 'Cần cho đơn lớn & giao tận nhà: tự giao đơn của khách trong ngày theo lịch chuyến, miễn phí ship.' },
    { id: 'marketing', name: 'Marketing', color: '#ec407a', salary: 9000000, unlock: 0, desc: 'Tăng lượng khách, chạy chiến dịch.' },
    { id: 'cskh', name: 'Chăm sóc khách hàng', color: '#26C6DA', salary: 7500000, unlock: 0, desc: 'Xử lý bảo hành / đổi trả: tự duyệt các ca rõ ràng theo chính sách, chuyển ca khó cho chủ, giảm ca gian lận.' },
    { id: 'manager', name: 'Quản lý cửa hàng', color: '#ef5350', salary: 18000000, unlock: 0, desc: 'Buff toàn bộ NV, tự động chia ca, cần cho chi nhánh.' }
  ];
  G.roleById = {};
  G.data.roles.forEach(function (r) { G.roleById[r.id] = r; });
  G.data.starMult = [0, 1, 1.35, 1.8];
  G.data.xpForStar = [0, 0, 100, 300]; // xp cần để đạt sao 2, 3
  G.data.firstNames = ['Lan', 'Hương', 'Mai', 'Linh', 'Trang', 'Thảo', 'Hà', 'Ngọc', 'Phương', 'Yến', 'Nam', 'Hùng', 'Tuấn', 'Dũng', 'Long', 'Minh', 'Khánh', 'Quân', 'Sơn', 'Hải', 'Bích', 'Thu', 'Oanh', 'Vân'];
  G.data.lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
  G.data.shifts = {
    off: { label: 'Nghỉ', from: 0, to: 0, short: '—' },
    am: { label: 'Ca sáng', from: 480, to: 840, short: 'Sáng' },
    pm: { label: 'Ca chiều', from: 840, to: 1260, short: 'Chiều' },
    full: { label: 'Full ngày', from: 480, to: 1260, short: 'Full' }
  };
  // Khóa học. form: internal / expert / sponsor
  G.data.courses = [
    { id: 'tuvan', role: 'sales', name: 'Kỹ năng tư vấn & chốt đơn', cost: 3000000, xp: 60 },
    { id: 'brand', role: 'sales', name: 'Kiến thức sản phẩm hãng', cost: 4000000, xp: 40, brand: true },
    { id: 'b2b', role: 'b2b', name: 'Đàm phán B2B', cost: 5000000, xp: 60 },
    { id: 'ketoan', role: 'accountant', name: 'Phần mềm kế toán & thuế', cost: 4000000, xp: 60 },
    { id: 'kho', role: 'warehouse', name: 'Quản lý kho', cost: 3000000, xp: 60 },
    { id: 'giaohang', role: 'delivery', name: 'Lắp đặt & giao hàng an toàn', cost: 3000000, xp: 60 },
    { id: 'mkt', role: 'marketing', name: 'Marketing số & chạy quảng cáo', cost: 4000000, xp: 60 },
    { id: 'cskh', role: 'cskh', name: 'Nghiệp vụ CSKH & xử lý khiếu nại', cost: 3000000, xp: 60 },
    { id: 'ql', role: 'manager', name: 'Quản trị cửa hàng', cost: 6000000, xp: 60 }
  ];
  G.data.trainForms = {
    internal: { name: 'Tự đào tạo nội bộ', costMul: 0.2, days: 3, xpMul: 0.5, note: 'Rẻ, chậm' },
    expert: { name: 'Thuê chuyên gia', costMul: 1, days: 1, xpMul: 1, note: 'Đắt, nhanh' },
    sponsor: { name: 'Hãng tổ chức (miễn phí)', costMul: 0, days: 2, xpMul: 0.8, note: 'Khi quan hệ NCC cao / hãng ra mẫu mới' }
  };
})();
