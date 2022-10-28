import { Query } from "./Query"
import { IEntity } from "./types"
import { World } from "./World"

type ArchetypeQuery<E> = {
  all?: (keyof E)[]
  none?: (keyof E)[]
  any?: (keyof E)[]
}

export class Archetype<D extends E, E extends IEntity> extends Query<D, E> {
  constructor(public world: World<E>, public query: ArchetypeQuery<E>) {
    super(world, (entity): entity is D => {
      if (query.all) {
        for (const key of query.all) {
          if (!entity.hasOwnProperty(key)) {
            return false
          }
        }
      }

      if (query.none) {
        for (const key of query.none) {
          if (entity.hasOwnProperty(key)) {
            return false
          }
        }
      }

      if (query.any && query.any.length > 0) {
        for (const key of query.any) {
          if (entity.hasOwnProperty(key)) {
            return true
          }
        }

        return false
      }

      return true
    })
  }
}
