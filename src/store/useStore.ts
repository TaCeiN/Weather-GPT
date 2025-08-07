import { create } from 'zustand';

export type City = { name: string; country?: string; lat: number; lon: number };

type State = {
  mainCity: City | null;
  favorites: City[];
};

type Actions = {
  hydrate: () => void;
  setMainCity: (c: City) => void;
  addFavorite: (c: City) => void;
  removeFavorite: (index: number) => void;
  setMainFromFavorite: (index: number) => void;
};

const LS_KEY = 'weather_gpt_state_v1';

export const useAppStore = create<State & Actions>((set, get) => ({
  mainCity: null,
  favorites: [],

  hydrate: () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          mainCity: parsed.mainCity ?? null,
          favorites: Array.isArray(parsed.favorites) ? parsed.favorites.slice(0, 3) : []
        });
      }
    } catch {}
  },

  setMainCity: (c) => {
    set({ mainCity: c });
    const { favorites } = get();
    persist({ mainCity: c, favorites });
  },

  addFavorite: (c) => {
    const { favorites, mainCity } = get();
    const exists = favorites.some((f) => f.lat === c.lat && f.lon === c.lon);
    if (exists) return;
    const next = [...favorites, c].slice(0, 3);
    set({ favorites: next });
    persist({ mainCity, favorites: next });
  },

  removeFavorite: (index) => {
    const { favorites, mainCity } = get();
    const next = favorites.filter((_, i) => i !== index);
    set({ favorites: next });
    persist({ mainCity, favorites: next });
  },

  setMainFromFavorite: (index) => {
    const { favorites } = get();
    const c = favorites[index];
    if (!c) return;
    get().setMainCity(c);
  }
}));

function persist(state: { mainCity: City | null; favorites: City[] }) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}
