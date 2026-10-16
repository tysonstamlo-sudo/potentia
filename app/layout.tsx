import type { Metadata, Viewport } from "next";
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

export const metadata: Metadata = {
title: "Potentia",
description: "Your transformation, guided by AI",
manifest: "/manifest.json",
appleWebApp: {
capable: true,
statusBarStyle: "black-translucent",
title: "Potentia",
},
formatDetection: {
telephone: false,
},
};

export const viewport: Viewport = {
width: "device-width",
initialScale: 1,
maximumScale: 1,
userScalable: false,
viewportFit: "cover",
themeColor: "#050505",
};

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
<html
lang="en"
className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
>
<body className="min-h-full flex flex-col overscroll-none select-none">
{children}
</body>
</html>
);
}

