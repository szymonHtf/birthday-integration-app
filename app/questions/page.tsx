"use client";
import { useEffect, useState } from "react";
import SpookyGate from "./SpookyGate";
import Quiz from "./Quiz";

function getCookie(name: string) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

export default function Home() {
    const [hasTeam, setHasTeam] = useState<boolean | null>(null);

    useEffect(() => {
        const team = getCookie("teammate");
        setHasTeam(!!team);
    }, []);

    if (hasTeam === null) return null;

    return (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen pb-20">
            <main className="flex flex-col gap-[32px] row-start-2 items-center">
                {!hasTeam && <SpookyGate />}
                {hasTeam && <Quiz />}
            </main>
        </div>
    );
}