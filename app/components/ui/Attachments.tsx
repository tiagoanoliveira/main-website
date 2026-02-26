// app/components/ui/Attachments.tsx
import { Paperclip, FileText, Image, Trash2, Download } from "lucide-react";
import type { Attachment } from "~/lib/db";

function FileIcon({ type }: { type: string }) {
    if (type.startsWith("image/")) return <Image size={14} className="text-blue-500" />;
    return <FileText size={14} className="text-red-500" />;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
    attachments: Attachment[];
    baseUrl?: string;
    canDelete?: boolean;
    entityType: string;
    entityId: number;
}

export default function Attachments({
                                        attachments,
                                        canDelete = false,
                                        entityType,
                                        entityId,
                                    }: Props) {
    if (attachments.length === 0) return null;

    return (
        <div className="mt-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
                <Paperclip size={12} />
                Anexos ({attachments.length})
            </p>
            <div className="flex flex-wrap gap-2">
                {attachments.map((att) => (
                    <div key={att.id}
                         className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm">
                        <FileIcon type={att.file_type} />
                        <a href={`/uploads/${att.r2_key}`}
                           target="_blank" rel="noopener noreferrer"
                           className="hover:underline text-gray-700 dark:text-gray-300 max-w-[180px] truncate"
                           title={att.file_name}>
                            {att.file_name}
                        </a>
                        <span className="text-xs text-gray-400">{formatSize(att.file_size)}</span>
                        <a href={`/uploads/${att.r2_key}`} download={att.file_name}
                           className="text-gray-400 hover:text-blue-600 transition-colors" title="Download">
                            <Download size={12} />
                        </a>
                        {canDelete && (
                            <form method="post" className="inline">
                                <input type="hidden" name="intent" value="deleteAttachment" />
                                <input type="hidden" name="attachmentId" value={att.id} />
                                <input type="hidden" name="entityType" value={entityType} />
                                <input type="hidden" name="entityId" value={entityId} />
                                <button type="submit" onClick={(e) => !confirm("Remover anexo?") && e.preventDefault()}
                                        className="text-gray-400 hover:text-red-500 transition-colors" title="Remover">
                                    <Trash2 size={12} />
                                </button>
                            </form>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
