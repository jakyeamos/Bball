type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const debugEnabled =
  import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true';

function write(level: LogLevel, namespace: string, message: string, data?: unknown): void {
  if (!debugEnabled && level !== 'warn' && level !== 'error') return;

  const prefix = `[${namespace}] ${message}`;
  if (data === undefined) {
    console[level](prefix);
    return;
  }

  console[level](prefix, data);
}

export function createLogger(namespace: string) {
  return {
    debug: (message: string, data?: unknown) => write('debug', namespace, message, data),
    info: (message: string, data?: unknown) => write('info', namespace, message, data),
    warn: (message: string, data?: unknown) => write('warn', namespace, message, data),
    error: (message: string, data?: unknown) => write('error', namespace, message, data),
  };
}
