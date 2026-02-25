import { Link, useLocation } from "react-router";

export default function Navbar() {
    const location = useLocation();

    const links = [
        { href: "/", label: "Início" },
        { href: "/#sobre", label: "Sobre" },
        { href: "/#portfolio", label: "Portfólio" },
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
                </ul>
            </nav>
        </header>
    );
}
