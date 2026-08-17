import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";

const siteUrl = "https://motebrenneren.no";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Møtebrenneren – hva koster møtet ditt egentlig?",
    template: "%s – Møtebrenneren",
  },
  description:
    "Se hva møtet koster i sanntid, del lunta med Teams-kollegene dine, og følg med på hvor mye Norge har brent i møter totalt.",
  openGraph: {
    title: "Møtebrenneren – hva koster møtet ditt egentlig?",
    description:
      "Se hva møtet koster i sanntid, del lunta med Teams-kollegene dine, og følg med på hvor mye Norge har brent i møter totalt.",
    url: siteUrl,
    siteName: "Møtebrenneren",
    locale: "nb_NO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Møtebrenneren – hva koster møtet ditt egentlig?",
    description:
      "Se hva møtet koster i sanntid, del lunta med Teams-kollegene dine.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
