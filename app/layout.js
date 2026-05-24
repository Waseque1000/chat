import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

import { SocketProvider } from "@/components/SocketProvider";
import { UserProvider } from "@/components/UserProvider";
import { CallProvider } from "@/components/CallProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata = {
  title: "ChatSphere V3",
  description: "Ultra-Premium Real-Time Chat Experience",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <UserProvider>
            <SocketProvider>
              <CallProvider>
                <TooltipProvider>
                  {children}
                </TooltipProvider>
              </CallProvider>
            </SocketProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
