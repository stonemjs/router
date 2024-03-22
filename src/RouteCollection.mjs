import { Route } from './Route.mjs'
import { HttpException } from '@stone-js/common'
import { RouteDefinition } from './RouteDefinition.mjs'
import { HTTP_METHODS } from './enums/http-methods.mjs'

/**
 * Class representing a RouteCollection.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @external Request
 * @see {@link https://github.com/stonemjs/http/blob/main/src/Request.mjs|Request}
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
   * Check matched route against request.
   *
   * @param  {Request} request
   * @param  {boolean} [includingMethod=true]
   * @return {Route}
   */
  match (request, includingMethod = true) {
    const routes = this.getByMethod(request.method)
    const route = this.#matchAgainstRoutes(routes, request, includingMethod)
    return this.#handleMatchedRoute(request, route)
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
              const json = { ...route.toJSON(), method }
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

  #matchAgainstRoutes (routes, request, includingMethod) {
    return routes
      .sort((a, b) => Boolean(a.fallback) - Boolean(b.fallback))
      .find(route => route.matches(request, includingMethod))
  }

  #handleMatchedRoute (request, route) {
    if (route) { return route }

    const others = this.#checkForAlternateVerbs(request)

    if (others.length > 0) { return this.#getRouteForMethods(request, others) }

    throw new HttpException(404, 'Not Found', [], `The route ${request.decodedPath} could not be found.`)
  }

  #checkForAlternateVerbs (request) {
    return HTTP_METHODS
      .filter(method => method.toUpperCase() !== request.method?.toUpperCase())
      .filter(method => !!this.#matchAgainstRoutes(this.getByMethod(method), request, false))
  }

  #getRouteForMethods (request, methods) {
    if (request.isMethod?.('OPTIONS')) {
      return new Route(new RouteDefinition({
        method: 'OPTIONS',
        path: request.decodedPath,
        action: () => ({
          statusText: '',
          statusCode: 200,
          content: { Allow: methods.join(',') }
        })
      }))
    }

    this.#requestMethodNotAllowed(request, methods, request.method)
  }

  #requestMethodNotAllowed (request, others, method) {
    throw new HttpException(
      405,
      'Not Found',
      [],
      `The ${method} method is not supported for route ${request.decodedPath}. Supported methods: ${others.join(', ')}.`
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
