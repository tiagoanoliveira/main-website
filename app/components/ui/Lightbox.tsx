// app/components/ui/Lightbox.tsx
import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
    images: string[];
    index: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}

export default function Lightbox({ images, index, onClose, onPrev, onNext }: Props) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape")     onClose();
            if (e.key === "ArrowLeft")  onPrev();
            if (e.key === "ArrowRight") onNext();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, onPrev, onNext]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Fechar */}
            <button
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                onClick={onClose}
            >
                <X size={22} />
            </button>

            {/* Anterior */}
            {images.length > 1 && (
                <button
                    className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                >
                    <ChevronLeft size={26} />
                </button>
            )}

            {/* Imagem */}
            <img
                src={images[index]}
                alt=""
                className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
            />

            {/* Seguinte */}
            {images.length > 1 && (
                <button
                    className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                >
                    <ChevronRight size={26} />
                </button>
            )}

            {/* Contador */}
            {images.length > 1 && (
                <span className="absolute bottom-4 text-white/60 text-sm">
                    {index + 1} / {images.length}
                </span>
            )}
        </div>
    );
}
