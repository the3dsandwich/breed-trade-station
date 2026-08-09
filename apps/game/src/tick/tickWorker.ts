export type TickCommand =
  | { type: "START"; lastSavedAt: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "SET_SPEED"; multiplier: number };

export type TickEvent =
  | { type: "TICK"; delta: number; now: number }
  | { type: "CATCHUP"; elapsed: number }
  | { type: "SAVE" };

const TICK_INTERVAL_MS = 1000;
const SAVE_EVERY_N_TICKS = 30;

let intervalId: ReturnType<typeof setInterval> | undefined;
let speed = 1;
let lastTickAt = Date.now();
let paused = false;
let tickCount = 0;

const emit = (event: TickEvent) => {
  postMessage(event);
};

const startLoop = () => {
  lastTickAt = Date.now();
  intervalId = setInterval(() => {
    if (paused) return;

    const now = Date.now();
    const delta = (now - lastTickAt) * speed;
    lastTickAt = now;
    emit({ type: "TICK", delta, now });

    tickCount += 1;
    if (tickCount % SAVE_EVERY_N_TICKS === 0) {
      emit({ type: "SAVE" });
    }
  }, TICK_INTERVAL_MS);
};

onmessage = (e: MessageEvent) => {
  const command = e.data as TickCommand;

  switch (command.type) {
    case "START": {
      const elapsed = Date.now() - command.lastSavedAt;
      if (elapsed > 0) {
        emit({ type: "CATCHUP", elapsed });
      }
      startLoop();
      break;
    }
    case "PAUSE":
      paused = true;
      break;
    case "RESUME": {
      const now = Date.now();
      const delta = (now - lastTickAt) * speed;
      lastTickAt = now;
      paused = false;
      emit({ type: "TICK", delta, now });
      break;
    }
    case "STOP":
      if (intervalId) clearInterval(intervalId);
      close();
      break;
    case "SET_SPEED":
      speed = command.multiplier;
      break;
  }
};
