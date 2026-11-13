// JanDhun News: route all homepage login entry points to the real Supabase CMS.
const newsroomLink = document.createElement('a');
newsroomLink.href = 'cms.html';
newsroomLink.className = 'newsroom-link';
newsroomLink.textContent = 'न्यूज़रूम';
newsroomLink.setAttribute('aria-label', 'वास्तविक न्यूज़रूम सीएमएस खोलें');
const topActions = document.querySelector('.top-actions');
if (topActions) topActions.prepend(newsroomLink);

document.querySelectorAll('[data-open-login]').forEach((button) => {
  button.addEventListener('click', () => { window.location.href = 'cms.html'; });
});

// Do not present placeholder e-paper controls as working downloads.
document.querySelectorAll('.paper-actions button').forEach((button) => {
  button.disabled = true;
  button.title = 'ई-पेपर PDF लिंक अभी कॉन्फ़िगर नहीं है।';
});

// The application form has no server-side destination yet; clearly explain this
// rather than showing a false success message or silently discarding the entry.
const joinForm = document.getElementById('joinForm');
if (joinForm) {
  joinForm.addEventListener('submit', (event) => {
    event.preventDefault();
    let notice = document.getElementById('joinFormNotice');
    if (!notice) {
      notice = document.createElement('p');
      notice.id = 'joinFormNotice';
      notice.className = 'demo-note';
      notice.setAttribute('role', 'status');
      joinForm.appendChild(notice);
    }
    notice.textContent = 'आवेदन फॉर्म अभी सर्वर से जुड़ा नहीं है। कृपया बाद में प्रयास करें। आपका डेटा भेजा नहीं गया है।';
  });
}

// PWA install prompt.
const installButton = document.getElementById('installApp');
let installPrompt;
if (installButton) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener('appinstalled', () => { installButton.hidden = true; });
}
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
