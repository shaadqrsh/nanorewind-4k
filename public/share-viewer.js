// Before/after slider for the public share page. Drag, tap or use arrow keys.
(function () {
  var el = document.querySelector('[data-compare]');
  if (!el) return;

  var pos = 50;
  var dragging = false;

  el.setAttribute('role', 'slider');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', 'Compare the original and restored photo');
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '100');

  function set(p) {
    pos = Math.max(0, Math.min(100, p));
    el.style.setProperty('--pos', pos + '%');
    el.setAttribute('aria-valuenow', String(Math.round(pos)));
    el.setAttribute('aria-valuetext', Math.round(pos) + '% original');
  }

  function fromPointer(e) {
    var r = el.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  }

  el.addEventListener('pointerdown', function (e) {
    dragging = true;
    el.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  el.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
  el.addEventListener('pointerup', function () { dragging = false; });
  el.addEventListener('pointercancel', function () { dragging = false; });

  el.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(pos - step);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(pos + step);
    else if (e.key === 'Home') set(0);
    else if (e.key === 'End') set(100);
    else return;
    e.preventDefault();
  });

  set(50);
  el.classList.add('ready');
})();
