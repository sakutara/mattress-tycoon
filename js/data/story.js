/* Dữ liệu cốt truyện, tình huống, hướng dẫn, sổ tay (toàn bộ tiếng Việt). Token: {p} = tên người chơi, {shop} = tên cửa hàng. */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ story: { started: false, introDone: false, tutDone: false, tutStep: 0, tipsShown: {}, noTips: false, book: false, choices: {}, stars: [], hireDays: 7, voucher: 0, rewarded: false, replay: false, tipDay: 0 } });
  var D = G.storyData = {};

  // nhân vật: ngoại hình chibi (dùng SP.person) + tên hiển thị
  D.npc = {
    tu: { name: 'Bác Tư', role: 'Chủ sạp về hưu', hair: '#D9DDE3', hairStyle: 0, skin: '#EDBE92', shirt: '#8CC9A9', glasses: true, apron: true, cane: true },
    mai: { name: 'Mai', role: 'Cháu gái của Bác Tư', hair: '#4A2F3A', hairStyle: 1, skin: '#F6C9A0', shirt: '#FF9EB8', bag: true },
    me: { name: 'Bạn', role: 'Chủ sạp mới' },
    narr: { name: '', role: '' }
  };

  // ---- Mở đầu: at = vị trí diễn viên [x%, y%, hướng nhìn]; cam = [tâm x, tâm y, phóng to]; w = thời tiết ----
  D.intro = [
    { who: 'narr', w: 'sun', cam: [0.5, 0.55, 1], at: {}, text: 'Sáng sớm ở khu chợ đầu mối. Tiếng rao hàng râm ran, mùi cà phê phảng phất. Ở góc chợ có một sạp chăn ga gối đệm bé xíu, treo biển "Cần sang nhượng".' },
    { who: 'tu', emo: '♪', cam: [0.62, 0.7, 1.25], at: { tu: [0.7, 0.8, -1] }, text: 'Chà, đến rồi đấy hả {p}? Lại đây, lại đây nào! Bác đợi cháu từ sáng tới giờ.' },
    { who: 'me', emo: '!', cam: [0.5, 0.7, 1.25], at: { tu: [0.68, 0.8, -1], me: [0.3, 0.82, 1] }, text: 'Dạ cháu chào Bác Tư ạ! Cháu đến nhận sạp theo hẹn.' },
    { who: 'tu', emo: '…', cam: [0.68, 0.7, 1.6], at: { tu: [0.68, 0.8, -1], me: [0.3, 0.82, 1] }, text: 'Bác bán chăn ga gối đệm ở cái chợ này ba mươi năm rồi. Giờ lưng đau gối mỏi, bác về quê trồng rau nuôi gà đây.' },
    { who: 'tu', emo: '♥', sfx: 'key', cam: [0.5, 0.72, 1.7], at: { tu: [0.62, 0.8, -1], me: [0.36, 0.82, 1] }, text: 'Đây, chùm chìa khóa sạp. Từ hôm nay nơi này là của cháu: "{shop}". Đừng để bác thấy nó ế nhé!' },
    { who: 'tu', emo: '!', sfx: 'ding', cam: [0.5, 0.72, 1.7], at: { tu: [0.62, 0.8, -1], me: [0.36, 0.82, 1] }, text: 'Còn đây là cuốn Sổ tay của bác: ba mươi năm bí quyết ghi hết trong đó. Lúng túng thì mở ra, bấm "Hướng dẫn" trong menu là thấy.' },
    { who: 'tu', emo: '♥', sfx: 'coin', cam: [0.5, 0.72, 1.5], at: { tu: [0.62, 0.8, -1], me: [0.36, 0.82, 1] }, text: 'Bác cho cháu mượn 30 triệu làm vốn khởi nghiệp, không tính lãi. Bao giờ cháu giàu, mời bác ly cà phê là đủ!' },
    { who: 'me', emo: '?', cam: [0.4, 0.7, 1.4], at: { tu: [0.66, 0.8, -1], me: [0.34, 0.82, 1] }, text: 'Nhưng... sạp nhỏ xíu thế này, bao giờ mới thành chuỗi cửa hàng được hả bác?' },
    { who: 'tu', emo: '♪', cam: [0.5, 0.6, 1.0], at: { tu: [0.66, 0.8, -1], me: [0.34, 0.82, 1] }, text: 'Ha ha! Bác cũng khởi đầu từ cái sạp bé tẹo này thôi. Đường đi là: Sạp chợ, Cửa hàng nhỏ, Cửa hàng mặt phố, rồi cả một chuỗi chăn ga gối đệm. Mỗi cấp mở thêm nhân viên, phòng livestream, đơn lớn khách sạn...' },
    { who: 'tu', emo: '!', cam: [0.66, 0.68, 1.5], at: { tu: [0.66, 0.8, -1], me: [0.34, 0.82, 1] }, text: 'Nhớ ba điều bác dặn nhé. MỘT: GHI SỔ. Mỗi đồng thu chi đều phải lên sổ (tab Báo cáo). Không ghi sổ là đi đêm không đèn.' },
    { who: 'tu', emo: '!', cam: [0.66, 0.68, 1.5], at: { tu: [0.66, 0.8, -1], me: [0.34, 0.82, 1] }, text: 'HAI: GIỮ VỐN. Đừng đổ hết tiền vào hàng. Luôn chừa tiền trả lương, tiền nhập hàng tuần sau, và đủ vốn tối thiểu để nâng cấp cửa hàng.' },
    { who: 'tu', emo: '♥', cam: [0.66, 0.68, 1.5], at: { tu: [0.66, 0.8, -1], me: [0.34, 0.82, 1] }, text: 'BA: GIỮ UY TÍN. Hứa là làm, hàng đúng mẫu, giao đúng hẹn. Sao đánh giá chính là mạng sống của cái sạp này.' },
    { who: 'tu', emo: '?', w: 'rain', sfx: 'rain', cam: [0.5, 0.35, 1.1], at: { tu: [0.66, 0.8, -1], me: [0.34, 0.82, 1] }, text: 'Ơ kìa, trời sắp mưa rồi! Mai ơi, ra đây giúp bác một tay!' },
    { who: 'mai', emo: '♪', cam: [0.5, 0.7, 1.25], at: { tu: [0.7, 0.8, -1], me: [0.36, 0.82, 1], mai: [0.52, 0.86, 1] }, text: 'Dạ con đây! Chào anh chị, em là Mai, cháu bác Tư. Thỉnh thoảng em sẽ ghé nhắc mẹo vặt cho anh chị nha.' },
    { who: 'tu', emo: '!', cam: [0.5, 0.7, 1.15], at: { tu: [0.7, 0.8, -1], me: [0.36, 0.82, 1], mai: [0.52, 0.86, 1] }, text: 'Giờ bác với con Mai sẽ đóng vai khách mua hàng, để cháu tập tay nghề trước khi mở cửa thật. Ai sai cũng không sao, bác chỉ cho. Nào, vào việc!' }
  ];

  // ---- "Tạo tình huống": mỗi cảnh = các câu thoại + (tùy chọn) lựa chọn có hệ quả nhỏ ----
  // fx: money (đồng), rep, stars (Bác chấm 1-5). Không bao giờ gây bế tắc.
  var AT = { tu: [0.68, 0.8, -1], me: [0.32, 0.82, 1], mai: [0.5, 0.87, 1] };
  D.scenes = {
    a: { title: 'Tình huống 1: Khách hỏi mã màu', lines: [
      { who: 'tu', cust: true, emo: '?', cam: [0.6, 0.7, 1.3], at: { tu: AT.tu, me: AT.me }, text: 'Chào chủ sạp! Tôi muốn mua bộ chăn ga mã PT-101 màu trắng, cỡ 1m6. Sạp có không nhỉ?' }
    ], ask: [
      { id: 'a1', label: 'Dạ để cháu tra Lookbook ngay ạ', fx: { rep: 1 }, stars: 5, reply: 'Chuẩn bài! Lookbook (nút quyển sách trên sơ đồ, hoặc menu Thêm) có đủ mã màu và tranh phòng ngủ. Từ đó cháu trưng bày mẫu luôn.' },
      { id: 'a2', label: 'Dạ mời bác xem mẫu trên kệ ạ', fx: {}, stars: 4, reply: 'Cũng được. Nhớ nhé: mẫu trưng bày chỉ để KHÁCH XEM, hàng bán lấy từ KHO. Nhãn trên mẫu ghi mã màu và tồn kho.' },
      { id: 'a3', label: 'Dạ có, có ngay ạ! (chưa kiểm kho)', fx: {}, stars: 3, reply: 'Hứa liều khi chưa kiểm kho là mất uy tín đấy. Luôn nhìn tồn kho trước khi hứa với khách.' }
    ], after: [
      { who: 'mai', emo: '!', cam: [0.5, 0.75, 1.3], at: { mai: AT.mai, me: AT.me }, text: 'Mẹo của Mai: mỗi ô kệ chỉ trưng bày 1 mẫu. Khách xem mẫu xong sẽ mua hàng trong kho, nên đừng để mẫu hết hàng nha. Giờ anh chị thử trưng bày một mẫu đi!' }
    ] },
    b: { title: 'Tình huống 2: Hết hàng, khách muốn đặt trước', lines: [
      { who: 'tu', cust: true, emo: '?', cam: [0.6, 0.7, 1.3], at: { tu: AT.tu, me: AT.me }, text: 'Ôi, màu này kho hết rồi à? Thế tôi đặt trước được không, bao giờ có hàng?' }
    ], ask: [
      { id: 'b1', label: 'Dạ bác đặt cọc 30%, trong 10 ngày cháu giao ạ', fx: { rep: 1, money: 300000 }, stars: 5, reply: 'Đúng bài! Khách cọc là đơn ưu tiên số 1: nó nằm trên cùng danh sách Gợi ý nhập hàng, có ngày hạn rõ ràng. Cọc xong mà lỡ hẹn thì mất cọc và mất uy tín.' },
      { id: 'b2', label: 'Dạ bác để lại số, có hàng cháu báo ạ', fx: {}, stars: 3, reply: 'Khách chưa cọc thì dễ đi mua chỗ khác lắm. Còn lần hết hàng nào cũng được ghi vào "khách hỏi nhưng hết hàng" để gợi ý nhập.' },
      { id: 'b3', label: 'Dạ cháu nhập gấp hỏa tốc ngay ạ!', fx: { money: -300000 }, stars: 4, reply: 'Nhanh thật, nhưng hỏa tốc tốn thêm phí đấy. Dùng khi đơn đáng tiền hoặc sắp trễ hạn thôi.' }
    ], after: [
      { who: 'mai', emo: '!', cam: [0.5, 0.75, 1.3], at: { mai: AT.mai, me: AT.me }, text: 'Vào tab Nhập có "Gợi ý nhập hàng", xếp theo thứ tự: đơn khách đã đặt, khách hỏi hết hàng, mẫu trưng bày sắp hết... Anh chị đặt thử một món nhé!' }
    ] },
    c: { title: 'Tình huống 3: Dự báo mưa', lines: [
      { who: 'mai', w: 'rain', emo: '!', cam: [0.5, 0.4, 1.1], at: { mai: AT.mai, me: AT.me, tu: AT.tu }, text: 'Anh chị ơi, dự báo mai mưa to! Thời tiết ảnh hưởng khách lắm: mưa thì ít người ra chợ, nhưng khách online và livestream lại tăng. Rét thì chăn bán chạy, nồm ẩm thì đệm và đồ chống ẩm lên ngôi.' }
    ], ask: [
      { id: 'c1', label: 'Đẩy bán online và chuẩn bị livestream', fx: { money: 200000 }, stars: 5, reply: 'Khôn đấy! Mưa là dịp bán online. Phòng livestream mở khi lên cấp Cửa hàng mặt phố.' },
      { id: 'c2', label: 'Nhập thêm chăn dày và đồ chống ẩm', fx: {}, stars: 4, reply: 'Hợp thời tiết. Xem dự báo 3 ngày ở bảng Chuẩn bị mỗi sáng để nhập đón đầu.' },
      { id: 'c3', label: 'Cứ giữ nguyên, mưa thì mưa', fx: {}, stars: 3, reply: 'Giữ nguyên cũng không sai, nhưng bỏ lỡ cơ hội. Biểu tượng thời tiết ở thanh trên cùng luôn cho cháu biết hôm nay ra sao.' }
    ], after: [] },
    d: { title: 'Tình huống 4: Khách khó tính', lines: [
      { who: 'tu', cust: true, emo: '!', mood: 'angry', cam: [0.6, 0.7, 1.4], at: { tu: AT.tu, me: AT.me }, text: 'Này chủ sạp! Cái ga hôm trước tôi mua bạc màu sau một lần giặt! Không xử lý cho tử tế là tôi chấm một sao đấy!' }
    ], ask: [
      { id: 'd1', label: 'Xin lỗi và đổi bộ mới (bảo hành)', fx: { money: -300000, rep: 1 }, stars: 5, reply: 'Tốn một chút nhưng giữ được khách và sao. Yêu cầu bảo hành nằm ở Thêm > Bảo hành: cháu duyệt đổi, hoàn tiền, sửa hay từ chối.' },
      { id: 'd2', label: 'Giảm giá 10% cho lần mua sau', fx: { money: -100000 }, stars: 4, reply: 'Ổn, rẻ hơn đổi mới. Nhưng khách bực vì HÀNG LỖI thì giảm giá chưa chắc đủ.' },
      { id: 'd3', label: 'Giữ giá, giải thích cách giặt đúng', fx: {}, stars: 3, reply: 'Giải thích đúng nhưng khách đang nóng, dễ chấm sao thấp. Đánh giá nằm ở Thêm > Đánh giá, nhớ trả lời từng cái: lịch sự thì sao vẫn có thể lên.' }
    ], after: [] },
    e: { title: 'Tình huống 5: Khách đông quá!', lines: [
      { who: 'mai', emo: '!', cam: [0.5, 0.75, 1.2], at: { mai: AT.mai, me: AT.me, tu: AT.tu }, text: 'Khách đang chờ tư vấn đầy kìa! Một mình anh chị không xuể đâu. Khách chờ lâu sẽ bỏ về và chấm sao thấp đó.' }
    ], ask: [
      { id: 'e1', label: 'Thuê ngay một bạn bán hàng', fx: { hire: 14 }, stars: 5, reply: 'Quyết đoán! Cháu sẽ thuê thử: bác tặng phiếu miễn lương 14 ngày cho người đầu tiên.' },
      { id: 'e2', label: 'Tự cố gắng thêm chút nữa', fx: { hire: 7 }, stars: 3, reply: 'Cháu giỏi nhưng đừng ôm hết. Ít nhất hãy thử thuê một bạn, bác tặng phiếu miễn lương 7 ngày.' },
      { id: 'e3', label: 'Nhờ Mai phụ một lúc', fx: { hire: 7 }, stars: 4, reply: 'Mai chỉ phụ được hôm nay thôi! Hãy thuê người: bác tặng phiếu miễn lương 7 ngày.' }
    ], after: [
      { who: 'tu', emo: '!', cam: [0.6, 0.7, 1.2], at: { tu: AT.tu, me: AT.me, mai: AT.mai }, text: 'Nhân viên có LỊCH CA (tab Nhân viên > Lịch ca): mỗi người nghỉ một ngày, đừng bắt làm quá sức. Mỗi tuần có Họp nhân viên để nghe ý kiến, xử lý mâu thuẫn: họp đều thì tinh thần tốt, bỏ họp thì họ bức xúc. Thuê người đi!' }
    ] },
    f: { title: 'Tình huống 6: Cuối ngày tính sổ', lines: [
      { who: 'tu', emo: '♪', w: 'sun', cam: [0.5, 0.6, 1.2], at: { tu: AT.tu, me: AT.me, mai: AT.mai }, text: 'Chủ sạp nào cuối ngày cũng phải tính sổ. Việc quan trọng nhất của chủ sạp không phải bán hàng mà là TÍNH SỔ. Mở Báo cáo ra: doanh thu, lãi, chi phí, đơn hàng, đánh giá của từng ngày.' },
      { who: 'tu', emo: '!', cam: [0.5, 0.6, 1.2], at: { tu: AT.tu, me: AT.me, mai: AT.mai }, text: 'Muốn nâng cấp cửa hàng (tab Nâng cấp) phải đủ doanh thu tích lũy, danh tiếng VÀ một khoản vốn tối thiểu còn lại trong két. Hết sạch tiền mà vẫn đòi lên cấp thì không được đâu.' }
    ], ask: [
      { id: 'f1', label: 'Mục tiêu của cháu: giữ vốn an toàn', fx: { money: 500000 }, stars: 5, reply: 'Đúng tinh thần luật số 2! Tặng cháu 500 nghìn tiền lì xì giữ két.' },
      { id: 'f2', label: 'Mục tiêu: tăng doanh thu thật nhanh', fx: { rep: 1 }, stars: 4, reply: 'Hăng hái đấy! Nhưng nhớ doanh thu cao chưa chắc có lãi, xem cột lãi trong Báo cáo.' },
      { id: 'f3', label: 'Mục tiêu: nâng cấp cửa hàng sớm nhất', fx: { rep: 1 }, stars: 4, reply: 'Tham vọng! Vào tab Nâng cấp xem thanh tiến độ: nó cho biết còn thiếu gì.' }
    ], after: [] }
  };

  // ---- Hướng dẫn tương tác: lời thoại cho từng bước hành động ----
  D.tut = {
    shelf: { t: 'Trưng bày một mẫu', say: 'Chạm vào một ô kệ trên sơ đồ (đang có khung vàng nhấp nháy), rồi chọn một mẫu trong danh sách bên dưới để trưng bày.', hint: 'Bảng chọn mẫu hiện ra phía dưới sau khi chạm kệ. Chạm vào một ô sản phẩm bất kỳ có số lượng tồn kho.', done: 'Đẹp lắm! Mẫu đã lên kệ. Khách sẽ ngắm mẫu này.' },
    buy: { t: 'Nhập hàng từ gợi ý', say: 'Mở mục Nhập ở thanh dưới, rồi bấm "Đặt theo gợi ý" ở một món trong danh sách.', hint: 'Thanh dưới cùng: bấm 🛒 Nhập. Trong danh sách gợi ý, nút "Đặt theo gợi ý" màu cam sẽ đặt đủ số lượng từ nguồn tốt nhất.', done: 'Hàng đã đặt! Hàng sẽ về kho sau vài giờ hoặc vài ngày tùy nguồn.' },
    open: { t: 'Mở cửa!', say: 'Mọi thứ sẵn sàng rồi. Bấm "Mở cửa" để bắt đầu ngày bán hàng đầu tiên.', hint: 'Nút "Mở cửa / Bắt đầu ngày" màu đỏ ở dưới cùng, hoặc nút ☀ Mở cửa trên bảng.', done: 'Cửa đã mở, đồng hồ bắt đầu chạy!' },
    watch: { t: 'Xem khách vào cửa', say: 'Nhìn kìa, đợi một vị khách bước vào sạp. Khách sẽ ngắm mẫu, được tư vấn rồi mua hàng từ kho.', hint: 'Đợi vài giây. Nếu lâu quá, bấm "Bỏ qua bước".', done: 'Khách đến rồi! Mỗi khách có tâm trạng, ngân sách riêng. Chờ lâu thì họ bỏ về.' },
    speed: { t: 'Chỉnh tốc độ', say: 'Thấy chậm? Bấm 2x hoặc 4x để thời gian chạy nhanh hơn. Bấm ⏸ để tạm dừng suy nghĩ.', hint: 'Cụm nút 1x 2x 4x nằm ngay dưới sơ đồ.', done: 'Tốc độ đã đổi. Phím tắt: Space tạm dừng, 1 2 3 chọn tốc độ.' },
    hire: { t: 'Thuê nhân viên bán hàng', say: 'Mở mục Nhân viên, vào Tuyển dụng, chọn vai "Bán hàng" rồi bấm "Thuê" một ứng viên. Bác miễn lương cho người đầu tiên!', hint: 'Thanh dưới: 👥 Nhân viên. Chạm thẻ "Bán hàng", chọn một ứng viên rồi bấm nút Thuê.', done: 'Có thêm người phụ rồi. Nhớ xem Lịch ca và lương mỗi tháng.' },
    report: { t: 'Xem Báo cáo', say: 'Cuối cùng, mở Thêm > Báo cáo để xem sổ sách: đây là nơi cháu nhìn doanh thu, lãi và chi phí.', hint: 'Thanh dưới: ☰ Thêm, rồi chạm "Báo cáo".', done: 'Sổ sách trong tầm mắt. Giữ thói quen mở báo cáo mỗi sáng nhé!' }
  };
  D.endTalk = [
    { who: 'tu', emo: '♥', w: 'sun', sfx: 'ding', cam: [0.5, 0.65, 1.3], at: { tu: AT.tu, me: AT.me, mai: AT.mai }, text: 'Tốt lắm {p}! Tay nghề cháu không thua bác hồi trẻ. Bác thưởng: +5 danh tiếng, một chậu cây trang trí cho sạp, và mở khóa cuốn "Sổ tay Bác Tư" với những bí quyết riêng của bác.' },
    { who: 'mai', emo: '♪', cam: [0.5, 0.75, 1.3], at: { tu: AT.tu, me: AT.me, mai: AT.mai }, text: 'Gặp khó thì bấm "Hướng dẫn" trong menu nhé. Em sẽ hiện mẹo đúng lúc cần, và anh chị có thể tắt mẹo bất cứ khi nào. Chúc sạp phát đạt!' }
  ];

  // ---- Mẹo theo ngữ cảnh (hiện 1 lần) ----
  D.tips = {
    deposit: { chapter: 'ship', text: 'Có khách vừa ĐẶT CỌC! Đơn cọc phải giao đủ hàng trước hạn, trễ hạn là mất cọc và mất uy tín. Xem mục Nhập > Gợi ý: đơn cọc nằm trên cùng.' },
    lost: { chapter: 'buy', text: 'Vừa có khách bỏ đi vì hết hàng. Mỗi lần mất khách đều được ghi lại để gợi ý nhập: xem tab Nhập để bù hàng sớm.' },
    inspect: { chapter: 'event', text: 'Có đoàn KIỂM TRA! Hàng đúng giá sàn của hãng, hóa đơn đầy đủ thì yên tâm. Phạt nặng nếu bán dưới giá sàn hoặc hàng không rõ nguồn.' },
    levelup: { chapter: 'up', text: 'Cửa hàng vừa lên cấp, có thêm mục mới mở khóa. Vuốt sơ đồ sang trái hoặc phải để xem các phòng mới.' },
    claim: { chapter: 'ship', text: 'Có yêu cầu BẢO HÀNH / đổi trả. Vào Thêm > Bảo hành để duyệt: đổi, hoàn tiền, sửa hay từ chối. Xử lý tốt thì giữ được sao đánh giá.' },
    b2b: { chapter: 'ship', text: 'Một ĐƠN LỚN từ khách sạn! Đơn lớn lãi to nhưng yêu cầu số lượng và hạn giao nghiêm. Xem mục Nhập > Đơn lớn trước khi nhận.' },
    broke: { chapter: 'up', text: 'Tiền mặt đang thấp! Luật số 2 của Bác: giữ vốn. Đừng nhập thêm khi chưa đủ tiền trả lương và tiền nhập tuần sau.' },
    meeting: { chapter: 'staff', text: 'Đến kỳ HỌP NHÂN VIÊN tuần này. Vào Nhân viên > Họp để nghe ý kiến và xử lý mâu thuẫn, nhân viên vui thì bán giỏi.' }
  };

  // ---- Sổ tay Bác Tư: chương > mục (ic = tên icon G.icon) ----
  D.book = [
    { id: 'sell', title: 'Bán hàng', ic: 'bed', items: [
      { ic: 'bed', t: 'Trưng bày mẫu', x: 'Mỗi ô kệ hoặc giường trưng bày đúng 1 mẫu (một mã màu). Chạm vào kệ trên sơ đồ để chọn mẫu. Khách xem mẫu rồi mua hàng ở KHO, nên kho phải luôn đủ hàng.' },
      { ic: 'star', t: 'Mã màu và Lookbook', x: 'Mỗi bộ chăn ga có mã màu riêng (ví dụ PT-101). Lookbook là cuốn tạp chí giường ngủ cho xem mã, màu, tranh phòng ngủ, và những mẫu đang có khách đặt. Mở từ menu Thêm hoặc nút quyển sách trên sơ đồ.' },
      { ic: 'coin', t: 'Đặt giá', x: 'Mục Kho, tab Giá. Mỗi hãng có giá sàn: bán thấp hơn sẽ bị phạt. Giá cao quá thì khách bỏ đi, thấp quá thì mất lãi.' },
      { ic: 'user', t: 'Khách và sao đánh giá', x: 'Sao trung bình quyết định lượng khách (×sao/3). Khách chờ lâu bỏ về và chấm sao thấp. Được tư vấn thì họ mua nhiều và dễ chốt hơn.' },
      { ic: 'plant', t: 'Trang trí', x: 'Cây cảnh, tranh, đèn, bể cá... đặt lên cửa hàng giúp hút thêm khách và tăng chốt đơn. Mục Kho, tab Trang trí.' }
    ] },
    { id: 'buy', title: 'Nhập hàng', ic: 'truck', items: [
      { ic: 'truck', t: 'Nguồn nhập', x: 'Chợ đầu mối về trong ngày nhưng hay lỗi. Đại lý giá chuẩn, về sau 1-2 ngày. Nhà máy rẻ nhất nhưng phải đặt số lượng lớn. Mua nhiều được chiết khấu.' },
      { ic: 'receipt', t: 'Gợi ý nhập hàng', x: 'Gợi ý xếp theo thứ tự: 1) đơn khách đã đặt (cọc, đơn lớn, livestream), 2) khách hỏi nhưng hết hàng, 3) mẫu trưng bày sắp hết, 4) bán chạy sắp hết, 5) theo mùa, 6) mẫu mới, 7) nên xả. Bấm "Đặt tất cả đơn khách" để đặt hết đơn khách một lần.' },
      { ic: 'bolt', t: 'Nhập lấy ngay (hỏa tốc)', x: 'Đắt hơn nhưng hàng về trong 1-3 giờ. Dùng khi hàng sắp trễ hạn đơn khách hoặc ô kệ trống mà khách đang hỏi.' },
      { ic: 'people', t: 'Thủ kho tự đặt hàng', x: 'Thuê Thủ kho thì mỗi sáng có một danh sách cần mua để bạn duyệt, theo ngân sách tháng. Đơn khách luôn được đặt trước.' }
    ] },
    { id: 'staff', title: 'Nhân viên', ic: 'people', items: [
      { ic: 'people', t: 'Thuê và vai trò', x: 'Bán hàng tư vấn khách. Thủ kho bổ sung kệ và gợi ý nhập. Kế toán giảm thuế phí và mở báo cáo chi tiết. Sale B2B lo đơn khách sạn. Càng nhiều sao càng giỏi nhưng lương cao.' },
      { ic: 'bell', t: 'Lịch ca', x: 'Mỗi người nên nghỉ ít nhất một ngày mỗi tuần. Làm quá sức thì mệt, hài lòng giảm, dễ nghỉ việc. Xếp ca ở Nhân viên > Lịch ca.' },
      { ic: 'user', t: 'Họp nhân viên', x: 'Mỗi tuần có một buổi họp: nghe ý kiến, xử lý mâu thuẫn, quyết định thưởng phạt. Họp đều thì tinh thần tốt.' }
    ] },
    { id: 'ship', title: 'Đơn khách và ship', ic: 'gift', items: [
      { ic: 'gift', t: 'Đơn đặt cọc', x: 'Khi hàng hết, khách có thể đặt cọc và hẹn ngày. Giao đủ trước hạn thì tốt, trễ hạn mất cọc và danh tiếng.' },
      { ic: 'truck', t: 'Giao hàng', x: 'Đặt ship trước 17h thì giao trong ngày, sau 17h giao sáng mai. Khách gấp dùng Hỏa tốc (1-2 giờ, phí cao).' },
      { ic: 'shield', t: 'Bảo hành và đổi trả', x: 'Khách gửi yêu cầu theo chính sách bạn đặt (Thêm > Bảo hành). Chính sách rộng thu hút khách nhưng tốn chi phí. Nhân viên CSKH tự xử lý ca rõ ràng.' },
      { ic: 'hotel', t: 'Đơn lớn B2B', x: 'Khách sạn, resort đặt số lượng lớn với hạn giao nghiêm. Lãi tốt nhưng phạt nặng nếu trễ.' }
    ] },
    { id: 'event', title: 'Sự kiện', ic: 'badge', items: [
      { ic: 'badge', t: 'Kiểm tra', x: 'Thỉnh thoảng có đoàn kiểm tra giá sàn và nguồn hàng. Bán đúng giá, lưu hóa đơn là yên tâm.' },
      { ic: 'live', t: 'Livestream', x: 'Từ cấp Cửa hàng mặt phố có phòng livestream để bán online, hợp ngày mưa. Chọn mẫu giới thiệu, voucher và quảng cáo.' },
      { ic: 'warn', t: 'Thời tiết và mùa', x: 'Rét thì chăn bán chạy, nồm ẩm thì đệm và chống ẩm, nóng thì ga lụa mát, mưa to thì khách online tăng. Xem dự báo 3 ngày ở bảng Chuẩn bị.' },
      { ic: 'bell', t: 'Chuông thông báo', x: 'Mọi sự kiện đều báo ở chuông trên thanh trên cùng: đơn lớn, khách bỏ cọc, kiểm tra, hàng về.' }
    ] },
    { id: 'up', title: 'Nâng cấp và vốn', ic: 'trophy', items: [
      { ic: 'trophy', t: 'Điều kiện nâng cấp', x: 'Mỗi cấp cần doanh thu tích lũy, danh tiếng và một khoản VỐN TỐI THIỂU còn lại trong két. Xem thanh tiến độ ở tab Nâng cấp.' },
      { ic: 'chart', t: 'Ghi sổ (Báo cáo)', x: 'Luật số 1 của Bác: ghi sổ. Báo cáo cho biết doanh thu, lãi, chi phí từng ngày, từng tháng.' },
      { ic: 'coin', t: 'Giữ vốn', x: 'Luật số 2: đừng đổ hết tiền vào hàng. Chừa tiền trả lương, tiền nhập hàng, và vốn nâng cấp.' },
      { ic: 'crown', t: 'Giữ uy tín', x: 'Luật số 3: hứa là làm. Danh tiếng 0-100 và sao đánh giá quyết định lượng khách và mở khóa cấp mới.' }
    ] },
    { id: 'secret', title: 'Bí quyết riêng của Bác Tư', ic: 'star', locked: true, items: [
      { ic: 'star', t: 'Mở sạp sớm, chốt đơn sớm', x: 'Buổi sáng khách ít nhưng mua thật. Dành giờ đó xếp kệ, kiểm kho, đặt hàng để giờ cao điểm có sẵn hàng.' },
      { ic: 'gift', t: 'Khách cọc là vàng', x: 'Một đơn cọc có hạn giao đáng giá hơn ba khách đi ngang. Luôn đặt đủ hàng cho đơn cọc trước, rồi mới nghĩ đến mẫu mới.' },
      { ic: 'plant', t: 'Cây xanh không bao giờ lỗ', x: 'Đầu tư trang trí rẻ trước (cây, tranh, thảm), tiền nhiều hơn mới tính tới đèn chùm và bể cá.' },
      { ic: 'people', t: 'Đối đãi nhân viên', x: 'Nhân viên vui thì khách vui. Họp đều, nghỉ đủ, thưởng đúng lúc, tiền lương trả đúng ngày.' }
    ] }
  ];
})();
