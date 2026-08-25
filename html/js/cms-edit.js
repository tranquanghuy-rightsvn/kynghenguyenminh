/**
 * Cầu nối soạn trực quan cho CMS nội bộ. KHÔNG làm gì cả với khách truy cập bình thường —
 * chỉ kích hoạt khi trang được nhúng trong iframe của CMS (window khác top) kèm ?cms=1.
 * Bắt sự kiện sửa chữ (contenteditable) / đổi ảnh, gửi thay đổi ra ngoài bằng postMessage
 * tới cửa sổ cha (admin CMS) — không tự lưu gì ở đây, lưu thật diễn ra ở phía GAS.
 */
(function () {
  'use strict';
  if (window.self === window.top) return;
  if (new URLSearchParams(location.search).get('cms') !== '1') return;

  function post(msg) {
    var payload = { source: 'nm-cms' };
    for (var k in msg) payload[k] = msg[k];
    window.parent.postMessage(payload, '*');
  }

  // Trong CMS, click vào link thật (menu, footer, CTA...) sẽ điều hướng iframe đi khỏi
  // trang đang sửa và làm mất thay đổi chưa lưu — chặn hẳn, chuyển trang phải qua tab CMS.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a) e.preventDefault();
  }, true);

  var style = document.createElement('style');
  style.textContent =
    '.cms-editable{outline:1px dashed transparent;cursor:text;transition:outline-color .15s}' +
    '.cms-editable:hover{outline-color:#d62828}' +
    '.cms-editing{outline:2px solid #d62828 !important}' +
    '.cms-img-overlay{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(0,0,0,0);opacity:0;transition:opacity .15s,background .15s}' +
    '.cms-img-overlay:hover{opacity:1;background:rgba(0,0,0,.35)}' +
    '.cms-img-btn{background:#d62828;color:#fff;border:none;border-radius:6px;padding:8px 14px;' +
    'font:600 13px -apple-system,Arial,sans-serif;cursor:pointer}';
  document.head.appendChild(style);

  function markEditable(el, attr, key) {
    el.classList.add('cms-editable');
    el.setAttribute('contenteditable', 'true');
    var original = attr === 'data-i18n' ? el.textContent : el.innerHTML;
    var dirty = false;
    el.addEventListener('focus', function () { el.classList.add('cms-editing'); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    el.addEventListener('blur', function () {
      el.classList.remove('cms-editing');
      var value = attr === 'data-i18n' ? el.textContent : el.innerHTML;
      // Chỉ tính là "thay đổi" khi giá trị thật sự khác bản gốc — bấm vào rồi bấm ra
      // không sửa gì không được tính, và sửa xong quay lại y bản gốc thì bỏ pending.
      if (value === original) {
        if (dirty) { dirty = false; post({ type: 'text-clear', key: key }); }
        return;
      }
      dirty = true;
      post({ type: 'text', attr: attr, key: key, value: value });
    });
  }

  ['data-i18n', 'data-i18n-html'].forEach(function (attr) {
    Array.prototype.forEach.call(document.querySelectorAll('[' + attr + ']'), function (el) {
      markEditable(el, attr, el.getAttribute(attr));
    });
  });

  function compressImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var maxSide = 1600;
        var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-cms-img]'), function (img) {
    var parent = img.parentElement;
    if (!parent) return;
    var cs = getComputedStyle(parent);
    if (cs.position === 'static') parent.style.position = 'relative';

    var overlay = document.createElement('div');
    overlay.className = 'cms-img-overlay';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cms-img-btn';
    btn.textContent = 'Đổi ảnh';
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    btn.addEventListener('click', function (e) { e.preventDefault(); input.click(); });
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      compressImage(file, function (dataUrl) {
        img.src = dataUrl;
        post({ type: 'image', path: img.getAttribute('data-cms-img'), dataUrl: dataUrl, name: file.name });
      });
    });

    overlay.appendChild(btn);
    overlay.appendChild(input);
    parent.appendChild(overlay);
  });

  document.body.classList.add('cms-edit-active');
})();
