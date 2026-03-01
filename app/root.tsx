// app/root.tsx
import {
    isRouteErrorResponse, Links, Meta,
    Outlet, Scripts, ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
    // ── Favicon ──────────────────────────────────────
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/icon-192.png" },
    // ── PWA manifest ─────────────────────────────────
    { rel: "manifest", href: "/manifest.json" },
    // ── Fonts ────────────────────────────────────────
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" },
];

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt">
        <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content="#2563eb" />
            <Meta /><Links />
        </head>
        <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
        {children}
        <ScrollRestoration />
        <Scripts />
        {/* Service Worker */}
        <script dangerouslySetInnerHTML={{ __html: `
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
            }
        `}} />
        </body>
        </html>
    );
}

export default function App() { return <Outlet />; }

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    const is404 = isRouteErrorResponse(error) && error.status === 404;
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">{is404 ? "404" : "Erro"}</h1>
                <p className="text-gray-500">{is404 ? "Página não encontrada." : "Ocorreu um erro inesperado."}</p>
                <a href="/" className="mt-6 inline-block text-blue-600 hover:underline">Voltar ao início</a>
            </div>
        </div>
    );
}
