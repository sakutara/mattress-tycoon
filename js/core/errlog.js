/* Chẩn đoán lỗi trên thiết bị: chỉ bật khi URL có ?debug=1. Hiện lỗi JS + thông tin màn hình/canvas ở cuối trang, chạm để chép. */
(function () {
  'use strict';
  if (!/[?&]debug=1\b/.test(location.search)) return;
  var errs = [], box;
  function ui() {
    if (box || !document.body) return box;
    box = document.createElement('pre');
    box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;margin:0;padding:6px 8px;background:rgba(20,20,30,.92);color:#9f9;font:11px/1.35 monospace;white-space:pre-wrap;z-index:99999';
    document.body.appendChild(box); return box;
  }
  function info() {
    var R = window.G && G.render, s = window.G && G.state, a = [];
    a.push('screen ' + innerWidth + 'x' + innerHeight + ' dpr ' + devicePixelRatio + ' UA ' + navigator.userAgent.slice(0, 90));
    if (R) a.push('render page=' + R.page + ' css=' + R.cssW + 'x' + R.cssH + ' cam=' + JSON.stringify(R.cam) + ' canvas=' + (R.canvas ? R.canvas.width + 'x' + R.canvas.height : '?'));
    if (s) a.push('state lvl=' + s.level + ' day=' + s.day + ' room=' + !!(s.staffroom && s.staffroom.built) + ' live=' + !!(s.live && s.live.built));
    try { var c = document.createElement('canvas'); c.width = c.height = 16; a.push('canvas ctx ' + (c.getContext('2d') ? 'ok' : 'NULL')); } catch (e) { a.push('canvas ctx error ' + e.message); }
    return a.join('\n');
  }
  function show() { var b = ui(); if (b) b.textContent = 'DEBUG (' + errs.length + ' lỗi)\n' + info() + '\n\n' + errs.slice(-6).join('\n\n'); }
  function add(m) { if (errs[errs.length - 1] !== m) errs.push(m); if (errs.length > 40) errs.shift(); show(); }
  window.addEventListener('error', function (e) { add((e.message || 'error') + '\n  ' + (e.filename || '').split('/').slice(-2).join('/') + ':' + e.lineno + ':' + e.colno + (e.error && e.error.stack ? '\n' + String(e.error.stack).split('\n').slice(0, 5).join('\n') : '')); });
  window.addEventListener('unhandledrejection', function (e) { add('promise: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); });
  window.addEventListener('load', function () { setTimeout(show, 1500); });
})();
