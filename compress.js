// PixelPress core: pure browser image pipeline. No dependencies.
export function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

export function targetSize(w, h, maxDim) {
  if (!maxDim || (w <= maxDim && h <= maxDim)) return [w, h];
  var scale = maxDim / Math.max(w, h);
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
}

export function loadImageFromFile(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      resolve({ img: img, url: url, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

export function drawToCanvas(img, srcW, srcH, opts) {
  var dims = targetSize(srcW, srcH, opts.maxDim || 0);
  var canvas = document.createElement('canvas');
  canvas.width = dims[0];
  canvas.height = dims[1];
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (opts.type === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas, type, q) {
  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (blob) resolve(blob); else reject(new Error('encode'));
    }, type, q);
  });
}

// Returns { blob, width, height, type } - type may differ from requested
// when the browser cannot encode WebP (JPEG fallback).
export async function compressImage(img, srcW, srcH, opts) {
  var canvas = drawToCanvas(img, srcW, srcH, opts);
  var blob = await canvasToBlob(canvas, opts.type, opts.quality);
  var outType = opts.type;
  if (blob.type !== opts.type && opts.type === 'image/webp') {
    blob = await canvasToBlob(canvas, 'image/jpeg', opts.quality);
    outType = 'image/jpeg';
  }
  return { blob: blob, width: canvas.width, height: canvas.height, type: outType };
}

export function extFor(type) {
  if (type === 'image/webp') return '.webp';
  if (type === 'image/png') return '.png';
  return '.jpg';
}

export function outName(name, type) {
  return name.replace(/\.[^.]+$/, '') + '-compressed' + extFor(type);
}
