import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router";
import type { LinksFunction } from "react-router";
import type { Route } from "./+types/root";
import appStylesHref from "./app.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: appStylesHref },
  { rel: "icon", type: "image/png", href: "/logo-512px%20(3).png" },
  { rel: "apple-touch-icon", href: "/logo-512px%20(3).png" },
  { rel: "manifest", href: "/manifest.json" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-PT"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><Meta /><Links /></head><body>{children}<ScrollRestoration /><Scripts /></body></html>;
}

export default function App() { return <Outlet />; }

export function ErrorBoundary() {
  const error = useRouteError();
  let message = "Ocorreu um erro inesperado.";
  if (isRouteErrorResponse(error)) message = error.status === 404 ? "Página não encontrada." : error.statusText || message;
  else if (error instanceof Error) message = error.message;
  return <main style={{ padding: "2rem", fontFamily: "system-ui" }}><h1>Ups!</h1><p>{message}</p></main>;
}
