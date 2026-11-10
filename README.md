# PixelPress

Compress and convert images right in your browser.
No uploads, no accounts, no watermarks, no limits. Everything runs locally on your device.

## Why

Most online image compressors upload your photos to a server, add watermarks, or cap
free use. PixelPress does the same job entirely on your own device using the browser's
built-in image engine, so your images never leave your phone or computer.

## Features

- Drag and drop or tap to add images (JPG, PNG, WebP, GIF, AVIF)
- Batch compression with a live quality slider (10-100%)
- Convert to WebP, JPEG, or keep lossless PNG
- Optional resize (max 2560 / 1920 / 1280 / 800 px)
- Before/after size for every image, with an Original/Compressed preview toggle
- Download individually or all at once
- Works on phones and desktops, no installation, works offline once loaded
- 100% private: no uploads, no tracking, no server at all

## Honest limits

- Smaller files always trade away some image data; 80% quality is a good default for the web.
- Animated images (GIF) come out as stills.
- Transparent areas turn white in JPEG.
- PNG output is lossless, so the quality slider does not change it.
- Very large images can take a few seconds on a phone.

## Use it

Open `index.html` in any modern browser. The whole app is four small files
(`index.html`, `styles.css`, `app.js`, `compress.js`) with no build step.

To host it for others, put those files on any static host (GitHub Pages, Netlify,
Cloudflare Pages, or any web server). No backend needed.

## How it works

Images are decoded and re-encoded with the browser's Canvas API at the quality you
choose. High-quality smoothing keeps text and edges sharp when resizing. WebP is the
default output; if a browser cannot encode WebP, PixelPress falls back to JPEG
automatically.

## Roadmap ideas

- ZIP download for batches
- Before/after comparison slider
- Target file size mode ("make it under 500 KB")
- Paste from clipboard
- PWA install for one-tap offline access

Contributions welcome.

## License

MIT - see [LICENSE](LICENSE).
