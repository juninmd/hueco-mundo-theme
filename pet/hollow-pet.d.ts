// Tipos do <hollow-pet>. Para React/TSX, veja o trecho no README (aumenta JSX.IntrinsicElements).
export type HollowPetCorner = "br" | "bl" | "tr" | "tl";
export type HollowPetMode = "idle" | "happy" | "eating" | "charging" | "firing" | "aiming" | "sleeping" | "dragging" | "yawn";
export type HollowPetMood = "happy" | "excited" | "worried" | "sad" | "calm";

export interface HollowPetStats {
  reiatsu: number;
  bond: number;
  corner: HollowPetCorner;
  hidden: boolean;
  seen: boolean;
  stage: 1 | 2 | 3;
  mode: HollowPetMode;
}

/** O que vale guardar. Salve onde quiser e devolva com `restore()`. */
export interface HollowPetState {
  v: 1;
  reiatsu: number;
  bond: number;
  corner: HollowPetCorner;
  hidden: boolean;
  seen: boolean;
  /** Quando foi guardado (ms desde 1970): o reiatsu cai um pouco pelo tempo que o bicho ficou sozinho. */
  t: number;
}

export interface HollowPetEventDetail {
  stage: 1 | 2 | 3;
  bond: number;
  reiatsu: number;
}

export interface HollowPetElement extends HTMLElement {
  readonly stats: HollowPetStats;
  readonly mode: HollowPetMode;

  /** Carinho: coração, vínculo +1. */
  pet(): void;
  /** Alimentar: +26 de reiatsu, vínculo +2. */
  feed(): void;
  /** Dispara o Cero (gasta 12 de reiatsu). Sem alvo, mira no centro da tela. Alvos fora da tela valem. */
  cero(opts?: { x?: number; y?: number; power?: number }): void;
  /** Abre a mira para escolher o alvo com um clique. */
  aim(): void;
  sleep(): void;
  wake(silent?: boolean): void;
  /** Fala no balão por `ms` milissegundos (0 deixa até a próxima fala). Texto vazio apaga o balão. */
  say(text: string, ms?: number): void;
  dock(corner: HollowPetCorner, animate?: boolean): void;
  reset(): void;
  /** Esconde o bichinho (sobra só o botão de chamar de volta). */
  hide(): void;
  show(): void;

  /** Olha para (x, y), cada um de -1 a 1, por `ms` milissegundos, no lugar do cursor. `look(null)` volta a seguir o cursor. */
  look(x: number | null, y?: number, ms?: number): void;
  /** Humor passageiro. Com `text`, o balão fala (texto vazio fica calado); sem ele, o pet escolhe uma fala. */
  mood(kind: HollowPetMood, text?: string): void;
  /** Comemoração: corações e um Cero para cima, que não gasta reiatsu. */
  celebrate(text?: string): void;
  /** Alimenta em silêncio com uma fração de reiatsu (por exemplo, um pouco por tecla digitada). */
  nibble(amount?: number): void;

  /** O que vale guardar. Também sai no evento `hollow-pet:state`. */
  getState(): HollowPetState;
  /** Devolve um estado guardado por `getState()`. Devolve `false` se o formato não for reconhecido. */
  restore(state: HollowPetState | null | undefined): boolean;

  setStage(stage: 1 | 2 | 3): void;
  setStats(stats: { reiatsu?: number; bond?: number }): void;
  setMode(mode: HollowPetMode): void;
}

export interface HollowPetConstructor {
  new (): HollowPetElement;
  /** Cria um <hollow-pet> no body. */
  mount(
    attrs?: Partial<
      Record<
        | "corner"
        | "size"
        | "margin"
        | "name"
        | "lang"
        | "tint"
        | "shake"
        | "chatter"
        | "sleep-after"
        | "storage-key"
        | "no-persist"
        | "no-hello"
        | "inline"
        | "static",
        string
      >
    >
  ): HollowPetElement;
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
    "hollow-pet:state": CustomEvent<HollowPetState>;
  }
  interface Window {
    HollowPet: HollowPetConstructor;
  }
}
