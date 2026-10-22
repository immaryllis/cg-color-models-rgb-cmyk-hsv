(function () {
  const P = Processing, checks = [];
  function test(name, fn) { fn();checks.push(name); }
  function assert(value, message = 'Проверка не пройдена') { if (!value) throw new Error(message); }
  const near = (a, b, e = 1e-8) => assert(a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < e));
  test('Яркость RGB, белый фон прозрачности', () => near(P.grayscale([255,0,0,255, 0,255,0,255, 0,0,255,255, 0,0,0,0]), [76.245,149.685,29.07,255]));
  test('Интегральные статистики против прямого подсчёта, включая границы', () => {
    const w = 7, h = 5, data = Array.from({ length: w * h }, (_, i) => (i * 37 + 11) % 256);
    for (const size of [3, 5, 11]) {
      const stats = P.localStats(data, w, h, size), r = (size - 1) / 2;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = [];
        for (let yy = Math.max(0,y-r); yy <= Math.min(h-1,y+r); yy++) for (let xx = Math.max(0,x-r); xx <= Math.min(w-1,x+r); xx++) a.push(data[yy*w+xx]);
        const mean = a.reduce((s,v)=>s+v,0)/a.length, variance = a.reduce((s,v)=>s+(v-mean)**2,0)/a.length;
        near([stats.mean[y*w+x],stats.std[y*w+x]],[mean,Math.sqrt(variance)]);
      }
    }
  });
  test('Константное изображение сохраняется обоими фильтрами', () => {
    for (const [w,h] of [[1,1],[1,5],[6,1],[8,7]]) {
      const data = new Float64Array(w*h).fill(123);
      near(P.boxBlur(data,w,h,5),data);near(P.gaussianBlur(data,w,h,5,1.2),data);
    }
  });
  test('Усредняющий фильтр: численный контроль 3×3', () => near(P.boxBlur([0,0,0,0,255,0,0,0,0],3,3,3),[63.75,42.5,63.75,42.5,255/9,42.5,63.75,42.5,63.75]));
  test('Гауссов фильтр: симметрия, сумма импульса и больший вес центра', () => {
    const data = new Float64Array(81);data[40]=255;const out=P.gaussianBlur(data,9,9,5,1);
    assert(out[40]>out[39] && out[39]>out[38]);near([out[39],out[41],out[31],out[49]],[out[41],out[39],out[49],out[31]]);near([out.reduce((a,b)=>a+b,0)],[255]);
  });
  test('Пороговые формулы и равенство порогу', () => {
    const data=[90,100,110],stats={mean:[100,100,100],std:[0,64,128]};
    near(P.adaptiveMean(data,stats,5),[0,255,255]);near(P.sauvola(data,stats,0.2),[255,255,255]);
    near(P.adaptiveMean([100],{mean:[100]},0),[0]);near(P.sauvola([100],{mean:[100],std:[128]},0.2),[0]);
  });
  test('F1, MSE и PSNR на известных значениях', () => {
    near([P.f1([0,0,255,255],[0,255,0,255])],[0.5]);assert(P.f1([255],[255])===1);
    assert(P.mse([0,10],[0,0])===50);assert(P.psnr([12],[12])===Infinity);near([P.psnr([0],[255])],[0]);
  });
  test('Некорректные параметры отклоняются', () => {
    for (const fn of [()=>P.localStats([0],1,1,2),()=>P.localStats([0],2,2,3),()=>P.gaussianBlur([0],1,1,3,0),()=>P.sauvola([0],{mean:[0],std:[0]},2)]) {
      let threw=false;try{fn();}catch(_){threw=true;}assert(threw);
    }
  });
  return JSON.stringify({ passed: checks.length, checks });
})();
