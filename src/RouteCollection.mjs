import { Route } from "./Route.mjs"
import { Router } from "./Router.mjs"
import { MethodNotAllowedHttpException } from "./exceptions/MethodNotAllowedHttpException.mjs"
import { NotFoundHttpException } from "./exceptions/NotFoundHttpException.mjs"

export class RouteCollection {
  #routes = new Map()
  #nameList = new Map()
  #actionList = new Map()
  #methodList = new Map()

  add (route) {
    this._addToCollections(route)
    this._addToActionList(route)
    this._addToMethodList(route)
    this._addToNameList(route)
    
    return route
  }

  match (requestContext, includingMethod = true) {
    const routes = this.getByMethod(requestContext.method)
    const route = this._matchAgainstRoutes(routes, requestContext, includingMethod)
    return this._handleMatchedRoute(requestContext, route)
  }

  hasNamedRoute (name) {
    return this.#nameList.has(name)
  }

  getByName (name) {
    return this.#nameList.get(name)
  }

  getByMethod (method) {
    return Array
      .from(this.#methodList.entries())
      .filter(([key]) => key.toUpperCase().includes(`${method.toUpperCase()}.`))
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

  _addToCollections (route) {
    this.#routes.set(route.getFullUri(), route)
  }

  _addToActionList (route) {
    if (route.isControllerClass()) { this.#actionList.set(route.action[0], route) }
  }

  _addToNameList (route) {
    if (route.name) { this.#nameList.set(route.name, route) }
  }

  _addToMethodList (route) {
    route.getMethods().foreach(method => this.#methodList.set(`${method}.${route.getFullUri()}`, route))
  }

  _handleMatchedRoute (requestContext, route) {
    if (route) { return route.bind(requestContext) }

    const others = this._checkForAlternateVerbs(requestContext)
    
    if (others.length > 0) { return this._getRouteForMethods(requestContext, others) }
    
    throw new NotFoundHttpException(`The route ${requestContext.path} could not be found.`)
  }

  _checkForAlternateVerbs (requestContext) {
    return Router
      .METHODS
      .filter(method => method.toUpperCase() !== requestContext.method.toUpperCase())
      .filter(method => !!this._matchAgainstRoutes(this.getByMethod(method), requestContext, false))
  }

  _matchAgainstRoutes (routes, requestContext, includingMethod = true) {
    return routes
      .sort((a, b) => Boolean(a.fallback) - Boolean(b.fallback))
      .find(route => route.matches(requestContext, includingMethod))
  }

  _getRouteForMethods (requestContext, methods) {
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

    this._requestMethodNotAllowed(requestContext, methods, requestContext.method)
  }

  _requestMethodNotAllowed(request, others, method) {
    throw new MethodNotAllowedHttpException(
      others,
      `The ${method} method is not supported for route ${request.path}. Supported methods: ${others.join(', ')}.`
    )
  }

  _methodNotAllowed(others, method) {
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

  [Symbol.iterator]() {
    let index = -1
    const data  = this.getRoutes()

    return {
      next: () => ({ value: data[++index], done: !(index in data) })
    };
  };
}