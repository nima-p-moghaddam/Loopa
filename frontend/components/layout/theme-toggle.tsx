"use client";

import {useSyncExternalStore} from "react";
import {useTheme} from "next-themes";
import {Moon, Sun, Monitor} from "lucide-react";
import {Button} from "@/components/ui/button";

const subscribe = () => () => {
};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
    const {theme, setTheme} = useTheme();
    const mounted = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" disabled>
                <Sun className="h-5 w-5"/>
            </Button>
        );
    }

    const cycleTheme = () => {
        if (theme === "light") setTheme("dark");
        else if (theme === "dark") setTheme("system");
        else setTheme("light");
    };

    const getIcon = () => {
        if (theme === "dark") return <Moon className="h-5 w-5"/>;
        if (theme === "light") return <Sun className="h-5 w-5"/>;
        return <Monitor className="h-5 w-5"/>;
    };

    const getTitle = () => {
        if (theme === "dark") return "تم تاریک — کلیک برای سیستم";
        if (theme === "light") return "تم روشن — کلیک برای تاریک";
        return "تم سیستم — کلیک برای روشن";
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            title={getTitle()}
            aria-label={getTitle()}
        >
            {getIcon()}
        </Button>
    );
}