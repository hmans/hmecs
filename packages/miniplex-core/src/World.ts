import { Bucket } from "@miniplex/bucket"
import { Archetype } from "./Archetype"
import { IEntity, PredicateFunction } from "./types"

export class World<E extends IEntity> extends Bucket<E> {
  constructor() {
    super()

    this.onEntityAdded.add((entity) => {
      for (const [predicate, bucket] of this.archetypes) {
        if (predicate(entity)) {
          bucket.add(entity)
        }
      }
    })

    this.onEntityRemoved.add((entity) => {
      for (const query of this.archetypes.values()) {
        query.remove(entity)
      }
    })
  }

  archetypes = new Map<PredicateFunction<E, any>, Archetype<any>>()

  query<D extends E>(predicate: PredicateFunction<E, D>): Archetype<D> {
    if (this.archetypes.has(predicate)) {
      return this.archetypes.get(predicate)!
    }

    const archetype = new Archetype<D>()
    this.archetypes.set(predicate, archetype)

    for (const entity of this) {
      if (predicate(entity)) {
        archetype.add(entity)
      }
    }

    return archetype
  }

  addComponent<C extends keyof E>(entity: E, component: C, value: E[C]) {
    /* Return early if the entity already has the component. */
    if (entity[component] !== undefined) return

    /* Set the component */
    entity[component] = value

    /* Update archetypes */
    for (const [predicate, archetype] of this.archetypes) {
      if (predicate(entity)) {
        archetype.add(entity)
      }
    }

    /* If this world doesn't know about the entity, we're done. */
    if (!this.has(entity)) return
  }

  removeComponent(entity: E, component: keyof E) {
    /* Return early if the entity doesn't have the component. */
    if (entity[component] === undefined) return

    /* Update archetypes */
    if (this.has(entity)) {
      const future = { ...entity }
      delete future[component]

      for (const [predicate, archetype] of this.archetypes) {
        if (predicate(future)) {
          archetype.add(entity)
        } else {
          archetype.remove(entity)
        }
      }
    }

    /* Remove the component */
    delete entity[component]
  }
}
