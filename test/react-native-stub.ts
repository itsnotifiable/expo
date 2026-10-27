function passthrough({
  children,
}: {
  readonly children?: unknown;
}): unknown {
  return children ?? null;
}

export const View = passthrough;
export const Text = passthrough;
export const Pressable = passthrough;
export const Image = (): null => null;

export const Platform: { OS: string; Version: string } = {
  OS: "ios",
  Version: "18.0",
};

export const NativeModules = {};

export const StyleSheet = {
  create: (styles: unknown): unknown => styles,
};

export const PanResponder = {
  create: (): { panHandlers: Record<string, never> } => ({ panHandlers: {} }),
};

export const Animated = {
  View: passthrough,
  ValueXY: class ValueXY {
    setValue(): void {
      return undefined;
    }
    stopAnimation(): void {
      return undefined;
    }
  },
  Value: class Value {
    setValue(): void {
      return undefined;
    }
    interpolate(): number {
      return 0;
    }
  },
  spring: (): { start: () => void } => ({
    start: () => undefined,
  }),
  timing: (): {
    start: (callback?: (result: { finished: boolean }) => void) => void;
    stop: () => void;
  } => ({
    start: (callback?: (result: { finished: boolean }) => void) => {
      callback?.({ finished: true });
    },
    stop: () => undefined,
  }),
};

export const linking = {
  settingsOpened: 0,
};

export const Linking = {
  openURL: (): Promise<void> => Promise.resolve(),
  openSettings: (): Promise<void> => {
    linking.settingsOpened += 1;
    return Promise.resolve();
  },
};

export const AppState = {
  currentState: "active",
  addEventListener: (): { remove: () => void } => ({
    remove: () => undefined,
  }),
};

export function useWindowDimensions(): {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
} {
  return {
    width: 390,
    height: 844,
    scale: 2,
    fontScale: 1,
  };
}

export class NativeEventEmitter {
  addListener(): { remove(): void } {
    return { remove: () => undefined };
  }
}
