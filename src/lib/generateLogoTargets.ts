import * as THREE from "three"
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js"

import uniswapUniLogoSvg from "@/assets/uniswap-uni-logo.svg?raw"

export type LogoTarget = {
  position: THREE.Vector3
  influence: number
}

type TriangleData = {
  a: THREE.Vector2
  b: THREE.Vector2
  c: THREE.Vector2
  cumulativeArea: number
}

type ShapeMetrics = {
  shape: THREE.Shape
  totalArea: number
  triangles: TriangleData[]
  bounds: THREE.Box2
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

function triangleArea(a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2) {
  return Math.abs(
    (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) * 0.5
  )
}

function sampleTrianglePoint(
  a: THREE.Vector2,
  b: THREE.Vector2,
  c: THREE.Vector2,
  random: () => number
) {
  let r1 = random()
  let r2 = random()

  if (r1 + r2 > 1) {
    r1 = 1 - r1
    r2 = 1 - r2
  }

  const ab = b.clone().sub(a).multiplyScalar(r1)
  const ac = c.clone().sub(a).multiplyScalar(r2)
  return a.clone().add(ab).add(ac)
}

function createTriangleData(shape: THREE.Shape) {
  const extracted = shape.extractPoints(28)
  const contour = extracted.shape
  const holes = extracted.holes
  const allPoints = contour.concat(...holes)
  const faces = THREE.ShapeUtils.triangulateShape(contour, holes)

  const triangles: TriangleData[] = []
  let totalArea = 0

  for (const [aIndex, bIndex, cIndex] of faces) {
    const a = allPoints[aIndex]
    const b = allPoints[bIndex]
    const c = allPoints[cIndex]
    const area = triangleArea(a, b, c)

    if (area <= 0) {
      continue
    }

    totalArea += area
    triangles.push({
      a,
      b,
      c,
      cumulativeArea: totalArea,
    })
  }

  return {
    totalArea,
    triangles,
  }
}

function getShapeBounds(shape: THREE.Shape) {
  const bounds = new THREE.Box2()
  const points = shape.getPoints(96)

  for (const point of points) {
    bounds.expandByPoint(point)
  }

  return bounds
}

function filterCoreShapes(shapes: ShapeMetrics[]) {
  const overallBounds = new THREE.Box2()

  for (const entry of shapes) {
    overallBounds.union(entry.bounds)
  }

  const overallSize = overallBounds.getSize(new THREE.Vector2())
  const leftThreshold = overallBounds.min.x + overallSize.x * 0.12
  const minWidth = overallSize.x * 0.16
  const minCenterX = overallBounds.min.x + overallSize.x * 0.18

  return shapes.filter((entry) => {
    const size = entry.bounds.getSize(new THREE.Vector2())
    const center = entry.bounds.getCenter(new THREE.Vector2())
    const isLeftOutlier = entry.bounds.max.x < leftThreshold
    const isTallNarrowOutlier =
      center.x < minCenterX && size.x < minWidth && size.y > overallSize.y * 0.45

    return !isLeftOutlier && !isTallNarrowOutlier
  })
}

function sampleShapePoints(
  triangles: TriangleData[],
  totalArea: number,
  count: number,
  random: () => number
) {
  const points: THREE.Vector2[] = []

  for (let index = 0; index < count; index += 1) {
    // Stratify the sampling across the total triangle area so the logo reads
    // more cohesively on first render instead of clustering from pure randomness.
    const targetArea = ((index + random() * 0.35) / count) * totalArea
    const triangle =
      triangles.find((entry) => entry.cumulativeArea >= targetArea) ??
      triangles[triangles.length - 1]

    if (!triangle) {
      continue
    }

    points.push(sampleTrianglePoint(triangle.a, triangle.b, triangle.c, random))
  }

  return points
}

function distributeCounts(totalCount: number, weights: number[]) {
  const sum = weights.reduce((accumulator, weight) => accumulator + weight, 0)
  const rawCounts = weights.map((weight) => (weight / sum) * totalCount)
  const counts = rawCounts.map((value) => Math.floor(value))
  let remaining = totalCount - counts.reduce((accumulator, count) => accumulator + count, 0)

  while (remaining > 0) {
    let bestIndex = 0
    let bestRemainder = -1

    for (let index = 0; index < rawCounts.length; index += 1) {
      const remainder = rawCounts[index] - counts[index]
      if (remainder > bestRemainder) {
        bestRemainder = remainder
        bestIndex = index
      }
    }

    counts[bestIndex] += 1
    remaining -= 1
  }

  return counts
}

export function generateLogoTargets(nodeCount: number) {
  const random = createRandom(2_024_0415)
  const loader = new SVGLoader()
  const { paths } = loader.parse(uniswapUniLogoSvg)
  const shapes = paths.flatMap((path) => SVGLoader.createShapes(path))

  const shapeData = filterCoreShapes(
    shapes
    .map((shape) => {
      const { triangles, totalArea } = createTriangleData(shape)
      return {
        bounds: getShapeBounds(shape),
        shape,
        triangles,
        totalArea,
      }
    })
    .filter((entry) => entry.totalArea > 0 && entry.triangles.length > 0)
  )

  const directCount = Math.floor(nodeCount * 0.985)
  const haloCount = nodeCount - directCount
  const distributedCounts = distributeCounts(
    directCount,
    shapeData.map((entry) => entry.totalArea)
  )

  const sampledPoints = shapeData.flatMap((entry, index) =>
    sampleShapePoints(
      entry.triangles,
      entry.totalArea,
      distributedCounts[index],
      random
    )
  )

  const bounds = new THREE.Box2()
  for (const point of sampledPoints) {
    bounds.expandByPoint(point)
  }

  const center = bounds.getCenter(new THREE.Vector2())
  const size = bounds.getSize(new THREE.Vector2())
  const scale = 54 / Math.max(size.x || 1, size.y || 1)

  const directTargets = sampledPoints.map((point, index) => {
    const normalizedX = (point.x - center.x) * scale
    const normalizedY = -(point.y - center.y) * scale
    const normalizedZ =
      (random() - 0.5) * 0.18 +
      Math.sin(index * 0.41) * 0.06 +
      Math.cos(index * 0.17) * 0.04

    return {
      position: new THREE.Vector3(normalizedX, normalizedY, normalizedZ),
      influence: 0.999,
    }
  })

  const haloTargets = Array.from({ length: haloCount }, () => {
    const anchor =
      directTargets[Math.floor(random() * directTargets.length)]?.position ??
      new THREE.Vector3()

    const radius = 0.12 + random() * 0.48
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)
    const sinPhi = Math.sin(phi)

    return {
      position: new THREE.Vector3(
        anchor.x + radius * sinPhi * Math.cos(theta),
        anchor.y + radius * sinPhi * Math.sin(theta),
        anchor.z + radius * Math.cos(phi) * 0.08
      ),
      influence: 0.972 + random() * 0.02,
    }
  })

  const targets = [...directTargets, ...haloTargets]

  for (let index = targets.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = targets[index]
    targets[index] = targets[swapIndex]
    targets[swapIndex] = current
  }

  return targets.slice(0, nodeCount)
}
