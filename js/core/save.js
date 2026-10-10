/* Lưu / tải localStorage (key có version) + autosave + reset */
(function () {
  'use strict';
  var G = window.G;
  var KEY = 'vuachanga_save_v1';
  G.save = {
    KEY: KEY,
    save: function () {
      try {
        G.state.savedAt = Date.now();
        localStorage.setItem(KEY, JSON.stringify(G.state));
        return true;
      } catch (e) { console.warn('save failed', e); return false; }
    },
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return null;
        // PASS 13: hàng chợ -> hàng phổ thông Loại 2 (id cũ cho_* => l2_*), bỏ chữ "Hàng chợ" trong văn bản đã lưu
        if (raw.indexOf('cho_') >= 0 || raw.indexOf('Hàng chợ') >= 0) raw = raw.replace(/cho_(goi|ga|chan|dem|vo)(?![A-Za-z_])/g, 'l2_$1').replace(/Hàng chợ /g, '').replace(/Hàng chợ/g, 'Hàng phổ thông').replace(/Ga cotton chợ/g, 'Ga cotton thường').replace(/Chăn bông chợ/g, 'Chăn bông thường');
        // PASS 19: ga lẻ cũ -> bộ chăn ga gối màu #1 của cùng dòng (id sh_ga -> sh_ga_1 ...)
        if (/(sh_ga|hv_ga|ev_ga|se_ga|own_ga|l1_ga|l2_ga)/.test(raw)) raw = raw.replace(/(^|[^A-Za-z0-9_])(sh_ga|hv_ga|ev_ga|se_ga|own_ga|l1_ga|l2_ga)(?![A-Za-z0-9_])/g, '$1$2_1').replace(/"family":"([a-z0-9]+_ga)_1"/g, '"family":"$1"');
        var o = JSON.parse(raw);
        if (!o || o.v !== 1) return null;
        return o;
      } catch (e) { console.warn('load failed', e); return null; }
    },
    has: function () { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } },
    reset: function () {
      if (!confirm('Xóa toàn bộ tiến trình và chơi lại từ đầu?')) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      G.save.disabled = true;
      location.reload();
    },
    startAuto: function () {
      function now() { if (!G.save.disabled && G.state) G.save.save(); }
      setInterval(now, 10000);
      // beforeunload không chạy đáng tin cậy trên điện thoại/PWA: lưu thêm khi ẩn trang, rời trang hoặc về nền
      window.addEventListener('beforeunload', now);
      window.addEventListener('pagehide', now);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') now(); });
    }
  };
})();
