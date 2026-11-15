const WS_BASE = process.env.EXPO_PUBLIC_WS_URL || "ws://10.0.2.2:4000/ws";

type Listener = (msg: any) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();

  connect(token: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(`${WS_BASE}?token=${encodeURIComponent(token)}`);
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data));
        this.listeners.forEach((fn) => fn(data));
      } catch {}
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  send(payload: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const signalingClient = new SignalingClient();
