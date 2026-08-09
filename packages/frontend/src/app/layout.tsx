import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { TRPCProvider } from "@/components/layout/trpc-provider";

export const metadata: Metadata = {
  title: "Aegis Shift — AI-Powered Healthcare Shift Management",
  description:
    "Web3 healthcare shift management platform with AI-powered scheduling, soulbound credential NFTs, and prediction markets for staffing demand.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <TRPCProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto bg-background p-6">
                  {children}
                </main>
              </div>
            </div>
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
