/* Hướng dẫn chơi bằng NPC: Bác Tư & Mai. Mở đầu -> chuỗi bước (tình huống hỏi-đáp xen thao tác thật) -> kết; mẹo theo ngữ cảnh; Sổ tay.
   Dữ liệu ở js/data/story.js (G.storyData). Tiến độ lưu ở G.state.story (tutStep = chỉ số trong SEQ). */
(function () {
  'use strict';
  var G = window.G, D = G.storyData, E = G.esc, UI = G.ui, P = UI.panels, SP = G.sprites;
  function $(id) { return document.getElementById(id); }
  function st() { return G.state.story; }
  function I() { return G.icon.apply(null, arguments); }

  // thứ tự các bước sau phần mở đầu
  var SEQ = [
    { scene: 'a' }, { tut: 'shelf' }, { scene: 'b' }, { tut: 'buy' }, { tut: 'open' }, { tut: 'watch' }, { tut: 'speed' },
    { scene: 'c' }, { scene: 'd' }, { scene: 'e' }, { tut: 'hire' }, { scene: 'f' }, { tut: 'report' }
  ];
  var SFX = { key: 'info', ding: 'good', coin: 'good', rain: 'info' };
  var S = G.story = { flags: {}, busy: false, SEQ: SEQ };

  function sub(t) { return String(t || '').replace(/\{p\}/g, G.state.player.name).replace(/\{shop\}/g, G.state.shopName); }
  function look(who) {
    var pl = G.state.player, n = D.npc[who] || {};
    if (who === 'me') return { shirt: pl.outfit, hair: pl.hair, hairStyle: pl.hairStyle, skin: '#f6c9a0', crown: true, apron: true, role: 'owner' };
    return { shirt: n.shirt, hair: n.hair, hairStyle: n.hairStyle, skin: n.skin, glasses: n.glasses, apron: n.apron, bag: n.bag };
  }
  function nameOf(who) { return who === 'me' ? G.state.player.name : (D.npc[who] || {}).name || ''; }

  // =================== hộp thoại (có sân khấu chibi) ===================
  var dlg = null;
  function openDlg() {
    if (dlg) return dlg;
    var root = document.createElement('div'); root.id = 'st-dlg';
    root.innerHTML = '<div class="st-back"></div><div class="st-box"><div class="st-ribbon" style="display:none"></div><canvas class="st-cv"></canvas>' +
      '<div class="st-who"><b class="st-name"></b><small class="st-role"></small><button class="st-skipall" type="button">Bỏ qua hướng dẫn</button></div>' +
      '<div class="st-text"></div><div class="st-next">▼</div><div class="st-choices"></div></div>';
    document.body.appendChild(root);
    dlg = { root: root, cv: root.querySelector('.st-cv'), cast: {}, line: null, t: 0, typing: false, full: '', pos: 0, onNext: null, paused: false, timer: null, anim: null };
    G.clock.pushPause(); dlg.paused = true;
    root.querySelector('.st-box').addEventListener('click', function (e) {
      if (e.target.closest('button') || !dlg) return;
      if (dlg.typing) { finishType(); return; }
      if (dlg.onNext) { var f = dlg.onNext; dlg.onNext = null; root.querySelector('.st-next').style.visibility = 'hidden'; f(); }
    });
    root.querySelector('.st-skipall').onclick = function () { if (confirm('Bỏ qua toàn bộ hướng dẫn? Bạn có thể xem lại trong Sổ tay (menu Thêm).')) S.skipAll(); };
    var w = Math.min(480, window.innerWidth), dp = Math.min(2, window.devicePixelRatio || 1);
    dlg.W = w; dlg.H = 124; dlg.cv.width = w * dp; dlg.cv.height = dlg.H * dp; dlg.cv.style.height = dlg.H + 'px'; dlg.dp = dp;
    dlg.anim = setInterval(function () { dlg.t += 0.07; drawStage(); }, 66);
    return dlg;
  }
  function closeDlg() {
    if (!dlg) return;
    clearInterval(dlg.anim); clearInterval(dlg.timer);
    if (dlg.root.parentNode) dlg.root.parentNode.removeChild(dlg.root);
    if (dlg.paused) G.clock.popPause();
    dlg = null;
  }
  function drawStage() {
    if (!dlg) return;
    var cv = dlg.cv, c = cv.getContext('2d'), W = dlg.W, H = dlg.H, ln = dlg.line || {}, rain = dlg.weather === 'rain';
    c.setTransform(dlg.dp, 0, 0, dlg.dp, 0, 0); c.clearRect(0, 0, W, H);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rain ? '#9FB4CC' : '#BFE6FF'); g.addColorStop(1, rain ? '#C9D6E4' : '#FFF1D6');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // sạp chợ phía sau (mái sọc)
    for (var i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#FF9EB8' : '#FFFFFF'; c.fillRect(W * 0.06 + i * W * 0.05, 14, W * 0.05, 14); }
    c.fillStyle = '#E6C79C'; c.fillRect(W * 0.06, 28, W * 0.4, 46); c.fillStyle = '#D9B48A'; c.fillRect(W * 0.06, 28, W * 0.4, 4);
    c.fillStyle = '#C7B6F0'; c.fillRect(W * 0.1, 42, 26, 14); c.fillStyle = '#9FD8C3'; c.fillRect(W * 0.1 + 30, 38, 26, 18);
    c.fillStyle = '#D6CEF0'; c.fillRect(0, H - 26, W, 26); c.fillStyle = '#C6BCE6'; c.fillRect(0, H - 26, W, 3);
    if (rain) { c.strokeStyle = 'rgba(70,100,150,.55)'; c.lineWidth = 1; for (var r = 0; r < 26; r++) { var rx = (r * 53 + dlg.t * 90) % W, ry = (r * 37 + dlg.t * 160) % H; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 3, ry + 9); c.stroke(); } }
    var cast = dlg.cast, keys = Object.keys(cast).sort(function (a, b) { return cast[a][1] - cast[b][1]; });
    keys.forEach(function (k) {
      var a = cast[k], speaking = ln.who === k, mood = (speaking && ln.mood) || (speaking && /[♪♥]/.test(ln.emo || '') ? 'happy' : 'neutral');
      var p = look(k); p.x = 0; p.y = 0; p.face = a[2]; p.mood = mood; p.phase = dlg.t + k.length; p.moving = false;
      c.save(); c.translate(a[0] * W, H - 12); c.scale(1.9, 1.9); c.globalAlpha = speaking || !ln.who || ln.who === 'narr' ? 1 : 0.8;
      c.translate(0, speaking ? -Math.abs(Math.sin(dlg.t * 3)) * 1.2 : 0); SP.person(c, p); c.restore();
      if (speaking && ln.emo) {
        var bx = a[0] * W + 16, by = H - 12 - 100; c.fillStyle = '#fff'; c.strokeStyle = '#26325F'; c.lineWidth = 1.5; c.beginPath(); c.arc(bx, by, 11, 0, 6.3); c.fill(); c.stroke();
        c.fillStyle = '#26325F'; c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ln.emo, bx, by + 1);
      }
    });
  }
  function finishType() { if (!dlg) return; clearInterval(dlg.timer); dlg.typing = false; dlg.root.querySelector('.st-text').textContent = dlg.plain; arm(); }
  function arm() { if (dlg && dlg.cb) { var f = dlg.cb; dlg.cb = null; dlg.onNext = f; dlg.root.querySelector('.st-next').style.visibility = 'visible'; } }
  // hiện 1 câu thoại, gọi cb khi người chơi chạm tiếp
  function say(line, cb, ctx) {
    var d = openDlg(); d.line = line;
    if (line.at && Object.keys(line.at).length) { d.cast = {}; Object.keys(line.at).forEach(function (k) { d.cast[k] = line.at[k]; }); }
    if (line.who && line.who !== 'narr' && !d.cast[line.who]) d.cast[line.who] = line.who === 'me' ? [0.32, 0.9, 1] : [0.68, 0.9, -1];
    if (line.w) d.weather = line.w === 'rain' ? 'rain' : 'sun';
    if (line.sfx) G.notify.beep(SFX[line.sfx] || 'info');
    var rib = d.root.querySelector('.st-ribbon'); rib.style.display = ctx && ctx.title ? 'block' : 'none'; rib.textContent = ctx && ctx.title ? ctx.title : '';
    var nm = nameOf(line.who), role = line.who === 'me' ? 'Chủ sạp mới' : (D.npc[line.who] || {}).role || '';
    if (line.cust) { nm = nm + ' (đóng vai khách)'; role = ''; }
    d.root.querySelector('.st-name').textContent = nm; d.root.querySelector('.st-role').textContent = role;
    d.root.querySelector('.st-choices').innerHTML = '';
    var plain = sub(line.text); d.plain = plain; d.cb = cb; d.pos = 0; d.typing = true;
    var txt = d.root.querySelector('.st-text');
    d.root.querySelector('.st-next').style.visibility = 'hidden'; txt.textContent = '';
    clearInterval(d.timer);
    d.timer = setInterval(function () {
      d.pos += 2; if (d.pos >= plain.length) { finishType(); return; }
      txt.textContent = plain.slice(0, d.pos);
    }, 28);
  }
  function choose(list, cb) {
    if (!dlg) return; var box = dlg.root.querySelector('.st-choices'); dlg.root.querySelector('.st-next').style.visibility = 'hidden';
    box.innerHTML = list.map(function (o, i) { return '<button type="button" class="btn st-ch" data-i="' + i + '">' + E(sub(o.label)) + '</button>'; }).join('');
    box.onclick = function (e) { var b = e.target.closest('[data-i]'); if (!b) return; box.onclick = null; box.innerHTML = ''; cb(list[+b.dataset.i]); };
  }
  // chạy lần lượt các câu thoại
  function playLines(lines, done, ctx) {
    var i = 0;
    (function step() { if (!S.busy) return; if (i >= lines.length) { done(); return; } var ln = lines[i++]; say(ln, step, ctx); })();
  }

  // =================== tình huống ===================
  function applyFx(fx) {
    var s = G.state, m = [];
    if (S.isReplay() || !fx) return;
    if (fx.money) { G.econ.cash(fx.money); m.push((fx.money > 0 ? '+' : '') + G.fmt.short(fx.money)); }
    if (fx.rep) { s.rep = G.clamp(s.rep + fx.rep, 0, 100); m.push('+' + fx.rep + ' danh tiếng'); }
    if (fx.hire) { st().voucher = fx.hire; m.push('phiếu miễn lương ' + fx.hire + ' ngày'); }
    if (m.length) G.notify.toast('🎁 ' + m.join(' · '), fx.money < 0 ? 'warn' : 'good');
    if (UI.hud) UI.hud.update();
  }
  function playScene(id, done) {
    var sc = D.scenes[id], ctx = { title: sc.title };
    playLines(sc.lines, function () {
      if (!sc.ask || !sc.ask.length) { playLines(sc.after || [], done, ctx); return; }
      choose(sc.ask, function (o) {
        st().choices[id] = o.id; st().stars.push(o.stars || 3);
        applyFx(o.fx);
        var base = sc.lines[sc.lines.length - 1];
        say({ who: 'tu', emo: o.stars >= 4 ? '♥' : '!', text: o.reply, at: base.at }, function () { playLines(sc.after || [], done, ctx); }, ctx);
      });
    }, ctx);
  }

  // =================== bước thao tác thật ===================
  var strip = null, hlEls = [], cur = null;
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function slotsKey() { return G.state.slots.map(function (x) { return x.sku || '-'; }).join(','); }
  function closeSheets() { if (P.sheetOpen) P.closeSheet(); var s2 = $('sheet2'); if (s2 && s2.classList.contains('open') && UI.sheet2 && UI.sheet2.close) UI.sheet2.close(); }
  function navBtn(g) { return qa('#bottom-nav [data-g="' + g + '"]'); }
  var ACT = {
    shelf: {
      enter: function () { closeSheets(); this.base = slotsKey(); },
      targets: function () { return qa('.canvas-wrap'); },
      done: function () { return slotsKey() !== this.base; }
    },
    buy: {
      enter: function () { this.placed = false; },
      targets: function () {
        if (P.sheetOpen && P.active === 'buy') { var b = qa('[data-act="sugCartAdd"]:not([disabled])'); return b.length ? b.slice(0, 1) : qa('#tab-body .btn.primary').slice(0, 1); }
        return navBtn('buy');
      },
      done: function () { return this.placed; }
    },
    open: {
      enter: function () { closeSheets(); },
      targets: function () { return qa('#open-btn,#open-mini').filter(function (e) { return e.offsetParent !== null; }); },
      done: function () { return !G.state.prep; }
    },
    watch: {
      enter: function () { this.n0 = G.state.today ? G.state.today.visitors : 0; },
      targets: function () { return []; },
      done: function () { return G.customers.list.length > 0 || (G.state.today && G.state.today.visitors > this.n0); }
    },
    speed: {
      enter: function () { this.changed = false; },
      targets: function () { return qa('#speed'); },
      done: function () { return this.changed; }
    },
    hire: {
      enter: function () { this.n0 = G.state.staff.length; },
      targets: function () {
        if (P.sheetOpen && P.active === 'staff') {
          var h = qa('[data-act="hire"]'); if (h.length) return h.slice(0, 1);
          var r = qa('[data-act="hireRole"][data-id="sales"]'), tab = qa('[data-act="staffSub"][data-id="hire"]');
          if (tab.length && !tab[0].classList.contains('on')) return tab;
          return r.length ? r : tab;
        }
        return navBtn('staff');
      },
      done: function () { return G.state.staff.length > this.n0; }
    },
    report: {
      enter: function () { },
      targets: function () {
        if (P.sheetOpen && P.active === 'more') return qa('[data-act="goTab"][data-id="report"]');
        return navBtn('more');
      },
      done: function () { return P.sheetOpen && P.active === 'report'; }
    }
  };
  function setHl(els) {
    var same = els.length === hlEls.length && els.every(function (e, i) { return e === hlEls[i]; });
    if (same) return;
    hlEls.forEach(function (e) { e.classList.remove('st-hl'); }); hlEls = els; els.forEach(function (e) { e.classList.add('st-hl'); });
  }
  function drawFace(cv, who, mood) {
    var c = cv.getContext('2d'), dp = 2; cv.width = 56 * dp; cv.height = 64 * dp; c.setTransform(dp, 0, 0, dp, 0, 0); c.clearRect(0, 0, 56, 64);
    c.fillStyle = '#EAF6FF'; c.fillRect(0, 0, 56, 64); var p = look(who); p.x = 0; p.y = 0; p.face = 1; p.mood = mood || 'happy'; p.phase = 0;
    c.save(); c.translate(28, 60); c.scale(1.35, 1.35); SP.person(c, p); c.restore();
  }
  function showStrip(who, title, text, mood, skipText) {
    if (!strip) {
      strip = document.createElement('div'); strip.id = 'st-strip';
      strip.innerHTML = '<canvas class="st-face"></canvas><div class="st-sbody"><b class="st-st"></b><div class="st-ss"></div></div><button type="button" class="st-sskip">Bỏ qua bước</button>';
      document.body.appendChild(strip);
      strip.querySelector('.st-sskip').onclick = function () { S.skipStep(); };
      placeStrip([]);
    }
    drawFace(strip.querySelector('.st-face'), who, mood);
    strip.querySelector('.st-st').textContent = title; strip.querySelector('.st-ss').textContent = sub(text);
    strip.querySelector('.st-sskip').style.display = skipText === false ? 'none' : '';
  }
  // dải hướng dẫn tránh che đối tượng cần bấm: mục tiêu ở nửa trên màn hình -> dải xuống dưới thanh điều hướng, ngược lại lên trên
  function placeStrip(els) {
    if (!strip) return; var hb = $('hud'), top = hb ? Math.round(hb.getBoundingClientRect().bottom) + 6 : 56, low = false;
    if (els.length) { var r = els[0].getBoundingClientRect(); low = (r.top + r.height / 2) < window.innerHeight * 0.5; }
    if (low) { strip.style.top = 'auto'; strip.style.bottom = 'calc(var(--nav-h, 58px) + env(safe-area-inset-bottom, 0px) + 8px)'; }
    else { strip.style.bottom = 'auto'; strip.style.top = top + 'px'; }
  }
  function hideStrip() { if (strip && strip.parentNode) strip.parentNode.removeChild(strip); strip = null; setHl([]); }
  function playAction(id, done) {
    var def = D.tut[id], a = ACT[id];
    if (!def || !a) { done(); return; }
    a.enter && a.enter.call(a);
    cur = { id: id, a: a, def: def, done: done, t0: Date.now(), hinted: false, finished: false };
    showStrip('tu', def.t, def.say, 'neutral');
    G.notify.beep('info');
    S.tick();
  }
  function finishAction() {
    if (!cur || cur.finished) return; cur.finished = true; var c = cur; setHl([]);
    showStrip('tu', '✔ ' + c.def.t, c.def.done, 'happy', false); G.notify.beep('good');
    setTimeout(function () { hideStrip(); if (cur === c) cur = null; if (S.busy) c.done(); }, 2200);
  }
  S.tick = function () {
    if (!cur || cur.finished || !G.state) return;
    var a = cur.a, el = [];
    try { el = a.targets.call(a) || []; } catch (e) { console.error(e); }
    setHl(el); placeStrip(el);
    var ok = false; try { ok = a.done.call(a); } catch (e) { console.error(e); }
    if (ok) { finishAction(); return; }
    if (!cur.hinted && Date.now() - cur.t0 > 20000) { cur.hinted = true; showStrip('tu', cur.def.t, cur.def.hint, 'neutral'); }
  };
  S.skipStep = function () { if (cur && !cur.finished) { var c = cur; cur = null; hideStrip(); if (S.busy) c.done(); } };

  // sự kiện từ game (dùng bộ đếm riêng, không phụ thuộc vòng vẽ)
  setInterval(function () { S.tick(); S.tipPoll(); }, 500);
  G.on('orderPlaced', function () { if (cur && cur.id === 'buy') { cur.a.placed = true; S.tick(); } });
  G.on('speed', function () { if (cur && cur.id === 'speed') { cur.a.changed = true; S.tick(); } });
  G.on('staffChanged', function () {
    var s = G.state, v = s.story && s.story.voucher;
    if (v > 0) { var h = s.staff.filter(function (x) { return x.role === 'sales' && !x.freeGiven; }).pop(); if (h) { h.freeDays = v; h.freeGiven = true; s.story.voucher = 0; G.notify.toast('🎟 ' + h.name + ': miễn lương ' + v + ' ngày (quà của Bác Tư)', 'good'); } }
    S.tick();
  });
  G.on('levelUp', function () { S.flags.levelup = true; });

  // =================== luồng chính ===================
  S.isReplay = function () { return !!(G.state.story && G.state.story.replay); };
  function runIntro() {
    S.busy = true; st().started = true;
    playLines(D.intro, function () { closeDlg(); st().introDone = true; st().tutStep = 0; G.save.save(); runStep(); });
  }
  function runStep() {
    if (!S.busy) return; var step = SEQ[st().tutStep];
    if (!step) { finish(); return; }
    var after = function () { st().tutStep++; G.save.save(); runStep(); };
    if (step.scene) playScene(step.scene, function () { closeDlg(); after(); });
    else { closeDlg(); playAction(step.tut, after); }
  }
  function finish() {
    var rep = S.isReplay(), s = st();
    var lines = D.endTalk.slice(rep ? 1 : 0);
    if (!rep && !s.rewarded) {
      s.rewarded = true; G.state.rep = G.clamp(G.state.rep + 5, 0, 100);
      G.decor.give('plant', 1, false);
    }
    s.book = true;
    playLines(lines, function () {
      closeDlg(); s.tutDone = true; S.busy = false; G.save.save();
      if (UI.hud) UI.hud.update(); P.refresh(true);
      G.notify.push({ title: 'Sổ tay Bác Tư', text: 'Đã mở khóa. Xem trong menu Thêm > Sổ tay (hoặc ☰ > Hướng dẫn).', type: 'good' });
    });
  }
  S.begin = function () { if (S.busy) return; S.busy = true; runIntro(); };
  S.resume = function () {
    var s = st(); if (s.tutDone || S.busy) return;
    S.busy = true;
    if (!s.introDone) runIntro(); else runStep();
  };
  S.skipAll = function () {
    var s = st(); S.busy = false; cur = null; hideStrip(); closeDlg();
    s.started = true; s.introDone = true; s.tutDone = true; s.book = true; G.save.save(); P.refresh(true);
    G.notify.toast('Đã bỏ qua hướng dẫn. Xem lại trong Sổ tay bất cứ lúc nào.', 'info');
  };
  S.replay = function () {
    var s = st(); if (S.busy) return;
    s.replay = true; s.tutDone = false; s.introDone = true; s.tutStep = 0; s.started = true; S.busy = true; closeBook(); runStep();
  };
  // đảm bảo save cũ (trước khi có hướng dẫn) không bị bắt học lại
  G.on('init', function () {
    var s = G.state, t = s.story;
    if (!t.started && !t.tutDone && (s.player.done || s.day > 1 || s.totalRevenue > 0)) { t.tutDone = true; t.introDone = true; t.book = true; }
  });

  // phiếu miễn lương: bao nhiêu ngày thì trừ bấy nhiêu ngày lương (dùng trong sim/staff.js)
  S.freeDays = function (stf) { var d = stf.freeDays || 0; stf.freeDays = 0; return d; };

  // =================== mẹo theo ngữ cảnh (Mai) ===================
  var TIPCOND = {
    deposit: function (s) { return s.special.list.some(function (o) { return o.status === 'Đã nhận cọc' || o.status === 'Chờ xử lý'; }); },
    lost: function (s) { return s.lostLog.length > 0; },
    inspect: function () { return !!S.flags.inspect; },
    levelup: function () { return !!S.flags.levelup; },
    claim: function () { return G.returns.pendingList().length > 0; },
    b2b: function (s) { return s.b2b.offers.length > 0 || s.b2b.orders.length > 0; },
    broke: function (s) { return s.day >= 3 && s.money < G.staff.payroll() + 5e6; },
    meeting: function () { return G.meeting && G.meeting.isDue(); }
  };
  var tipEl = null;
  function busyUI() { return S.busy || dlg || cur || G.notify.current || G.clock.modalCount > 0 || G.clock.skipping || $('st-book') || G.profile.open || (G.live && G.live.running && G.live.running()); }
  S.tipPoll = function () {
    var s = G.state; if (!s || !s.story || !s.story.tutDone || s.story.noTips || tipEl || s.story.tipDay === s.day || busyUI()) return;
    var keys = Object.keys(D.tips);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]; if (s.story.tipsShown[k] || !TIPCOND[k]) continue;
      var ok = false; try { ok = TIPCOND[k](s); } catch (e) { ok = false; }
      if (ok) { showTip(k); return; }
    }
  };
  function showTip(k) {
    var s = st(), t = D.tips[k]; s.tipsShown[k] = 1; s.tipDay = G.state.day;
    tipEl = document.createElement('div'); tipEl.id = 'st-tip';
    tipEl.innerHTML = '<canvas class="st-face"></canvas><div class="st-sbody"><b>Mẹo của Mai</b><div class="st-ss">' + E(sub(t.text)) + '</div><div class="st-tipbtns"><button type="button" class="btn mini primary" data-a="ok">Hiểu rồi</button><button type="button" class="btn mini" data-a="book">Sổ tay</button><button type="button" class="btn mini" data-a="off">Tắt mẹo</button></div></div>';
    document.body.appendChild(tipEl); drawFace(tipEl.querySelector('.st-face'), 'mai', 'happy'); G.notify.beep('info');
    tipEl.dataset.k = k;
    tipEl.onclick = function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a;
      if (a === 'off') { st().noTips = true; G.notify.toast('Đã tắt mẹo. Bật lại trong Sổ tay.', 'info'); }
      var ch = t.chapter; hideTip(); if (a === 'book') S.openBook(ch);
    };
    setTimeout(function () { if (tipEl && tipEl.dataset.k === k) hideTip(); }, 45000);
  }
  function hideTip() { if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl); tipEl = null; }
  // đoàn kiểm tra: bật cờ để Mai nhắc
  if (G.events && G.events.inspection) { var oi = G.events.inspection; G.events.inspection = function () { S.flags.inspect = true; return oi.apply(this, arguments); }; }

  // =================== Sổ tay Bác Tư ===================
  function closeBook() { var b = $('st-book'); if (b && b.parentNode) b.parentNode.removeChild(b); }
  function bookHtml(q, openId) {
    var unlocked = st().book, ql = (q || '').toLowerCase().trim(), h = '';
    D.book.forEach(function (ch) {
      var items = ch.items.filter(function (it) { return !ql || (it.t + ' ' + it.x + ' ' + ch.title).toLowerCase().indexOf(ql) >= 0; });
      if (!items.length) return;
      var locked = ch.locked && !unlocked, open = !!ql || openId === ch.id;
      h += '<div class="sb-ch' + (open ? ' open' : '') + (locked ? ' lk' : '') + '" data-ch="' + ch.id + '"><button type="button" class="sb-hd" data-tog="' + ch.id + '">' + I(ch.ic, 22) + '<b>' + E(ch.title) + '</b>' + (locked ? '<span class="sb-lock">🔒 Hoàn thành hướng dẫn để mở</span>' : '<span class="sb-n">' + items.length + ' mục</span>') + '</button>';
      if (!locked) h += '<div class="sb-body">' + items.map(function (it) { return '<div class="sb-it">' + I(it.ic, 20) + '<div><b>' + E(it.t) + '</b><p>' + E(it.x) + '</p></div></div>'; }).join('') + '</div>';
      h += '</div>';
    });
    return h || '<p class="muted" style="padding:16px">Không tìm thấy mục nào.</p>';
  }
  S.openBook = function (chapter) {
    closeBook();
    var d = document.createElement('div'); d.id = 'st-book';
    d.innerHTML = '<div class="sb-top"><canvas class="st-face"></canvas><div><b>Sổ tay Bác Tư</b><div class="small muted">Ba mươi năm bí quyết của bác</div></div><button type="button" class="icon sb-x" title="Đóng">✕</button></div>' +
      '<input class="sb-q" type="search" placeholder="Tìm trong sổ tay…"><div class="sb-list"></div>' +
      '<div class="sb-foot"><label class="set-row"><span>Hiện mẹo của Mai</span><input type="checkbox" class="sb-tips"></label><button type="button" class="btn sb-replay">Chơi lại hướng dẫn</button></div>';
    document.body.appendChild(d);
    drawFace(d.querySelector('.st-face'), 'tu', 'happy');
    var list = d.querySelector('.sb-list'), q = d.querySelector('.sb-q'), tips = d.querySelector('.sb-tips');
    function render() { list.innerHTML = bookHtml(q.value, chapter); }
    render(); tips.checked = !st().noTips;
    tips.onchange = function () { st().noTips = !tips.checked; };
    q.oninput = function () { chapter = null; render(); };
    list.onclick = function (e) { var b = e.target.closest('[data-tog]'); if (!b) return; b.parentNode.classList.toggle('open'); };
    d.querySelector('.sb-x').onclick = closeBook;
    d.querySelector('.sb-replay').onclick = function () { if (S.busy) return; if (confirm('Chơi lại hướng dẫn từ đầu? Phần thưởng chỉ nhận một lần.')) S.replay(); };
    if (chapter) { var el = list.querySelector('[data-ch="' + chapter + '"]'); if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30); }
  };
  P.act.openBook = function () { P.closeSheet && P.closeSheet(); S.openBook(); };
})();
