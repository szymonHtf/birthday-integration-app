"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type ScheduleEntry } from "../lib/api";
import { deleteCookie, getCookie, getCookieJson, setCookie } from "../lib/cookies";

export type Identity = {
  member: string;
  team: string;
  teammates: string[];
  schedule: ScheduleEntry[];
};

export const IDENTITY_COOKIES = ["code", "member", "team", "teammates", "schedule"];

export function clearIdentity() {
  IDENTITY_COOKIES.forEach(deleteCookie);
}

/**
 * Who this phone belongs to, from the cookies set by the gate.  On mount the secret
 * code is re-checked with the backend: the draw may have been redone since the guest
 * logged in; if the code no longer resolves to a team the cookies are cleared and the
 * page reloads to the gate.
 */
export function useIdentity(): { identity: Identity | null; refresh: () => Promise<void> } {
  const [identity, setIdentity] = useState<Identity | null>(null);

  const refresh = useCallback(async () => {
    const code = getCookie("code");
    if (!code) return;
    try {
      const { data } = await api.code(code);
      const next: Identity = {
        member: data.member,
        team: data.team ?? data.assigned,
        teammates: data.teammates ?? [],
        schedule: data.schedule ?? [],
      };
      setCookie("member", next.member);
      setCookie("team", next.team);
      setCookie("teammates", JSON.stringify(next.teammates));
      setCookie("schedule", JSON.stringify(next.schedule));
      setIdentity(next);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 409 || e.status === 400)) {
        clearIdentity();
        window.location.reload();
      }
      // network hiccup: keep whatever the cookies say
    }
  }, []);

  useEffect(() => {
    const member = getCookie("member");
    const team = getCookie("team");
    if (member && team) {
      setIdentity({
        member,
        team,
        teammates: getCookieJson<string[]>("teammates") ?? [],
        schedule: getCookieJson<ScheduleEntry[]>("schedule") ?? [],
      });
    }
    refresh();
  }, [refresh]);

  return { identity, refresh };
}
