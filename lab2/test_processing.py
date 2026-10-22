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
source = Path(__file__).with_name('processing.js').read_text() + '\n' + Path(__file__).with_name('tests.js').read_text()
script = jsc.JSStringCreateWithUTF8CString(source.encode())
exc = ptr()
result = jsc.JSEvaluateScript(ctx, script, None, None, 1, ctypes.byref(exc))
assert not exc.value, 'Ошибка JavaScript или контрольного преобразования'
assert jsc.JSValueToBoolean(ctx, result)
print('OK: 8 групп проверок processing.js; эталонные значения и прямой подсчёт статистик')
