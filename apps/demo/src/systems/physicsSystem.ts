import { useFrame } from "@react-three/fiber"
import { WithRequiredKeys } from "miniplex"
import { MathUtils, Vector3 } from "three"
import { BOUNDS, ECS, Entity } from "../state"

type PhysicsEntity = WithRequiredKeys<Entity, "transform" | "physics">

const entities = ECS.world.archetype("transform", "physics")

const tmpVec3 = new Vector3()

let accumulatedTime = 0
const STEP = 1 / 100

export function physicsSystem(dt: number) {
  accumulatedTime += MathUtils.clamp(dt, 0, 0.2)

  while (accumulatedTime >= STEP) {
    accumulatedTime -= STEP

    for (const entity of entities) {
      if (entity.physics.sleeping) continue

      const { transform, physics } = entity

      /* Apply velocity */
      transform.position.addScaledVector(physics.velocity, STEP)

      /* Apply angular velocity */
      transform.rotation.x += physics.angularVelocity.x * STEP
      transform.rotation.y += physics.angularVelocity.y * STEP
      transform.rotation.z += physics.angularVelocity.z * STEP

      /* Apply damping */
      physics.velocity.multiplyScalar(physics.linearDamping)
      physics.angularVelocity.multiplyScalar(physics.angularDamping)

      /* Ball collisions */
      if (entity.neighbors) {
        for (const neighbor of entity.neighbors) {
          if (!neighbor.physics) continue
          if (neighbor === entity) continue
          handleBallCollision(entity, neighbor as PhysicsEntity)
        }
      }
      /* Go to sleep if we're not moving */
      if (physics.velocity.length() < 0.001) {
        // console.log("going to sleep")
        physics.sleeping = true
      }
    }
  }
}

function handleBallCollision(a: PhysicsEntity, b: PhysicsEntity) {
  /* Check groups and masks */
  if (!(a.physics.groupMask & b.physics.collisionMask)) return
  if (!(b.physics.groupMask & a.physics.collisionMask)) return

  /* Check distance */
  const diff = tmpVec3.subVectors(a.transform.position, b.transform.position)
  const distance = diff.length()
  const penetration = (a.physics.radius + b.physics.radius - distance) / 2.0

  if (penetration > 0) {
    /* Wake up both bodies */
    a.physics.sleeping = false
    b.physics.sleeping = false

    /* Resolve collision */
    const normal = diff.normalize()

    /* Shift objects */
    a.transform.position.addScaledVector(normal, penetration)
    b.transform.position.addScaledVector(normal, -penetration)

    /* Adjust velocities */
    const aVel = a.physics.velocity.dot(normal)
    const bVel = b.physics.velocity.dot(normal)

    const aMass = a.physics.mass
    const bMass = b.physics.mass

    const aNewVel =
      (aVel * (aMass - bMass) + 2 * bMass * bVel) / (aMass + bMass)
    const bNewVel =
      (bVel * (bMass - aMass) + 2 * aMass * aVel) / (aMass + bMass)

    a.physics.velocity.addScaledVector(normal, aNewVel - aVel)
    b.physics.velocity.addScaledVector(normal, bNewVel - bVel)

    /* Calculate collision force magnitude */
    const force = Math.abs(aNewVel - bNewVel) * (aMass + bMass)

    /* Call collision callbacks */
    if (!a.physics.contacts.has(b)) {
      a.physics.contacts.add(b)
      a.physics.onContactStart?.(b, force)
    }

    if (!b.physics.contacts.has(a)) {
      b.physics.contacts.add(a)
      b.physics.onContactStart?.(a, force)
    }
  } else {
    /* Remove stale contacts */
    a.physics.contacts.delete(b)
    a.physics.onContactEnd?.(b)
    b.physics.contacts.delete(a)
    b.physics.onContactEnd?.(a)
  }
}

export const PhysicsSystem = () => {
  useFrame((_, dt) => physicsSystem(MathUtils.clamp(dt, 0, 0.2)))
  return null
}
