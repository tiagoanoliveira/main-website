import { motion, useInView } from "motion/react";
import { useRef } from "react";

interface Props {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: "up" | "left" | "right" | "none";
}

export default function AnimatedSection({
                                            children,
                                            className = "",
                                            delay = 0,
                                            direction = "up",
                                        }: Props) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    const initial = {
        up:    { opacity: 0, y: 48 },
        left:  { opacity: 0, x: -48 },
        right: { opacity: 0, x: 48 },
        none:  { opacity: 0 },
    }[direction];

    return (
        <motion.div
            ref={ref}
            className={className}
            initial={initial}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
            transition={{ duration: 0.65, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
            {children}
        </motion.div>
    );
}
