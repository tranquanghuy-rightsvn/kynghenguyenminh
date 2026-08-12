/* i18n thuần JS — đọc từ điển JSON theo ngôn ngữ trang (html[lang]) và điền
   vào các phần tử đánh dấu data-i18n / data-i18n-html / data-i18n-<attr>. */
(function () {
  'use strict';

  var scriptEl = document.currentScript;
  var root = (scriptEl && scriptEl.getAttribute('data-root')) || 'i18n/';
  var lang = document.documentElement.lang === 'en' ? 'en' : 'vi';

  function get(dict, path) {
    var cur = dict;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function apply(dict) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = get(dict, el.getAttribute('data-i18n'));
      if (v !== undefined) el.textContent = v;
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = get(dict, el.getAttribute('data-i18n-html'));
      if (v !== undefined) el.innerHTML = v;
    });

    document.querySelectorAll('*').forEach(function (el) {
      Array.prototype.forEach.call(el.attributes, function (attr) {
        if (attr.name === 'data-i18n' || attr.name === 'data-i18n-html') return;
        if (attr.name.indexOf('data-i18n-') !== 0) return;
        var targetAttr = attr.name.slice('data-i18n-'.length);
        var v = get(dict, attr.value);
        if (v !== undefined) el.setAttribute(targetAttr, v);
      });
    });

    document.dispatchEvent(new CustomEvent('i18n:applied', { detail: { lang: lang } }));
  }

  fetch(root + lang + '.json')
    .then(function (res) { return res.json(); })
    .then(apply)
    .catch(function (err) { console.error('i18n: không tải được ' + root + lang + '.json', err); });
})();
