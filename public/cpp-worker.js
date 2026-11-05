/* Classic worker: compiles and runs C++ with Clang compiled to WebAssembly. */
importScripts('clang/clang-wasm.global.js');

let compilerPromise = null;

function getCompiler() {
  if (!compilerPromise) {
    const baseUrl = new URL('clang/', self.location.href).href;
    compilerPromise = self.clangWasm
      .createCompiler('cpp', {
        baseUrl,
        std: 'gnu++17',
        onProgress: (v) => self.postMessage({ type: 'progress', value: v }),
      })
      .catch((e) => {
        compilerPromise = null;
        throw e;
      });
  }
  return compilerPromise;
}

self.onmessage = async (ev) => {
  const msg = ev.data;
  try {
    if (msg.type === 'warmup') {
      await getCompiler();
      self.postMessage({ type: 'ready' });
      return;
    }
    if (msg.type === 'run') {
      const compiler = await getCompiler();
      self.postMessage({ type: 'compiling' });
      const r = await compiler.run(msg.code, msg.stdin || '');
      self.postMessage({
        type: 'result',
        id: msg.id,
        output: r.output,
        errors: r.errors,
        exitCode: r.exitCode,
        compileMs: r.compileMs,
        runMs: r.runMs,
      });
    }
  } catch (e) {
    self.postMessage({ type: 'error', id: msg.id, message: String((e && e.message) || e) });
  }
};
