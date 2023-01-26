import { World } from "miniplex"
import { Entity } from "./engine"

export function createTransformSystem(world: World<Entity>) {
  const entities = world.with("transform")
  const engines = world.with("engine")

  const monitor = entities.monitor(
    ({ transform, parent }) => {
      const { engine } = engines.first!

      if (parent?.transform) {
        parent.transform.add(transform)
      } else {
        engine.scene.add(transform)
      }
    },

    ({ transform }) => {
      transform.parent?.remove(transform)
    }
  )

  return () => {
    monitor.run()
  }
}
