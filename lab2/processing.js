/* Алгоритмы работают с яркостью 0..255, строки хранятся последовательно. */
(function (root) {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function validate(data, width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || data.length !== width * height) throw new Error('Неверный размер изображения');
  }
  function checkWindow(size) {
    if (!Number.isInteger(size) || size < 3 || size > 151 || size % 2 !== 1) throw new Error('Окно должно быть нечётным числом от 3 до 151');
  }
  function grayscale(rgba) {
    const out = new Float64Array(rgba.length / 4);
    for (let i = 0; i < out.length; i++) {
      const j = 4 * i, a = rgba[j + 3] / 255;
      out[i] = a * (0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2]) + (1 - a) * 255;
    }
    return out;
  }
  // Сумма и сумма квадратов позволяют получить статистики окна за O(1).
  function localStats(data, width, height, size) {
    validate(data, width, height); checkWindow(size);
    const stride = width + 1, sum = new Float64Array(stride * (height + 1)), sq = new Float64Array(sum.length);
    for (let y = 0; y < height; y++) {
      let row = 0, rowSq = 0;
      for (let x = 0; x < width; x++) {
        const v = data[y * width + x], i = (y + 1) * stride + x + 1;
        row += v; rowSq += v * v;
        sum[i] = sum[i - stride] + row; sq[i] = sq[i - stride] + rowSq;
      }
    }
    const mean = new Float64Array(data.length), std = new Float64Array(data.length), r = (size - 1) / 2;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(width, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(height, y + r + 1);
      const a = y0 * stride + x0, b = y0 * stride + x1, c = y1 * stride + x0, d = y1 * stride + x1;
      const count = (x1 - x0) * (y1 - y0), i = y * width + x;
      mean[i] = (sum[d] - sum[b] - sum[c] + sum[a]) / count;
      std[i] = Math.sqrt(Math.max(0, (sq[d] - sq[b] - sq[c] + sq[a]) / count - mean[i] ** 2));
    }
    return { mean, std };
  }
  function adaptiveMean(data, stats, c) {
    if (!Number.isFinite(c)) throw new Error('C должно быть числом');
    return Uint8ClampedArray.from(data, (v, i) => v > stats.mean[i] - c ? 255 : 0);
  }
  function sauvola(data, stats, k, range = 128) {
    if (!Number.isFinite(k) || k < 0 || k > 1 || !Number.isFinite(range) || range <= 0) throw new Error('Неверные параметры Сауволы');
    return Uint8ClampedArray.from(data, (v, i) => v > stats.mean[i] * (1 + k * (stats.std[i] / range - 1)) ? 255 : 0);
  }
  function boxBlur(data, width, height, size) { return localStats(data, width, height, size).mean; }
  function gaussianBlur(data, width, height, size, sigma) {
    validate(data, width, height); checkWindow(size);
    if (!Number.isFinite(sigma) || sigma <= 0) throw new Error('σ должна быть положительной');
    const r = (size - 1) / 2, kernel = new Float64Array(size);
    let norm = 0;
    for (let j = -r; j <= r; j++) { kernel[j + r] = Math.exp(-j * j / (2 * sigma * sigma)); norm += kernel[j + r]; }
    for (let j = 0; j < size; j++) kernel[j] /= norm;
    const tmp = new Float64Array(data.length), out = new Float64Array(data.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let v = 0;
      for (let j = -r; j <= r; j++) v += data[y * width + clamp(x + j, 0, width - 1)] * kernel[j + r];
      tmp[y * width + x] = v;
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let v = 0;
      for (let j = -r; j <= r; j++) v += tmp[clamp(y + j, 0, height - 1) * width + x] * kernel[j + r];
      out[y * width + x] = v;
    }
    return out;
  }
  function mse(a, b) { if (a.length !== b.length || !a.length) throw new Error('Несовместимые изображения'); let sum = 0; for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2; return sum / a.length; }
  function psnr(a, b) { const error = mse(a, b); return error === 0 ? Infinity : 10 * Math.log10(255 ** 2 / error); }
  function f1(a, truth) {
    if (a.length !== truth.length || !a.length) throw new Error('Несовместимые маски');
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < a.length; i++) { const p = a[i] < 128, t = truth[i] < 128; if (p && t) tp++; else if (p) fp++; else if (t) fn++; }
    return (2 * tp + fp + fn) === 0 ? 1 : 2 * tp / (2 * tp + fp + fn);
  }
  root.Processing = { grayscale, localStats, adaptiveMean, sauvola, boxBlur, gaussianBlur, mse, psnr, f1 };
})(globalThis);
