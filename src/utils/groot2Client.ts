/**
 * Groot2 WebSocket Client for the web editor.
 * Connects to the btcpp-groot2-bridge service to enable real-time debugging.
 */

export type NodeStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'SKIPPED';

export interface Groot2TreeInfo {
  treeId: string;
  xml: string;
}

export interface Groot2NodeStatus {
  uid: number;
  status: NodeStatus;
}

export interface Groot2Transition {
  timestamp_usec: number;
  uid: number;
  status: NodeStatus;
}

export type Groot2EventType =
  | 'connected'
  | 'disconnected'
  | 'tree'
  | 'status'
  | 'blackboard'
  | 'breakpoint_reached'
  | 'transitions'
  | 'error'
  | 'pong';

export interface Groot2Event {
  type: Groot2EventType;
  uid?: number;
  treeId?: string;
  body?: Record<string, unknown>;
  error?: string;
  enabled?: boolean;
  topic?: string;
}

export type Groot2EventHandler = (event: Groot2Event) => void;

export class Groot2Client {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Set<Groot2EventHandler> = new Set();
  private pendingRequests: Map<number, { resolve: (v: Groot2Event) => void; reject: (e: Error) => void }> = new Map();
  private uidCounter = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private _connected = false;
  private _treeId: string | null = null;

  constructor(url: string = 'ws://localhost:8080') {
    this.url = url;
  }

  get connected(): boolean { return this._connected; }
  get treeId(): string | null { return this._treeId; }

  // ─── Connection ───────────────────────────────────────────────────────────

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.close();
      }

      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        reject(new Error(`Invalid WebSocket URL: ${this.url}`));
        return;
      }

      this.ws.onopen = () => {
        this._connected = true;
        this.reconnectAttempts = 0;
        this.emit({ type: 'connected' });
        resolve();
      };

      this.ws.onclose = () => {
        this._connected = false;
        this._treeId = null;
        this.emit({ type: 'disconnected' });
        this.scheduleReconnect();
      };

      this.ws.onerror = (e) => {
        // Only reject the connect promise on first error
        if (this.reconnectAttempts === 0) {
          reject(new Error('WebSocket connection failed'));
        }
      };

      this.ws.onmessage = (ev) => {
        let msg: Groot2Event;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }

        // Resolve pending request if we have a matching uid
        if (msg.uid !== undefined && this.pendingRequests.has(msg.uid)) {
          const { resolve } = this.pendingRequests.get(msg.uid)!;
          this.pendingRequests.delete(msg.uid);
          resolve(msg);
        }

        this.emit(msg);
      };
    });
  }

  disconnect(): void {
    this._connected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent auto-reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  on(handler: Groot2EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(event: Groot2Event): void {
    for (const h of this.handlers) {
      try { h(event); } catch { /* ignore */ }
    }
  }

  // ─── Requests (with response promise) ─────────────────────────────────────

  private send(action: string, data: Record<string, unknown> = {}): Promise<Groot2Event> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Not connected'));
    }
    return new Promise((resolve, reject) => {
      const uid = ++this.uidCounter;
      const msg = { action, uid, ...data };
      this.pendingRequests.set(uid, { resolve, reject });
      this.ws!.send(JSON.stringify(msg));

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(uid)) {
          this.pendingRequests.delete(uid);
          reject(new Error(`Request ${action} timed out`));
        }
      }, 5000);
    });
  }

  // ─── BT.CPP Operations ─────────────────────────────────────────────────────

  async ping(): Promise<void> {
    await this.send('ping');
  }

  /** Fetch the full tree XML from the BT.CPP runtime */
  async getTree(): Promise<Groot2TreeInfo> {
    const resp = await this.send('getTree') as Groot2Event & { type: 'tree'; body: Record<string, unknown> };
    this._treeId = resp.treeId ?? null;
    return {
      treeId: resp.treeId ?? '',
      xml: (resp.body?.xml ?? resp.body?.tree ?? '') as string,
    };
  }

  /** Fetch current node statuses */
  async getStatus(): Promise<Groot2NodeStatus[]> {
    const resp = await this.send('getStatus') as Groot2Event & { type: 'status'; body: Record<string, unknown> };
    const statusArray = resp.body?.node_statuses ?? resp.body?.statuses ?? [];
    return (statusArray as Array<Record<string, unknown>>).map((n) => ({
      uid: n.uid as number,
      status: (n.status ?? 'IDLE') as NodeStatus,
    }));
  }

  /** Fetch blackboard values */
  async getBlackboard(keys?: string[]): Promise<Record<string, unknown>> {
    const resp = await this.send('getBlackboard', { keys: keys ?? [] }) as Groot2Event & { type: 'blackboard'; body: Record<string, unknown> };
    return resp.body ?? {};
  }

  /** Set a blackboard value */
  async setBlackboard(key: string, value: unknown): Promise<void> {
    await this.send('setBlackboard', { key, value });
  }

  /** Insert a hook/breakpoint */
  async insertHook(params: {
    uid: number;
    position: 'PRE' | 'POST';
    mode?: 'BREAKPOINT' | 'REPLACE';
    enabled?: boolean;
    once?: boolean;
    desired_status?: NodeStatus;
  }): Promise<void> {
    await this.send('insertHook', {
      uid: params.uid,
      position: params.position,
      mode: params.mode ?? 'BREAKPOINT',
      enabled: params.enabled ?? true,
      once: params.once ?? false,
      desired_status: params.desired_status ?? 'SKIPPED',
    });
  }

  /** Remove a hook */
  async removeHook(uid: number, position: 'PRE' | 'POST'): Promise<void> {
    await this.send('removeHook', { uid, position });
  }

  /** Unlock a breakpoint and let execution continue */
  async unlockBreakpoint(uid: number, position: 'PRE' | 'POST', result: NodeStatus = 'SUCCESS'): Promise<void> {
    await this.send('unlockBreakpoint', { uid, position, result });
  }

  /** Toggle transition recording */
  async toggleRecording(enabled: boolean): Promise<void> {
    await this.send('toggleRecording', { enabled });
  }

  /** Get recorded transitions */
  async getTransitions(): Promise<Groot2Transition[]> {
    const resp = await this.send('getTransitions') as Groot2Event & { type: 'transitions'; body: Record<string, unknown> };
    const transitions = resp.body?.transitions ?? [];
    return (transitions as Array<Record<string, unknown>>).map((t) => ({
      timestamp_usec: t.timestamp_usec as number ?? 0,
      uid: t.uid as number ?? 0,
      status: (t.status ?? 'IDLE') as NodeStatus,
    }));
  }

  // ─── Reconnection ─────────────────────────────────────────────────────────

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(() => {/* will retry or give up */});
    }, this.reconnectDelay * Math.min(this.reconnectAttempts + 1, 5));
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _client: Groot2Client | null = null;

export function getGroot2Client(url?: string): Groot2Client {
  if (!_client) {
    _client = new Groot2Client(url);
  }
  return _client;
}

export function resetGroot2Client(): void {
  if (_client) {
    _client.disconnect();
    _client = null;
  }
}
