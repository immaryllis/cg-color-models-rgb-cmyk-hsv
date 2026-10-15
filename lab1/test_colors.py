"""Выполнение color.js в системном JavaScriptCore macOS, без Node.js."""
import ctypes
from pathlib import Path
jsc = ctypes.CDLL('/System/Library/Frameworks/JavaScriptCore.framework/JavaScriptCore')
ptr = ctypes.c_void_p
jsc.JSGlobalContextCreate.argtypes = [ptr]
jsc.JSGlobalContextCreate.restype = ptr
jsc.JSStringCreateWithUTF8CString.argtypes = [ctypes.c_char_p]
jsc.JSStringCreateWithUTF8CString.restype = ptr
jsc.JSEvaluateScript.argtypes = [ptr, ptr, ptr, ptr, ctypes.c_int, ctypes.POINTER(ptr)]
jsc.JSEvaluateScript.restype = ptr
jsc.JSValueToBoolean.argtypes = [ptr, ptr]
jsc.JSValueToBoolean.restype = ctypes.c_bool
ctx = jsc.JSGlobalContextCreate(None)
source = Path(__file__).with_name('color.js').read_text() + r'''
(function(){
const {rgbToCmyk,cmykToRgb,rgbToHsv,hsvToRgb}=Colors;
const eq=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-8);
const cases=[[[0,0,0],[0,0,0,100],[0,0,0]],[[255,255,255],[0,0,0,0],[0,0,100]],[[255,0,0],[0,100,100,0],[0,100,100]],[[0,255,0],[100,0,100,0],[120,100,100]],[[0,0,255],[100,100,0,0],[240,100,100]],[[128,128,128],[0,0,0,49.80392156862745],[0,0,50.19607843137255]]];
for(const [rgb,cmyk,hsv] of cases)if(!eq(rgbToCmyk(rgb),cmyk)||!eq(rgbToHsv(rgb),hsv))throw Error('Контрольный цвет');
let seed=42;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<10000;i++){const rgb=[random()*255,random()*255,random()*255];if(!eq(rgb,cmykToRgb(rgbToCmyk(rgb)))||!eq(rgb,hsvToRgb(rgbToHsv(rgb))))throw Error('Обратное преобразование');}
if(!eq(hsvToRgb([360,100,100]),[255,0,0]))throw Error('Граница тона');
return true;
})();
'''
script = jsc.JSStringCreateWithUTF8CString(source.encode())
exc = ptr()
result = jsc.JSEvaluateScript(ctx, script, None, None, 1, ctypes.byref(exc))
assert not exc.value, 'Ошибка JavaScript или контрольного преобразования'
assert jsc.JSValueToBoolean(ctx, result)
print('OK: 6 контрольных цветов, 10 000 RGB → CMYK → RGB и RGB → HSV → RGB, H=360°')
