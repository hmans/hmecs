import { useFrame } from "@react-three/fiber"
import { archetype } from "miniplex"
import { ECS, Entity } from "../state"

const entities = ECS.world.where(archetype("destroy"))

export const DestroySystem = () => {
  useFrame(() => {
    for (const entity of entities) {
      ECS.world.remove(entity)
    }
  })

  return null
}

export const queueDestroy = (entity: Entity) => {
  if ("destroy" in entity) return
  ECS.world.addComponent(entity, "destroy", true)
}
