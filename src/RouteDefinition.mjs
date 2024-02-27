import { GET, METHODS } from "./enums/index.mjs"

export class RouteDefinition {
  constructor (definition) {
    this.path = definition.path
    this.name = definition.name ?? null
    this.rules = definition.rules ?? {}
    this.alias = definition.alias ?? null
    this.action = definition.action
    this.domain = definition.domain ?? null
    this.method = definition.method
    this.actions = definition.actions ?? {}
    this.throttle = definition.throttle ?? []
    this.fallback = definition.fallback ?? false
    this.defaults = definition.defaults ?? {}
    this.children = definition.children ?? []
    this.bindings = definition.bindings ?? {}
    this.redirect = definition.redirect ?? null
    this.middleware = definition.middleware ?? []
    this.methods = this.#getMethods(definition)
    this.metadata = this.#getMetadata(definition)
    this.excludeMiddleware = definition.excludeMiddleware ?? []
  }

  #getMethods (definition) {
    const methods = [definition.method]
      .concat(definition.methods)
      .reduce((prev, curr) => METHODS.includes(curr) && !prev.includes(curr) ? prev.concat(curr) : prev, [])

    return methods.length ? methods : [GET]
  }

  #getMetadata (metadata) {
    return Object.fromEntries(
      Object.entries(metadata).filter(([key]) => !Object.hasOwn(this, key))
    )
  }
}
