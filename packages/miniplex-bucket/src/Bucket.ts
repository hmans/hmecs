import { Event } from "@hmans/event"

/**
 * A class wrapping an array of entities of a specific type, providing
 * performance-optimized methods for adding, looking up and removing entities, and events
 * for when entities are added or removed.
 */
export class Bucket<E> implements Iterable<E> {
  /* Custom iterator that iterates over all entities in reverse order. */
  [Symbol.iterator]() {
    let index = this.entities.length

    return {
      next: () => {
        let value: E | null = null

        do {
          value = this.entities[--index]
        } while (value === null && index >= 0)

        return { value, done: index < 0 }
      }
    }
  }

  constructor(public entities: E[] = []) {
    this.add = this.add.bind(this)
    this.remove = this.remove.bind(this)

    /* Register all entity positions */
    for (let i = 0; i < entities.length; i++) {
      this.entityPositions.set(entities[i], i)
    }
  }

  /**
   * Fired when an entity has been added to the bucket.
   */
  onEntityAdded = new Event<E>()

  /**
   * Fired when an entity is about to be removed from the bucket.
   */
  onEntityRemoved = new Event<E>()

  /**
   * A map of entity positions, used for fast lookups.
   */
  private entityPositions = new Map<E, number>()

  /**
   * Returns the total size of the bucket, i.e. the number of entities it contains.
   */
  get size() {
    return this.entityPositions.size
  }

  /**
   * Returns true if the bucket contains the given entity.
   *
   * @param entity The entity to check for.
   * @returns `true` if the specificed entity is in this bucket, `false` otherwise.
   */
  has(entity: any): entity is E {
    return this.entityPositions.has(entity)
  }

  /**
   * Adds the given entity to the bucket. If the entity is already in the bucket, it is
   * not added again.
   *
   * @param entity The entity to add to the bucket.
   * @returns The entity passed into this function (regardless of whether it was added or not).
   */
  add<D extends E>(entity: D): D & E {
    if (entity && !this.has(entity)) {
      this.entities.push(entity)
      this.entityPositions.set(entity, this.entities.length - 1)

      /* Emit our own onEntityAdded event */
      this.onEntityAdded.emit(entity)
    }

    return entity
  }

  /**
   * Removes the given entity from the bucket. If the entity is not in the bucket, nothing
   * happens.
   *
   * @param entity The entity to remove from the bucket.
   * @returns The entity passed into this function (regardless of whether it was removed or not).
   */
  remove(entity: E) {
    if (this.has(entity)) {
      /* Emit our own onEntityRemoved event. */
      this.onEntityRemoved.emit(entity)

      /* Get the entity's current position. */
      const index = this.entityPositions.get(entity)!
      this.entityPositions.delete(entity)

      /* Null the entry */
      this.entities[index] = null as any

      /* Maybe TODO: track the freed position so we can reuse it */
    }

    return entity
  }

  /**
   * Removes all entities from the bucket. Will cause the `onEntityRemoved` event to be
   * fired for each entity.
   */
  clear() {
    for (const entity of this) {
      this.remove(entity)
    }
  }
}
