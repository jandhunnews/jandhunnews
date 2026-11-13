import type { Metadata } from "next";

export const metadata: Metadata = { title: "न्यूज़रूम" };

export default function NewsroomPage() {
  return (
    <main className="simple-page">
      <p className="eyebrow">जनधुन न्यूज़ · संपादकीय डेस्क</p>
      <h1>न्यूज़रूम पोर्टल तैयार हो रहा है</h1>
      <p>मौजूदा सुरक्षित CMS अभी उपलब्ध है। नए Next.js न्यूज़रूम में लॉगिन, MFA, भूमिका-आधारित अधिकार और लेख प्रबंधन अगले चरण में जोड़े जाएंगे।</p>
      <a className="button button-dark" href="../cms.html">मौजूदा न्यूज़रूम खोलें</a>
    </main>
  );
}
