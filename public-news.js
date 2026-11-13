(function(){
const cfg=window.JANDHUN_SUPABASE||{},key=(cfg.anonKey||'').trim();
const valid=key.startsWith('sb_publishable_')||/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key);
if(!window.supabase||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url||'')||!valid)return;
const client=window.supabase.createClient(cfg.url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const grid=document.querySelector('.news-grid');if(!grid)return;
const date=v=>v?new Intl.DateTimeFormat('hi-IN',{dateStyle:'medium'}).format(new Date(v)):'';
client.from('articles').select('id,title,category,summary,image_url,created_at,updated_at').eq('status','published').order('updated_at',{ascending:false}).limit(9).then(({data,error})=>{
if(error)return;grid.replaceChildren();if(!data||!data.length){const empty=document.createElement('p');empty.className='demo-note';empty.textContent='अभी कोई खबर प्रकाशित नहीं है। न्यूज़रूम CMS से पहली खबर प्रकाशित करें।';grid.append(empty);return}
data.forEach(a=>{const card=document.createElement('a');card.className='story-card';card.href='article.html?id='+encodeURIComponent(a.id);const media=document.createElement('div');media.className='story-image';if(a.image_url&&/^https:\/\//i.test(a.image_url)){const img=document.createElement('img');img.src=a.image_url;img.alt=a.title;img.loading='lazy';img.style.cssText='width:100%;height:100%;object-fit:cover';media.append(img)}const content=document.createElement('div');content.className='story-content';const tag=document.createElement('span');tag.className='story-tag';tag.textContent=a.category||'खबर';const title=document.createElement('h4');title.textContent=a.title;const summary=document.createElement('p');summary.textContent=a.summary||'';const meta=document.createElement('small');meta.textContent=date(a.created_at);content.append(tag,title,summary,meta);card.append(media,content);grid.append(card)});
}).catch(()=>{});
})();