"use client";

import { useEffect, useState } from "react";
import { api, type GameState } from "../lib/api";
import { useIdentity } from "./useIdentity";
import Quiz from "./Quiz";
import QuestHub from "./QuestHub";
import Finale from "./Finale";

const POLL_MS = 3000;

/** The guest's phone after the gate: shows whatever the host has opened (quiz → quests → finale). */
export default function PartyStage() {
  const { identity } = useIdentity();
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const next = await api.state();
        if (alive) setState(next);
      } catch (e) {
        console.error("State poll failed:", e);
      }
    };
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  if (!identity || !state) {
    return <p className="animate-pulse text-zinc-400">Wywołuję duchy… 👻</p>;
  }

  if (state.stage === "quests") return <QuestHub identity={identity} quests={state.quests} />;
  if (state.stage === "finished") return <Finale identity={identity} />;
  return <Quiz identity={identity} />;
}
