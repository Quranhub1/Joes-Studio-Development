const L=require("./_lib");
module.exports=async function(req,res){
 if(L.handleCors(req,res))return;
 const action=String(req.query?.action||L.bodyOf(req).action||"");
 if(req.method!=="POST"&&!(req.method==="GET"&&action==="me"))return L.json(res,405,{error:"Method not allowed."});
 if(!L.configured())return L.json(res,503,{error:"Authentication is not configured yet. Add the Supabase environment variables to the development deployment."});
 try{
  if(action==="reset_password"){
   if(req.method!=="POST")return L.json(res,405,{error:"Method not allowed."});
   const b=L.bodyOf(req),email=String(b.email||"").trim().toLowerCase();
   if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))return L.json(res,400,{error:"Enter a valid email address."});
   await L.supa("/auth/v1/recover",{service:false,method:"POST",body:{email}});
   return L.json(res,200,{message:"If an account exists for that email, a password-reset link has been sent."});
  }
  if(action==="signup"){
   if(req.method!=="POST")return L.json(res,405,{error:"Method not allowed."});
   const b=L.bodyOf(req),email=String(b.email||"").trim().toLowerCase(),phone=String(b.phone||"").trim(),password=String(b.password||""),fullName=String(b.full_name||"").trim();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return L.json(res,400,{error:"Enter a valid email address."});
   if(!/^\+?[0-9\s()-]{9,20}$/.test(phone))return L.json(res,400,{error:"Enter a valid phone number, including country code if possible."});
   if(password.length<8)return L.json(res,400,{error:"Use a password with at least 8 characters."});
   const result=await L.supa("/auth/v1/signup",{service:false,method:"POST",body:{email,password,data:{phone,full_name:fullName}}});
   return L.json(res,200,{user:result.user||result,session:result.session||null,message:result.session?"Account created. You are signed in.":"Account created. Check your email to verify it, then sign in."});
  }
  if(action==="login"){
   if(req.method!=="POST")return L.json(res,405,{error:"Method not allowed."});
   const b=L.bodyOf(req),result=await L.supa("/auth/v1/token?grant_type=password",{service:false,method:"POST",body:{email:String(b.email||"").trim().toLowerCase(),password:String(b.password||"")}});
   if(!result.access_token||!result.user)return L.json(res,401,{error:"Sign-in failed."});
   return L.json(res,200,{session:{access_token:result.access_token,refresh_token:result.refresh_token,expires_at:result.expires_at,token_type:result.token_type},user:{id:result.user.id,email:result.user.email,phone:result.user.user_metadata?.phone||null}});
  }
  if(action==="me"){if(req.method!=="GET")return L.json(res,405,{error:"Method not allowed."});const{user,isAdmin}=await L.requireUser(req);await L.ensureProfile(user);const[s,u]=await Promise.all([L.subscriptionFor(user.id),L.usageFor(user.id)]);return L.json(res,200,L.publicStatus(user,isAdmin,s,u));}
  return L.json(res,400,{error:"Unknown authentication action."});
 }catch(error){return L.errorResponse(res,error);}
};
