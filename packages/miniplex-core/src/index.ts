import { Bucket } from "@miniplex/bucket"
export * from "@miniplex/bucket"

export type Predicate<E, D extends E> =
  | ((v: E) => v is D)
  | ((entity: E) => boolean)

/**
 * A utility type that marks the specified properties as required.
 */
export type With<E, P extends keyof E> = E & Required<Pick<E, P>>

export type Without<E, P extends keyof E> = Omit<E, P>

/**
 * A utility type that removes all optional properties.
 */
export type Strict<T> = WithoutOptional<T>

/* Utility types */

type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never
}

type WithoutOptional<T> = Pick<T, Exclude<keyof T, OptionalKeys<T>[keyof T]>>

/* Query configuration */

export type QueryConfiguration<E> = {
  with: any[]
  without: any[]
  predicate?: Function
}

interface IQueryableBucket<E> {
  with<C extends keyof E>(...components: C[]): Query<With<E, C>>
  without<C extends keyof E>(...components: C[]): Query<Without<E, C>>
  where<D extends E>(predicate: Predicate<E, D>): Query<D>
}

export class World<E extends {} = any>
  extends Bucket<E>
  implements IQueryableBucket<E>
{
  constructor(entities: E[] = []) {
    super(entities)

    /* When entities are added, reindex them immediately */
    this.onEntityAdded.subscribe((entity) => {
      this.reindex(entity)
    })

    /* When entities are removed, also make sure to forget about their IDs. */
    this.onEntityRemoved.subscribe((entity) => {
      /* Remove the entity from all known queries */
      this.cachedQueries.forEach((query) => query.remove(entity))

      /* Remove the entity from the ID map */
      if (this.entityToId.has(entity)) {
        const id = this.entityToId.get(entity)!
        this.idToEntity.delete(id)
        this.entityToId.delete(entity)
      }
    })
  }

  addComponent<C extends keyof E>(entity: E, component: C, value: E[C]) {
    /* Return early if the entity already has the component. */
    if (entity[component] !== undefined) return

    /* Set the component */
    entity[component] = value

    /* Touch the entity, triggering re-checks of indices */
    if (this.has(entity)) {
      this.reindex(entity)
    }
  }

  removeComponent(entity: E, component: keyof E) {
    /* Return early if the entity doesn't even have the component. */
    if (entity[component] === undefined) return

    /* If this world knows about the entity, notify any derived buckets about the change. */
    if (this.has(entity)) {
      const future = { ...entity }
      delete future[component]
      this.reindex(entity, future)
    }

    /* Remove the component. */
    delete entity[component]
  }

  query<D>(config: QueryConfiguration<D>): Query<D> {
    /* Normalize query */
    const normalizedConfig = {
      with: normalizeComponents(config.with),
      without: normalizeComponents(config.without),
      predicate: config.predicate
    }

    /* If we're using a predicate, never cache! */
    if (normalizedConfig.predicate) {
      return new Query<D>(this, normalizedConfig)
    }

    const key = configKey(normalizedConfig)

    /* Use existing query if we can find one */
    for (const query of this.cachedQueries) {
      if (query.key === key) {
        return query as Query<D>
      }
    }

    /* Otherwise, create new query */
    const query = new Query<D>(this, normalizedConfig)
    this.cachedQueries.add(query)
    return query
  }

  with<C extends keyof E>(...components: C[]) {
    return this.query<With<E, C>>({
      with: components,
      without: []
    })
  }

  without<C extends keyof E>(...components: C[]) {
    return this.query<Without<E, C>>({
      with: [],
      without: components
    })
  }

  where<D extends E>(predicate: Predicate<E, D>) {
    return this.query<D>({
      with: [],
      without: [],
      predicate
    })
  }

  protected cachedQueries = new Set<Query<any>>()
  protected connectedQueries = new Set<Query<any>>()

  connectQuery(query: Query<any>) {
    if (this.connectedQueries.has(query)) return

    this.connectedQueries.add(query)

    for (const entity of this) {
      if (query.want(entity)) {
        query.add(entity)
      }
    }
  }

  disconnectQuery(query: Query<any>) {
    this.connectedQueries.delete(query)
  }

  isQueryConnected(query: Query<any>) {
    return this.connectedQueries.has(query)
  }

  protected reindex(entity: E, future = entity) {
    for (const query of this.connectedQueries) {
      query.evaluate(entity, future)
    }
  }

  /* IDs */
  private entityToId = new Map<E, number>()
  private idToEntity = new Map<number, E>()
  private nextId = 0

  id(entity: E) {
    /* We only ever want to generate IDs for entities that are actually in the world. */
    if (!this.has(entity)) return undefined

    /* Lazily generate an ID. */
    if (!this.entityToId.has(entity)) {
      const id = this.nextId++
      this.entityToId.set(entity, id)
      this.idToEntity.set(id, entity)
    }

    return this.entityToId.get(entity)!
  }

  entity(id: number) {
    return this.idToEntity.get(id)
  }
}

export class Query<E> extends Bucket<E> implements IQueryableBucket<E> {
  get connected() {
    return this.world.isQueryConnected(this)
  }

  public key: string

  constructor(public world: World, public config: QueryConfiguration<E>) {
    super()

    this.key = configKey(config)

    this.onEntityAdded.onSubscribe.subscribe(() => this.connect())
    this.onEntityRemoved.onSubscribe.subscribe(() => this.connect())
  }

  get entities() {
    this.connect()
    return super.entities
  }

  [Symbol.iterator]() {
    this.connect()
    return super[Symbol.iterator]()
  }

  connect() {
    this.world.connectQuery(this)
    return this
  }

  disconnect() {
    this.world.disconnectQuery(this)
    return this
  }

  with<C extends keyof E>(...components: C[]) {
    return this.world.query<With<E, C>>({
      ...this.config,
      with: [...this.config.with, ...components]
    })
  }

  without<C extends keyof E>(...components: C[]) {
    return this.world.query<Without<E, C>>({
      ...this.config,
      without: [...this.config.without, ...components]
    })
  }

  where<D extends E>(predicate: Predicate<E, D>) {
    return this.world.query<D>({
      ...this.config,
      predicate: this.config.predicate
        ? (e: any) => this.config.predicate!(e) && predicate(e)
        : predicate
    })
  }

  want(entity: E) {
    return (
      this.config.with.every(
        (component) => entity[component as keyof typeof entity] !== undefined
      ) &&
      this.config.without.every(
        (component) => entity[component as keyof typeof entity] === undefined
      ) &&
      (!this.config.predicate || this.config.predicate(entity))
    )
  }

  evaluate(entity: any, future = entity) {
    const wanted = this.want(future)
    const has = this.has(entity)

    if (wanted && !has) {
      this.add(entity)
    } else if (!wanted && has) {
      this.remove(entity)
    }
  }
}

const normalizeComponents = (components: any[]) => [
  ...new Set(components.sort().filter((c) => !!c && c !== ""))
]

function configKey(config: QueryConfiguration<any>) {
  return `${config.with.join(",")}:${config.without.join(",")}`
}

export function hasComponents<E, C extends keyof E>(
  entity: E,
  ...components: C[]
): entity is With<E, C> {
  return components.every((c) => entity[c] !== undefined)
}
