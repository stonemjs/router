import { Route } from './Route.mjs'
import { Event } from './Event.mjs'
import { Pipeline } from '@stone-js/pipeline'
import { LogicException } from '@stone-js/common'
import { UriMatcher } from './matchers/UriMatcher.mjs'
import { HTTP_METHODS } from './enums/http-methods.mjs'
import { RouteCollection } from './RouteCollection.mjs'
import { RouteDefinition } from './RouteDefinition.mjs'
import { HostMatcher } from './matchers/HostMatcher.mjs'
import { MethodMatcher } from './matchers/MethodMatcher.mjs'
import { ExplicitLoader } from './loaders/ExplicitLoader.mjs'
import { DecoratorLoader } from './loaders/DecoratorLoader.mjs'
import { ProtocolMatcher } from './matchers/ProtocolMatcher.mjs'
import { CallableDispatcher } from './dispatchers/CallableDispatcher.mjs'
import { ComponentDispatcher } from './dispatchers/ComponentDispatcher.mjs'
import { ControllerDispatcher } from './dispatchers/ControllerDispatcher.mjs'

/**
 * Class representing a Router.
 *
 * @author Mr. Stone <pierre.evens16@gmail.com>
 * 
 * @external Container
 * @see {@link https://github.com/stonemjs/service-container/blob/main/src/Container.mjs|Container}
 */
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
  #skipMiddleware
  #currentRequest

  /**
   * Create a router.
   *
   * @param {Container} container
   */
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
    this.#skipMiddleware = false
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

  addFromRouteDefinitions (routeDefinitions) {
    routeDefinitions.forEach(this.addFromRouteDefinition)
    return this
  }

  createFromRouteDefinition (routeDefinition) {
    return this.#hydrateRoute(Route.fromRouteDefinition(routeDefinition))
  }

  async loadRoutes (routeLoader) {
    if (!routeLoader.load) {
      throw new LogicException('Invalid loader, routeLoader must have `load` method')
    }

    return this.addFromRouteDefinitions(await routeLoader.load())
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
    this.#eventManager?.emit(Event.ROUTING, new Event(Event.ROUTING, this, { request }))

    this.#current = this.#routes.match(request)
    this.#container?.instance(Route, this.#current)?.alias(Route, 'route')

    return this.#current
  }

  gatherRouteMiddlewareInstances (route) {
    return this
      .gatherRouteMiddleware(route)
      .map(Middleware => this.#container?.bound(Middleware) ? this.#container.make(Middleware) : new Middleware())
  }

  gatherRouteMiddleware (route) {
    return this.#middleware
      .concat(route.middleware)
      .filter(v => v && !route.excludeMiddleware?.includes(v))
      .reduce((prev, curr) => prev.includes(curr) ? prev : prev.concat(curr), [])
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

  addRule (name, pattern) {
    this.#rules[name] = pattern
    return this
  }

  setRules (rules) {
    this.#rules = rules
    return this
  }

  skipMiddleware (value = true) {
    this.#skipMiddleware = value
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
    return this.current()?.name
  }

  isCurrentRouteNamed (name) {
    return this.currentRouteName() === name
  }

  currentRouteAction () {
    return this.current()?.action
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
    if (!['component', 'callable', 'controller'].includes(type)) {
      throw new LogicException(`Invalid dispatcher type ${type}. Valid types are ('component', 'callable', 'controller')`)
    }

    this.#dispatchers[type] = dispatcher

    return this
  }

  setCallableDispatcher (dispatcher) {
    this.addDispatcher('callable', dispatcher)
    return this
  }

  setComponentDispatcher (dispatcher) {
    this.addDispatcher('component', dispatcher)
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
    this._defaultMatchers ??= [
      new HostMatcher(),
      new MethodMatcher(),
      new ProtocolMatcher(),
      new UriMatcher()
    ]

    return this._defaultMatchers
  }

  #getDefaultDispatchers () {
    return {
      callable: CallableDispatcher,
      component: ComponentDispatcher,
      controller: ControllerDispatcher
    }
  }

  #runRoute (request, route) {
    request?.setRouteResolver(() => route)

    this.#currentRequest = request

    this.#eventManager?.emit(Event.ROUTE_MATCHED, new Event(Event.ROUTE_MATCHED, this, { route, request }))

    return this.#runRouteWithMiddleware(request, route)
  }

  #runRouteWithMiddleware (request, route) {
    const middleware = this.#skipMiddleware ? [] : this.gatherRouteMiddlewareInstances(route)

    return Pipeline
      .create(this.#container)
      .send(request)
      .through(middleware)
      .then(req => route.bind(req).run(req))
  }

  #hydrateRoute (route) {
    return route
      .setRouter(this)
      .addRules(this.#rules)
      .setContainer(this.#container)
      .setMatchers(this.getMatchers())
      .setDispatchers(this.getDispatchers())
  }

  #createRouteDefinition (definition, methods) {
    return new RouteDefinition({ ...definition, methods })
  }

  #setOptions () {
    if (this.#container?.bound('config')) {
      const config = this.#container.make('config')
      
      this.#rules = config.get('router.rules', {})
      this.#maxDepth = config.get('router.maxDepth', 5)
      this.#matchers = config.get('router.matchers', [])
      this.#middleware = config.get('router.middleware', [])
      this.#dispatchers = config.get('router.dispatchers', {})
      this.#skipMiddleware = config.get('router.middleware_disabled', false)
    }
  }
}
