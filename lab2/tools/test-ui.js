window.uiTestResult={checks:[],errors:[]};
(async()=>{const check=(name,value)=>{window.uiTestResult.checks.push({name,passed:!!value});if(!value)throw Error(name);};try{
 selectDemo('shadow');setMode('threshold');const original=Array.from(source.data);$('window').value=51;$('window').dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,180));check('Изменение ползунка пересчитывает результат',lastResults.params.window===51);
 $('prefilter').checked=true;process();check('Сглаживание перед порогами',lastResults.params.prefilter===true);check('Исходник сохранён',original.every((v,i)=>v===source.data[i]));
 $('smoothTab').click();check('Переключение режима',lastResults.mode==='smooth'&&$('thresholdControls').hidden);$('reset').click();check('Сброс параметров',lastResults.params.window===31&&lastResults.params.kernel===5&&!lastResults.params.prefilter);
 const c=document.createElement('canvas');c.width=1600;c.height=40;const ctx=c.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r));const dt=new DataTransfer();dt.items.add(new File([blob],'color-test.png',{type:'image/png'}));$('file').files=dt.files;$('file').dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,250));
 check('Загрузка PNG и уменьшение большой стороны',source.kind==='upload'&&source.width===1280&&source.height===32);check('Перевод красного в яркость',source.data[0]===76);check('Нет ложной метрики качества без эталона',$('metricExplanation').textContent.includes('нет подходящего эталона'));
 const previous=source;const bad=new DataTransfer();bad.items.add(new File(['not an image'],'bad.png',{type:'image/png'}));$('file').files=bad.files;$('file').dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,150));check('Повреждённый файл не меняет исходник',source===previous&&$('status').textContent.includes('Не удалось'));
 selectDemo('shadow');setMode('threshold');
}catch(e){window.uiTestResult.errors.push(e.message);}window.uiTestResult.finished=true;})();

void 0;
