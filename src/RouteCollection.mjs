import { Route } from './Route.mjs'
import { Router } from './Router.mjs'
import { MethodNotAllowedHttpException } from './exceptions/MethodNotAllowedHttpException.mjs'
import { NotFoundHttpException } from './exceptions/NotFoundHttpException.mjs'

export class RouteCollection {
  #routes = new Map()
  #nameList = new Map()
  #actionList = new Map()
  #methodList = new Map()

  add (route) {
    this.#addToCollections(route)
    this.#addToActionList(route)
    this.#addToMethodList(route)
    this.#addToNameList(route)

    return route
  }

  match (requestContext, includingMethod = true) {
    const routes = this.getByMethod(requestContext.method)
    const route = this.#matchAgainstRoutes(routes, requestContext, includingMethod)
    return this.#handleMatchedRoute(requestContext, route)
  }

  hasNamedRoute (name) {
    return this.#nameList.has(name)
  }

  getByName (name) {
    return this.#nameList.get(name)
  }

  getByMethod (method) {
    return Array
      .from(this.#methodList.get(method.toUpperCase())?.entries() ?? [])
      .map(([, value]) => value)
  }

  getByAction (action) {
    return this.#actionList.get(action)
  }

  getRoutes () {
    return Array.from(this.#routes.values())
  }

  getRoutesByMethod () {
    return this.#methodList
  }

  getRoutesByName () {
    return this.#nameList
  }

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
      .sort((a, b) => a.uri === b.uri ? 0 : (a.uri > b.uri ? 1 : -1))
  }

  toJSON () {
    return this.getRoutes().map(route => route.toJSON())
  }

  toString () {
    return JSON.stringify(this.toJSON())
  }

  #addToCollections (route) {
    route.getMethods().forEach(method => this.#routes.set(`${method}.${route.getFullUri()}`, route))
  }

  #addToActionList (route) {
    if (route.isControllerAction()) { this.#actionList.set(route.getControllerActionFullname(), route) }
  }

  #addToNameList (route) {
    if (route.name) { this.#nameList.set(route.name, route) }
  }

  #addToMethodList (route) {
    for (const method of route.getMethods()) {
      if (!this.#methodList.has(method)) {
        this.#methodList.set(method, new Map())
      }
      this.#methodList.get(method).set(route.getFullUri(), route)
    }
  }

  #handleMatchedRoute (requestContext, route) {
    if (route) { return route.bind(requestContext) }

    const others = this.#checkForAlternateVerbs(requestContext)

    if (others.length > 0) { return this.#getRouteForMethods(requestContext, others) }

    throw new NotFoundHttpException(`The route ${requestContext.path} could not be found.`)
  }

  #checkForAlternateVerbs (requestContext) {
    return Router
      .METHODS
      .filter(method => method.toUpperCase() !== requestContext.method.toUpperCase())
      .filter(method => !!this.#matchAgainstRoutes(this.getByMethod(method), requestContext, false))
  }

  #matchAgainstRoutes (routes, requestContext, includingMethod = true) {
    return routes
      .sort((a, b) => Boolean(a.fallback) - Boolean(b.fallback))
      .find(route => route.matches(requestContext, includingMethod))
  }

  #getRouteForMethods (requestContext, methods) {
    if (requestContext.isMethod('OPTIONS')) {
      return new Route({
        method: 'OPTIONS',
        uri: requestContext.path,
        action: () => ({
          statusText: '',
          statusCode: 200,
          content: { Allow: methods.join(',') }
        })
      }).bind(requestContext)
    }

    this.#requestMethodNotAllowed(requestContext, methods, requestContext.method)
  }

  #requestMethodNotAllowed (request, others, method) {
    throw new MethodNotAllowedHttpException(
      others,
      `The ${method} method is not supported for route ${request.path}. Supported methods: ${others.join(', ')}.`
    )
  }

  #methodNotAllowed (others, method) {
    throw new MethodNotAllowedHttpException(
      others,
      `The ${method} method is not supported for this route. Supported methods: ${others.join(', ')}.`
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
