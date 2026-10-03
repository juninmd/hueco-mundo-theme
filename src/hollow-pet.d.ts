// Tipos do <hollow-pet>. Para React/TSX, veja o trecho no README (aumenta JSX.IntrinsicElements).
export type HollowPetCorner = "br" | "bl" | "tr" | "tl";
export type HollowPetMode = "idle" | "happy" | "eating" | "charging" | "firing" | "aiming" | "sleeping" | "dragging" | "yawn";

export interface HollowPetStats {
  reiatsu: number;
  bond: number;
  corner: HollowPetCorner;
  hidden: boolean;
  seen: boolean;
  stage: 1 | 2 | 3;
  mode: HollowPetMode;
}

export interface HollowPetEventDetail {
  stage: 1 | 2 | 3;
  bond: number;
  reiatsu: number;
}

export interface HollowPetElement extends HTMLElement {
  readonly stats: HollowPetStats;
  /** Carinho: coração, vínculo +1. */
  pet(): void;
  /** Alimentar: +26 de reiatsu, vínculo +2. */
  feed(): void;
  /** Dispara o Cero (gasta 12 de reiatsu). Sem alvo, mira no centro da tela. */
  cero(opts?: { x?: number; y?: number; power?: number }): void;
  /** Abre a mira para escolher o alvo com um clique. */
  aim(): void;
  sleep(): void;
  wake(silent?: boolean): void;
  say(text: string, ms?: number): void;
  dock(corner: HollowPetCorner, animate?: boolean): void;
  reset(): void;
  setStage(stage: 1 | 2 | 3): void;
  setStats(stats: { reiatsu?: number; bond?: number }): void;
  setMode(mode: HollowPetMode): void;
}

export interface HollowPetConstructor {
  new (): HollowPetElement;
  /** Cria um <hollow-pet> no body. */
  mount(attrs?: Partial<Record<"corner" | "size" | "name" | "lang" | "tint" | "shake" | "no-persist", string>>): HollowPetElement;
}

declare global {
  interface HTMLElementTagNameMap {
    "hollow-pet": HollowPetElement;
  }
  interface HTMLElementEventMap {
    "hollow-pet:pet": CustomEvent<HollowPetEventDetail>;
    "hollow-pet:feed": CustomEvent<HollowPetEventDetail>;
    "hollow-pet:cero": CustomEvent<HollowPetEventDetail>;
    "hollow-pet:sleep": CustomEvent<HollowPetEventDetail>;
    "hollow-pet:wake": CustomEvent<HollowPetEventDetail>;
    "hollow-pet:levelup": CustomEvent<HollowPetEventDetail>;
  }
  interface Window {
    HollowPet: HollowPetConstructor;
  }
}
