import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface HeroMascotProps {
    className?: string;
}

export const HeroMascot = ({ className }: HeroMascotProps) => {
    const [processedLogo, setProcessedLogo] = useState<string>("/hero-logo.png");

    useEffect(() => {
        const img = new Image();
        img.src = "/hero-logo.png";
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Remove white background (pixels near white)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                // If it's very bright (near white), make it transparent
                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0;
                }
            }
            ctx.putImageData(imageData, 0, 0);

            // Auto-crop logic: find bounding box
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
            let found = false;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    if (data[(y * canvas.width + x) * 4 + 3] > 0) {
                        minX = Math.min(minX, x); minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
                        found = true;
                    }
                }
            }

            if (found) {
                const croppedWidth = maxX - minX + 1;
                const croppedHeight = maxY - minY + 1;
                const cropCanvas = document.createElement("canvas");
                cropCanvas.width = croppedWidth;
                cropCanvas.height = croppedHeight;
                const cropCtx = cropCanvas.getContext("2d");
                if (cropCtx) {
                    cropCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
                    setProcessedLogo(cropCanvas.toDataURL());
                }
            }
        };
    }, []);

    return (
        <div className={cn("relative group cursor-pointer flex items-center justify-center", className)}>
            {/* Background Glow - Cyan and Coral mix */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-mascot/20 blur-[60px] rounded-full scale-150 group-hover:scale-[1.8] group-hover:bg-mascot/40 transition-all duration-700" />

            {/* The Claw Image with Professional Animations */}
            <div className="relative w-full h-full animate-hero-glow group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out">
                <img
                    src={processedLogo}
                    alt="ClawMemory Claw Logo"
                    className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(229,77,71,0.5)] group-hover:drop-shadow-[0_0_35px_rgba(0,255,209,0.4)] transition-all duration-500"
                />
            </div>
        </div>
    );
};
