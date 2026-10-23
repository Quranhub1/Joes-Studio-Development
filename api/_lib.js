const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_EMAIL = "kaigwaakram123@gmail.com", PAYMENT_PHONE = "0749846848", PAYMENT_RECIPIENT = "KABALI MADINA";
const WEEKLY_PRICE_UGX = Number(process.env.WEEKLY_PRICE_UGX || 0) || null;
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "").split(",").map(x=>x.trim()).filter(Boolean);
function handleCors(req,res){
 const origin=String(req.headers.origin||"").replace(/\/$/,"");
 if(origin){
  let sameOrigin=false;try{sameOrigin=new URL(origin).host===String(req.headers.host||"");}catch(_){}
  if(!sameOrigin&&!ALLOWED_ORIGINS.includes(origin)){json(res,403,{error:"This website is not allowed to use the Joes Studio API."});return true;}
  res.setHeader("Access-Control-Allow-Origin",origin);
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Authorization, Content-Type");
 }
 if(req.method==="OPTIONS"){res.statusCode=204;res.end();return true;}
 return false;
}
function configured(){return Boolean(SUPABASE_URL&&SUPABASE_ANON_KEY&&SUPABASE_SERVICE_ROLE_KEY);}
function json(res,status,body){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));}
function bodyOf(req){if(req.body&&typeof req.body==="object")return req.body;try{return JSON.parse(req.body||"{}");}catch(_){return{};}}
async function supa(path,options={}){const service=options.service!==false,key=service?SUPABASE_SERVICE_ROLE_KEY:SUPABASE_ANON_KEY;const headers={apikey:key,Authorization:"Bearer "+(options.token||key),"Content-Type":"application/json",...(options.headers||{})};const response=await fetch(SUPABASE_URL+path,{method:options.method||"GET",headers,body:options.body===undefined?undefined:JSON.stringify(options.body)});const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch(_){data=text;}if(!response.ok){const e=new Error(data?.msg||data?.message||data?.error_description||data?.error||"Supabase request failed.");e.status=response.status;e.details=data;throw e;}return data;}
function bearer(req){const m=String(req.headers.authorization||"").match(/^Bearer\s+(.+)$/i);return m?m[1]:"";}
async function requireUser(req){const token=bearer(req);if(!token){const e=new Error("Sign in to continue.");e.status=401;throw e;}const user=await supa("/auth/v1/user",{service:false,token});if(!user?.id||!user?.email){const e=new Error("Your session has expired. Please sign in again.");e.status=401;throw e;}return{user,token,isAdmin:String(user.email).toLowerCase()===ADMIN_EMAIL};}
async function db(path,options={}){return supa("/rest/v1/"+path,{...options,service:true,headers:{Prefer:options.prefer||"return=representation",...(options.headers||{})}});}
async function ensureProfile(user){await db("profiles?on_conflict=id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{id:user.id,email:user.email,phone:user.user_metadata?.phone||null,updated_at:new Date().toISOString()}});}
function planInfo(plan){const prices={daily:5000,weekly:WEEKLY_PRICE_UGX,monthly:25000},days={daily:1,weekly:7,monthly:30};if(!Object.prototype.hasOwnProperty.call(prices,plan))return null;return{plan,amount_ugx:prices[plan],duration_days:days[plan],available:Number.isFinite(prices[plan])&&prices[plan]>0};}
async function subscriptionFor(userId){const rows=await db("subscriptions?user_id=eq."+encodeURIComponent(userId)+"&select=*");const row=Array.isArray(rows)?rows[0]:null;if(row&&row.status==="active"&&row.expires_at&&new Date(row.expires_at).getTime()>Date.now())return row;return{user_id:userId,plan:"free",status:"active",starts_at:null,expires_at:null,custom_templates_enabled:false,custom_watermark_enabled:false};}
async function usageFor(userId){const now=new Date(),monthKey=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString().slice(0,10);const rows=await db("monthly_usage?user_id=eq."+encodeURIComponent(userId)+"&month_key=eq."+monthKey+"&select=*");return{month_key:monthKey,batch_actions:Array.isArray(rows)&&rows[0]?Number(rows[0].batch_actions||0):0};}
function publicStatus(user,isAdmin,subscription,usage){const paid=isAdmin||(subscription.plan!=="free"&&subscription.status==="active"&&new Date(subscription.expires_at).getTime()>Date.now());return{user:{id:user.id,email:user.email,phone:user.user_metadata?.phone||null},is_admin:isAdmin,subscription,usage:{...usage,monthly_free_limit:2,remaining:paid?null:Math.max(0,2-usage.batch_actions)},features:{batch_allowed:paid||usage.batch_actions<2,custom_templates:paid&&(isAdmin||subscription.custom_templates_enabled!==false),custom_watermark:paid&&(isAdmin||subscription.custom_watermark_enabled!==false),watermark_mandatory:!paid},pricing:{daily:5000,weekly:WEEKLY_PRICE_UGX,monthly:25000,currency:"UGX"},payment:{phone:PAYMENT_PHONE,recipient:PAYMENT_RECIPIENT}};}
function errorResponse(res,error){const status=Number(error.status)||500;if(status>=500)console.error("Joes Studio monetization error:",error.details||error.message);json(res,status,{error:status>=500?"The service could not complete the request. Please try again or contact the administrator.":error.message});}
module.exports={handleCors,ADMIN_EMAIL,PAYMENT_PHONE,PAYMENT_RECIPIENT,WEEKLY_PRICE_UGX,configured,json,bodyOf,supa,db,requireUser,ensureProfile,planInfo,subscriptionFor,usageFor,publicStatus,errorResponse};
