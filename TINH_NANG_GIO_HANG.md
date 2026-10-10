# Tính năng Giỏ hàng & Đặt đơn theo nguồn nhập

Tài liệu mô tả những gì đã có trong code cho luồng nhập hàng (mục đánh dấu "thiết kế, chưa triển khai" là phần dự kiến): gợi ý → giỏ hàng → đơn hàng theo nguồn, và Thủ kho đặt hàng theo cùng quy luật.

## 1. Quy luật chung

1. **Cùng nguồn nhập = một đơn hàng.** Các sản phẩm đi cùng một nguồn (Chợ đầu mối, Đại lý cấp 1, Nhà máy, OEM; riêng ⚡ "lấy ngay" tính là một nhóm riêng) được gộp vào một đơn và hưởng chiết khấu số lượng của cả đơn.
2. **Người chơi chỉnh được giỏ trước khi đặt:** đổi số lượng, bỏ sản phẩm, đổi nguồn.
3. **Đơn tối thiểu do người chơi chỉnh** (mặc định 10 triệu). Đơn dưới mức này không được đặt, trừ khi có sản phẩm khẩn (xem mục 5).

## 2. MỘT giỏ hàng chung (đề xuất & thủ công)

Dù thêm từ gợi ý hay tự chọn ở danh sách sản phẩm, mọi sản phẩm đều vào **cùng một giỏ** (`state.cart.lines[nguồn][sku] = số lượng`). Giỏ tự chia thành các đơn theo nguồn nhập.

- **Từ gợi ý:** nút **🛒 Thêm vào giỏ hàng** ở thẻ gợi ý thêm số lượng đề xuất theo nguồn đang chọn (đổi nguồn/số lượng ở thẻ trước khi thêm). Đã có trong giỏ thì hiện "✓ Trong giỏ · bỏ". Khối "Đơn khách" có nút **Thêm đơn khách vào giỏ**.
- **Thủ công:** ở tab Nhập hàng, chọn nguồn bằng chip rồi dùng − / số lượng / + / +10 / 🗑 trên từng sản phẩm. Đổi chip nguồn **không** làm mất sản phẩm đã chọn ở nguồn khác. Lookbook, "thêm vào giỏ nhập" ở kho và đơn cọc cũng cộng vào giỏ này.
- Không còn thanh giỏ dính đáy ở tab Nhập hàng: xem giỏ và đặt đơn hoàn toàn ở tab **Giỏ hàng** (chip tab có badge số sản phẩm).
- **Tab Giỏ hàng** (nhóm Nhập: Nhập hàng · Giỏ hàng · Giao hàng · B2B):
  - Tiêu đề "Giỏ hàng · N đơn · M sản phẩm"; chọn kho nhận chung cho giỏ.
  - Mỗi nguồn một thẻ "Đơn n · <nguồn>": từng sản phẩm có − / số lượng / + và ✕, bảng phí (hàng hóa, chiết khấu SL, phí giao, ⚡), lỗi báo giá nếu có.
  - Tùy chọn riêng từng đơn: mua chịu 30 ngày (trừ Chợ), ⚡ nhập lấy ngay (Đại lý / Nhà máy).
  - Nút **Đặt đơn n**, **Xóa đơn**; chung: **Đặt tất cả**, **Xóa cả giỏ**, **Nhập lại như lần trước**.
  - Chip tab và badge hiển thị số sản phẩm trong giỏ; giỏ trống có hướng dẫn.
- **Sau khi đặt:** đơn nào đặt xong thì rời khỏi giỏ; các đơn khác giữ nguyên.
- Giỏ nằm trong `state` nên được lưu cùng save game; save cũ (`cart.items` một nguồn) tự chuyển sang `lines`.

### 2.1. Nút "＋ Thêm hàng" trên từng đơn (thiết kế, chưa triển khai)

Mỗi thẻ đơn trong tab Giỏ hàng có thêm nút **＋ Thêm hàng**, **liên kết với các sản phẩm cùng nguồn** của đơn đó, để người chơi bổ sung hàng cho đúng đơn mà không phải quay lại tab Nhập hàng.

- **Vị trí:** cạnh nút "Đặt đơn n" / "Xóa đơn" trong thẻ "Đơn n · <nguồn>".
- **Hành vi:** bấm nút mở sheet (`UI.sheet2`) "Thêm hàng vào Đơn n · <nguồn>" liệt kê **chỉ những sản phẩm nguồn đó bán được** (`PU.skuOk(src, sku)` và nguồn đang mở).
- **Nội dung sheet:**
  - Bộ lọc hãng / loại (cùng kiểu bộ lọc ở tab Nhập hàng); mặc định hiện trước các sản phẩm nên nhập (gợi ý tồn thấp / sắp hết) rồi tới phần còn lại.
  - Mỗi sản phẩm: ảnh, tên, tồn + đang về, đơn giá theo nguồn, bộ đếm − / số lượng / + và nút +10. Sản phẩm đã có trong đơn hiển thị số lượng hiện tại và viền nổi bật.
  - Thay đổi ghi thẳng vào `state.cart.lines[src]` (cùng hàm `cartAdd` / `cartSet`), nên đơn, tổng tiền và chiết khấu số lượng cập nhật ngay.
- **Liên kết:** đơn giá trong sheet dùng bậc chiết khấu số lượng của đơn hiện tại (`q.tier`), nên người chơi thấy việc thêm hàng giúp đạt mốc CK ≥10 / ≥50 / ≥100. Sản phẩm đã nằm ở đơn của nguồn khác chỉ hiện nhãn "Đang trong Đơn m · <nguồn khác>" kèm gợi ý chuyển, không tự cộng thêm.
- **Đơn ⚡ lấy ngay:** sheet theo giới hạn ⚡ (`PU.XMAX_QTY` sản phẩm/đơn); sản phẩm vượt giới hạn bị khóa nút + kèm lý do.
- **Đóng sheet:** quay lại tab Giỏ hàng, giữ vị trí cuộn tại đơn vừa thêm.

## 3. Đơn tối thiểu cho giỏ

Giỏ chỉ **cảnh báo** khi đơn dưới mức tối thiểu (vẫn đặt được) vì đây là giỏ do người chơi tự quyết; mức này bắt buộc với Thủ kho (mục 4).

## 4. Thủ kho đặt hàng

Cùng quy luật gộp theo nguồn và đơn tối thiểu, ở cả ba chế độ:

| Chế độ | Hành vi |
|---|---|
| **Duyệt danh sách** | Thủ kho lập danh sách mỗi sáng. Màn duyệt chia thành các giỏ theo nguồn ("Đơn hàng · <nguồn>"): sửa số lượng, tick/bỏ tick, **Bỏ khỏi giỏ**, đổi nguồn, ⚡ lấy ngay. Nút **Đặt đơn này** đặt riêng từng giỏ; "Duyệt đã chọn" / "Duyệt tất cả" đặt mọi giỏ, mỗi nguồn một đơn. Giỏ dưới mức tối thiểu có cảnh báo và không đặt được. |
| **Duyệt từng món** | Thủ kho đề xuất theo **đơn gộp theo nguồn**; mỗi thẻ chờ duyệt liệt kê các món bên trong, có "Duyệt đặt" / "Bỏ qua". |
| **Tự động** | Thủ kho tự đặt các đơn gộp theo nguồn trong ngân sách tháng. |

Ở chế độ Duyệt từng món và Tự động, nhóm nguồn dưới mức tối thiểu được giữ lại để gom thêm ở lần chạy sau.

## 5. Đơn tối thiểu

- Ô **Đơn tối thiểu** nằm trong panel "Thủ kho tự đặt hàng" (cạnh Ngân sách tháng), mặc định 10.000.000, lưu ở `state.autobuy.minOrder`.
- Áp dụng cho: giỏ đề xuất, giỏ duyệt danh sách của Thủ kho, và Thủ kho tự đặt / đề xuất.
- **Ngoại lệ:** đơn có sản phẩm khẩn (đơn khách đã đặt, đơn cọc, B2B, hết hàng) vẫn đặt được dù dưới mức tối thiểu để không trễ hạn.

## 6. Các file liên quan

| File | Nội dung |
|---|---|
| `js/sim/purchasing.js` | Giỏ chung: `cart`, `cartLines`, `cartQty`, `cartSet`, `cartAdd`, `cartDel`, `cartClear`, `cartSrcs`, `cartOpt`, `cartQuote`, `cartAll`, `cartPlace`; chuyển save cũ. |
| `js/sim/suggest.js` | `addCart`, `removeCart`, `inCart`, `addTier1`, `cartCount` (thêm gợi ý vào giỏ chung). |
| `js/sim/autobuy.js` | `minOrder`, `belowMin`, `pItems`; `place` / `run` đặt theo đơn gộp; `commit(b, onlyKey)` đặt cả danh sách hoặc một giỏ. |
| `js/ui/panels6.js` | Nút "Thêm vào giỏ hàng", `UI.sugCartHtml` (nội dung tab Giỏ hàng, chia đơn theo nguồn), handler `sugCartAdd` / `sugDismiss` / `sugTier1`. |
| `js/ui/panels.js` | Đăng ký tab `cart`, handler `cartQty/cartAdd/cartStep/cartDel` (thủ công) và `cartLine*`, `cartPlaceSrc`, `cartPlaceAll`. |
| `js/ui/lookbook.js`, `js/sim/deposits.js` | "Thêm vào giỏ nhập" cộng vào giỏ chung. |
| `js/ui/nav.js` | Thêm tab `cart` vào nhóm Nhập. |
| `js/ui/autobuyui.js` | Giao diện duyệt danh sách theo giỏ, ô Đơn tối thiểu, hiển thị đơn chờ duyệt theo nguồn, `abDoCart`. |
| `js/ui/tutorial.js` | Bước hướng dẫn mua hàng trỏ tới "Thêm vào giỏ hàng". |
| `css/style.css` | Style `.abcart`, `.carth`. |

## 7. Giới hạn đã biết

- Tutorial dừng ở bước thêm vào giỏ, chưa dẫn sang tab Giỏ hàng để đặt đơn.
- Nút "＋ Thêm hàng" (mục 2.1) mới ở mức thiết kế, chưa có trong code.
- Chưa có kiểm thử tự động; các thay đổi chưa được chạy thử trên trình duyệt trong phiên viết tài liệu này.
