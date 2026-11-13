"use client";

import { useEffect, useState } from "react";
import { supabase, type NewsArticle } from "@/lib/supabase";

export default function HomePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadArticles() {
      if (!supabase) {
        setMessage("वेबसाइट का समाचार डेटाबेस अभी कॉन्फ़िगर नहीं है। व्यवस्थापक से संपर्क करें।");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("articles")
        .select("id,title,category,summary,body,image_url,created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(12);
      if (!active) return;
      if (error) setMessage("खबरें अभी लोड नहीं हो सकीं। कृपया कुछ देर बाद फिर कोशिश करें।");
      else setArticles((data ?? []) as NewsArticle[]);
      setLoading(false);
    }
    void loadArticles();
    return () => { active = false; };
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow"><span className="live-dot" /> भरोसे की पत्रकारिता</p>
          <h1>सच की आवाज़,<br /><em>सबके लिए।</em></h1>
          <p className="hero-copy">देश-दुनिया की ज़रूरी खबरें, सरल भाषा में और भरोसे के साथ।</p>
          <a className="button button-light" href="#latest">ताज़ा खबरें पढ़ें <span aria-hidden="true">↗</span></a>
        </div>
        <div className="hero-mark" aria-hidden="true">जन<br />धुन</div>
      </section>

      <section className="ticker"><span>जनधुन अपडेट</span><p>तथ्य, निष्पक्षता और ज़मीनी पत्रकारिता — हमारी प्राथमिकता</p></section>

      <section className="content-section" id="latest">
        <div className="section-head"><div><p className="eyebrow">न्यूज़रूम से</p><h2>ताज़ा खबरें</h2></div><span className="section-note">सिर्फ प्रकाशित खबरें</span></div>
        {loading ? <p className="state-message">खबरें लोड हो रही हैं…</p> : null}
        {!loading && message ? <p className="state-message">{message}</p> : null}
        {!loading && !message && articles.length === 0 ? <div className="empty-state"><strong>अभी कोई खबर प्रकाशित नहीं है।</strong><p>नई खबरें प्रकाशित होते ही यहाँ दिखाई देंगी।</p></div> : null}
        <div className="news-grid">
          {articles.map((article, index) => (
            <article className={index === 0 ? "news-card featured" : "news-card"} key={article.id}>
              {article.image_url ? <img src={article.image_url} alt="" loading="lazy" /> : <div className="news-placeholder"><span>{article.category}</span></div>}
              <div className="news-card-body"><span className="category-label">{article.category}</span><h3>{article.title}</h3><p>{article.summary}</p><time dateTime={article.created_at}>{new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium" }).format(new Date(article.created_at))}</time></div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-band" id="about"><div><p className="eyebrow">हमारा संकल्प</p><h2>खबर वही, जो<br />जनता के काम आए।</h2></div><p>जनधुन न्यूज़ का उद्देश्य है ज़मीनी मुद्दों, जनहित और ज़िम्मेदार पत्रकारिता को प्रमुखता देना। हम तथ्यों और पाठकों के भरोसे को सर्वोपरि रखते हैं।</p></section>
    </main>
  );
}
