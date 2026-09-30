import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./incubation-workspace.css";
import "./dashboard-shell.css";
import "./pwa.css";
import "./responsive.css";
import { AuthProvider } from "../contexts/AuthContext";
import { UserProvider } from "../contexts/UserContext";
import AuthSessionRedirect from "../components/auth/AuthSessionRedirect";
import PwaProvider from "../components/pwa/PwaProvider";
import { PWA_THEME_COLOR } from "../lib/pwa";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "IncuSight | MEDIANET Incubateur",
  description: "Plateforme digitale de gestion et suivi des startups - MEDIANET Incubator",
  generator: "v0.app",
  // Le manifest (src/app/manifest.ts) est lie automatiquement par Next.
  applicationName: "IncuSight",
  appleWebApp: {
    capable: true,
    title: "IncuSight",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `data-scroll-behavior="smooth"` declare a Next que le defilement doux est
    // assume : sans cet attribut, le router avertit en console a chaque
    // transition, parce qu'il ne peut pas restaurer la position de scroll
    // instantanement quand `scroll-behavior: smooth` est actif sur <html>.
    <html className="scroll-smooth" data-scroll-behavior="smooth" lang="fr">
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <AuthSessionRedirect />
          <UserProvider>
            <PwaProvider>{children}</PwaProvider>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
