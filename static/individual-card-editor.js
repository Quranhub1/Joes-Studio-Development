/* Paid-only per-card data editor for Student Batch. Edits source row data and regenerates the PDF. */
(function () {
  "use strict";
  const id = "jsmIndividualCardEditor";
  const paid = () => {
    const s = window.JoesStudioMonetization?.status?.();
    if (!s) return false;
    const plan = String(s.plan?.slug || s.plan?.name || s.subscription?.plan || s.current_plan || "").toLowerCase();
    const status = String(s.subscription?.status || s.status || "").toLowerCase();
    const expiry = s.subscription?.expires_at || s.expires_at;
    return !!(s.is_admin || (plan && plan !== "free" && (status === "active" || !status) && (!expiry || Date.parse(expiry) > Date.now())));
  };
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function toast(msg) {
    if (window.Utils?.toast) window.Utils.toast(msg);
    else window.alert(msg);
  }
  function attach() {
    const modal = document.getElementById("studentBatchModal");
    const batch = window.JoesStudentBatch;
    if (!modal || !batch || modal.querySelector("#" + id)) return;
    const panel = document.createElement("section");
    panel.id = id;
    panel.className = "mx-4 mb-4 rounded-xl border border-indigo-200 bg-white p-4";
    panel.innerHTML = '<div class="flex flex-wrap items-start justify-between gap-2"><div><h3 class="text-sm font-semibold text-slate-800">Individual card editor</h3><p class="mt-1 text-xs text-slate-500">Edit one student\'s card data without changing other cards, then regenerate the PDF.</p></div><span id="jsmCardEditBadge" class="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700"></span></div>' +
      '<div id="jsmCardEditLocked" class="mt-3 hidden rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Individual card editing is available on paid plans. Upgrade to edit individual records before exporting.</div>' +
      '<div id="jsmCardEditControls" class="mt-3 space-y-3"><label class="block text-xs font-medium text-slate-600">Select card / student<select id="jsmCardEditRow" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"></select></label><div id="jsmCardEditFields" class="grid grid-cols-1 gap-3 sm:grid-cols-2"></div><div class="flex flex-wrap gap-2"><button id="jsmCardEditSave" type="button" class="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">Save this card</button><button id="jsmCardEditReset" type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">Discard unsaved changes</button><button id="jsmCardEditGenerate" type="button" class="rounded-lg border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-700">Save &amp; regenerate PDF</button></div><p class="text-[10px] text-slate-500">Edits affect the current in-memory batch only. Original spreadsheet files are not changed. Re-export to update the PDF.</p></div>';
    const anchor = modal.querySelector("#studentBatchWatermarkPanel") || modal.querySelector("#studentBatchFields");
    if (anchor) anchor.insertAdjacentElement("beforebegin", panel); else modal.appendChild(panel);
    const rowSelect = panel.querySelector("#jsmCardEditRow");
    const fields = panel.querySelector("#jsmCardEditFields");
    function syncAccess() {
      const ok = paid();
      panel.querySelector("#jsmCardEditBadge").textContent = ok ? "PAID PLAN" : "PAID FEATURE";
      panel.querySelector("#jsmCardEditLocked").classList.toggle("hidden", ok);
      panel.querySelector("#jsmCardEditControls").classList.toggle("hidden", !ok);
      if (ok) renderRows();
    }
    function renderRows() {
      const current = Number(rowSelect.value || 0);
      rowSelect.replaceChildren();
      (batch.state.rows || []).forEach((row, i) => {
        const option = document.createElement("option");
        option.value = String(i);
        const nameKey = (batch.state.headers || []).find(h => /^(name|full name|student name)$/i.test(h)) || (batch.state.headers || [])[0];
        option.textContent = (i + 1) + ". " + String(row[nameKey] || "Card " + (i + 1)).slice(0, 90);
        rowSelect.appendChild(option);
      });
      if (batch.state.rows?.length) rowSelect.value = String(Math.min(current, batch.state.rows.length - 1));
      renderFields();
    }
    function renderFields() {
      fields.replaceChildren();
      const row = batch.state.rows?.[Number(rowSelect.value)];
      if (!row) {
        fields.innerHTML = '<p class="text-xs text-slate-500">Load a spreadsheet to edit individual cards.</p>';
        return;
      }
      (batch.state.headers || Object.keys(row).filter(k => !k.startsWith("__"))).forEach((key, i) => {
        const label = document.createElement("label");
        label.className = "block text-xs font-medium text-slate-600";
        label.textContent = key;
        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 500;
        input.className = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800";
        input.dataset.field = key;
        input.value = String(row[key] ?? "");
        label.appendChild(input);
        fields.appendChild(label);
      });
    }
    function save() {
      if (!paid()) return toast("Individual card editing requires a paid plan.");
      const row = batch.state.rows?.[Number(rowSelect.value)];
      if (!row) return toast("Load a spreadsheet and select a card first.");
      fields.querySelectorAll("input[data-field]").forEach(input => { row[input.dataset.field] = input.value; });
      batch.refresh();
      if (typeof batch.previewBatch === "function") batch.previewBatch();
      renderRows();
      rowSelect.value = String(Math.min(Number(rowSelect.value), (batch.state.rows || []).length - 1));
      renderFields();
      toast("Card changes saved to the current batch. Regenerate the PDF to apply them.");
    }
    rowSelect.addEventListener("change", renderFields);
    panel.querySelector("#jsmCardEditSave").addEventListener("click", save);
    panel.querySelector("#jsmCardEditReset").addEventListener("click", renderFields);
    panel.querySelector("#jsmCardEditGenerate").addEventListener("click", async () => {
      save();
      if (!paid()) return;
      await batch.generate();
    });
    const originalLoad = batch.loadExcel;
    if (typeof originalLoad === "function" && !batch.__jsmCardEditorWrapped) {
      batch.loadExcel = async function (...args) {
        const result = await originalLoad.apply(this, args);
        renderRows();
        return result;
      };
      batch.__jsmCardEditorWrapped = true;
    }
    syncAccess();
    new MutationObserver(syncAccess).observe(modal, { childList: true, subtree: true });
    window.addEventListener("focus", syncAccess);
  }
  function init() {
    attach();
    new MutationObserver(attach).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();