import { MetaResponse } from './MetaResponse.mjs'
import { Route } from './Route.mjs'
import { RouteCollection } from './RouteCollection.mjs'
import { RouteResponse } from './RouteResponse.mjs'
import { PreparingResponse } from './events/PreparingResponse.mjs'
import { ResponsePrepared } from './events/ResponsePrepared.mjs'
import { RouteMatched } from './events/RouteMatched.mjs'
import { Routing } from './events/Routing.mjs'
import { LogicException } from './exceptions/LogicException.mjs'

export class Router {
  #rules
  #routes
  #current
  #container
  #middleware
  #eventManager
  #currentRequest

  constructor ({
    container,
    eventManager
  }) {
    this.#rules = {}
    this.#current = null
    this.#middleware = []
    this.#currentRequest = null
    this.#container = container
    this.#eventManager = eventManager
    this.#routes = new RouteCollection()
  }

  static METHODS = [
    'GET',
    'POST',
    'PUT',
    'HEAD',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ]

  get (routeDefinition) {
    return this.addRoute(this._handleRouteDefinition(routeDefinition, ['GET', 'HEAD']))
  }

  post (routeDefinition) {
    return this.addRoute(this._handleRouteDefinition(routeDefinition, ['POST']))
  }

  put (routeDefinition) {
    return this.addRoute(this._handleRouteDefinition(routeDefinition, ['PUT']))
  }

  patch (routeDefinition) {
    return this.addRoute(this._handleRouteDefinition(routeDefinition, ['PATCH']))
  }

  delete (routeDefinition) {
    return this.addRoute(this._handleRouteDefinition(routeDefinition, ['DELETE']))
  }

  options (routeDefinition) {
    return this.addRoute(this._handleRouteDefinition(routeDefinition, ['OPTIONS']))
  }

  match (routeDefinition) {
    return this.addRoute(this._handleRouteDefinition(routeDefinition, routeDefinition.methods))
  }

  any (routeDefinition) {
    return this.addRoute(this._handleRouteDefinition(routeDefinition, Router.METHODS))
  }

  fallback (action) {
    return this.addRoute({
      action,
      method: 'GET',
      fallback: true,
      uri: ':__fallback__',
      rules: { __fallback__: '.*' }
    })
  }

  addRoute (routeDefinition) {
    return this.#routes.add(this.createRoute(routeDefinition))
  }

  createRoute (routeDefinition) {
    return Route
      .fromRouteDefinition(routeDefinition)
      .setRouter(this)
      .setContainer(this.#container)
  }

  async loadRoutes (routeLoader) {
    if (!routeLoader.load) {
      throw new LogicException('Invalid parameter must have `load` method')
    }

    const routeDefinitions = await routeLoader.load()

    routeDefinitions.forEach(definition => this.addRoute(definition))
  }

  generate (nameOrPath, params, query, hash) {}

  respondWithRouteName (name) {
    const route = this.#routes.getByName(name)

    if (!route) {
      throw new LogicException(`No routes found for this name ${name}`)
    }

    return this._runRoute(this.#currentRequest, route.bind(this.#currentRequest))
  }

  dispatch (requestContext) {
    this.#currentRequest = requestContext

    return this.dispatchToRoute(requestContext)
  }

  dispatchToRoute (requestContext) {
    return this._runRoute(requestContext, this.findRoute(requestContext))
  }

  findRoute (requestContext) {
    this.#eventManager.notify(new Routing(requestContext))
    this.#current = this.#routes.match(requestContext)
    this.#current.setContainer(this.#container).setRouter(this)
    this.#container.instance(Route, this.#current)

    return this.#current
  }

  _runRoute (requestContext, route) {
    requestContext.setRouteResolver(() => route)

    this.#eventManager.notify(new RouteMatched(route, requestContext))

    return this._runRouteWithMiddleware(requestContext, route)
  }

  async _runRouteWithMiddleware (requestContext, route) {
    let response = null
    const skip = this.#container.bound('middleware.disable') && this.#container.make('middleware.disable') === false
    const middleware = skip ? [] : this.gatherRouteMiddleware(route)

    for (const item of middleware) {
      requestContext = await item.handleRequest(requestContext) ?? requestContext
    }

    response = await route.run()

    for (const item of middleware) {
      response = await item.handleResponse(requestContext, response) ?? response
    }

    return this.prepareResponse(requestContext, response)
  }

  gatherRouteMiddleware (route) {
    return this.middleware
      .concat(route.middleware)
      .filter(v => !route.excludeMiddleware.includes(v))
      .reduce((prev, curr) => {
        if (!prev.includes(curr)) prev.push(curr)
        return prev
      }, [])
  }

  prepareResponse (requestContext, response) {
    this.#eventManager.notify(new PreparingResponse(requestContext, response))

    response = Router.toResponse(requestContext, response)

    this.#eventManager.notify(new ResponsePrepared(requestContext, response))

    return response
  }

  static toResponse (requestContext, response) {
    if (response === null) {
      response = RouteResponse.empty()
    } else if (response instanceof MetaResponse) {
      response = RouteResponse.fromMetaResponse(response)
    } else if (typeof response === 'string') {
      response = RouteResponse.fromString(response)
    } else if (response.toJson) {
      response = RouteResponse.fromJson(response.toJson())
    } else if (Array.isArray(response)) {
      response = RouteResponse.fromJson(response)
    } else if (typeof response === 'object') {
      response = RouteResponse.fromJson(response)
    } else if (response.toResponse) {
      response = RouteResponse.fromResponse(response.toResponse())
    }

    if (response.statusCode === RouteResponse.HTTP_NOT_MODIFIED) {
      response.setNotModified()
    }

    return response.prepare(requestContext)
  }

  matched (callback) {
    this.#eventManager.subscribe(RouteMatched, callback)
  }

  getMiddleware () {
    return this.#middleware
  }

  middleware (middleware) {
    if (Array.isArray(middleware)) {
      middleware.forEach(item => this.#middleware.push(item))
    } else {
      this.#middleware.push(middleware)
    }

    return this
  }

  getRules () {
    return this.#rules
  }

  rule (name, pattern) {
    this.#rules[name] = pattern

    return this
  }

  rules (rules) {
    Object.entries(rules).forEach(([name, pattern]) => this.rule(name, pattern))

    return this
  }

  has (name) {
    name = Array.isArray(name) ? name : [name]
    return name.reduce((prev, curr) => {
      if (!this.#routes.hasNamedRoute(curr)) return false
      return prev
    }, true)
  }

  input (name, fallback = null) {
    return this.current().parameter(name, fallback)
  }

  getCurrentRequest () {
    return this.#currentRequest
  }

  getCurrentRoute () {
    return this.current()
  }

  current () {
    return this.#current
  }

  currentRouteName () {
    return this.current() ? this.current().name : null
  }

  isCurrentRouteNamed (name) {
    return this.currentRouteName() === name
  }

  currentRouteAction () {
    return this.current()
      ? (this.current().isControllerClass()
        ? this.current().action[0]
        : this.current().action)
      : null
  }

  isCurrentRouteAction (action) {
    return this.currentRouteAction() === action
  }

  getRoutes () {
    return this.#routes
  }

  setRoutes (routeCollection) {
    if (!(routeCollection instanceof RouteCollection)) {
      throw new LogicException('Parameter must be an instance of RouteCollection')
    }

    for (const route of routeCollection) {
      route.setRouter(this).setContainer(this.#container)
    }

    this.#routes = routeCollection
    this.#container.instance('routes', this.#routes)

    return this
  }

  setContainer (container) {
    this.#container = container

    return this
  }

  _handleRouteDefinition (routeDefinition, methods) {
    return { ...routeDefinition, methods, method: undefined }
  }
}
