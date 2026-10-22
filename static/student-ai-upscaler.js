/* Browser-local Real-ESRGAN x4 restoration using ONNX Runtime Web.
 * Model: realesr-general-x4v3-static384.onnx (BSD-3-Clause).
 * Input is processed in overlapping 384px tiles to bound memory use.
 */
(function () {
  "use strict";
  const MODEL_URL = "https://huggingface.co/Saimon8420/realesr-general-x4v3-web/resolve/main/realesr-general-x4v3-static384.onnx";
  const ORT_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
  const TILE = 384, SCALE = 4, STRIDE = 352, MAX_INPUT_SIDE = 1200;
  let runtimePromise = null, sessionPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-joes-ort="1"]');
      if (existing) {
        if (window.ort) return resolve(window.ort);
        existing.addEventListener("load", () => resolve(window.ort), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src; script.async = true; script.dataset.joesOrt = "1";
      script.onload = () => window.ort ? resolve(window.ort) : reject(new Error("ONNX Runtime did not initialize"));
      script.onerror = () => reject(new Error("Could not load ONNX Runtime Web"));
      document.head.appendChild(script);
    });
  }
  async function getRuntime() {
    if (!runtimePromise) runtimePromise = loadScript(ORT_BASE + "ort.min.js").then(ort => {
      ort.env.wasm.wasmPaths = ORT_BASE;
      ort.env.wasm.numThreads = 1;
      return ort;
    }).catch(error => { runtimePromise = null; throw error; });
    return runtimePromise;
  }
  async function getSession() {
    if (!sessionPromise) sessionPromise = (async () => {
      const ort = await getRuntime();
      try {
        return await ort.InferenceSession.create(MODEL_URL, {
          executionProviders: navigator.gpu ? ["webgpu", "wasm"] : ["wasm"],
          graphOptimizationLevel: "all"
        });
      } catch (gpuError) {
        console.warn("Real-ESRGAN GPU path unavailable; retrying on WASM.", gpuError);
        return await ort.InferenceSession.create(MODEL_URL, {
          executionProviders: ["wasm"], graphOptimizationLevel: "all"
        });
      }
    })().catch(error => { sessionPromise = null; throw error; });
    return sessionPromise;
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not decode enhanced image for AI restoration"));
      image.src = src;
    });
  }
  function tileStarts(length) {
    if (length <= TILE) return [0];
    const starts = [];
    for (let p = 0; p < length - TILE; p += STRIDE) starts.push(p);
    const last = length - TILE;
    if (starts[starts.length - 1] !== last) starts.push(last);
    return starts;
  }
  function edgePad(ctx, canvas, validW, validH) {
    if (validW < TILE) ctx.drawImage(canvas, validW - 1, 0, 1, validH, validW, 0, TILE - validW, validH);
    if (validH < TILE) ctx.drawImage(canvas, 0, validH - 1, TILE, 1, 0, validH, TILE, TILE - validH);
  }
  function makeTensor(ort, pixels) {
    const plane = TILE * TILE, data = new Float32Array(3 * plane);
    for (let p = 0; p < plane; p++) {
      const i = p * 4;
      data[p] = pixels[i] / 255;
      data[plane + p] = pixels[i + 1] / 255;
      data[plane * 2 + p] = pixels[i + 2] / 255;
    }
    return new ort.Tensor("float32", data, [1, 3, TILE, TILE]);
  }
  function outputCanvas(tensor) {
    const side = TILE * SCALE, plane = side * side, values = tensor.data;
    const canvas = document.createElement("canvas"); canvas.width = side; canvas.height = side;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const image = ctx.createImageData(side, side), pixels = image.data;
    for (let p = 0; p < plane; p++) {
      const i = p * 4;
      pixels[i] = Math.max(0, Math.min(255, Math.round(values[p] * 255)));
      pixels[i + 1] = Math.max(0, Math.min(255, Math.round(values[plane + p] * 255)));
      pixels[i + 2] = Math.max(0, Math.min(255, Math.round(values[plane * 2 + p] * 255)));
      pixels[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }
  async function upscale(source) {
    const image = await loadImage(source);
    const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
    if (!iw || !ih || Math.max(iw, ih) > MAX_INPUT_SIDE) {
      return { image: source, skipped: true, reason: "Photo is already large enough for normal export." };
    }
    const ort = await getRuntime(), session = await getSession();
    const input = document.createElement("canvas"); input.width = iw; input.height = ih;
    const inputCtx = input.getContext("2d", { willReadFrequently: true }); inputCtx.drawImage(image, 0, 0, iw, ih);
    const result = document.createElement("canvas"); result.width = iw * SCALE; result.height = ih * SCALE;
    const resultCtx = result.getContext("2d");
    const xs = tileStarts(iw), ys = tileStarts(ih);
    for (let yi = 0; yi < ys.length; yi++) {
      for (let xi = 0; xi < xs.length; xi++) {
        const x = xs[xi], y = ys[yi], validW = Math.min(TILE, iw - x), validH = Math.min(TILE, ih - y);
        const tile = document.createElement("canvas"); tile.width = TILE; tile.height = TILE;
        const tileCtx = tile.getContext("2d", { willReadFrequently: true });
        tileCtx.fillStyle = "#777"; tileCtx.fillRect(0, 0, TILE, TILE);
        tileCtx.drawImage(input, x, y, validW, validH, 0, 0, validW, validH);
        edgePad(tileCtx, tile, validW, validH);
        const pixels = tileCtx.getImageData(0, 0, TILE, TILE).data;
        const feeds = {}; feeds[session.inputNames[0] || "input"] = makeTensor(ort, pixels);
        const outputs = await session.run(feeds);
        const tensor = outputs[session.outputNames[0] || "output"];
        if (!tensor) throw new Error("Real-ESRGAN returned no image tensor");
        const enhanced = outputCanvas(tensor);
        const overlapL = xi > 0 ? Math.max(0, xs[xi - 1] + TILE - x) : 0;
        const overlapT = yi > 0 ? Math.max(0, ys[yi - 1] + TILE - y) : 0;
        const overlapR = xi < xs.length - 1 ? Math.max(0, x + TILE - xs[xi + 1]) : 0;
        const overlapB = yi < ys.length - 1 ? Math.max(0, y + TILE - ys[yi + 1]) : 0;
        const cropL = xi > 0 ? Math.floor(overlapL / 2) : 0;
        const cropT = yi > 0 ? Math.floor(overlapT / 2) : 0;
        const cropR = xi < xs.length - 1 ? Math.ceil(overlapR / 2) : TILE - validW;
        const cropB = yi < ys.length - 1 ? Math.ceil(overlapB / 2) : TILE - validH;
        const copyW = Math.max(0, TILE - cropL - cropR), copyH = Math.max(0, TILE - cropT - cropB);
        if (copyW && copyH) resultCtx.drawImage(enhanced,
          cropL * SCALE, cropT * SCALE, copyW * SCALE, copyH * SCALE,
          (x + cropL) * SCALE, (y + cropT) * SCALE, copyW * SCALE, copyH * SCALE);
        tile.width = 1; tile.height = 1; enhanced.width = 1; enhanced.height = 1;
      }
    }
    return { image: result.toDataURL("image/jpeg", 0.92), skipped: false };
  }
  window.JoesStudentAIUpscaler = {
    upscale,
    async process(source) {
      try { return await upscale(source); }
      catch (error) {
        console.warn("AI photo restoration failed; retaining regular enhancement.", error);
        return { image: source, skipped: true, error: String(error && error.message || error) };
      }
    }
  };
})();