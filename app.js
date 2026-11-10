// PixelPress UI: mounts the whole tool into a root element.
// Used by the standalone site (index.html) and by embeddable previews.
import { fmtBytes, loadImageFromFile, compressImage, outName } from './compress.js';

export function mountPixelPress(root, opts) {
  var chrome = !opts || opts.chrome !== false;
  var items = [];
  var processTimer = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  if (chrome) {
    var h1 = el('h1', 'ppx-title', 'PixelPress');
    var sub = el('p', 'ppx-sub', 'Compress and convert images right in your browser.');
    var badge = el('div', 'ppx-privacy', '100% private - images never leave your device');
    root.appendChild(h1); root.appendChild(sub); root.appendChild(badge);
  }

  var drop = el('div', 'ppx-drop');
  drop.setAttribute('role', 'button');
  drop.setAttribute('tabindex', '0');
  drop.setAttribute('aria-label', 'Add images');
  var dropStrong = el('strong', null, 'Drop images here');
  var dropSpan = el('span', null, 'or tap to choose - JPG, PNG, WebP, GIF, AVIF');
  var picker = el('input');
  picker.type = 'file';
  picker.accept = 'image/*';
  picker.multiple = true;
  picker.hidden = true;
  drop.appendChild(dropStrong); drop.appendChild(dropSpan); drop.appendChild(picker);
  root.appendChild(drop);

  var controls = el('div', 'ppx-controls');
  controls.hidden = true;

  var qField = el('label', 'ppx-field');
  var qLabelRow = el('span', 'ppx-field-label');
  qLabelRow.appendChild(document.createTextNode('Quality '));
  var qOut = el('output', null, '80%');
  qLabelRow.appendChild(qOut);
  var quality = el('input');
  quality.type = 'range'; quality.min = '10'; quality.max = '100'; quality.value = '80';
  qField.appendChild(qLabelRow); qField.appendChild(quality);

  var fField = el('label', 'ppx-field');
  fField.appendChild(el('span', 'ppx-field-label', 'Format'));
  var format = el('select');
  [['image/webp', 'WebP (recommended)'], ['image/jpeg', 'JPEG'], ['image/png', 'PNG (lossless)']].forEach(function (p) {
    var o = el('option', null, p[1]); o.value = p[0]; format.appendChild(o);
  });
  fField.appendChild(format);

  var rField = el('label', 'ppx-field');
  rField.appendChild(el('span', 'ppx-field-label', 'Resize'));
  var resize = el('select');
  [['0', 'Keep original size'], ['2560', 'Max 2560 px'], ['1920', 'Max 1920 px'], ['1280', 'Max 1280 px'], ['800', 'Max 800 px']].forEach(function (p) {
    var o = el('option', null, p[1]); o.value = p[0]; resize.appendChild(o);
  });
  rField.appendChild(resize);

  var clearBtn = el('button', 'ppx-btn ppx-secondary', 'Clear');
  clearBtn.type = 'button';

  controls.appendChild(qField); controls.appendChild(fField); controls.appendChild(rField); controls.appendChild(clearBtn);
  root.appendChild(controls);

  var hint = el('p', 'ppx-hint', 'Animated images become stills. Transparent areas turn white in JPEG. PNG stays lossless, so the quality slider does not change PNG output.');
  hint.hidden = true;
  root.appendChild(hint);

  var list = el('section', 'ppx-list');
  list.setAttribute('aria-live', 'polite');
  root.appendChild(list);

  var summary = el('div', 'ppx-summary');
  var summaryText = el('span');
  var downloadAllBtn = el('button', 'ppx-btn', 'Download all');
  downloadAllBtn.type = 'button';
  summary.appendChild(summaryText); summary.appendChild(downloadAllBtn);
  root.appendChild(summary);

  if (chrome) {
    var foot = el('footer', 'ppx-footer', 'PixelPress is open source (MIT). Everything runs locally in your browser.');
    root.appendChild(foot);
  }

  function currentOpts() {
    return {
      type: format.value,
      quality: parseInt(quality.value, 10) / 100,
      maxDim: parseInt(resize.value, 10)
    };
  }

  function renderItem(item) {
    var card = el('div', 'ppx-item');
    var img = el('img');
    img.alt = item.file.name;
    card.appendChild(img);
    item.thumbEl = img;

    var meta = el('div', 'ppx-meta');
    meta.appendChild(el('div', 'ppx-name', item.file.name));
    var stats = el('div', 'ppx-stats', 'Working...');
    meta.appendChild(stats);
    item.statsEl = stats;

    var toggle = el('div', 'ppx-toggle');
    var bOrig = el('button', 'on', 'Original'); bOrig.type = 'button';
    var bComp = el('button', null, 'Compressed'); bComp.type = 'button';
    bOrig.onclick = function () { if (item.srcURL) { img.src = item.srcURL; bOrig.className = 'on'; bComp.className = ''; } };
    bComp.onclick = function () { if (item.outURL) { img.src = item.outURL; bComp.className = 'on'; bOrig.className = ''; } };
    toggle.appendChild(bOrig); toggle.appendChild(bComp);
    meta.appendChild(toggle);
    card.appendChild(meta);
    item.toggleEl = toggle;

    var actions = el('div', 'ppx-actions');
    var dl = el('button', 'ppx-btn', 'Download');
    dl.type = 'button';
    dl.disabled = true;
    dl.onclick = function () { downloadItem(item); };
    actions.appendChild(dl);
    card.appendChild(actions);
    item.dlEl = dl;

    item.el = card;
    list.appendChild(card);
  }

  function updateItemStats(item) {
    if (item.error) {
      item.statsEl.textContent = '';
      var err = el('span', 'ppx-err', 'Could not read this image (unsupported or damaged file).');
      item.statsEl.appendChild(err);
      item.thumbEl.style.display = 'none';
      item.toggleEl.style.display = 'none';
      item.dlEl.style.display = 'none';
      return;
    }
    var saved = item.file.size - item.out.size;
    var pct = saved > 0 ? Math.round(saved / item.file.size * 100) : 0;
    item.statsEl.textContent = '';
    item.statsEl.appendChild(document.createTextNode(fmtBytes(item.file.size) + ' \u2192 '));
    item.statsEl.appendChild(el('strong', null, fmtBytes(item.out.size)));
    if (pct > 0) {
      item.statsEl.appendChild(document.createTextNode(' \u00b7 '));
      item.statsEl.appendChild(el('span', 'ppx-saved', pct + '% smaller'));
    } else {
      item.statsEl.appendChild(document.createTextNode(' \u00b7 no savings at these settings'));
    }
    item.statsEl.appendChild(document.createTextNode(' \u00b7 ' + item.out.width + '\u00d7' + item.out.height));
    item.dlEl.disabled = false;
  }

  function updateSummary() {
    var done = items.filter(function (i) { return i.out; });
    if (!items.length) { summary.className = 'ppx-summary'; controls.hidden = true; hint.hidden = true; return; }
    controls.hidden = false; hint.hidden = false;
    if (!done.length) { summary.className = 'ppx-summary'; return; }
    var before = 0, after = 0;
    done.forEach(function (i) { before += i.file.size; after += i.out.size; });
    var pct = before > after ? Math.round((before - after) / before * 100) : 0;
    summaryText.textContent = done.length + ' image' + (done.length > 1 ? 's' : '') + ': ' +
      fmtBytes(before) + ' \u2192 ' + fmtBytes(after) + (pct > 0 ? ' (' + pct + '% smaller)' : '');
    summary.className = 'ppx-summary show';
  }

  async function processOne(item) {
    try {
      var loaded = await loadImageFromFile(item.file);
      item.img = loaded.img; item.srcURL = loaded.url;
      item.width = loaded.width; item.height = loaded.height;
      item.thumbEl.src = item.srcURL;
      var res = await compressImage(item.img, item.width, item.height, currentOpts());
      if (item.outURL) URL.revokeObjectURL(item.outURL);
      item.outURL = URL.createObjectURL(res.blob);
      item.out = { size: res.blob.size, width: res.width, height: res.height, type: res.type };
      item.outBlob = res.blob;
    } catch (e) {
      item.error = e;
    }
    updateItemStats(item);
  }

  async function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList).filter(function (f) {
      return f.type.indexOf('image/') === 0 && f.size > 0;
    });
    for (var i = 0; i < files.length; i++) {
      // Skip exact duplicates (same name and size already in the list).
      var dupe = items.some(function (it) { return it.file.name === files[i].name && it.file.size === files[i].size; });
      if (dupe) continue;
      var item = { file: files[i], out: null, outURL: null, outBlob: null, error: null };
      items.push(item);
      renderItem(item);
      updateSummary();
      await processOne(item);
      updateSummary();
    }
  }

  function scheduleReprocess() {
    clearTimeout(processTimer);
    processTimer = setTimeout(async function () {
      for (var i = 0; i < items.length; i++) {
        if (items[i].error) continue;
        await processOne(items[i]);
      }
      updateSummary();
    }, 180);
  }

  function downloadItem(item) {
    if (!item.outBlob) return;
    var a = document.createElement('a');
    a.href = item.outURL;
    a.download = outName(item.file.name, item.out.type);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  drop.addEventListener('click', function () { picker.click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); } });
  picker.addEventListener('change', function () { addFiles(picker.files); picker.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drag'); });
  });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer) addFiles(e.dataTransfer.files); });

  quality.addEventListener('input', function () { qOut.textContent = quality.value + '%'; scheduleReprocess(); });
  format.addEventListener('change', scheduleReprocess);
  resize.addEventListener('change', scheduleReprocess);
  clearBtn.addEventListener('click', function () {
    items.forEach(function (i) {
      if (i.srcURL) URL.revokeObjectURL(i.srcURL);
      if (i.outURL) URL.revokeObjectURL(i.outURL);
      if (i.el) i.el.remove();
    });
    items = [];
    updateSummary();
  });
  downloadAllBtn.addEventListener('click', function () {
    items.forEach(function (i, idx) { if (i.outBlob) setTimeout(function () { downloadItem(i); }, idx * 250); });
  });

  return {
    destroy: function () {
      items.forEach(function (i) {
        if (i.srcURL) URL.revokeObjectURL(i.srcURL);
        if (i.outURL) URL.revokeObjectURL(i.outURL);
      });
      root.textContent = '';
    }
  };
                          }
