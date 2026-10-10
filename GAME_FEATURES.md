# Vua Chăn Ga — Tài liệu tính năng

Game tycoon (quản lý kinh doanh) về cửa hàng **chăn ga gối đệm**, chạy trên trình duyệt, viết bằng HTML/CSS/JavaScript thuần (không thư viện ngoài, không cần cài đặt). Người chơi bắt đầu từ một sạp chợ với 30 triệu vốn và phát triển thành chuỗi cửa hàng.

> Tài liệu này mô tả những gì **đã có trong mã nguồn** tại thời điểm viết (ngày 09/10/2026, phiên bản tài nguyên `20261010a1`). Mục cuối ("Trạng thái & hạn chế") ghi rõ phần nào chưa làm hoặc chưa được kiểm chứng. Nhiều con số cân bằng (giá, lương, phí…) là **giá trị khởi đầu, chưa được cân bằng qua chơi thử thực tế**.

---

## 1. Cách chạy

```bash
cd game
python3 -m http.server 8766
# mở http://localhost:8766/index.html
```

- Cũng có thể mở thẳng `index.html`, nhưng cách này **chưa được kiểm tra** (chỉ chạy qua `http.server`).
- Không dùng ES module và không có bước build: các file `js/*.js` nạp bằng thẻ `<script>` thường, gắn vào đối tượng toàn cục `window.G`.
- Tiến trình lưu trong `localStorage` (khóa `vuachanga_save_v1`), tự lưu mỗi 10 giây, khi ẩn/đóng trang (`pagehide`, `visibilitychange`, `beforeunload`) và khi qua ngày; tải lại trang sẽ tiếp tục đúng tiến trình. Mở bằng `file://` thì trình duyệt có thể không giữ được dữ liệu, nên chạy qua `http.server`. Cài đặt (nhạc, âm thanh, tự mở cửa…) lưu riêng.
- **Bộ nhớ đệm:** mọi file trong `index.html` có đuôi `?v=...`. Mỗi lần sửa code phải tăng số này (hiện `20261010a1`), nếu không trình duyệt giữ bản cũ.
- Có thể cài như ứng dụng (PWA: `manifest.webmanifest`, icon `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png`, `icon.svg`).

---

## 2. Vòng lặp trò chơi

| Mục | Nội dung |
|---|---|
| Thời gian | 1 ngày game = **5 phút thật** ở tốc độ 1x. Cửa hàng mở **8h–21h**. Nút Dừng / 1x / 2x / 4x. |
| Giai đoạn chuẩn bị | Đầu mỗi ngày game **đứng yên lúc 8h** ("Chuẩn bị ngày mới") cho tới khi bấm **Mở cửa**. Lúc này làm được mọi thứ: xếp mẫu trưng bày, chỉnh giá, nhập hàng, chia ca, họp nhân viên, đặt khuyến mãi, trả lời đánh giá… |
| Bảng chuẩn bị | Tóm tắt hôm qua, dự báo thời tiết 4 ngày, chip "N mặt hàng cần duyệt", số gợi ý nhập hàng, bảo hành, đánh giá chờ trả lời… Có tùy chọn **Tự động mở cửa mỗi ngày** (mặc định tắt). |
| Cửa sổ xác nhận | Bấm Mở cửa khi còn danh sách thủ kho chưa duyệt → hỏi *Duyệt ngay / Mở cửa luôn (bỏ qua) / Quay lại*. |
| Phím tắt | `Space` mở cửa/tạm dừng, `1/2/3` đổi tốc độ. |
| Hết ngày | Báo cáo ngày; lương trả **ngày 1 hằng tháng**; báo cáo tháng. |
| Mùa & lịch | Tháng/ngày trong tuần, mùa lạnh/mát/nóng, mùa cưới, Tết, 8/3, 20/10, Black Friday (xem mục 17). |

---

## 3. Cấp độ cửa hàng & vốn tối thiểu

| Cấp | Tên | Doanh thu tích lũy | Danh tiếng | Phí nâng cấp | **Vốn tối thiểu (sàn)** | Kệ | Giường trưng bày | Thuê/tháng | Khách cơ bản/giờ |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Sạp chợ | — | — | — | — | 2 | 1 | 3 tr | 4 |
| 1 | Cửa hàng nhỏ | 50 tr | — | 20 tr | 40 tr | 4 | 2 | 8 tr | 7 |
| 2 | Cửa hàng mặt phố | 200 tr | 30 | 60 tr | 150 tr | 6 | 4 | 20 tr | 10 |
| 3 | Showroom | 1 tỷ | 60 | 250 tr | 600 tr | 8 | 6 | 50 tr | 14 |
| 4 | Đại lý ủy quyền | 5 tỷ | — | 1 tỷ | 2,5 tỷ | 10 | 8 | 120 tr | 18 |
| 5 | Chuỗi cửa hàng | 20 tỷ | — | 4 tỷ | 10 tỷ | 12 | 10 | 250 tr | 24 |

**Quy định vốn tối thiểu khi nâng cấp:** tiền mặt phải đạt
`max(vốn sàn của cấp, phí nâng cấp + dự trữ 3 tháng)`, trong đó dự trữ 3 tháng = `3 × (tiền thuê mặt bằng cấp mới + quỹ lương hiện tại)`. Tab *Nâng cấp* có thanh "Vốn tối thiểu", số tiền còn thiếu và giải thích. Nút nâng cấp bị khóa nếu thiếu vốn.

**Mở khóa theo cấp:** cấp 1 — hãng trung (Hanvigo, Vạn Thanh), thuê kho ngoài, phòng nhân viên; cấp 2 — hãng trung-cao (Evenon, Liên Ả), phòng livestream; cấp 3 — hãng cao cấp (Kymdang, Dunlopello), nhập thẳng nhà máy (có MOQ), đơn khách sạn/resort; cấp 4 — Simmon's/Seely, Tempor, xưởng OEM (hàng thương hiệu riêng); cấp 5 — chi nhánh (tối đa 2, mỗi chi nhánh cần 1 Quản lý, thu nhập thụ động). Mỗi cấp mở rộng bản đồ cửa hàng.

Các mục chưa mở khóa được **ẩn** (chỉ hiện một dòng gợi ý "🔒 Mở ở cấp …" mỗi khu vực, có nút "Xem tất cả"). Có thông báo khi mở khóa tính năng mới. Xe tải riêng 150 tr (giảm 30% phí vận chuyển nội bộ).

---

## 4. Hãng & sản phẩm

### 4.1 Hãng (tên nhại thương hiệu thật)

| Hãng trong game | Gợi ý gốc | Phân khúc (1–5) |
|---|---|---|
| Hàng phổ thông (không thương hiệu) — Loại 1 / Loại 2 | — | 0 |
| Sông Hường | Sông Hồng | 1 |
| Hanvigo | Hanvico | 2 |
| Vạn Thanh | Vạn Thành | 2 |
| Evenon | Everon | 3 |
| Liên Ả | Liên Á | 3 |
| Kymdang | Kymdan | 4 |
| Dunlopello | Dunlopillo | 4 |
| Simmon's / Seely | Simmons / Sealy | 5 |
| Tempor | Tempur | 5 |
| Nhà Mình Home (thương hiệu riêng, qua xưởng OEM) | — | — |

### 4.2 Loại sản phẩm

- **Bộ chăn ga gối** (ga trải, vỏ chăn, vỏ gối nằm; 4 hoặc 5 món tùy phân khúc hãng), theo **bộ sưu tập** và **màu**.
- **Ruột chăn**, **ruột gối**, **đệm** (cao su / lò xo / foam / bông ép), **topper**, **phụ kiện**.
- Kích thước 1m2 / 1m6 / 1m8 / 2m2 (hoặc "Tiêu chuẩn") ảnh hưởng giá.

### 4.3 Màu sắc & mã màu như các hãng
- Mỗi bộ sưu tập có nhiều **màu**; mỗi màu có **mã** (ví dụ `EV-2405 Xanh Mint`, `HV-118 Hồng Pastel`, `SH-3021 Kẻ Caro Be`, `TM-901 Trắng Ngà`, `PT-101 Trắng`), tên màu, 2 mã màu hiển thị, **chất liệu** (cotton, tencel/lụa, microfiber, linen), **họa tiết** (trơn, kẻ, hoa, họa tiết), nhóm màu.
- Bảng màu 28 màu; tên và mã màu trong cùng bộ sưu tập **không trùng**; save cũ có màu trùng được tự đổi tên/màu mà **giữ nguyên mã hàng**.
- Hàng phổ thông chia **Loại 1** (tốt hơn, giá ≈ ×1,4, ít lỗi ≈ 5%) và **Loại 2** (rẻ, lỗi ≈ 15%, nhiều đổi trả). Cửa hàng cấp cao khách trả thấp hơn cho Loại 2.

### 4.4 Vòng đời mẫu mã
Mới ra mắt → Thịnh hành → Bình thường → **Lỗi thời** (khách chỉ trả 50–70% giá, ít người hỏi). Hãng tung dòng/màu mới định kỳ (khoảng 30–60 ngày game); khi đó có thông báo kèm tranh minh họa trong Lookbook.

### 4.5 Giá sàn của hãng
Mỗi hãng có **giá bán tối thiểu** chống bán phá giá (ví dụ ≥ 85% giá niêm yết; mẫu lỗi thời được hạ sàn). Giao diện chặn/cảnh báo khi đặt giá hoặc khuyến mãi dưới sàn. Bán dưới sàn → hãng có thể *cảnh cáo → cắt chiết khấu/thưởng → rút quyền đại lý* (mất quyền nhập hãng đó). Hàng phổ thông/OEM không có giá sàn.

---

## 5. Showroom: trưng bày & bán hàng

- Cửa hàng là **showroom**: mỗi ô kệ/giường trưng bày chứa **đúng 1 mẫu (1 màu) — một sản phẩm mẫu**. Giường trưng bày hiện chiếc giường **đã trải đúng bộ chăn ga** đã chọn.
- Người chơi **đổi mẫu trưng bày** bất kỳ lúc nào: chạm vào kệ/giường trên sơ đồ → bảng chọn mẫu (ảnh, mã màu, lọc theo nhóm màu); kéo-thả thẻ mẫu từ tab Kho lên ô; nhấn giữ ô để mở menu nhanh. Lấy mẫu ra khỏi kho khi đặt; gỡ xuống thành **"hàng trưng bày"** (bán giảm 15%).
- **Hàng bán cho khách xuất trực tiếp từ kho** (kho cửa hàng trước, rồi kho ngoài — có phí vận chuyển, thành đơn giao). Không lấy từ mẫu trưng bày.
- Nhãn trên kệ: `mã mẫu · tồn kho` (hoặc `HẾT`).

### Khách hàng
- Lượng khách mỗi giờ = `khách cơ bản(cấp) × (điểm đánh giá ÷ 3) × thời tiết × mùa × marketing × trang trí × tinh thần nhóm (họp nhân viên) × chính sách đổi trả × …`. Bấm ô "Khách/giờ" xem chi tiết từng hệ số.
- Khách có sở thích màu và kích cỡ, xem mẫu trưng bày rồi mua từ kho. Hết hàng → khách có thể nhận mẫu thay thế, hoặc đặt cọc, hoặc ghi vào nhật ký "khách hỏi hết hàng".
- **Tự phục vụ:** nhân viên không bắt buộc tư vấn mọi khách. Khách xin tư vấn với xác suất ≈ 75% (đệm), 60% (topper), 35% (loại khác); tự mua thì tỉ lệ chốt ×0,7 và ít mua thêm. Chỉ khách đã xin tư vấn mới phàn nàn vì chờ lâu.
- Khách quịt tiền nằm trong **danh sách đen** (nhãn "ĐEN" trên canvas).
- Xem **Lookbook** làm tăng tỉ lệ chốt các mẫu không trưng bày (khoảng 90 phút sau khi mở).

---

## 6. Nhập hàng

### 6.1 Nguồn nhập
| Nguồn | Đặc điểm |
|---|---|
| Chợ đầu mối Ninh Hiệp | Hàng phổ thông, rẻ, **về ngay trong ngày**, nhiều hàng lỗi, thường **không hóa đơn** (rủi ro kiểm tra thuế). |
| Đại lý cấp 1 của hãng | Giá chuẩn, về sau 1–2 ngày, ~3% lỗi, không có mức tối thiểu. |
| Nhập thẳng nhà máy (từ cấp 3) | Rẻ hơn 10–20% nhưng có **MOQ** (ví dụ tối thiểu 20), về sau 3–5 ngày. |
| Xưởng gia công OEM (từ cấp 4) | Làm hàng **thương hiệu riêng**, lãi cao, uy tín tăng dần theo đánh giá. |

- **Chiết khấu số lượng:** bậc 10 / 50 / 100 sản phẩm giảm 3% / 7% / 12%.
- **Quan hệ nhà cung cấp:** thanh "thân thiết" tăng theo giá trị nhập → chiết khấu riêng, hàng mới sớm, **mua chịu (công nợ 30 ngày)**, thưởng cuối quý, tài trợ sự kiện.
- **Đơn đang về:** Đã đặt → Đang vận chuyển → Đã về kho; xe tải đỗ trước cửa khi hàng về; có thể trễ/thiếu.
- **Kiểm hàng khi nhận:** phát hiện hàng lỗi → trả nhà cung cấp (hoàn 90% sau 2 ngày) hoặc nhận và bán giảm giá; Thủ kho phát hiện tốt hơn.
- **Biến động giá:** nhà cung cấp tăng giá, khan hàng mùa lạnh, hãng xả kho.
- **Nhập lấy ngay (hỏa tốc):** từ đại lý cấp 1 (hoặc nhà máy khi quan hệ ≥ 50); hàng về sau 1–3 giờ (hoặc trước giờ mở cửa nếu đặt lúc chuẩn bị); phí **8% tiền hàng + 150k mỗi chuyến**; tối đa 3 đơn/ngày, 40 sản phẩm/đơn; không áp dụng cho chợ/OEM.

### 6.2 Gợi ý nhập hàng (có nơi mua)
Bảng ở đầu tab Nhập, chia **7 nhóm ưu tiên** (có thể thu gọn), **ưu tiên đơn của khách**:

1. **Đơn khách đã đặt** — đơn cọc/đặt riêng, đơn khách sạn đang làm, hàng livestream đã lên lịch, đơn ship chờ hàng. Hiện tên khách, hạn giao, tiền cọc, số ngày còn lại. **Không bao giờ bị ẩn.**
2. Khách hỏi nhưng hết hàng.
3. Mẫu trưng bày sắp hết / hết.
4. Bán chạy sắp hết.
5. Theo mùa / thời tiết.
6. Mẫu mới ra mắt.
7. Nên xả / không nhập.

Mỗi dòng có số lượng nên nhập (theo tốc độ bán, mùa, thời gian hàng về, đơn mở, sức chứa kho), **nguồn gợi ý** kèm lý do và bảng so sánh (giá sau chiết khấu, thời gian về, rủi ro hết hàng, tỉ lệ lỗi, MOQ, ưu đãi, tiền cần). Có cảnh báo biên lợi nhuận mỏng, giá dưới sàn, nguồn không hóa đơn, kho đầy, mua chịu. Nút *Đặt theo gợi ý*, *Đặt tất cả đơn khách*, *Nhập lấy ngay*; sửa được số lượng và nguồn trước khi đặt. Mặc định chỉ hiện khoảng 12 dòng; các màu/kích cỡ cùng bộ sưu tập gộp một dòng; huy hiệu đếm nhóm 1–3 (huy hiệu đỏ riêng cho nhóm 1).

### 6.3 Thủ kho tự lập danh sách mua
- Chỉ chạy khi có **Thủ kho** đang làm. Chạy lúc bắt đầu ngày và lúc 12h, 17h (chỉ món rất gấp).
- Chế độ: **Duyệt danh sách** (mặc định cho game mới) / Duyệt từng món / Tự động; có Tạm dừng, ngân sách tháng, mức dự trữ tối đa theo số ngày bán.
- **Bảng "Thủ kho đề xuất mua hàng"** (hiện khi vào lúc chuẩn bị, hoặc bấm chip trên bảng chuẩn bị): thẻ từng mặt hàng có ảnh, mã màu, lý do ("3 khách hỏi mẫu EV-2405 hết hàng", "đơn cọc", "đơn lớn B2B", "livestream sắp tới", "dự báo rét"…), ô chọn, số lượng chỉnh được, nguồn nhập chọn được kèm giá và thời gian về, nhóm theo nguồn với tổng từng nguồn, kiểm tra tiền mặt / ngân sách / sức chứa kho. Nút: *Duyệt đã chọn*, *Duyệt tất cả*, *Để sau*, *Bỏ qua hôm nay*.
- **Đơn khách (nhóm 1) luôn đứng đầu, được chọn sẵn và không bị cắt**; các nhóm còn lại tối đa 12 dòng/ngày. Khi chỉ vài khách hỏi, số lượng bám theo nhu cầu và chuyển sang đại lý (không MOQ) thay vì nhập cả lô nhà máy.
- Lưu lịch sử đề xuất.

---

## 7. Kho

- Sức chứa tính theo khối lượng (đệm nặng hơn gối); kho cửa hàng nâng cấp được (+30% mỗi bậc, có tối đa theo cấp).
- **Thuê kho ngoài**: gần (thuê cao, vận chuyển rẻ, nhanh) hoặc xa/ngoại thành (thuê rẻ, chứa nhiều, vận chuyển đắt, mất 1 ngày). Hợp đồng theo tháng, có tiền cọc.
- Phí vận chuyển nội bộ ≈ `số chuyến × (100k + khoảng cách × 40k)`.
- **Xả hàng**: giảm giá, bán sỉ cho đầu nậu, tặng kèm combo, trả nhà cung cấp (khi quan hệ cao).
- **Tab Kho & Kệ**: lưới **ô vuông** — mỗi ô có hình, số lượng lớn, tên, kích thước. Màu ô: đỏ hết/sắp hết, vàng thấp, xanh lá đủ, xám lỗi thời/tồn lâu, xanh dương đang về. Có thanh dung lượng, tab *Kho cửa hàng / từng kho ngoài / Trên kệ / Đang về*, lọc (hãng, loại, trạng thái, tìm kiếm), sắp xếp, thẻ chi tiết với thao tác.
- **Mẫu trưng bày không trùng:** dòng hàng đã trưng bày ở một ô (hoặc làm bộ phủ giường) thì không còn hiện trong danh sách chọn của ô khác, kéo-thả và "Tự trưng bày" cũng bỏ qua. Muốn đổi sang ô khác thì gỡ mẫu ở ô cũ trước.

---

## 8. Nhân viên

### 8.1 Vai trò (thuê không giới hạn số lượng ở mọi cấp)
Bán hàng · Sale B2B · Kế toán · Thủ kho · Giao hàng/lắp đặt · Marketing · Chăm sóc khách hàng (CSKH) · Quản lý cửa hàng.

- Sao 1–3 (hiển thị đúng), kỹ năng, **hài lòng**, **độ mệt**, kinh nghiệm lên sao. Lương trả ngày 1 hằng tháng; lương ứng viên tăng ~1,2% theo mỗi người đã có. Cảnh báo quỹ lương.
- **Giao diện (tab Nhân viên):** thẻ tổng quan (số người, đang làm, quỹ lương và % doanh thu, hài lòng/mệt trung bình, cảnh báo) + các mục *Đội ngũ | Tuyển dụng | Lịch ca | Đào tạo | Phòng NV | Họp*. Thẻ nhân viên có hình chibi riêng, vai trò, chip ca và trạng thái, thanh hài lòng/mệt, lương, tiến độ lên sao. Tuyển dụng có nhãn "Nên thuê" theo nhu cầu thật.
- **Lịch ca:** Sáng (8–14h) / Chiều (14–21h) / Full ngày / Nghỉ theo từng thứ trong tuần. Chưa có Quản lý → tự chia ca thủ công. Có Quản lý → nút **Tự động chia ca**. Nhân viên chỉ hiện trên cửa hàng trong ca. Làm nhiều ca liên tiếp → mệt, giảm hiệu suất và hài lòng.
- **Đào tạo** (9 khóa): tư vấn & chốt đơn; kiến thức sản phẩm hãng; đàm phán B2B; kế toán & thuế; quản lý kho; lắp đặt & giao hàng an toàn; marketing số; CSKH & khiếu nại; quản trị cửa hàng. Hình thức: nội bộ / thuê chuyên gia / hãng tài trợ. Đi học vắng 1–3 ngày. Có training tập thể cuối tuần.
- **Đòi tăng lương** mỗi 6 tháng game: Đồng ý / Thương lượng / Từ chối (hài lòng giảm, có thể nghỉ việc).
- **Nghỉ phép / nghỉ ốm** (sự kiện): Duyệt hoặc từ chối.

### 8.2 Phòng nhân viên
Xây từ cấp 1 (8 tr, 50k/ngày); sofa, bàn, máy cà phê, locker, bảng ca, đồng hồ. Nhân viên hết ca/rảnh lâu vào nghỉ, hồi mệt và hài lòng nhanh hơn. **6 nâng cấp:** ghế sofa, máy pha cà phê, tủ locker, máy lạnh, phòng nghỉ trưa, góc học tập (+20% kinh nghiệm đào tạo).

### 8.3 Họp nhân viên hằng tuần
- Một buổi mỗi tuần game (mặc định thứ Hai), 15/30/60 phút. Họp **trước giờ mở cửa** (nhân viên ngoài ca nhận làm thêm 1,5×) hoặc **giữa ngày** (người dự họp vào phòng nhân viên, ngừng phục vụ khách). Hoãn 1 lần được; bỏ họp bị phạt và dồn "bức xúc".
- Chương trình tối đa 6 vấn đề, tự sinh từ dữ liệu: khiếu nại (lương thấp, nhiều ca liên tiếp, thiếu người, khách chờ lâu…), ý kiến (hết hàng, đổi mẫu trưng bày, phòng nghỉ, máy lạnh, giảm giá…), vấn đề (bảo hành chưa xử lý, giao trễ, đánh giá xấu), **mâu thuẫn giữa hai nhân viên**, việc đã hứa tuần trước.
- 6 tính cách (nóng tính, hòa nhã, chăm chỉ, lười, tham vọng, trung thành); điểm quan hệ từng cặp.
- Mỗi vấn đề có 3–7 lựa chọn có đánh đổi (đồng ý, thương lượng, hứa xử lý sau, từ chối, thưởng nóng, tăng lương, đổi ca, đào tạo, hòa giải, bữa ăn team building, tách ca, cảnh cáo…). **Quản lý chủ trì** được: tự xử lý việc thường, chuyển việc nghiêm trọng.
- Họp tốt → buff tới +5% chuyển đổi/lượng khách trong 1 tuần và giảm nghỉ việc. Bỏ họp/để mâu thuẫn kéo dài → bức xúc, bỏ ca, xin nghỉ (sự kiện xấu khi bức xúc ≥ 40).
- Mục con *Họp*: đếm ngược, cài đặt, danh sách việc đã hứa, **bản đồ quan hệ**, mâu thuẫn, lịch sử 12 buổi (biên bản).

---

## 9. Giao hàng

- Đơn bán tại quầy: *Mang về* hoặc *Giao tận nhà* (đệm giao tận nhà ≈ 90%, hàng khác ≈ 12%).
- Đơn vị giao (tên nhại): **Giao Hàng Tiếc Kiệm** (rẻ nhất, chậm, dễ trôi sang sáng mai), **Ahamuve** (tốt cho hàng cồng kềnh), **Viettel Pót** (chậm nhưng đáng tin), **Grap Express** (nhanh nhất, đắt), **NV giao hàng của cửa hàng** (miễn phí, giới hạn số chuyến/ngày theo nhân viên và giờ còn lại), **⚡ Hỏa tốc** (1–2 giờ, nhận đến 20h, phí cao).
- **Mốc 17h:** đặt trước 17h giao **trong ngày**; sau 17h thành "Giao sáng mai" (giao khoảng 8–11h). Đơn chưa giao trước 21h chuyển sang sáng mai và tính là trễ. Có đồng hồ đếm ngược tới 17h.
- **COD hoặc trả trước.** Trạng thái: Chờ đặt → Chờ lấy → Đang giao → Đã giao / Thất bại. Khách từ chối nhận (COD ≈ 10%, trả trước ≈ 3%): hàng hoàn kho, mất phí ship. Hư hàng: hoàn 30% và đánh giá 2★. Trễ: đánh giá 2★ và −0,3 danh tiếng. Chưa đặt ship sau 2 ngày: khách hủy.
- Hỏa tốc: tùy chọn **khách trả phí** hoặc **cửa hàng chịu** (được đánh giá tốt hơn); khoảng 15% đơn là khách "cần gấp" (25% với livestream); không được hỏa tốc thì 35% bị đánh giá xấu.
- Đơn hiển thị dạng **thẻ ảnh sản phẩm** (số lượng ×N, tên, kích thước, chip loại) kèm giờ giao dự kiến.

---

## 10. Đơn đặt cọc & đơn khách sạn/resort

### 10.1 Đơn đặt riêng có cọc
- Khách hỏi mẫu chưa có → đặt cọc **30%**, giao trong **10 ngày**; quá hạn phải hoàn cọc, mất uy tín. Có thể đặt 2–3 gối/ga/phụ kiện hoặc 2 đệm/chăn.
- Mỗi đơn hiện tồn kho: kho cửa hàng, trên kệ, từng kho ngoài, hàng đang về (kèm giờ về), số đã giữ cho đơn khác, **còn thiếu N**; trạng thái màu *Đủ hàng / Thiếu / Chưa có hàng*.
- **Giữ hàng cho khách** (tách khỏi kho để không bị bán), **Giao ngay** (khi đủ hàng).
- **Đề xuất nhập hàng cho đơn cọc:** số lượng thiếu, nguồn rẻ nhất kịp hạn, biên lãi, cảnh báo nếu nhập thường trễ hạn kèm giá ⚡ lấy ngay; nút *Đặt hàng cho đơn này*.

### 10.2 Đơn lớn khách sạn / resort (từ cấp 3)
- Xuất hiện ngẫu nhiên (tần suất tăng theo nhân viên Sale B2B và danh tiếng); khách như Khách sạn Mường Thạnh, Vin-Pearl Resort, Khách sạn Sen Hồng… Chủ yếu đặt **bộ chăn ga trắng/kem** và gối.
- **Cửa sổ chặn** + âm báo + chuông: nêu yêu cầu, hạn giao (10–18 ngày), cọc **20%**, giá trị, phạt trễ **15%**.
- Lựa chọn **Nhận / Từ chối / Đàm phán** (cần Sale B2B; thành công thì giá +8–16%).
- Giao nhiều chuyến (mỗi chuyến tối đa 60 đơn vị khối lượng; 120 với xe tải riêng); dùng nhân viên giao hoặc thuê xe ngoài 1,2 tr/chuyến.
- Đúng hạn: trả đủ tiền + danh tiếng (+6). Trễ: phạt, −3 danh tiếng. Trễ quá 5 ngày: khách hủy, phạt, −8 danh tiếng.

---

## 11. Sự kiện ngẫu nhiên

| Sự kiện | Nội dung |
|---|---|
| Nhân viên xin nghỉ phép / nghỉ ốm | Duyệt hoặc từ chối. |
| Khách bỏ cọc | Giữ tiền cọc; hàng đã nhập nằm lại kho (có thể bán xả). |
| **Khách quịt tiền** (COD) | Chuyển vào tab **Công nợ khó đòi**: *Tự đòi* / **Báo cáo phường** (phí 200k, 3–7 ngày xử lý; có hóa đơn đầy đủ và kế toán thì dễ thành công) / *Xóa nợ*. Khách quịt vào danh sách đen; **đơn ship tiếp theo của họ không tự đặt ship mà phải người chơi duyệt (hoặc từ chối)** ở tab Giao hàng. |
| **Đoàn quản lý thị trường / thuế kiểm tra** | Kiểm tra hóa đơn đầu vào (hàng không hóa đơn tồn kho), sổ sách (kế toán giảm rủi ro), niêm yết giá, hàng giả. Kết quả: Đạt / Nhắc nhở / Phạt / Tịch thu lô hàng; xin gia hạn 3 ngày (cần kế toán). Cửa hàng đóng cửa ~90 phút. |
| Lô hàng lỗi · Mất điện · KOL ghé review · Nhà cung cấp tăng giá | Có lựa chọn xử lý và hậu quả. |
| Họp / mâu thuẫn nhân viên, bỏ ca, xin nghỉ việc | Xem mục 8.3. |

---

## 12. Đánh giá & bảo hành đổi trả

### 12.1 Đánh giá khách hàng
- Sau mỗi đơn hoặc lần khách bỏ về giận có thể có đánh giá 1–5★ kèm bình luận tiếng Việt sinh từ ngữ cảnh (chờ lâu, hết hàng, lỗi, giao trễ/hư, giá, hàng giả, tên nhân viên, **màu sắc**, loại 1/loại 2…).
- Người chơi **phản hồi**: Cảm ơn / Xin lỗi + voucher 100k (có thể nâng ★) / Giải thích / Phản bác gay gắt (rủi ro) / tự gõ. Đánh giá chưa trả lời quá 3 ngày bị trừ uy tín; tỉ lệ phản hồi cộng tối đa +8% chốt đơn. **Điểm ★ trung bình tỉ lệ thuận lượng khách** (×điểm/3).
- Nhân viên **CSKH** tự phản hồi đánh giá mỗi đầu ngày (bật/tắt ở tab *Đánh giá*): ★4-5 cảm ơn, ★3 giải thích; đánh giá **1-2★ để người chơi tự trả lời**; không bao giờ phản bác. Mỗi CSKH xử lý tối đa 3 + 2×số sao đánh giá/ngày, ưu tiên ★ thấp trước, và được cộng XP.

### 12.2 Bảo hành & đổi trả (tab *Bảo hành*)
- **Chính sách của cửa hàng** chỉnh bất cứ lúc nào: thời hạn đổi trả (0/3/7/15/30 ngày), bảo hành (6/12/24/36 tháng; đệm +12), điều kiện (chỉ lỗi nhà sản xuất / lỗi + đổi 1-1 / hoàn tiền), phí đổi trả 0–20%, cần hóa đơn, nhận hàng đã dùng, ưu tiên VIP, theo điều khoản hãng. Chính sách thoáng → thêm khách/đánh giá nhưng nhiều yêu cầu; chặt → ngược lại.
- **Yêu cầu của khách** phát sinh sau bán/giao hàng, theo chất lượng, hãng, nguồn (chợ nhiều hơn), loại 1/2, vòng đời, hư do vận chuyển, chính sách. Gồm lỗi nhà sản xuất, hư do vận chuyển, hối hận mua, hao mòn, khách làm hư, bẩn/biến dạng, và **gian lận** (hóa đơn giả, hàng không phải của shop). Hạn xử lý 5 ngày.
- **Duyệt từng yêu cầu:** thẻ có ảnh sản phẩm, tình trạng, mô tả, bảng kiểm chính sách ✅/❌ và gợi ý. Chọn *Đổi mới / Hoàn tiền / Sửa chữa / Giảm giá giữ lại / Chuyển hãng (3–7 ngày, hãng bồi 90% giá vốn) / Từ chối*. Hàng trả được nhập lại, bán giảm hoặc hủy theo tình trạng. Từ chối oan → đánh giá xấu, mất uy tín, có thể bị khiếu nại lên quản lý thị trường (tăng rủi ro kiểm tra).
- Nhân viên **CSKH** tự duyệt ca rõ ràng, chuyển ca khó cho chủ, giảm gian lận. Báo cáo tỉ lệ đổi trả theo hãng/mẫu/nguồn; mẫu hoặc nguồn có tỉ lệ cao (> 12%) bị cảnh báo ngay trong gợi ý nhập hàng.

---

## 13. Sự kiện ra mắt sản phẩm, ưu đãi & thành viên (tab *Sự kiện & Ưu đãi*)

Ba mục: **Ra mắt sản phẩm | Ưu đãi | Thành viên**.

- **Ra mắt sản phẩm (5 bước):** (1) chọn dòng mới (ảnh, đếm ngược, số hàng mẫu, nút nhập hàng mẫu); (2) quy mô — **Nhỏ tại cửa hàng** (từ 3 tr, cần ≥2 mẫu, ≥1 người bán) / **MC + quà tặng** (từ 15 tr, ≥4 mẫu, ≥2 người) / **KOL livestream** (từ 40 tr, ≥6 mẫu, ≥3 người); (3) ngày (10 ngày tới, đánh dấu cuối tuần/lễ, cảnh báo trùng sự kiện/livestream); (4) ngân sách (hãng tài trợ 30–50% nếu quan hệ ≥ 60/80); (5) xác nhận với ước tính khách/doanh thu/ROI. Ngày sự kiện: băng rôn, bóng bay trên canvas; thiếu hàng mẫu/nhân viên → khách thất vọng, đánh giá xấu. Danh sách sự kiện có chuẩn bị, hủy (hoàn 50%), báo cáo kết quả.
- **Ưu đãi:** giảm % theo cửa hàng/hãng/loại, flash sale theo giờ, mua X tặng Y, combo phòng ngủ, voucher; ưu đãi lễ (Tết, 8/3, 20/10, Black Friday, mùa cưới); chọn quảng bá (tờ rơi / Facebúc Ads); báo cáo sau chương trình. Cảnh báo giá dưới giá sàn; giảm quá sâu/lâu → khách "chờ sale".
- **Thẻ thành viên** (1 tr/tháng): hạng Bạc (≥5 tr, −2%), Vàng (≥20 tr, −4%), Kim cương (≥60 tr, −6%); giúp khách quay lại nhiều hơn.

---

## 14. Livestream

- **Phòng livestream** từ cấp 2: xây 40 tr + 150k/ngày; góc studio low-poly (đèn ring, camera, phông nền, bàn). Một phiên mỗi ngày.
- Đặt lịch: nền tảng (**TikTak Live, Shopee-ee Live, Facebúc Live**), ngày (tối đa +7), giờ bắt đầu 9–20h, thời lượng 1–3h; host là nhân viên Marketing/Bán hàng hoặc **thuê KOL** (có phí), thêm trợ lý; tối đa 3 sản phẩm hoặc combo; giảm giá 0–40%; voucher; ngân sách quảng cáo. Có bảng ước tính trước.
- Khi phát: host và nhân viên phụ rời sàn; canvas hiện host chibi, huy hiệu **LIVE**, số người xem, đơn, bình luận bay, tim. Có sự kiện "chốt đơn" bạn chọn, khoảnh khắc đột biến, sự cố (lag, host nói sai, hết hàng giữa chừng, bị báo cáo giá sàn).
- Đơn livestream đi qua hệ thống giao hàng (COD, từ chối, quịt, đánh giá). Người theo dõi tăng theo từng nền tảng; có báo cáo sau phiên (đỉnh người xem, đơn, doanh thu, chi phí, lợi nhuận, người theo dõi mới). Mưa to làm lượng người xem livestream tăng.

---

## 15. Thời tiết & mùa vụ

- **7 loại thời tiết:** nắng, nhiều mây, mưa nhẹ, mưa to/bão, nồm ẩm, rét đậm, nắng nóng — thay đổi theo tháng; dự báo 3 ngày (độ chính xác ≈ 80%), có thể đổi giữa ngày. Hiện icon + nhiệt độ ở đầu trang, dự báo trong bảng chuẩn bị.
- Ảnh hưởng: lượng khách (mưa to ít khách đến cửa hàng nhưng online/livestream tăng), loại hàng bán chạy (rét → chăn, nồm → đệm/chống ẩm, nóng → ga lụa/tencel), giao hàng trễ khi mưa bão, độ kiên nhẫn của khách. Cảnh cửa hàng có mưa, vỉa hè ướt, bóng mây.
- **Mùa/lễ:** mùa lạnh/mát/nóng, mùa cưới, Tết (và sau Tết vắng), 8/3, 20/10, Black Friday; thông báo khi mỗi dịp bắt đầu.

---

## 16. Trang trí cửa hàng

14 món (có ảnh minh họa, giá, kích thước, cấp mở khóa, một số có phí duy trì hằng ngày): cây cảnh, cây quất Tết, thảm trải sàn, tranh treo tường, đèn chùm, bể cá, quầy nước/trà miễn phí, biển LED, máy lạnh, giường mẫu showroom, máy chiếu quảng cáo, ghế massage thử, kệ trưng bày đặc biệt, bảng xếp hạng/cúp.

- Hiệu ứng: thêm khách, tăng tỉ lệ chốt, khách kiên nhẫn hơn, cộng đánh giá (tối đa +0,6★), bonus theo mùa (quầy trà mùa lạnh, máy lạnh mùa nóng, cây quất dịp Tết). Cùng loại thứ hai giảm hiệu quả ×0,6.
- Chỗ đặt giới hạn theo cấp: **4, 6, 9, 12, 16, 20**. Bấm để đặt (bản xem trước xanh/đỏ), di chuyển hoặc **bán lại 60%**. Không được chặn lối đi tới kệ/quầy.

---

## 17. Lookbook

Cuốn tạp chí trong game (nút quyển sách trên cửa hàng, hoặc menu Thêm):
- Trang bìa có tên cửa hàng, mùa, số bộ sưu tập, **collage tối đa 3 tranh**.
- Mỗi trang = một bộ sưu tập: **tranh phòng ngủ isometric** vẽ đúng màu đã chọn (bộ chăn ga, gối, thảm, tranh tường, đèn), mã màu, chất liệu, họa tiết, câu chuyện, **các ô màu** (chạm để đổi tranh), giá, tồn kho, nút **Trưng bày mẫu này** và **Nhập hàng**. Có nhãn "đang có khách đặt N".
- Trang có khách đặt hoặc khách hỏi hết hàng được xếp lên trước, rồi tới bộ mới; chip lọc *Tất cả / Mới / Có khách đặt / Hết hàng / Đang trưng bày*.
- Điều hướng: vuốt ngang, chấm trang, phím ←/→, PageUp/PageDown, Home/End, Esc.
- Khi hãng ra mẫu mới: thông báo kèm tranh minh họa với nút *Xem Lookbook / Tổ chức sự kiện / Nhập hàng mẫu*.

---

## 18. Đồ họa, giao diện, âm thanh

- **Đồ họa isometric low-poly pastel** (tham chiếu ảnh mẫu): cửa hàng như mô hình thu nhỏ đặt trên nền đất có bề dày, vỉa hè đá lát, cây thông, đá, đồi hồng/xanh. Tường chỉ hai mặt sau, mái hiên sọc ở cửa, sàn gỗ sáng, thảm, đèn thả tỏa vầng sáng ấm; gần giờ đóng cửa ánh sáng chuyển ấm. Bố cục ấm cúng: kệ dọc tường sau và tường trái, khu phòng ngủ mẫu trên thảm, góc lounge có sofa gần cửa, quầy thu ngân cạnh cửa.
- **Nhân vật chibi** (đầu to ≈ 58% chiều cao): 5 kiểu tóc, nhiều màu tóc/da, trang phục theo vai trò, biểu tượng cảm xúc trên đầu (❓ xin tư vấn, 💬, 😊, 😠, 💤, ☕, 📖).
- **Ba trang/phòng** vuốt trái-phải: *Phòng NV* ← **Khu bán hàng** → *Phòng livestream* (chỉ phòng đã xây). Camera: kéo để di chuyển, chụm hai ngón/chạm đúp/lăn chuột để phóng to; nút nhảy nhanh; chấm trang; chip LIVE.
- **Thư viện icon** vẽ tay kiểu hoạt hình (70 icon SVG, viền nâu, màu pastel) thay emoji; xem trong menu ☰ → "Thư viện icon".
- **Giao diện ưu tiên điện thoại dọc** (cột rộng tối đa 480px, căn giữa trên máy tính): thanh trên gọn, thanh điều hướng dưới (*Cửa hàng, Kho, Nhập, Nhân viên, Thêm*), các bảng mở dạng trang kéo lên từ dưới, nút ≥ 44px, hỗ trợ vùng an toàn (safe-area), chặn zoom, có cấu hình PWA.
- **Nhạc nền tự sinh bằng WebAudio** (không dùng file): giai điệu vui, 84 BPM, nhiều chuỗi hợp âm, đổi giọng theo thời gian; bật/tắt nhạc và hiệu ứng riêng, thanh âm lượng; chỉ bắt đầu sau lần chạm đầu tiên; giảm âm khi có cửa sổ hoặc tạm dừng.
- Hồ sơ người chơi: đặt **tên cửa hàng** (2–24 ký tự), **tên mình** (1–20 ký tự), kiểu tóc, màu tóc, màu áo (có thể sửa sau qua nút 👤).

---

## 19. Báo cáo & kinh tế

- Báo cáo ngày/tháng: doanh thu, giá vốn, lãi, đơn, khách, tự phục vụ, theo hãng (cần Kế toán), các dòng chi phí (thuê mặt bằng, điện nước, lương, phí vận chuyển, phí hỏa tốc, phí nền tảng, duy trì trang trí/phòng, phạt…).
- Kế toán giảm thuế/phí 5–10% và thất thoát.
- Chi nhánh (cấp 5): thu nhập thụ động (khoảng 15 tr/ngày mỗi chi nhánh), mỗi chi nhánh cần 1 Quản lý.

---

## 20. Công cụ thử nghiệm (`G.debug`)

Gọi trong console của trình duyệt. **`levelUp()` bỏ qua các điều kiện (kể cả vốn tối thiểu).**

| Lệnh | Tác dụng |
|---|---|
| `addMoney(n)`, `addRevenue(n)`, `addRep(n)`, `setRating(x)` | Chỉnh tiền, doanh thu tích lũy, danh tiếng, điểm đánh giá |
| `skipDays(n)` | Chạy n ngày game nhanh, tự chọn mặc định ở mọi cửa sổ |
| `levelUp()` | Nâng cấp tức thì |
| `forceB2B()`, `forceLive()`, `forceClaim(n)`, `forceMeeting()`, `addConflict(a,b)` | Kích hoạt đơn lớn, livestream, yêu cầu bảo hành, họp nhân viên, mâu thuẫn |
| `forceEvent(type)` | `leave`, `sick`, `cancelDeposit`, `unpaid`, `inspection`, `badbatch`, `blackout`, `kol`, `pricehike` |
| `setWeather(type)` | Đặt thời tiết |
| `release(brandId)` | Ép hãng ra dòng mới |
| `giveStock(sku, n)`, `giveDecor(id, n, auto)`, `addReview(r, meta)`, `setNames(shop, name)` | Cấp hàng, đồ trang trí, tạo đánh giá, đổi tên |
| `icons()`, `suggestStats()` | Mở thư viện icon; thống kê gợi ý theo nhóm |

---

## 21. Cấu trúc mã nguồn

```
game/
  index.html, manifest.webmanifest, icon*.png/svg, favicon-32.png, apple-touch-icon.png
  css/style.css
  js/core/    util.js (G.on/G.emit, tiện ích, lịch) · state.js · clock.js · save.js · audio.js (nhạc, âm thanh)
  js/data/    brands.js · products.js (SKU, màu, bộ sưu tập) · staff.js (vai trò, khóa học) · milestones.js (cấp độ)
              story.js (lời thoại, tình huống, mẹo, Sổ tay của Bác Tư & Mai)
  js/sim/     customers · sales · pricing · lifecycle · warehouse · purchasing · suggest · autobuy
              staff · training · meeting · staffroom · shipping · deposits · b2b · events
              reviews · returns · campaigns · live · seasons · weather · economy · progress · layout · decor
  js/render/  iso.js · sprites.js · decor_sprites.js · shop.js
  js/ui/      hud · nav · panels(1–7) · staffui · shelfui · campwiz · autobuyui · meetingui · lookbook
              profile · notify · icons · unlocks · tutorial (NPC hướng dẫn, mẹo, Sổ tay)
  js/main.js  khởi tạo, G.debug
```

Các module giao tiếp qua `G.on/G.emit` (sự kiện: `tick`, `hour`, `dayStart`, `dayEnd`, `sale`, `levelUp`…) và các mảng móc `G.trafficMods`, `G.conversionMods`, `G.acceptMods`. Trạng thái mới đăng ký bằng `G.addDefaults({...})` nên save cũ tự được bổ sung.

---

## 22. Trạng thái & hạn chế

**Đã kiểm tra:** game chạy trên trình duyệt qua `http.server` ở độ rộng điện thoại (375–390px) và máy tính; không phát sinh lỗi console trong các lần chạy thử `skipDays` và các sự kiện thử; các màn hình chính (tab, bảng, cửa sổ) hiển thị đúng.

**Chưa kiểm tra / chưa chắc:**
- Mở trực tiếp bằng `file://`; cảm ứng thật trên điện thoại (mọi lần thử dùng thao tác giả lập); bàn phím ảo; màn hình ngang (dùng được nhưng chật); kích cỡ 360px và 430px chưa được kiểm tra đầy đủ.
- **Nhạc chưa ai nghe thử.**
- **Cân bằng kinh tế chưa được chỉnh:** giá bộ chăn ga (×2,6 so với ga lẻ cũ), lương, phí hỏa tốc, hoa hồng livestream, thưởng khi họp, tốc độ lên cấp… đều là số khởi đầu. Chạy thử 14 ngày không nhập hàng: 30 tr → 47 tr, hết sạch hàng.
- Nhiều tương tác chỉ được thử bằng mã (nút "Đặt tất cả đơn khách", các nút trong Lookbook, nhiều lựa chọn trong họp nhân viên).

**Hạn chế đã biết:**
- Cấp 4–5, camera mặc định thu nhỏ nên hai bên bị cắt nhẹ; cấp 0 hơi nhỏ trên điện thoại (cần chụm/chạm đúp).
- Nhãn "HẾT" có thể chồng chéo trên cửa hàng ở cấp cao khi kho trống.
- Ngân sách mặc định của Thủ kho là 30 tr/tháng — quá thấp khi cửa hàng lớn (hiện chỉ cảnh báo, không chặn đơn khách).
- Khi nhóm 1 có nguy cơ giao trễ, thông tin khách hiện hai lần (chỉ là hiển thị).
- Nhân viên "vào" phòng nghỉ theo kiểu chuyển giao ở cửa; không có phòng nhân viên thì người họp đứng yên cạnh quầy.
- Hàng giả chưa được mô phỏng thành hàng thật (chỉ xuất hiện trong bình luận và danh sách kiểm tra thuế).
- Yêu cầu đặt cọc của khách chưa nhắc đến màu cụ thể.
- Dự báo thời tiết chưa được dùng trong gợi ý nhập hàng chung (chỉ dùng cho lý do của Thủ kho).
- Hướng dẫn NPC (Bác Tư & Mai) **đã gắn vào game** (mục 23) nhưng mới được thử bằng bot giả lập thao tác trong trình duyệt; **chưa thử bằng cảm ứng thật**, chưa thử trên desktop rộng, và camera/thời tiết trong từng cảnh chỉ là cảnh vẽ riêng trong hộp thoại chứ không điều khiển cửa hàng thật.
- Không dùng git (không có lịch sử thay đổi).

**Ý tưởng chưa làm:** bán online kênh khác ngoài livestream, đối thủ cạnh tranh, vay ngân hàng/trả góp, thành tựu & nhiệm vụ hằng ngày, mở rộng cốt truyện.

---

## 23. Hướng dẫn NPC (Bác Tư & Mai)

Thiết kế chi tiết ở [NPC_HUONG_DAN.md](NPC_HUONG_DAN.md); mã ở `js/ui/tutorial.js`, dữ liệu ở `js/data/story.js`, trạng thái ở `G.state.story`.

- **Người mới:** hồ sơ → mở đầu (14 câu thoại, sân khấu chibi, Bác Tư trao sạp và dặn ba luật) → 13 bước xen kẽ: tình huống hỏi–đáp có chấm sao (khách hỏi mã màu, hết hàng đặt cọc, dự báo mưa, khách khó tính, khách đông, cuối ngày tính sổ) và thao tác thật có **khung vàng nhấp nháy** chỉ nút cần bấm (trưng bày, nhập theo gợi ý, mở cửa, xem khách, đổi tốc độ, thuê nhân viên, mở Báo cáo). Hoàn thành thì +5 danh tiếng, 1 chậu cây và mở khóa chương bí quyết trong Sổ tay. Mỗi bước có "Bỏ qua bước", mỗi hộp thoại có "Bỏ qua hướng dẫn".
- **Tiếp tục:** thoát giữa chừng thì lần sau vào tiếp đúng bước (`story.tutStep`). **Save cũ** (đã có hồ sơ/ngày > 1/doanh thu) không bị bắt học lại.
- **Phiếu miễn lương:** chọn cách xử lý ở cảnh "khách đông" thì nhân viên bán hàng đầu tiên được miễn lương 7–14 ngày (trừ vào kỳ lương tháng).
- **Mẹo của Mai** (mỗi mẹo một lần, tối đa một mẹo mỗi ngày game, không hiện khi đang có hộp thoại/livestream): đơn cọc, khách bỏ vì hết hàng, đoàn kiểm tra, lên cấp, bảo hành, đơn khách sạn, tiền mặt thấp, họp nhân viên. Có nút Hiểu rồi / Sổ tay / Tắt mẹo.
- **Sổ tay Bác Tư:** ☰ → ❓ Hướng dẫn, hoặc Thêm → Sổ tay Bác Tư. 7 chương, có tìm kiếm, bật/tắt mẹo, nút **Chơi lại hướng dẫn** (phần thưởng chỉ nhận một lần).
- **Thử nghiệm:** `G.debug.tutorial(i)` chạy hướng dẫn từ bước `i`; `G.debug.skipTutorial()` bỏ qua.
- **Sửa kèm theo:** hàng khởi điểm trước đây chiếm 112,5 trên sức chứa kho 60 nên người mới không đặt được đơn nhập nào ở ngày 1; đã giảm xuống khoảng 31,5.
- **Sửa lỗi hiển thị tab Kho:** ô hàng trong lưới "Tồn kho" (`js/ui/panels.js`) có thuộc tính `title=""` thừa dấu nháy làm vỡ HTML; đã sửa thành `title="<tên mặt hàng>"` (tooltip tên đầy đủ) và tăng số phiên bản tài nguyên lên `20261010a1`.
