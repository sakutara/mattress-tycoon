/* Nhân viên: thuê/sa thải, lương, hài lòng, sao/xp, ca làm, hiện diện trên canvas theo ca */
(function () {
  'use strict';
  var G = window.G;
  G.addDefaults({ staff: [], cand: {}, nextStaffId: 1, autoSchedule: false, groupTraining: 0, closure: { day: 0, until: 0 }, buff: { until: 0, mult: 1 }, ownerName: 'Chủ cửa hàng' });
  var S = G.staff = {
    ents: [],
    list: function () { return G.state.staff; },
    byId: function (id) { return G.state.staff.filter(function (x) { return x.id === id; })[0]; },
    byRole: function (r) { return G.state.staff.filter(function (x) { return x.role === r; }); },
    count: function (r) { return S.byRole(r).length; },
    cap: function () { return Infinity; }, // không giới hạn số NV
    payroll: function () { var t = 0; G.state.staff.forEach(function (x) { t += x.salary; }); return t; },
    unlocked: function (r) { return G.state.level >= G.roleById[r].unlock; },
    bestStars: function (r) { var m = 0; S.byRole(r).forEach(function (x) { m = Math.max(m, x.stars); }); return m; },
    hasManager: function () { return S.count('manager') > 0; },
    market: function (role, stars) { return Math.round(G.roleById[role].salary * G.data.starMult[stars] / 100000) * 100000; },
    // ---- ứng viên ----
    genCand: function (role) {
      var s = G.state, out = [];
      for (var i = 0; i < 4; i++) {
        var r = Math.random(), stars = r < 0.6 ? 1 : r < 0.9 ? 2 : 3;
        out.push({ id: 'c' + (s.nextStaffId++), name: G.pick(G.data.lastNames) + ' ' + G.pick(G.data.firstNames), role: role, stars: stars, salary: Math.round(S.market(role, stars) * G.rand(0.92, 1.1) * (1 + 0.012 * Math.min(25, s.staff.length)) / 100000) * 100000 }); // lương đòi hỏi tăng theo quy mô
      }
      return out;
    },
    refreshCands: function (force) {
      var s = G.state;
      G.data.roles.forEach(function (r) { if (force || !s.cand[r.id] || !s.cand[r.id].length) s.cand[r.id] = S.genCand(r.id); });
    },
    hire: function (candId) {
      var s = G.state, role, c;
      Object.keys(s.cand).forEach(function (r) { s.cand[r].forEach(function (x) { if (x.id === candId) { c = x; role = r; } }); });
      if (!c) return { ok: false, msg: 'Ứng viên không còn' };
      if (!S.unlocked(role)) return { ok: false, msg: 'Chưa mở khóa vai trò này' };
      var st = { id: s.nextStaffId++, name: c.name, role: role, stars: c.stars, xp: G.data.xpForStar[c.stars] || 0, salary: c.salary, sat: 70, hiredDay: s.day, lastRaise: s.day, refusals: 0, sched: ['full', 'full', 'full', 'full', 'full', 'full', 'off'], fatigue: 0, consec: 0, status: 'ok', until: 0, skills: {}, brandSkill: {}, worked: 0, ov: null };
      s.staff.push(st);
      s.cand[role] = s.cand[role].filter(function (x) { return x.id !== candId; });
      if (s.cand[role].length < 2) s.cand[role] = s.cand[role].concat(S.genCand(role));
      if (s.autoSchedule && S.hasManager()) S.runAuto();
      G.emit('staffChanged');
      return { ok: true, msg: 'Đã thuê ' + st.name + ' (' + G.roleById[role].name + ')' };
    },
    fire: function (id) {
      var s = G.state, st = S.byId(id); if (!st) return;
      var sev = Math.round(st.salary * 0.5);
      G.econ.expense(sev, 'wages');
      s.staff = s.staff.filter(function (x) { return x.id !== id; });
      G.emit('staffChanged');
      return sev;
    },
    raise: function (id, pct) {
      var st = S.byId(id), s = G.state; if (!st) return { ok: false, msg: 'Không tìm thấy nhân viên' };
      var nw = Math.round(st.salary * (1 + pct) / 100000) * 100000; st.salary = Math.max(nw, st.salary + 100000); st.sat = Math.min(100, st.sat + 10); st.lastRaise = s.day; st.raiseAsked = false;
      return { ok: true, msg: 'Đã tăng lương cho ' + st.name + ' lên ' + G.fmt.vnd(st.salary) + '/tháng' };
    },
    remove: function (id) { G.state.staff = G.state.staff.filter(function (x) { return x.id !== id; }); G.emit('staffChanged'); },
    setLeave: function (id, days, why) { var st = S.byId(id); if (!st) return; st.status = 'leave'; st.until = G.state.day + days - 1; st.leaveWhy = why || ''; },
    // ---- ca làm ----
    shiftFor: function (st, day) { return (st.ov && st.ov.day === day) ? st.ov.shift : st.sched[G.cal.weekday(day)]; },
    shiftOn: function (st, day, min) {
      if (st.status !== 'ok') return false;
      var sh = G.data.shifts[S.shiftFor(st, day)]; if (!sh || sh.to === 0) return false;
      return min >= sh.from && min < sh.to;
    },
    cycleShift: function (id, wd) {
      var st = S.byId(id); if (!st) return;
      var order = ['off', 'am', 'pm', 'full'], i = order.indexOf(st.sched[wd]);
      st.sched[wd] = order[(i + 1) % 4];
    },
    // hiệu suất
    eff: function (st) {
      if (st.id === 'owner') return 0.9 * S.buffMult();
      var e = [0, 0.8, 1.0, 1.25][st.stars] * (1 - 0.4 * st.fatigue);
      if (S.hasManager() && st.role !== 'manager') e *= 1.06 + 0.03 * S.bestStars('manager');
      if (st.sat < 30) e *= 0.85; else if (st.sat > 80) e *= 1.05;
      var nsk = Object.keys(st.skills).length; e *= 1 + Math.min(0.15, nsk * 0.05);
      return e * S.buffMult();
    },
    buffMult: function () { var b = G.state.buff; return b.until >= G.state.day ? b.mult : 1; },
    addXp: function (st, n) {
      if (!st || st.id === 'owner') return;
      st.xp += n;
      var need = G.data.xpForStar[st.stars + 1];
      if (st.stars < 3 && need && st.xp >= need) {
        st.stars++; st.sat = Math.min(100, st.sat + 10);
        G.notify.push({ title: st.name + ' lên ' + st.stars + ' sao!', text: 'Hiệu suất tăng, nhưng có thể sẽ đòi lương cao hơn.', type: 'good', sound: 'good' });
      }
    },
    // ---- tự chia ca (cần Quản lý) ----
    runAuto: function () {
      var s = G.state; if (!S.hasManager()) return false;
      G.data.roles.forEach(function (r) {
        var grp = S.byRole(r.id), n = grp.length;
        grp.forEach(function (st, idx) {
          var off = [1, 2, 3, 0, 4][idx % 5], a = [];
          for (var d = 0; d < 7; d++) {
            var sh = 'full';
            if (n >= 3 && d < 5) sh = ['am', 'pm', 'full'][idx % 3];
            if (d === off) sh = 'off';
            if (n === 1 && d === 1) sh = 'off';
            a.push(sh);
          }
          st.sched = a;
        });
      });
      G.emit('staffChanged');
      return true;
    },
    // khi có NV vắng đột xuất: bù ca cho người còn lại (Quản lý tự xử lý)
    coverAbsences: function () {
      var s = G.state; if (!s.autoSchedule || !S.hasManager()) return;
      var wd = G.cal.weekday(s.day);
      G.data.roles.forEach(function (r) {
        var grp = S.byRole(r.id), away = grp.filter(function (x) { return x.status !== 'ok'; });
        if (!away.length) return;
        var ok = grp.filter(function (x) { return x.status === 'ok'; });
        ok.forEach(function (x) {
          var sh = S.shiftFor(x, s.day);
          if (sh === 'am' || sh === 'pm') x.ov = { day: s.day, shift: 'full' };
        });
        if (!ok.some(function (x) { return S.shiftFor(x, s.day) !== 'off'; }) && ok.length) { var pickx = ok[0]; pickx.ov = { day: s.day, shift: 'full' }; }
      });
    },
    // ---- thực thể trên canvas ----
    closed: function () { var c = G.state.closure; return c.day === G.state.day && G.state.minute < c.until; },
    ent: function (id) { return S.ents.filter(function (e) { return String(e.id) === String(id); })[0]; },
    spawnEnt: function (id, role, name, color) {
      var L = G.layout.get(), s = G.state;
      var e = { id: id, kind: 'staff', role: role, name: name, color: color, x: L.door.x + 0.5, y: L.door.y + 0.5, path: [], speed: 4.5, state: 'enter', idleT: 0, face: 1, phase: 0 };
      if (s.minute > 520) { var p = G.pick(L.spots.wander); e.x = p.x + 0.5; e.y = p.y + 0.5; e.state = 'idle'; }
      else { G.path.goto(e, L.door.x, L.door.y - 1); }
      S.ents.push(e); return e;
    },
    homeFor: function (e) {
      var L = G.layout.get(), r = e.role;
      if (r === 'owner' || r === 'manager' || r === 'accountant') return G.pick(L.spots.counter);
      if (r === 'marketing') return { x: L.door.x + 1, y: L.door.y - 1 };
      if (r === 'delivery') return { x: L.door.x - 1, y: L.door.y - 1 };
      for (var k = 0; k < 6; k++) { var w = G.pick(L.spots.wander); if (!L.blocked[w.y * L.cols + w.x]) return w; }
      return G.pick(L.spots.wander);
    },
    sellers: function () { return S.ents.filter(function (e) { return (e.role === 'sales' || e.role === 'owner') && e.state === 'idle'; }); },
    leaveOrBreak: function (e) {
      var st = S.byId(e.id);
      if (e.id !== 'owner' && st && st.status === 'ok' && G.staffroom && G.staffroom.canBreak(e.id) && G.clock.isOpen()) S.goBreak(e, G.rand(25, 50), 'shift'); else S.leave(e);
    },
    goBreak: function (e, min, reason) { var d = G.staffroom.door(); e.state = 'toRoom'; e.breakMin = min; e.reason = reason; G.path.goto(e, d.x, d.y); },
    leave: function (e) { var L = G.layout.get(); e.state = 'leaving'; G.path.goto(e, L.door.x, L.door.y); },
    update: function (gm, sec) {
      var s = G.state, open = G.clock.isOpen() && !S.closed(), L = G.layout.get();
      // đồng bộ ai đang trong ca
      var want = {};
      if (open) want.owner = true;
      s.staff.forEach(function (st) { if (open && S.shiftOn(st, s.day, s.minute)) want[st.id] = st; });
      Object.keys(want).forEach(function (id) {
        if (id !== 'owner' && G.staffroom && G.staffroom.occOf(id)) return;
        if (!S.ent(id) || S.ent(id).state === 'leaving') {
          if (S.ent(id)) return;
          if (id === 'owner') S.spawnEnt('owner', 'owner', G.state.ownerName, '#d84315');
          else { var st = want[id]; S.spawnEnt(st.id, st.role, st.name, G.roleById[st.role].color); }
        }
      });
      S.ents.forEach(function (e) {
        if (!want[e.id] && e.state !== 'meeting' && e.state !== 'leaving' && e.state !== 'serving' && e.state !== 'toCustomer' && e.state !== 'toRoom') S.leaveOrBreak(e);
      });
      S.ents = S.ents.filter(function (e) {
        if (e.state === 'leaving' && (!e.path.length)) return false;
        return true;
      });
      S.ents.slice().forEach(function (e) {
        G.path.move(e, sec);
        if (e.state === 'toRoom') { if (!e.path.length) G.staffroom.enter(e); return; }
        if (e.state === 'enter' && !e.path.length) { e.state = 'idle'; e.idleT = G.rand(2, 10); }
        else if (e.state === 'idle') {
          if (e.id !== 'owner' && G.staffroom && G.staffroom.canBreak(e.id)) {
            e.idleAcc = (e.idleAcc || 0) + gm; var stf = S.byId(e.id), thr = stf && stf.fatigue > 0.2 ? 45 : 90;
            if (e.idleAcc > thr && !G.customers.list.some(function (c) { return c.state === 'wait'; })) { e.idleAcc = 0; S.goBreak(e, G.rand(20, 35), 'idle'); return; }
          }
          e.idleT -= gm;
          if (e.idleT <= 0) {
            e.idleT = G.rand(15, 40);
            if (e.role === 'warehouse' && S.restockStep(e)) return;
            var h = S.homeFor(e); G.path.goto(e, h.x, h.y);
          }
        } else if (e.state === 'restock' && !e.path.length) {
          var slot = s.slots.filter(function (x) { return x.id === e.slotId; })[0];
          if (slot) { if (!slot.sku && slot.last) G.shelf.assignQty(slot.id, slot.last, 999); else G.shelf.fill(slot); }
          e.state = 'idle'; e.idleT = G.rand(5, 12);
        }
      });
    },
    // (Thủ kho nay tự ĐẶT HÀNG theo nhu cầu - xem autobuy.js; không còn đi bổ sung kệ)
    restockStep: function () { return false; }
  };
  G.on('init', function () { S.refreshCands(false); S.ents = []; });
  G.on('levelUp', function () { S.ents = []; S.refreshCands(true); });
  G.on('tick', function (t) { S.update(t.gm, t.sec); });
  G.on('dayEnd', function () {
    var s = G.state;
    S.ents = [];
    s.staff.forEach(function (st) {
      var sh = S.shiftFor(st, s.day);
      if (st.status === 'ok') {
        if (sh === 'full') st.consec++; else if (sh === 'off') st.consec = 0; else st.consec = Math.max(0, st.consec - 1);
        if (sh !== 'off') { st.worked++; st.xp += 1; S.addXp(st, 0); }
        var rb = G.staffroom ? G.staffroom.bonus() : { rest: 1, sat: 0, fat: 0, train: 0 };
        if ((st.rest || 0) >= 20) { st.consec = Math.max(0, st.consec - (G.staffroom.has('nap') ? 2 : 1)); }
        st.fatigue = G.clamp((st.consec - 6 - rb.fat) * 0.25, 0, 1);
        var ratio = st.salary / S.market(st.role, st.stars);
        var d = ratio < 0.8 ? -0.5 : ratio < 0.95 ? -0.2 : ratio > 1.1 ? 0.3 : 0.1;
        if (st.fatigue > 0) d -= 1 + 2 * st.fatigue;
        if (st.status === 'ok' && sh === 'off') d += 0.3;
        d += rb.sat; if ((st.rest || 0) >= 20) d += 0.3 * rb.rest;
        st.rest = 0;
        st.sat = G.clamp(st.sat + d, 0, 100);
      }
      st.ov = null;
    });
  });
  G.on('dayStart', function () {
    var s = G.state;
    // hết nghỉ
    s.staff.forEach(function (st) {
      if (st.status === 'leave' && s.day > st.until) { st.status = 'ok'; G.notify.push({ title: st.name + ' đi làm lại', type: 'info', sound: false, toast: false }); }
    });
    // nghỉ việc do bất mãn
    s.staff.slice().forEach(function (st) {
      if (st.sat < 20 && G.chance(0.08 * (G.meeting ? G.meeting.quitMult() : 1))) {
        G.notify.push({ title: st.name + ' xin nghỉ việc', text: 'Lý do: bất mãn (hài lòng ' + Math.round(st.sat) + ').', type: 'bad' });
        S.remove(st.id);
      }
    });
    if ((s.day - 1) % 7 === 0) S.refreshCands(true);
    if (s.autoSchedule && !S.hasManager()) s.autoSchedule = false;
    S.coverAbsences();
    // cảnh báo mẫu trưng bày đã hết hàng trong kho (có Thủ kho)
    if (S.count('warehouse') > 0) {
      var out = {}; s.slots.forEach(function (sl) { [sl.sku, sl.set].forEach(function (k) { if (k && G.wh.stockQty(k) === 0) out[k] = 1; }); });
      var n = Object.keys(out).length;
      if (n) G.notify.push({ title: 'Thủ kho: ' + n + ' mẫu trưng bày đã hết hàng trong kho', text: Object.keys(out).slice(0, 3).map(function (k) { return G.skus[k].label; }).join(', '), type: 'warn', sound: false });
    }
  });
  // lương ngày 1 hàng tháng
  G.on('monthStart', function () {
    var s = G.state, tot = 0;
    s.staff.forEach(function (st) { var f = Math.min(1, Math.max(0.2, (s.day - st.hiredDay) / 30)); var free = G.story ? G.story.freeDays(st) : 0, pay = Math.round(st.salary * Math.max(0, f - free / 30)); tot += pay; G.econ.expense(pay, 'wages'); });
    if (tot) G.notify.push({ title: 'Đã trả lương tháng', text: G.fmt.vnd(tot) + ' cho ' + s.staff.length + ' nhân viên.', type: 'info', sound: false });
  });
  G.on('hour', function (h) {
    var s = G.state;
    if (h.hour === 14 && s.closure.day === s.day && s.groupTraining === s.day) {
      s.buff = { until: s.day + 3, mult: 1.1 };
      s.staff.forEach(function (st) { st.sat = Math.min(100, st.sat + 5); S.addXp(st, 5); });
      G.notify.push({ title: 'Training tập thể xong', text: 'Cả cửa hàng được buff +10% hiệu suất trong 3 ngày.', type: 'good' });
      s.groupTraining = 0;
    }
  });
})();
