/* Чистые функции: RGB — 0..255, CMYK — 0..100, HSV — градусы и проценты. */
(function(root){
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function rgbToCmyk([r,g,b]){r/=255;g/=255;b/=255;const k=1-Math.max(r,g,b);return k>=1?[0,0,0,100]:[(1-r-k)/(1-k)*100,(1-g-k)/(1-k)*100,(1-b-k)/(1-k)*100,k*100];}
function cmykToRgb([c,m,y,k]){return [c,m,y].map(v=>255*(1-v/100)*(1-k/100));}
function rgbToHsv([r,g,b]){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}return [(h+360)%360,max===0?0:d/max*100,max*100];}
function hsvToRgb([h,s,v]){h=((h%360)+360)%360;s/=100;v/=100;const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;const a=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return a.map(n=>(n+m)*255);}
root.Colors={clamp,rgbToCmyk,cmykToRgb,rgbToHsv,hsvToRgb};
})(globalThis);
