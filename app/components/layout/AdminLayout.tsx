import { Link, useLocation, Form } from "react-router";
import {
    LayoutDashboard,
    TicketCheck,
    UserRoundCog,
    FileText,
    LogOut,
} from "lucide-react";

const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/tickets",   label: "Tickets",   icon: TicketCheck },
    { href: "/admin/clients",   label: "Clientes",  icon: UserRoundCog },
    { href: "/admin/invoices",  label: "Faturas",   icon: FileText },
];

interface Props {
    user: { name: string; email: string };
    children: React.ReactNode;
}

export default function AdminLayout({ user, children }: Props) {
    const { pathname } = useLocation();
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <Link to="/admin/dashboard" className="font-bold text-lg text-gray-900 dark:text-white">
                        Painel Admin
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    pathname === item.href
                                        ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                }`}
                            >
                                <Icon size={16} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-3">{user.email}</p>
                    <Form method="post" action="/admin/logout">
                        <button className="w-full flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline">
                            <LogOut size={14} />
                            Terminar sessão
                        </button>
                    </Form>
                </div>
            </aside>

            {/* Conteúdo */}
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
}
