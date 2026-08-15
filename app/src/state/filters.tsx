import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { EventType, Game } from "../types";

interface FiltersState {
  games: Game[];
  types: EventType[];
  toggleGame: (game: Game) => void;
  toggleType: (type: EventType) => void;
}

const FiltersContext = createContext<FiltersState | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [types, setTypes] = useState<EventType[]>([]);

  const value = useMemo<FiltersState>(
    () => ({
      games,
      types,
      toggleGame: (game) =>
        setGames((prev) => (prev.includes(game) ? prev.filter((g) => g !== game) : [...prev, game])),
      toggleType: (type) =>
        setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type])),
    }),
    [games, types]
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersState {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within a FiltersProvider");
  return ctx;
}
