import { isString } from '@stone-js/common'
import { GET, HEAD, HTTP_METHODS } from "./enums/http-methods.mjs"

export class RouteDefinition {
  #definition

  constructor (definition) {
    this.#definition = definition ?? {}
  }

  get (key, fallback = null) {
    return this.#definition[key] ?? fallback
  }

  set (key, value) {
    this.#definition[key] = value
    return this
  }

  add (key, value, isArray = true) {
    if (isArray) {
      this.#definition[key] ??= []
      this.#definition[key].push(value)
    } else {
      this.#definition[key] ??= {}
      this.#definition[key] = { ...this.#definition[key], ...value }
    }
    return this
  }

  has (key) {
    return this.#definition[key] != undefined
  }

  getMethods () {
    const methods = []
      .concat(this.#definition.method, this.#definition.methods)
      .reduce((prev, curr) => HTTP_METHODS.includes(curr) && !prev.includes(curr) ? prev.concat(curr) : prev, [])

    if (methods.includes(GET)) { methods.push(HEAD) }
    
    return methods.length ? methods : [GET]
  }

  setMethods (value) {
    this.#definition.methods ??= []

    if (Array.isArray(value)) {
      this.#definition.methods = value
    } else if (isString(value)) {
      this.#definition.methods.push(value)
    } else {
      this.#definition.methods.push(GET)
    }

    return this
  }
}
