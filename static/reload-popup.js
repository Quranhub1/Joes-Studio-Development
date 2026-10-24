(function(){
  "use strict";
  if(document.getElementById("jsReloadSite"))return;
  const style=document.createElement("style");
  style.textContent=`
    #jsReloadSite{position:fixed;right:16px;bottom:72px;z-index:99990;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:10px 15px;background:linear-gradient(135deg,#111827,#374151);color:#fff;font:650 13px/1.2 system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px #0003;cursor:pointer;transition:transform .18s,box-shadow .18s}
    #jsReloadSite:hover{transform:translateY(-2px);box-shadow:0 14px 34px #0004}
    #jsReloadOverlay{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(8,15,30,.68);backdrop-filter:blur(12px);opacity:0;transition:opacity .22s ease}
    #jsReloadOverlay.open{opacity:1}
    #jsReloadCard{width:min(420px,100%);box-sizing:border-box;padding:30px 26px 24px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:linear-gradient(145deg,#111827,#1f2937 58%,#111827);color:#f9fafb;text-align:center;box-shadow:0 30px 100px #0007;transform:translateY(12px) scale(.98);transition:transform .22s ease}
    #jsReloadOverlay.open #jsReloadCard{transform:translateY(0) scale(1)}
    #jsReloadMark{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 18px;border-radius:18px;background:linear-gradient(135deg,#ef4444,#b91c1c);font-size:26px;box-shadow:0 8px 26px #b91c1c55}
    #jsReloadCard h2{margin:0 0 9px;font:750 23px/1.2 system-ui,-apple-system,sans-serif;letter-spacing:-.04em}
    #jsReloadCard p{margin:0 auto 22px;max-width:320px;color:#cbd5e1;font:14px/1.65 system-ui,-apple-system,sans-serif}
    #jsReloadActions{display:flex;gap:10px}
    #jsReloadActions button{flex:1;min-height:44px;border-radius:12px;padding:10px 12px;font:700 13px system-ui,-apple-system,sans-serif;cursor:pointer}
    #jsReloadCancel{border:1px solid #4b5563;background:#1f2937;color:#e5e7eb}
    #jsReloadConfirm{border:0;background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;box-shadow:0 6px 18px #b91c1c44}
    @media(prefers-reduced-motion:reduce){#jsReloadSite,#jsReloadOverlay,#jsReloadCard{transition:none}}
  `;
  const button=document.createElement("button");button.id="jsReloadSite";button.type="button";button.textContent="↻  Reload site";button.setAttribute("aria-label","Reload Joes Studio");
  button.addEventListener("click",()=>{
    if(document.getElementById("jsReloadOverlay"))return;
    const overlay=document.createElement("div");overlay.id="jsReloadOverlay";overlay.setAttribute("role","presentation");
    const card=document.createElement("section");card.id="jsReloadCard";card.setAttribute("role","dialog");card.setAttribute("aria-modal","true");card.setAttribute("aria-labelledby","jsReloadTitle");
    const mark=document.createElement("div");mark.id="jsReloadMark";mark.textContent="↻";mark.setAttribute("aria-hidden","true");
    const title=document.createElement("h2");title.id="jsReloadTitle";title.textContent="A fresh start is ready";
    const message=document.createElement("p");message.textContent="Reload Joes Studio to refresh the workspace and load the latest available version. Your saved work remains in your browser.";
    const actions=document.createElement("div");actions.id="jsReloadActions";
    const cancel=document.createElement("button");cancel.id="jsReloadCancel";cancel.type="button";cancel.textContent="Not now";
    const confirm=document.createElement("button");confirm.id="jsReloadConfirm";confirm.type="button";confirm.textContent="Reload now";
    const close=()=>{overlay.classList.remove("open");setTimeout(()=>overlay.remove(),220);button.focus();};
    cancel.addEventListener("click",close);
    overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
    overlay.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
    confirm.addEventListener("click",()=>{confirm.disabled=true;confirm.textContent="Reloading…";window.location.reload();});
    actions.append(cancel,confirm);card.append(mark,title,message,actions);overlay.append(card);document.body.append(style,button,overlay);
    requestAnimationFrame(()=>{overlay.classList.add("open");confirm.focus();});
  });
  document.head.appendChild(style);document.body.appendChild(button);
})();