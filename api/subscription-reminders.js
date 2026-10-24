const L=require("./_lib");
module.exports=async function(req,res){
 if(req.method!=="GET")return L.json(res,405,{error:"Method not allowed."});
 const secret=String(process.env.CRON_SECRET||"");
 if(!secret)return L.json(res,503,{error:"Subscription reminder cron is not configured. Set CRON_SECRET."});
 if(String(req.headers.authorization||"")!=="Bearer "+secret)return L.json(res,401,{error:"Unauthorized."});
 if(!L.configured())return L.json(res,503,{error:"Supabase service configuration is missing."});
 const resendKey=String(process.env.RESEND_API_KEY||""),from=String(process.env.REMINDER_FROM_EMAIL||"");
 if(!resendKey||!from)return L.json(res,503,{error:"Email reminders require RESEND_API_KEY and REMINDER_FROM_EMAIL."});
 try{
  const now=Date.now(),rows=await L.db("subscriptions?plan=neq.free&status=eq.active&select=user_id,plan,expires_at&limit=5000");
  const candidates=(Array.isArray(rows)?rows:[]).map(s=>{
   const hours=(new Date(s.expires_at).getTime()-now)/3600000;
   const type=hours>48&&hours<=96?"3_day":hours>12&&hours<=36?"1_day":hours>-12&&hours<=12?"expiry_day":null;
   return{...s,hours,type};
  }).filter(s=>s.type&&s.expires_at&&Number.isFinite(new Date(s.expires_at).getTime()));
  const ids=[...new Set(candidates.map(s=>s.user_id))];
  const profiles=ids.length?await L.db("profiles?select=id,email&id=in.("+ids.map(encodeURIComponent).join(",")+")"):[];
  const byId=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
  let sent=0,skipped=0,failed=0;
  for(const sub of candidates){
   const profile=byId[sub.user_id];if(!profile?.email){skipped++;continue;}
   const logs=await L.db("subscription_reminder_log?user_id=eq."+encodeURIComponent(sub.user_id)+"&expires_at=eq."+encodeURIComponent(new Date(sub.expires_at).toISOString())+"&reminder_type=eq."+sub.type+"&select=id&limit=1");
   if(Array.isArray(logs)&&logs.length){skipped++;continue;}
   const days=Math.max(0,Math.ceil(sub.hours/24)),subject=sub.type==="3_day"?"Your Joes Studio plan expires in about 3 days":sub.type==="1_day"?"Your Joes Studio plan expires tomorrow":"Your Joes Studio subscription has reached its expiry date";
   const expiry=new Date(sub.expires_at).toLocaleString("en-UG",{timeZone:"Africa/Kampala"});
   const message=sub.type==="3_day"?"Your "+sub.plan+" plan expires in about three days. Renew now to keep your premium features available.":sub.type==="1_day"?"Your "+sub.plan+" plan is due to expire within about a day. Submit your Mobile Money transaction reference after payment so the admin can review it.":"Your "+sub.plan+" plan has reached its expiry date. Premium features remain unavailable until a renewal payment is verified and approved.";
   const html='<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#111827"><div style="background:#111827;color:#fff;padding:24px;border-radius:12px 12px 0 0"><p style="margin:0;color:#a5b4fc;font-size:12px;letter-spacing:2px;font-weight:bold">JOES STUDIO</p><h1 style="font-size:24px;margin:12px 0 0">Subscription reminder</h1></div><div style="border:1px solid #e5e7eb;border-top:0;padding:26px;border-radius:0 0 12px 12px"><p>'+message+'</p><p><strong>Plan:</strong> '+sub.plan.toUpperCase()+'<br><strong>Expiry:</strong> '+expiry+' (East Africa Time)</p><p>To renew, open Joes Studio, choose your plan, send the exact Mobile Money amount, and submit the transaction reference. Access is activated after manual admin verification.</p><p style="margin:24px 0"><a href="https://joesstudio.vercel.app/" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:bold">Open Joes Studio</a></p><p style="font-size:12px;color:#6b7280">This is an automated account reminder. If you have already renewed, your payment may still be awaiting manual review.</p></div></div>';
   try{
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+resendKey,"Content-Type":"application/json"},body:JSON.stringify({from,to:[profile.email],subject,html,text:message+" Plan: "+sub.plan+". Expiry: "+expiry+". Renew in Joes Studio; Mobile Money payments are still manually verified."})});
    if(!response.ok){failed++;continue;}
    await L.db("subscription_reminder_log",{method:"POST",prefer:"resolution=ignore-duplicates,return=minimal",body:{user_id:sub.user_id,expires_at:new Date(sub.expires_at).toISOString(),reminder_type:sub.type}});
    sent++;
   }catch(_){failed++;}
  }
  return L.json(res,200,{ok:true,checked:candidates.length,sent,skipped,failed});
 }catch(error){return L.errorResponse(res,error);}
};
