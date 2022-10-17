import { archetype, Bucket } from "../src"

describe("new Bucket", () => {
  it("creates a bucket", () => {
    const bucket = new Bucket()
    expect(bucket).toBeDefined()
  })

  it("allows the user to pass an initial list of entities", () => {
    const entities = [1, 2, 3]
    const bucket = new Bucket({ entities })
    expect(bucket.size).toBe(3)
    expect(bucket.entities).toBe(entities)
  })
})

describe("has", () => {
  it("returns true if the bucket has the entity", () => {
    const bucket = new Bucket()
    const entity = { id: 1 }
    bucket.add(entity)
    expect(bucket.has(entity)).toBe(true)
  })

  it("returns false if the bucket does not have the entity", () => {
    const bucket = new Bucket()
    const entity = { id: 1 }
    expect(bucket.has(entity)).toBe(false)
  })

  it("returns true when the entity was added, and false after it was removed", () => {
    const bucket = new Bucket()
    const entity = { id: 1 }

    bucket.add(entity)
    expect(bucket.has(entity)).toBe(true)

    bucket.remove(entity)
    expect(bucket.has(entity)).toBe(false)
  })
})

describe("add", () => {
  it("writes an entity into the bucket", () => {
    const bucket = new Bucket()
    bucket.add({ count: 1 })
    expect(bucket.entities).toEqual([{ count: 1 }])
  })

  it("returns the object that is passed in to it", () => {
    const bucket = new Bucket()
    const entity = {}
    expect(bucket.add(entity)).toBe(entity)
  })

  it("checks the bucket's type", () => {
    const bucket = new Bucket<{ count: number }>()
    bucket.add({ count: 1 })
    expect(bucket.entities).toEqual([{ count: 1 }])
  })

  it("is idempotent", () => {
    const bucket = new Bucket()
    const entity = { count: 1 }
    bucket.add(entity)
    bucket.add(entity)
    expect(bucket.entities).toEqual([entity])
  })

  it("emits an event", () => {
    const bucket = new Bucket<{ count: number }>()
    const listener = jest.fn()
    bucket.onEntityAdded.addListener(listener)

    const entity = bucket.add({ count: 1 })
    expect(listener).toHaveBeenCalledWith(entity)
  })

  it("does not emit an event when an entity is added twice", () => {
    const entity = { count: 1 }
    const bucket = new Bucket<{ count: number }>()
    const listener = jest.fn()
    bucket.onEntityAdded.addListener(listener)

    bucket.add(entity)
    bucket.add(entity)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe("update", () => {
  it("emits an event", () => {
    const bucket = new Bucket<{ count: number }>()
    const listener = jest.fn()
    bucket.onEntityTouched.addListener(listener)

    const entity = bucket.add({ count: 1 })
    bucket.touch(entity)
    expect(listener).toHaveBeenCalledWith(entity)
  })
})

describe("remove", () => {
  it("removes an entity from the bucket", () => {
    const entity = { count: 1 }
    const bucket = new Bucket()

    bucket.add(entity)
    expect(bucket.entities).toEqual([entity])

    bucket.remove(entity)
    expect(bucket.entities).toEqual([])
  })

  it("is idempotent", () => {
    const entity = { count: 1 }
    const bucket = new Bucket()
    bucket.add(entity)
    bucket.remove(entity)
    bucket.remove(entity)
    expect(bucket.entities).toEqual([])
  })

  it("emits an event when the entity is removed", () => {
    const bucket = new Bucket<{ count: number }>()
    const listener = jest.fn()
    bucket.onEntityRemoved.addListener(listener)

    const entity = bucket.add({ count: 1 })
    bucket.remove(entity)
    expect(listener).toHaveBeenCalledWith(entity)
  })
})

describe("derive", () => {
  it("creates a new bucket", () => {
    const bucket = new Bucket()
    const derivedBucket = bucket.derive()
    expect(derivedBucket).toBeDefined()
  })

  it("if no predicate is given the derived bucket will receive the same entities", () => {
    const bucket = new Bucket()
    const derivedBucket = bucket.derive()
    bucket.add({ count: 1 })
    expect(derivedBucket.entities).toEqual([{ count: 1 }])
  })

  it("if a predicate is given the derived bucket will only receive entities that match the predicate", () => {
    const bucket = new Bucket<{ count: number }>()

    const derivedBucket = bucket.derive((entity) => entity.count > 1)

    bucket.add({ count: 1 })
    expect(derivedBucket.entities).toEqual([])

    bucket.add({ count: 2 })
    expect(derivedBucket.entities).toEqual([{ count: 2 }])
  })

  it("it properly captures predicate type guards", () => {
    type Entity = { name?: string; age?: number }

    const world = new Bucket<Entity>()
    const withName = world.derive(archetype("name"))

    const entity = world.add({ name: "Bob", age: 20 })
    expect(withName.entities).toEqual([entity])

    withName.entities[0].name.length
    /* No real test, just making sure the type is correct */
  })

  it("given equal predicates, it returns the same bucket", () => {
    type Entity = { count: number }

    const bucket = new Bucket<Entity>()
    const predicate = (entity: Entity) => entity.count > 1

    const derivedBucket = bucket.derive(predicate)
    const derivedBucket2 = bucket.derive(predicate)
    expect(derivedBucket).toBe(derivedBucket2)
  })

  it("given different predicates, it returns different buckets", () => {
    type Entity = { count: number }

    const bucket = new Bucket<Entity>()
    const derivedBucket = bucket.derive((entity) => entity.count > 1)
    const derivedBucket2 = bucket.derive((entity) => entity.count > 2)

    expect(derivedBucket).not.toBe(derivedBucket2)
  })

  it("given the same two archetype predicates, it returns the same bucket", () => {
    type Entity = { count: number }

    const bucket = new Bucket<Entity>()
    const derivedBucket = bucket.derive(archetype("count"))
    const derivedBucket2 = bucket.derive(archetype("count"))

    expect(derivedBucket).toBe(derivedBucket2)
  })
})

describe("clear", () => {
  it("removes all entities from the bucket", () => {
    const bucket = new Bucket()
    bucket.add({ count: 1 })
    bucket.add({ count: 2 })
    expect(bucket.entities).toEqual([{ count: 1 }, { count: 2 }])

    bucket.clear()
    expect(bucket.entities).toEqual([])
  })

  it("emits an event for each entity that is removed", () => {
    const bucket = new Bucket<{ count: number }>()
    const listener = jest.fn()
    bucket.onEntityRemoved.addListener(listener)

    bucket.add({ count: 1 })
    bucket.add({ count: 2 })
    bucket.clear()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("emits the onCleared event", () => {
    const bucket = new Bucket()
    const listener = jest.fn()
    bucket.onCleared.addListener(listener)

    bucket.clear()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe("dispose", () => {
  it("removes all entities from the bucket", () => {
    const bucket = new Bucket()
    bucket.add({ count: 1 })
    bucket.add({ count: 2 })
    expect(bucket.entities).toEqual([{ count: 1 }, { count: 2 }])

    bucket.dispose()
    expect(bucket.entities).toEqual([])
  })

  it("also disposes any derived buckets", () => {
    const bucket = new Bucket()
    const derivedBucket = bucket.derive()
    bucket.add({ count: 1 })
    expect(derivedBucket.entities).toEqual([{ count: 1 }])

    bucket.dispose()
    expect(derivedBucket.entities).toEqual([])
  })

  it("also disposes buckets derived from derived buckets", () => {
    const bucket = new Bucket()
    const derivedBucket = bucket.derive()
    const derivedBucket2 = derivedBucket.derive()
    bucket.add({ count: 1 })
    expect(derivedBucket2.entities).toEqual([{ count: 1 }])

    bucket.dispose()
    expect(derivedBucket2.entities).toEqual([])
  })

  it("when a derived bucket is disposed, remove its listeners from us", () => {
    const bucket = new Bucket()
    const derivedBucket = bucket.derive()
    expect(bucket.onEntityAdded.listeners.size).toEqual(1)

    derivedBucket.dispose()
    expect(bucket.onEntityAdded.listeners.size).toEqual(0)
  })
})

describe("size", () => {
  it("returns the size of the world", () => {
    const bucket = new Bucket()
    bucket.add({})
    expect(bucket.size).toBe(1)
  })

  it("is equal to the amount of entities stored in the bucket", () => {
    const bucket = new Bucket()
    bucket.add({})
    expect(bucket.size).toBe(bucket.entities.length)
  })
})

describe("Symbol.iterator", () => {
  it("iterating through a bucket happens in reverse order", () => {
    const bucket = new Bucket()
    const entity1 = bucket.add({})
    const entity2 = bucket.add({})
    const entity3 = bucket.add({})

    const entities = []
    for (const entity of bucket) {
      entities.push(entity)
    }

    expect(entities).toEqual([entity3, entity2, entity1])
  })

  it("allows for safe entity deletions", () => {
    const bucket = new Bucket()
    const entity1 = bucket.add({})
    const entity2 = bucket.add({})
    const entity3 = bucket.add({})

    const entities = []
    for (const entity of bucket) {
      entities.push(entity)
      bucket.remove(entity)
    }

    expect(entities).toEqual([entity3, entity2, entity1])
    expect(bucket.entities).toEqual([])
  })
})
