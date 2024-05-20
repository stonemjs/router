import { Route } from './Route.mjs'
import { RouteDefinition } from './definition/RouteDefinition.mjs'
import { HTTP_METHODS, HttpError } from '@stone-js/event-foundation'

/**
 * Class representing a RouteCollection.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class RouteCollection {
  #routes = new Map()
  #nameList = new Map()
  #actionList = new Map()
  #methodList = new Map()

  /**
   * Add route instance to collection.
   *
   * @param  {Route} route
   * @return {this}
   */
  add (route) {
    return this
      .#addToCollections(route)
      .#addToActionList(route)
      .#addToMethodList(route)
      .#addToNameList(route)
  }

  /**
   * Check matched route against event.
   *
   * @param  {IncomingEvent} event
   * @param  {boolean} [includingMethod=true]
   * @return {Route}
   */
  match (event, includingMethod = true) {
    const routes = this.getByMethod(event.method)
    const route = this.#matchAgainstRoutes(routes, event, includingMethod)
    return this.#handleMatchedRoute(event, route)
  }

  /**
   * Check matched route against name.
   *
   * @param  {string} name
   * @return {boolean}
   */
  hasNamedRoute (name) {
    return this.#nameList.has(name)
  }

  /**
   * Get matched route against name.
   *
   * @param  {string} name
   * @return {Route}
   */
  getByName (name) {
    return this.#nameList.get(name)
  }

  /**
   * Get matched route against method.
   *
   * @param  {string} method
   * @return {Route}
   */
  getByMethod (method) {
    return Array.from(this.#methodList.get(method.toUpperCase())?.values() ?? [])
  }

  /**
   * Get matched route against action.
   *
   * @param  {string} action
   * @return {Route}
   */
  getByAction (action) {
    return this.#actionList.get(action)
  }

  /**
   * Get routes as array.
   *
   * @return {Route[]}
   */
  getRoutes () {
    return Array.from(this.#routes.values())
  }

  /**
   * Get routes as Map grouped by method.
   *
   * @return {Map}
   */
  getRoutesByMethod () {
    return this.#methodList
  }

  /**
   * Get routes as Map grouped by name.
   *
   * @return {Map}
   */
  getRoutesByName () {
    return this.#nameList
  }

  /**
   * Dump routes.
   * Return all routes literal object array.
   *
   * @return {array}
   */
  dump () {
    return Array
      .from(this.#methodList.entries())
      .reduce((prev, [method, routeMap]) => {
        return prev.concat(
          Array
            .from(routeMap.values())
            .filter(route => !(method === 'HEAD' && route.methods.includes('GET')))
            .map(route => {
              const json = { ...route.toJSON() }
              json.method = method
              Reflect.deleteProperty(json, 'methods')
              return json
            })
        )
      }, [])
      .sort((a, b) => a.path === b.path ? 0 : (a.path > b.path ? 1 : -1))
  }

  /**
   * Get routes as json collection.
   *
   * @return {Object[]}
   */
  toJSON () {
    return this.getRoutes().map(route => route.toJSON())
  }

  /**
   * Get routes as string.
   *
   * @return {string}
   */
  toString () {
    return JSON.stringify(this.toJSON())
  }

  #addToCollections (route) {
    route.methods.forEach(method => this.#routes.set(`${method}.${route.uri}`, route))

    return this
  }

  #addToActionList (route) {
    if (route.isControllerAction()) { this.#actionList.set(route.getControllerActionFullname(), route) }

    return this
  }

  #addToNameList (route) {
    if (route.name) { this.#nameList.set(route.name, route) }

    return this
  }

  #addToMethodList (route) {
    for (const method of route.methods) {
      if (!this.#methodList.has(method)) {
        this.#methodList.set(method, new Map())
      }
      this.#methodList.get(method).set(route.uri, route)
    }

    return this
  }

  #matchAgainstRoutes (routes, event, includingMethod) {
    return routes
      .sort((a, b) => Boolean(a.fallback) - Boolean(b.fallback))
      .find(route => route.matches(event, includingMethod))
  }

  #handleMatchedRoute (event, route) {
    if (route) { return route }

    const others = this.#checkForAlternateVerbs(event)

    if (others.length > 0) { return this.#getRouteForMethods(event, others) }

    throw new HttpError(404, 'Not Found', [], `The route ${event.decodedPathname} could not be found.`)
  }

  #checkForAlternateVerbs (event) {
    return HTTP_METHODS
      .filter(method => method.toUpperCase() !== event.method?.toUpperCase())
      .filter(method => !!this.#matchAgainstRoutes(this.getByMethod(method), event, false))
  }

  #getRouteForMethods (event, methods) {
    if (event.isMethod?.('OPTIONS')) {
      return new Route(new RouteDefinition({
        method: 'OPTIONS',
        path: event.decodedPathname,
        action: () => ({
          statusText: '',
          statusCode: 200,
          content: { Allow: methods.join(',') }
        })
      }))
    }

    this.#eventMethodNotAllowed(event, methods, event.method)
  }

  #eventMethodNotAllowed (event, others, method) {
    throw new HttpError(
      405,
      'Not Found',
      [],
      `The ${method} method is not supported for route ${event.decodedPathname}. Supported methods: ${others.join(', ')}.`
    )
  }

  get size () {
    return this.length
  }

  get length () {
    return this.getRoutes().length
  }

  [Symbol.iterator] () {
    let index = -1
    const data = this.getRoutes()

    return {
      next: () => ({ value: data[++index], done: !(index in data) })
    }
  };
}
