import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { CheckCircle } from "lucide-react";
import { useEffect } from "react";

function useThemeParam() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const theme  = params.get("theme");
        if (theme === "light" || theme === "dark") {
            document.documentElement.setAttribute("data-theme", theme);
        } else {
            document.documentElement.removeAttribute("data-theme");
        }
    }, []);
}

export default function SupportSuccess() {
    const [params] = useSearchParams();
    const ticketId = params.get("ticket");
    const showBg   = params.get("bg") !== "false" && params.get("bg") !== "0";

    useThemeParam();

    return (
        <div className={`${
            showBg
                ? "min-h-screen bg-gray-50 dark:bg-gray-950"
                : ""
        } flex items-center justify-center px-4 py-12`}>
            <motion.div
                className="text-center max-w-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
                    className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-950 rounded-full mb-6"
                >
                    <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
                </motion.div>

                <h1 className="text-2xl font-bold mb-3">Pedido enviado!</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                    O teu pedido de suporte{ticketId ? ` #${ticketId}` : ""} foi registado com sucesso.
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                    Recebeste um email de confirmação com o link para acompanhar o progresso.
                </p>
            </motion.div>
        </div>
    );
}
