/**
 * Groot2 Bridge Service
 *
 * WebSocket ↔ ZMQ bridge for BT.CPP real-time debugging.
 * Listens for connections from the web editor and forwards messages
 * to/from the BT.CPP runtime via ZMQ.
 *
 * Usage:
 *   npm run dev                  # development with tsx
 *   npm run build && npm start   # production
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as zmq from 'zeromq';
import {
  createFullTreeRequest,
  createStatusRequest,
  createBlackboardRequest,
  createHookInsertRequest,
  createHookRemoveRequest,
  createBreakpointUnlockRequest,
  createRecordingRequest,
  createTransitionsRequest,
  parseReply,
  K_PROTOCOL_ID,
} from './protocol.js';

// ─── Config ─────────────────────────────────────────────────────────────────

const DEFAULT_ZMQ_PORT = 1667;
const DEFAULT_PUB_PORT = 1668;
const DEFAULT_WS_PORT = 8080;
const DEFAULT_ZMQ_HOST = '127.0.0.1';

interface Config {
  zmqHost: string;
  zmqCommandPort: number;
  zmqPublisherPort: number;
  wsPort: number;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    zmqHost: DEFAULT_ZMQ_HOST,
    zmqCommandPort: DEFAULT_ZMQ_PORT,
    zmqPublisherPort: DEFAULT_PUB_PORT,
    wsPort: DEFAULT_WS_PORT,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--zmq-host':
        config.zmqHost = args[++i];
        break;
      case '--zmq-cmd-port':
        config.zmqCommandPort = parseInt(args[++i], 10);
        break;
      case '--zmq-pub-port':
        config.zmqPublisherPort = parseInt(args[++i], 10);
        break;
      case '--ws-port':
        config.wsPort = parseInt(args[++i], 10);
        break;
      case '-h':
      case '--help':
        console.log(`
Groot2 Bridge Service

Usage:
  npm run dev [options]

Options:
  --zmq-host <host>       ZMQ server host (default: ${DEFAULT_ZMQ_HOST})
  --zmq-cmd-port <port>  ZMQ command port (default: ${DEFAULT_ZMQ_PORT})
  --zmq-pub-port <port>  ZMQ publisher port (default: ${DEFAULT_PUB_PORT})
  --ws-port <port>       WebSocket listen port (default: ${DEFAULT_WS_PORT})
  -h, --help             Show this help
        `.trim());
        process.exit(0);
    }
  }
  return config;
}

// ─── Logging ────────────────────────────────────────────────────────────────

function log(level: string, msg: string, ...args: unknown[]): void {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`${ts} [${level}] ${msg}`, ...args);
}

const info = (msg: string, ...a: unknown[]) => log('INFO', msg, ...a);
const warn = (msg: string, ...a: unknown[]) => log('WARN', msg, ...a);
const error = (msg: string, ...a: unknown[]) => log('ERROR', msg, ...a);
const debug = (msg: string, ...a: unknown[]) => {
  if (process.env.DEBUG) log('DEBUG', msg, ...a);
};

// ─── ZMQ Client ─────────────────────────────────────────────────────────────

interface ZmqClient {
  /** Send request and wait for reply */
  sendRequest(parts: Buffer[]): Promise<Buffer[]>;
  /** Connect to ZMQ server */
  connect(): Promise<void>;
  /** Disconnect */
  close(): void;
  /** Are we connected? */
  connected: boolean;
}

function createZmqClient(
  host: string,
  commandPort: number,
  publisherPort: number
): ZmqClient {
  let connected = false;
  const sock = new zmq.Request({ linger: 0 });
  const pubSock = new zmq.Subscriber({ linger: 0 });

  return {
    get connected() { return connected; },

    async connect() {
      const cmdAddr = `tcp://${host}:${commandPort}`;
      const pubAddr = `tcp://${host}:${publisherPort}`;

      sock.connect(cmdAddr);
      pubSock.connect(pubAddr);
      pubSock.subscribe(''); // subscribe to all topics

      // Wait for connection to be established
      await new Promise<void>((resolve) => {
        sock.once('connect', () => resolve());
        // Timeout fallback
        setTimeout(resolve, 500);
      });

      connected = true;
      info(`Connected to ZMQ at ${cmdAddr} (cmd) + ${pubAddr} (pub)`);
    },

    async sendRequest(parts: Buffer[]): Promise<Buffer[]> {
      if (!connected) throw new Error('Not connected to ZMQ server');

      // Send multipart message
      for (const part of parts) {
        if (part === parts[parts.length - 1]) {
          await sock.send(part);
        } else {
          sock.send([part]); // zmq Request doesn't support send_multipart well in v6
        }
      }

      // Wait for reply
      const replies: Buffer[] = [];
      try {
        const reply = await sock.receive();
        for (const r of reply) {
          replies.push(Buffer.from(r as ArrayBuffer));
        }
      } catch (e) {
        error('ZMQ receive error:', e);
        throw e;
      }

      debug('ZMQ reply parts:', replies.map((r) => `${r.length}b`));
      return replies;
    },

    close() {
      try {
        sock.close();
        pubSock.close();
      } catch { /* ignore */ }
      connected = false;
    },
  };
}

// ─── Bridge ─────────────────────────────────────────────────────────────────

interface Client {
  ws: WebSocket;
  subscriptions: Set<string>;
}

class Groot2Bridge {
  private clients: Set<Client> = new Set();
  private zmq: ZmqClient;
  private pubSock: zmq.Subscriber | null = null;
  private publisherReady = false;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.zmq = createZmqClient(config.zmqHost, config.zmqCommandPort, config.zmqPublisherPort);
  }

  async start(wss: WebSocketServer): Promise<void> {
    // Set up WebSocket server
    wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      info(`Client connected: ${clientIp}`);
      const client: Client = { ws, subscriptions: new Set(['status', 'breakpoint', 'blackboard', 'transitions']) };
      this.clients.add(client);

      ws.on('message', (data) => this.handleClientMessage(client, data));
      ws.on('close', () => {
        info(`Client disconnected: ${clientIp}`);
        this.clients.delete(client);
      });
      ws.on('error', (e) => {
        error(`Client error (${clientIp}):`, e.message);
        this.clients.delete(client);
      });

      // Send welcome
      ws.send(JSON.stringify({ type: 'connected', protocol: K_PROTOCOL_ID }));
    });

    // Connect ZMQ
    try {
      await this.zmq.connect();
      this.startPublisherForwarding();
    } catch (e) {
      warn('Could not connect to ZMQ server. Bridge will retry on demand.');
      warn('Make sure BT.CPP runtime is running with Groot2Publisher on ports 1667/1668');
    }
  }

  /** Forward ZMQ publisher messages to all WebSocket clients */
  private startPublisherForwarding(): void {
    // Note: In zeromq v6, Subscriber is a separate socket type
    // We create it separately here for pub/sub
    const pubSock = new zmq.Subscriber({ linger: 0 });
    pubSock.connect(`tcp://${this.config.zmqHost}:${this.config.zmqPublisherPort}`);
    pubSock.subscribe('');

    this.pubSock = pubSock;
    this.publisherReady = true;

    (async () => {
      for await (const [topic, msg] of pubSock) {
        const topicStr = topic?.toString() ?? '';
        const msgBuf = msg ? Buffer.from(msg as ArrayBuffer) : Buffer.alloc(0);
        debug('Publisher msg:', topicStr, msgBuf.length, 'bytes');
        this.broadcast({ topic: topicStr, data: msgBuf.toString('base64') });
      }
    })().catch((e) => error('Publisher loop error:', e));
  }

  private async handleClientMessage(client: Client, data: unknown): Promise<void> {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      client.ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const { action } = msg;

    debug('Client action:', action);

    try {
      switch (action) {
        case 'ping':
          client.ws.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'getTree':
          await this.handleGetTree(client);
          break;

        case 'getStatus':
          await this.handleGetStatus(client);
          break;

        case 'getBlackboard':
          await this.handleGetBlackboard(client, msg.keys as string[]);
          break;

        case 'setBlackboard':
          await this.handleSetBlackboard(client, msg as Record<string, unknown>);
          break;

        case 'insertHook':
          await this.handleInsertHook(client, msg as Record<string, unknown>);
          break;

        case 'removeHook':
          await this.handleRemoveHook(client, msg as Record<string, unknown>);
          break;

        case 'unlockBreakpoint':
          await this.handleUnlockBreakpoint(client, msg as Record<string, unknown>);
          break;

        case 'toggleRecording':
          await this.handleToggleRecording(client, msg.enabled as boolean);
          break;

        case 'getTransitions':
          await this.handleGetTransitions(client);
          break;

        case 'subscribe': {
          const topic = msg.topic as string;
          if (topic) client.subscriptions.add(topic);
          client.ws.send(JSON.stringify({ type: 'subscribed', topic }));
          break;
        }

        case 'unsubscribe': {
          const topic = msg.topic as string;
          if (topic) client.subscriptions.delete(topic);
          client.ws.send(JSON.stringify({ type: 'unsubscribed', topic }));
          break;
        }

        default:
          client.ws.send(JSON.stringify({ error: `Unknown action: ${action}` }));
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      error(`Error handling ${action}:`, err);
      client.ws.send(JSON.stringify({ error: err }));
    }
  }

  private async handleGetTree(client: Client): Promise<void> {
    const parts = createFullTreeRequest();
    const replies = await this.zmq.sendRequest(parts);
    const { header, body } = parseReply(replies);

    client.ws.send(JSON.stringify({
      type: 'tree',
      uid: header.request.uid,
      treeId: header.treeId,
      body,
    }));
  }

  private async handleGetStatus(client: Client): Promise<void> {
    if (!this.zmq.connected) {
      client.ws.send(JSON.stringify({ type: 'status', error: 'Not connected' }));
      return;
    }
    const parts = createStatusRequest();
    const replies = await this.zmq.sendRequest(parts);
    const { header, body } = parseReply(replies);

    client.ws.send(JSON.stringify({
      type: 'status',
      uid: header.request.uid,
      treeId: header.treeId,
      body,
    }));
  }

  private async handleGetBlackboard(client: Client, keys?: string[]): Promise<void> {
    if (!this.zmq.connected) {
      client.ws.send(JSON.stringify({ type: 'blackboard', error: 'Not connected' }));
      return;
    }
    const parts = createBlackboardRequest(keys ?? []);
    const replies = await this.zmq.sendRequest(parts);
    const { header, body } = parseReply(replies);

    client.ws.send(JSON.stringify({
      type: 'blackboard',
      uid: header.request.uid,
      body,
    }));
  }

  private async handleSetBlackboard(client: Client, msg: Record<string, unknown>): Promise<void> {
    if (!this.zmq.connected) {
      client.ws.send(JSON.stringify({ type: 'blackboard', error: 'Not connected' }));
      return;
    }
    const parts: Buffer[] = [];
    // TODO: implement SET_BLACKBOARD message type if needed
    client.ws.send(JSON.stringify({ type: 'blackboard_set', error: 'Not implemented yet' }));
  }

  private async handleInsertHook(client: Client, msg: Record<string, unknown>): Promise<void> {
    if (!this.zmq.connected) {
      client.ws.send(JSON.stringify({ error: 'Not connected' }));
      return;
    }
    const parts = createHookInsertRequest({
      uid: msg.uid as number ?? 0,
      enabled: msg.enabled as boolean ?? true,
      position: (msg.position as string) === 'PRE' ? 'PRE' : 'POST',
      mode: (msg.mode as string) === 'REPLACE' ? 'REPLACE' : 'BREAKPOINT',
      once: msg.once as boolean ?? false,
      desired_status: (msg.desired_status as string) ?? 'SKIPPED',
    });
    const replies = await this.zmq.sendRequest(parts);
    client.ws.send(JSON.stringify({ type: 'hook_inserted', reply: parseReply(replies) }));
  }

  private async handleRemoveHook(client: Client, msg: Record<string, unknown>): Promise<void> {
    if (!this.zmq.connected) {
      client.ws.send(JSON.stringify({ error: 'Not connected' }));
      return;
    }
    const parts = createHookRemoveRequest(
      msg.uid as number ?? 0,
      (msg.position as string) === 'PRE' ? 'PRE' : 'POST'
    );
    await this.zmq.sendRequest(parts);
    client.ws.send(JSON.stringify({ type: 'hook_removed' }));
  }

  private async handleUnlockBreakpoint(client: Client, msg: Record<string, unknown>): Promise<void> {
    if (!this.zmq.connected) {
      client.ws.send(JSON.stringify({ error: 'Not connected' }));
      return;
    }
    const parts = createBreakpointUnlockRequest(
      msg.uid as number ?? 0,
      (msg.position as string) === 'PRE' ? 'PRE' : 'POST',
      (msg.result as string) ?? 'SUCCESS'
    );
    await this.zmq.sendRequest(parts);
    client.ws.send(JSON.stringify({ type: 'breakpoint_unlocked' }));
  }

  private async handleToggleRecording(client: Client, enabled: boolean): Promise<void> {
    if (!this.zmq.connected) {
      client.ws.send(JSON.stringify({ error: 'Not connected' }));
      return;
    }
    const parts = createRecordingRequest(enabled);
    await this.zmq.sendRequest(parts);
    client.ws.send(JSON.stringify({ type: 'recording_toggled', enabled }));
  }

  private async handleGetTransitions(client: Client): Promise<void> {
    if (!this.zmq.connected) {
      client.ws.send(JSON.stringify({ error: 'Not connected' }));
      return;
    }
    const parts = createTransitionsRequest();
    const replies = await this.zmq.sendRequest(parts);
    const { header, body } = parseReply(replies);
    client.ws.send(JSON.stringify({
      type: 'transitions',
      uid: header.request.uid,
      treeId: header.treeId,
      body,
    }));
  }

  private broadcast(msg: Record<string, unknown>): void {
    const payload = JSON.stringify(msg);
    for (const client of this.clients) {
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(payload);
        }
      } catch (e) {
        error('Broadcast error:', e);
      }
    }
  }

  shutdown(): void {
    info('Shutting down bridge...');
    this.zmq.close();
    for (const client of this.clients) {
      try { client.ws.close(); } catch { /* ignore */ }
    }
    this.clients.clear();
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const config = parseArgs();

  info('Starting Groot2 Bridge...');
  info(`  WebSocket: ws://0.0.0.0:${config.wsPort}`);
  info(`  ZMQ:       tcp://${config.zmqHost}:${config.zmqCommandPort} (cmd) + ${config.zmqPublisherPort} (pub)`);

  const wss = new WebSocketServer({ port: config.wsPort });
  const bridge = new Groot2Bridge(config);

  await bridge.start(wss);
  info('Bridge ready. Waiting for connections...');

  // Graceful shutdown
  process.on('SIGINT', () => {
    bridge.shutdown();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    bridge.shutdown();
    process.exit(0);
  });
}

main().catch((e) => {
  error('Fatal error:', e);
  process.exit(1);
});
