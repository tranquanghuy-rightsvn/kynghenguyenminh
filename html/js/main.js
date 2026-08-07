/* Kỹ Nghệ Nguyễn Minh — hành vi dùng chung. Vanilla JS, không thư viện. */
(function () {
  'use strict';

  /* ---------- Mobile menu ---------- */
  var burger = document.querySelector('.burger');
  var body = document.body;

  if (burger) {
    burger.addEventListener('click', function () {
      var open = body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', String(open));
    });
  }

  // Collapsible folders inside the mobile drawer
  document.querySelectorAll('.m-folder__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var folder = btn.closest('.m-folder');
      var open = folder.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // Close the drawer on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && body.classList.contains('menu-open')) {
      body.classList.remove('menu-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- Header shrinks once the page is scrolled (mobile only) ---------- */
  var shrunk = null;
  function syncHeader() {
    var next = window.scrollY > 20;
    if (next === shrunk) return;
    shrunk = next;
    body.classList.toggle('hdr-shrink', next);
  }
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  /* ---------- Accordions ---------- */
  document.querySelectorAll('.acc').forEach(function (acc) {
    var multi = acc.dataset.multi === 'true';
    acc.querySelectorAll('.acc__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.acc__item');
        var open = item.classList.contains('is-open');
        if (!multi) {
          acc.querySelectorAll('.acc__item.is-open').forEach(function (other) {
            if (other !== item) {
              other.classList.remove('is-open');
              other.querySelector('.acc__btn').setAttribute('aria-expanded', 'false');
            }
          });
        }
        item.classList.toggle('is-open', !open);
        btn.setAttribute('aria-expanded', String(!open));
      });
    });
  });

  /* ---------- Scaled headlines ----------
     Each .scaled line is sized so its text spans the full column width,
     mirroring the source site's auto-fitting display type. */
  var scaled = Array.prototype.slice.call(document.querySelectorAll('.scaled'));

  var range = document.createRange();

  function fitScaledText() {
    scaled.forEach(function (wrap) {
      var el = wrap.firstElementChild;
      if (!el) return;
      var avail = wrap.clientWidth;
      if (!avail) return;
      // Measure the *text* at a known size — el.scrollWidth would report the
      // block's own width, not the glyph run — then scale linearly.
      el.style.fontSize = '100px';
      range.selectNodeContents(el);
      var natural = range.getBoundingClientRect().width;
      if (!natural) return;
      el.style.fontSize = ((100 * avail) / natural).toFixed(2) + 'px';
    });
  }

  if (scaled.length) {
    fitScaledText();
    // re-fit once webfonts land, since metrics change
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitScaledText);
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(fitScaledText, 100);
    });
  }

  /* ---------- Biểu mẫu báo giá ----------
     Site tĩnh, không có back end: khi bấm gửi chỉ hiện thông báo kèm địa chỉ
     email để khách liên hệ trực tiếp. */
  var form = document.querySelector('.form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.form__note');
      if (note) {
        note.hidden = false;
        note.focus && note.focus();
      }
    });
  }
})();
