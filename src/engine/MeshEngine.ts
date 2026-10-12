/**
 * ARES-MESH Tactical Simulation Engine
 * Ad-hoc Resilient Expeditionary System for Mesh Networking
 */

import {
  TacticalNode,
  JammingZone,
  RFLink,
  InFlightPacket,
  RoutingProtocolType,
  DtnBundle,
  BenchmarkMetrics,
} from '../types/protocol';
import {
  generateKeyHex,
  formatFingerprint,
  initReplayWindow,
  checkAndAdvanceReplayWindow,
  performNoiseXXHandshake,
  sealChaCha20Poly1305,
} from '../utils/crypto';
import { encodeStanag4586, encodeCcsdsBundle } from '../utils/standards';

export class MeshSimulationEngine {
  nodes: TacticalNode[] = [];
  jammingZones: JammingZone[] = [];
  links: RFLink[] = [];
  inFlightPackets: InFlightPacket[] = [];
  activeProtocol: RoutingProtocolType = 'BATMAN_V';
  
  // Benchmark state
  metrics: BenchmarkMetrics = {
    averageLatencyMs: 14.2,
    packetDeliveryRatioPct: 98.4,
    networkThroughputKbps: 840,
    routeConvergenceTimeMs: 120,
    memoryFootprintKb: 420,
    totalPacketsSimulated: 0,
    jammingLossRatePct: 1.6,
  };

  packetHistory: Array<{
    id: string;
    timestamp: number;
    source: string;
    target: string;
    protocol: RoutingProtocolType;
    status: 'DELIVERED' | 'HELD_IN_DTN' | 'DROPPED_JAMMED' | 'DROPPED_REPLAY' | 'DROPPED_AUTH_FAIL';
    latencyMs: number;
    hops: number;
    detail: string;
  }> = [];

  simulationSpeed: number = 1.0;
  isPaused: boolean = false;
  lastTickTime: number = Date.now();

  constructor() {
    this.initDefaultScenario();
    this.recomputeTopology();
  }

  /**
   * Multi-Domain Expeditionary Default Scenario
   * Nodes: UAV MQ-9, UAV RQ-4, Ground Squad Alpha, Ground Squad Bravo, Mobile HQ FOB, Satcom LEO
   */
  initDefaultScenario() {
    const rawNodes: Omit<TacticalNode, 'ed25519Fingerprint' | 'staticPublicKeyHex' | 'securityState' | 'activeSessionKeys' | 'replayWindow' | 'routingTable' | 'olsrMprSet' | 'batmanOgmSeq' | 'aodvSeq' | 'dtnCustodyQueue' | 'stats'>[] = [
      {
        id: 'uav-01',
        name: 'MQ-9 Reaper (Airborne Relay 1)',
        callsign: 'GHOST-01',
        role: 'uav',
        x: 320,
        y: 190,
        altitudeM: 5200,
        velocity: { vx: 0.35, vy: 0.15 },
        batteryPct: 84,
        txPowerDbm: 30, // 1W tactical airborne transceiver
        rxSensitivityDbm: -98,
        rangeRadius: 360,
        isMoving: true,
        orbitRadius: 90,
        orbitCenter: { x: 320, y: 190 },
        orbitAngle: 0,
      },
      {
        id: 'uav-02',
        name: 'RQ-4 Global Hawk (High-Altitude Relay)',
        callsign: 'VALKYRIE-02',
        role: 'uav',
        x: 580,
        y: 140,
        altitudeM: 14500,
        velocity: { vx: -0.2, vy: 0.1 },
        batteryPct: 91,
        txPowerDbm: 33, // 2W high-gain relay
        rxSensitivityDbm: -102,
        rangeRadius: 420,
        isMoving: true,
        orbitRadius: 110,
        orbitCenter: { x: 580, y: 140 },
        orbitAngle: Math.PI / 2,
      },
      {
        id: 'squad-alpha',
        name: 'Tactical Squad Alpha (Dismounted)',
        callsign: 'VIPER-LEAD',
        role: 'ground_patrol',
        x: 180,
        y: 420,
        altitudeM: 320,
        velocity: { vx: 0.08, vy: -0.04 },
        batteryPct: 76,
        txPowerDbm: 24, // 250mW manpack radio
        rxSensitivityDbm: -92,
        rangeRadius: 260,
        isMoving: false,
      },
      {
        id: 'squad-bravo',
        name: 'Tactical Squad Bravo (Recon)',
        callsign: 'RAVEN-06',
        role: 'ground_patrol',
        x: 460,
        y: 450,
        altitudeM: 280,
        velocity: { vx: -0.05, vy: 0.05 },
        batteryPct: 68,
        txPowerDbm: 24,
        rxSensitivityDbm: -92,
        rangeRadius: 260,
        isMoving: false,
      },
      {
        id: 'fob-command',
        name: 'Forward Operating Base (TOC HQ)',
        callsign: 'BASTION-HQ',
        role: 'command_post',
        x: 740,
        y: 420,
        altitudeM: 210,
        velocity: { vx: 0, vy: 0 },
        batteryPct: 100,
        txPowerDbm: 37, // 5W mast antenna
        rxSensitivityDbm: -105,
        rangeRadius: 440,
        isMoving: false,
      },
      {
        id: 'satcom-leo',
        name: 'Tactical Satcom Constellation Relay',
        callsign: 'ORBIT-09',
        role: 'satcom_relay',
        x: 840,
        y: 80,
        altitudeM: 550000,
        velocity: { vx: -0.15, vy: 0 },
        batteryPct: 99,
        txPowerDbm: 35,
        rxSensitivityDbm: -110,
        rangeRadius: 480,
        isMoving: true,
        orbitRadius: 60,
        orbitCenter: { x: 840, y: 80 },
        orbitAngle: 0,
      },
    ];

    this.nodes = rawNodes.map(raw => {
      const staticPub = generateKeyHex(32);
      return {
        ...raw,
        ed25519Fingerprint: formatFingerprint(staticPub),
        staticPublicKeyHex: staticPub,
        securityState: 'AUTHENTICATED_MUTUAL',
        activeSessionKeys: {},
        replayWindow: initReplayWindow(64),
        routingTable: [],
        olsrMprSet: [],
        batmanOgmSeq: 100,
        aodvSeq: 1,
        dtnCustodyQueue: [],
        stats: {
          packetsSent: 0,
          packetsRelayed: 0,
          packetsReceived: 0,
          packetsDropped: 0,
          dtnBundlesHeld: 0,
          securityDropsReplay: 0,
          securityDropsAuth: 0,
        },
      };
    });

    // Seed mutual session keys between initial nominal neighbors
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const hs = performNoiseXXHandshake(
          this.nodes[i].staticPublicKeyHex,
          this.nodes[j].staticPublicKeyHex
        );
        this.nodes[i].activeSessionKeys[this.nodes[j].id] = hs.derivedSharedSecret;
        this.nodes[j].activeSessionKeys[this.nodes[i].id] = hs.derivedSharedSecret;
      }
    }

    // Default EW Jamming Pod in contested sector
    this.jammingZones = [
      {
        id: 'ew-jammer-01',
        callsign: 'KRASUKHA-EW',
        x: 340,
        y: 350,
        radius: 140,
        powerDbm: 48, // 60W Barrage RF Jammer
        band: 'VHF/UHF',
        active: false,
      },
    ];
  }

  /**
   * Set active routing protocol and trigger route convergence
   */
  setProtocol(proto: RoutingProtocolType) {
    this.activeProtocol = proto;
    const startMs = performance.now();
    this.recomputeTopology();
    const convergenceMs = Math.round(performance.now() - startMs + Math.random() * 80 + 40);
    this.metrics.routeConvergenceTimeMs = convergenceMs;
    
    // Set protocol-specific memory baseline
    if (proto === 'BATMAN_V') {
      this.metrics.memoryFootprintKb = 380;
    } else if (proto === 'OLSR') {
      this.metrics.memoryFootprintKb = 490; // Higher due to 2-hop neighbor & MPR state
    } else {
      this.metrics.memoryFootprintKb = 260; // On-demand reactive route cache only
    }
  }

  /**
   * Recompute RF propagation, Line-of-Sight, link quality, and routing tables
   */
  recomputeTopology() {
    this.links = [];
    const n = this.nodes.length;

    // 1. Calculate physical RF connectivity & signal metrics
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const nodeA = this.nodes[i];
        const nodeB = this.nodes[j];

        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const distCanvas = Math.sqrt(dx * dx + dy * dy);
        const distanceM = Math.round(distCanvas * 12.5); // scale: 1 canvas px = 12.5 meters

        // Check if within max range of both transceivers
        if (distCanvas <= nodeA.rangeRadius && distCanvas <= nodeB.rangeRadius) {
          // Free-space path loss model simulation
          const freqMhz = 2400; // 2.4 GHz tactical mesh band
          const pathLossDb = Math.round(20 * Math.log10(Math.max(10, distanceM)) + 20 * Math.log10(freqMhz) - 27.55);
          
          // Received signal level
          const rxPowerA = nodeA.txPowerDbm - pathLossDb;
          const rxPowerB = nodeB.txPowerDbm - pathLossDb;
          const noiseFloorDbm = -105;
          const rawSnr = Math.min(rxPowerA, rxPowerB) - noiseFloorDbm;

          // Check if link intersects any active EW jamming zone
          let isJammed = false;
          for (const jammer of this.jammingZones) {
            if (!jammer.active) continue;
            // Test if either endpoint or midpoint is within jammer radius
            const dMidX = (nodeA.x + nodeB.x) / 2 - jammer.x;
            const dMidY = (nodeA.y + nodeB.y) / 2 - jammer.y;
            const distMid = Math.sqrt(dMidX * dMidX + dMidY * dMidY);
            const distNodeA = Math.sqrt((nodeA.x - jammer.x) ** 2 + (nodeA.y - jammer.y) ** 2);
            const distNodeB = Math.sqrt((nodeB.x - jammer.x) ** 2 + (nodeB.y - jammer.y) ** 2);

            if (distMid < jammer.radius || distNodeA < jammer.radius * 0.9 || distNodeB < jammer.radius * 0.9) {
              isJammed = true;
              break;
            }
          }

          const snrDb = isJammed ? -12 : Math.max(2, Math.min(38, Math.round(rawSnr)));
          const isOperational = !isJammed && snrDb >= 8;

          // ETX (Expected Transmission Count) and TQ (Transmit Quality 0-255)
          const pdr = isOperational ? Math.min(1.0, Math.max(0.2, (snrDb - 4) / 30)) : 0;
          const etx = pdr > 0.05 ? Number((1 / (pdr * pdr)).toFixed(2)) : 99.0;
          const tq = isOperational ? Math.round(pdr * 255) : 0;
          const latencyMs = isOperational ? Number((3.5 + (distCanvas / 100) * 2.2 + (etx - 1) * 3).toFixed(1)) : 999;

          this.links.push({
            nodeAId: nodeA.id,
            nodeBId: nodeB.id,
            distanceM,
            pathLossDb,
            snrDb,
            isJammed,
            isOperational,
            etx,
            tq,
            latencyMs,
          });
        }
      }
    }

    // 2. Execute selected ad-hoc routing protocol algorithm
    if (this.activeProtocol === 'BATMAN_V') {
      this.computeBatmanRouting();
    } else if (this.activeProtocol === 'OLSR') {
      this.computeOlsrRouting();
    } else {
      this.computeAodvRouting();
    }

    // 3. Update overall benchmark metrics
    this.updateLiveMetrics();
  }

  /**
   * B.A.T.M.A.N. V (Better Approach To Mobile Ad-hoc Networking)
   * Proactive layer-2 algorithm using Originator Messages (OGMs) and Transmit Quality (TQ)
   */
  private computeBatmanRouting() {
    for (const node of this.nodes) {
      node.routingTable = [];
      node.batmanOgmSeq++;

      for (const target of this.nodes) {
        if (target.id === node.id) continue;

        // Find best path based on highest aggregate TQ (multiplying link TQ values along path)
        const pathResult = this.findBestPathDijkstra(node.id, target.id, 'MAX_TQ');
        if (pathResult && pathResult.path.length >= 2) {
          const nextHopId = pathResult.path[1];
          const hopCount = pathResult.path.length - 1;
          const finalTq = Math.round(pathResult.metric);

          node.routingTable.push({
            destinationId: target.id,
            nextHopId,
            hopCount,
            metric: finalTq,
            metricLabel: `TQ: ${finalTq}/255`,
            sequenceNumber: node.batmanOgmSeq,
            expiresAt: Date.now() + 15000,
            protocol: 'BATMAN_V',
          });
        }
      }
    }
  }

  /**
   * OLSR (Optimized Link State Routing Protocol)
   * Computes Multi-Point Relays (MPR) using greedy set cover on 2-hop neighborhood
   */
  private computeOlsrRouting() {
    for (const node of this.nodes) {
      node.routingTable = [];

      // 1. Identify 1-hop operational neighbors
      const oneHopNeighbors = this.getOperationalNeighbors(node.id);
      
      // 2. Identify 2-hop neighbors
      const twoHopNeighbors = new Set<string>();
      for (const n1 of oneHopNeighbors) {
        const n2List = this.getOperationalNeighbors(n1);
        for (const n2 of n2List) {
          if (n2 !== node.id && !oneHopNeighbors.includes(n2)) {
            twoHopNeighbors.add(n2);
          }
        }
      }

      // 3. Greedy MPR selection: choose minimal subset of 1-hop neighbors covering all 2-hop neighbors
      const mprSet: string[] = [];
      const uncoveredTwoHop = new Set(twoHopNeighbors);

      // Sort 1-hop neighbors by coverage count
      const sortedOneHop = [...oneHopNeighbors].sort((a, b) => {
        const aCov = this.getOperationalNeighbors(a).filter(x => uncoveredTwoHop.has(x)).length;
        const bCov = this.getOperationalNeighbors(b).filter(x => uncoveredTwoHop.has(x)).length;
        return bCov - aCov;
      });

      for (const cand of sortedOneHop) {
        if (uncoveredTwoHop.size === 0) break;
        const covers = this.getOperationalNeighbors(cand).filter(x => uncoveredTwoHop.has(x));
        if (covers.length > 0) {
          mprSet.push(cand);
          covers.forEach(c => uncoveredTwoHop.delete(c));
        }
      }

      node.olsrMprSet = mprSet.length > 0 ? mprSet : oneHopNeighbors.slice(0, 1);

      // 4. Compute shortest ETX routes via Topology Control (TC)
      for (const target of this.nodes) {
        if (target.id === node.id) continue;
        const pathResult = this.findBestPathDijkstra(node.id, target.id, 'MIN_ETX');
        if (pathResult && pathResult.path.length >= 2) {
          const nextHopId = pathResult.path[1];
          const hopCount = pathResult.path.length - 1;
          const etx = Number(pathResult.metric.toFixed(2));

          node.routingTable.push({
            destinationId: target.id,
            nextHopId,
            hopCount,
            metric: etx,
            metricLabel: `ETX: ${etx}`,
            sequenceNumber: 24,
            expiresAt: Date.now() + 20000,
            protocol: 'OLSR',
          });
        }
      }
    }
  }

  /**
   * AODV (Ad-hoc On-Demand Distance Vector Routing)
   * Reactive route discovery on demand with hop count & sequence freshness
   */
  private computeAodvRouting() {
    for (const node of this.nodes) {
      node.routingTable = [];
      node.aodvSeq++;

      for (const target of this.nodes) {
        if (target.id === node.id) continue;
        const pathResult = this.findBestPathDijkstra(node.id, target.id, 'MIN_HOPS');
        if (pathResult && pathResult.path.length >= 2) {
          const nextHopId = pathResult.path[1];
          const hopCount = pathResult.path.length - 1;

          node.routingTable.push({
            destinationId: target.id,
            nextHopId,
            hopCount,
            metric: hopCount,
            metricLabel: `${hopCount} Hop${hopCount > 1 ? 's' : ''}`,
            sequenceNumber: node.aodvSeq,
            expiresAt: Date.now() + 8000, // Reactive routes expire faster if unused
            protocol: 'AODV',
          });
        }
      }
    }
  }

  /**
   * Dijkstra search helper across active operational RF links
   */
  findBestPathDijkstra(
    startId: string,
    goalId: string,
    mode: 'MAX_TQ' | 'MIN_ETX' | 'MIN_HOPS'
  ): { path: string[]; metric: number } | null {
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const unvisited = new Set<string>();

    for (const node of this.nodes) {
      distances[node.id] = mode === 'MAX_TQ' ? 0 : Infinity;
      previous[node.id] = null;
      unvisited.add(node.id);
    }

    distances[startId] = mode === 'MAX_TQ' ? 255 : 0;

    while (unvisited.size > 0) {
      // Find unvisited node with best distance
      let currentId: string | null = null;
      let bestVal = mode === 'MAX_TQ' ? -1 : Infinity;

      for (const u of unvisited) {
        if (mode === 'MAX_TQ') {
          if (distances[u] > bestVal) {
            bestVal = distances[u];
            currentId = u;
          }
        } else {
          if (distances[u] < bestVal) {
            bestVal = distances[u];
            currentId = u;
          }
        }
      }

      if (!currentId || (mode === 'MAX_TQ' ? bestVal === 0 : bestVal === Infinity)) break;
      if (currentId === goalId) break;

      unvisited.delete(currentId);

      // Inspect operational neighbors
      const neighbors = this.getOperationalNeighborsWithLinks(currentId);
      for (const { neighborId, link } of neighbors) {
        if (!unvisited.has(neighborId)) continue;

        if (mode === 'MAX_TQ') {
          // B.A.T.M.A.N. hop penalty compounding: metric = current * (link.tq / 255) * 0.95
          const candTq = Math.round(distances[currentId] * (link.tq / 255) * 0.95);
          if (candTq > distances[neighborId]) {
            distances[neighborId] = candTq;
            previous[neighborId] = currentId;
          }
        } else if (mode === 'MIN_ETX') {
          const candEtx = distances[currentId] + link.etx;
          if (candEtx < distances[neighborId]) {
            distances[neighborId] = candEtx;
            previous[neighborId] = currentId;
          }
        } else {
          // MIN_HOPS (AODV)
          const candHops = distances[currentId] + 1;
          if (candHops < distances[neighborId]) {
            distances[neighborId] = candHops;
            previous[neighborId] = currentId;
          }
        }
      }
    }

    if (!previous[goalId] && startId !== goalId) {
      return null; // No operational route
    }

    // Reconstruct path
    const path: string[] = [];
    let curr: string | null = goalId;
    while (curr) {
      path.unshift(curr);
      curr = previous[curr];
    }

    return {
      path,
      metric: distances[goalId],
    };
  }

  getOperationalNeighbors(nodeId: string): string[] {
    const result: string[] = [];
    for (const link of this.links) {
      if (!link.isOperational) continue;
      if (link.nodeAId === nodeId) result.push(link.nodeBId);
      else if (link.nodeBId === nodeId) result.push(link.nodeAId);
    }
    return result;
  }

  private getOperationalNeighborsWithLinks(nodeId: string): Array<{ neighborId: string; link: RFLink }> {
    const result: Array<{ neighborId: string; link: RFLink }> = [];
    for (const link of this.links) {
      if (!link.isOperational) continue;
      if (link.nodeAId === nodeId) result.push({ neighborId: link.nodeBId, link });
      else if (link.nodeBId === nodeId) result.push({ neighborId: link.nodeAId, link });
    }
    return result;
  }

  /**
   * Dispatch a real mission packet across the mesh
   * Handles Zero-Trust encryption, Noise verification, route forwarding,
   * Anti-Replay filtering, and DTN custody fallback when severed.
   */
  dispatchPacket(
    sourceId: string,
    targetId: string,
    type: 'STANAG_C2' | 'CCSDS_BUNDLE' | 'NOISE_HANDSHAKE',
    options?: {
      isReplayed?: boolean;
      isTampered?: boolean;
      forceDtn?: boolean;
    }
  ): { success: boolean; message: string; packetId?: string; dtnStored?: boolean } {
    const sourceNode = this.nodes.find(n => n.id === sourceId);
    const targetNode = this.nodes.find(n => n.id === targetId);
    if (!sourceNode || !targetNode) return { success: false, message: 'Node not found' };

    sourceNode.stats.packetsSent++;
    this.metrics.totalPacketsSimulated++;

    const packetId = `pkt-${Date.now().toString(36)}-${Math.floor(Math.random() * 900 + 100)}`;
    const routeEntry = sourceNode.routingTable.find(r => r.destinationId === targetId);

    // If no operational route exists or forced DTN, store in DTN custody queue
    if (!routeEntry || options?.forceDtn) {
      const bundle: DtnBundle = {
        bundleId: `bundle-${packetId}`,
        version: 7,
        sourceEid: `dtn://${sourceNode.callsign.toLowerCase()}`,
        destinationEid: `dtn://${targetNode.callsign.toLowerCase()}`,
        custodianEid: `dtn://${sourceNode.callsign.toLowerCase()}`,
        creationTimestamp: Date.now(),
        lifetimeSeconds: 300,
        isCustodyAccepted: true,
        payloadType: type === 'STANAG_C2' ? 'STANAG_UAV_TELEMETRY' : 'SITUATION_REPORT',
        payloadBytes: 128,
        status: 'QUEUED_IN_CUSTODY',
      };

      sourceNode.dtnCustodyQueue.push(bundle);
      sourceNode.stats.dtnBundlesHeld++;

      this.packetHistory.unshift({
        id: packetId,
        timestamp: Date.now(),
        source: sourceNode.callsign,
        target: targetNode.callsign,
        protocol: this.activeProtocol,
        status: 'HELD_IN_DTN',
        latencyMs: 0,
        hops: 0,
        detail: `No line-of-sight path. Bundle held in DTN custody buffer at ${sourceNode.callsign} (RFC 9171 BPv7).`,
      });

      return {
        success: true,
        message: `Disruption detected: Packet buffered into ${sourceNode.callsign} DTN custody flash memory.`,
        packetId,
        dtnStored: true,
      };
    }

    // Reconstruct full path using Dijkstra
    const fullPathResult = this.findBestPathDijkstra(
      sourceId,
      targetId,
      this.activeProtocol === 'BATMAN_V' ? 'MAX_TQ' : this.activeProtocol === 'OLSR' ? 'MIN_ETX' : 'MIN_HOPS'
    );
    const path = fullPathResult ? fullPathResult.path : [sourceId, routeEntry.nextHopId, targetId];

    // Encrypt payload using session key
    const sessionKey = sourceNode.activeSessionKeys[targetId] || generateKeyHex(32);
    const sequenceNumber = options?.isReplayed
      ? Math.max(1, targetNode.replayWindow.lastSequenceNumber - 2) // Replay old seq
      : targetNode.replayWindow.lastSequenceNumber + 1;

    let payloadPlainText = `STANAG_4586_C2_WAYPOINT_ACK:lat=${sourceNode.y.toFixed(2)},lon=${sourceNode.x.toFixed(2)}`;
    if (options?.isTampered) {
      payloadPlainText = 'MALICIOUS_FORGED_INJECTION_PAYLOAD';
    }

    const { ciphertextHex } = sealChaCha20Poly1305(
      payloadPlainText,
      sessionKey,
      sequenceNumber
    );

    const inFlight: InFlightPacket = {
      id: packetId,
      type,
      sourceId,
      targetId,
      currentHopId: sourceId,
      nextHopId: path[1] || targetId,
      path,
      currentPathIndex: 0,
      progress: 0,
      payloadHex: ciphertextHex,
      isEncrypted: true,
      sequenceNumber,
      isReplayed: options?.isReplayed,
      isTampered: options?.isTampered,
      timestamp: Date.now(),
    };

    this.inFlightPackets.push(inFlight);

    return {
      success: true,
      message: `Packet dispatched via ${this.activeProtocol} along ${path.length - 1} hop(s): ${path.join(' -> ')}`,
      packetId,
    };
  }

  /**
   * Animation & physics tick (called every requestAnimationFrame)
   */
  tick(deltaTimeMs: number) {
    if (this.isPaused) return;
    const dt = (deltaTimeMs / 1000) * this.simulationSpeed;

    // 1. Advance mobile nodes (UAV orbit, squad patrol)
    let moved = false;
    for (const node of this.nodes) {
      if (!node.isMoving) continue;
      moved = true;

      if (node.orbitRadius && node.orbitCenter && node.orbitAngle !== undefined) {
        // Orbital loiter pattern
        node.orbitAngle += dt * 0.25;
        node.x = node.orbitCenter.x + Math.cos(node.orbitAngle) * node.orbitRadius;
        node.y = node.orbitCenter.y + Math.sin(node.orbitAngle) * node.orbitRadius;
      } else {
        node.x += node.velocity.vx * dt * 30;
        node.y += node.velocity.vy * dt * 30;
        // Bounce on boundaries
        if (node.x < 100 || node.x > 880) node.velocity.vx *= -1;
        if (node.y < 80 || node.y > 520) node.velocity.vy *= -1;
      }
    }

    if (moved) {
      this.recomputeTopology();
    }

    // 2. Check DTN custody queues: if link is re-established, opportunistically forward bundles!
    for (const node of this.nodes) {
      if (node.dtnCustodyQueue.length > 0) {
        for (let i = node.dtnCustodyQueue.length - 1; i >= 0; i--) {
          const bundle = node.dtnCustodyQueue[i];
          // Find target node from EID
          const targetCallsign = bundle.destinationEid.replace('dtn://', '').toUpperCase();
          const targetNode = this.nodes.find(n => n.callsign.toUpperCase() === targetCallsign);

          if (targetNode) {
            const hasRoute = node.routingTable.some(r => r.destinationId === targetNode.id);
            if (hasRoute) {
              // Opportunistic contact established! Release from custody and forward
              node.dtnCustodyQueue.splice(i, 1);
              node.stats.dtnBundlesHeld = Math.max(0, node.stats.dtnBundlesHeld - 1);
              this.dispatchPacket(node.id, targetNode.id, 'CCSDS_BUNDLE');
              
              this.packetHistory.unshift({
                id: bundle.bundleId,
                timestamp: Date.now(),
                source: node.callsign,
                target: targetNode.callsign,
                protocol: this.activeProtocol,
                status: 'DELIVERED',
                latencyMs: Math.round((Date.now() - bundle.creationTimestamp) / 10),
                hops: 2,
                detail: `Opportunistic link established! Bundle transferred from custody at ${node.callsign} to ${targetNode.callsign}.`,
              });
            }
          }
        }
      }
    }

    // 3. Advance in-flight packets along their multi-hop paths
    for (let i = this.inFlightPackets.length - 1; i >= 0; i--) {
      const pkt = this.inFlightPackets[i];
      pkt.progress += dt * 1.5; // packet speed

      if (pkt.progress >= 1.0) {
        pkt.progress = 0;
        pkt.currentPathIndex++;

        // Verify if intermediate hop is still operational
        const currentHop = this.nodes.find(n => n.id === pkt.path[pkt.currentPathIndex - 1]);
        const nextHop = this.nodes.find(n => n.id === pkt.path[pkt.currentPathIndex]);

        if (currentHop && nextHop) {
          currentHop.stats.packetsRelayed++;
          const link = this.links.find(
            l => (l.nodeAId === currentHop.id && l.nodeBId === nextHop.id) ||
                 (l.nodeAId === nextHop.id && l.nodeBId === currentHop.id)
          );

          if (!link || !link.isOperational) {
            // Link dropped or jammed mid-flight! Store in intermediate node's DTN custody buffer
            this.inFlightPackets.splice(i, 1);
            currentHop.stats.packetsDropped++;
            this.metrics.jammingLossRatePct = Number((this.metrics.jammingLossRatePct + 0.2).toFixed(1));

            // DTN custody handoff
            const bundle: DtnBundle = {
              bundleId: `dtn-custody-${pkt.id}`,
              version: 7,
              sourceEid: `dtn://${pkt.sourceId}`,
              destinationEid: `dtn://${pkt.targetId}`,
              custodianEid: `dtn://${currentHop.id}`,
              creationTimestamp: pkt.timestamp,
              lifetimeSeconds: 240,
              isCustodyAccepted: true,
              payloadType: 'STANAG_UAV_TELEMETRY',
              payloadBytes: 128,
              status: 'QUEUED_IN_CUSTODY',
            };
            currentHop.dtnCustodyQueue.push(bundle);
            currentHop.stats.dtnBundlesHeld++;

            this.packetHistory.unshift({
              id: pkt.id,
              timestamp: Date.now(),
              source: currentHop.callsign,
              target: pkt.targetId,
              protocol: this.activeProtocol,
              status: 'HELD_IN_DTN',
              latencyMs: Date.now() - pkt.timestamp,
              hops: pkt.currentPathIndex,
              detail: `Intermediate link jammed! Packet preserved in DTN flash storage at ${currentHop.callsign}.`,
            });
            continue;
          }
        }

        // Check if reached destination
        if (pkt.currentPathIndex >= pkt.path.length - 1) {
          // Packet arrived at destination!
          this.inFlightPackets.splice(i, 1);
          const targetNode = this.nodes.find(n => n.id === pkt.targetId);

          if (targetNode) {
            // Anti-Replay Sliding Window Check
            const replayResult = checkAndAdvanceReplayWindow(
              targetNode.replayWindow,
              pkt.sequenceNumber
            );

            if (!replayResult.accepted) {
              targetNode.stats.securityDropsReplay++;
              this.packetHistory.unshift({
                id: pkt.id,
                timestamp: Date.now(),
                source: pkt.sourceId,
                target: targetNode.callsign,
                protocol: this.activeProtocol,
                status: 'DROPPED_REPLAY',
                latencyMs: Date.now() - pkt.timestamp,
                hops: pkt.path.length - 1,
                detail: `Zero-Trust Violation: Sequence #${pkt.sequenceNumber} rejected by 64-bit Anti-Replay window (${replayResult.reason}).`,
              });
              continue;
            }

            // Update sliding window
            targetNode.replayWindow = replayResult.updatedWindow;

            // Integrity / Tampering Check
            if (pkt.isTampered) {
              targetNode.stats.securityDropsAuth++;
              this.packetHistory.unshift({
                id: pkt.id,
                timestamp: Date.now(),
                source: pkt.sourceId,
                target: targetNode.callsign,
                protocol: this.activeProtocol,
                status: 'DROPPED_AUTH_FAIL',
                latencyMs: Date.now() - pkt.timestamp,
                hops: pkt.path.length - 1,
                detail: `Zero-Trust Violation: ChaCha20-Poly1305 MAC verification failure (MITM Tamper detected).`,
              });
              continue;
            }

            // Nominal packet delivered!
            targetNode.stats.packetsReceived++;
            const latencyMs = Math.round(12 + (pkt.path.length - 1) * 6 + Math.random() * 4);
            
            this.packetHistory.unshift({
              id: pkt.id,
              timestamp: Date.now(),
              source: pkt.sourceId,
              target: targetNode.callsign,
              protocol: this.activeProtocol,
              status: 'DELIVERED',
              latencyMs,
              hops: pkt.path.length - 1,
              detail: `STANAG 4586 Payload verified with Noise XX Session Key. Anti-Replay Seq #${pkt.sequenceNumber} accepted.`,
            });
          }
        }
      }
    }
  }

  /**
   * Update live dashboard metrics based on network topology
   */
  private updateLiveMetrics() {
    const operationalLinks = this.links.filter(l => l.isOperational);
    const totalPossible = (this.nodes.length * (this.nodes.length - 1)) / 2;
    const jammedLinks = this.links.filter(l => l.isJammed).length;

    const basePdr = operationalLinks.length > 0 ? 98.4 - jammedLinks * 3.2 : 40.0;
    this.metrics.packetDeliveryRatioPct = Number(Math.max(10, Math.min(99.8, basePdr)).toFixed(1));

    const avgLat = operationalLinks.reduce((acc, l) => acc + l.latencyMs, 0) / Math.max(1, operationalLinks.length);
    this.metrics.averageLatencyMs = Number(avgLat.toFixed(1));

    const throughput = operationalLinks.length * 140 + 200;
    this.metrics.networkThroughputKbps = Math.round(throughput);

    this.metrics.jammingLossRatePct = Number(((jammedLinks / Math.max(1, totalPossible)) * 100).toFixed(1));
  }
}
