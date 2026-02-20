
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BackgroundPattern } from "@/components/background-pattern";

export const metadata: Metadata = {
  title: "TaxNaira",
  description: "TaxNaira Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased font-sans"
        suppressHydrationWarning
      >
        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BackgroundPattern />
          {children}
        </Providers>
      </body>
    </html>
  );
}
