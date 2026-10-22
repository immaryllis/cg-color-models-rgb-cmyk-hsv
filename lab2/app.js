'use strict';
const $ = id => document.getElementById(id);
let source = null, mode = 'threshold', lastResults = null, fileRequest = 0, timer;
const param = id => Number($(id).value);
function draw(id, data, width, height) {
  const canvas = $(id); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'), image = ctx.createImageData(width, height);
  for (let i = 0; i < data.length; i++) { const v = data[i], j = i * 4; image.data[j] = image.data[j + 1] = image.data[j + 2] = v; image.data[j + 3] = 255; }
  ctx.putImageData(image, 0, 0);
}
function getParams() { return { window: param('window'), c: param('c'), k: param('k'), kernel: param('kernel'), sigma: param('sigma'), prefilter: $('prefilter').checked }; }
function updateLabels() {
  for (const id of ['window', 'kernel']) $(id + 'Out').textContent = `${param(id)} × ${param(id)}`;
  $('cOut').textContent = param('c'); $('kOut').textContent = param('k').toFixed(2); $('sigmaOut').textContent = param('sigma').toFixed(2);
}
function process() {
  if (!source) return;
  updateLabels(); const started = performance.now(), p = getParams(), { data, width, height } = source;
  try {
    let a, b, input = data;
    if (mode === 'threshold') {
      if (p.prefilter) input = Processing.gaussianBlur(data, width, height, p.kernel, p.sigma);
      const stats = Processing.localStats(input, width, height, p.window);
      a = Processing.adaptiveMean(input, stats, p.c); b = Processing.sauvola(input, stats, p.k);
    } else { a = Processing.boxBlur(data, width, height, p.kernel); b = Processing.gaussianBlur(data, width, height, p.kernel, p.sigma); }
    // Метрики относятся к тем же 8-битным результатам, которые видны и сохраняются.
    a = Uint8ClampedArray.from(a); b = Uint8ClampedArray.from(b);
    draw('original', data, width, height); draw('resultA', a, width, height); draw('resultB', b, width, height);
    const usable = source.reference && ((mode === 'threshold' && source.kind === 'document') || (mode === 'smooth' && source.kind === 'scene'));
    const psnrText = (out, truth) => { const v = Processing.psnr(out, truth); return Number.isFinite(v) ? v.toFixed(2) + ' дБ' : '∞ дБ'; };
    if (usable) {
      draw('reference', source.reference, width, height); $('referenceTitle').textContent = mode === 'threshold' ? 'Эталонная маска текста' : 'Чистый эталон без шума';
      if (mode === 'threshold') {
        $('metricOriginal').textContent = '8-битная яркость · тёмный текст на светлом фоне';
        $('metricA').textContent = 'F1 текста: ' + Processing.f1(a, source.reference).toFixed(4);
        $('metricB').textContent = 'F1 текста: ' + Processing.f1(b, source.reference).toFixed(4);
        $('metricExplanation').textContent = 'F1 = 2TP / (2TP + FP + FN). Чёрный текст — положительный класс. Чем ближе F1 к 1, тем точнее маска; эталон известен только для тестовых примеров.';
      } else {
        $('metricOriginal').textContent = 'PSNR: ' + psnrText(data, source.reference);
        $('metricA').textContent = 'PSNR: ' + psnrText(a, source.reference);
        $('metricB').textContent = 'PSNR: ' + psnrText(b, source.reference);
        $('metricExplanation').textContent = 'PSNR измеряется относительно чистого эталона. Большее значение означает меньшую среднеквадратичную ошибку; оно не гарантирует сохранения всех мелких деталей.';
      }
    } else {
      const diff = Uint8ClampedArray.from(a, (v, i) => Math.abs(v - b[i]));draw('reference', diff, width, height); $('referenceTitle').textContent = 'Абсолютная разность методов';
      $('metricOriginal').textContent = '8-битная яркость · исходник не перезаписывается';
      const dark = out => (out.reduce((n, v) => n + (v === 0), 0) / out.length * 100).toFixed(2) + '% чёрных пикселей';
      $('metricA').textContent = mode === 'threshold' ? dark(a) : 'MSE к исходнику: ' + Processing.mse(a, data).toFixed(2);
      $('metricB').textContent = mode === 'threshold' ? dark(b) : 'MSE к исходнику: ' + Processing.mse(b, data).toFixed(2);
      $('metricExplanation').textContent = 'Для этого изображения нет подходящего эталона. Доля чёрных пикселей и отличие от исходника описывают результат, но не оценивают качество восстановления.';
    }
    const difference = a.reduce((n, v, i) => n + (v !== b[i]), 0) / a.length * 100;
    $('difference').textContent = 'Методы различаются на ' + difference.toFixed(2) + '% пикселей.';
    $('titleA').textContent = mode === 'threshold' ? 'Локальное среднее' : 'Усредняющий фильтр';
    $('titleB').textContent = mode === 'threshold' ? 'Метод Сауволы' : 'Гауссов фильтр';
    $('modeTitle').textContent = mode === 'threshold' ? 'Сравнение локальных порогов' : 'Сравнение сглаживающих фильтров';
    $('meta').textContent = `${source.name} · ${width} × ${height} px${p.prefilter && mode === 'threshold' ? ' · с предварительным сглаживанием' : ''}`;
    $('explanation').textContent = mode === 'threshold' ? `Локальное среднее: T = m − ${p.c}. Саувола: T = m [1 + ${p.k.toFixed(2)} (s / 128 − 1)]. Окно ${p.window} × ${p.window}. При I > T пиксель белый, иначе чёрный. Саувола учитывает разброс яркости: меньше выделяет фактуру фона, но может терять бледные штрихи.` : `Оба фильтра подавляют высокочастотные изменения. Усредняющий даёт всем пикселям окна одинаковые веса; гауссов сильнее учитывает центр. Окно ${p.kernel} × ${p.kernel}, σ = ${p.sigma.toFixed(2)}. Увеличение окна усиливает размытие; гауссов фильтр дополнительно зависит от σ.`;
    $('elapsed').textContent = (performance.now() - started).toFixed(0) + ' мс';
    lastResults = { a, b, params: p, mode, source: source.id || 'upload' }; $('status').textContent = '';
  } catch (error) { $('status').textContent = error.message; }
}
function selectDemo(id) {
  fileRequest++; $('file').value = ''; source = Demos.make(id); $('description').textContent = source.description;
  document.querySelectorAll('[data-demo]').forEach(b => { const active = b.dataset.demo === id;b.classList.toggle('active', active);b.setAttribute('aria-pressed', String(active)); });process();
}
function setMode(value) {
  mode = value; $('thresholdControls').hidden = mode !== 'threshold';
  for (const [id, val] of [['thresholdTab', 'threshold'], ['smoothTab', 'smooth']]) { $(id).classList.toggle('active', mode === val);$(id).setAttribute('aria-pressed', String(mode === val)); }
  process();
}
for (const demo of Demos.list) { const b = document.createElement('button');b.textContent = demo.name;b.dataset.demo = demo.id;b.onclick = () => selectDemo(demo.id);$('demos').append(b); }
for (const id of ['window', 'c', 'k', 'kernel', 'sigma', 'prefilter']) $(id).addEventListener('input', () => { updateLabels();clearTimeout(timer);timer = setTimeout(process, 100); });
$('thresholdTab').onclick = () => setMode('threshold'); $('smoothTab').onclick = () => setMode('smooth');
$('reset').onclick = () => { for (const [id, value] of Object.entries({ window: 31, c: 7, k: 0.2, kernel: 5, sigma: 1.2 })) $(id).value = value; $('prefilter').checked = false;process(); };
$('file').addEventListener('change', async event => {
  const file = event.target.files[0];if (!file) return;
  const request = ++fileRequest, url = URL.createObjectURL(file); $('status').textContent = 'Чтение изображения…';
  try {
    const image = new Image();image.src = url;await image.decode();if (request !== fileRequest) return;
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight)), width = Math.max(1, Math.round(image.naturalWidth * scale)), height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');canvas.width = width;canvas.height = height;const ctx = canvas.getContext('2d');ctx.fillStyle = '#fff';ctx.fillRect(0, 0, width, height);ctx.drawImage(image, 0, 0, width, height);
    source = { name: file.name, width, height, data: Uint8ClampedArray.from(Processing.grayscale(ctx.getImageData(0, 0, width, height).data)), kind: 'upload' };
    document.querySelectorAll('[data-demo]').forEach(b => { b.classList.remove('active');b.setAttribute('aria-pressed', 'false'); });
    $('description').textContent = `Собственное изображение. ${scale < 1 ? 'Уменьшено до максимальной стороны 1280 px. ' : ''}Цвет переведён в яркость; прозрачность накладывается на белый фон.`;process();
  } catch (_) { if (request === fileRequest) $('status').textContent = 'Не удалось прочитать изображение. Выберите поддерживаемый файл PNG, JPEG или WebP.'; }
  finally { URL.revokeObjectURL(url); }
});
for (const button of document.querySelectorAll('[data-save]')) button.onclick = () => {
  if (!source) return;$(button.dataset.save).toBlob(blob => { if (!blob) return;const url = URL.createObjectURL(blob), a = document.createElement('a');a.href = url;a.download = `${source.id || 'image'}-${mode}-${button.dataset.save}.png`;a.click();setTimeout(() => URL.revokeObjectURL(url), 1000); }, 'image/png');
};
for (const id of ['original', 'resultA', 'resultB', 'reference']) {
  const open = () => { $('zoomImage').src = $(id).toDataURL('image/png');$('zoom').showModal(); };
  $(id).onclick = open;$(id).onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();open(); } };
}
$('closeZoom').onclick = () => $('zoom').close();
selectDemo('shadow');
