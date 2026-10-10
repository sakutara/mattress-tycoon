/* Hệ thống thông báo dùng chung: toast, modal chặn game có lựa chọn, chuông có badge, beep WebAudio */
(function () {
  'use strict';
  var G = window.G;
  var N = G.notify = {
    list: [], unread: 0, queue: [], current: null,
    // ---- âm thanh ----
    beep: function (kind) {
      if (!G.settings.sfx || (G.clock && G.clock.skipping)) return;
      try {
        N.ctx = G.audio.get(); if (!N.ctx) return;
        var seqs = { info: [[660, 0.08]], good: [[660, 0.08], [880, 0.1]], warn: [[440, 0.1], [440, 0.1]], bad: [[330, 0.15], [220, 0.2]], alert: [[880, 0.1], [660, 0.1], [880, 0.15]] };
        var seq = seqs[kind] || seqs.info, t = N.ctx.currentTime;
        seq.forEach(function (n) {
          var o = N.ctx.createOscillator(), g = N.ctx.createGain();
          o.type = 'sine'; o.frequency.value = n[0];
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + n[1]);
          o.connect(g); g.connect(N.ctx.destination); o.start(t); o.stop(t + n[1] + 0.02);
          t += n[1] + 0.03;
        });
      } catch (e) { /* bỏ qua */ }
    },
    // icon theo loại / từ khóa tiêu đề
    iconFor: function (type, title) {
      var t = String(title || '').toLowerCase(), n = null;
      if (/hỏa tốc|nhập gấp|lấy ngay/.test(t)) n = 'bolt'; else if (/giao|ship|hàng về|xe tải|đơn nhập/.test(t)) n = 'truck';
      else if (/đơn lớn|khách sạn|resort|b2b/.test(t)) n = 'hotel'; else if (/kiểm tra|thanh tra|phạt/.test(t)) n = 'badge';
      else if (/live|livestream/.test(t)) n = 'live'; else if (/bảo hành|đổi trả|hoàn tiền/.test(t)) n = 'shield';
      else if (/nợ|công nợ|thanh toán/.test(t)) n = 'receipt'; else if (/đánh giá|sao/.test(t)) n = 'star';
      else if (/kol|khuyến mãi|voucher|quà|chiến dịch/.test(t)) n = 'gift'; else if (/trang trí|decor/.test(t)) n = 'plant';
      else if (/cấp|lên cấp|mở khóa/.test(t)) n = 'trophy'; else if (/báo cáo/.test(t)) n = 'chart';
      return n || (type === 'bad' ? 'warn' : type === 'warn' ? 'warn' : type === 'good' ? 'check' : 'bell');
    },
    // ---- toast ----
    toast: function (text, type, ms) {
      if (G.clock && G.clock.skipping) return;
      var root = document.getElementById('toasts'); if (!root) return;
      var el = document.createElement('div');
      el.className = 'toast ' + (type || 'info');
      el.innerHTML = text;
      root.appendChild(el);
      while (root.children.length > 3) root.removeChild(root.firstChild);
      setTimeout(function () { el.classList.add('out'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400); }, ms || 3500);
    },
    // ---- chuông ----
    // opts: {title, text, type, sound, toast:true, onClick}
    push: function (o) {
      var item = { id: Date.now() + Math.random(), day: G.state ? G.state.day : 0, title: o.title || '', text: o.text || '', type: o.type || 'info', read: false, onClick: o.onClick };
      N.list.unshift(item); if (N.list.length > 40) N.list.pop();
      N.unread++;
      N.renderBell();
      if (o.toast !== false) N.toast(G.icon(N.iconFor(item.type, item.title), 20) + ' <b>' + G.esc(item.title) + '</b>' + (item.text ? '<br>' + G.esc(item.text) : ''), item.type);
      if (o.action && o.toast !== false) { var root = document.getElementById('toasts'), last = root && root.lastChild; if (last) { var ab = document.createElement('button'); ab.className = 'btn primary toast-act'; ab.textContent = o.action.label; ab.onclick = function () { try { o.action.fn(); } catch (e) { console.error(e); } if (last.parentNode) last.parentNode.removeChild(last); }; last.appendChild(ab); } }
      if (o.sound !== false) N.beep(o.sound || (item.type === 'bad' ? 'bad' : item.type === 'good' ? 'good' : item.type === 'warn' ? 'warn' : 'info'));
      return item;
    },
    renderBell: function () {
      var b = document.getElementById('bell-badge');
      if (b) { b.textContent = N.unread > 99 ? '99+' : N.unread; b.style.display = N.unread ? 'flex' : 'none'; }
      var l = document.getElementById('bell-list');
      if (l) {
        if (!N.list.length) { l.innerHTML = '<div class="bell-empty">Chưa có thông báo</div>'; return; }
        l.innerHTML = N.list.map(function (it, i) {
          return '<div class="bell-item ' + it.type + (it.read ? ' read' : '') + '" data-i="' + i + '"><div class="bi-t">' + G.icon(N.iconFor(it.type, it.title), 18) + ' Ngày ' + it.day + ' · ' + G.esc(it.title) + '</div>' + (it.text ? '<div class="bi-x">' + G.esc(it.text) + '</div>' : '') + '</div>';
        }).join('');
      }
    },
    markAllRead: function () { N.list.forEach(function (i) { i.read = true; }); N.unread = 0; N.renderBell(); },
    // ---- modal chặn game ----
    // opts: {title, html, choices:[{label, cls, fn}], def: index chọn mặc định khi tua nhanh, sound}
    modal: function (o) {
      if (G.clock && G.clock.skipping) {
        var c = o.choices[o.def != null ? o.def : 0]; if (c && c.fn) { try { c.fn(); } catch (e) { console.error(e); } }
        return;
      }
      N.queue.push(o);
      if (!N.current) N.next();
    },
    next: function () {
      var o = N.queue.shift();
      if (!o) { N.current = null; return; }
      N.current = o;
      G.clock.pushPause();
      var root = document.getElementById('modal-root');
      root.innerHTML = '<div class="modal-back"><div class="modal"><h3>' + G.esc(o.title) + '</h3><div class="modal-body">' + o.html + '</div><div class="modal-actions"></div></div></div>';
      var act = root.querySelector('.modal-actions');
      o.choices.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'btn ' + (c.cls || ''); b.innerHTML = c.label;
        if (c.disabled) b.disabled = true;
        b.onclick = function () {
          root.innerHTML = ''; G.clock.popPause(); N.current = null;
          try { if (c.fn) c.fn(); } catch (e) { console.error(e); }
          if (G.ui && G.ui.refresh) G.ui.refresh();
          N.next();
        };
        act.appendChild(b);
      });
      N.beep(o.sound || 'alert');
    },
    init: function () {
      var btn = document.getElementById('bell-btn'), pop = document.getElementById('bell-pop');
      if (btn) btn.onclick = function (e) { e.stopPropagation(); pop.classList.toggle('open'); if (pop.classList.contains('open')) { N.markAllRead(); } };
      document.addEventListener('click', function (e) { if (pop && !pop.contains(e.target)) pop.classList.remove('open'); });
      var l = document.getElementById('bell-list');
      if (l) l.onclick = function (e) { var it = e.target.closest('.bell-item'); if (!it) return; var x = N.list[+it.dataset.i]; if (x && x.onClick) { pop.classList.remove('open'); x.onClick(); } };
      N.renderBell();
    }
  };
})();
