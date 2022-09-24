import { Signal } from "@hmans/signal"
import { RegisteredEntity } from "."
import { entityIsArchetype } from "./util/entityIsArchetype"
import { removeFromList } from "./util/removeFromList"
import { ComponentName, EntityWith, IEntity } from "./World"

/**
 * A query is an array of component names.
 */
export type Query<T extends IEntity> = ComponentName<T>[]

export type ArchetypeEntity<
  E extends IEntity,
  Q extends Query<E> = Query<E>
> = EntityWith<RegisteredEntity<E>, Q[number]>

export class Archetype<E extends IEntity, Q extends Query<E> = Query<E>> {
  /** A list of entities belonging to this archetype. */
  public entities = new Array<ArchetypeEntity<E, Q>>()

  constructor(public query: Q) {}

  [Symbol.iterator]() {
    return this.entities[Symbol.iterator]()
  }

  /** Returns the first entity within this archetype. */
  get first(): ArchetypeEntity<E, Q> | null {
    return this.entities[0] || null
  }

  /** Listeners on this event are invoked when an entity is added to this archetype's index. */
  public onEntityAdded = new Signal<ArchetypeEntity<E, Q>>()

  /** Listeners on this event are invoked when an entity is removed from this archetype's index. */
  public onEntityRemoved = new Signal<RegisteredEntity<E>>()

  public indexEntity(entity: RegisteredEntity<E>) {
    /* If the entity is of the archetype, it should be indexed by us. */
    const shouldBeIndexed = entityIsArchetype(entity, this.query)

    /* The entity might already be indexed by us, so let's check. */
    const isIndexed = entity.__miniplex.archetypes.includes(this)

    /* If the entity should be indexed, but isn't, add it. */
    if (shouldBeIndexed && !isIndexed) {
      entity.__miniplex.archetypes.push(this)
      this.entities.push(entity)
      this.onEntityAdded.emit(entity)
      return
    }

    /* If the entity should not be indexed, but is, let's remove it. */
    if (!shouldBeIndexed && isIndexed) {
      removeFromList(this.entities, entity)
      this.onEntityRemoved.emit(entity)
      removeFromList(entity.__miniplex.archetypes, this)
      return
    }
  }

  public removeEntity(entity: RegisteredEntity<E>) {
    const pos = this.entities.indexOf(entity as any, 0)
    if (pos >= 0) {
      this.entities.splice(pos, 1)
      this.onEntityRemoved.emit(entity)
    }
  }
}
