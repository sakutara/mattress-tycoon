/* Thư viện icon SVG inline phong cách hoạt hình vẽ tay: viền nâu đậm, màu phẳng pastel, bóng sáng/tối nhẹ. G.icon(name, size) -> chuỗi <svg>. G.icon.dom(root) thay emoji trong giao diện bằng icon. */
(function () {
  'use strict';
  var G = window.G;
  var BR = '#5a3a2e';
  // lớp màu: p hồng san hô, P hồng đậm, m xanh bạc hà, g vàng, G vàng đậm, b xanh denim, w nâu gỗ, W nâu đậm, c kem, r đỏ, k nâu viền (đặc), h sáng, s bóng, n không tô
  function gearPath() {
    var pts = [], i, n = 8, a, r;
    for (i = 0; i < n * 4; i++) { a = i / (n * 4) * Math.PI * 2; r = (Math.floor(i / 2) % 2 === 0) ? 27 : 21; pts.push((32 + Math.cos(a) * r).toFixed(1) + ',' + (32 + Math.sin(a) * r).toFixed(1)); }
    return 'M' + pts.join('L') + 'Z';
  }
  var I = {
    coin: '<circle class="g" cx="32" cy="34" r="23"/><circle class="G n" cx="32" cy="34" r="16" stroke-opacity=".55"/><path class="h" d="M16 26a18 18 0 0 1 14-11 16 16 0 0 0-14 11z"/><circle class="k" cx="26" cy="31" r="2" stroke="none"/><circle class="k" cx="38" cy="31" r="2" stroke="none"/><path class="n" d="M25 39q7 7 14 0"/>',
    star: '<path class="g" d="M32 6l8.5 18 19.5 2.3-14.4 13.5 3.8 19.4L32 49.5 14.6 59.2l3.8-19.4L4 26.3 23.5 24z"/><path class="h" d="M24 22l8-12 3 8z"/>',
    crown: '<path class="g" d="M8 50V22l14 12 10-20 10 20 14-12v28z"/><path class="G" d="M8 50h48v7H8z"/><circle class="p" cx="32" cy="38" r="4"/><path class="h" d="M12 28l6 6-6 8z"/>',
    trophy: '<path class="n" d="M18 16H8q0 14 12 16M46 16h10q0 14-12 16"/><path class="g" d="M16 8h32v18q0 14-16 16-16-2-16-16z"/><path class="g" d="M28 42h8v8h-8z"/><path class="W" d="M18 52h28v7H18z"/><path class="h" d="M21 12h5v14q0 4 2 6-7-3-7-10z"/>',
    bed: '<path class="w" d="M6 28v28M58 36v20"/><path class="W" d="M6 42h52v10H6z"/><rect class="c" x="9" y="30" width="16" height="12" rx="5"/><path class="p" d="M25 32h29a4 4 0 0 1 4 4v6H25z"/><path class="h" d="M12 33h8" /><path class="s" d="M25 38h33v4H25z"/>',
    bell: '<path class="g" d="M32 7c-12 0-16 11-16 21 0 11-7 12-7 17h46c0-5-7-6-7-17 0-10-4-21-16-21z"/><circle class="G" cx="32" cy="52" r="6"/><path class="h" d="M22 18q4-6 9-7-8 6-8 20-3-4-1-13z"/>',
    menu: '<rect class="p" x="9" y="10" width="46" height="12" rx="6"/><rect class="p" x="9" y="26" width="46" height="12" rx="6"/><rect class="p" x="9" y="42" width="46" height="12" rx="6"/><path class="h" d="M15 14h26M15 30h26M15 46h26" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>',
    user: '<circle class="c" cx="32" cy="22" r="13"/><path class="b" d="M8 58c0-17 12-22 24-22s24 5 24 22z"/><path class="k" d="M20 18q12-12 24 0q-6-3-12-3t-12 3z"/>',
    people: '<circle class="c" cx="22" cy="22" r="10"/><path class="b" d="M3 54c0-13 8-18 19-18s19 5 19 18z"/><circle class="c" cx="44" cy="25" r="9"/><path class="p" d="M32 56c1-11 6-17 14-17s16 5 16 17z"/>',
    book: '<path class="m" d="M8 16l38-8 10 4v36l-10 6L8 54z"/><path class="c" d="M46 14v42l10-8V12z"/><path class="s" d="M8 48l38 8v-5L8 44z"/><circle class="c" cx="27" cy="28" r="7"/><circle class="g" cx="27" cy="28" r="2.5" stroke="none"/><path class="h" d="M12 20l14-3"/>',
    save: '<path class="b" d="M8 8h40l8 8v40H8z"/><rect class="c" x="16" y="8" width="24" height="16"/><rect class="W" x="32" y="11" width="5" height="10" rx="1"/><rect class="c" x="14" y="34" width="36" height="22" rx="3"/><path class="n" d="M20 41h24M20 48h18"/>',
    note: '<path class="p" d="M26 46V12q4 8 14 10t10 12q0-8-8-10-3-1-6-2v26"/><ellipse class="p" cx="19" cy="48" rx="10" ry="8"/><path class="h" d="M14 45q3-3 7-2"/>',
    speaker: '<path class="p" d="M6 24h12l16-14v44L18 40H6z"/><path class="n" d="M42 22q6 10 0 20M49 15q12 17 0 34"/><path class="h" d="M10 27h6"/>',
    sun: '<g class="n"><path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M12 52l6-6M46 18l6-6"/></g><circle class="g" cx="32" cy="32" r="14"/><path class="h" d="M24 26a10 10 0 0 1 8-6 8 8 0 0 0-8 6z"/>',
    lock: '<path class="n" d="M20 28V20q0-12 12-12t12 12v8"/><rect class="g" x="12" y="28" width="40" height="28" rx="7"/><circle class="k" cx="32" cy="40" r="4"/><path class="k" d="M30 42h4l1 8h-6z"/><path class="h" d="M16 33h10"/>',
    unlock: '<path class="n" d="M20 28V20q0-12 12-12t12 8"/><rect class="m" x="12" y="28" width="40" height="28" rx="7"/><circle class="k" cx="32" cy="40" r="4"/><path class="k" d="M30 42h4l1 8h-6z"/>',
    door: '<path class="p" d="M14 6h30v52H14z"/><path class="W" d="M44 6l8 4v48l-8 0z"/><path class="c" d="M14 50h30v8H14z"/><circle class="g" cx="38" cy="34" r="3"/><path class="h" d="M18 10h8v34h-8z"/>',
    gear: '<path class="p" d="' + gearPath() + '"/><circle class="c" cx="32" cy="32" r="9"/><path class="h" d="M18 20q5-8 14-8-8 2-10 12z"/>',
    chest: '<path class="W" d="M8 24L14 8h36l6 16z"/><path class="g" d="M14 26q6-7 12-5t12 0 12 5z" /><rect class="w" x="8" y="26" width="48" height="28" rx="4"/><path class="W" d="M8 36h48"/><rect class="g" x="27" y="32" width="10" height="12" rx="3"/><path class="k" d="M32 36v4" />',
    box: '<path class="w" d="M6 20L32 8l26 12v28L32 58 6 48z"/><path class="c" d="M6 20l26 12 26-12"/><path class="W" d="M32 32v26"/><path class="h" d="M12 24l14 7"/><path class="g" d="M24 14l26 12v8l-6-3V24z"/>',
    truck: '<path class="c" d="M4 18h34v28H4z"/><path class="b" d="M38 26h12l10 12v8H38z"/><path class="h" d="M44 30h5l5 7h-10z"/><circle class="W" cx="16" cy="48" r="7"/><circle class="W" cx="48" cy="48" r="7"/><circle class="c" cx="16" cy="48" r="2.5" stroke="none"/><circle class="c" cx="48" cy="48" r="2.5" stroke="none"/><path class="p" d="M8 24h14"/>',
    cart: '<path class="n" d="M4 8h9l6 30h30l7-22H16"/><path class="p" d="M16 16h38l-6 22H21z"/><circle class="W" cx="24" cy="50" r="5"/><circle class="W" cx="46" cy="50" r="5"/><path class="h" d="M22 20h14"/>',
    shop: '<path class="w" d="M10 26h44v30H10z"/><path class="W" d="M10 26h44v6H10z"/><path class="p" d="M4 24L10 8h44l6 16z"/><path class="c" d="M16 8l-3 16M29 8l-1 16M42 8l1 16M54 8l3 16" stroke-width="0"/><path class="c" d="M16 8h8l-2 16h-9zM34 8h8l3 16h-9z"/><rect class="c" x="18" y="34" width="28" height="12" rx="2"/><circle class="p" cx="32" cy="38" r="3"/><path class="W" d="M10 50h44"/>',
    bolt: '<path class="g" d="M38 4L12 36h16l-4 24 28-34H36z"/><path class="h" d="M34 10l-14 20h6z"/>',
    gift: '<rect class="p" x="8" y="26" width="48" height="30" rx="4"/><rect class="P" x="5" y="18" width="54" height="12" rx="4"/><path class="g" d="M28 18h8v38h-8z"/><path class="n" d="M32 18q-12-14-18-6t18 6q12-14 18-6t-18 6"/>',
    plant: '<path class="m" d="M32 38C14 38 10 20 14 8c14 2 22 12 18 30zM32 40c4-14 12-20 22-20 2 14-6 24-22 20z"/><path class="w" d="M16 42h32l-4 16H20z"/><path class="W" d="M16 42h32v5H16z"/>',
    warn: '<path class="g" d="M32 6L60 56H4z"/><path class="k" d="M30 22h4v18h-4z"/><circle class="k" cx="32" cy="47" r="2.6"/>',
    check: '<circle class="m" cx="32" cy="32" r="24"/><path class="n" d="M20 33l9 9 16-18" stroke-width="5"/><path class="h" d="M16 24a18 18 0 0 1 14-10 14 14 0 0 0-14 10z"/>',
    cross: '<circle class="r" cx="32" cy="32" r="24"/><path class="n" d="M22 22l20 20M42 22L22 42" stroke="#fff"/>',
    close: '<path class="p" d="M12 20l8-8 12 12 12-12 8 8-12 12 12 12-8 8-12-12-12 12-8-8 12-12z"/>',
    play: '<path class="m" d="M14 8l42 24-42 24z"/><path class="h" d="M20 16l16 9-16 8z"/>',
    pause: '<rect class="p" x="12" y="8" width="14" height="48" rx="4"/><rect class="p" x="38" y="8" width="14" height="48" rx="4"/>',
    live: '<circle class="r" cx="32" cy="32" r="22"/><circle class="n" cx="32" cy="32" r="12" stroke="#fff"/><circle class="c" cx="32" cy="32" r="5"/><path class="h" d="M18 22a16 16 0 0 1 12-9 12 12 0 0 0-12 9z"/>',
    cup: '<path class="n" d="M24 4q-4 6 0 10M34 2q-4 8 0 12" /><path class="c" d="M10 20h38v20q0 14-19 14T10 40z"/><path class="W" d="M10 20h38v6H10z"/><path class="n" d="M48 26h6q6 0 6 8t-12 10"/><path class="h" d="M16 32v8"/>',
    camera: '<rect class="b" x="6" y="16" width="52" height="38" rx="8"/><path class="b" d="M20 16l4-8h16l4 8z"/><circle class="c" cx="32" cy="35" r="13"/><circle class="W" cx="32" cy="35" r="7"/><circle class="h" cx="29" cy="32" r="2.5" stroke="none"/><circle class="g" cx="50" cy="24" r="2.5"/>',
    pillow: '<path class="c" d="M8 20q24-8 48 0 4 12 0 24-24 8-48 0-4-12 0-24z"/><path class="n" d="M24 28h10l-10 8h10" stroke-width="3"/>',
    chat: '<path class="c" d="M8 10h48a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H30l-12 12v-12H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z"/><path class="n" d="M16 22h32M16 32h20"/>',
    eye: '<path class="c" d="M4 32q28-30 56 0-28 30-56 0z"/><circle class="b" cx="32" cy="32" r="11"/><circle class="k" cx="32" cy="32" r="5"/><circle class="c" cx="28" cy="28" r="2.5" stroke="none"/>',
    user2: '<circle class="c" cx="32" cy="22" r="13"/><path class="m" d="M8 58c0-17 12-22 24-22s24 5 24 22z"/>',
    bulb: '<path class="g" d="M32 4C18 4 12 14 12 24c0 8 6 12 8 18h24c2-6 8-10 8-18C52 14 46 4 32 4z"/><rect class="c" x="22" y="44" width="20" height="12" rx="4"/><path class="h" d="M20 14q4-6 10-7-9 5-9 16-4-3-1-9z"/>',
    tool: '<path class="b" d="M42 6a14 14 0 0 0-12 20L6 50l8 8 24-24A14 14 0 0 0 58 22l-9 9-8-3-3-8z"/><path class="h" d="M12 52l22-22"/>',
    chart: '<rect class="c" x="6" y="8" width="52" height="48" rx="6"/><rect class="m" x="14" y="34" width="9" height="16"/><rect class="g" x="28" y="22" width="9" height="28"/><rect class="p" x="42" y="14" width="9" height="36"/>',
    megaphone: '<path class="p" d="M8 24h12l26-14v44L20 40H8z"/><path class="c" d="M12 40l4 16h8l-4-16z"/><path class="n" d="M52 24q6 8 0 16"/>',
    briefcase: '<path class="n" d="M22 18v-6q0-4 4-4h12q4 0 4 4v6"/><rect class="w" x="6" y="18" width="52" height="36" rx="6"/><path class="W" d="M6 32h52"/><rect class="g" x="27" y="29" width="10" height="8" rx="2"/>',
    tag: '<path class="g" d="M6 6h24l28 28-24 24L6 30z"/><circle class="c" cx="19" cy="19" r="5"/><path class="h" d="M30 14l20 20"/>',
    pin: '<path class="r" d="M32 60C20 44 12 36 12 24a20 20 0 0 1 40 0c0 12-8 20-20 36z"/><circle class="c" cx="32" cy="24" r="8"/>',
    dice: '<rect class="c" x="8" y="8" width="48" height="48" rx="10"/><circle class="k" cx="22" cy="22" r="4"/><circle class="k" cx="42" cy="22" r="4"/><circle class="k" cx="32" cy="32" r="4"/><circle class="k" cx="22" cy="42" r="4"/><circle class="k" cx="42" cy="42" r="4"/>',
    clock: '<circle class="c" cx="32" cy="32" r="25"/><circle class="n" cx="32" cy="32" r="19" stroke-opacity=".25"/><path class="n" d="M32 16v16l11 7" stroke-width="5"/><path class="h" d="M14 24a20 20 0 0 1 14-12 16 16 0 0 0-14 12z"/>',
    trash: '<path class="n" d="M24 12l2-6h12l2 6"/><path class="b" d="M12 14h40l-4 44H16z"/><path class="n" d="M24 24v26M32 24v26M40 24v26"/><path class="b" d="M8 14h48v6H8z"/>',
    emptybox: '<path class="w" d="M6 28L32 16l26 12v22L32 60 6 50z"/><path class="c" d="M6 28l26 12 26-12-26-12z"/><path class="W" d="M32 40v20"/>',
    shield: '<path class="b" d="M32 4l22 8v18c0 16-10 26-22 30C20 56 10 46 10 30V12z"/><path class="n" d="M21 31l8 8 14-16" stroke="#fff" stroke-width="5"/><path class="h" d="M16 14l12-5v8z"/>',
    badge: '<path class="g" d="M32 4l7 6 9-1 3 9 8 5-3 9 3 9-8 4-3 9-9-1-7 6-7-6-9 1-3-9-8-4 3-9-3-9 8-5 3-9 9 1z"/><circle class="c" cx="32" cy="32" r="12"/><path class="n" d="M26 32l5 5 8-9" stroke-width="4"/>',
    hotel: '<path class="w" d="M10 8h44v50H10z"/><rect class="c" x="16" y="14" width="10" height="9"/><rect class="c" x="38" y="14" width="10" height="9"/><rect class="c" x="16" y="30" width="10" height="9"/><rect class="c" x="38" y="30" width="10" height="9"/><path class="p" d="M26 58V46h12v12z"/>',
    receipt: '<path class="c" d="M12 4h40v56l-7-5-6 5-7-5-7 5-6-5-7 5z"/><path class="n" d="M20 16h24M20 26h24M20 36h14"/>',
    basket: '<path class="n" d="M18 26l8-16M46 26L38 10"/><path class="g" d="M4 26h56l-6 30H10z"/><path class="n" d="M20 32v18M32 32v18M44 32v18"/>',
    ruler: '<path class="g" d="M6 44L44 6l14 14L20 58z"/><path class="n" d="M18 40l6 6M26 32l6 6M34 24l6 6"/>',
    fish: '<path class="p" d="M6 32q16-20 36-6l16-10v32L42 38Q22 52 6 32z"/><circle class="k" cx="18" cy="30" r="2.4"/>',
    frame: '<rect class="w" x="6" y="8" width="52" height="46" rx="4"/><rect class="c" x="14" y="16" width="36" height="30"/><path class="m" d="M14 46l12-14 8 8 6-6 10 12z"/>',
    heart: '<path class="p" d="M32 56C10 40 6 28 10 18c5-9 18-8 22 2 4-10 17-11 22-2 4 10 0 22-22 38z"/><path class="h" d="M16 20q4-6 10-4"/>',
    chair: '<path class="b" d="M14 6h28v30H14z"/><path class="W" d="M10 36h36v8H10zM14 44v14M42 44v14"/>',
    snow: '<path class="n" d="M32 6v52M8 19l48 26M8 45l48-26" stroke="#6f8fd1"/>',
    cabinet: '<rect class="w" x="8" y="6" width="48" height="52" rx="4"/><path class="W" d="M32 6v52"/><circle class="g" cx="27" cy="32" r="2.5"/><circle class="g" cx="37" cy="32" r="2.5"/>',
    sofa: '<path class="p" d="M6 28q0-8 8-8h36q8 0 8 8v14H6z"/><rect class="P" x="2" y="30" width="12" height="20" rx="5"/><rect class="P" x="50" y="30" width="12" height="20" rx="5"/>',
    phone: '<path class="p" d="M12 8q6-4 10 0l4 10q1 3-3 6l-3 3q4 10 12 14l3-3q4-3 6-2l10 4q4 4 0 10c-6 8-22 4-34-8S4 16 12 8z"/>',
    dot: '<circle class="r" cx="32" cy="32" r="16"/>',
    arrowl: '<path class="p" d="M4 32l24-22v13h30v18H28v13z"/>',
    arrowr: '<path class="p" d="M60 32L36 10v13H6v18h30v13z"/>',
    fit: '<path class="n" d="M8 22V8h14M42 8h14v14M56 42v14H42M22 56H8V42" stroke-width="5"/><rect class="g" x="22" y="22" width="20" height="20" rx="4"/>',
    gem: '<path class="m" d="M10 24l12-14h20l12 14-22 32z"/><path class="n" d="M10 24h44M22 10l10 14 10-14M32 24v32"/><path class="h" d="M16 24l8-10h6z"/>',
    cloud: '<path class="c" d="M16 46a12 12 0 0 1 2-23 16 16 0 0 1 30 4 10 10 0 0 1-2 19z"/><path class="h" d="M22 30a10 10 0 0 1 10-8 8 8 0 0 0-10 8z"/>',
    rain: '<path class="c" d="M16 36a11 11 0 0 1 2-21 15 15 0 0 1 28 4 9 9 0 0 1-2 17z"/><path class="n" d="M20 44l-3 8M32 44l-3 8M44 44l-3 8" stroke="#6f8fd1" stroke-width="3"/>',
    storm: '<path class="c" d="M16 34a11 11 0 0 1 2-21 15 15 0 0 1 28 4 9 9 0 0 1-2 17z"/><path class="g" d="M34 36l-10 14h8l-4 12 14-16h-8z"/>',
    cold: '<path class="b" d="M28 6h8v32a12 12 0 1 1-8 0z"/><circle class="c" cx="32" cy="46" r="7"/><path class="n" d="M32 14v28" stroke="#fff" stroke-width="3"/>',
    hot: '<path class="r" d="M28 6h8v32a12 12 0 1 1-8 0z"/><circle class="g" cx="32" cy="46" r="7"/><path class="n" d="M32 16v28" stroke="#fff" stroke-width="3"/>',
    humid: '<path class="b" d="M32 6C22 22 14 30 14 40a18 18 0 0 0 36 0C50 30 42 22 32 6z"/><path class="h" d="M24 34q2-6 6-10-2 8-6 10z"/>',
    sparkle: '<path class="g" d="M32 4q4 24 28 28-24 4-28 28-4-24-28-28 24-4 28-28z"/>'
  };
  // emoji -> tên icon
  var MAP = {
    '💰': 'coin', '🪙': 'coin', '💸': 'coin', '⭐': 'star', '👑': 'crown', '🏆': 'trophy', '🛏': 'bed', '🛌': 'bed', '🔔': 'bell', '☰': 'menu', '👤': 'user', '🧑': 'user2',
    '❓': 'book', '📖': 'book', '💾': 'save', '🎵': 'note', '🔊': 'speaker', '☀': 'sun', '🌅': 'sun', '🔆': 'sun', '🌤': 'sun', '🔒': 'lock', '🔓': 'unlock', '🚪': 'door', '⚙': 'gear',
    '🏪': 'shop', '📦': 'box', '🗄': 'cabinet', '🚚': 'truck', '🛒': 'cart', '👥': 'people', '⚡': 'bolt', '🎁': 'gift', '🪴': 'plant', '⚠': 'warn', '✓': 'check', '✅': 'check', '❌': 'cross',
    '✕': 'close', '✖': 'close', '▶': 'play', '⏸': 'pause', '🔴': 'live', '☕': 'cup', '🍵': 'cup', '🎥': 'camera', '📷': 'camera', '📽': 'camera', '💤': 'pillow', '💬': 'chat', '👁': 'eye',
    '💡': 'bulb', '🛠': 'tool', '📊': 'chart', '📣': 'megaphone', '💼': 'briefcase', '🏷': 'shop', '✨': 'sparkle', '📌': 'pin', '🎲': 'dice', '⏱': 'clock', '🗑': 'trash', '📭': 'emptybox', '🧾': 'receipt',
    '🧺': 'basket', '📏': 'ruler', '🧷': 'pin', '🐠': 'fish', '🖼': 'frame', '❤': 'heart', '💺': 'chair', '❄': 'snow', '🍊': 'sparkle', '📥': 'box', '📤': 'box', '⤢': 'fit', '🟡': 'dot'
  };
  var SW = function (px) { return px <= 20 ? 1.5 : px <= 28 ? 1.8 : px <= 40 ? 2.2 : 2.8; };
  var ic = G.icon = function (name, size, cls) {
    var body = I[name] || I.sparkle, em = size == null || typeof size === 'string', px = em ? 18 : size;
    var sz = em ? (size || '1.2em') : size + 'px';
    return '<svg class="ico ico-' + name + (cls ? ' ' + cls : '') + '" width="' + sz + '" height="' + sz + '" viewBox="0 0 64 64" style="--sw:' + SW(px) + 'px" aria-hidden="true" focusable="false">' + body + '</svg>';
  };
  ic.names = Object.keys(I); ic.map = MAP;
  var keys = Object.keys(MAP).map(function (k) { return k.replace(/[\u{FE0F}]/gu, ''); });
  var RE = new RegExp('(' + keys.join('|') + ')\\uFE0F?', 'g');
  var SKIP = { SCRIPT: 1, STYLE: 1, OPTION: 1, SELECT: 1, TEXTAREA: 1, INPUT: 1, TITLE: 1, SVG: 1, CANVAS: 1 };
  function conv(node) {
    if (node.nodeType === 3) {
      var t = node.nodeValue; if (!t || !RE.test(t)) { RE.lastIndex = 0; return; } RE.lastIndex = 0;
      var par = node.parentNode; if (!par || SKIP[par.nodeName.toUpperCase()] || (par.closest && par.closest('[data-noicon],.rvtext'))) return;
      var frag = document.createDocumentFragment(), last = 0, m; RE.lastIndex = 0;
      while ((m = RE.exec(t))) {
        if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
        var sp = document.createElement('span'); sp.className = 'ico-w'; sp.innerHTML = ic(MAP[m[1]] || MAP[m[1] + '️']);
        frag.appendChild(sp); last = m.index + m[0].length;
      }
      if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
      par.replaceChild(frag, node); return;
    }
    if (node.nodeType !== 1 || SKIP[node.nodeName.toUpperCase()] || node.hasAttribute('data-noicon')) return;
    var kids = [].slice.call(node.childNodes); for (var i = 0; i < kids.length; i++) conv(kids[i]);
  }
  ic.dom = function (root) { try { conv(root || document.body); } catch (e) { console.warn('icon dom', e); } };
  // chuỗi HTML -> thay emoji bằng icon (dùng cho chuỗi sinh bằng code)
  ic.html = function (s) { return String(s).replace(RE, function (m, k) { return '<span class="ico-w">' + ic(MAP[k] || MAP[k + '️']) + '</span>'; }); };
  // gallery xem trước
  ic.gallery = function () {
    return '<div class="igal">' + ic.names.map(function (n) { return '<div class="igi"><div>' + ic(n, 40) + '</div><div>' + ic(n, 24) + ' ' + ic(n, 18) + '</div><small>' + n + '</small></div>'; }).join('') + '</div>';
  };
  function start() {
    ic.dom(document.body);
    var busy = false, q = [];
    var mo = new MutationObserver(function (ms) {
      if (busy) return; busy = true;
      try { ms.forEach(function (m) { if (m.type === 'characterData') conv(m.target); else m.addedNodes.forEach(function (n) { if (n.nodeType === 1 || n.nodeType === 3) conv(n); }); }); } finally { busy = false; }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  G.on && G.on('init', start);
  window.addEventListener('DOMContentLoaded', function () { if (!ic.started) { ic.started = true; setTimeout(start, 0); } });
  ic.show = function () { var old = document.querySelector('[data-icons]'); if (old) old.remove(); var d = document.createElement('div'); d.className = 'igal-wrap'; d.setAttribute('data-icons', ''); d.setAttribute('data-noicon', ''); d.innerHTML = '<button class="btn primary" data-icons-close>Đóng thư viện icon (' + ic.names.length + ')</button>' + ic.gallery(); d.addEventListener('click', function (e) { if (e.target.closest('[data-icons-close]')) d.remove(); }); document.body.appendChild(d); return ic.names.length; };
})();
