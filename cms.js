const STORAGE_KEY = 'jandhun-cms-demo-articles-v1';
const roleSelect = document.getElementById('cmsRole');
const articleForm = document.getElementById('articleForm');
const articlesList = document.getElementById('articlesList');
const statusFilter = document.getElementById('statusFilter');
const formHint = document.getElementById('formHint');
const roleNames = {
  'super-admin': 'सुपर एडमिन', 'chief-editor': 'मुख्य संपादक', 'news-editor': 'समाचार संपादक',
  reporter: 'न्यूज़ रिपोर्टर', writer: 'लेखक', guest: 'योगदानकर्ता', subscriber: 'पाठक'
};
const seedArticles = [
  { id: 'demo-1', title: 'शहरों में बेहतर आवागमन से विकास को नई दिशा', category: 'देश', summary: 'सार्वजनिक परिवहन और डिजिटल सुविधाओं का विस्तार।', body: 'यह एक नमूना खबर है। वास्तविक प्रकाशन से पहले तथ्यों और स्रोतों की जांच करें।', image: '', status: 'review', author: 'न्यूज़ रिपोर्टर', updated: new Date().toISOString() },
  { id: 'demo-2', title: 'बाज़ार में दिखी सकारात्मक शुरुआत', category: 'कारोबार', summary: 'नीतिगत संकेतों के बीच निवेशकों की नज़र।', body: 'यह एक नमूना ड्राफ़्ट है।', image: '', status: 'draft', author: 'लेखक', updated: new Date().toISOString() },
  { id: 'demo-3', title: 'आज की प्रमुख खेल अपडेट', category: 'खेल', summary: 'दिनभर के मुकाबलों की अहम जानकारी।', body: 'यह नमूना प्रकाशित खबर है।', image: '', status: 'published', author: 'मुख्य संपादक', updated: new Date().toISOString() }
];
const permissions = {
  'super-admin': { create: true, editAny: true, review: true, publish: true, remove: true, submit: true },
  'chief-editor': { create: true, editAny: true, review: true, publish: true, remove: false, submit: true },
  'news-editor': { create: true, editAny: true, review: true, publish: true, remove: false, submit: true },
  reporter: { create: true, editAny: false, review: false, publish: false, remove: false, submit: true },
  writer: { create: true, editAny: false, review: false, publish: false, remove: false, submit: true },
  guest: { create: true, editAny: false, review: false, publish: false, remove: false, submit: false },
  subscriber: { create: false, editAny: false, review: false, publish: false, remove: false, submit: false }
};
let articles;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  articles = Array.isArray(saved) ? saved : seedArticles;
} catch (_) { articles = seedArticles; }
let currentRole = roleSelect.value;

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(articles)); }
function getRole() { return permissions[currentRole]; }
function getStatusLabel(status) { return ({ draft: 'ड्राफ़्ट', review: 'समीक्षा बाकी', published: 'प्रकाशित', rejected: 'वापस भेजी' })[status] || status; }
function dateLabel(value) {
  try { return new Intl.DateTimeFormat('hi-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  catch (_) { return ''; }
}
function canEdit(article) { return getRole().editAny || article.author === roleNames[currentRole]; }
function setEditorAccess() {
  const allowed = getRole().create;
  document.getElementById('editorPanel').hidden = !allowed;
  formHint.textContent = currentRole === 'guest' ? 'योगदानकर्ता केवल ड्राफ़्ट सुरक्षित कर सकते हैं।' : 'ड्राफ़्ट सेव करें या संपादक को समीक्षा के लिए भेजें।';
  render();
}
function render() {
  const filter = statusFilter.value;
  const visible = articles.filter((article) => filter === 'all' || article.status === filter);
  document.getElementById('statTotal').textContent = articles.length;
  document.getElementById('statReview').textContent = articles.filter((item) => item.status === 'review').length;
  document.getElementById('statPublished').textContent = articles.filter((item) => item.status === 'published').length;
  document.getElementById('statDraft').textContent = articles.filter((item) => item.author === roleNames[currentRole] && item.status === 'draft').length;
  articlesList.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('div'); empty.className = 'empty-state';
    empty.textContent = filter === 'all' ? 'अभी कोई खबर नहीं है।' : 'इस स्थिति में कोई खबर नहीं मिली।';
    articlesList.appendChild(empty); return;
  }
  visible.sort((a, b) => new Date(b.updated) - new Date(a.updated)).forEach((article) => {
    const card = document.createElement('article'); card.className = 'article-card';
    const top = document.createElement('div'); top.className = 'article-top';
    const heading = document.createElement('h3'); heading.textContent = article.title;
    const badge = document.createElement('span'); badge.className = `status ${article.status}`; badge.textContent = getStatusLabel(article.status);
    top.append(heading, badge);
    const summary = document.createElement('p'); summary.textContent = article.summary;
    const meta = document.createElement('div'); meta.className = 'article-meta';
    [article.category, `लेखक: ${article.author}`, dateLabel(article.updated)].forEach((text) => { const span = document.createElement('span'); span.textContent = text; meta.appendChild(span); });
    const actions = document.createElement('div'); actions.className = 'article-actions';
    const addAction = (label, action, className = '') => { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; if (className) button.className = className; button.addEventListener('click', () => handleAction(action, article.id)); actions.appendChild(button); };
    if (canEdit(article)) addAction('संपादित करें', 'edit');
    if (article.status === 'draft' && getRole().submit && canEdit(article)) addAction('समीक्षा के लिए भेजें', 'submit');
    if (article.status === 'review' && getRole().review) { addAction('स्वीकारें', 'approve'); addAction('वापस भेजें', 'reject'); }
    if (article.status !== 'published' && getRole().publish && (article.status === 'review' || getRole().editAny)) addAction('प्रकाशित करें', 'publish');
    if (article.status === 'rejected' && canEdit(article)) addAction('फिर से समीक्षा भेजें', 'submit');
    if (getRole().remove) addAction('हटाएं', 'delete', 'danger');
    if (actions.children.length) card.append(actions);
    card.append(top, summary, meta);
    // Put title/status above story details and actions below them.
    articlesList.appendChild(card);
  });
}
function handleAction(action, id) {
  const article = articles.find((item) => item.id === id); if (!article) return;
  if (action === 'edit') { if (!canEdit(article)) return; fillForm(article); return; }
  if (action === 'delete') { if (!getRole().remove || !window.confirm('क्या आप इस खबर को हटाना चाहते हैं?')) return; articles = articles.filter((item) => item.id !== id); }
  if (action === 'submit') { if (!canEdit(article) || !getRole().submit) return; article.status = 'review'; article.updated = new Date().toISOString(); }
  if (action === 'approve') { if (!getRole().review || article.status !== 'review') return; article.status = 'draft'; article.updated = new Date().toISOString(); }
  if (action === 'reject') { if (!getRole().review || article.status !== 'review') return; article.status = 'rejected'; article.updated = new Date().toISOString(); }
  if (action === 'publish') { if (!getRole().publish) return; article.status = 'published'; article.updated = new Date().toISOString(); }
  save(); render();
}
function fillForm(article) {
  document.getElementById('articleId').value = article.id;
  document.getElementById('headline').value = article.title;
  document.getElementById('category').value = article.category;
  document.getElementById('imageUrl').value = article.image || '';
  document.getElementById('summary').value = article.summary;
  document.getElementById('bodyText').value = article.body;
  document.getElementById('formTitle').textContent = 'खबर संपादित करें';
  document.getElementById('editorPanel').scrollIntoView({ behavior: 'smooth' });
}
function clearForm() { articleForm.reset(); document.getElementById('articleId').value = ''; document.getElementById('formTitle').textContent = 'नई खबर लिखें'; }
function saveArticle(status) {
  const data = {
    title: document.getElementById('headline').value.trim(), category: document.getElementById('category').value,
    image: document.getElementById('imageUrl').value.trim(), summary: document.getElementById('summary').value.trim(),
    body: document.getElementById('bodyText').value.trim()
  };
  if (!data.title || !data.summary || !data.body) { articleForm.reportValidity(); return; }
  const id = document.getElementById('articleId').value;
  const existing = id && articles.find((item) => item.id === id);
  if (existing && !canEdit(existing)) return;
  if (!existing && !getRole().create) return;
  const article = { ...(existing || {}), ...data, id: existing ? existing.id : `story-${Date.now()}`, status, author: existing ? existing.author : roleNames[currentRole], updated: new Date().toISOString() };
  if (existing) articles = articles.map((item) => item.id === id ? article : item); else articles.unshift(article);
  save(); clearForm(); render();
}
articleForm.addEventListener('submit', (event) => { event.preventDefault(); if (!getRole().submit) { window.alert('इस भूमिका में केवल ड्राफ़्ट सेव कर सकते हैं।'); return; } saveArticle('review'); });
document.getElementById('saveDraft').addEventListener('click', () => { if (!articleForm.reportValidity()) return; saveArticle('draft'); });
document.getElementById('resetForm').addEventListener('click', clearForm);
roleSelect.addEventListener('change', () => { currentRole = roleSelect.value; clearForm(); setEditorAccess(); });
statusFilter.addEventListener('change', render);
if (!articles.length) articles = seedArticles;
save();
setEditorAccess();
