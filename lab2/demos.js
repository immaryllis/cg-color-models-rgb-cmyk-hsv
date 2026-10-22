/* Собственные синтетические эталоны, случайность воспроизводима. */
(function (root) {
  function randomGenerator(seed) { return () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed + 0.5) / 4294967296; }; }
  const list = [
    { id: 'shadow', name: 'Текст · тень и шум', kind: 'document', description: '' },
    { id: 'faint', name: 'Текст · слабый контраст', kind: 'document', description: 'Бледные буквы. При стандартных параметрах локальное среднее сохраняет больше штрихов, чем Саувола.' },
    { id: 'texture', name: 'Текст · фактура бумаги', kind: 'document', description: 'Бумага с волнистой фактурой. Саувола подавляет фон, а локальное среднее может выделить фактуру как текст.' },
    { id: 'gaussian', name: 'Фигуры · гауссов шум', kind: 'scene', description: 'Известный чистый эталон и аддитивный гауссов шум. PSNR позволяет оценить сглаживание.' },
    { id: 'impulse', name: 'Фигуры · соль и перец', kind: 'scene', description: 'Импульсные выбросы. Линейное сглаживание размывает их на соседние пиксели; это ограничение обоих фильтров.' },
    { id: 'details', name: 'Фигуры · тонкие детали', kind: 'scene', description: 'Тонкие линии и границы. Большое окно сильнее удаляет шум, но стирает детали.' }
  ];
  function make(id) {
    const info = list.find(d => d.id === id); if (!info) throw new Error('Неизвестный пример');
    const width = 640, height = 400, canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    if (info.kind === 'document') {
      ctx.fillStyle = '#000';ctx.font = 'bold 29px Arial';ctx.fillText('IMAGE PROCESSING / LAB 02', 26, 53);
      ctx.font = '22px Arial';const lines = ['Local thresholding and smoothing', 'Mean threshold: T = m - C', 'Sauvola: T = m (1 + k (s/R - 1))', '0123456789   ABCDEFGHIJKLM', 'Thin strokes, shadows and paper noise'];
      lines.forEach((line, i) => ctx.fillText(line, 28, 108 + i * 49));
      ctx.fillRect(28, 355, 260, 2); ctx.font = '16px Arial';ctx.fillText('Variant 12 / reproducible test image', 28, 386);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, width, height);gradient.addColorStop(0, '#ddd');gradient.addColorStop(1, '#777');ctx.fillStyle = gradient;ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#303030';ctx.fillRect(44, 52, 190, 145);ctx.fillStyle = '#ededed';ctx.beginPath();ctx.arc(414, 143, 90, 0, 2 * Math.PI);ctx.fill();
      ctx.fillStyle = '#5a5a5a';ctx.fillRect(285, 258, 280, 82);ctx.fillStyle = '#fafafa';ctx.font = 'bold 30px Arial';ctx.fillText('DETAILS 0123', 65, 305);
      ctx.strokeStyle = '#151515';ctx.lineWidth = 1;for (let x = 34; x < 610; x += id === 'details' ? 6 : 17) {ctx.beginPath();ctx.moveTo(x, 364);ctx.lineTo(x, 388);ctx.stroke();}
    }
    const pixels = ctx.getImageData(0, 0, width, height).data, base = Processing.grayscale(pixels), data = new Float64Array(base.length), truth = new Uint8ClampedArray(base.length), random = randomGenerator(104729 + list.indexOf(info));
    const normal = () => Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x, ink = 1 - base[i] / 255; truth[i] = ink > 0.5 ? 0 : 255;
      let v;
      if (id === 'shadow') { const paper = 110 + 125 * x / (width - 1) + 10 * Math.sin(y / 100);v = paper - 95 * ink + normal() * 7; }
      else if (id === 'faint') { v = 218 + 15 * x / width - 27 * ink + normal() * 1.2; }
      else if (id === 'texture') { v = 214 + 13 * Math.sin(x / 8) * Math.sin(y / 10) - 128 * ink + normal() * 2; }
      else if (id === 'impulse') { const u = random();v = u < 0.045 ? 0 : u > 0.955 ? 255 : base[i]; }
      else { v = base[i] + normal() * (id === 'details' ? 13 : 23); }
      data[i] = Math.max(0, Math.min(255, v));
    }
    // Данные примеров квантованы так же, как загружаемые 8-битные PNG.
    return { ...info, width, height, data: Uint8ClampedArray.from(data), reference: info.kind === 'document' ? truth : Uint8ClampedArray.from(base) };
  }
  root.Demos = { list, make };
})(globalThis);
