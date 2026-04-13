/**
 * Groot2 v2 Protocol Library (TypeScript)
 *
 * Implements the BT.CPP Groot2 debugging protocol for WebSocket communication.
 * Reference: include/behaviortree_cpp/loggers/groot2_protocol.h
 *
 * Binary message format:
 *   Header (6 bytes): protocol(1) + type(1) + uid(4)
 *   Tree UUID (16 bytes, in replies)
 *   Body: JSON string
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export enum RequestType {
  FULLTREE = 0x54, // 'T' - request entire tree as XML
  STATUS = 0x53,   // 'S' - request status of all nodes
  BLACKBOARD = 0x42, // 'B' - retrieve blackboard values

  HOOK_INSERT = 0x49,     // 'I' - insert a hook/breakpoint
  HOOK_REMOVE = 0x52,     // 'R' - remove a hook
  BREAKPOINT_REACHED = 0x4E, // 'N' - breakpoint hit notification
  BREAKPOINT_UNLOCK = 0x55,   // 'U' - unlock a breakpoint
  HOOKS_DUMP = 0x44,         // 'D' - get existing hooks

  REMOVE_ALL_HOOKS = 0x41,  // 'A' - remove all hooks
  DISABLE_ALL_HOOKS = 0x58, // 'X' - disable all hooks

  TOGGLE_RECORDING = 0x72, // 'r' - start/stop recording
  GET_TRANSITIONS = 0x74, // 't' - get all transitions when recording
}

export const REQUEST_TYPE_NAMES: Record<number, string> = {
  [RequestType.FULLTREE]: 'full_tree',
  [RequestType.STATUS]: 'status',
  [RequestType.BLACKBOARD]: 'blackboard',
  [RequestType.HOOK_INSERT]: 'hook_insert',
  [RequestType.HOOK_REMOVE]: 'hook_remove',
  [RequestType.BREAKPOINT_REACHED]: 'breakpoint_reached',
  [RequestType.BREAKPOINT_UNLOCK]: 'breakpoint_unlock',
  [RequestType.HOOKS_DUMP]: 'hooks_dump',
  [RequestType.REMOVE_ALL_HOOKS]: 'hooks_remove_all',
  [RequestType.DISABLE_ALL_HOOKS]: 'disable_hooks',
  [RequestType.TOGGLE_RECORDING]: 'toggle_recording',
  [RequestType.GET_TRANSITIONS]: 'get_transitions',
};

export const K_PROTOCOL_ID = 2;

// ─── Header Serialization ───────────────────────────────────────────────────

export interface RequestHeader {
  uid: number;    // 4 bytes, big-endian, random request ID
  protocol: number; // 1 byte, always 2
  type: number;    // 1 byte, RequestType value
}

export interface ReplyHeader {
  request: RequestHeader;
  treeId: string; // 16 bytes, UUID string
}

/**
 * Serialize a RequestHeader to a 6-byte Buffer.
 * Format: [protocol(1)] [type(1)] [uid(4 big-endian)]
 */
export function serializeRequestHeader(header: RequestHeader): Buffer {
  const buf = Buffer.alloc(6);
  buf.writeUInt8(header.protocol, 0);
  buf.writeUInt8(header.type, 1);
  buf.writeUInt32BE(header.uid, 2);
  return buf;
}

/**
 * Deserialize a 6-byte Buffer to a RequestHeader.
 */
export function deserializeRequestHeader(buf: Buffer): RequestHeader {
  if (buf.length < 6) throw new Error('Invalid header: less than 6 bytes');
  return {
    protocol: buf.readUInt8(0),
    type: buf.readUInt8(1),
    uid: buf.readUInt32BE(2),
  };
}

/**
 * Serialize a ReplyHeader to a 22-byte Buffer.
 * Format: [protocol(1)] [type(1)] [uid(4)] [treeId(16)]
 */
export function serializeReplyHeader(header: ReplyHeader): Buffer {
  const buf = Buffer.alloc(22);
  buf.writeUInt8(header.request.protocol, 0);
  buf.writeUInt8(header.request.type, 1);
  buf.writeUInt32BE(header.request.uid, 2);
  // treeId is 16 bytes
  if (header.treeId.length !== 16) {
    throw new Error('treeId must be exactly 16 bytes');
  }
  buf.write(header.treeId, 4, 16, 'ascii');
  return buf;
}

/**
 * Deserialize a 22-byte Buffer to a ReplyHeader.
 */
export function deserializeReplyHeader(buf: Buffer): ReplyHeader {
  if (buf.length < 22) throw new Error('Invalid reply header: less than 22 bytes');
  const request: RequestHeader = {
    protocol: buf.readUInt8(0),
    type: buf.readUInt8(1),
    uid: buf.readUInt32BE(2),
  };
  const treeId = buf.toString('ascii', 4, 20);
  return { request, treeId };
}

// ─── UUID ───────────────────────────────────────────────────────────────────

/**
 * Generate a random UUID matching the C++ CreateRandomUUID() format.
 * Version 4 variant 2 (RFC 4122).
 */
export function createRandomUUID(): string {
  const bytes = Buffer.alloc(16);
  for (let i = 0; i < 16; i += 4) {
    bytes.writeUInt32BE(Math.floor(Math.random() * 0xFFFFFFFF), i);
  }
  // variant: 10xxxxxx
  bytes[8] = (bytes[8] & 0xBF) | 0x80;
  // version: 0100xxxx
  bytes[6] = (bytes[6] & 0x4F) | 0x40;
  return bytes.toString('binary');
}

// ─── Message Builders ───────────────────────────────────────────────────────

let _uidCounter = 0;
function nextUid(): number {
  return ++_uidCounter + Math.floor(Math.random() * 0xFFFFFFFF);
}

/**
 * Create a request message (header + optional JSON body).
 * Returns an array of Buffer parts for ZMQ multipart messages.
 */
export function createRequest(
  type: RequestType,
  body?: Record<string, unknown>
): Buffer[] {
  const header: RequestHeader = {
    uid: nextUid(),
    protocol: K_PROTOCOL_ID,
    type,
  };
  const parts: Buffer[] = [serializeRequestHeader(header)];
  if (body !== undefined) {
    parts.push(Buffer.from(JSON.stringify(body), 'utf-8'));
  }
  return parts;
}

/**
 * Parse a reply message from BT.CPP.
 * Returns the parsed header and body (as parsed JSON or raw string).
 */
export function parseReply(parts: Buffer[]): {
  header: ReplyHeader;
  body?: Record<string, unknown>;
} {
  if (parts.length < 1) throw new Error('No message parts received');

  const headerBuf = parts[0];
  const header = deserializeReplyHeader(headerBuf);

  let body: Record<string, unknown> | undefined;
  if (parts.length > 1) {
    const bodyStr = parts[1].toString('utf-8');
    try {
      body = JSON.parse(bodyStr);
    } catch {
      body = { raw: bodyStr } as Record<string, unknown>;
    }
  }

  return { header, body };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface Hook {
  uid: number;
  enabled: boolean;
  position: 'PRE' | 'POST';
  mode: 'BREAKPOINT' | 'REPLACE';
  once: boolean;
  desired_status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'SKIPPED';
}

export function createHookInsertRequest(hook: Hook): Buffer[] {
  return createRequest(RequestType.HOOK_INSERT, {
    uid: hook.uid,
    enabled: hook.enabled,
    position: hook.position === 'PRE' ? 0 : 1,
    mode: hook.mode === 'BREAKPOINT' ? 0 : 1,
    once: hook.once,
    desired_status: hook.desired_status,
  });
}

export function createHookRemoveRequest(uid: number, position: 'PRE' | 'POST'): Buffer[] {
  return createRequest(RequestType.HOOK_REMOVE, {
    uid,
    position: position === 'PRE' ? 0 : 1,
  });
}

export function createBreakpointUnlockRequest(
  uid: number,
  position: 'PRE' | 'POST',
  result: string
): Buffer[] {
  return createRequest(RequestType.BREAKPOINT_UNLOCK, {
    uid,
    position: position === 'PRE' ? 0 : 1,
    result,
  });
}

// ─── Blackboard ─────────────────────────────────────────────────────────────

export function createBlackboardRequest(keys: string[]): Buffer[] {
  return createRequest(RequestType.BLACKBOARD, { keys });
}

// ─── Tree ──────────────────────────────────────────────────────────────────

export function createFullTreeRequest(): Buffer[] {
  return createRequest(RequestType.FULLTREE);
}

export function createStatusRequest(): Buffer[] {
  return createRequest(RequestType.STATUS);
}

export function createTransitionsRequest(): Buffer[] {
  return createRequest(RequestType.GET_TRANSITIONS);
}

export function createRecordingRequest(enable: boolean): Buffer[] {
  return createRequest(RequestType.TOGGLE_RECORDING, { enabled: enable });
}
