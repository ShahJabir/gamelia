import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const fraunces = Fraunces({
  variable: "--font-logo",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gamelia",
    template: "%s | Gamelia"
  },
  description: "Describe a game and watch it come to life. Gamelia is an agentic three.js game builder that plans the scene, writes the code, and streams playable worlds from plain English.",
  keywords: ["game development", "game builder", "ai game development", "ai game builder", "three.js", "react", "web development", "web3", "nextjs", "ai", "machine learning", "javascript", "typescript", "html", "css", "nodejs", "express", "mongodb", "postgresql", "sqlite", "mysql", "redis", "rabbitmq", "kafka", "docker", "kubernetes", "aws", "gcp", "azure", "digitalocean", "linode", "vultr", "heroku", "netlif", "vercel", "railway", "cyclic", "render", "fastify", "nestjs", "expressjs", "fastifyjs", "nestjsjs", "fastifyjs-api", "nestjsjs-api", "fastify-api", "nestjs-api", "fastify-rest", "nestjs-rest", "fastify-graphql", "nestjs-graphql", "fastify-rpc", "nestjs-rpc", "fastify-socket", "nestjs-socket", "fastify-sse", "nestjs-sse", "fastify-websocket", "nestjs-websocket", "fastify-rest-api", "nestjs-rest-api", "fastify-graphql-api", "nestjs-graphql-api", "fastify-rpc-api", "nestjs-rpc-api", "fastify-socket-api", "nestjs-socket-api", "fastify-sse-api", "nestjs-sse-api", "fastify-websocket-api", "nestjs-websocket-api"],
  authors: [{ name: "Shah Jabir Taqi" }],
  creator: "Shah Jabir Taqi",
  publisher: "Shah Jabir Taqi",
  openGraph: {
    title: "Gamelia",
    description: "Describe a game and watch it come to life. Gamelia is an agentic three.js game builder that plans the scene, writes the code, and streams playable worlds from plain English.",
    url: "https://gamelia.shahjabir.com.bd",
    siteName: "Gamelia",
    images: [
      {
        url: "./icon.svg",
        width: 100,
        height: 100,
        alt: "Gamelia",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}