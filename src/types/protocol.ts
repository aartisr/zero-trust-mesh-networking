/**
 * Tactical Mesh & Communications Protocol Simulator Types
 * Conforming to NATO STANAG 4586, CCSDS RFC 9171 (DTN), and Noise Protocol Framework
 */

export type NodeRole = 'uav' | 'ground_patrol' | 'command_post' | 'satcom_relay';

export type RoutingProtocolType = 'BATMAN_V' | 'OLSR' | 'AODV';

export type SecurityState = 'UNAUTHENTICATED' | 'HANDSHAKE_IN_PROGRESS' | 'AUTHENTICATED_MUTUAL' | 'COMPROMISED';

export interface TacticalNode {
  id: string;
  name: string;
  callsign: string;
  role: NodeRole;
  x: number; // Normalized canvas coordinates
  y: number;
  altitudeM: number;
  velocity: { vx: number; vy: number };
  batteryPct: number;
  txPowerDbm: number; // e.g. 27 dBm (500mW tactical radio)
  rxSensitivityDbm: number; // e.g. -95 dBm
  rangeRadius: number; // Effective RF range in canvas units
  isMoving: boolean;
  orbitRadius?: number;
  orbitCenter?: { x: number; y: number };
  orbitAngle?: number;
  
  // Zero-Trust Security State
  ed25519Fingerprint: string;
  staticPublicKeyHex: string;
  securityState: SecurityState;
  activeSessionKeys: Record<string, string>; // peerId -> derived session key hex
  replayWindow: ReplayWindow;
  
  // Protocol State
  routingTable: RoutingEntry[];
  olsrMprSet: string[]; // Selected Multi-Point Relays for OLSR
  batmanOgmSeq: number;
  aodvSeq: number;
  
  // DTN Storage
  dtnCustodyQueue: DtnBundle[];
  
  // Telemetry & Statistics
  stats: {
    packetsSent: number;
    packetsRelayed: number;
    packetsReceived: number;
    packetsDropped: number;
    dtnBundlesHeld: number;
    securityDropsReplay: number;
    securityDropsAuth: number;
  };
}

export interface RoutingEntry {
  destinationId: string;
  nextHopId: string;
  hopCount: number;
  metric: number; // BATMAN: TQ (0-255), OLSR: ETX, AODV: Hop Count
  metricLabel: string;
  sequenceNumber: number;
  expiresAt: number; // timestamp
  protocol: RoutingProtocolType;
}

export interface ReplayWindow {
  lastSequenceNumber: number;
  windowBitmap: number; // 64-bit integer simulated as number
  windowSize: number;
}

export interface JammingZone {
  id: string;
  callsign: string;
  x: number;
  y: number;
  radius: number;
  powerDbm: number; // e.g., 45 dBm high-power barrage jammer
  band: 'VHF/UHF' | 'L-BAND' | 'S-BAND';
  active: boolean;
}

export interface RFLink {
  nodeAId: string;
  nodeBId: string;
  distanceM: number;
  pathLossDb: number;
  snrDb: number;
  isJammed: boolean;
  isOperational: boolean;
  etx: number; // Expected Transmission Count
  tq: number; // Transmit Quality (0-255)
  latencyMs: number;
}

export interface InFlightPacket {
  id: string;
  type: 'BATMAN_OGM' | 'OLSR_HELLO' | 'OLSR_TC' | 'AODV_RREQ' | 'AODV_RREP' | 'STANAG_C2' | 'CCSDS_BUNDLE' | 'NOISE_HANDSHAKE';
  sourceId: string;
  targetId: string; // destination node
  currentHopId: string;
  nextHopId: string;
  path: string[]; // Node IDs in transit
  currentPathIndex: number;
  progress: number; // 0 to 1 between currentHop and nextHop
  payloadHex: string;
  isEncrypted: boolean;
  sequenceNumber: number;
  isReplayed?: boolean;
  isTampered?: boolean;
  timestamp: number;
  dtnCustodyHold?: boolean;
}

export interface DtnBundle {
  bundleId: string;
  version: number; // RFC 9171 version 7
  sourceEid: string; // e.g. "dtn://uav-01"
  destinationEid: string; // e.g. "dtn://fob-main"
  custodianEid: string;
  creationTimestamp: number;
  lifetimeSeconds: number;
  isCustodyAccepted: boolean;
  payloadType: 'TACTICAL_RECON_IMAGE' | 'STANAG_UAV_TELEMETRY' | 'SITUATION_REPORT';
  payloadBytes: number;
  status: 'QUEUED_IN_CUSTODY' | 'TRANSMITTING' | 'DELIVERED' | 'EXPIRED';
}

export interface Stanag4586Frame {
  header: {
    syncBytes: string; // 0x55AA
    messageId: number; // e.g., 2000 (C2 Steering), 1000 (Inertial State)
    messageLength: number;
    sourceVehicleId: number;
    destinationVehicleId: number;
    timestampUtc: string;
    classificationLevel: 'NATO UNCLASSIFIED' | 'NATO RESTRICTED' | 'NATO SECRET';
  };
  telemetryPayload: {
    latitude: number;
    longitude: number;
    altitudeM: number;
    headingDeg: number;
    groundSpeedKts: number;
    airframeStatus: 'NOMINAL' | 'PAYLOAD_ACTIVE' | 'EMERGENCY_RTH';
    sensorPayload: string;
  };
  checksumHex: string;
}

export interface NoiseHandshakeStep {
  stepIndex: number;
  pattern: '-> e' | '<- e, ee, s, es' | '-> s, se';
  initiatorId: string;
  responderId: string;
  ephemeralPubA: string;
  ephemeralPubB: string;
  sharedSecretHash: string;
  cipherPayloadHex: string;
  state: 'PENDING' | 'VERIFIED' | 'FAILED';
  description: string;
}

export interface BenchmarkMetrics {
  averageLatencyMs: number;
  packetDeliveryRatioPct: number;
  networkThroughputKbps: number;
  routeConvergenceTimeMs: number;
  memoryFootprintKb: number;
  totalPacketsSimulated: number;
  jammingLossRatePct: number;
}
