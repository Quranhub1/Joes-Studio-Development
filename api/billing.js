const L=require("./_lib");
module.exports=async function(req,res){
 if(L.handleCors(req,res))return;
 if(req.method!=="POST")return L.json(res,405,{error:"Method not allowed."});
 if(!L.configured())return L.json(res,503,{error:"Billing is not configured yet. Add the Supabase environment variables to the development deployment."});
 try{
  const b=L.bodyOf(req),action=String(b.action||""),{user,isAdmin}=await L.requireUser(req);await L.ensureProfile(user);
  if(action==="status"){const[s,u]=await Promise.all([L.subscriptionFor(user.id),L.usageFor(user.id)]);return L.json(res,200,L.publicStatus(user,isAdmin,s,u));}
  if(!isAdmin&&!["request_payment","payment_history"].includes(action)){const current=await L.subscriptionFor(user.id);if(current.plan!=="free"&&(current.status!=="active"||!current.expires_at||new Date(current.expires_at).getTime()<=Date.now()))return L.json(res,403,{error:"Your subscription has expired. Renew your plan and wait for administrator approval to unlock workspace tools."});}
  if(action==="request_payment"){
   const p=L.planInfo(String(b.plan||""));if(!p)return L.json(res,400,{error:"Choose a valid plan."});
   const reference=String(b.payment_reference||"").trim().slice(0,120);if(!reference)return L.json(res,400,{error:"Enter the mobile-money transaction/reference ID after sending payment."});
   const pending=await L.db("payment_requests?user_id=eq."+encodeURIComponent(user.id)+"&status=eq.pending&select=id");if(Array.isArray(pending)&&pending.length)return L.json(res,409,{error:"You already have a payment request awaiting admin approval."});
   const rows=await L.db("payment_requests",{method:"POST",body:{user_id:user.id,email:user.email,phone:user.user_metadata?.phone||null,plan:p.plan,amount_ugx:p.amount_ugx,payment_reference:reference,status:"pending"}});
   return L.json(res,200,{request:rows?.[0]||null,message:"Payment request submitted. Your plan remains locked until the administrator approves it."});
  }
  if(action==="consume_batch"){
   const s=await L.subscriptionFor(user.id),ent=L.entitlementFor(s,isAdmin);
   const result=await L.db("rpc/consume_batch_action_v2",{method:"POST",body:{p_user_id:user.id,p_included_limit:ent.included_batch_actions,p_bypass_limit:!!isAdmin}});
   if(result?.allowed===false)return L.json(res,402,{error:"Your included monthly batch allowance is used. Purchase an optional credit pack or upgrade your plan."});
   return L.json(res,200,{ok:true,usage:result});
  }
  if(action==="request_credits"){
   const reference=String(b.payment_reference||"").trim().slice(0,120);
   if(!reference)return L.json(res,400,{error:"Enter the Mobile Money transaction/reference ID after sending payment."});
   const pending=await L.db("credit_requests?user_id=eq."+encodeURIComponent(user.id)+"&status=eq.pending&select=id");
   if(Array.isArray(pending)&&pending.length)return L.json(res,409,{error:"You already have a credit-pack request awaiting admin approval."});
   const rows=await L.db("credit_requests",{method:"POST",body:{user_id:user.id,email:user.email,phone:user.user_metadata?.phone||null,credits:L.CREDIT_PACK_SIZE,amount_ugx:L.CREDIT_PACK_PRICE_UGX,payment_reference:reference,status:"pending"}});
   return L.json(res,200,{request:rows?.[0]||null,message:"Credit-pack request submitted. Credits are added only after manual payment verification."});
  }
  if(action==="request_commercial"){
   const kind=String(b.kind||"");
   if(!["institution","marketplace","service"].includes(kind))return L.json(res,400,{error:"Choose a valid request type."});
   const subject=String(b.subject||"").trim().slice(0,120),details=String(b.details||"").trim().slice(0,2000),contact=String(b.contact||"").trim().slice(0,120);
   if(!subject||!details||!contact)return L.json(res,400,{error:"Provide a title, details and contact information."});
   const rows=await L.db("commercial_requests",{method:"POST",body:{user_id:user.id,email:user.email,kind,subject,details,contact,status:"pending"}});
   return L.json(res,200,{request:rows?.[0]||null,message:"Request received. The Joes Studio team will review it and contact you; any payment remains manual."});
  }
  if(action==="commercial_history"){
   const rows=await L.db("commercial_requests?user_id=eq."+encodeURIComponent(user.id)+"&select=id,kind,subject,status,requested_at,reviewed_at,admin_note&order=requested_at.desc&limit=100");
   return L.json(res,200,{requests:rows||[]});
  }
  if(action==="admin_credit_list"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const rows=await L.db("credit_requests?select=*&order=requested_at.desc&limit=200");
   return L.json(res,200,{requests:rows||[]});
  }
  if(action==="admin_credit_review"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const id=String(b.request_id||""),decision=String(b.decision||""),note=String(b.note||"").slice(0,500);
   if(!id||!["approve","reject"].includes(decision))return L.json(res,400,{error:"Invalid credit request review."});
   const rows=await L.db("credit_requests?id=eq."+encodeURIComponent(id)+"&select=*"),p=Array.isArray(rows)?rows[0]:null;
   if(!p||p.status!=="pending")return L.json(res,409,{error:"This credit request is missing or already reviewed."});
   const now=new Date(),status=decision==="approve"?"approved":"rejected";
   if(decision==="approve")await L.db("rpc/grant_credits",{method:"POST",body:{p_user_id:p.user_id,p_credits:Number(p.credits),p_reference:"credit-request:"+id,p_admin_id:user.id}});
   await L.db("credit_requests?id=eq."+encodeURIComponent(id),{method:"PATCH",body:{status,reviewed_at:now.toISOString(),reviewed_by:user.id,admin_note:note}});
   return L.json(res,200,{ok:true,status,message:decision==="approve"?"Credit pack approved and credited.":"Credit request rejected."});
  }
  if(action==="admin_commercial_list"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const rows=await L.db("commercial_requests?select=*&order=requested_at.desc&limit=300");
   return L.json(res,200,{requests:rows||[]});
  }
  if(action==="admin_commercial_review"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const id=String(b.request_id||""),status=String(b.status||""),note=String(b.note||"").slice(0,500);
   if(!id||!["reviewing","contacted","closed","rejected"].includes(status))return L.json(res,400,{error:"Choose a valid request status."});
   const rows=await L.db("commercial_requests?id=eq."+encodeURIComponent(id)+"&select=id,status");
   if(!Array.isArray(rows)||!rows.length)return L.json(res,404,{error:"Commercial request not found."});
   await L.db("commercial_requests?id=eq."+encodeURIComponent(id),{method:"PATCH",body:{status,reviewed_at:new Date().toISOString(),reviewed_by:user.id,admin_note:note}});
   return L.json(res,200,{ok:true,status});
  }
  if(action==="set_feature"){
   const feature=String(b.feature||"");if(!["custom_templates_enabled","custom_watermark_enabled"].includes(feature))return L.json(res,400,{error:"Unknown feature."});
   const s=await L.subscriptionFor(user.id),ent=L.entitlementFor(s,isAdmin);if(!ent[feature==="custom_templates_enabled"?"custom_templates":"custom_watermark"])return L.json(res,403,{error:"This feature requires an active paid plan."});
   if(!isAdmin)await L.db("subscriptions?user_id=eq."+encodeURIComponent(user.id),{method:"PATCH",body:{[feature]:Boolean(b.enabled),updated_at:new Date().toISOString()}});
   return L.json(res,200,{ok:true,feature,enabled:Boolean(b.enabled)});
  }
  if(action==="payment_history"){
   const rows=await L.db("payment_requests?user_id=eq."+encodeURIComponent(user.id)+"&select=id,plan,amount_ugx,payment_reference,status,requested_at,reviewed_at,admin_note&order=requested_at.desc&limit=100");
   const sub=await L.subscriptionFor(user.id);
   return L.json(res,200,{payments:rows||[],subscription:sub});
  }
  if(action==="authorize_feature"){
   const feature=String(b.feature||""),allowedFeatures=["custom_templates","custom_watermark","white_background","custom_background","bulk_tools"];
   if(!allowedFeatures.includes(feature))return L.json(res,400,{error:"Unknown premium feature."});
   const sub=await L.subscriptionFor(user.id),ent=L.entitlementFor(sub,isAdmin),setting=feature==="custom_templates"?sub.custom_templates_enabled:feature==="custom_watermark"?sub.custom_watermark_enabled:true;
   if(!ent[feature]||(!isAdmin&&setting===false))return L.json(res,403,{error:"This feature is not included in your active plan. Upgrade in Account & Plans to unlock it."});
   return L.json(res,200,{allowed:true,feature,plan:ent.plan});
  }
  if(action==="admin_analytics"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const[requests,subscriptions,creditRequests]=await Promise.all([
    L.db("payment_requests?select=user_id,plan,amount_ugx,status,requested_at,reviewed_at&order=requested_at.desc&limit=5000"),
    L.db("subscriptions?select=user_id,plan,status,expires_at&limit=5000"),
    L.db("credit_requests?select=user_id,amount_ugx,status,requested_at&order=requested_at.desc&limit=5000")
   ]);
   const reqs=Array.isArray(requests)?requests:[],subs=Array.isArray(subscriptions)?subscriptions:[],creditReqs=Array.isArray(creditRequests)?creditRequests:[];
   const now=Date.now(),active=subs.filter(x=>x.plan!=="free"&&x.status==="active"&&x.expires_at&&new Date(x.expires_at).getTime()>now);
   const approved=reqs.filter(x=>x.status==="approved"),rejected=reqs.filter(x=>x.status==="rejected"),pending=reqs.filter(x=>x.status==="pending");
   const approvedByUser={};approved.forEach(x=>approvedByUser[x.user_id]=(approvedByUser[x.user_id]||0)+1);
   const byPlan={pro:{requests:0,approved:0,rejected:0,revenue_ugx:0},business:{requests:0,approved:0,rejected:0,revenue_ugx:0},institution:{requests:0,approved:0,rejected:0,revenue_ugx:0}};
   reqs.forEach(x=>{if(!byPlan[x.plan])return;const p=byPlan[x.plan];p.requests++;if(x.status==="approved"){p.approved++;p.revenue_ugx+=Number(x.amount_ugx||0);}if(x.status==="rejected")p.rejected++;});
   const approvedCredits=creditReqs.filter(x=>x.status==="approved"),pendingCredits=creditReqs.filter(x=>x.status==="pending"),rejectedCredits=creditReqs.filter(x=>x.status==="rejected"),creditRevenue=approvedCredits.reduce((sum,x)=>sum+Number(x.amount_ugx||0),0),totalRevenue=approved.reduce((sum,x)=>sum+Number(x.amount_ugx||0),0)+creditRevenue,repeatPayers=Object.values(approvedByUser).filter(n=>n>1).length,renewals=Object.values(approvedByUser).reduce((sum,n)=>sum+Math.max(0,n-1),0);
   return L.json(res,200,{generated_at:new Date().toISOString(),total_requests:reqs.length,pending_requests:pending.length,approved_payments:approved.length,rejected_requests:rejected.length,active_subscribers:active.length,total_revenue_ugx:totalRevenue,subscription_revenue_ugx:totalRevenue-creditRevenue,credit_pack_revenue_ugx:creditRevenue,approved_credit_packs:approvedCredits.length,pending_credit_requests:pendingCredits.length,rejected_credit_requests:rejectedCredits.length,conversion_rate:reqs.length?Math.round(approved.length/reqs.length*1000)/10:0,repeat_payers:repeatPayers,renewals,by_plan:byPlan,history_limited:reqs.length>=5000||subs.length>=5000||creditReqs.length>=5000});
  }
  if(action==="admin_list"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const rows=await L.db("payment_requests?select=*&order=requested_at.desc&limit=200"),ids=[...new Set((rows||[]).map(r=>r.user_id).filter(Boolean))];
   const profiles=ids.length?await L.db("profiles?select=id,email,phone&id=in.("+ids.map(encodeURIComponent).join(",")+")"):[];
   const byId=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
   return L.json(res,200,{requests:(rows||[]).map(r=>({...r,profile:byId[r.user_id]||null})),pricing:{pro:29000,business:79000,institution:750000}});
  }
  if(action==="admin_users"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const[profiles,subscriptions]=await Promise.all([
    L.db("profiles?select=id,email,phone,updated_at,is_banned,ban_reason&order=updated_at.desc&limit=300"),
    L.db("subscriptions?select=*&limit=500")
   ]);
   const byUser=Object.fromEntries((subscriptions||[]).map(s=>[s.user_id,s]));
   const now=Date.now();
   return L.json(res,200,{users:(profiles||[]).map(p=>{
    const is_admin=String(p.email||"").toLowerCase()===L.ADMIN_EMAIL;
    const raw=byUser[p.id]||{user_id:p.id,plan:"free",status:"active",starts_at:null,expires_at:null};
    const expiry=raw.expires_at?new Date(raw.expires_at).getTime():null;
    const paidActive=!is_admin&&["pro","business","institution"].includes(raw.plan)&&raw.status==="active"&&expiry!==null&&expiry>now;
    const current_plan=is_admin?"administrator":paidActive?raw.plan:"free";
    const plan_status=is_admin?"permanent":paidActive?"active":raw.plan!=="free"&&(raw.status==="expired"||(expiry!==null&&expiry<=now))?"expired":"free";
    return {...p,is_admin,subscription:raw,current_plan,plan_status,plan_expires_at:paidActive?raw.expires_at:null,previous_plan:!paidActive&&raw.plan!=="free"?raw.plan:null};
   })});
  }
  if(action==="admin_set_ban"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const userId=String(b.user_id||"").trim(),banned=Boolean(b.banned),reason=String(b.reason||"").trim().slice(0,300);
   if(!userId)return L.json(res,400,{error:"Choose a user."});
   const targets=await L.db("profiles?id=eq."+encodeURIComponent(userId)+"&select=id,email");
   const target=Array.isArray(targets)?targets[0]:null;
   if(!target)return L.json(res,404,{error:"User profile not found."});
   if(String(target.email||"").toLowerCase()===L.ADMIN_EMAIL)return L.json(res,403,{error:"The administrator account cannot be banned."});
   await L.db("profiles?id=eq."+encodeURIComponent(userId),{method:"PATCH",body:{is_banned:banned,ban_reason:banned?(reason||"Account suspended by administrator"):null,updated_at:new Date().toISOString()}});
   return L.json(res,200,{ok:true,is_banned:banned,message:banned?"User banned. Their API access is now blocked.":"User unbanned. Access restored."});
  }
  if(action==="admin_set_subscription"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const userId=String(b.user_id||"").trim(),plan=String(b.plan||""),duration=Number(b.duration_days||({"pro":30,"business":30,"institution":365}[plan]||0));
   if(!userId||!["pro","business","institution"].includes(plan)||!Number.isInteger(duration)||duration<1||duration>365)return L.json(res,400,{error:"Choose a valid plan and a duration from 1 to 365 days."});
   const now=new Date(),current=await L.subscriptionFor(userId),base=current.status==="active"&&current.plan!=="free"&&current.expires_at&&new Date(current.expires_at)>now?new Date(current.expires_at):now;
   const expires=new Date(base.getTime()+duration*86400000).toISOString();
   await L.db("subscriptions?on_conflict=user_id",{method:"POST",prefer:"resolution=merge-duplicates,return=representation",body:{user_id:userId,plan,status:"active",starts_at:current.starts_at||now.toISOString(),expires_at:expires,custom_templates_enabled:true,custom_watermark_enabled:true,updated_at:now.toISOString()}});
   return L.json(res,200,{ok:true,user_id:userId,plan,expires_at:expires,message:"Subscription updated successfully."});
  }
  if(action==="admin_reset_subscription"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const userId=String(b.user_id||"").trim();
   if(!userId)return L.json(res,400,{error:"Choose a user."});
   const targets=await L.db("profiles?id=eq."+encodeURIComponent(userId)+"&select=id,email");
   const target=Array.isArray(targets)?targets[0]:null;
   if(!target)return L.json(res,404,{error:"User profile not found."});
   if(String(target.email||"").toLowerCase()===L.ADMIN_EMAIL)return L.json(res,403,{error:"The administrator subscription cannot be changed."});
   await L.db("subscriptions?user_id=eq."+encodeURIComponent(userId),{method:"DELETE",prefer:"return=minimal"});
   return L.json(res,200,{ok:true,message:"Subscription revoked. The user is now on the free plan."});
  }
  if(action==="admin_delete_payment_request"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const requestId=String(b.request_id||"").trim();
   if(!requestId)return L.json(res,400,{error:"Choose a payment request."});
   const rows=await L.db("payment_requests?id=eq."+encodeURIComponent(requestId)+"&select=id,status");
   if(!Array.isArray(rows)||!rows.length)return L.json(res,404,{error:"Payment request not found."});
   await L.db("payment_requests?id=eq."+encodeURIComponent(requestId),{method:"DELETE",prefer:"return=minimal"});
   return L.json(res,200,{ok:true,message:"Payment request deleted."});
  }
  if(action==="admin_delete_user"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const userId=String(b.user_id||"").trim();
   if(!userId)return L.json(res,400,{error:"Choose a user."});
   const targets=await L.db("profiles?id=eq."+encodeURIComponent(userId)+"&select=id,email");
   const target=Array.isArray(targets)?targets[0]:null;
   if(!target)return L.json(res,404,{error:"User profile not found."});
   if(String(target.email||"").toLowerCase()===L.ADMIN_EMAIL)return L.json(res,403,{error:"The administrator account cannot be deleted."});
   await L.supa("/auth/v1/admin/users/"+encodeURIComponent(userId),{method:"DELETE"});
   await Promise.all([
    L.db("payment_requests?user_id=eq."+encodeURIComponent(userId),{method:"DELETE",prefer:"return=minimal"}),
    L.db("subscriptions?user_id=eq."+encodeURIComponent(userId),{method:"DELETE",prefer:"return=minimal"}),
    L.db("monthly_usage?user_id=eq."+encodeURIComponent(userId),{method:"DELETE",prefer:"return=minimal"}),
    L.db("profiles?id=eq."+encodeURIComponent(userId),{method:"DELETE",prefer:"return=minimal"})
   ]);
   return L.json(res,200,{ok:true,message:"User account and associated monetization records deleted."});
  }
  if(action==="admin_review"){
   if(!isAdmin)return L.json(res,403,{error:"Administrator access required."});
   const id=String(b.request_id||""),decision=String(b.decision||""),note=String(b.note||"").slice(0,500);
   if(!id||!["approve","reject"].includes(decision))return L.json(res,400,{error:"Invalid review request."});
   const rows=await L.db("payment_requests?id=eq."+encodeURIComponent(id)+"&select=*"),p=Array.isArray(rows)?rows[0]:null;
   if(!p||p.status!=="pending")return L.json(res,409,{error:"This request is missing or has already been reviewed."});
   const now=new Date(),status=decision==="approve"?"approved":"rejected";
   if(decision==="approve"){
    const plan=L.planInfo(p.plan),days=plan?.duration_days;if(!days||!p.amount_ugx)return L.json(res,400,{error:"The requested plan is not configured."});
    const current=await L.subscriptionFor(p.user_id),base=current.status==="active"&&current.plan!=="free"&&current.expires_at&&new Date(current.expires_at)>now?new Date(current.expires_at):now;
    await L.db("subscriptions?on_conflict=user_id",{method:"POST",prefer:"resolution=merge-duplicates,return=representation",body:{user_id:p.user_id,plan:p.plan,status:"active",starts_at:now.toISOString(),expires_at:new Date(base.getTime()+(hours?hours*3600000:days*86400000)).toISOString(),custom_templates_enabled:true,custom_watermark_enabled:true,updated_at:now.toISOString()}});
   }
   await L.db("payment_requests?id=eq."+encodeURIComponent(id),{method:"PATCH",body:{status,reviewed_at:now.toISOString(),reviewed_by:user.id,admin_note:note}});
   return L.json(res,200,{ok:true,status});
  }
  return L.json(res,400,{error:"Unknown billing action."});
 }catch(error){return L.errorResponse(res,error);}
};
