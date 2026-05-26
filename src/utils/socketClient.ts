import { io, type Socket } from "socket.io-client";

/** Live WebSocket host (same origin as API; path derived in parseSocketIoConfig). */
export const LIVE_SOCKET_WS_URL = "wss://api.bestinfra.app/tgnpdcl/api";

export type SocketIoConnectionConfig = {
    url: string;
    path: string;
};

/** Parse VITE_SOCKET_URL for socket.io-client (REST …/api URLs map to …/socket.io). */
export function parseSocketIoConfig(raw?: string): SocketIoConnectionConfig {
    const value = (raw?.trim() || LIVE_SOCKET_WS_URL).trim();

    const explicitPath =
        typeof import.meta.env.VITE_SOCKET_IO_PATH === "string"
            ? import.meta.env.VITE_SOCKET_IO_PATH.trim()
            : "";

    const normalized = value
        .replace(/^ws:\/\//i, "http://")
        .replace(/^wss:\/\//i, "https://");

    const parsed = new URL(normalized);
    const pathname = parsed.pathname.replace(/\/$/, "");

    let path: string;
    if (explicitPath) {
        path = explicitPath.startsWith("/") ? explicitPath : `/${explicitPath}`;
    } else if (!pathname || pathname === "/") {
        path = "/socket.io";
    } else if (pathname.endsWith("/socket.io")) {
        path = pathname;
    } else if (pathname.endsWith("/api")) {
        const base = pathname.slice(0, -"/api".length);
        path = base ? `${base}/socket.io` : "/socket.io";
    } else {
        path = `${pathname}/socket.io`;
    }

    let protocol = parsed.protocol;
    if (
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        protocol === "http:"
    ) {
        protocol = "https:";
    }

    return {
        url: `${protocol}//${parsed.host}`,
        path,
    };
}

export const SOCKET_IO_CONFIG = parseSocketIoConfig(
    import.meta.env.VITE_SOCKET_URL || LIVE_SOCKET_WS_URL,
);

export const SOCKET_ENABLED =
    import.meta.env.VITE_SOCKET_ENABLED !== "false";

/** @deprecated Use SOCKET_IO_CONFIG.url */
export const SOCKET_URL = SOCKET_IO_CONFIG.url;

let sharedSocket: Socket | null = null;
let refCount = 0;

const SOCKET_CLIENT_OPTIONS = {
    path: SOCKET_IO_CONFIG.path,
    transports: ["polling", "websocket"] as ("polling" | "websocket")[],
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: 2,
    timeout: 8000,
    autoConnect: false,
};

export function acquireSocket(): Socket | null {
    if (!SOCKET_ENABLED) {
        return null;
    }

    if (!sharedSocket) {
        sharedSocket = io(SOCKET_IO_CONFIG.url, SOCKET_CLIENT_OPTIONS);
    }

    refCount += 1;

    if (!sharedSocket.connected) {
        sharedSocket.connect();
    }

    return sharedSocket;
}

export function releaseSocket(): void {
    if (!sharedSocket) {
        return;
    }

    refCount = Math.max(0, refCount - 1);

    if (refCount === 0) {
        sharedSocket.disconnect();
        sharedSocket = null;
    }
}

/** Connect after route/API work so failed handshakes do not block login. */
export function scheduleSocketConnect(delayMs = 2500): {
    socket: Socket | null;
    cancel: () => void;
} {
    if (!SOCKET_ENABLED) {
        return { socket: null, cancel: () => undefined };
    }

    let cancelled = false;
    let socket: Socket | null = null;

    const timer = window.setTimeout(() => {
        if (cancelled) {
            return;
        }
        socket = acquireSocket();
    }, delayMs);

    return {
        get socket() {
            return socket;
        },
        cancel: () => {
            cancelled = true;
            window.clearTimeout(timer);
            if (socket) {
                releaseSocket();
                socket = null;
            }
        },
    };
}
