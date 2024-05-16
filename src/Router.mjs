import { Route } from './Route.mjs'
import { Event } from './Event.mjs'
import { Pipeline } from '@stone-js/pipeline'
import { UriMatcher } from './matchers/UriMatcher.mjs'
import { RouteCollection } from './RouteCollection.mjs'
import { HostMatcher } from './matchers/HostMatcher.mjs'
import { MethodMatcher } from './matchers/MethodMatcher.mjs'
import { FlattenMapper } from './definition/FlattenMapper.mjs'
import { ProtocolMatcher } from './matchers/ProtocolMatcher.mjs'
import { RouteDefinition } from './definition/RouteDefinition.mjs'
import { DecoratorBuilder } from './definition/DecoratorBuilder.mjs'
import { DefinitionBuilder } from './definition/DefinitionBuilder.mjs'
import { CallableDispatcher } from './dispatchers/CallableDispatcher.mjs'
import { ComponentDispatcher } from './dispatchers/ComponentDispatcher.mjs'
import { ControllerDispatcher } from './dispatchers/ControllerDispatcher.mjs'
import { HttpError, isConstructor, isPlainObject, DELETE, GET, HTTP_METHODS, OPTIONS, PATCH, POST, PUT } from '@stone-js/common'

/**
 * IncomingEvent.
 *
 * @external IncomingEvent
 * @see {@link https://github.com/stonemjs/common/blob/main/src/IncomingEvent.mjs|IncomingEvent}
 */

/**
 * Container.
 *
 * @external Container
 * @see {@link https://github.com/stonemjs/service-container/blob/main/src/Container.mjs|Container}
 */

/**
 * EventEmitter.
 *
 * @external EventEmitter
 * @see {@link https://github.com/stonemjs/Core/blob/main/src/EventEmitter.mjs|EventEmitter}
 */

/**
 * Class representing a Router.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class Router {
  static METHODS = HTTP_METHODS

  #rules
  #strict
  #prefix
  #routes
  #current
  #bindings
  #maxDepth
  #matchers
  #defaults
  #container
  #middleware
  #dispatchers
  #eventEmitter
  #currentEvent
  #skipMiddleware

  #defaultMatchers

  /**
   * Create a router.
   *
   * @param {routerOptions} [options={}] - Router configuration options
   * @param {external:Container=} [container=null] - Stone.js service container module
   * @param {external:EventEmitter=} [eventEmitter=null] - Stone.js event emitter module
   */
  constructor (options = {}, container = null, eventEmitter = null) {
    this.#container = container
    this.#eventEmitter = eventEmitter
    this.#routes = new RouteCollection()

    if (!this.#container) {
      console.log('No service container instance provided.')
    }

    if (!this.#eventEmitter) {
      console.log('No Event manager instance provided. No events will be disptached.')
    }

    this
      .#setOptions(options)
      .#container?.instance('routes', this.#routes)
  }

  /**
   * Define implicit GET route.
   *
   * @param  {definition} definition
   * @return {this}
   */
  get (definition) {
    return this.match({ ...definition, methods: [GET] })
  }

  /**
   * Define implicit POST route.
   *
   * @param  {definition} definition
   * @return {this}
   */
  post (definition) {
    return this.match({ ...definition, methods: [POST] })
  }

  /**
   * Define implicit PUT route.
   *
   * @param  {definition} definition
   * @return {this}
   */
  put (definition) {
    return this.match({ ...definition, methods: [PUT] })
  }

  /**
   * Define implicit PATCH route.
   *
   * @param  {definition} definition
   * @return {this}
   */
  patch (definition) {
    return this.match({ ...definition, methods: [PATCH] })
  }

  /**
   * Define implicit DELETE route.
   *
   * @param  {definition} definition
   * @return {this}
   */
  delete (definition) {
    return this.match({ ...definition, methods: [DELETE] })
  }

  /**
   * Define implicit OPTIONS route.
   *
   * @param  {definition} definition
   * @return {this}
   */
  options (definition) {
    return this.match({ ...definition, methods: [OPTIONS] })
  }

  /**
   * Define implicit any route.
   *
   * @param  {definition} definition
   * @return {this}
   */
  any (definition) {
    return this.match({ ...definition, methods: HTTP_METHODS })
  }

  /**
   * Define a fallback route.
   * Fallback allow to define an action when no routes matches.
   *
   * @param  {Function|Object} action
   * @return {this}
   */
  fallback (action) {
    return this.match({ action, fallback: true, methods: [GET], path: '/:__fallback__(.*)*' })
  }

  /**
   * Define implicit match any verbs route.
   *
   * @param  {definition} definition
   * @return {this}
   */
  match (definition) {
    return this.addFromRouteDefinition(new RouteDefinition(definition))
  }

  /**
   * Add routes to RouteCollection from an array of RouteDefinition.
   *
   * @param  {RouteDefinition[]} routeDefinitions
   * @return {this}
   */
  addFromRouteDefinitions (routeDefinitions) {
    routeDefinitions.forEach(v => this.addFromRouteDefinition(v))
    return this
  }

  /**
   * Add single route to RouteCollection from RouteDefinition.
   *
   * @param  {RouteDefinition} routeDefinition
   * @return {this}
   */
  addFromRouteDefinition (routeDefinition) {
    this.#routes.add(this.createFromRouteDefinition(routeDefinition))
    return this
  }

  /**
   * Create route from RouteDefinition.
   *
   * @param  {RouteDefinition} routeDefinition
   * @return {this}
   */
  createFromRouteDefinition (routeDefinition) {
    return this.#hydrateRoute(Route.create(routeDefinition))
  }

  /**
   * Register routes from explicit or decorator source.
   *
   * @param  {(definition[]|Function[])} definitions
   * @return {this}
   * @throws {TypeError}
   */
  register (definitions) {
    if (Array.isArray(definitions) && definitions.length) {
      if (isPlainObject(definitions[0])) {
        return this.registerRoutesFromExplicitSource(definitions)
      } else if (isConstructor(definitions[0])) {
        return this.registerRoutesFromDecoratorSource(definitions)
      }
    }

    throw new TypeError('Route definitions must be an array of literal object or class.')
  }

  /**
   * Register routes from builder.
   *
   * @param  {(DefinitionBuilder|DecoratorBuilder)} definitionBuilder
   * @param  {definition[]} definitions
   * @return {this}
   * @throws {TypeError}
   */
  registerRoutesFromBuilder (definitionBuilder, definitions) {
    if (!definitionBuilder.build) {
      throw new TypeError('Invalid builder, definitionBuilder must have `build` method.')
    }

    return this.addFromRouteDefinitions(definitionBuilder.build(definitions))
  }

  /**
   * Register routes from explicit source.
   *
   * @param  {definition[]} definitions
   * @return {this}
   */
  registerRoutesFromExplicitSource (definitions) {
    return this.registerRoutesFromBuilder(new DefinitionBuilder(new FlattenMapper(this.#maxDepth)), definitions)
  }

  /**
   * Register routes from decorator source.
   *
   * @param  {Function[]} classes
   * @return {this}
   */
  registerRoutesFromDecoratorSource (classes) {
    return this.registerRoutesFromBuilder(new DecoratorBuilder(new FlattenMapper(this.#maxDepth)), classes)
  }

  /**
   * Dispatch event to route.
   * Match event to route and if exists run the route's action.
   *
   * @fires  Event#ROUTE_MATCHED
   * @param  {IncomingEvent} event
   * @return {*}
   */
  dispatch (event) {
    return this.#runRoute(event, this.findRoute(event))
  }

  /**
   * Get route by name and run the route's action.
   *
   * @fires  Event#ROUTE_MATCHED
   * @param  {IncomingEvent} event
   * @param  {string} name
   * @return {*}
   * @throws {HttpError}
   */
  respondWithRouteName (event, name) {
    const route = this.#routes.getByName(name)

    if (!route) {
      throw new HttpError(404, 'Not Found', [], `No routes found for this name ${name}`)
    }

    return this.#runRoute(event, route)
  }

  /**
   * Generate a route string by name.
   *
   * @param  {string} name
   * @param  {Object} [params={}]
   * @param  {boolean} [withDomain=true]
   * @param  {string} [protocol=null]
   * @return {string}
   * @throws {TypeError}
   */
  generate (name, params = {}, withDomain = true, protocol = null) {
    const route = this.#routes.getByName(name)

    if (!route) {
      throw new TypeError(`No routes found for this name ${name}`)
    }

    return route.generate(params, withDomain, protocol)
  }

  /**
   * Find matched route by event.
   *
   * @fires   Event#ROUTING
   * @param  {IncomingEvent} event
   * @return {Route}
   */
  findRoute (event) {
    this.#eventEmitter?.emit(Event.ROUTING, new Event(Event.ROUTING, this, { event, request: event }))

    this.#current = this.#routes.match(event)
    this.#container?.instance(Route, this.#current)?.alias(Route, 'route')

    return this.#current
  }

  /**
   * Unique merge Router and route middleware, remove excludeMiddleware.
   *
   * @param  {Route} route
   * @return {Function[]}
   */
  gatherRouteMiddleware (route) {
    return this.#middleware
      .concat(route.middleware)
      .filter(v => v && !route.excludeMiddleware?.includes(v))
      .reduce((prev, curr) => prev.includes(curr) ? prev : prev.concat(curr), [])
  }

  /**
   * Register a callback to be invoked when route events fire.
   *
   * @listens Event#ROUTING
   * @listens Event#ROUTE_MATCHED
   *
   * @param  {(Event.ROUTING|Event.ROUTE_MATCHED)} eventName
   * @param  {Function} callback
   * @return {this}
   */
  on (eventName, callback) {
    this.#eventEmitter?.on(eventName, callback)
    return this
  }

  /**
   * Set max depth value for explicit parent children route definitions.
   *
   * @param  {number} value
   * @return {this}
   */
  setMaxDepth (value) {
    this.#maxDepth = value
    return this
  }

  /**
   * Set Uri regex pattern to be strict when matching.
   *
   * @param  {boolean} value
   * @return {this}
   */
  setStrict (value) {
    this.#strict = value
    return this
  }

  /**
   * Set global routes prefix.
   *
   * @param  {string} prefix
   * @return {this}
   */
  setPrefix (value) {
    this.#prefix = value
    return this
  }

  /**
   * Get middleware.
   *
   * @return {Function[]}
   */
  getMiddleware () {
    return this.#middleware
  }

  /**
   * Set middleware.
   *
   * @param  {Function[]} middleware
   * @return {this}
   */
  setMiddleware (middleware) {
    this.#middleware = middleware
    return this
  }

  /**
   * Add middleware.
   *
   * @param  {Function} middleware
   * @return {this}
   */
  addMiddleware (middleware) {
    this.#middleware = this.#middleware.concat(middleware)
    return this
  }

  /**
   * Add binding.
   *
   * @param  {string} name
   * @param  {Function} value
   * @return {this}
   */
  addBinding (name, value) {
    this.#bindings[name] = value
    return this
  }

  /**
   * Set binding.
   *
   * @param  {Object} bindings
   * @return {this}
   */
  setBindings (bindings) {
    this.#bindings = bindings
    return this
  }

  /**
   * Add rule.
   *
   * @param  {string} name
   * @param  {RegExp} pattern
   * @return {this}
   */
  addRule (name, pattern) {
    this.#rules[name] = pattern
    return this
  }

  /**
   * Set rules.
   *
   * @param  {Object} rules
   * @return {this}
   */
  setRules (rules) {
    this.#rules = rules
    return this
  }

  /**
   * Add default.
   *
   * @param  {string} name
   * @param  {string} value
   * @return {this}
   */
  addDefault (name, value) {
    this.#defaults[name] = value
    return this
  }

  /**
   * Set defaults.
   *
   * @param  {Object} defaults
   * @return {this}
   */
  setDefaults (defaults) {
    this.#defaults = defaults
    return this
  }

  /**
   * Skip all middleware.
   *
   * @param  {boolean} [value=true]
   * @return {this}
   */
  skipMiddleware (value = true) {
    this.#skipMiddleware = value
    return this
  }

  /**
   * Has named route.
   *
   * @param  {string} name
   * @return {boolean}
   */
  has (name) {
    return []
      .concat(name)
      .reduce((prev, curr) => !this.#routes.hasNamedRoute(curr) ? false : prev, true)
  }

  /**
   * Get route matched event parameters.
   *
   * @param  {string} name
   * @param  {*} [fallback=null] return default value when not found.
   * @return {string}
   */
  input (name, fallback = null) {
    return this.current().parameter(name, fallback)
  }

  /**
   * Get current event.
   *
   * @return {IncomingEvent}
   */
  getCurrentEvent () {
    return this.#currentEvent
  }

  /**
   * Get current matched route.
   *
   * @return {Route}
   */
  current () {
    return this.#current
  }

  /**
   * Get current matched route name.
   *
   * @return {string}
   */
  currentRouteName () {
    return this.current()?.name
  }

  /**
   * Is current matched route has name.
   *
   * @return {boolean}
   */
  isCurrentRouteNamed (name) {
    return this.currentRouteName() === name
  }

  /**
   * Get current matched route action.
   *
   * @return {*}
   */
  currentRouteAction () {
    return this.current()?.action
  }

  /**
   * Get routes.
   *
   * @return {RouteCollection}
   */
  getRoutes () {
    return this.#routes
  }

  /**
   * Set routes.
   *
   * @param  {RouteCollection} routeCollection
   * @return {this}
   * @throws {TypeError}
   */
  setRoutes (routeCollection) {
    if (!(routeCollection instanceof RouteCollection)) {
      throw new TypeError('Parameter must be an instance of RouteCollection')
    }

    for (const route of routeCollection) {
      this.#hydrateRoute(route)
    }

    this.#routes = routeCollection

    return this
  }

  /**
   * Set container.
   *
   * @param  {external:Container} container
   * @return {this}
   */
  setContainer (container) {
    this.#container = container
    return this
  }

  /**
   * Set Event Emitter.
   *
   * @param  {external:EventEmitter} EventEmitter
   * @return {this}
   */
  setEventEmitter (eventEmitter) {
    this.#eventEmitter = eventEmitter
    return this
  }

  /**
   * Get user defined or built in route matchers.
   *
   * @param  {boolean} [orDefault=true] when true return built in matchers if no matchers is defined.
   * @return {array}
   */
  getMatchers (orDefault = true) {
    return this.hasMatchers() ? this.#matchers : (orDefault ? this.#getDefaultMatchers() : [])
  }

  /**
   * Has route matchers.
   *
   * @return {boolean}
   */
  hasMatchers () {
    return this.#matchers?.length > 0
  }

  /**
   * Set matchers.
   *
   * @param  {array} matchers
   * @param  {boolean} [mergeWithDefault=true] merge with built in matchers.
   * @return {this}
   */
  setMatchers (matchers, mergeWithDefault = true) {
    this.#matchers = [].concat(mergeWithDefault ? this.#getDefaultMatchers() : [], matchers)
    return this
  }

  /**
   * Get user defined or built in route dispatchers.
   *
   * @param  {boolean} [orDefault=true] when true return built in dispatchers if no dispatchers is defined.
   * @return {Object}
   */
  getDispatchers (orDefault = true) {
    return this.hasDispatchers() ? this.#dispatchers : (orDefault ? this.#getDefaultDispatchers() : {})
  }

  /**
   * Has route dispatchers.
   *
   * @return {boolean}
   */
  hasDispatchers () {
    return Object.values(this.#dispatchers).length > 0
  }

  /**
   * Set dispatchers.
   *
   * @param  {Object} dispatchers
   * @return {this}
   */
  setDispatchers (dispatchers) {
    Object
      .entries(dispatchers)
      .forEach(([type, dispatcher]) => this.addDispatcher(type, dispatcher))

    return this
  }

  /**
   * Add dispatcher.
   *
   * @param  {string} type
   * @param  {Function} dispatcher
   * @return {this}
   * @throws {TypeError}
   */
  addDispatcher (type, dispatcher) {
    if (!['component', 'callable', 'controller'].includes(type)) {
      throw new TypeError(`Invalid dispatcher type ${type}. Valid types are ('component', 'callable', 'controller')`)
    }

    this.#dispatchers[type] = dispatcher

    return this
  }

  /**
   * Set component dispatcher.
   *
   * @param  {Function} dispatcher
   * @return {this}
   */
  setComponentDispatcher (dispatcher) {
    this.addDispatcher('component', dispatcher)
    return this
  }

  /**
   * Set callable dispatcher.
   *
   * @param  {Function} dispatcher
   * @return {this}
   */
  setCallableDispatcher (dispatcher) {
    this.addDispatcher('callable', dispatcher)
    return this
  }

  /**
   * Set controller dispatcher.
   *
   * @param  {Function} dispatcher
   * @return {this}
   */
  setControllerDispatcher (dispatcher) {
    this.addDispatcher('controller', dispatcher)
    return this
  }

  /**
   * Dump routes.
   * Return all routes literal object array
   *
   * @return {array}
   */
  dumpRoutes () {
    return this.#routes.dump()
  }

  #getDefaultMatchers () {
    this.#defaultMatchers ??= [
      new HostMatcher(),
      new MethodMatcher(),
      new ProtocolMatcher(),
      new UriMatcher()
    ]

    return this.#defaultMatchers
  }

  #getDefaultDispatchers () {
    return {
      callable: CallableDispatcher,
      component: ComponentDispatcher,
      controller: ControllerDispatcher
    }
  }

  #runRoute (event, route) {
    event?.setRouteResolver(() => route)

    this.#currentEvent = event

    this.#eventEmitter?.emit(Event.ROUTE_MATCHED, new Event(Event.ROUTE_MATCHED, this, { event, route, request: event }))

    return this.#runRouteWithMiddleware(event, route)
  }

  #runRouteWithMiddleware (event, route) {
    const middleware = this.#skipMiddleware ? [] : this.gatherRouteMiddleware(route)

    return Pipeline
      .create(this.#container)
      .send(event)
      .through(middleware)
      .then(ev => this.#bindAndRun(route, ev))
  }

  async #bindAndRun (route, event) {
    route = await route.bind(event)
    return route.run(event)
  }

  #hydrateRoute (route) {
    return route
      .setRouter(this)
      .addRules(this.#rules)
      .setStrict(this.#strict)
      .setPrefix(this.#prefix)
      .addBindings(this.#bindings)
      .addDefaults(this.#defaults)
      .setContainer(this.#container)
      .setMatchers(this.getMatchers())
      .setDispatchers(this.getDispatchers())
  }

  #setOptions (options) {
    this.#rules = options?.rules ?? {}
    this.#prefix = options?.prefix ?? null
    this.#strict = options?.strict ?? false
    this.#maxDepth = options?.maxDepth ?? 5
    this.#matchers = options?.matchers ?? []
    this.#defaults = options?.defaults ?? {}
    this.#bindings = options?.bindings ?? {}
    this.#middleware = options?.middleware ?? []
    this.#dispatchers = options?.dispatchers ?? {}
    this.#skipMiddleware = options?.skipMiddleware ?? false

    if (options?.definitions?.length) {
      this.register(options.definitions)
    }

    return this
  }
}
