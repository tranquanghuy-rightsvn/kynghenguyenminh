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
     Gửi thẳng tới Web App Google Apps Script bằng fetch(). Content-Type
     text/plain giữ request ở dạng "simple request" để trình duyệt không tự
     thêm OPTIONS preflight (GAS không xử lý được OPTIONS). */
  var CMS_SUBMIT_URL = 'https://script.google.com/macros/s/AKfycbxBN7WZXSu83KiBuUwi1n1_Q30gqOnDiN98EskcRvR8Yf2Ou25rzTe1vmEda3q2DBsd/exec';
  var MAX_FILE_BYTES = 8 * 1024 * 1024;
  var FORM_MSG = {
    vi: { ok: 'Đã gửi yêu cầu. Chúng tôi sẽ liên hệ lại sớm nhất.', fail: 'Không gửi được yêu cầu, vui lòng thử lại.', big: 'File đính kèm quá lớn (tối đa 8MB).', read: 'Không đọc được file.', type: 'Chỉ nhận file PDF hoặc hình ảnh.', chooseFile: 'Chọn tệp' },
    en: { ok: 'Your request has been sent. We will get back to you soon.', fail: 'Could not send your request, please try again.', big: 'Attached file is too large (max 8MB).', read: 'Could not read the file.', type: 'Only PDF or image files are accepted.', chooseFile: 'Choose file' }
  };

  function isAllowedFileType(file) {
    return file.type === 'application/pdf' || file.type.indexOf('image/') === 0;
  }

  var form = document.querySelector('.form');
  if (form) {
    var note = form.querySelector('.form__note');
    var submitBtn = form.querySelector('.form__submit .btn');
    var msg = FORM_MSG[document.documentElement.lang] || FORM_MSG.vi;

    function setNote(text, isError) {
      if (!note) return;
      note.textContent = text;
      note.classList.toggle('form__note--error', !!isError);
      note.hidden = false;
      note.focus && note.focus();
    }

    var fileInputEl = form.querySelector('#q-file');
    var fileNameEl = form.querySelector('.form__filename');
    if (fileInputEl && fileNameEl) {
      fileInputEl.addEventListener('change', function () {
        var file = fileInputEl.files && fileInputEl.files[0];
        if (!file) { fileNameEl.textContent = msg.chooseFile; return; }
        if (!isAllowedFileType(file)) {
          fileInputEl.value = '';
          fileNameEl.textContent = msg.chooseFile;
          setNote(msg.type, true);
          return;
        }
        if (file.size > MAX_FILE_BYTES) {
          fileInputEl.value = '';
          fileNameEl.textContent = msg.chooseFile;
          setNote(msg.big, true);
          return;
        }
        if (note) note.hidden = true;
        fileNameEl.textContent = file.name;
      });
    }

    function readFileAsDataUrl(file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { reject(new Error(msg.read)); };
        reader.readAsDataURL(file);
      });
    }

    function compressImageFile(file) {
      return readFileAsDataUrl(file).then(function (dataUrl) {
        return new Promise(function (resolve) {
          var img = new Image();
          img.onload = function () {
            var maxSide = 1600;
            var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            var canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.onerror = function () { resolve(dataUrl); };
          img.src = dataUrl;
        });
      });
    }

    function buildFilePayload() {
      var fileInput = form.querySelector('#q-file');
      var file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) return Promise.resolve(null);
      if (!isAllowedFileType(file)) {
        return Promise.reject(new Error(msg.type));
      }
      if (file.size > MAX_FILE_BYTES) {
        return Promise.reject(new Error(msg.big));
      }
      var prep = file.type.indexOf('image/') === 0 ? compressImageFile(file) : readFileAsDataUrl(file);
      return prep.then(function (dataUrl) {
        return { name: file.name, type: file.type, dataBase64: dataUrl };
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (note) note.hidden = true;
      if (form.querySelector('#q-hp').value) return; // honeypot dính bẫy — im lặng, không gửi

      if (submitBtn) { submitBtn.disabled = true; }

      buildFilePayload().then(function (filePayload) {
        var payload = {
          name: form.querySelector('#q-name').value.trim(),
          phone: form.querySelector('#q-phone').value.trim(),
          company: form.querySelector('#q-company').value.trim(),
          email: form.querySelector('#q-email').value.trim(),
          subject: form.querySelector('#q-subject').value.trim(),
          details: form.querySelector('#q-details').value.trim(),
          page: location.pathname,
          lang: document.documentElement.lang || 'vi',
          file: filePayload
        };
        return fetch(CMS_SUBMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).then(function (res) { return res.json(); });
      }).then(function (res) {
        if (res && res.ok) {
          setNote(msg.ok, false);
          form.reset();
          if (fileNameEl) fileNameEl.textContent = msg.chooseFile;
        } else {
          setNote((res && res.error) || msg.fail, true);
        }
      }).catch(function (err) {
        setNote(err.message || msg.fail, true);
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }
})();
