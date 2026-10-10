/* Cài đặt (localStorage) + âm thanh WebAudio: SFX dùng chung AudioContext, nhạc nền sinh bằng code (pad + bass + arpeggio + giai điệu) */
(function () {
  'use strict';
  var G = window.G;
  var KEY = 'vcg_settings_v1';
  G.settings = { music: true, musicVol: 0.5, sfx: true, autoOpen: false, showLocked: false, autoLive: false };
  try { var raw = localStorage.getItem(KEY); if (raw) Object.assign(G.settings, JSON.parse(raw)); } catch (e) {}
  G.saveSettings = function () { try { localStorage.setItem(KEY, JSON.stringify(G.settings)); } catch (e) {} };

  var A = G.audio = {
    ctx: null,
    get: function () {
      if (!A.ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { A.ctx = new AC(); } catch (e) { return null; } }
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return A.ctx;
    }
  };

  // ---------------- Nhạc nền procedural ----------------
  var BPM = 84, EIGHTH = 60 / BPM / 2;
  var DEG = { I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16] };
  var PROGS = [['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V'], ['I', 'vi', 'IV', 'V'], ['ii', 'V', 'I', 'vi'], ['IV', 'I', 'V', 'vi'], ['I', 'iii', 'IV', 'V']];
  var KEYS = [0, 5, 7, 2];                     // C, F, G, D
  var ARPS = [[0, 1, 2, 1, 0, 1, 2, 1], [0, 2, 1, 2, 0, 2, 1, 2], [0, -1, 1, -1, 2, -1, 1, -1], [2, 1, 0, 1, 2, 1, 0, 1]];
  var PENT = [0, 2, 4, 7, 9, 12, 14, 16];
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var M = G.music = {
    on: false, master: null, delay: null, timer: null, nextT: 0, step: 0, bar: 0, prog: 0, keyIdx: 0, phrase: 0, arp: 0, motif: [], root: 60, chordNotes: [60, 64, 67],
    ensure: function () {
      var ctx = A.get(); if (!ctx) return false;
      if (M.master) return true;
      M.out = ctx.createGain(); M.out.gain.value = 0;
      var comp = ctx.createDynamicsCompressor(); M.out.connect(comp); comp.connect(ctx.destination);
      M.bus = ctx.createGain(); M.bus.connect(M.out);
      M.delay = ctx.createDelay(2); M.delay.delayTime.value = EIGHTH * 3;
      var fb = ctx.createGain(), wet = ctx.createGain(); fb.gain.value = 0.32; wet.gain.value = 0.28;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      M.bus.connect(M.delay); M.delay.connect(lp); lp.connect(fb); fb.connect(M.delay); lp.connect(wet); wet.connect(M.out);
      M.master = true; return true;
    },
    setGain: function (duck) {
      if (!M.out) return; var ctx = A.ctx;
      var v = G.settings.music ? G.settings.musicVol * 0.55 * (duck ? 0.45 : 1) : 0;
      M.out.gain.setTargetAtTime(v, ctx.currentTime, 0.25);
    },
    note: function (type, freq, t, dur, vol, attack, dest) {
      var ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || M.bus); o.start(t); o.stop(t + dur + 0.05);
    },
    pad: function (t) {
      var ctx = A.ctx, dur = EIGHTH * 8 + 0.9;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.connect(M.bus);
      M.chordNotes.forEach(function (m) {
        [-12, 0].forEach(function (oct, k) {
          var o = ctx.createOscillator(), g = ctx.createGain(); o.type = k ? 'triangle' : 'sine'; o.frequency.value = hz(m + oct); o.detune.value = (k ? 6 : -5);
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.9); g.gain.linearRampToValueAtTime(0.04, t + EIGHTH * 8 - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur + 0.05);
        });
      });
    },
    nextChord: function () {
      var P = PROGS[M.prog], d = DEG[P[M.bar % 4]], base = 60 + KEYS[M.keyIdx];
      M.root = base; M.chordNotes = d.map(function (x) { return base + x; });
      if (M.bar % 4 === 0) { // đầu cụm 4 ô nhịp: đổi motif / arp
        M.arp = Math.floor(Math.random() * ARPS.length);
        M.motif = []; for (var i = 0; i < 8; i++) M.motif.push(Math.random() < 0.42 ? PENT[Math.floor(Math.random() * PENT.length)] : -1);
        M.melody = M.phrase % 2 === 1;
      }
    },
    playStep: function (s, t) {
      var ctx = A.ctx;
      if (s === 0) { M.nextChord(); M.pad(t); }
      // bass
      if (s === 0 || s === 4 || (s === 6 && M.phrase % 3 === 2)) M.note('triangle', hz(M.root - 24 + (s === 6 ? 7 : 0)), t, EIGHTH * 3.2, 0.13, 0.02);
      // arpeggio
      var ai = ARPS[M.arp][s];
      if (ai >= 0) { var m = M.chordNotes[ai % 3] + (ai >= 3 ? 12 : 0) + 12; M.note('triangle', hz(m), t, 0.55, 0.06, 0.01); }
      // melody (cụm lẻ)
      if (M.melody && M.motif[s] >= 0) { var mm = M.root + 12 + M.motif[s]; M.note('sine', hz(mm), t, 0.9, 0.07, 0.02); M.note('sine', hz(mm + 12), t, 0.5, 0.02, 0.02); }
    },
    advance: function () {
      M.step++;
      if (M.step >= 8) {
        M.step = 0; M.bar++;
        if (M.bar % 4 === 0) { // hết một cụm
          M.phrase++;
          var np = M.prog; while (np === M.prog) np = Math.floor(Math.random() * PROGS.length); M.prog = np;
          if (M.phrase % 2 === 0 && Math.random() < 0.7) { var nk = M.keyIdx; while (nk === M.keyIdx) nk = Math.floor(Math.random() * KEYS.length); M.keyIdx = nk; }
        }
      }
    },
    tick: function () {
      var ctx = A.ctx; if (!ctx || !M.on) return;
      if (M.nextT < ctx.currentTime) M.nextT = ctx.currentTime + 0.05;
      while (M.nextT < ctx.currentTime + 0.6) { M.playStep(M.step, M.nextT); M.nextT += EIGHTH; M.advance(); }
    },
    start: function () {
      if (M.on || !G.settings.music) return;
      if (!M.ensure()) return;
      M.on = true; M.nextT = A.ctx.currentTime + 0.1; M.step = 0; M.bar = 0; M.phrase = 0; M.prog = Math.floor(Math.random() * PROGS.length); M.keyIdx = 0;
      M.timer = setInterval(M.tick, 120); M.tick(); M.setGain(false);
    },
    stop: function () { if (!M.on) return; M.on = false; clearInterval(M.timer); if (M.out) M.out.gain.setTargetAtTime(0, A.ctx.currentTime, 0.2); },
    apply: function () { // gọi khi đổi cài đặt
      if (G.settings.music) { if (!M.on && M.armed) M.start(); M.setGain(false); } else M.stop();
    },
    arm: function () { // bắt đầu sau tương tác đầu tiên (chính sách autoplay)
      var go = function () { M.armed = true; if (G.settings.music) M.start(); document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); };
      document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true);
    }
  };
  G.on('uiRefresh', function () { if (M.on && G.clock) M.setGain(G.clock.isPaused() && G.state.speed === 0 ? true : G.clock.modalCount > 0); });
})();
