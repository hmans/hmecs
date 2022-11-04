![Miniplex](https://user-images.githubusercontent.com/1061/193760498-fb6b4d42-f48b-48b4-b7c1-b5b5674df55c.jpg)  
[![Version](https://img.shields.io/npm/v/miniplex-react?style=for-the-badge)](https://www.npmjs.com/package/miniplex-react)
[![Tests](https://img.shields.io/github/workflow/status/hmans/miniplex/Tests?label=CI&style=for-the-badge)](https://github.com/hmans/miniplex/actions/workflows/tests.yml)
[![Downloads](https://img.shields.io/npm/dt/miniplex.svg?style=for-the-badge)](https://www.npmjs.com/package/miniplex)
[![Bundle Size](https://img.shields.io/bundlephobia/min/miniplex?style=for-the-badge&label=bundle%20size)](https://bundlephobia.com/result?p=miniplex)

> **Warning** You are looking at the work-in-progress documentation for the upcoming **version 2.0** of Miniplex and its companion libraries. If you're looking for 1.0 documentation, [please go here](https://github.com/hmans/miniplex/tree/miniplex%401.0.0).

## Testimonials

> Tested @hmans' Miniplex library over the weekend and after having previously implemented an ECS for my wip browser game, I have to say **Miniplex feels like the "right" way to do ECS in #r3f**. - [Brian Breiholz](https://twitter.com/BrianBreiholz/status/1577182839509962752)

## Table of Contents

- [Example](#example)
- [Overview](#overview)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)

## Example

```ts
/* Define an entity type */
type Entity = {
  position: { x: number; y: number }
  velocity?: { x: number; y: number }
  health?: {
    current: number
    max: number
  }
  poisoned?: true
}

/* Create a world with entities of that type */
const world = new World<Entity>()

/* Create an entity */
const player = world.add({
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  health: { current: 100, max: 100 }
})

/* Create another entity */
const enemy = world.add({
  position: { x: 10, y: 10 },
  velocity: { x: 0, y: 0 },
  health: { current: 100, max: 100 }
})

/* Create some archetype queries: */
const archetypes = {
  moving: world.with("position", "velocity"),
  health: world.with("health"),
  poisoned: archetypes.health.with("poisoned")
}

/* Create functions that perform actions on entities: */
function damage({ health }: With<Entity, "health">, amount: number) {
  health.current -= amount
}

function points(entity: With<Entity, "poison">) {
  world.addComponent(entity, "poison", true)
}

/* Create a bunch of systems: */
function moveSystem() {
  for (const { position, velocity } of archetypes.moving) {
    position.x += velocity.x
    position.y += velocity.y
  }
}

function poisonSystem() {
  for (const { health, poisoned } of archetypes.poisoned) {
    health.current -= 1
  }
}

function healthSystem() {
  for (const entity of archetypes.health.where(
    ({ health }) => health.current <= 0
  )) {
    world.removeEntity(entity)
  }
}

/* React to entities appearing/disappearing in archetypes: */
archetypes.poisoned.onEntityAdded((entity) => {
  console.log("Poisoned:", entity)
})
```

## Overview

**Miniplex is an entity management system for games and similarly demanding applications.** Instead of creating separate buckets for different types of entities (eg. asteroids, enemies, pickups, the player, etc.), you throw all of them into a single store, describe their properties through components, and then write code that performs updates on entities of specific types.

If you're familiar with **Entity Component System** architecture, this will sound familiar to you -- and rightfully so, for Miniplex is, first and foremost, a very straight-forward ECS implementation!

If you're hearing about this approach for the first time, maybe it will sound a little counter-intuitive -- but once you dive into it, you will understand how it can help you decouple concerns and keep your codebase well-structured and maintainable. [This post](https://community.amethyst.rs/t/archetypal-vs-grouped-ecs-architectures-my-take/1344) has a nice summary:

> An ECS library can essentially thought of as an API for performing a loop over a homogeneous set of entities, filtering them by some condition, and pulling out a subset of the data associated with each entity. The goal of the library is to provide a usable API for this, and to do it as fast as possible.

For a more in-depth explanation, please also see Sander Mertens' wonderful [Entity Component System FAQ](https://github.com/SanderMertens/ecs-faq).

### Headline Features

- A very strong focus on **developer experience**. Miniplex aims to be the most convenient to use ECS implementation while still providing great performance.
- **[Tiny package size](https://bundlephobia.com/package/miniplex)** and **minimal dependencies**.
- React glue available through [@miniplex/react](https://www.npmjs.com/package/miniplex-react), maybe more in the future?
- Can power your entire project or just parts of it.
- Written in **TypeScript**, with full type checking for your entities.

### Differences from other ECS libraries

If you've used other Entity Component System libraries before, here's how Miniplex is different from some of them:

#### Entities are just normal JavaScript objects

Entities are just **plain JavaScript objects**, and components are just **properties on those objects**. Component data can be **anything** you need, from primitive values to entire class instances, or even [entire reactive stores](https://github.com/hmans/statery). Miniplex puts developer experience first, and the most important way it does this is by making its usage feel as natural as possible in a JavaScript environment.

Miniplex does not expect you to programmatically declare component types before using them; if you're using TypeScript, you can provide a type describing your entities and Miniplex will provide full edit- and compile-time type hints and safety.

#### Miniplex does not have a built-in notion of systems

Unlike the majority of ECS libraries, Miniplex does not have any built-in notion of systems, and does not perform any of its own scheduling. This is by design; your project will likely already have an opinion on how to schedule code execution, and instead of providing its own and potentially conflicting setup, Miniplex will neatly snuggle into the one you already have.

Systems are extremely straight-forward: just write simple functions that operate on the Miniplex world, and run them in whatever fashion fits best to your project (`setInterval`, `requestAnimationFrame`, `useFrame`, your custom ticker implementation, and so on.)

#### Archetypal Queries

Entity queries are performed through **archetypes**, with individual archetypes representing a subset of your world's entities that have (or don't have) a specific set of components, and/or match a specific predicate.

#### Focus on Object Identities over numerical IDs

Most interactions with Miniplex are using **object identity** to identify entities or archetypes (instead of numerical IDs). Miniplex provides a lightweight mechanism to generate unique IDs for your entities, but it is entirely optional. In more complex projects that need stable entity IDs, the user is encouraged to implement their own ID generation and management.

## Installation

> **Warning** Since this is the documentation for the upcoming 2.0 version of Miniplex, we will be using the `next` tag for installation. If you'd rather use the stable release of the library, [please refer to the 1.0 documentation](https://github.com/hmans/miniplex/tree/miniplex%401.0.0).


Add the `miniplex` package to your project using your favorite package manager:

```bash
npm add miniplex@next
yarn add miniplex@next
pnpm add miniplex@next
```

## Basic Usage

Miniplex can be used in any JavaScript or TypeScript project, regardless of which extra frameworks you might be using. Before we talk about using Miniplex in React, let's start with the basics!

### Creating a World

Miniplex manages entities in **worlds**, which act as containers for entities as well as an API for interacting with them. You can have one big world in your project, or several smaller worlds handling separate concerns.

```ts
import { World } from "miniplex"

const world = new World()
```

### Typing your Entities (optional, but recommended!)

If you're using TypeScript, you can define a type that describes your entities and provide it to the `World` constructor to get full type support in all interactions with it:

```ts
import { World } from "miniplex"

type Entity = {
  position: { x: number; y: number; z: number }
  velocity?: { x: number; y: number; z: number }
  health?: number
  paused?: true
}

const world = new World<Entity>()
```

### Creating Entities

The main interactions with a Miniplex world are creating and destroying entities, and adding or removing components from these entities. Entities are just plain JavaScript objects that you pass into the world's `add` and `remove` functions, like here:

```ts
const entity = world.add({ position: { x: 0, y: 0, z: 0 } })
```

We've directly added a `position` component to the entity. If you're using TypeScript, the component values here will be type-checked against the type you provided to the `World` constructor.

> **Note** Adding the entity will make it known to the world and all relevant archetypes, but it will not change the entity object itself in any way. In Miniplex, entities can _live in multiple worlds at the same time_!

### Adding Components

The `World` instance provides `addComponent` and `removeComponent` functions for adding and removing components from entities. Let's add a `velocity` component to the entity. Note that we're passing the entity itself as the first argument:

```ts
world.addComponent(entity, "velocity", { x: 10, y: 0, z: 0 })
```

Now the entity has two components: `position` and `velocity`.

### Querying Entities

We're going to write some code that moves entities according to their velocity. You will typically implement this as something called a **system**, which, in Miniplex, are typically just normal functions that fetch the entities they are interested in, and then perform some operation on them.

Fetching only the entities that a system is interested in is the most important part in all this, and it is done through something called **archetypes** that can be thought of as something akin to database indices.

Since we're going to move entities, we're interested in entities that have both the `position` and `velocity` components, so let's create an archetype for that:

```ts
/* Get all entities with position and velocity */
const movingEntities = world.with("position", "velocity")
```

> **Note** There is also `without`, which will return all entities that do _not_ have the specified components:
>
> ```ts
> const active = world.without("paused")
> ```
>
> Queries can also be nested:
>
> ```ts
> const movingEntities = world.with("position", "velocity").without("paused")
> ```
>
> Please read the "Advanced Usage" chapter below for some important notes on these!

### Implementing Systems

Now we can implement a system that operates on these entities! Miniplex doesn't have an opinion on how you implement systems – they can be as simple as a function. Here's a system that uses the `movingEntities` archetype we created in the previous step, iterates over all entities in it, and moves them according to their velocity:

```ts
function movementSystem() {
  for (const { position, velocity } of movingEntities) {
    position.x += velocity.x
    position.y += velocity.y
    position.z += velocity.z
  }
}
```

**Note:** Since entities are just plain JavaScript objects, they can easily be destructured into their components, like we're doing above.

### Destroying Entities

At some point we may want to remove an entity from the world (for example, an enemy spaceship that got destroyed by the player). We can do this through the world's `remove` function:

```ts
world.remove(entity)
```

This will immediately remove the entity from the Miniplex world and all associated archetypes.

> **Note** While this will remove the entity object from the world, it will not destroy or otherwise change the object itself. In fact, you can just add it right back into the world if you want to!

## Advanced Usage

### Nested Archetypes

Archetypes are the main way to query entities in Miniplex. They are created by calling the `with` method on a world, and can be thought of as something akin to database indices.

Next to `with`, there is also `without`, which creates an archetype that matches entities that do _not_ have any of the specified components.

`with` and `without` can be nested:

```ts
const movable = world.with("position", "velocity")
const movableAndActive = movable.without("paused")
const movableAndDead = movable.with("dead")
```

It is very important to understand that this will create _three_ archetypes; one that matches entities that have both `position` and `velocity`, another that matches entities from the first archetype that also do not have the `paused` component, and a third that matches entities from the first archetype that also have the `dead` component.

```mermaid
graph TD;
    A[world]-->B["with('position', 'velocity')"];
    B-->C["without('paused')"];
    B-->D["with('dead')"];
```

Every time an entity is added to the world or has a component added or removed, all relevant archetypes are updated and asked to re-evaluate the changed entity. This update trickles down to all archetypes, and stops with archetypes that reject the entity.

In larger projects, the structure of your archetype waterfall can have a significant impact on performance; in some cases, it can be beneficial to create a large number of small, nested archetypes, while in other cases it can be beneficial to create fewer, larger archetypes.

### Combining `with` and `without` queries

You can create a combined query that looks for both the presence as well as the absence of specific components through the `archetype` function:

```ts
const movableAndActive = world.archetype({
  with: ["position", "velocity"],
  without: ["paused"]
})
```

This will create a single archetype wrapping the two queries, matching entities that have both `position` and `velocity` components, but do not have the `paused` component.

## Best Practices

### Use `addComponent` and `removeComponent` for adding and removing components

Since entities are just normal objects, you might be tempted to just add new properties to (or delete properties from) them directly. **This is a bad idea** because it will skip the indexing step needed to make sure the entity is listed in the correct archetypes. Please always go through `addComponent` and `removeComponent`!

It is perfectly fine to mutate component _values_ directly, though.

```ts
/* ✅ This is fine: */
const entity = world.add({ position: { x: 0, y: 0, z: 0 } })
entity.position.x = 10

/* ⛔️ This is not: */
const entity = world.add({ position: { x: 0, y: 0, z: 0 } })
entity.velocity = { x: 10, y: 0, z: 0 }
```

### Iterate over archetypes using `for...of`

The world as well as all archetypes derived from it are _iterable_, meaning you can use them in `for...of` loops. This is the recommended way to iterate over entities in an archetype, as it is highly performant, and iterates over the entities _in reverse order_, which allows you to safely remove entities from within the loop.

```ts
const withHealth = world.archetype("health")

/* ✅ Recommended: */
for (const entity of withHealth) {
  if (entity.health <= 0) {
    world.remove(entity)
  }
}

/* ⛔️ Avoid: */
for (const entity of withHealth.entities) {
  if (entity.health <= 0) {
    world.remove(entity)
  }
}

/* ⛔️ Especially avoid: */
withHealth.entities.forEach((entity) => {
  if (entity.health <= 0) {
    world.remove(entity)
  }
})
```

### Reuse archetypes where possible

The `archetype` function and its shorthand friends (`with`, `without`) aim to be idempotent and will reuse existing archetypes for the same queries passed to them. Checking if an archetype already exists for the given query is a comparatively heavyweight function, thought, and you are advised to, wherever possible, reuse previously created archetypes.

```ts
/* ✅ Recommended: */
const movingEntities = world.archetype("position", "velocity")

function movementSystem() {
  for (const { position, velocity } of movingEntities) {
    position.x += velocity.x
    position.y += velocity.y
    position.z += velocity.z
  }
}

/* ⛔️ Avoid: */
function movementSystem(world) {
  /* This will work, but now the world needs to check if an archetype for "position" and "velocity" already exists every time this function is called, which is pure overhead. */
  const movingEntities = world.archetype("position", "velocity")

  for (const { position, velocity } of movingEntities) {
    position.x += velocity.x
    position.y += velocity.y
    position.z += velocity.z
  }
}
```

### Create nested archetypes with caution

Miniplex does not optimize queries automatically, so the following code will create more archetypes than you probably need:

```ts
const a = world.with("position", "velocity").without("paused")
const b = world.without("paused").with("position", "velocity")
```

Now `a` and `b` contain exactly the same entities, but they are in fact two completely separate branches of the archetype tree:

```mermaid
graph TD;
    A[world]-->B["with('position', 'velocity')"];
    B-->C["without('paused')"];
    A-->D["without('paused')"];
    D-->E["with('position', 'velocity')"];
```

Everything will still work fine, but now the system is unnecessarily doing work twice.

> **Note** A future version of Miniplex will likely include a way to optimize cases like this automatically, but for now, you should be careful when creating nested archetypes.

## Questions?

Find me on [Twitter](https://twitter.com/hmans) or the [Poimandres Discord](https://discord.gg/aAYjm2p7c7).

## License

```
Copyright (c) 2022 Hendrik Mans

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
