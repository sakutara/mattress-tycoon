# NPC hướng dẫn chơi — Bác Tư & Mai

Tài liệu thiết kế cho hệ thống NPC dạy chơi trong **Vua Chăn Ga**. Dựa trên dữ liệu đã có ở [js/data/story.js](js/data/story.js) (lời thoại, tình huống, bước hướng dẫn, mẹo, sổ tay) và các luật chơi trong [GAME_FEATURES.md](GAME_FEATURES.md).

> **Trạng thái:** đã gắn vào game (`js/ui/tutorial.js`, nạp `story.js`). Đã thử bằng bot giả lập thao tác trong trình duyệt ở khung 390×844: mở đầu, 13 bước, tiếp tục sau khi tải lại, mẹo, Sổ tay, bỏ qua, save cũ. **Chưa thử** cảm ứng thật, phần chạm thật vào ô kệ, và các màn hình hẹp hơn 375px. Camera/thời tiết trong cảnh là cảnh vẽ riêng trong hộp thoại, không điều khiển cửa hàng thật. Mục 9–10 giữ lại làm lịch sử thiết kế; các lỗi ở mục 10 (cọc 20%/3 ngày, đường dẫn tab, phiếu miễn lương…) đã được sửa.

---

## 1. Mục tiêu

1. Người chơi mới **mở cửa bán được ngày đầu tiên trong ≤ 5 phút thật** mà không cần đọc tài liệu.
2. Dạy **ba luật nền tảng** (Ghi sổ, Giữ vốn, Giữ uy tín) bằng tình huống, không bằng bảng chữ dài.
3. Mọi hướng dẫn **bỏ qua được** và **xem lại được**; không bao giờ làm kẹt game.
4. Về sau, NPC chỉ xuất hiện **đúng lúc cần** (mẹo theo ngữ cảnh), không làm phiền.

Không làm: dạy hết mọi hệ thống ngay từ đầu (livestream, B2B, họp nhân viên… để mở dần theo cấp và mẹo ngữ cảnh).

---

## 2. Nhân vật

### 2.1 Bác Tư — người thầy chính
| | |
|---|---|
| Vai | Chủ sạp về hưu, 30 năm bán chăn ga ở chợ đầu mối, giao lại sạp cho người chơi |
| Ngoại hình | Tóc bạc `#D9DDE3`, da `#EDBE92`, áo xanh bạc hà `#8CC9A9`, kính, tạp dề, chống gậy |
| Tính cách | Ấm áp, hóm hỉnh, nói thẳng; thương nhưng không nuông chiều |
| Giọng | Xưng **bác – cháu**; câu ngắn; hay dùng "Ha ha!", "nhớ nhé", "đừng để bác thấy…" |
| Vai trò trong game | Dạy **nguyên tắc & lý do** (vì sao), chấm điểm lựa chọn, giữ Sổ tay |
| Emo hay dùng | `♪` vui, `!` nhấn mạnh, `…` ngẫm nghĩ, `♥` cảm động, `?` thắc mắc |

### 2.2 Mai — người nhắc việc
| | |
|---|---|
| Vai | Cháu gái Bác Tư, năng động |
| Ngoại hình | Tóc nâu đậm `#4A2F3A`, áo hồng `#FF9EB8`, đeo túi |
| Giọng | Xưng **em – anh/chị**; nhanh, vui, "Mẹo của Mai:" |
| Vai trò | Dạy **thao tác cụ thể** (bấm đâu), nhắc mẹo ngữ cảnh, xuất hiện khi có sự kiện |

### 2.3 Phân vai (quy tắc viết lời thoại)
- **Bác Tư = tại sao** ("hứa liều không kiểm kho là mất uy tín").
- **Mai = ở đâu / bấm gì** ("vào tab Nhập, có Gợi ý nhập hàng").
- Mỗi đoạn thoại **≤ 2 câu chính, ≤ ~220 ký tự**; tên tab/nút viết đúng như trên giao diện.
- Có token `{p}` (tên người chơi) và `{shop}` (tên cửa hàng); đừng viết cứng.

---

## 3. Luồng tổng thể

```
Màn hình bắt đầu (đặt tên, ngoại hình)
        │
        ▼
[A] Mở đầu — Bác Tư trao sạp, kể ba luật     (D.intro, 14 cảnh, ~1,5 phút)
        │
        ▼
[B] Thực hành xen kẽ tình huống & thao tác    (D.scenes + D.tut)
        │
        ▼
[C] Kết — thưởng + mở khóa Sổ tay             (D.endTalk)
        │
        ▼
[D] Mẹo theo ngữ cảnh + Sổ tay + nút "Hướng dẫn" (mãi mãi)
```

### 3.1 Phần B — thứ tự đề xuất

Xen "tình huống" (hỏi–đáp, có thang điểm) với "thao tác thật" (người chơi bấm trên giao diện) để không nhàm:

| # | Loại | Mã | Nội dung | Người chơi học được |
|---|---|---|---|---|
| 1 | Tình huống | `a` | Khách hỏi mã PT-101 | Lookbook, mẫu trưng bày ≠ hàng bán (lấy từ kho) |
| 2 | Thao tác | `shelf` | Trưng bày một mẫu | Chạm kệ → chọn mẫu |
| 3 | Tình huống | `b` | Hết hàng, khách muốn đặt trước | Đặt cọc, tính ưu tiên đơn khách |
| 4 | Thao tác | `buy` | Nhập hàng từ gợi ý | Tab Nhập → "Đặt theo gợi ý" |
| 5 | Thao tác | `open` | Mở cửa | Nút Mở cửa, giai đoạn chuẩn bị |
| 6 | Thao tác | `watch` | Xem khách vào cửa | Khách có tâm trạng, chờ lâu thì bỏ về |
| 7 | Thao tác | `speed` | Chỉnh tốc độ | 1x/2x/4x, phím Space/1/2/3 |
| 8 | Tình huống | `c` | Dự báo mưa | Thời tiết ảnh hưởng khách và loại hàng |
| 9 | Tình huống | `d` | Khách khó tính | Bảo hành, đánh giá, trả lời review |
| 10 | Tình huống | `e` | Khách đông quá | Thuê nhân viên, lịch ca, họp nhân viên |
| 11 | Thao tác | `hire` | Thuê nhân viên bán hàng | Tab Nhân viên → Tuyển dụng |
| 12 | Tình huống | `f` | Cuối ngày tính sổ | Báo cáo, vốn tối thiểu để nâng cấp |
| 13 | Thao tác | `report` | Xem Báo cáo | Thêm → Báo cáo |

Gợi ý: `d` và `e` có thể dời sang **ngày thứ 2–3** (kích hoạt khi có khách/nhân viên thật) để phần B không quá dài. Tổng phần B mục tiêu ≤ 4 phút.

### 3.2 Cơ chế tình huống (D.scenes)
- Mỗi cảnh: vài câu thoại → **3 lựa chọn** (tốt / ổn / dở) → Bác Tư phản hồi (`reply`) → (tuỳ chọn) Mai nhắc thao tác (`after`).
- **Chấm sao 1–5** (`stars`); lưu vào `story.stars`, tổng kết cuối bài ("Bác chấm cháu 4,3 sao").
- **Hệ quả nhỏ** (`fx`): `money` ±, `rep` +, `hire` (phiếu miễn lương N ngày). Không lựa chọn nào làm phá sản hay kẹt game; lựa chọn dở chỉ **mất cơ hội thưởng** và nhận lời giải thích.
- Lưu lựa chọn vào `story.choices` để các cảnh sau có thể nhắc lại.

### 3.3 Cơ chế thao tác (D.tut)
Mỗi bước có `t` (tiêu đề), `say` (lời Bác), `hint` (gợi ý khi chờ lâu), `done` (khen khi xong).
- **Làm nổi bật** đối tượng cần bấm (vòng vàng nhấp nháy + mũi tên), phần còn lại của màn hình mờ nhẹ nhưng **vẫn bấm được** (không khoá cứng).
- Phát hiện hoàn thành bằng **sự kiện game** (`G.on(...)`), không bằng cách đoán toạ độ chuột.
- Sau ~20 giây không tiến triển → hiện `hint`; sau ~45 giây → hiện nút **"Bỏ qua bước"**.
- Nút **"Bỏ qua cả hướng dẫn"** luôn có ở góc hộp thoại (có xác nhận 1 lần).

---

## 4. Thưởng và mở khóa

| Thành quả | Phần thưởng |
|---|---|
| Hoàn thành phần B | +5 danh tiếng, 1 chậu cây trang trí, mở khóa chương **"Bí quyết riêng của Bác Tư"** trong Sổ tay |
| Chọn đáp án tốt ở cảnh `b` / `f` | Tiền thưởng nhỏ (300 nghìn / 500 nghìn) |
| Cảnh `e` | Phiếu **miễn lương 14 ngày** (7 ngày nếu chọn đáp án kém) cho nhân viên bán hàng đầu tiên — lưu ở `story.hireDays` |
| Vốn khởi đầu | 30 triệu (Bác cho mượn, không lãi — chỉ là lời kể, đã khớp vốn đầu game) |

Giữ thưởng nhỏ: đủ để người chơi thấy được khen, không đủ làm lệch cân bằng kinh tế (số liệu kinh tế của game **chưa được cân bằng**, xem GAME_FEATURES mục 22).

---

## 5. Mẹo theo ngữ cảnh (sau hướng dẫn)

Mai hiện một thẻ nhỏ ở góc, **mỗi mẹo chỉ một lần** (`story.tipsShown`), có nút "Hiểu rồi" và "Tắt mẹo" (`story.noTips`). Mỗi mẹo link tới chương Sổ tay (`chapter`).

| Mẹo | Kích hoạt khi | Nội dung chính |
|---|---|---|
| `deposit` | Khách đặt cọc đầu tiên | Đơn cọc phải giao đủ trước hạn; nằm trên cùng Gợi ý nhập |
| `lost` | Khách bỏ về vì hết hàng đầu tiên | Lần mất khách được ghi để gợi ý nhập |
| `inspect` | Đoàn kiểm tra đầu tiên | Đúng giá sàn + đủ hóa đơn thì yên tâm |
| `levelup` | Lên cấp đầu tiên | Có mục mới; vuốt sơ đồ xem phòng mới |
| `claim` | Yêu cầu bảo hành đầu tiên | Thêm → Bảo hành để duyệt |
| `b2b` | Đơn khách sạn đầu tiên | Lãi to nhưng hạn nghiêm, phạt trễ |
| `broke` | Tiền mặt dưới ngưỡng cảnh báo | Nhắc luật Giữ vốn |
| `meeting` | Kỳ họp nhân viên đầu tiên | Họp đều thì tinh thần tốt |

Quy tắc chống làm phiền: tối đa **1 mẹo / ngày game**, không hiện khi đang có cửa sổ xác nhận, không hiện lúc đang livestream hay họp.

**Mẹo nên thêm** (chưa có trong `story.js`): thời tiết khắc nghiệt sắp tới, hàng sắp lỗi thời, nhân viên mệt cao, đến hạn công nợ mua chịu, khách quịt tiền.

---

## 6. Sổ tay Bác Tư

Truy cập: menu **Thêm → Hướng dẫn** (và nút ❓ hiện có thay bằng nút này).

- 6 chương công khai: **Bán hàng · Nhập hàng · Nhân viên · Đơn khách và ship · Sự kiện · Nâng cấp và vốn**, cộng chương khoá **Bí quyết riêng của Bác Tư** (mở sau khi hoàn thành hướng dẫn).
- Mỗi mục: icon + tiêu đề + 1–3 câu. Có ô tìm kiếm.
- Mục nhấn mạnh **mẹo vừa xem** sẽ mở sẵn đúng chương (`chapter`).
- Nút **"Chơi lại hướng dẫn"** ở cuối Sổ tay (xoá `tutDone`, không xoá tiền/thưởng đã nhận).

---

## 7. Giao diện hộp thoại

**Bố cục (điện thoại dọc, cột ≤ 480px):**
```
┌──────────────────────────────────┐
│   [ cảnh cửa hàng, camera zoom ]  │  ← nhân vật đứng đúng vị trí (at), camera theo cam
│                                   │
├──────────────────────────────────┤
│ [chân dung]  Bác Tư          ⏭   │  ← ⏭ = bỏ qua
│ "Chà, đến rồi đấy hả {p}? …"     │
│                          ▼        │  ← chạm để tiếp, chữ hiện dần
│ [ Lựa chọn 1 ]                    │  ← chỉ xuất hiện ở cảnh có ask
│ [ Lựa chọn 2 ]                    │
│ [ Lựa chọn 3 ]                    │
└──────────────────────────────────┘
```
- Chạm bất kỳ đâu trên hộp thoại: hiện hết chữ → chạm lần nữa: sang câu tiếp.
- Nút lựa chọn cao ≥ 44px, chữ ≤ 2 dòng.
- `emo` hiện trên đầu nhân vật; `sfx` phát âm (`key`, `ding`, `coin`, `rain`); `w` đổi thời tiết cảnh (`sun`, `rain`).
- Khi người chơi phải thao tác thật: hộp thoại **thu nhỏ thành một dải** phía trên, để chừa giao diện.
- Diễn viên dùng lại nhân vật chibi hiện có (`SP.person`) với thông số ở `D.npc`.
- Khách giả trong tình huống do Bác Tư/Mai **đóng vai** (`cust: true`), có nhãn "đóng vai khách" để không nhầm với khách thật.

---

## 8. Trạng thái lưu (`G.state.story`)

Đã có sẵn trong `story.js`:

```js
story: {
  started: false,   // đã vào phần mở đầu
  introDone: false, // xem xong mở đầu
  tutDone: false,   // xong hướng dẫn
  tutStep: 0,       // bước hiện tại → tiếp tục được sau khi tải lại trang
  tipsShown: {},    // mẹo đã hiện
  noTips: false,    // người chơi tắt mẹo
  book: false,      // đã mở khoá chương bí quyết
  choices: {},      // lựa chọn ở từng tình huống
  stars: [],        // điểm Bác chấm
  hireDays: 7       // số ngày miễn lương cho nhân viên đầu tiên
}
```
Cần đảm bảo: tải lại trang giữa chừng thì **tiếp tục đúng bước**; save cũ (không có `story`) được bổ sung mặc định bằng `G.addDefaults` và **coi như đã xong hướng dẫn** (không bắt người chơi cũ học lại).

---

## 9. Việc cần làm để gắn vào game

Theo cấu trúc hiện tại (`window.G`, không ES module, mỗi file nạp bằng `<script>` và đuôi `?v=`):

| # | Việc | File gợi ý | Ghi chú |
|---|---|---|---|
| 1 | Nạp `story.js` vào `index.html` sau `state.js`; tăng số phiên bản `?v=` | `index.html` | Hiện chưa được nạp |
| 2 | Bộ điều phối: máy trạng thái intro → bước → kết, đọc/ghi `G.state.story` | `js/ui/tutorial.js` (mới) | Lắng nghe `G.on` để biết bước nào xong |
| 3 | Hộp thoại + camera + diễn viên chibi trên canvas | `js/ui/tutorial.js`, `js/render/shop.js` | Dùng lại `SP.person`; cần chỗ chèn "diễn viên tạm" vào cảnh |
| 4 | Làm nổi bật phần tử UI (vòng vàng, mũi tên) | `js/ui/tutorial.js`, `css/style.css` | Chọn phần tử theo id/class thật của nút |
| 5 | Màn hình bắt đầu (đặt tên, ngoại hình) → vào intro | `js/ui/profile.js`, `js/main.js` | Đã có hồ sơ người chơi |
| 6 | Mẹo ngữ cảnh: phát sự kiện khi deposit/lost/inspect/… xảy ra | các module `sim/*` + `notify.js` | Giới hạn 1 mẹo/ngày |
| 7 | Sổ tay (danh sách chương/mục, tìm kiếm, chương khoá) | `js/ui/handbook.js` (mới), `nav.js` | Thay hướng dẫn chữ cũ trong `main.js` / nút ❓ |
| 8 | Áp dụng `fx` (tiền, danh tiếng, phiếu miễn lương) | `js/ui/tutorial.js`, `sim/staff.js` | Phiếu miễn lương cần chỗ trừ lương |
| 9 | Công cụ thử: `G.debug.tutorial(step)`, `skipTutorial()` | `js/main.js` | Giúp kiểm thử nhanh |

Thứ tự khuyến nghị: 1 → 2 → 3 (chỉ phần intro, kiểm tra chạy) → 4 → các bước `shelf/buy/open` → tình huống → 6, 7.

---

## 10. Lỗi/mâu thuẫn phát hiện trong dữ liệu hiện có

Cần sửa trước khi đưa vào game:

1. **Tỉ lệ cọc sai:** cảnh `b` (lựa chọn `b1`) nói "đặt cọc **20%**" nhưng luật game là **30%** cho đơn đặt riêng (20% chỉ là đơn khách sạn B2B). Cũng "3 ngày có hàng" trong khi hạn thật là **10 ngày**. → Sửa thành "cọc 30%, hẹn trong 10 ngày" hoặc chỉ nói chung chung.
2. **Đường dẫn giao diện chưa kiểm chứng:** Sổ tay ghi "Kho > Giá", "Kho > Trang trí"; GAME_FEATURES không xác nhận các tab con này tồn tại đúng tên. Cần đối chiếu với tab thực tế trước khi giữ nguyên.
3. **Hướng dẫn `hire`:** "Bác miễn lương cho người đầu tiên" — chưa có cơ chế miễn lương trong `sim/staff.js` (cần làm, mục 9.8).
4. **Số khách hàng "3 khách hỏi"**, ngưỡng cảnh báo `broke`: chưa có định nghĩa số cụ thể → cần chọn (đề xuất: tiền mặt < quỹ lương 1 tháng + 10 triệu).
5. **Cảnh `a`** dùng mã `PT-101` (có trong dữ liệu mã màu ví dụ). Cần chắc mã này **thật sự có hàng và có thể trưng bày** ở đầu game, nếu không bài tập sẽ bế tắc → nên cấp sẵn 1–2 bộ trong kho lúc bắt đầu hướng dẫn.
6. **Cảnh `c` (mưa):** yêu cầu thời tiết mưa. Hướng dẫn nên **ép thời tiết** (như `G.debug.setWeather`) hoặc dùng lời thoại không phụ thuộc thời tiết thật.
7. **Cảnh `d`, `e`:** hứa "Bác tặng…" cần điều kiện (có nhân viên/khách thật) hoặc là cảnh đóng vai thuần tuý — nên quyết định rõ.

---

## 11. Danh sách kiểm thử

- [ ] Người chơi mới đi hết intro → phần B → kết, không lỗi console
- [ ] Bỏ qua từng bước, bỏ qua cả hướng dẫn: game vẫn chơi bình thường, không mất tiền/hàng
- [ ] Tải lại trang giữa chừng → tiếp tục đúng `tutStep`
- [ ] Save cũ (không có `story`) → không bị bắt học lại
- [ ] Chọn đáp án dở ở mọi cảnh → không kẹt, thưởng ít hơn, vẫn đến được phần kết
- [ ] Thao tác bị làm "sai thứ tự" (ví dụ mở cửa trước khi trưng bày) → bước tự nhận hoàn thành hoặc cho bỏ qua
- [ ] Mỗi mẹo chỉ hiện 1 lần; "Tắt mẹo" có hiệu lực; tối đa 1 mẹo/ngày
- [ ] Sổ tay: tìm kiếm, mở đúng chương theo mẹo, chương bí quyết khoá/mở đúng lúc
- [ ] Màn hình 375px và 390px: hộp thoại không che nút thao tác; nút ≥ 44px
- [ ] Chạm thật trên điện thoại (chưa từng được thử — xem GAME_FEATURES mục 22)
- [ ] Phần thưởng không làm lệch kinh tế khi lặp "Chơi lại hướng dẫn" (chỉ nhận thưởng một lần)

---

## 12. Ý tưởng mở rộng (sau này)

- Bác Tư gọi điện/nhắn tin ở các mốc lên cấp, với bí quyết riêng theo cấp.
- Mai thành "trợ lý" thực thụ khi mở khoá (nhắc đơn cọc sắp trễ).
- Nhiệm vụ hằng ngày do Bác Tư giao (đã có trong danh sách ý tưởng chưa làm).
- Thành tựu gắn với điểm sao Bác chấm.
