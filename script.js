const newsroomLink = document.createElement('a');
newsroomLink.href = 'cms.html';
newsroomLink.className = 'newsroom-link';
newsroomLink.textContent = 'न्यूज़रूम';
newsroomLink.setAttribute('aria-label', 'न्यूज़रूम सीएमएस डेमो खोलें');
const topActions = document.querySelector('.top-actions');
if (topActions) topActions.prepend(newsroomLink);

const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const joinForm = document.getElementById('joinForm');
const dashboard = document.getElementById('userDashboard');
const permissionList = document.getElementById('permissionList');
const installButton = document.getElementById('installApp');
const roles = {
  'super-admin': { name: 'सुपर एडमिन', level: 'पूरा नियंत्रण', pending: '8', published: '24', permissions: ['वेबसाइट, टीम, विज्ञापन और लेआउट प्रबंधित करें।', 'सभी सामग्री का प्रबंधन और प्रकाशन करें।'] },
  'chief-editor': { name: 'मुख्य संपादक', level: 'संपादकीय नियंत्रण', pending: '12', published: '18', permissions: ['लेख पढ़ें, संपादित करें, अस्वीकारें, शेड्यूल और प्रकाशित करें।', 'संपादकीय प्रक्रिया की निगरानी करें।'] },
  'news-editor': { name: 'समाचार संपादक', level: 'सामग्री प्रबंधन', pending: '15', published: '13', permissions: ['खबरों की सूची और रिपोर्टिंग असाइनमेंट संभालें।', 'समीक्षा कर खबरें प्रकाशन के लिए तैयार करें।'] },
  reporter: { name: 'न्यूज़ रिपोर्टर', level: 'रिपोर्टर पैनल', pending: '10', published: '9', permissions: ['खबर लिखें, मीडिया अपलोड करें और समीक्षा के लिए भेजें।', 'अपनी खबरों की स्थिति देखें।'] },
  writer: { name: 'लेखक', level: 'ड्राफ़्ट और समीक्षा', pending: '6', published: '4', permissions: ['लेख लिखें, तस्वीरें अपलोड करें और समीक्षा के लिए भेजें।', 'सीधे प्रकाशित करने की अनुमति नहीं।'] },
  guest: { name: 'योगदानकर्ता / अतिथि', level: 'सीमित ड्राफ़्ट', pending: '4', published: '2', permissions: ['सीमित ड्राफ़्ट बनाएं और सुरक्षित करें।', 'सीधे प्रकाशित करने की अनुमति नहीं।'] },
  subscriber: { name: 'सब्सक्राइबर / पाठक', level: 'पाठक लॉगिन', pending: '0', published: '0', permissions: ['प्रीमियम खबरें पढ़ें, टिप्पणी करें और न्यूज़लेटर संभालें।', 'सीएमएस में प्रकाशन की अनुमति नहीं।'] }
};
function openLogin() { loginModal.classList.add('open'); loginModal.setAttribute('aria-hidden', 'false'); document.getElementById('loginUser').focus(); }
function closeLogin() { loginModal.classList.remove('open'); loginModal.setAttribute('aria-hidden', 'true'); }
document.querySelectorAll('[data-open-login]').forEach((button) => button.addEventListener('click', openLogin));
document.querySelectorAll('[data-close-login]').forEach((button) => button.addEventListener('click', closeLogin));
document.querySelectorAll('[data-open-join]').forEach((button) => button.addEventListener('click', () => { document.getElementById('join-us').scrollIntoView({ behavior: 'smooth' }); document.querySelector('#joinForm input[name="name"]').focus({ preventScroll: true }); }));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && loginModal.classList.contains('open')) closeLogin(); });
loginForm.addEventListener('submit', (event) => {
  event.preventDefault(); const role = roles[document.getElementById('loginRole').value]; if (!role) return;
  document.getElementById('activeRole').textContent = role.name; document.getElementById('accessLevel').textContent = role.level;
  document.getElementById('pendingCount').textContent = role.pending; document.getElementById('publishedToday').textContent = role.published;
  permissionList.replaceChildren(); role.permissions.forEach((text) => { const item = document.createElement('li'); item.textContent = text; permissionList.appendChild(item); });
  dashboard.classList.add('visible'); closeLogin(); loginForm.reset(); dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  dashboard.classList.remove('visible'); document.getElementById('activeRole').textContent = 'पाठक'; document.getElementById('accessLevel').textContent = '—';
  document.getElementById('pendingCount').textContent = '0'; document.getElementById('publishedToday').textContent = '0'; permissionList.replaceChildren();
});
joinForm.addEventListener('submit', (event) => { event.preventDefault(); const name = joinForm.elements.name.value.trim(); window.alert(`धन्यवाद ${name}! आपका आवेदन ��स डेमो में प्राप्त हुआ है।`); joinForm.reset(); });
document.querySelectorAll('.paper-actions button').forEach((button) => button.addEventListener('click', () => window.alert('ई-पेपर का वास्तविक संस्करण उपलब्ध होने पर यह सुविधा शुरू होगी।')));
let installPrompt;
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; installButton.hidden = false; });
installButton.addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButton.hidden = true; });
window.addEventListener('appinstalled', () => { installButton.hidden = true; });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
