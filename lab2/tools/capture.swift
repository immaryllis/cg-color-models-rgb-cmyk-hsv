import AppKit
import WebKit
let app=NSApplication.shared
app.setActivationPolicy(.prohibited)
let root=URL(fileURLWithPath:CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath)
class Capture:NSObject,WKNavigationDelegate {
 let web=WKWebView(frame:NSRect(x:0,y:0,width:1440,height:1600))
 let window=NSWindow(contentRect:NSRect(x:0,y:0,width:1440,height:1600),styleMask:[.borderless],backing:.buffered,defer:false)
 let steps:[(String,String)]=[("selectDemo('shadow');setMode('threshold');","01-threshold-shadow"),("selectDemo('faint');setMode('threshold');","02-threshold-faint"),("selectDemo('texture');setMode('threshold');","03-threshold-texture"),("selectDemo('gaussian');setMode('smooth');","04-smoothing-gaussian"),("selectDemo('impulse');setMode('smooth');","05-smoothing-impulse"),("selectDemo('details');setMode('smooth');","06-smoothing-details")]
 var index=0
 func start(){window.contentView=web;web.navigationDelegate=self;web.loadFileURL(root.appendingPathComponent("index.html"),allowingReadAccessTo:root)}
 func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){
  let js=try! String(contentsOf:root.appendingPathComponent("tools/export-fixtures.js"),encoding:.utf8)
  web.evaluateJavaScript(js){result,error in
   if let error=error {print(error);exit(1)}
   guard let result=result as? [String:Any],let files=result["files"] as? [String:String],let metrics=result["metrics"] as? String else {print("Bad export");exit(1)}
   for(name,base64) in files {guard let data=Data(base64Encoded:base64) else {exit(1)};try! data.write(to:root.appendingPathComponent(name))}
   try! metrics.write(to:root.appendingPathComponent("results/metrics.json"),atomically:true,encoding:.utf8)
   print("Exported \(files.count) PNGs and metrics");self.capture()
  }
 }
 func capture(){if index>=steps.count {qa();return};let step=steps[index]
  web.evaluateJavaScript(step.0 + ";document.body.getBoundingClientRect().height;"){result,error in if let error=error{print(error);exit(1)};DispatchQueue.main.asyncAfter(deadline:.now()+0.25){let config=WKSnapshotConfiguration();config.rect=NSRect(x:0,y:0,width:1440,height:min(1600,(result as? Double ?? 1600)));self.web.takeSnapshot(with:config){image,error in guard let data=image?.tiffRepresentation,let bitmap=NSBitmapImageRep(data:data),let png=bitmap.representation(using:.png,properties:[:]) else{print("Snapshot failed \(String(describing:error))");exit(1)};try! png.write(to:root.appendingPathComponent("screenshots/\(step.1).png"));print(step.1);self.index+=1;self.capture()}}}
 }
 func qa(){let js=try! String(contentsOf:root.appendingPathComponent("tools/test-ui.js"),encoding:.utf8)
  web.evaluateJavaScript(js){_,error in if let error=error{print(error);exit(1)};DispatchQueue.main.asyncAfter(deadline:.now()+2){self.web.evaluateJavaScript("JSON.stringify(window.uiTestResult)"){result,error in guard let s=result as? String else{print("UI test missing");exit(1)};print(s);try! s.write(to:root.appendingPathComponent("results/ui-checks.json"),atomically:true,encoding:.utf8);app.terminate(nil)}}}
 }
}
let capture=Capture();capture.start();app.run()
