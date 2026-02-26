// app/lib/storage.ts

const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export interface UploadResult {
    r2Key: string;
    fileName: string;
    fileType: string;
    fileSize: number;
}

export function buildR2Key(
    entityType: "ticket" | "ticket_message" | "invoice" | "site_logo",
    entityId: number,
    fileName: string
): string {
    const ext = fileName.split(".").pop() ?? "bin";
    const uid = crypto.randomUUID().replace(/-/g, "");
    return `${entityType}/${entityId}/${uid}.${ext}`;
}

export async function uploadFile(
    bucket: R2Bucket,
    key: string,
    file: File
): Promise<void> {
    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(`Tipo de ficheiro não permitido: ${file.type}`);
    }
    if (file.size > MAX_SIZE_BYTES) {
        throw new Error(`O ficheiro não pode exceder ${MAX_SIZE_MB}MB.`);
    }
    const buffer = await file.arrayBuffer();
    await bucket.put(key, buffer, {
        httpMetadata: { contentType: file.type },
        customMetadata: { originalName: file.name },
    });
}

export async function deleteFile(
    bucket: R2Bucket,
    key: string
): Promise<void> {
    await bucket.delete(key);
}

// URL pública (só funciona se o bucket for público)
export function getPublicUrl(baseUrl: string, r2Key: string): string {
    return `${baseUrl}/uploads/${r2Key}`;
}
