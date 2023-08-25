import { isString } from '@stone-js/common'
import { GET, HEAD, HTTP_METHODS } from './enums/http-methods.mjs'

/**
 * Class representing a RouteDefinition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class RouteDefinition {
  /**
   * @type {definition}
  */
  #definition

  /**
   * Create a RouteDefinition.
   *
   * @param {definition} definition
   */
  constructor (definition) {
    this.#definition = definition ?? {}
  }

  /**
   * Get value by key from definition
   *
   * @param  {string} key
   * @param  {*} [fallback=null] return default value when not found.
   * @return {*}
   */
  get (key, fallback = null) {
    return this.#definition[key] ?? fallback
  }

  /**
   * Set value by key to definition
   *
   * @param  {string} key
   * @return {this}
   */
  set (key, value) {
    this.#definition[key] = value
    return this
  }

  /**
   * Add value by key to definition
   *
   * @param  {string} key
   * @param  {*} value
   * @param  {boolean} [isArray=true]
   * @return {this}
   */
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

  /**
   * Has key-value in definition
   *
   * @param  {string} key
   * @return {boolean}
   */
  has (key) {
    return this.#definition[key] !== undefined
  }

  /**
   * Get methods from definition
   *
   * @return {string[]}
   */
  getMethods () {
    const methods = []
      .concat(this.#definition.method, this.#definition.methods)
      .reduce((prev, curr) => HTTP_METHODS.includes(curr) && !prev.includes(curr) ? prev.concat(curr) : prev, [])

    if (methods.includes(GET)) { methods.push(HEAD) }

    return methods.length ? methods : [GET]
  }

  /**
   * Set methods to definition
   *
   * @param  {string[]} value
   * @return {this}
   */
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
