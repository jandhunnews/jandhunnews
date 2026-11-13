const CONFIG = window.JANDHUN_SUPABASE || {};
const publicKey = typeof CONFIG.anonKey === 'string' ? CONFIG.anonKey.trim() : '';
const isPublicSupabaseKey = publicKey.startsWith('sb_publishable_')
  || /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(publicKey);
const isConfigured = typeof window.supabase !== 'undefined'
  && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.url || '')
  && isPublicSupabaseKey;
const setupNotice = document.getElementById('setupNotice');
const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const authMessage = document.getElementById('authMessage');
const loginForm = document.getElementById('loginForm');
const mfaPanel = document.getElementById('mfaPanel');
const recoveryPanel = document.getElementById('passwordRecoveryPanel');
let client;
let sessionUser;
let profile;
let articles = [];
let mfaFactorId = null;
let mfaChallengeId = null;

const roleLabels = { super_admin:'सुपर एडमिन', chief_editor:'मुख्य संपादक', news_editor:'समाचार संपादक', reporter:'न्यूज़ रिपोर्टर', writer:'लेखक', guest:'योगदानकर्ता / अतिथि', subscriber:'सब्सक्राइबर / पाठक' };
const editorRoles = ['super_admin','chief_editor','news_editor'];
const authorRoles = ['reporter','writer','guest'];

if (!isConfigured) {
  setupNotice.hidden = false;
  loginForm.querySelector('button[type="submit"]').disabled = true;
  authMessage.textContent = 'लॉगिन चालू करने के लिए पहले Supabase कॉन्फ़िगरेशन पूरा करें।';
} else {
  // No persisted browser session: a fresh password + authenticator code is required on each page visit.
  client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  loginForm.addEventListener('submit', signIn);
  document.getElementById('resetPassword').addEventListener('click', resetPassword);
  document.getElementById('passwordRecoveryForm').addEventListener('submit', updateRecoveredPassword);
  document.getElementById('cancelMfa').addEventListener('click', cancelMfa);
  document.getElementById('logoutButton').addEventListener('click', signOut);
  document.getElementById('statusFilter').addEventListener('change', renderArticles);
  document.getElementById('articleForm').addEventListener('submit', submitForReview);
  document.getElementById('saveDraft').addEventListener('click', saveDraft);
  document.getElementById('resetForm').addEventListener('click', clearForm);
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      loginForm.hidden = true;
      mfaPanel.hidden = true;
      recoveryPanel.hidden = false;
      document.getElementById('recoveryMessage').textContent = 'रीसेट लिंक सत्यापित है। नया पासवर्ड सेट करें।';
    } else if (event === 'SIGNED_OUT' || !session) showSignedOut();
  });
}
function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle('error', isError);
}
function showMfaPanel(title, instructions, qrCode = '', secret = '') {
  loginForm.hidden = true;
  mfaPanel.hidden = false;
  document.getElementById('mfaTitle').textContent = title;
  document.getElementById('mfaInstructions').textContent = instructions;
  const qr = document.getElementById('mfaQr');
  qr.hidden = !qrCode;
  if (qrCode) qr.src = qrCode;
  const secretWrap = document.getElementById('mfaSecretWrap');
  secretWrap.hidden = !secret;
  document.getElementById('mfaSecret').textContent = secret;
  document.getElementById('mfaCode').value = '';
  document.getElementById('mfaCode').focus();
}
function resetMfaPanel() {
  mfaPanel.hidden = true;
  loginForm.hidden = false;
  document.getElementById('mfaQr').removeAttribute('src');
  document.getElementById('mfaQr').hidden = true;
  document.getElementById('mfaSecretWrap').hidden = true;
  mfaFactorId = null;
  mfaChallengeId = null;
}
async function signIn(event) {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  showMessage('पासवर्ड सत्यापित किया जा रहा है…');
  try {
    const { data, error } = await client.auth.signInWithPassword({ email:document.getElementById('email').value.trim(), password:document.getElementById('password').value });
    if (error) throw error;
    sessionUser = data.user;
    await beginMfa();
  } catch (error) {
    await client.auth.signOut();
    resetMfaPanel();
    showMessage('लॉगिन नहीं हो सका। ईमेल/पासवर्ड जाँचें या एडमिन से संपर्क करें।', true);
  } finally { button.disabled = false; }
}
async function beginMfa() {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw error;
  const verified = (data.totp || []).find((factor) => factor.status === 'verified');
  if (verified) {
    mfaFactorId = verified.id;
    const { data:challenge, error:challengeError } = await client.auth.mfa.challenge({ factorId:mfaFactorId });
    if (challengeError) throw challengeError;
    mfaChallengeId = challenge.id;
    showMfaPanel('लॉगिन कोड डालें','अपने ऑथेंटिकेटर ऐप में जनधुन न्यूज़ खाते का वर्तमान 6-अंकों का कोड डालें।');
    return;
  }
  const { data:enrollment, error:enrollError } = await client.auth.mfa.enroll({ factorType:'totp', friendlyName:'Jan Dhun News Authenticator' });
  if (enrollError) throw enrollError;
  mfaFactorId = enrollment.id;
  showMfaPanel('ऑथेंटिकेटर सेटअप करें','पहली बार लॉगिन: QR को Google/Microsoft Authenticator जैसे ऐप से स्कैन करें। फिर ऐप का 6-अंकों का कोड डालें।',enrollment.totp.qr_code,enrollment.totp.secret);
}
async function verifyMfa(event) {
  event.preventDefault();
  if (!mfaFactorId) return;
  const button = document.getElementById('verifyMfa');
  button.disabled = true;
  showMessage('एक बार उपयोग होने वाला कोड जाँचा जा रहा है…');
  try {
    if (!mfaChallengeId) {
      const { data, error } = await client.auth.mfa.challenge({ factorId:mfaFactorId });
      if (error) throw error;
      mfaChallengeId = data.id;
    }
    const { error } = await client.auth.mfa.verify({ factorId:mfaFactorId, challengeId:mfaChallengeId, code:document.getElementById('mfaCode').value.trim() });
    if (error) throw error;
    const { data:assurance, error:assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance.currentLevel !== 'aal2') throw new Error('MFA verification required');
    resetMfaPanel();
    showMessage('सत्यापन सफल। डैशबोर्ड लोड हो रहा है…');
    await loadAccount(sessionUser);
  } catch (_) {
    mfaChallengeId = null;
    showMessage('कोड सही नहीं है या समय समाप्त हो गया। ऐप का नया 6-अंकों का कोड डालें।', true);
    document.getElementById('mfaCode').value = '';
    document.getElementById('mfaCode').focus();
  } finally { button.disabled = false; }
}
document.getElementById('mfaForm').addEventListener('submit', verifyMfa);
async function cancelMfa() {
  await client.auth.signOut();
  resetMfaPanel();
  loginForm.reset();
  showMessage('लॉगिन रद्द कर दिया गया।');
}
async function resetPassword() {
  const email = document.getElementById('email').value.trim();
  if (!email) { showMessage('पहले अपना ईमेल भरें, फिर “पासवर्ड भूल गए?” दबाएं।', true); document.getElementById('email').focus(); return; }
  const button = document.getElementById('resetPassword'); button.disabled = true;
  try {
    const { error } = await client.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}${location.pathname}`});
    if (error) throw error;
    showMessage('यदि इस ईमेल पर खाता है, तो पासवर्ड रीसेट लिंक भेज दिया गया है। अपना ईमेल इनबॉक्स और स्पैम फ़ोल्डर देखें।');
  } catch (_) { showMessage('रीसेट ईमेल नहीं भेजा जा सका। Supabase Auth की Redirect URLs और ईमेल सेटिंग जाँचें।',true); }
  finally { button.disabled = false; }
}
async function updateRecoveredPassword(event) {
  event.preventDefault();
  const password = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmNewPassword').value;
  const message = document.getElementById('recoveryMessage');
  if (password.length < 10) { message.textContent = 'पासवर्ड कम से कम 10 अक्षरों का होना चाहिए।'; return; }
  if (password !== confirm) { message.textContent = 'दोनों पासवर्ड मेल नहीं खाते।'; return; }
  const button = document.querySelector('#passwordRecoveryForm button[type="submit"]'); button.disabled = true;
  message.textContent = 'पासवर्ड अपडेट हो रहा है…';
  try {
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
    await client.auth.signOut();
    recoveryPanel.hidden = true; loginForm.hidden = false; loginForm.reset();
    message.textContent = 'पासवर्ड सफलतापूर्वक बदल गया। अब नए पासवर्ड से लॉगिन करें और अपना OTP डालें।';
    showMessage(message.textContent);
  } catch (_) { message.textContent = 'पासवर्ड अपडेट नहीं हुआ। ईमेल का नया रीसेट लिंक मँगाएँ और फिर प्रयास करें।'; }
  finally { button.disabled = false; }
}
async function signOut() { await client.auth.signOut(); showSignedOut(); }
function showSignedOut() {
  if (recoveryPanel) recoveryPanel.hidden = true;
  sessionUser=null; profile=null; articles=[];
  if (appView) appView.hidden=true;
  if (loginView) loginView.hidden=false;
}
async function loadAccount(user) {
  const { data:assurance,error:assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || assurance.currentLevel !== 'aal2') { await client.auth.signOut(); showMessage('डैशबोर्ड खोलने से पहले OTP सत्यापन आवश्यक है।',true); return; }
  sessionUser=user;
  const { data,error } = await client.from('profiles').select('id,email,role').eq('id',user.id).single();
  if (error || !data) { await client.auth.signOut(); showMessage('आपकी न्यूज़रूम प्रोफ़ाइल नहीं मिली। एडमिन से खाता सक्रिय करवाएं।',true); return; }
  profile=data; loginView.hidden=true; appView.hidden=false;
  document.getElementById('userSummary').textContent=`${roleLabels[profile.role]||'उपयोगकर्ता'} · ${profile.email||user.email}`;
  const canCreate=authorRoles.includes(profile.role)||editorRoles.includes(profile.role);
  document.getElementById('editorPanel').hidden=!canCreate;
  document.getElementById('formHint').textContent=profile.role==='guest'?'योगदानकर्ता केवल ड्राफ़्ट सुरक्षित कर सकते हैं।':'आपके अधिकार सर्वर पर लागू हैं; भूमिका के बाहर की कार्रवाई अस्वीकार होगी।';
  document.getElementById('submitArticle').hidden=profile.role==='guest';
  document.getElementById('saveDraft').hidden=!canCreate;
  await loadArticles();
}
async function loadArticles() {
  const message=document.getElementById('listMessage'); message.textContent='खबरें लोड हो रही हैं…';
  const {data,error}=await client.from('articles').select('id,title,category,summary,body,image_url,status,author_id,created_at,updated_at').order('updated_at',{ascending:false});
  if(error){message.textContent='खबरें लोड नहीं हुईं। डेटाबेस और RLS सेटअप जाँचें।';articles=[];renderArticles();return;}
  articles=data||[];message.textContent='';renderArticles();
}
function statusText(status){return({draft:'ड्राफ़्ट',review:'समीक्षा बाकी',published:'प्रकाशित',rejected:'वापस भेजी'})[status]||status;}
function renderArticles(){
  if(!profile||!sessionUser)return;
  const filter=document.getElementById('statusFilter').value;const isEditor=editorRoles.includes(profile.role);
  const own=articles.filter((item)=>item.author_id===sessionUser.id);const visible=articles.filter((item)=>filter==='all'||item.status===filter);
  document.getElementById('statTotal').textContent=articles.length;document.getElementById('statReview').textContent=articles.filter((item)=>item.status==='review').length;
  document.getElementById('statPublished').textContent=articles.filter((item)=>item.status==='published').length;document.getElementById('statDraft').textContent=own.filter((item)=>item.status==='draft').length;
  const list=document.getElementById('articlesList');list.replaceChildren();
  if(!visible.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='इस सूची में अभी खबर नहीं है।';list.appendChild(empty);return;}
  visible.forEach((article)=>{
    const card=document.createElement('article');card.className='article-card';const top=document.createElement('div');top.className='article-top';
    const title=document.createElement('h3');title.textContent=article.title;const badge=document.createElement('span');badge.className=`status ${article.status}`;badge.textContent=statusText(article.status);top.append(title,badge);
    const summary=document.createElement('p');summary.textContent=article.summary;const meta=document.createElement('div');meta.className='article-meta';
    [article.category,article.author_id===sessionUser.id?'मेरी खबर':'न्यूज़रूम',new Intl.DateTimeFormat('hi-IN',{dateStyle:'medium'}).format(new Date(article.updated_at))].forEach((value)=>{const span=document.createElement('span');span.textContent=value;meta.appendChild(span);});
    const actions=document.createElement('div');actions.className='article-actions';const add=(label,action,style='')=>{const button=document.createElement('button');button.type='button';button.textContent=label;if(style)button.className=style;button.addEventListener('click',()=>articleAction(action,article));actions.appendChild(button);};
    const owner=article.author_id===sessionUser.id;
    if((isEditor||owner)&&article.status!=='published'&&(isEditor||['draft','rejected'].includes(article.status)))add('संपादित करें','edit');
    if(isEditor&&article.status==='review'){add('स्वीकारें','approve');add('वापस भेजें','reject','danger');add('प्रकाशित करें','publish');}
    if(isEditor&&article.status!=='published'&&article.status!=='review')add('प्रकाशित करें','publish');
    if(isEditor&&profile.role==='super_admin')add('हटाएं','delete','danger');
    card.append(top,summary,meta);if(actions.children.length)card.append(actions);list.appendChild(card);
  });
}
async function articleAction(action,article){
  if(action==='edit'){fillForm(article);return;}
  if(action==='delete'&&!window.confirm('क्या आप यह खबर स्थायी रूप से हटाना चाहते हैं?'))return;
  const changes={approve:{status:'draft'},reject:{status:'rejected'},publish:{status:'published'}};
  const result=action==='delete'?await client.from('articles').delete().eq('id',article.id):await client.from('articles').update(changes[action]).eq('id',article.id);
  if(result.error){window.alert('कार्रवाई पूरी नहीं हुई। सर्वर ने अनुमति नहीं दी।');return;}await loadArticles();
}
function fillForm(article){document.getElementById('articleId').value=article.id;document.getElementById('headline').value=article.title;document.getElementById('category').value=article.category;document.getElementById('imageUrl').value=article.image_url||'';document.getElementById('summary').value=article.summary;document.getElementById('bodyText').value=article.body;document.getElementById('formTitle').textContent='खबर संपादित करें';document.getElementById('editorPanel').scrollIntoView({behavior:'smooth'});}
function clearForm(){document.getElementById('articleForm').reset();document.getElementById('articleId').value='';document.getElementById('formTitle').textContent='नई खबर लिखें';}
async function saveArticle(status){
  const form=document.getElementById('articleForm');if(!form.reportValidity())return;
  const id=document.getElementById('articleId').value;
  const payload={title:document.getElementById('headline').value.trim(),category:document.getElementById('category').value,image_url:document.getElementById('imageUrl').value.trim()||null,summary:document.getElementById('summary').value.trim(),body:document.getElementById('bodyText').value.trim(),status};
  const result=id?await client.from('articles').update(payload).eq('id',id).select('id').single():await client.from('articles').insert({...payload,author_id:sessionUser.id}).select('id').single();
  if(result.error){window.alert('लेख सहेजा नहीं गया। सर्वर ने अनुमति नहीं दी या कनेक्शन में समस्या हुई।');return;}clearForm();await loadArticles();
}
async function saveDraft(){await saveArticle('draft');}
async function submitForReview(event){event.preventDefault();await saveArticle('review');}
