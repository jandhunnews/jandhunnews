const CONFIG = window.JANDHUN_SUPABASE || {};
const isConfigured = typeof window.supabase !== 'undefined'
  && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.url || '')
  && CONFIG.anonKey && !CONFIG.anonKey.includes('YOUR_');
const setupNotice = document.getElementById('setupNotice');
const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const authMessage = document.getElementById('authMessage');
const loginForm = document.getElementById('loginForm');
let client;
let sessionUser;
let profile;
let articles = [];

const roleLabels = {
  super_admin: 'सुपर एडमिन', chief_editor: 'मुख्य संपादक', news_editor: 'समाचार संपादक',
  reporter: 'न्यूज़ रिपोर्टर', writer: 'लेखक', guest: 'योगदानकर्ता / अतिथि', subscriber: 'सब्सक्राइबर / पाठक'
};
const roleDescriptions = {
  super_admin: 'सभी लेखों और न्यूज़रूम सेटिंग पर पूरा नियंत्रण।',
  chief_editor: 'सभी लेखों की समीक्षा, संपादन, अस्वीकृति और प्रकाशन।',
  news_editor: 'संपादकीय समीक्षा और खबरों का प्रकाशन।',
  reporter: 'अपने लेख बनाएं और समीक्षा के लिए भेजें; सीधे प्रकाशित नहीं कर सकते।',
  writer: 'अपने ड्राफ़्ट बनाएं और समीक्षा के लिए भेजें; सीधे प्रकाशित नहीं कर सकते।',
  guest: 'सीमित ड्राफ़्ट बना और सुरक्षित कर सकते हैं।',
  subscriber: 'पाठक खाता; CMS में लेख बनाने की अनुमति नहीं।'
};
const editorRoles = ['super_admin', 'chief_editor', 'news_editor'];
const authorRoles = ['reporter', 'writer', 'guest'];

if (!isConfigured) {
  setupNotice.hidden = false;
  loginForm.querySelector('button[type="submit"]').disabled = true;
  authMessage.textContent = 'लॉगिन चालू करने के लिए पहले Supabase कॉन्फ़िगरेशन पूरा करें।';
} else {
  client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });
  loginForm.addEventListener('submit', signIn);
  document.getElementById('resetPassword').addEventListener('click', resetPassword);
  document.getElementById('logoutButton').addEventListener('click', signOut);
  document.getElementById('statusFilter').addEventListener('change', renderArticles);
  document.getElementById('articleForm').addEventListener('submit', submitForReview);
  document.getElementById('saveDraft').addEventListener('click', saveDraft);
  document.getElementById('resetForm').addEventListener('click', clearForm);
  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) setTimeout(() => loadAccount(session.user), 0);
    else showSignedOut();
  });
}

function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle('error', isError);
}
async function signIn(event) {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  showMessage('लॉगिन जाँचा जा रहा है…');
  try {
    const { error } = await client.auth.signInWithPassword({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    });
    if (error) throw error;
    loginForm.reset();
  } catch (error) {
    showMessage('लॉगिन नहीं हो सका। ईमेल/पासवर्ड जाँचें या एडमिन से संपर्क करें।', true);
  } finally { button.disabled = false; }
}
async function resetPassword() {
  const email = document.getElementById('email').value.trim();
  if (!email) { showMessage('पहले ईमेल भरें, फिर “पासवर्ड भूल गए?” दबाएं।', true); document.getElementById('email').focus(); return; }
  try {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
    if (error) throw error;
    showMessage('यदि इस ईमेल पर खाता है, तो पासवर्ड रीसेट लिंक भेज दिया गया है।');
  } catch (_) { showMessage('रीसेट ईमेल नहीं भेजा जा सका। एडमिन से संपर्क करें।', true); }
}
async function signOut() { await client.auth.signOut(); showSignedOut(); }
function showSignedOut() {
  sessionUser = null; profile = null; articles = [];
  appView.hidden = true; loginView.hidden = false;
  if (client && !setupNotice.hidden) return;
}
async function loadAccount(user) {
  sessionUser = user;
  const { data, error } = await client.from('profiles').select('id,email,role').eq('id', user.id).single();
  if (error || !data) {
    await client.auth.signOut();
    showMessage('आपकी न्यूज़रूम प्रोफ़ाइल नहीं मिली। एडमिन से खाता सक्रिय करवाएं।', true);
    return;
  }
  profile = data;
  loginView.hidden = true; appView.hidden = false;
  document.getElementById('userSummary').textContent = `${roleLabels[profile.role] || 'उपयोगकर्ता'} · ${profile.email || user.email}`;
  document.getElementById('permissionSummary').textContent = roleDescriptions[profile.role] || 'कोई भूमिका निर्धारित नहीं है।';
  const canCreate = authorRoles.includes(profile.role) || editorRoles.includes(profile.role);
  document.getElementById('editorPanel').hidden = !canCreate;
  document.getElementById('formHint').textContent = profile.role === 'guest'
    ? 'योगदानकर्ता केवल ड्राफ़्ट सुरक्षित कर सकते हैं।'
    : 'आपके अधिकार सर्वर पर लागू हैं; भूमिका के बाहर की कार्रवाई अस्वीकार होगी।';
  document.getElementById('submitArticle').hidden = profile.role === 'guest';
  document.getElementById('saveDraft').hidden = !canCreate;
  await loadArticles();
}
async function loadArticles() {
  const listMessage = document.getElementById('listMessage');
  listMessage.textContent = 'खबरें लोड हो रही हैं…';
  const { data, error } = await client.from('articles').select('id,title,category,summary,body,image_url,status,author_id,created_at,updated_at').order('updated_at', { ascending: false });
  if (error) { listMessage.textContent = 'खबरें लोड नहीं हुईं। डेटाबेस और RLS सेटअप जाँचें।'; articles = []; renderArticles(); return; }
  articles = data || []; listMessage.textContent = ''; renderArticles();
}
function statusText(status) { return ({ draft:'ड्राफ़्ट', review:'समीक्षा बाकी', published:'प्रकाशित', rejected:'वापस भेजी' })[status] || status; }
function renderArticles() {
  const filter = document.getElementById('statusFilter').value;
  const isEditor = editorRoles.includes(profile?.role);
  const own = articles.filter((article) => article.author_id === sessionUser?.id);
  const visible = articles.filter((article) => filter === 'all' || article.status === filter);
  document.getElementById('statTotal').textContent = articles.length;
  document.getElementById('statReview').textContent = articles.filter((item) => item.status === 'review').length;
  document.getElementById('statPublished').textContent = articles.filter((item) => item.status === 'published').length;
  document.getElementById('statDraft').textContent = own.filter((item) => item.status === 'draft').length;
  const list = document.getElementById('articlesList'); list.replaceChildren();
  if (!visible.length) { const empty=document.createElement('div'); empty.className='empty-state'; empty.textContent='इस सूची में अभी खबर नहीं है।'; list.appendChild(empty); return; }
  visible.forEach((article) => {
    const card=document.createElement('article'); card.className='article-card';
    const top=document.createElement('div'); top.className='article-top';
    const title=document.createElement('h3'); title.textContent=article.title;
    const badge=document.createElement('span'); badge.className=`status ${article.status}`; badge.textContent=statusText(article.status); top.append(title,badge);
    const summary=document.createElement('p'); summary.textContent=article.summary;
    const meta=document.createElement('div'); meta.className='article-meta';
    [article.category, article.author_id === sessionUser.id ? 'मेरी खबर' : 'न्यूज़रूम', new Intl.DateTimeFormat('hi-IN',{dateStyle:'medium'}).format(new Date(article.updated_at))].forEach((value)=>{const span=document.createElement('span');span.textContent=value;meta.appendChild(span);});
    const actions=document.createElement('div'); actions.className='article-actions';
    const add=(label,action,style='')=>{const button=document.createElement('button');button.type='button';button.textContent=label;if(style)button.className=style;button.addEventListener('click',()=>articleAction(action,article));actions.appendChild(button);};
    const isOwner=article.author_id===sessionUser.id;
    if ((isEditor || isOwner) && article.status !== 'published' && (isEditor || ['draft','rejected'].includes(article.status))) add('संपादित करें','edit');
    if (isEditor && article.status==='review') { add('स्वीकारें','approve'); add('वापस भेजें','reject','danger'); add('प्रकाशित करें','publish'); }
    if (isEditor && article.status!=='published' && article.status!=='review') add('प्रकाशित करें','publish');
    if (isEditor && profile.role==='super_admin') add('हटाएं','delete','danger');
    if(actions.children.length) card.appendChild(actions);
    card.append(top,summary,meta);list.appendChild(card);
  });
}
async function articleAction(action, article) {
  if (action==='edit') { fillForm(article); return; }
  if (action==='delete' && !window.confirm('क्या आप यह खबर स्थायी रूप से हटाना चाहते हैं?')) return;
  const changes={approve:{status:'draft'},reject:{status:'rejected'},publish:{status:'published'}};
  let result;
  if(action==='delete') result=await client.from('articles').delete().eq('id',article.id);
  else result=await client.from('articles').update(changes[action]).eq('id',article.id);
  if(result.error) { window.alert('कार्रवाई पूरी नहीं हुई। आपकी भूमिका या सर्वर अनुमति इसकी इजाज़त नहीं देती।'); return; }
  await loadArticles();
}
function fillForm(article) {
  document.getElementById('articleId').value=article.id; document.getElementById('headline').value=article.title;
  document.getElementById('category').value=article.category; document.getElementById('imageUrl').value=article.image_url||'';
  document.getElementById('summary').value=article.summary; document.getElementById('bodyText').value=article.body;
  document.getElementById('formTitle').textContent='खबर संपादित करें'; document.getElementById('editorPanel').scrollIntoView({behavior:'smooth'});
}
function clearForm() { document.getElementById('articleForm').reset(); document.getElementById('articleId').value=''; document.getElementById('formTitle').textContent='नई खबर लिखें'; }
async function saveArticle(status) {
  const form=document.getElementById('articleForm'); if(!form.reportValidity()) return;
  const id=document.getElementById('articleId').value;
  const payload={title:document.getElementById('headline').value.trim(),category:document.getElementById('category').value,image_url:document.getElementById('imageUrl').value.trim()||null,summary:document.getElementById('summary').value.trim(),body:document.getElementById('bodyText').value.trim(),status};
  const result=id
    ? await client.from('articles').update(payload).eq('id',id).select('id').single()
    : await client.from('articles').insert({...payload,author_id:sessionUser.id}).select('id').single();
  if(result.error) { window.alert('लेख सहेजा नहीं गया। सर्वर ने अनुमति नहीं दी या कनेक्शन में समस्या हुई।'); return; }
  clearForm(); await loadArticles();
}
async function saveDraft() { await saveArticle('draft'); }
async function submitForReview(event) { event.preventDefault(); await saveArticle('review'); }
