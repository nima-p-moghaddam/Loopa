"use client";

interface StoryProgressProps {
    total: number;
    current: number;
    isPaused?: boolean;
    duration?: number;
}

export function StoryProgress({ total, current, isPaused, duration = 5000 }: StoryProgressProps) {
    return (
        <div className="absolute top-0 inset-x-0 z-40 flex gap-1 p-2">
            {Array.from({ length: total }).map((_, index) => {
                const isPast = index < current;
                const isCurrent = index === current;

                return (
                    <div
                        key={index}
                        className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden"
                    >
                        <div
                            className="h-full w-full bg-white origin-left"
                            style={{
                                // استوری‌های قبلی کاملاً پر، بقیه صفر
                                transform: isPast ? "scaleX(1)" : "scaleX(0)",
                                // فقط استوری فعلی انیمیشن داره
                                animation: isCurrent ? `story-progress-bar ${duration}ms linear forwards` : "none",
                                // متوقف کردن انیمیشن دقیقاً در همان لحظه
                                animationPlayState: isPaused ? "paused" : "running",
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}