import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { UserProvider } from "../contexts/UserContext";
import { StartupProvider } from "../contexts/StartupContext";
import { ProgramProvider } from "../contexts/ProgramContext";
import { ApplicationProvider } from "../contexts/ApplicationContext";
import { ApplicationEvaluatorProvider } from "../contexts/ApplicationEvaluatorContext";
import { EvaluationProvider } from "../contexts/EvaluationContext";
import { ProgramEvaluatorProvider } from "../contexts/ProgramEvaluatorContext";
import { NotificationProvider } from "../contexts/NotificationContext";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <UserProvider>
            <StartupProvider>
              <ProgramProvider>
                <ProgramEvaluatorProvider>
                  <ApplicationProvider>
                    <ApplicationEvaluatorProvider>
                      <EvaluationProvider>
                        <NotificationProvider>{children}</NotificationProvider>
                      </EvaluationProvider>
                    </ApplicationEvaluatorProvider>
                  </ApplicationProvider>
                </ProgramEvaluatorProvider>
              </ProgramProvider>
            </StartupProvider>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}