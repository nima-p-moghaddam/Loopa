"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { MAX_AUDIO_DURATION, getSupportedAudioMimeType } from "@/lib/audio";

interface RecordingResult {
    blob: Blob;
    duration: number;
    mimeType: string;
}

interface UseAudioRecorderReturn {
    isRecording: boolean;
    duration: number;
    start: () => Promise<void>;
    stop: () => void;
    cancel: () => void;
    error: string | null;
}

export function useAudioRecorder(
    onComplete: (result: RecordingResult) => void,
): UseAudioRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const stoppedByUserRef = useRef<boolean>(false);
    const cancelledRef = useRef<boolean>(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setIsRecording(false);
        setDuration(0);
    }, []);

    const start = useCallback(async () => {
        setError(null);

        const mimeType = getSupportedAudioMimeType();
        if (!mimeType) {
            setError("مرورگرت از ضبط صدا پشتیبانی نمی‌کنه");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            streamRef.current = stream;

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];
            cancelledRef.current = false;
            stoppedByUserRef.current = false;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                if (cancelledRef.current) {
                    cleanup();
                    return;
                }

                const elapsed = (Date.now() - startTimeRef.current) / 1000;
                const blob = new Blob(chunksRef.current, { type: mimeType });

                if (blob.size > 0) {
                    onComplete({
                        blob,
                        duration: Math.max(1, Math.round(elapsed)),
                        mimeType,
                    });
                }

                cleanup();
            };

            recorder.start();
            startTimeRef.current = Date.now();
            setIsRecording(true);
            setDuration(0);

            timerRef.current = window.setInterval(() => {
                const elapsed = Math.floor(
                    (Date.now() - startTimeRef.current) / 1000
                );
                setDuration(elapsed);

                // auto-stop at max duration
                if (elapsed >= MAX_AUDIO_DURATION) {
                    stoppedByUserRef.current = true;
                    mediaRecorderRef.current?.stop();
                }
            }, 200);
        } catch (err) {
            console.error("Audio recording error:", err);
            setError("دسترسی به میکروفون ممکن نشد");
            cleanup();
        }
    }, [cleanup, onComplete]);

    const stop = useCallback(() => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
        ) {
            stoppedByUserRef.current = true;
            mediaRecorderRef.current.stop();
        }
    }, []);

    const cancel = useCallback(() => {
        cancelledRef.current = true;
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
        ) {
            mediaRecorderRef.current.stop();
        } else {
            cleanup();
        }
    }, [cleanup]);

    return { isRecording, duration, start, stop, cancel, error };
}