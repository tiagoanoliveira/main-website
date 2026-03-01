// app/components/layout/Navbar.tsx
import { Link } from "react-router";
import { User } from "lucide-react";

interface Props {
    isLoggedIn?: boolean;
}

export default function Navbar({ isLoggedIn = false }: Props) {
    const links = [
        { href: "/",          label: "Início" },
        { href: "/#sobre",    label: "Sobre" },
        { href: "/projects",  label: "Projetos" },
        { href: "/#contacto", label: "Contacto" },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
            <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link to="/" className="font-bold text-lg text-gray-900 dark:text-white">
                    Tiago Oliveira
                </Link>
                <ul className="hidden md:flex items-center gap-6">
                    {links.map((link) => (
                        <li key={link.href}>
                            <a
                                href={link.href}
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                {link.label}
                            </a>
                        </li>
                    ))}
                    <li>
                        <Link
                            to="/portal"
                            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                            <User size={14} />
                            {isLoggedIn ? "Minha Conta" : "Login"}
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
}
