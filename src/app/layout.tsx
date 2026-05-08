import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "IncuSight",
  description: "Smart incubation platform for startup management and evaluation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} font-sans antialiased`}
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