/* Kỹ Nghệ Nguyễn Minh — hành vi dùng chung. Vanilla JS, không thư viện. */
(function () {
  'use strict';

  /* ---------- Mobile menu ---------- */
  var burger = document.querySelector('.burger');
  var body = document.body;
  var root = document.documentElement;

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
      var fitScale = parseFloat(getComputedStyle(wrap).getPropertyValue('--fit-scale')) || 1;
      el.style.fontSize = ((100 * avail * fitScale) / natural).toFixed(2) + 'px';
    });
  }

  if (scaled.length) {
    fitScaledText();
    // re-fit once webfonts land, since metrics change
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitScaledText);
    // re-fit once i18n.js swaps in the translated text (arrives async, after
    // the first measurement above)
    document.addEventListener('i18n:applied', fitScaledText);
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(fitScaledText, 100);
    });
  }

  /* ---------- Hiệu ứng xuất hiện ----------
     Mọi khối nội dung (chữ, ảnh, accordion, dòng liên hệ, bản đồ…) mờ dần và
     trượt lên một chút khi cuộn tới. Các khối trong cùng một section lệch nhau
     một nhịp nhỏ để tạo cảm giác nối tiếp. Chỉ chạy một lần cho mỗi khối. */
  if (root.classList.contains('has-reveal')) {
    var STEP = 70;      // độ trễ giữa các khối cùng nhóm (ms)
    var MAX_STEP = 5;   // trễ tối đa, tránh khối cuối chờ quá lâu
    var pending = [];

    function mark(nodes, immediate) {
      Array.prototype.forEach.call(nodes, function (el, i) {
        el.classList.add('reveal');
        el.style.transitionDelay = Math.min(i, MAX_STEP) * STEP + 'ms';
        if (immediate) el.classList.add('is-in');
        else pending.push(el);
      });
    }

    // Header hiện ngay khi tải trang; phần còn lại hiện dần khi cuộn tới,
    // đánh nhịp lại từ đầu ở mỗi section.
    mark(document.querySelectorAll('.header__logo, .nav__item, .header__cta'), true);
    document.querySelectorAll('.sec').forEach(function (sec) {
      mark(sec.querySelectorAll('.fe'));
    });
    mark(document.querySelectorAll(
      '.site-footer .flogo, .site-footer__rule, .fcontact__row,' +
      '.site-footer__map, .site-footer__bar'));

    // Quét bằng getBoundingClientRect thay vì IntersectionObserver: không có
    // vùng chết ở đáy trang, và vẫn chạy đúng cả khi trang được mở ở tab nền
    // (nơi requestAnimationFrame bị treo).
    var last = 0;
    function sweep() {
      last = Date.now();
      for (var i = pending.length - 1; i >= 0; i--) {
        var el = pending[i];
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('is-in');
          pending.splice(i, 1);
        }
      }
      if (!pending.length) {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
      }
    }
    // Hãm bằng mốc thời gian chứ không dùng riêng setTimeout: trình duyệt bóp
    // timer ở tab nền. Kèm một lượt quét đuôi để không bỏ sót lần cuộn cuối
    // cùng — lần đó có thể rơi đúng vào khoảng đang bị hãm.
    var trail;
    function schedule() {
      if (Date.now() - last >= 50) sweep();
      clearTimeout(trail);
      trail = setTimeout(sweep, 120);
    }
    sweep();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', sweep);

    // Lưới an toàn: nếu vì lý do nào đó hiệu ứng không chạy, bỏ luôn trạng thái
    // ẩn để nội dung không bao giờ bị mất hút.
    setTimeout(function () {
      if (!document.querySelector('.reveal.is-in')) root.classList.remove('has-reveal');
    }, 4000);

    // Ảnh nền section: mờ dần khi ảnh tải xong
    document.querySelectorAll('.sec-bg img').forEach(function (im) {
      if (im.complete) im.classList.add('is-in');
      else im.addEventListener('load', function () { im.classList.add('is-in'); });
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
