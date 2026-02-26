import { type RouteConfig, index, route, layout, prefix } from "@react-router/dev/routes";

export default [
    // Zona pública
    layout("routes/_public.tsx", [
        index("routes/home.tsx"),
    ]),

    // Formulário de suporte (sem Navbar/Footer — página standalone)
    route("support/:token",         "routes/support.$token.tsx"),
    route("support/:token/success", "routes/support.$token.success.tsx"),

    // Ticket público via link de email (sem Navbar/Footer)
    route("ticket/:token", "routes/ticket.$token.tsx"),

    // Admin
    route("admin",         "routes/admin._index.tsx"),
    route("admin/logout",  "routes/admin.logout.tsx"),
    layout("routes/admin.layout.tsx", [
        ...prefix("admin", [
            route("dashboard",    "routes/admin.dashboard.tsx"),
            route("tickets",      "routes/admin.tickets.tsx"),
            route("tickets/:id",  "routes/admin.tickets.$id.tsx"),
            route("clients",      "routes/admin.clients.tsx"),
        ]),
    ]),
] satisfies RouteConfig;