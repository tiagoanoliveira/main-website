import { type RouteConfig, index, route, layout, prefix } from "@react-router/dev/routes";

export default [
    // Zona pública
    layout("routes/_public.tsx", [
        index("routes/home.tsx"),
        route("projects",       "routes/projects._index.tsx"),
        route("projects/:slug", "routes/projects.$slug.tsx"),
    ]),

    // Suporte público
    route("support/:token",         "routes/support.$token.tsx"),
    route("support/:token/success", "routes/support.$token.success.tsx"),
    route("ticket/:token",          "routes/ticket.$token.tsx"),

    // Uploads (nível raiz — acessível a clientes, admins e portal)
    route("uploads/*", "routes/uploads.$key.ts"),

    // Admin
    route("admin",         "routes/admin._index.tsx"),
    route("admin/logout",  "routes/admin.logout.tsx"),
    layout("routes/admin.layout.tsx", [
        ...prefix("admin", [
            route("dashboard",   "routes/admin.dashboard.tsx"),
            route("tickets",     "routes/admin.tickets.tsx"),
            route("tickets/:id", "routes/admin.tickets.$id.tsx"),
            route("clients",     "routes/admin.clients.tsx"),
            route("invoices",    "routes/admin.invoices.tsx"),
        ]),
    ]),

    // Portal do cliente
    route("portal",               "routes/portal._index.tsx"),
    route("portal/logout",        "routes/portal.logout.tsx"),
    route("portal/reset-password", "routes/portal.reset-password.tsx"),
    layout("routes/portal.layout.tsx", [
        ...prefix("portal", [
            route("dashboard", "routes/portal.dashboard.tsx"),
            route("invoices",  "routes/portal.invoices.tsx"),
            route("tickets",   "routes/portal.tickets.tsx"),
        ]),
    ]),
] satisfies RouteConfig;
