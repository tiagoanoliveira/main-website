// app/components/ui/ProjectStatusBadge.tsx
const STATUS_MAP = {
    completed:   { label: "Concluído",      className: "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" },
    in_progress: { label: "Em construção",  className: "bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400" },
    maintenance: { label: "Em remodelação", className: "bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400" },
    archived:    { label: "Arquivado",      className: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" },
} as const;

export type ProjectStatus = keyof typeof STATUS_MAP;

export default function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
    const { label, className } = STATUS_MAP[status] ?? STATUS_MAP.completed;
    return (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${className}`}>
            {label}
        </span>
    );
}
