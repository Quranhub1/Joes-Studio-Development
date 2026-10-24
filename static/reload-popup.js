(function(){
  "use strict";
  if(document.getElementById("jsReloadSite"))return;
  const style=document.createElement("style");
  style.textContent=`
    #jsReloadSite{position:fixed;right:16px;bottom:72px;z-index:99990;display:inline-flex;align-items:center;gap:8px;border:1px solid #e2e8f0;border-radius:999px;padding:10px 15px;background:#fff;color:#1e293b;font:650 13px/1.2 system-ui,-apple-system,sans-serif;box-shadow:0 8px 24px rgba(15,23,42,.14);cursor:pointer;transition:transform .18s,box-shadow .18s,border-color .18s}
    #jsReloadSite:hover{transform:translateY(-2px);border-color:#fda4af;box-shadow:0 12px 30px rgba(15,23,42,.18)}
    #jsReloadOverlay{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.56);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);opacity:0;transition:opacity .2s ease}
    #jsReloadOverlay.open{opacity:1}
    #jsReloadCard{width:min(410px,100%);box-sizing:border-box;padding:28px 26px 24px;border:1px solid rgba(226,232,240,.9);border-radius:22px;background:#fff;color:#0f172a;text-align:center;box-shadow:0 28px 90px rgba(15,23,42,.28);transform:translateY(10px) scale(.985);transition:transform .2s ease}
    #jsReloadOverlay.open #jsReloadCard{transform:translateY(0) scale(1)}
    #jsReloadBrand{display:flex;align-items:center;justify-content:center;gap:9px;margin:0 0 22px;color:#64748b;font:750 11px/1 system-ui,-apple-system,sans-serif;letter-spacing:.16em;text-transform:uppercase}
    #jsReloadMark{display:grid;place-items:center;width:56px;height:56px;margin:0 auto 18px;border:1px solid #fecdd3;border-radius:18px;background:linear-gradient(145deg,#fff1f2,#ffe4e6);color:#be123c;font:700 28px/1 system-ui,-apple-system,sans-serif}
    #jsReloadCard h2{margin:0 0 10px;font:750 23px/1.2 system-ui,-apple-system,sans-serif;letter-spacing:-.045em;color:#0f172a}
    #jsReloadCard p{margin:0 auto 24px;max-width:320px;color:#64748b;font:14px/1.65 system-ui,-apple-system,sans-serif}
    #jsReloadActions{display:flex;gap:10px}
    #jsReloadActions button{flex:1;min-height:46px;border-radius:12px;padding:11px 14px;font:700 13px system-ui,-apple-system,sans-serif;cursor:pointer;transition:background .15s,transform .15s,border-color .15s}
    #jsReloadActions button:active{transform:scale(.98)}
    #jsReloadCancel{border:1px solid #e2e8f0;background:#fff;color:#334155}
    #jsReloadCancel:hover{background:#f8fafc;border-color:#cbd5e1}
    #jsReloadConfirm{border:1px solid #be123c;background:linear-gradient(135deg,#e11d48,#be123c);color:#fff;box-shadow:0 5px 14px rgba(190,18,60,.2)}
    #jsReloadConfirm:hover{background:linear-gradient(135deg,#be123c,#9f1239)}
    #jsReloadActions button:focus-visible,#jsReloadSite:focus-visible{outline:3px solid #fda4af!important;outline-offset:3px}
    @media(max-width:420px){#jsReloadCard{padding:24px 18px 20px;border-radius:18px}#jsReloadActions{flex-direction:column-reverse}}
    @media(prefers-reduced-motion:reduce){#jsReloadSite,#jsReloadOverlay,#jsReloadCard,#jsReloadActions button{transition:none}}
  `;
  const button=document.createElement("button");button.id="jsReloadSite";button.type="button";button.innerHTML="<span aria-hidden=\"true\">↻</span><span>Reload site</span>";button.setAttribute("aria-label","Reload Joes Studio");
  button.addEventListener("click",()=>{
    if(document.getElementById("jsReloadOverlay"))return;
    const overlay=document.createElement("div");overlay.id="jsReloadOverlay";overlay.setAttribute("role","presentation");
    const card=document.createElement("section");card.id="jsReloadCard";card.setAttribute("role","dialog");card.setAttribute("aria-modal","true");card.setAttribute("aria-labelledby","jsReloadTitle");
    const brand=document.createElement("div");brand.id="jsReloadBrand";brand.textContent="JOES STUDIO";
    const mark=document.createElement("div");mark.id="jsReloadMark";mark.textContent="↻";mark.setAttribute("aria-hidden","true");
    const title=document.createElement("h2");title.id="jsReloadTitle";title.textContent="Reload this page?";
    const message=document.createElement("p");message.textContent="Joes Studio will refresh and start again. Any changes you have not saved may be lost.";
    const actions=document.createElement("div");actions.id="jsReloadActions";
    const cancel=document.createElement("button");cancel.id="jsReloadCancel";cancel.type="button";cancel.textContent="Cancel";
    const confirm=document.createElement("button");confirm.id="jsReloadConfirm";confirm.type="button";confirm.textContent="Reload page";
    const close=()=>{overlay.classList.remove("open");setTimeout(()=>overlay.remove(),220);button.focus();};
    cancel.addEventListener("click",close);
    overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
    overlay.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
    confirm.addEventListener("click",()=>{confirm.disabled=true;confirm.textContent="Reloading…";window.__jsReloadConfirmed=true;window.location.reload();});
    actions.append(cancel,confirm);card.append(brand,mark,title,message,actions);overlay.append(card);document.body.append(style,button,overlay);
    requestAnimationFrame(()=>{overlay.classList.add("open");confirm.focus();});
  });
  document.head.appendChild(style);document.body.appendChild(button);
})();