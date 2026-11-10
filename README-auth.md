# जनधुन न्यूज़: वास्तविक लॉगिन और CMS सेटअप

CMS में Supabase Auth आधारित ईमेल/पासवर्ड लॉगिन और PostgreSQL Row Level Security (RLS) जोड़ी गई है। अभी repository में project credentials नहीं हैं, इसलिए ये चरण पूरे करने तक लॉगिन बंद रहेगा।

## 1. Supabase प्रोजेक्ट बनाएं

1. https://supabase.com पर प्रोजेक्ट बनाएं।
2. Project Settings → API से Project URL और **publishable/anon public key** लें।
3. `supabase-config.js` में placeholder URL और key बदलें। Browser में केवल public key रखें; `service_role` key या database password कभी न रखें।
4. Supabase SQL Editor में `supabase/schema.sql` की पूरी सामग्री चलाएं। इससे profiles/articles tables, new-user profile trigger और RLS policies बनेंगी।

## 2. एडमिन खाते और भूमिकाएं

- Supabase Authentication → Users से टीम के खातों को invite/create करें। CMS में सार्वजनिक signup नहीं है।
- हर नया खाता सुरक्षित रूप से `subscriber` भूमिका से शुरू होगा।
- पहले विश्वसनीय एडमिन को भूमिका देने के लिए SQL Editor में चलाएं (ईमेल को वास्तविक खाते से बदलें):

```sql
update public.profiles
set role = 'super_admin'
where email = 'admin@example.com';
```

- अन्य समर्थित role values: `chief_editor`, `news_editor`, `reporter`, `writer`, `guest`, `subscriber`.
- role बदलने की अनुमति browser client को नहीं है; इसे केवल trusted Supabase admin/SQL console से करें। Service-role key frontend में न डालें।

## 3. चलाना और जांचना

- GitHub Pages/HTTPS पर publish करें; Supabase Auth URL Configuration में site URL और redirect URL जोड़ें।
- `cms.html` खोलकर invited ईमेल और पासवर्ड से लॉगिन करें। “पासवर्ड भूल गए?” ईमेल भेजेगा; Supabase SMTP सेटिंग आवश्यक हो सकती है।
- RLS ही database पर लेख पढ़ने/बदलने/प्रकाशित करने की भूमिका-जाँच करता है। UI में role छिपाना सुरक्षा का विकल्प नहीं है।

## सीमाएं

यह CMS अभी single-page demo UI और Supabase database/auth integration है; production deployment से पहले Supabase email/SMTP, backups, audit logging, rate limits, trusted admin onboarding, content moderation, image Storage policies और end-to-end testing सेट करें। अभी image field URL लेता है—image upload/storage flow शामिल नहीं है। E-paper और join form अभी भी demo behavior हैं।
