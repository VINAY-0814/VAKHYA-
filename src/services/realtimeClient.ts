/**
 * Persistent WebSocket signaling, presence, call invite, DM chat, and live translation relay client.
 */

export type SignalingEvent = {
  type: string;
  roomName?: string;
  senderIdentity?: string;
  senderName?: string;
  caller?: any;
  callee?: any;
  callType?: "voice" | "video";
  targetOnline?: boolean;
  peers?: any[];
  participants?: any[];
  payload?: any;
};

type Listener = (event: SignalingEvent) => void;

class RealtimeSignalingClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private identity = "";
  private userMeta: {
    phone: string;
    name: string;
    userType: string;
    avatar: string;
  } | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pendingQueue: Record<string, any>[] = [];
  private activeRoom: { roomName: string; senderName: string } | null = null;

  getIdentity(): string {
    if (!this.identity) {
      const saved = sessionStorage.getItem("vakhya_ws_identity");
      if (saved) {
        this.identity = saved;
      } else {
        this.identity = `peer_${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem("vakhya_ws_identity", this.identity);
      }
    }
    return this.identity;
  }

  connect(userMeta: { phone: string; name: string; userType: string; avatar: string }) {
    this.userMeta = userMeta;
    this.getIdentity();

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.registerUser();
      }
      return;
    }

    const token = localStorage.getItem("vakhya_token") || `session-${this.identity}`;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/api/webrtc/signaling?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.registerUser();
      if (this.activeRoom) {
        this.sendImmediate({
          type: "reconnect",
          roomName: this.activeRoom.roomName,
          senderIdentity: this.identity,
          senderName: this.activeRoom.senderName || this.userMeta?.name || "Vakhya User",
        });
      }
      if (this.pendingQueue.length > 0) {
        const queued = [...this.pendingQueue];
        this.pendingQueue = [];
        queued.forEach((item) => this.sendImmediate(item));
      }
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => {
        this.send({ type: "heartbeat", senderIdentity: this.identity });
      }, 20000);
    };

    ws.onmessage = (evt) => {
      try {
        const msg: SignalingEvent = JSON.parse(evt.data);
        this.listeners.forEach((cb) => cb(msg));
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      this.ws = null;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (this.userMeta) {
          this.connect(this.userMeta);
        }
      }, 1500);
    };

    ws.onerror = () => {
      // handled on close
    };
  }

  private registerUser() {
    if (!this.userMeta) return;
    this.sendImmediate({
      type: "register_user",
      senderIdentity: this.identity,
      senderName: this.userMeta.name,
      payload: {
        phone: this.userMeta.phone,
        name: this.userMeta.name,
        userType: this.userMeta.userType,
        avatar: this.userMeta.avatar,
      },
    });
  }

  private sendImmediate(msg: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          ...msg,
          senderIdentity: msg.senderIdentity || this.getIdentity(),
          senderName: msg.senderName || this.userMeta?.name || "Vakhya User",
        })
      );
      return true;
    }
    return false;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  send(msg: Record<string, any>) {
    if (msg.type === "join" && msg.roomName) {
      this.activeRoom = {
        roomName: msg.roomName,
        senderName: msg.senderName || this.userMeta?.name || "Vakhya User",
      };
    } else if (msg.type === "leave" && msg.roomName && this.activeRoom?.roomName === msg.roomName) {
      this.activeRoom = null;
    }

    if (this.sendImmediate(msg)) {
      return true;
    }

    if (msg.type !== "heartbeat") {
      if (this.pendingQueue.length >= 40) {
        this.pendingQueue.shift();
      }
      this.pendingQueue.push(msg);
    }
    return false;
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.userMeta = null;
    this.activeRoom = null;
    this.pendingQueue = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const realtimeClient = new RealtimeSignalingClient();
