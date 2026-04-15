import {
  NETWORK_CONFIG,
  PARTICIPANT_TYPES,
  TYPE_CLUSTER_CENTERS,
  type ParticipantType,
} from "@/lib/constants"

export type NetworkNode = {
  id: number
  position: [number, number, number]
  auraScore: number
  type: ParticipantType
  sparkCount: number
}

export type NetworkEdge = {
  source: number
  target: number
}

export type NetworkData = {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  adjacency: number[][]
  topAuraNodeIds: number[]
}

type MutableVector = {
  x: number
  y: number
  z: number
}

function createRandom(seed: number) {
  let state = seed

  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function randomInSphere(random: () => number, radius: number): MutableVector {
  const theta = random() * Math.PI * 2
  const phi = Math.acos(2 * random() - 1)
  const distance = Math.cbrt(random()) * radius
  const sinPhi = Math.sin(phi)

  return {
    x: distance * sinPhi * Math.cos(theta),
    y: distance * sinPhi * Math.sin(theta),
    z: distance * Math.cos(phi),
  }
}

function distanceSquared(a: MutableVector, b: MutableVector) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}

function normalize(vector: MutableVector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1
  vector.x /= length
  vector.y /= length
  vector.z /= length
  return vector
}

function pickType(random: () => number): ParticipantType {
  const roll = random()

  if (roll < 0.34) return "holder"
  if (roll < 0.52) return "trader"
  if (roll < 0.68) return "lp"
  if (roll < 0.81) return "developer"
  if (roll < 0.93) return "researcher"
  return "governor"
}

function generateInitialNodes(random: () => number) {
  const nodes: Omit<NetworkNode, "position">[] = []
  const positions: MutableVector[] = []
  const nodeIdsByType: Record<ParticipantType, number[]> = {
    holder: [],
    lp: [],
    trader: [],
    developer: [],
    researcher: [],
    governor: [],
  }

  for (let id = 0; id < NETWORK_CONFIG.nodeCount; id += 1) {
    const type = pickType(random)
    const center = TYPE_CLUSTER_CENTERS[type]
    const offset = randomInSphere(random, 18 + random() * 7)
    const drift = randomInSphere(random, 8)

    const position = {
      x: center[0] + offset.x + drift.x * 0.25,
      y: center[1] + offset.y + drift.y * 0.25,
      z: center[2] + offset.z + drift.z * 0.25,
    }

    positions.push(position)
    nodeIdsByType[type].push(id)
    nodes.push({
      id,
      type,
      auraScore: Math.round(20 + random() * 80),
      sparkCount: Math.round(random() * 20),
    })
  }

  return { nodes, positions, nodeIdsByType }
}

function generateEdges(
  random: () => number,
  nodes: Omit<NetworkNode, "position">[],
  nodeIdsByType: Record<ParticipantType, number[]>
) {
  const edges: NetworkEdge[] = []
  const adjacency = Array.from({ length: nodes.length }, () => [] as number[])
  const seenEdges = new Set<string>()

  while (edges.length < NETWORK_CONFIG.edgeCount) {
    const source = Math.floor(random() * nodes.length)
    const sourceNode = nodes[source]
    const preferSameType = random() < 0.72
    const candidatePool = preferSameType
      ? nodeIdsByType[sourceNode.type]
      : nodeIdsByType[PARTICIPANT_TYPES[Math.floor(random() * PARTICIPANT_TYPES.length)]]

    if (candidatePool.length === 0) {
      continue
    }

    const target = candidatePool[Math.floor(random() * candidatePool.length)]

    if (source === target) {
      continue
    }

    const a = Math.min(source, target)
    const b = Math.max(source, target)
    const key = `${a}:${b}`

    if (seenEdges.has(key)) {
      continue
    }

    seenEdges.add(key)
    edges.push({ source: a, target: b })
    adjacency[a].push(b)
    adjacency[b].push(a)
  }

  return { edges, adjacency }
}

function relaxPositions(
  random: () => number,
  positions: MutableVector[],
  nodes: Omit<NetworkNode, "position">[],
  edges: NetworkEdge[]
) {
  const velocities = positions.map(() => ({ x: 0, y: 0, z: 0 }))
  const radiusLimit = NETWORK_CONFIG.sphereRadius

  for (let iteration = 0; iteration < 12; iteration += 1) {
    for (let index = 0; index < positions.length; index += 1) {
      const position = positions[index]
      const velocity = velocities[index]
      const center = TYPE_CLUSTER_CENTERS[nodes[index].type]

      velocity.x += (center[0] - position.x) * 0.012 + (random() - 0.5) * 0.01
      velocity.y += (center[1] - position.y) * 0.012 + (random() - 0.5) * 0.01
      velocity.z += (center[2] - position.z) * 0.012 + (random() - 0.5) * 0.01
    }

    for (const edge of edges) {
      const source = positions[edge.source]
      const target = positions[edge.target]
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dz = target.z - source.z

      velocities[edge.source].x += dx * 0.0024
      velocities[edge.source].y += dy * 0.0024
      velocities[edge.source].z += dz * 0.0024

      velocities[edge.target].x -= dx * 0.0024
      velocities[edge.target].y -= dy * 0.0024
      velocities[edge.target].z -= dz * 0.0024
    }

    for (let index = 0; index < positions.length; index += 1) {
      const position = positions[index]
      const velocity = velocities[index]

      position.x += velocity.x
      position.y += velocity.y
      position.z += velocity.z

      velocity.x *= 0.82
      velocity.y *= 0.82
      velocity.z *= 0.82

      const distance = Math.hypot(position.x, position.y, position.z)
      if (distance > radiusLimit) {
        const normal = normalize({ ...position })
        position.x = normal.x * radiusLimit
        position.y = normal.y * radiusLimit
        position.z = normal.z * radiusLimit
      }
    }
  }

  // Add a final soft overlap pass so clusters feel organic instead of hard-separated.
  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index]
    const nearbyJitter = randomInSphere(random, 1.6)
    position.x += nearbyJitter.x * 0.35
    position.y += nearbyJitter.y * 0.35
    position.z += nearbyJitter.z * 0.35
  }
}

export function generateMockData(): NetworkData {
  const random = createRandom(42_069)
  const { nodes: initialNodes, positions, nodeIdsByType } = generateInitialNodes(random)
  const { edges, adjacency } = generateEdges(random, initialNodes, nodeIdsByType)

  relaxPositions(random, positions, initialNodes, edges)

  const nodes: NetworkNode[] = initialNodes.map((node, index) => {
    const nearestNeighborDistance = adjacency[index].reduce((closest, neighborId) => {
      const distance = distanceSquared(positions[index], positions[neighborId])
      return Math.min(closest, distance)
    }, Number.POSITIVE_INFINITY)

    // Slightly boost high-signal nodes that are central to the local graph.
    const centralityBoost =
      Number.isFinite(nearestNeighborDistance) && nearestNeighborDistance < 140
        ? 7
        : 0

    return {
      ...node,
      auraScore: clamp(node.auraScore + centralityBoost, 0, 100),
      position: [
        positions[index].x,
        positions[index].y,
        positions[index].z,
      ] as [number, number, number],
    }
  })

  const topAuraNodeIds = [...nodes]
    .sort((a, b) => b.auraScore - a.auraScore)
    .slice(0, Math.ceil(nodes.length * NETWORK_CONFIG.labelPercentile))
    .map((node) => node.id)

  return {
    nodes,
    edges,
    adjacency,
    topAuraNodeIds,
  }
}
