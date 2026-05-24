import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { SocketProvider } from "@/components/SocketProvider";
import { UserProvider } from "@/components/UserProvider";
import { CallProvider } from "@/components/CallProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata = {
  title: "ChatSphere - Modern Real-Time Chat",
  description: "A premium real-time messaging platform.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background">
        <UserProvider>
          <SocketProvider>
            <CallProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </CallProvider>
          </SocketProvider>
        </UserProvider>
      </body>
    </html>
  );
}
