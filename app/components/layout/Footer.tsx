export default function Footer() {
    return (
        <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-16">
            <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} Tiago Oliveira · Técnico de Informática
            </div>
        </footer>
    );
}
