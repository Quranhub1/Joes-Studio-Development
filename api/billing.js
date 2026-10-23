const L=require("./_lib");
module.exports=async function(req,res){
 if(L.handleCors(req,res))return;
 if(req.method!=="POST")return L.json(res,405,{error:"Method not allowed."});
 if(!L.configured())return L.json(res,503,{error:"Billing is not configured yet. Add the Supabase environment variables to the development deployment."});
 try{
  const b=L.bodyOf(req),action=String(b.action||""),{user,isAdmin}=await L.requireUser(req);await L.ensureProfile(user);
  if(action==="status"){const[s,u]=await Promise.all([L.subscriptionFor(user.id),L.usageFor(user.id)]);return L.json(res,200,L.publicStatus(user,isAdmin,s,u));}
  if(action==="request_payment"){
   const p=L.planInfo(String(b.plan||""));if(!p)return L.json(res,400,{error:"Choose a valid plan."});if(!p.available)return L.json(res,400,{error:"The weekly price has not been configured by the administrator yet."});
   const reference=String(b.payment_reference||"").trim().slice(0,120);if(!reference)return L.json(res,400,{error:"Enter the mobile-money transaction/reference ID after sending payment."});
   const pending=await L.db("payment_requests?user_id=eq."+encodeURIComponent(user.id)+"&status=eq.pending&select=id");if(Array.isArray(pending)&&pending.length)return L.json(res,409,{error:"You already have a payment request awaiting admin approval."});
   const rows=await L.db("payment_requests",{method:"POST",body:{user_id:user.id,email:user.email,phone:user.user_metadata?.phone||null,plan:p.plan,amount_ugx:p.amount_ugx,payment_reference:reference,status:"pending"}});
   return L.json(res,200,{request:rows?.[0]||null,message:"Payment request submitted. Your plan remains locked until the administrator approves it."});
  }
  if(action==="consume_batch"){
   const[s,u]=await Promise.all([L.subscriptionFor(user.id),L.usageFor(user.id)]),paid=isAdmin||(s.plan!=="free"&&s.status==="active"&&new Date(s.expires_at).getTime()>Date.now());
   if(!paid&&u.batch_actions>=2)return L.json(res,402,{error:"Your 2 free batch actions this month are used. Request a daily, weekly, or monthly plan and wait for admin approval."});
   const result=await L.db("rpc/consume_batch_action",{method:"POST",body:{p_user_id:user.id,p_enforce_limit:!paid}});
   if(result?.allowed===false)return L.json(res,402,{error:"Your free batch allowance is used for this month. Request a plan and wait for admin approval."});
   return L.json(res,200,{ok:true,usage:result});
  }
  if(action==="set_feature"){
   const feature=String(b.feature||"");if(!["custom_templates_enabled","custom_watermark_enabled"].includes(feature))return L.json(res,400,{error:"Unknown feature."});
   const s=await L.subscriptionFor(user.id),paid=isAdmin||(s.plan!=="free"&&s.status==="active"&&new Date(s.expires_at).getTime()>Date.now());if(!paid)return L.json(res,403,{error:"This is a Pro feature. Upgrade to change this setting."});
   if(!isAdmin)await L.db("subscriptions?user_id=eq."+encodeURIComponent(user.id),{method:"PATCH",body:{[feature]:Boolean(b.enabled),updated_at:new Date().toISOString()}});
   return L.json(res,200,{ok:true,feature,enabled:Boolean(b.enabled)});
  }
  if(action==="admin_list"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const rows=await L.db("payment_requests?select=*&order=requested_at.desc&limit=200"),ids=[...new Set((rows||[]).map(r=>r.user_id).filter(Boolean))];
   const profiles=ids.length?await L.db("profiles?select=id,email,phone&id=in.("+ids.map(encodeURIComponent).join(",")+")"):[];
   const byId=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
   return L.json(res,200,{requests:(rows||[]).map(r=>({...r,profile:byId[r.user_id]||null})),pricing:{daily:5000,weekly:L.WEEKLY_PRICE_UGX,monthly:25000}});
  }
  if(action==="admin_users"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const[profiles,subscriptions]=await Promise.all([
    L.db("profiles?select=id,email,phone,updated_at&order=updated_at.desc&limit=300"),
    L.db("subscriptions?select=*&limit=500")
   ]);
   const byUser=Object.fromEntries((subscriptions||[]).map(s=>[s.user_id,s]));
   return L.json(res,200,{users:(profiles||[]).map(p=>({...p,is_admin:String(p.email||"").toLowerCase()===L.ADMIN_EMAIL,subscription:byUser[p.id]||null}))});
  }
  if(action==="admin_set_subscription"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const userId=String(b.user_id||"").trim(),plan=String(b.plan||""),duration=Number(b.duration_days||({"daily":1,"weekly":7,"monthly":30}[plan]||0));
   if(!userId||!["daily","weekly","monthly"].includes(plan)||!Number.isInteger(duration)||duration<1||duration>365)return L.json(res,400,{error:"Choose a valid plan and a duration from 1 to 365 days."});
   const now=new Date(),current=await L.subscriptionFor(userId),base=current.status==="active"&&current.plan!=="free"&&current.expires_at&&new Date(current.expires_at)>now?new Date(current.expires_at):now;
   const expires=new Date(base.getTime()+duration*86400000).toISOString();
   await L.db("subscriptions?on_conflict=user_id",{method:"POST",prefer:"resolution=merge-duplicates,return=representation",body:{user_id:userId,plan,status:"active",starts_at:current.starts_at||now.toISOString(),expires_at:expires,custom_templates_enabled:true,custom_watermark_enabled:true,updated_at:now.toISOString()}});
   return L.json(res,200,{ok:true,user_id:userId,plan,expires_at:expires,message:"Subscription updated successfully."});
  }
  if(action==="admin_review"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const id=String(b.request_id||""),decision=String(b.decision||""),note=String(b.note||"").slice(0,500);
   if(!id||!["approve","reject"].includes(decision))return L.json(res,400,{error:"Invalid review request."});
   const rows=await L.db("payment_requests?id=eq."+encodeURIComponent(id)+"&select=*"),p=Array.isArray(rows)?rows[0]:null;
   if(!p||p.status!=="pending")return L.json(res,409,{error:"This request is missing or has already been reviewed."});
   const now=new Date(),status=decision==="approve"?"approved":"rejected";
   if(decision==="approve"){
    const days={daily:1,weekly:7,monthly:30}[p.plan];if(!days||!p.amount_ugx)return L.json(res,400,{error:"The requested plan is not configured."});
    const current=await L.subscriptionFor(p.user_id),base=current.status==="active"&&current.plan!=="free"&&current.expires_at&&new Date(current.expires_at)>now?new Date(current.expires_at):now;
    await L.db("subscriptions?on_conflict=user_id",{method:"POST",prefer:"resolution=merge-duplicates,return=representation",body:{user_id:p.user_id,plan:p.plan,status:"active",starts_at:now.toISOString(),expires_at:new Date(base.getTime()+days*86400000).toISOString(),custom_templates_enabled:true,custom_watermark_enabled:true,updated_at:now.toISOString()}});
   }
   await L.db("payment_requests?id=eq."+encodeURIComponent(id),{method:"PATCH",body:{status,reviewed_at:now.toISOString(),reviewed_by:user.id,admin_note:note}});
   return L.json(res,200,{ok:true,status});
  }
  return L.json(res,400,{error:"Unknown billing action."});
 }catch(error){return L.errorResponse(res,error);}
};
