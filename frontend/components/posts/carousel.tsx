"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMediaUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PostImage } from "@/types/post";

interface CarouselProps {
    images: PostImage[];
    alt: string;
    priority?: boolean;
    className?: string;
}

export function Carousel({
    images,
    alt,
    priority = false,
    className,
}: CarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    if (images.length === 0) return null;

    const goTo = (index: number) => {
        setCurrentIndex(Math.max(0, Math.min(index, images.length - 1)));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        goTo(currentIndex + 1);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        goTo(currentIndex - 1);
    };

    const handleDotClick = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        goTo(index);
    };

    // 👇 افزودن قابلیت Swipe با لمس (برای موبایل)
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        touchEndX.current = e.changedTouches[0].clientX;

        const distance = touchStartX.current - touchEndX.current;

        // اگر بیش از ۵۰ پیکسل کشیده شد، اسلاید عوض شود
        if (distance > 50) {
            goTo(currentIndex + 1); // Swipe به چپ
        } else if (distance < -50) {
            goTo(currentIndex - 1); // Swipe به راست
        }

        touchStartX.current = null;
        touchEndX.current = null;
    };

    return (
        <div
            dir="ltr"
            className={cn(
                "relative w-full overflow-hidden bg-black/5",
                className
            )}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: "pan-y" }} // اجازه اسکرول عمودی، مدیریت افقی با ما
        >
            {/* Track (ریل اسلایدها) */}
            <div
                className="flex transition-transform duration-300 ease-out h-full"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {images.map((img, idx) => (
                    <div
                        key={idx}
                        className="w-full shrink-0 flex items-center justify-center"
                    >
                        <Image
                            src={getMediaUrl(img.image) || ""}
                            alt={`${alt} ${idx}`}
                            width={1080}
                            height={1080}
                            className="w-full h-auto max-h-[80vh] object-contain select-none pointer-events-none"
                            sizes="(max-width: 640px) 100vw, 600px"
                            priority={priority && idx === 0}
                            loading={priority && idx === 0 ? "eager" : "lazy"}
                            // 👆 pointer-events-none برای جلوگیری از تداخل کشیدن عکس با درگ کردن
                        />
                    </div>
                ))}
            </div>

            {/* Nav buttons */}
            {images.length > 1 && (
                <>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handlePrev}
                        onDoubleClick={(e) => e.stopPropagation()} // جلوگیری از لایک شدن با دابل کلیک
                        disabled={currentIndex === 0}
                        className={cn(
                            "absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full",
                            "bg-black/50 hover:bg-black/70 text-white transition-transform active:scale-95 z-20",
                            "disabled:opacity-30 disabled:cursor-not-allowed"
                        )}
                        aria-label="عکس قبلی"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleNext}
                        onDoubleClick={(e) => e.stopPropagation()}
                        disabled={currentIndex === images.length - 1}
                        className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full",
                            "bg-black/50 hover:bg-black/70 text-white transition-transform active:scale-95 z-20",
                            "disabled:opacity-30 disabled:cursor-not-allowed"
                        )}
                        aria-label="عکس بعدی"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                        {images.map((_, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={(e) => handleDotClick(e, index)}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    index === currentIndex
                                        ? "w-6 bg-white"
                                        : "w-1.5 bg-white/50 hover:bg-white/80"
                                )}
                                aria-label={`عکس ${index + 1}`}
                            />
                        ))}
                    </div>

                    {/* Counter */}
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-medium tabular-nums z-20">
                        {currentIndex + 1}/{images.length}
                    </div>
                </>
            )}
        </div>
    );
}