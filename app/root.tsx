import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="pt">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
      <Footer />
      <ScrollRestoration />
      <Scripts />
      </body>
      </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Erro";
  let details = "Ocorreu um erro inesperado.";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Erro";
    details = error.status === 404
        ? "A página que procuras não existe."
        : error.statusText || details;
  }

  return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">{message}</h1>
          <p className="text-gray-500">{details}</p>
        </div>
      </div>
  );
}
