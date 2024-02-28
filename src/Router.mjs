import { Route } from './Route.mjs'
import { Event } from './Event.mjs'
import { Pipeline } from '@stone-js/pipeline'
import { UriMatcher } from './matchers/UriMatcher.mjs'
import { RouteCollection } from './RouteCollection.mjs'
import { RouteDefinition } from './RouteDefinition.mjs'
import { HostMatcher } from './matchers/HostMatcher.mjs'
import { LogicException, isString } from '@stone-js/common'
import { MethodMatcher } from './matchers/MethodMatcher.mjs'
import { ExplicitLoader } from './loaders/ExplicitLoader.mjs'
import { DecoratorLoader } from './loaders/DecoratorLoader.mjs'
import { ProtocolMatcher } from './matchers/ProtocolMatcher.mjs'
import { CallableDispatcher } from './dispatchers/CallableDispatcher.mjs'
import { ControllerDispatcher } from './dispatchers/ControllerDispatcher.mjs'
import { Request, Response, MetaResponse, HTTP_METHODS } from '@stone-js/http'

export class Router {
  static METHODS = HTTP_METHODS

  #rules
  #routes
  #current
  #maxDepth
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
    this.#maxDepth = 5
    this.#matchers = []
    this.#middleware = []
    this.#dispatchers = {}
    this.#container = container
    this.#eventManager = eventManager
    this.#routes = new RouteCollection()

    if (!this.#container) {
      console.log('No service container instance provided.')
    }

    if (!this.#eventManager) {
      console.log('No Event manager instance provided. No events will be disptached.')
    }

    this.#setOptions()
    this.#container?.instance('routes', this.#routes)
  }

  get (definition) {
    return this.addFromRouteDefinition(this.#createRouteDefinition(definition, ['GET', 'HEAD']))
  }

  post (definition) {
    return this.addFromRouteDefinition(this.#createRouteDefinition(definition, ['POST']))
  }

  put (definition) {
    return this.addFromRouteDefinition(this.#createRouteDefinition(definition, ['PUT']))
  }

  patch (definition) {
    return this.addFromRouteDefinition(this.#createRouteDefinition(definition, ['PATCH']))
  }

  delete (definition) {
    return this.addFromRouteDefinition(this.#createRouteDefinition(definition, ['DELETE']))
  }

  options (definition) {
    return this.addFromRouteDefinition(this.#createRouteDefinition(definition, ['OPTIONS']))
  }

  match (definition) {
    return this.addFromRouteDefinition(this.#createRouteDefinition(definition, definition.methods))
  }

  any (definition) {
    return this.addFromRouteDefinition(this.#createRouteDefinition(definition, Router.METHODS))
  }

  fallback (action) {
    return this.addFromRouteDefinition(
      this.#createRouteDefinition({
        action,
        fallback: true,
        path: ':__fallback__(.*)*'
      }, ['GET', 'HEAD'])
    )
  }

  addFromRouteDefinition (routeDefinition) {
    return this.#routes.add(this.createFromRouteDefinition(routeDefinition))
  }

  createFromRouteDefinition (routeDefinition) {
    return this.#hydrateRoute(Route.fromRouteDefinition(routeDefinition))
  }

  async loadRoutes (routeLoader) {
    if (!routeLoader.load) {
      throw new LogicException('Invalid loader, routeLoader must have `load` method')
    }

    const routeDefinitions = await routeLoader.load()

    for (const routeDefinition of routeDefinitions) {
      this.addFromRouteDefinition(routeDefinition)
    }
  }

  loadRouteFromExplicitSource (definitions) {
    return this.loadRoutes(new ExplicitLoader({ definitions, maxDepth: this.#maxDepth }))
  }

  loadRouteFromDecoratorSource (classes) {
    return this.loadRoutes(new DecoratorLoader({ classes, maxDepth: this.#maxDepth }))
  }

  dispatch (request) {
    return this.dispatchToRoute(request)
  }

  dispatchToRoute (request) {
    return this.#runRoute(request, this.findRoute(request))
  }

  respondWithRouteName (request, name) {
    const route = this.#routes.getByName(name)

    if (!route) {
      throw new LogicException(`No routes found for this name ${name}`)
    }

    return this.#runRoute(request, route)
  }

  generate (nameOrPath, params, query, hash) {}

  findRoute (request) {
    this
      .#validateRequest(request)
      .#eventManager?.emit(Event.ROUTING, new Event(Event.ROUTING, this, { request }))

    this.#current = this.#routes.match(request)
    this.#container?.instance(Route, this.#current)?.alias(Route, 'route')

    return this.#current
  }

  gatherRouteMiddlewareInstances (route) {
    return this
      .gatherRouteMiddleware(route)
      .map(Middleware => this.#container ? this.#container.make(Middleware) : new Middleware())
  }

  gatherRouteMiddleware (route) {
    return this.#middleware
      .concat(route.middleware)
      .filter(v => v && !route.excludeMiddleware?.includes(v))
      .reduce((prev, curr) => prev.includes(curr) ? prev : prev.concat(curr), [])
  }

  prepareResponse (request, response) {
    this.#eventManager?.emit(Event.PREPARING_RESPONSE, new Event(Event.PREPARING_RESPONSE, this, { request, response }))

    response = response.skipPreparing ? response : Router.toResponse(request, response) // Skip prepare for frontend context

    this.#eventManager?.emit(Event.RESPONSE_PREPARED, new Event(Event.RESPONSE_PREPARED, this, { request, response }))

    return response
  }

  static toResponse (request, response) {
    if ([null, undefined].includes(response)) {
      response = Response.empty()
    } else if (response instanceof MetaResponse) {
      response = Response.fromMetaResponse(response)
    } else if (isString(response)) {
      response = Response.fromString(response)
    } else if (['object', 'number', 'boolean'].includes(typeof response)) {
      response = Response.json(response)
    }

    if (response.statusCode === Response.HTTP_NOT_MODIFIED) {
      response.setNotModified()
    }

    return response.prepare(request)
  }

  matched (callback) {
    this.#eventManager?.on(Event.ROUTE_MATCHED, callback)
    
    return this
  }

  setMaxDepth (value) {
    this.#maxDepth = value
    
    return this
  }

  getMiddleware () {
    return this.#middleware
  }

  setMiddleware (middleware) {
    this.#middleware = middleware

    return this
  }

  addMiddleware (middleware) {
    this.#middleware = this.#middleware.concat(middleware)

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
    this.#rules = rules

    return this
  }

  has (name) {
    return []
      .concat(name)
      .reduce((prev, curr) => !this.#routes.hasNamedRoute(curr) ? false : prev, true)
  }

  input (name, fallback = null) {
    return this.current().parameter(name, fallback)
  }

  getCurrentRequest () {
    return this.#currentRequest
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

  #runRoute (request, route) {
    this.#validateRequest(request)

    request.setRouteResolver(() => route)

    this.#currentRequest = request

    this.#eventManager?.emit(Event.ROUTE_MATCHED, new Event(Event.ROUTE_MATCHED, this, { route, request }))

    return this.#runRouteWithMiddleware(request, route)
  }

  async #runRouteWithMiddleware (request, route) {
    const skip = this.#container?.bound('configurations.middleware.disabled') && this.#container?.make('configurations.middleware.disabled') === false
    const middleware = skip ? [] : this.gatherRouteMiddlewareInstances(route)

    const response = await Pipeline.create(this.#container)
      .send(request)
      .through(middleware)
      .then(req => route.bind(req).run(req))

    return this.prepareResponse(request, response)
  }

  #hydrateRoute (route) {
    return route
      .setRouter(this)
      .setContainer(this.#container)
      .setMatchers(this.getMatchers())
      .setDispatchers(this.getDispatchers())
  }

  #createRouteDefinition (definition, methods) {
    return new RouteDefinition({ ...definition, methods })
  }

  #validateRequest (request) {
    if (!(request instanceof Request)) {
      throw new LogicException('Request must be an instance of Stone.js http/Request.')
    }

    return this
  }

  #setOptions () {
    if (this.#container?.bound('config')) {
      const config = this.#container.make('config')
      
      this.#rules = config.get('router.rules', {})
      this.#maxDepth = config.get('router.maxDepth', 5)
      this.#matchers = config.get('router.matchers', [])
      this.#middleware = config.get('router.middleware', [])
      this.#dispatchers = config.get('router.dispatchers', {})
    }
  }
}
