"use client";
import { useEffect, useState } from "react";
import SpookyGate from "./SpookyGate";
import PartyStage from "./PartyStage";
import { getCookie } from "../lib/cookies";

export default function Home() {
  const [hasTeam, setHasTeam] = useState<boolean | null>(null);

  useEffect(() => {
    setHasTeam(!!getCookie("member") && !!getCookie("team"));
  }, []);

  if (hasTeam === null) return null;

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen bg-black pb-20">
      <main className="flex flex-col row-start-2 items-center w-full">
        {!hasTeam && <SpookyGate />}
        {hasTeam && <PartyStage />}
      </main>
    </div>
  );
}
