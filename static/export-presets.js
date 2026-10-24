/* Joes Studio export presets — lightweight profiles for the Student Batch workflow. */
(function () {
  "use strict";
  const STORAGE_KEY = "joesStudioExportPresetsV1";
  const BUILT_INS = [
    { id: "standard-a4", name: "Standard ID cards · A4 · 6/page", premium: false, settings: { sheetSize: "A4", orientation: "portrait", cardsPerPage: 6, resolution: 300 } },
    { id: "dense-a4", name: "High-density IDs · A4 · 8/page", premium: true, settings: { sheetSize: "A4", orientation: "portrait", cardsPerPage: 8, resolution: 300 } },
    { id: "photo-a4", name: "Photo-quality print · A4 · 6/page", premium: true, settings: { sheetSize: "A4", orientation: "portrait", cardsPerPage: 6, resolution: 600 } },
    { id: "letter", name: "US Letter · 6/page", premium: true, settings: { sheetSize: "Letter", orientation: "portrait", cardsPerPage: 6, resolution: 300 } },
    { id: "landscape-a4", name: "Landscape sheet · A4 · 6/page", premium: true, settings: { sheetSize: "A4", orientation: "landscape", cardsPerPage: 6, resolution: 300 } }
  ];
  const byId = id => BUILT_INS.find(p => p.id === id);
  const batch = () => window.JoesStudentBatch;
  const monetization = () => window.JoesStudioMonetization;
  function isPaid() {
    const s = monetization()?.status?.();
    return !!(s && (s.is_admin || (s.subscription?.plan && s.subscription.plan !== "free" &&
      s.subscription.status === "active" && new Date(s.subscription.expires_at).getTime() > Date.now())));
  }
  function saved() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.filter(p => p && typeof p.name === "string" && p.settings) : [];
    } catch (_) { return []; }
  }
  function notify(message, error) {
    if (window.Toastify) {
      window.Toastify({ text: message, duration: 3500, gravity: "top", position: "center", close: true,
        style: { background: error ? "#b91c1c" : "#166534" } }).showToast();
    } else if (window.JoesStudioMonetization?.open && error) {
      window.JoesStudioMonetization.open();
      window.alert(message);
    } else window.alert(message);
  }
  function applySettings(settings) {
    const b = batch();
    if (!b) return notify("Open Student Batch first, then apply the export preset.", true);
    b.state.sheetSize = settings.sheetSize;
    b.state.orientation = settings.orientation;
    b.state.cardsPerPage = settings.cardsPerPage;
    b.state.resolution = settings.resolution;
    const values = {
      studentBatchSheetSize: settings.sheetSize,
      studentBatchOrientation: settings.orientation,
      studentBatchCardsPerPage: settings.cardsPerPage,
      studentBatchResolution: settings.resolution
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = String(value);
    });
    if (typeof b.refresh === "function") b.refresh();
    if (typeof b.previewBatch === "function") b.previewBatch();
    notify("Export preset applied. Review the preview before generating the PDF.");
  }
  function panelMarkup() {
    return '<section id="jsmExportPresets" class="mx-4 mb-4 rounded-xl border border-slate-200 bg-white p-4">' +
      '<div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="text-sm font-semibold text-slate-800">Export presets</h3>' +
      '<p class="mt-1 text-xs text-slate-500">Apply a ready-made print layout, then review the preview before exporting.</p></div>' +
      '<span id="jsmExportPresetTier" class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"></span></div>' +
      '<div class="mt-3 flex flex-col gap-2 sm:flex-row"><select id="jsmExportPresetSelect" class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">' +
      '</select><button id="jsmExportPresetApply" type="button" class="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Apply preset</button></div>' +
      '<div id="jsmExportPresetPremiumNote" class="mt-2 hidden text-xs text-amber-700">This preset is included with paid plans. Upgrade from Account &amp; Plans to unlock it.</div>' +
      '<div class="mt-3 flex flex-col gap-2 sm:flex-row"><input id="jsmExportPresetName" maxlength="48" class="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs" placeholder="Name current settings (paid plans)" />' +
      '<button id="jsmExportPresetSave" type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700">Save current preset</button></div>' +
      '<p class="mt-2 text-[10px] text-slate-500">Saved presets stay in this browser on this device. They are not synced to other devices.</p></section>';
  }
  function renderOptions(panel) {
    const select = panel.querySelector("#jsmExportPresetSelect");
    const previous = select.value;
    select.replaceChildren();
    const options = [...BUILT_INS, ...saved().map((p, i) => ({ ...p, id: "saved-" + i, premium: true, savedPreset: true }))];
    options.forEach(p => {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = (p.premium && !isPaid() ? "🔒 " : "") + p.name;
      select.appendChild(option);
    });
    if (options.some(p => p.id === previous)) select.value = previous;
    panel.querySelector("#jsmExportPresetTier").textContent = isPaid() ? "PAID PLAN" : "FREE PLAN";
    panel.querySelector("#jsmExportPresetSave").disabled = !isPaid();
    panel.querySelector("#jsmExportPresetSave").title = isPaid() ? "Save this configuration on this device" : "Saving custom presets requires a paid plan";
    panel.querySelector("#jsmExportPresetName").disabled = !isPaid();
    const selected = options.find(p => p.id === select.value) || options[0];
    panel.querySelector("#jsmExportPresetPremiumNote").classList.toggle("hidden", !selected?.premium || isPaid());
  }
  function attach() {
    const modal = document.getElementById("studentBatchModal");
    if (!modal || modal.querySelector("#jsmExportPresets")) return;
    const anchor = modal.querySelector("#studentBatchPhotoEnhancementPanel") ||
      modal.querySelector("#studentBatchWatermarkPanel") || modal.querySelector("#studentBatchFields");
    const section = document.createElement("section");
    section.innerHTML = panelMarkup();
    const panel = section.firstElementChild;
    if (anchor) anchor.insertAdjacentElement("beforebegin", panel);
    else modal.appendChild(panel);
    renderOptions(panel);
    panel.querySelector("#jsmExportPresetSelect").addEventListener("change", () => renderOptions(panel));
    panel.querySelector("#jsmExportPresetApply").addEventListener("click", () => {
      const id = panel.querySelector("#jsmExportPresetSelect").value;
      const presets = [...BUILT_INS, ...saved().map((p, i) => ({ ...p, id: "saved-" + i, premium: true }))];
      const preset = presets.find(p => p.id === id);
      if (!preset) return;
      if (preset.premium && !isPaid()) {
        panel.querySelector("#jsmExportPresetPremiumNote").classList.remove("hidden");
        notify("This export preset requires an active paid plan. Open Account & Plans to upgrade.", true);
        monetization()?.open?.();
        return;
      }
      applySettings(preset.settings);
    });
    panel.querySelector("#jsmExportPresetSave").addEventListener("click", () => {
      if (!isPaid()) {
        notify("Saving custom export presets requires an active paid plan.", true);
        monetization()?.open?.();
        return;
      }
      const b = batch();
      if (!b) return notify("Open Student Batch first.", true);
      const name = panel.querySelector("#jsmExportPresetName").value.trim().slice(0, 48);
      if (!name) return notify("Enter a name for this preset.", true);
      const presets = saved();
      if (presets.length >= 8) return notify("You can save up to 8 custom presets in this browser. Delete an old preset in browser storage before adding another.", true);
      presets.push({ name, settings: {
        sheetSize: String(b.state.sheetSize || "A4"),
        orientation: b.state.orientation === "landscape" ? "landscape" : "portrait",
        cardsPerPage: Math.min(100, Math.max(1, Number(b.state.cardsPerPage) || 6)),
        resolution: [150, 300, 600].includes(Number(b.state.resolution)) ? Number(b.state.resolution) : 300
      }});
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      panel.querySelector("#jsmExportPresetName").value = "";
      renderOptions(panel);
      panel.querySelector("#jsmExportPresetSelect").value = "saved-" + (presets.length - 1);
      notify("Custom export preset saved on this device.");
    });
  }
  function init() {
    attach();
    const observer = new MutationObserver(() => attach());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("focus", () => {
      const panel = document.getElementById("jsmExportPresets");
      if (panel) renderOptions(panel);
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        const panel = document.getElementById("jsmExportPresets");
        if (panel) renderOptions(panel);
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();