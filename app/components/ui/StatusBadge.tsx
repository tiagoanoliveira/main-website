type Status = "open" | "in_progress" | "closed" | "pending" | "paid";

const styles: Record<Status, string> = {
    open:        "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400",
    in_progress: "bg-blue-50   dark:bg-blue-950/30   text-blue-700   dark:text-blue-400",
    closed:      "bg-green-50  dark:bg-green-950/30  text-green-700  dark:text-green-400",
    pending:     "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400",
    paid:        "bg-green-50  dark:bg-green-950/30  text-green-700  dark:text-green-400",
};

const labels: Record<Status, string> = {
    open:        "Aberto",
    in_progress: "Em progresso",
    closed:      "Fechado",
    pending:     "Pendente",
    paid:        "Pago",
};

export default function StatusBadge({ status }: { status: string }) {
    const s = status as Status;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[s] ?? "bg-gray-100 text-gray-600"}`}>
      {labels[s] ?? status}
    </span>
    );
}
