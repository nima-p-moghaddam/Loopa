"use client";

import { Shield } from "lucide-react";

export default function PrivacySettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">حریم خصوصی</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    تنظیمات حریم خصوصی
                </p>
            </div>

            <div className="border rounded-2xl p-12 text-center space-y-2">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                    تنظیمات حریم خصوصی به زودی اضافه می‌شه
                </p>
            </div>
        </div>
    );
}