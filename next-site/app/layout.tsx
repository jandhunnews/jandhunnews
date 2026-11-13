import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "जनधुन न्यूज़ | सच की आवाज़, सबके लिए", template: "%s | जनधुन न्यूज़" },
  description: "देश-दुनिया की ज़रूरी खबरें, सरल भाषा में और भरोसे के साथ।",
  applicationName: "जनधुन न्यूज़",
};

export const viewport: Viewport = {
  themeColor: "#a30d2d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hi">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">जनधुन<span> न्यूज़</span></Link>
          <nav aria-label="मुख्य नेविगेशन">
            <Link href="/">होम</Link><Link href="/#latest">ताज़ा खबरें</Link><Link href="/#about">हमारे बारे में</Link>
            <Link className="nav-cta" href="/newsroom/">न्यूज़रूम</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <div><Link className="brand footer-brand" href="/">जनधुन<span> न्यूज़</span></Link><p>सच की आवाज़, सबके लिए।</p></div>
          <p>© {new Date().getFullYear()} जनधुन न्यूज़ · सभी अधिकार सुरक्षित</p>
        </footer>
      </body>
    </html>
  );
}
