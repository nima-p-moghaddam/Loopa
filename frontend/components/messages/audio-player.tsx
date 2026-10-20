"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn, getMediaUrl } from "@/lib/utils";
import { formatDuration } from "@/lib/audio";

interface AudioPlayerProps {
    src: string | null;
    duration: number | null;
    isOwn: boolean;
}

export function AudioPlayer({ src, duration, isOwn }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration ?? 0);

    const url = getMediaUrl(src);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        function handleLoaded() {
            const d = audio!.duration;
            if (isFinite(d) && d > 0) {
                setTotalDuration(Math.round(d));
            }
        }

        function handleTimeUpdate() {
            setCurrentTime(audio!.currentTime);
        }

        function handleEnded() {
            setIsPlaying(false);
            setCurrentTime(0);
            audio!.currentTime = 0;
        }

        audio.addEventListener("loadedmetadata", handleLoaded);
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("loadedmetadata", handleLoaded);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
        };
    }, []);

    function togglePlay() {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    }

    function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
        const audio = audioRef.current;
        if (!audio || !totalDuration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        // RTL: click on right = start, click on left = end
        const ratio = 1 - (e.clientX - rect.left) / rect.width;
        const newTime = ratio * totalDuration;
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    }

    const progress = totalDuration > 0
        ? (currentTime / totalDuration) * 100
        : 0;

    return (
        <div className="flex items-center gap-2.5 min-w-[200px]">
            <audio ref={audioRef} src={url ?? undefined} preload="metadata" />

            <button
                type="button"
                onClick={togglePlay}
                className={cn(
                    "h-9 w-9 rounded-full shrink-0 flex items-center justify-center transition-colors",
                    isOwn
                        ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                aria-label={isPlaying ? "توقف" : "پخش"}
            >
                {isPlaying ? (
                    <Pause className="h-4 w-4" />
                ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                )}
            </button>

            <div className="flex-1 min-w-0 space-y-1">
                {/* Seek bar */}
                <div
                    onClick={handleSeek}
                    className="h-1 rounded-full bg-current/20 cursor-pointer overflow-hidden"
                    role="slider"
                    aria-label="نوار پخش"
                    aria-valuemin={0}
                    aria-valuemax={totalDuration}
                    aria-valuenow={currentTime}
                >
                    <div
                        className="h-full bg-current transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Time */}
                <div className="text-[10px] opacity-70 tabular-nums">
                    {formatDuration(currentTime)} / {formatDuration(totalDuration)}
                </div>
            </div>
        </div>
    );
}