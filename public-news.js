(function () {
  const config = window.JANDHUN_SUPABASE || {};
  const key = typeof config.anonKey === 'string' ? config.anonKey.trim() : '';
  const validKey = key.startsWith('sb_publishable_') || key.split('.').length === 3;
  const projectUrl = typeof config.url === 'string' ? config.url.trim() : '';
  const configured = Boolean(window.supabase && projectUrl.startsWith('https://') && projectUrl.endsWith('.supabase.co') && validKey);
  const grid = document.querySelector('.news-grid');
  if (!grid) return;
  const make = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  };
  const date = value => value ? new Intl.DateTimeFormat('hi-IN', { dateStyle: 'medium' }).format(new Date(value)) : '';
  const showMessage = message => grid.replaceChildren(make('div', 'empty-state', message));
  if (!configured) {
    showMessage('खबरें अभी उपलब्ध नहीं हैं। न्यूज़रूम डेटाबेस कॉन्फ़िगरेशन जाँचें।');
    return;
  }
  const client = window.supabase.createClient(projectUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  function renderArticle(article, index) {
    const card = make('a', 'story-card' + (index === 0 ? ' large-story' : ''));
    card.href = 'article.html?id=' + encodeURIComponent(article.id);
    const media = make('div', 'story-image');
    media.setAttribute('aria-hidden', 'true');
    if (typeof article.image_url === 'string' && article.image_url.startsWith('https://')) {
      const image = make('img');
      image.src = article.image_url;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.style.cssText = 'width:100%;height:100%;object-fit:cover';
      media.append(image);
    }
    const content = make('div', 'story-content');
    content.append(make('span', 'story-tag', article.category || 'खबर'));
    content.append(make('h4', '', article.title));
    if (article.summary) content.append(make('p', '', article.summary));
    content.append(make('small', 'story-date', date(article.created_at)));
    card.append(media, content);
    return card;
  }
  client.from('articles').select('id,title,category,summary,image_url,created_at,updated_at')
    .eq('status', 'published').order('updated_at', { ascending: false }).limit(9)
    .then(({ data, error }) => {
      if (error) return showMessage('खबरें लोड नहीं हो सकीं। कृपया कुछ देर बाद फिर प्रयास करें।');
      if (!data || !data.length) return showMessage('अभी कोई खबर प्रकाशित नहीं है। न्यूज़रूम CMS से पहली खबर प्रकाशित करें।');
      grid.replaceChildren(...data.map(renderArticle));
      const hero = document.querySelector('.hero-featured h2');
      if (hero) hero.textContent = data[0].title;
      const ticker = document.querySelector('.ticker-track');
      if (ticker) ticker.replaceChildren(...data.slice(0, 5).map(item => make('span', '', item.title)));
    })
    .catch(() => showMessage('खबरें लोड नहीं हो सकीं। कृपया कुछ देर बाद फिर प्रयास करें।'));
})();
