import { MetaResponse } from './MetaResponse.mjs'
import { Route } from './Route.mjs'
import { RouteCollection } from './RouteCollection.mjs'
import { RouteDefinition } from './RouteDefinition.mjs'
import { RouteResponse } from './RouteResponse.mjs'
import { CallableDispatcher } from './dispatchers/CallableDispatcher.mjs'
import { ControllerDispatcher } from './dispatchers/ControllerDispatcher.mjs'
import { PreparingResponse } from './events/PreparingResponse.mjs'
import { ResponsePrepared } from './events/ResponsePrepared.mjs'
import { RouteMatched } from './events/RouteMatched.mjs'
import { Routing } from './events/Routing.mjs'
import { LogicException } from './exceptions/LogicException.mjs'
import { ControllerLoader } from './loaders/ControllerLoader.mjs'
import { DefinitionLoader } from './loaders/DefinitionLoader.mjs'
import { HostMatcher } from './matchers/HostMatcher.mjs'
import { MethodMatcher } from './matchers/MethodMatcher.mjs'
import { ProtocolMatcher } from './matchers/ProtocolMatcher.mjs'
import { UriMatcher } from './matchers/UriMatcher.mjs'

export class Router {
  #rules
  #routes
  #current
  #matchers
  #container
  #middleware
  #dispatchers
  #eventManager
  #currentRequest
  #defaultMatchers

  constructor ({
    container,
    eventManager
  }) {
    this.#rules = {}
    this.#matchers = []
    this.#middleware = []
    this.#dispatchers = {}
    this.#container = container
    this.#eventManager = eventManager
    this.#routes = new RouteCollection()

    if (!this.#container) {
      throw new LogicException('Must provice and instance of the service container.')
    }

    if (!this.#eventManager) {
      console.log('No Event manager provided. No events will be disptached.')
    }
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
    return this.addRoute(this.#mapRouteDefinition(routeDefinition, ['GET', 'HEAD']))
  }

  post (routeDefinition) {
    return this.addRoute(this.#mapRouteDefinition(routeDefinition, ['POST']))
  }

  put (routeDefinition) {
    return this.addRoute(this.#mapRouteDefinition(routeDefinition, ['PUT']))
  }

  patch (routeDefinition) {
    return this.addRoute(this.#mapRouteDefinition(routeDefinition, ['PATCH']))
  }

  delete (routeDefinition) {
    return this.addRoute(this.#mapRouteDefinition(routeDefinition, ['DELETE']))
  }

  options (routeDefinition) {
    return this.addRoute(this.#mapRouteDefinition(routeDefinition, ['OPTIONS']))
  }

  match (routeDefinition) {
    return this.addRoute(this.#mapRouteDefinition(routeDefinition, routeDefinition.methods))
  }

  any (routeDefinition) {
    return this.addRoute(this.#mapRouteDefinition(routeDefinition, Router.METHODS))
  }

  fallback (action) {
    return this.addRoute(
      this.#mapRouteDefinition({
        action,
        fallback: true,
        uri: ':__fallback__',
        rules: { __fallback__: /.*/ }
      }, ['GET', 'HEAD'])
    )
  }

  addRoute (routeDefinition) {
    return this.#routes.add(this.createRoute(routeDefinition))
  }

  createRoute (routeDefinition) {
    return this.#hydrateRoute(Route.fromRouteDefinition(routeDefinition))
  }

  async loadRoutes (routeLoader) {
    if (!routeLoader.load) {
      throw new LogicException('Invalid loader, routeLoader must have `load` method')
    }

    const routeDefinitions = await routeLoader.load()

    for (const definition of routeDefinitions) {
      this.addRoute(definition)
    }
  }

  loadRouteFromDefinitions (rawDefinitions) {
    return this.loadRoutes(new DefinitionLoader(rawDefinitions))
  }

  loadRouteFromControllers (controllers) {
    return this.loadRoutes(new ControllerLoader(controllers))
  }

  dispatch (requestContext) {
    return this.dispatchToRoute(requestContext)
  }

  dispatchToRoute (requestContext) {
    return this.#runRoute(requestContext, this.findRoute(requestContext))
  }

  respondWithRouteName (name) {
    const route = this.#routes.getByName(name)

    if (!route) {
      throw new LogicException(`No routes found for this name ${name}`)
    }

    return this.#runRoute(this.#currentRequest, route)
  }

  generate (nameOrPath, params, query, hash) {}

  findRoute (requestContext) {
    this.#eventManager?.notify(Routing, new Routing(requestContext))

    this.#current = this.#routes.match(requestContext)
    this.#container.instance(Route, this.#current)

    return this.#current
  }

  gatherRouteMiddlewareInstances (route) {
    return this
      .gatherRouteMiddleware(route)
      .map(middleware => this.#container.make(middleware))
  }

  gatherRouteMiddleware (route) {
    return this.#middleware
      .concat(route.middleware ?? [])
      .filter(v => !route.excludeMiddleware?.includes(v))
      .reduce((prev, curr) => {
        if (!prev.includes(curr)) prev.push(curr)
        return prev
      }, [])
  }

  prepareResponse (requestContext, response) {
    this.#eventManager?.notify(PreparingResponse, new PreparingResponse(requestContext, response))

    response = Router.toResponse(requestContext, response)

    this.#eventManager?.notify(ResponsePrepared, new ResponsePrepared(requestContext, response))

    return response
  }

  static toResponse (requestContext, response) {
    if (!response) {
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
    this.#eventManager?.subscribe(RouteMatched, callback)
  }

  getMiddleware () {
    return this.#middleware
  }

  setMiddleware (middleware) {
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

  setRule (name, pattern) {
    this.#rules[name] = pattern
    return this
  }

  setRules (rules) {
    Object.entries(rules).forEach(([name, pattern]) => this.setRule(name, pattern))
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
    return this.current() ? this.current().action : null
  }

  isCurrentRouteAction (action) {
    if (this.current()?.isControllerAction() && Array.isArray(action)) {
      return this.currentRouteAction()[0] === action[0] && this.currentRouteAction()[1] === action[1]
    }
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
      this.#hydrateRoute(route)
    }

    this.#routes = routeCollection
    this.#container.instance('routes', this.#routes)

    return this
  }

  setContainer (container) {
    this.#container = container
    return this
  }

  setEventManager (eventManager) {
    this.#eventManager = eventManager
    return this
  }

  getMatchers (orDefault = true) {
    return this.hasMatchers() ? this.#matchers : (orDefault ? this.#getDefaultMatchers() : [])
  }

  hasMatchers () {
    return this.#matchers?.length > 0
  }

  setMatchers (matchers, mergeWithDefault = true) {
    this.#matchers = [].concat(mergeWithDefault ? this.#getDefaultMatchers() : [], matchers)
    return this
  }

  getDispatchers (orDefault = true) {
    return this.hasDispatchers() ? this.#dispatchers : (orDefault ? this.#getDefaultDispatchers() : {})
  }

  hasDispatchers () {
    return Object.values(this.#dispatchers).length > 0
  }

  setDispatchers (dispatchers) {
    Object
      .entries(dispatchers)
      .forEach(([type, dispatcher]) => this.addDispatcher(type, dispatcher))

    return this
  }

  addDispatcher (type, dispatcher) {
    if (!['callable', 'controller'].includes(type)) {
      throw new LogicException(`Invalid dispatcher type ${type}. Valid types are 'callable' and 'controller'`)
    }

    this.#dispatchers[type] = dispatcher

    return this
  }

  setCallableDispatcher (dispatcher) {
    this.addDispatcher('callable', dispatcher)
    return this
  }

  setControllerDispatcher (dispatcher) {
    this.addDispatcher('controller', dispatcher)
    return this
  }

  dumpRoutes () {
    return this.#routes.dump()
  }

  #getDefaultMatchers () {
    if (!this.#defaultMatchers) {
      this.#defaultMatchers = [
        new HostMatcher(),
        new MethodMatcher(),
        new ProtocolMatcher(),
        new UriMatcher()
      ]
    }

    return this.#defaultMatchers
  }

  #getDefaultDispatchers () {
    return {
      callable: CallableDispatcher,
      controller: ControllerDispatcher
    }
  }

  #runRoute (requestContext, route) {
    requestContext.setRouteResolver(() => route)

    this.#currentRequest = requestContext

    this.#eventManager?.notify(RouteMatched, new RouteMatched(route, requestContext))

    return this.#runRouteWithMiddleware(requestContext, route)
  }

  async #runRouteWithMiddleware (requestContext, route) {
    let response = null
    const skip = this.#container.bound('configurations.middleware.disabled') && this.#container.make('configurations.middleware.disabled') === false
    const middleware = skip ? [] : this.gatherRouteMiddlewareInstances(route)

    for (const item of middleware) {
      requestContext = (await item.handleRequest(requestContext)) ?? requestContext
    }

    response = await route.bind(requestContext).run()

    for (const item of middleware) {
      response = (await item.handleResponse(requestContext, response)) ?? response
    }

    return this.prepareResponse(requestContext, response)
  }

  #hydrateRoute (route) {
    return route
      .setRouter(this)
      .setContainer(this.#container)
      .setMatchers(this.getMatchers())
      .setDispatchers(this.getDispatchers())
  }

  #mapRouteDefinition (routeDefinition, methods) {
    return new RouteDefinition({ ...routeDefinition, methods, method: undefined })
  }
}
