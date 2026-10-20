"use client";

import { Check, Trash2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration, MAX_AUDIO_DURATION } from "@/lib/audio";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
    duration: number;
    onStop: () => void;
    onCancel: () => void;
}

export function AudioRecorder({ duration, onStop, onCancel }: AudioRecorderProps) {
    const progress = (duration / MAX_AUDIO_DURATION) * 100;

    return (
        <div className="flex items-center gap-2 flex-1 bg-muted rounded-full px-3 py-1.5">
            {/* Cancel */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 shrink-0"
                aria-label="لغو ضبط"
            >
                <Trash2 className="h-4 w-4" />
            </Button>

            {/* Pulsing dot + timer */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                </span>

                <span className="text-sm font-medium tabular-nums shrink-0">
                    {formatDuration(duration)}
                </span>

                {/* Progress bar */}
                <div className="flex-1 h-1 rounded-full bg-foreground/10 overflow-hidden">
                    <div
                        className={cn(
                            "h-full bg-destructive transition-all duration-200",
                            progress >= 95 && "bg-amber-500"
                        )}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Stop + send */}
            <Button
                type="button"
                size="icon"
                onClick={onStop}
                className="h-8 w-8 rounded-full shrink-0"
                aria-label="ارسال"
            >
                <Check className="h-4 w-4" />
            </Button>
        </div>
    );
}