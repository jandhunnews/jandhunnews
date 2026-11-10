const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const joinForm = document.getElementById('joinForm');
const dashboard = document.getElementById('userDashboard');
const permissionList = document.getElementById('permissionList');

// Front-end demo only. Role selection here is not authentication or authorization.
// A production CMS must verify credentials and enforce permissions on a trusted server.
const roles = {
  'super-admin': {
    name: 'Super Admin',
    level: 'Complete Access',
    pending: '8',
    published: '24',
    permissions: ['Manage website settings, team members, ads, plugins, and layouts.', 'Manage and publish all content.']
  },
  'chief-editor': {
    name: 'Chief Editor',
    level: 'Editorial Control',
    pending: '12',
    published: '18',
    permissions: ['Review, edit, reject, schedule, and publish stories.', 'Oversee editorial workflow and newsroom priorities.']
  },
  'news-editor': {
    name: 'News Editor',
    level: 'Content Management',
    pending: '15',
    published: '13',
    permissions: ['Manage story assignments and the editorial queue.', 'Review submissions and prepare stories for publication.']
  },
  reporter: {
    name: 'News Reporter',
    level: 'Reporter Console',
    pending: '10',
    published: '9',
    permissions: ['Create and save news drafts, upload media, and submit stories for review.', 'Track the status of submitted stories.']
  },
  writer: {
    name: 'Author / Writer',
    level: 'Draft & Submit',
    pending: '6',
    published: '4',
    permissions: ['Write drafts, upload images, and submit work for review.', 'Cannot publish directly.']
  },
  guest: {
    name: 'Contributor / Guest',
    level: 'Restricted Draft',
    pending: '4',
    published: '2',
    permissions: ['Create and save restricted drafts for an assigned editor.', 'Cannot publish directly.']
  },
  subscriber: {
    name: 'Subscriber / Reader',
    level: 'Front-end Login',
    pending: '0',
    published: '0',
    permissions: ['Read subscriber content, comment, and manage newsletter preferences.', 'No CMS publishing access.']
  }
};

function openLogin() {
  loginModal.classList.add('open');
  loginModal.setAttribute('aria-hidden', 'false');
  document.getElementById('loginUser').focus();
}

function closeLogin() {
  loginModal.classList.remove('open');
  loginModal.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('[data-open-login]').forEach((button) => {
  button.addEventListener('click', openLogin);
});

document.querySelectorAll('[data-close-login]').forEach((button) => {
  button.addEventListener('click', closeLogin);
});

document.querySelectorAll('[data-open-join]').forEach((button) => {
  button.addEventListener('click', () => {
    document.getElementById('join-us').scrollIntoView({ behavior: 'smooth' });
    document.querySelector('#joinForm input[name="name"]').focus({ preventScroll: true });
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && loginModal.classList.contains('open')) {
    closeLogin();
  }
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const selectedRole = document.getElementById('loginRole').value;
  const role = roles[selectedRole];

  if (!role) {
    window.alert('Please select a valid role.');
    return;
  }

  // Demonstration only: this does not check the username/password or grant real access.
  document.getElementById('activeRole').textContent = role.name;
  document.getElementById('accessLevel').textContent = role.level;
  document.getElementById('pendingCount').textContent = role.pending;
  document.getElementById('publishedToday').textContent = role.published;
  permissionList.replaceChildren();
  role.permissions.forEach((permission) => {
    const item = document.createElement('li');
    item.textContent = permission;
    permissionList.appendChild(item);
  });

  dashboard.classList.add('visible');
  closeLogin();
  loginForm.reset();
  dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  dashboard.classList.remove('visible');
  document.getElementById('activeRole').textContent = 'Guest';
  document.getElementById('accessLevel').textContent = '--';
  document.getElementById('pendingCount').textContent = '0';
  document.getElementById('publishedToday').textContent = '0';
  permissionList.replaceChildren();
});

joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = joinForm.elements.name.value.trim();
  window.alert(`Thank you, ${name}! Your application has been received in this demo.`);
  joinForm.reset();
});

document.querySelectorAll('.paper-actions button').forEach((button) => {
  button.addEventListener('click', () => {
    window.alert('The e-paper edition is a preview. Connect a published PDF or e-paper reader to enable this action.');
  });
});
