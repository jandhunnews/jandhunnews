# जनधुन न्यूज़: पासवर्ड + OTP लॉगिन और CMS सेटअप

CMS में Supabase email/password authentication के बाद हर नए पेज/ब्राउज़र session में authenticator-app TOTP MFA अनिवार्य है। Supabase database की Row Level Security भी `aal2` MFA स्तर जाँचती है; केवल UI check नहीं है।

## अभी की स्थिति और बाकी सेटअप

कोड तैयार है, लेकिन यह तब तक लॉगिन नहीं कर सकता जब तक आपका Supabase प्रोजेक्ट बनाकर config और SQL लागू न हों। Admin ईमेल `jandhunnews@gmail.com` को `super_admin` बनाना अभी Supabase SQL Editor में करना होगा; repository से यह बदलाव अपने-आप आपके Supabase खाते पर लागू नहीं हो सकता। पासवर्ड या OTP secret repo में न डालें और हमें न भेजें।

## 1. Supabase प्रोजेक्ट जोड़ें

1. https://supabase.com पर प्रोजेक्ट बनाएं या अपने मौजूदा प्रोजेक्ट को खोलें।
2. Project Settings → API से Project URL और public **publishable/anon key** लें।
3. `supabase-config.js` में placeholders को उन दोनों मानों से बदलें। `service_role` key, database password या OTP secret frontend/repository में कभी न डालें।
4. Supabase SQL Editor में `supabase/schema.sql` चलाएं। यह profiles/articles tables और RLS नियम बनाता है; signed-in CMS access में AAL2 MFA आवश्यक करता है।
5. Auth → URL Configuration में deployed GitHub Pages site URL और redirect URL जोड़ें।

## 2. पहला Admin खाता

1. Supabase Authentication → Users से `jandhunnews@gmail.com` को invite/add करें। एक मज़बूत, निजी पासवर्ड Supabase के secure flow में सेट करें। यहां कोई default password नहीं है।
2. उस ईमेल से CMS में पहली बार password login करें। Authenticator ऐप (Google Authenticator, Microsoft Authenticator, 1Password आदि) से QR scan करके नया TOTP factor enroll करें और 6-अंकों का code verify करें। Recovery codes सुरक्षित जगह रखें; ऐप/डिवाइस खोने पर admin recovery की जरूरत होगी।
3. सफल शुरुआती sign-in के बाद Supabase SQL Editor में चलाएं:

```sql
update public.profiles
set role = 'super_admin'
where lower(email) = 'jandhunnews@gmail.com';
```

4. लॉगआउट करके फिर से लॉगिन करें। अब पासवर्ड के बाद authenticator का नया OTP देना होगा। सभी स्टाफ को Supabase Auth से invite करें; वे default `subscriber` होंगे। एडमिन उनकी role SQL Editor से निर्धारित करे: `chief_editor`, `news_editor`, `reporter`, `writer`, `guest` या `subscriber`.

## OTP के बारे में

यह email OTP नहीं है; यह TOTP authenticator code है, जो लगभग हर 30 सेकंड बदलता है। हर नए CMS page load पर password और OTP दोनों मांगे जाएंगे क्योंकि browser session persistence बंद है। एक खुला हुआ tab तब तक authenticated रह सकता है जब तक वह खुला है या token validity बनी हुई है; इसे हर API request पर re-enter कराना अलग idle/session timeout work है। MFA setup का QR/secret पहली enrollment screen पर ही दिखता है; उसे निजी रखें।

## मौजूदा कमियां / Production से पहले जरूरी

- Supabase project URL/key भरना, SQL चलाना, admin/staff users invite करना और roles देना अभी बाकी है।
- Login, MFA enrollment/verification और DB policies code से जुड़े हैं, पर live Supabase project के खिलाफ end-to-end परीक्षण नहीं किया गया।
- TOTP recovery/reset और lost-device admin recovery procedure अभी manual है।
- Article image field केवल URL लेता है; protected image Storage/upload, file type/size checks नहीं हैं।
- Public homepage अभी sample/static खबरें दिखाता है; published Supabase articles से sync नहीं होता।
- “हमसे जुड़ें” form अभी demo alert है; applications backend में save नहीं होतीं। E-paper/PDF archive link नहीं जोड़ा गया।
- Login throttling/monitoring, audit log, backup/restore test, security headers/CSP, dependency pinning, accessibility review और mobile/browser end-to-end tests production से पहले करें।
- Admin role SQL में manually assign होती है; team management UI नहीं बना है। Public signup बंद है।
