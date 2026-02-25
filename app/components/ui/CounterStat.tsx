import { motion, useInView, useMotionValue, useTransform, animate } from "motion/react";
import { useRef, useEffect } from "react";

interface Props {
    value: string;   // ex: "20+"
    label: string;
}

export default function CounterStat({ value, label }: Props) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    const numeric = parseInt(value.replace(/\D/g, ""));
    const suffix = value.replace(/[0-9]/g, "");
    const count = useMotionValue(0);
    const rounded = useTransform(count, (v) => Math.round(v));

    useEffect(() => {
        if (isInView) {
            animate(count, numeric, { duration: 1.8, ease: "easeOut" });
        }
    }, [isInView, count, numeric]);

    return (
        <div
            ref={ref}
            className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center"
        >
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                <motion.span>{rounded}</motion.span>
                <span>{suffix}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        </div>
    );
}
