// app/routes/portal.layout.tsx
import { redirect, Outlet, useLoaderData, Form, Link, useLocation } from "react-router";
import type { Route } from "./+types/portal.layout";
import { getSessionUser } from "~/lib/auth.server";
import { LayoutDashboard, TicketCheck, FileText, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = await getSessionUser(context.cloudflare.env.DB, request);
    if (!user || user.role !== "client") throw redirect("/portal");
    return { user };
}

export default function PortalLayout() {
    const { user }     = useLoaderData<typeof loader>();
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);

    const nav = [
        { href: "/portal/dashboard", label: "Dashboard",  icon: LayoutDashboard },
        { href: "/portal/invoices",  label: "Faturas",    icon: FileText },
        { href: "/portal/tickets",   label: "Tickets",    icon: TicketCheck },
    ];

    const SidebarContent = () => (
        <>
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <Link
                    to="/portal/dashboard"
                    className="font-bold text-gray-900 dark:text-white"
                    onClick={() => setOpen(false)}
                >
                    Portal Cliente
                </Link>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="md:hidden p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                    <X size={18} />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {nav.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        to={href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            pathname === href
                                ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                    >
                        <Icon size={16} />
                        {label}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate mb-3">{user.email}</p>
                <Form method="post" action="/portal/logout">
                    <button className="flex items-center gap-2 text-sm text-red-500 hover:underline">
                        <LogOut size={13} /> Terminar sessão
                    </button>
                </Form>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950">

            {/* Overlay mobile */}
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 md:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sidebar desktop */}
            <aside className="hidden md:flex w-60 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col">
                <SidebarContent />
            </aside>

            {/* Drawer mobile */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-200 md:hidden ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <SidebarContent />
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top bar mobile */}
                <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Abrir menu"
                    >
                        <Menu size={20} />
                    </button>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">Portal Cliente</span>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
