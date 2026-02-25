import { Mail, Linkedin } from "lucide-react";
import { motion } from "motion/react";

export default function Footer() {
    return (
        <footer className="border-t border-gray-200 dark:border-gray-800 py-10 mt-16">
            <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-6">

                {/* Botões de contacto */}
                <div className="flex items-center gap-3">
                    <motion.a
                        href="mailto:geral@tiagoanoliveira.pt"
                        whileHover={{ scale: 1.07 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-colors"
                    >
                        <Mail size={16} />
                        geral@tiagoanoliveira.pt
                    </motion.a>

                    <motion.a
                        href="https://linkedin.com/in/tiagoanoliveira"
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.07 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-colors"
                    >
                        <Linkedin size={16} />
                        LinkedIn
                    </motion.a>
                </div>

                {/* Copyright */}
                <p className="text-sm text-gray-400 dark:text-gray-600">
                    © {new Date().getFullYear()} Tiago Oliveira · Engenheiro Informático
                </p>

            </div>
        </footer>
    );
}
