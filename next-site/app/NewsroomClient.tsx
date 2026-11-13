"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase, type NewsArticle } from "@/lib/supabase";

type Profile = { id: string; email: string | null; role: string };
type Factor = { id: string; status: string };
const editorRoles = ["super_admin", "chief_editor", "news_editor"];
const authorRoles = ["reporter", "writer", "guest"];
const roleLabels: Record<string,string> = { super_admin:"सुपर एडमिन", chief_editor:"मुख्य संपादक", news_editor:"समाचार संपादक", reporter:"न्यूज़ रिपोर्टर", writer:"लेखक", guest:"योगदानकर्ता", subscriber:"पाठक" };
const statusLabels: Record<string,string> = { draft:"ड्राफ़्ट", review:"समीक्षा बाकी", published:"प्रकाशित", rejected:"वापस भेजी" };
const categories = ["देश","दुनिया","कारोबार","खेल","टेक्नोलॉजी","मनोरंजन"];

export default function NewsroomClient() {
  const [mode,setMode] = useState<"login"|"mfa"|"recovery"|"app">("login");
  const [email,setEmail] = useState(""); const [password,setPassword] = useState("");
  const [newPassword,setNewPassword] = useState(""); const [confirmPassword,setConfirmPassword] = useState("");
  const [code,setCode] = useState(""); const [factorId,setFactorId] = useState(""); const [challengeId,setChallengeId] = useState("");
  const [qr,setQr] = useState(""); const [secret,setSecret] = useState("");
  const [profile,setProfile] = useState<Profile|null>(null); const [articles,setArticles] = useState<NewsArticle[]>([]);
  const [filter,setFilter] = useState("all"); const [notice,setNotice] = useState(""); const [error,setError] = useState(false); const [busy,setBusy] = useState(false);
  const [articleId,setArticleId] = useState(""); const [title,setTitle] = useState(""); const [category,setCategory] = useState("देश"); const [imageUrl,setImageUrl] = useState(""); const [summary,setSummary] = useState(""); const [body,setBody] = useState("");

  const say=(message:string,isError=false)=>{setNotice(message);setError(isError);};
  const isEditor=!!profile && editorRoles.includes(profile.role);
  const ownDrafts=useMemo(()=>articles.filter(a=>a.status==="draft"&&a.author_id===profile?.id).length,[articles,profile]);
  async function loadArticles(){ if(!supabase)return; const {data,error}=await supabase.from("articles").select("id,title,category,summary,body,image_url,created_at,updated_at,status,author_id").order("updated_at",{ascending:false}); if(error){say("खबरें लोड नहीं हुईं। डेटाबेस/RLS सेटअप जाँचें।",true);return;} setArticles((data??[]) as NewsArticle[]); }
  async function loadProfile(user:{id:string;email?:string}){
    if(!supabase)return;
    const {data:aal}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal?.currentLevel!=="aal2"){await supabase.auth.signOut();setMode("login");say("डैशबोर्ड खोलने से पहले OTP सत्यापन ज़रूरी है।",true);return;}
    const {data,error}=await supabase.from("profiles").select("id,email,role").eq("id",user.id).single();
    if(error||!data){await supabase.auth.signOut();setMode("login");say("न्यूज़रूम प्रोफ़ाइल नहीं मिली। एडमिन से संपर्क करें।",true);return;}
    setProfile(data as Profile);setMode("app");say("न्यूज़रूम लोड हो गया।");await loadArticles();
  }
  useEffect(()=>{ if(!supabase){say("Supabase कॉन्फ़िगरेशन उपलब्ध नहीं है।",true);return;}
    let alive=true;
    supabase.auth.getSession().then(async({data})=>{if(!alive||!data.session)return;const {data:aal}=await supabase!.auth.mfa.getAuthenticatorAssuranceLevel();if(aal?.currentLevel==="aal2")await loadProfile(data.session.user);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{if(event==="PASSWORD_RECOVERY"){setMode("recovery");say("रीसेट लिंक सत्यापित है। नया पासवर्ड सेट करें।");}else if(event==="SIGNED_OUT"){setProfile(null);setMode("login");}});
    return()=>{alive=false;subscription.unsubscribe();};
  },[]);
  async function signIn(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);say("लॉगिन सत्यापित हो रहा है…");try{const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;
    const {data:factors,error:factorError}=await supabase.auth.mfa.listFactors();if(factorError)throw factorError;
    const verified=(factors.totp as Factor[]).find(f=>f.status==="verified");
    if(verified){setFactorId(verified.id);const {data:ch,error:chError}=await supabase.auth.mfa.challenge({factorId:verified.id});if(chError)throw chError;setChallengeId(ch.id);setMode("mfa");say("अपने authenticator ऐप का नया 6-अंकों का कोड डालें।");}
    else{const {data:enroll,error:enrollError}=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"Jan Dhun News Authenticator"});if(enrollError)throw enrollError;setFactorId(enroll.id);setQr(enroll.totp.qr_code);setSecret(enroll.totp.secret);setChallengeId("");setMode("mfa");say("पहली बार: QR स्कैन करें या secret key डालें, फिर OTP दर्ज करें।");}
  }catch{await supabase.auth.signOut();say("लॉगिन नहीं हुआ। ईमेल/पासवर्ड जाँचें या एडमिन से संपर्क करें।",true);}finally{setBusy(false);}}
  async function verifyMfa(e:FormEvent){e.preventDefault();if(!supabase||!factorId)return;setBusy(true);try{let challenge=challengeId;if(!challenge){const {data,error}=await supabase.auth.mfa.challenge({factorId});if(error)throw error;challenge=data.id;}const {error}=await supabase.auth.mfa.verify({factorId,challengeId:challenge,code:code.trim()});if(error)throw error;const {data:session}=await supabase.auth.getSession();if(session.session)await loadProfile(session.session.user);else throw new Error("No session");}catch{setChallengeId("");setCode("");say("OTP सही नहीं है या समय समाप्त हो गया। नया 6-अंकों का कोड डालें।",true);}finally{setBusy(false);}}
  async function requestReset(){if(!supabase)return;if(!email.trim()){say("पहले ईमेल भरें।",true);return;}setBusy(true);const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.href.split("#")[0]});setBusy(false);say(error?"रीसेट ईमेल नहीं भेजा जा सका। Supabase Redirect URLs जाँचें।":"यदि इस ईमेल पर खाता है, तो रीसेट लिंक भेज दिया गया है। इनबॉक्स/स्पैम देखें।",!!error);}
  async function updatePassword(e:FormEvent){e.preventDefault();if(!supabase)return;if(newPassword.length<10||newPassword!==confirmPassword){say(newPassword.length<10?"पासवर्ड कम से कम 10 अक्षरों का होना चाहिए।":"दोनों पासवर्ड मेल नहीं खाते।",true);return;}setBusy(true);const {error}=await supabase.auth.updateUser({password:newPassword});if(!error)await supabase.auth.signOut();setBusy(false);setMode("login");setPassword("");say(error?"पासवर्ड अपडेट नहीं हुआ। नया रीसेट लिंक मँगाएँ।":"पासवर्ड बदल गया। अब नए पासवर्ड और OTP से लॉगिन करें।",!!error);}
  async function logout(){if(supabase)await supabase.auth.signOut();setProfile(null);setArticles([]);setMode("login");setPassword("");say("आप लॉगआउट हो गए।");}
  function clearForm(){setArticleId("");setTitle("");setCategory("देश");setImageUrl("");setSummary("");setBody("");}
  function editArticle(a:NewsArticle){setArticleId(a.id);setTitle(a.title);setCategory(a.category);setImageUrl(a.image_url??"");setSummary(a.summary);setBody(a.body);window.scrollTo({top:0,behavior:"smooth"});}
  async function saveArticle(status:"draft"|"review"){if(!supabase||!profile||!title.trim()||!summary.trim()||!body.trim()){say("हेडलाइन, विवरण और पूरी खबर भरें।",true);return;}setBusy(true);const payload={title:title.trim(),category,image_url:imageUrl.trim()||null,summary:summary.trim(),body:body.trim(),status};const result=articleId?await supabase.from("articles").update(payload).eq("id",articleId):await supabase.from("articles").insert({...payload,author_id:profile.id});setBusy(false);if(result.error){say("लेख सेव नहीं हुआ। आपकी भूमिका या डेटाबेस अनुमति इसकी अनुमति नहीं देती।",true);return;}clearForm();say("लेख सेव हो गया।");await loadArticles();}
  async function action(a:NewsArticle,kind:"approve"|"reject"|"publish"|"delete"){if(!supabase)return;if(kind==="delete"&&!window.confirm("क्या यह खबर स्थायी रूप से हटानी है?"))return;setBusy(true);const result=kind==="delete"?await supabase.from("articles").delete().eq("id",a.id):await supabase.from("articles").update({status:kind==="approve"?"draft":kind==="reject"?"rejected":"published"}).eq("id",a.id);setBusy(false);if(result.error){say("कार्रवाई पूरी नहीं हुई। सर्वर ने अनुमति नहीं दी।",true);return;}say("कार्रवाई सफल।");await loadArticles();}
  const visible=articles.filter(a=>filter==="all"||a.status===filter);
  return <main className="newsroom-page">
    <div className="newsroom-top"><a href="../">← जनधुन न्यूज़</a><span>सुरक्षित संपादकीय डेस्क</span></div>
    {mode!=="app"?<section className="newsroom-auth">
      <p className="eyebrow">जनधुन न्यूज़ · न्यूज़रूम</p><h1>{mode==="recovery"?"नया पासवर्ड सेट करें":mode==="mfa"?"दो-स्तरीय सत्यापन":"न्यूज़रूम लॉगिन"}</h1>
      {mode==="login"? <><p>अपने अधिकृत खाते से लॉगिन करें। पासवर्ड के बाद authenticator OTP आवश्यक है।</p><form onSubmit={signIn} className="newsroom-form"><label>ईमेल<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="अपना ईमेल"/></label><label>पासवर्ड<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="अपना पासवर्ड"/></label><button disabled={busy}>{busy?"कृपया प्रतीक्षा करें":"लॉगिन करें"}</button></form><button className="link-button" disabled={busy} onClick={requestReset}>पासवर्ड भूल गए?</button></>:null}
      {mode==="mfa"?<><p>{notice}</p>{qr?<div className="mfa-setup"><img src={qr} alt="Authenticator QR code"/><p>QR स्कैन नहीं हो रहा? Secret key:</p><code>{secret}</code></div>:null}<form className="newsroom-form" onSubmit={verifyMfa}><label>6-अंकों का OTP<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)}/></label><button disabled={busy}>{busy?"जाँच हो रही है…":"OTP सत्यापित करें"}</button></form><button className="link-button" onClick={logout}>लॉगिन रद्द करें</button></>:null}
      {mode==="recovery"?<form className="newsroom-form" onSubmit={updatePassword}><p>{notice}</p><label>नया पासवर्ड<input type="password" minLength={10} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><label>पासवर्ड दोबारा<input type="password" minLength={10} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label><button disabled={busy}>पासवर्ड अपडेट करें</button></form>:null}
      {notice&&mode!=="recovery"?<p className={error?"notice error":"notice"} role="status">{notice}</p>:null}
      <small>नया खाता बनाने के लिए न्यूज़रूम एडमिन से आमंत्रण लें।</small>
    </section>:<section className="newsroom-dashboard">
      <header className="dashboard-heading"><div><p className="eyebrow">जनधुन न्यूज़ · कंटेंट डेस्क</p><h1>न्यूज़रूम डैशबोर्ड</h1><p>{roleLabels[profile?.role??""]??"उपयोगकर्ता"} · {profile?.email}</p></div><button className="secondary-action" onClick={logout}>लॉगआउट</button></header>
      {notice?<p className={error?"notice error":"notice"}>{notice}</p>:null}
      <div className="newsroom-stats"><div><strong>{articles.length}</strong><span>कुल खबरें</span></div><div><strong>{articles.filter(a=>a.status==="review").length}</strong><span>समीक्षा बाकी</span></div><div><strong>{articles.filter(a=>a.status==="published").length}</strong><span>प्रकाशित</span></div><div><strong>{ownDrafts}</strong><span>मेरे ड्राफ़्ट</span></div></div>
      {profile&&[...editorRoles,...authorRoles].includes(profile.role)?<div className="newsroom-workspace"><section className="newsroom-panel"><p className="eyebrow">कंटेंट बनाएं</p><h2>{articleId?"खबर संपादित करें":"नई खबर लिखें"}</h2><form className="newsroom-form" onSubmit={e=>{e.preventDefault();void saveArticle("review");}}><label>हेडलाइन<input maxLength={140} required value={title} onChange={e=>setTitle(e.target.value)}/></label><div className="form-two"><label>श्रेणी<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>तस्वीर का URL<input type="url" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://…"/></label></div><label>संक्षिप्त विवरण<textarea rows={3} maxLength={300} required value={summary} onChange={e=>setSummary(e.target.value)}/></label><label>पूरी खबर<textarea rows={8} required value={body} onChange={e=>setBody(e.target.value)}/></label><div className="form-buttons"><button type="button" className="secondary-action" onClick={clearForm}>साफ़ करें</button><button type="button" className="secondary-action" disabled={busy} onClick={()=>void saveArticle("draft")}>ड्राफ़्ट सेव करें</button><button disabled={busy}>समीक्षा के लिए भेजें</button></div></form></section>
      <section className="newsroom-panel"><div className="list-head"><div><p className="eyebrow">संपादकीय सूची</p><h2>खबरें</h2></div><select aria-label="स्थिति फ़िल्टर" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">सभी</option>{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div><div className="newsroom-articles">{visible.map(a=><article key={a.id}><div className="article-title"><h3>{a.title}</h3><span className={"status-pill "+a.status}>{statusLabels[a.status]??a.status}</span></div><p>{a.summary}</p><small>{a.category} · {a.author_id===profile?.id?"मेरी खबर":"न्यूज़रूम"}</small><div className="article-actions">{((isEditor||a.author_id===profile?.id)&&a.status!=="published"&&(isEditor||["draft","rejected"].includes(a.status)))?<button onClick={()=>editArticle(a)}>संपादित करें</button>:null}{isEditor&&a.status==="review"?<><button onClick={()=>void action(a,"approve")}>स्वीकारें</button><button onClick={()=>void action(a,"reject")}>वापस भेजें</button><button onClick={()=>void action(a,"publish")}>प्रकाशित करें</button></>:null}{isEditor&&a.status!=="published"&&a.status!=="review"?<button onClick={()=>void action(a,"publish")}>प्रकाशित करें</button>:null}{profile?.role==="super_admin"?<button className="danger-action" onClick={()=>void action(a,"delete")}>हटाएं</button>:null}</div></article>)}{visible.length===0?<p className="empty-state">इस सूची में अभी कोई खबर नहीं है।</p>:null}</div></section></div>:<p className="notice">इस खाते को न्यूज़रूम लेखन की अनुमति नहीं है।</p>}
    </section>}
  </main>;
}
