import { Mock } from 'vitest'
import { Route } from '../src/Route'
import { Router } from '../src/Router'
import { IBlueprint } from '@stone-js/core'
import { RouteEvent } from '../src/events/RouteEvent'
import { RouterError } from '../src/errors/RouterError'
import { RouteCollection } from '../src/RouteCollection'
import { RouteNotFoundError } from '../src/errors/RouteNotFoundError'
import { DependencyResolver, IIncomingEvent, RouteDefinition } from '../src/declarations'
import { DELETE, GET, OPTIONS, PATCH, POST, PUT } from '../src/constants'

/* eslint-disable @typescript-eslint/no-extraneous-class */

vi.mock('../src/Route', () => ({
  Route: {
    create: vi.fn()
  }
}))

vi.mock('../src/RouteMapper', () => ({
  RouteMapper: {
    create: vi.fn(() => ({
      toRoutes: vi.fn((def) => [Route.create({} as any)])
    }))
  }
}))

describe('Router', () => {
  let router: Router
  let blueprintMock: IBlueprint

  const containerMock = {
    alias: vi.fn(),
    resolve: vi.fn(),
    instance: vi.fn().mockReturnThis(),
    has: vi.fn(() => true)
  } as unknown as DependencyResolver

  const eventEmitterMock = {
    emit: vi.fn(),
    on: vi.fn()
  }

  beforeEach(() => {
    blueprintMock = {
      add: vi.fn(),
      get: vi.fn(() => ({}))
    } as unknown as IBlueprint

    const collection = new RouteCollection()
    collection.add = vi.fn()
    collection.match = vi.fn()
    collection.getByName = vi.fn()
    collection.dump = vi.fn(() => [])
    collection.setOutgoingResponseResolver = vi.fn().mockReturnThis()

    RouteCollection.create = () => collection as any

    router = Router.create({
      blueprint: blueprintMock,
      container: containerMock,
      eventEmitter: eventEmitterMock
    })
  })

  it('should create a Router instance with valid options', () => {
    expect(router).toBeInstanceOf(Router)
  })

  it('should throw a RouterError when the blueprint is missing', () => {
    expect(() =>
      // @ts-expect-error - Testing invalid input
      Router.create({ blueprint: undefined, container: containerMock })
    ).toThrow(RouterError)
  })

  it('should add a route group', () => {
    router.group('/api', { strict: true })
    // @ts-expect-error - Accessing private property for testing purposes
    expect(router.groupDefinition).toEqual({ strict: true, path: '/api' })
  })

  it('should remove the group definition', () => {
    router.group('/api', { strict: true })
    // @ts-expect-error - Accessing private property for testing purposes
    expect(router.groupDefinition).toEqual({ strict: true, path: '/api' })

    router.noGroup()
    // @ts-expect-error - Accessing private property for testing purposes
    expect(router.groupDefinition).toBeUndefined()
  })

  it('should add a GET route with an internal HEAD route for get method', () => {
    router.get('/test', { action: vi.fn() })
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['GET'] }))
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['HEAD'] }))
  })

  it('should add a GET route with an internal HEAD route for add method', () => {
    router.add('/test', (() => {}) as any)
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['GET'] }))
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['HEAD'] }))
  })

  it('should add a GET route with an internal HEAD route for page method', () => {
    router.page('/test', { action: vi.fn(), component: vi.fn() })
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['GET'] }))
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['HEAD'] }))
  })

  it('should add a GET route with an internal HEAD route for fallback method', () => {
    router.fallback('/test')
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['GET'] }))
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['HEAD'] }))
  })

  it('should add a OPTIONS route', () => {
    router.options('/submit', { action: vi.fn() })
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['OPTIONS'] }))
  })

  it('should add a POST route', () => {
    router.group('/api', { strict: true })
    router.post('/submit', { action: vi.fn() })
    expect(blueprintMock.add).toHaveBeenCalledWith(
      'stone.router.definitions',
      expect.objectContaining({ children: [expect.objectContaining({ methods: ['POST'] })] })
    )
  })

  it('should add a PUT route', () => {
    router.put('/submit', { action: vi.fn() })
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['PUT'] }))
  })

  it('should add a PATCH route', () => {
    router.patch('/submit', { action: vi.fn() })
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['PATCH'] }))
  })

  it('should add a DELETE route', () => {
    router.delete('/submit', { action: vi.fn() })
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: ['DELETE'] }))
  })

  it('should add a ANY route', () => {
    router.any('/submit', { action: vi.fn() })
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', expect.objectContaining({ methods: [GET, POST, PUT, PATCH, DELETE, OPTIONS] }))
  })

  it('should define routes', () => {
    router.define([{ path: '/define', method: GET, handler: vi.fn() }])
    expect(router.getRoutes().add).toHaveBeenCalled()
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.definitions', [expect.objectContaining({ method: GET })])
  })

  it('should set routes when provided with a valid RouteCollection instance', () => {
    (blueprintMock.get as Mock).mockImplementation((key) => {
      if (key === 'stone.router.responseResolver') return undefined
      if (key === 'stone.kernel.responseResolver') return vi.fn()
    })
    const routeCollectionMock = RouteCollection.create()
    router.setRoutes(routeCollectionMock as unknown as RouteCollection)
    expect(routeCollectionMock.setOutgoingResponseResolver).toHaveBeenCalled()
    expect(blueprintMock.get).toHaveBeenCalledWith('stone.router.responseResolver')
  })

  it('should throw an error if routes are not a valid RouteCollection instance', () => {
    expect(() => router.setRoutes({} as unknown as RouteCollection)).toThrow(RouterError)
  })

  it('should configure router options by adding them to the blueprint', () => {
    const options = { strict: true }
    router.configure(options)
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router', options)
  })

  it('should add middleware to the blueprint', () => {
    const middleware = vi.fn()
    router.use(middleware)
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.middleware', middleware)
  })

  it('should add multiple middleware to the blueprint', () => {
    const middleware = [vi.fn(), vi.fn()]
    router.use(middleware)
    expect(blueprintMock.add).toHaveBeenCalledWith('stone.router.middleware', middleware)
  })

  it('should add middleware to specific route definitions', () => {
    const addMiddleware = vi.fn()
    router.getRoutes().getByName = vi.fn(() => ({ addMiddleware })) as any
    const definitions = [{ name: 'route1' }, { name: 'route2' }] as unknown as RouteDefinition[]
    (blueprintMock.get as Mock).mockReturnValue(definitions)
    router.useOn('route1', vi.fn())
    expect(addMiddleware).toHaveBeenCalled()
    expect(definitions[0].middleware).toBeDefined()
  })

  it('should handle adding middleware to multiple route definitions by name', () => {
    const definitions = [{ name: 'route1' }, { name: 'route2' }] as unknown as RouteDefinition[];
    (blueprintMock.get as Mock).mockReturnValue(definitions)
    router.useOn(['route1', 'route2'], vi.fn())
    expect(definitions[0].middleware).toBeDefined()
    expect(definitions[1].middleware).toBeDefined()
  })

  it('should register an event listener on the event emitter', () => {
    const listener = vi.fn() as unknown as IListener
    const eventName = 'customEvent'
    router.on(eventName, listener)
    expect(eventEmitterMock.on).toHaveBeenCalledWith(eventName, listener)
  })

  it('should match a route and return it', () => {
    const routeMock = { matches: vi.fn(() => true) }

    // @ts-expect-error - Overriding method for testing purposes
    router.getRoutes().match = vi.fn(() => routeMock)

    const matchedRoute = router.findRoute({ method: 'GET', pathname: '/test' } as unknown as IIncomingEvent)

    expect(matchedRoute).toBe(routeMock)
    expect(containerMock.alias).toHaveBeenCalled()
    expect(containerMock.instance).toHaveBeenCalled()
    expect(eventEmitterMock.emit).toHaveBeenCalledWith(expect.any(RouteEvent))
  })

  it('should dispatch an event and return the route response', async () => {
    const routeMock = { run: vi.fn(() => 'response'), bind: vi.fn(), getOption: () => [vi.fn()] }
    const event = { method: 'GET', pathname: '/test', setRouteResolver: vi.fn() } as unknown as IIncomingEvent;

    (blueprintMock.get as Mock).mockReturnValue([])

    // @ts-expect-error - Overriding method for testing purposes
    router.getRoutes().match = vi.fn(() => routeMock)

    const response = await router.dispatch(event)

    expect(response).toBe('response')
    expect(routeMock.run).toHaveBeenCalledWith(event)
    expect(event.setRouteResolver).toHaveBeenCalled()
    expect(routeMock.bind).toHaveBeenCalledWith(event)
    expect(eventEmitterMock.emit).toHaveBeenCalledWith(expect.any(RouteEvent))
  })

  it('should respond using a named route', async () => {
    const routeMock = { run: vi.fn(() => 'response'), bind: vi.fn(), getOption: () => [vi.fn()] }
    const event = { method: 'GET', pathname: '/test', setRouteResolver: vi.fn() } as unknown as IIncomingEvent;

    (blueprintMock.get as Mock).mockReturnValue([])

    // @ts-expect-error - Overriding method for testing purposes
    router.getRoutes().getByName = vi.fn(() => routeMock)

    const response = await router.respondWithRouteName(event, 'testRoute')

    expect(response).toBe('response')
    expect(routeMock.run).toHaveBeenCalledWith(event)
    expect(event.setRouteResolver).toHaveBeenCalled()
    expect(routeMock.bind).toHaveBeenCalledWith(event)
    expect(eventEmitterMock.emit).toHaveBeenCalledWith(expect.any(RouteEvent))
  })

  it('should throw an error when route is not found', async () => {
    const event = { method: 'GET', pathname: '/test', setRouteResolver: vi.fn() } as unknown as IIncomingEvent
    router.getRoutes().getByName = vi.fn(() => undefined)
    await expect(async () => await router.respondWithRouteName(event, 'testRoute')).rejects.toThrowError(RouteNotFoundError)
  })

  it('should generate a URL for a named route', () => {
    const routeMock = {
      generate: vi.fn(() => '/generated-url')
    }

    // @ts-expect-error - Overriding method for testing purposes
    router.getRoutes().getByName = vi.fn(() => routeMock)

    const url = router.generate({ name: 'testRoute' })

    expect(url).toBe('/generated-url')
  })

  it('should throw an error when route is not found', async () => {
    router.getRoutes().getByName = vi.fn(() => undefined)
    expect(() => router.generate({ name: 'testRoute' })).toThrowError(RouteNotFoundError)
  })

  it('should navigate to a given URL', () => {
    // @ts-expect-error - Testing invalid input
    global.window = { history: { pushState: vi.fn() }, dispatchEvent: vi.fn() } as unknown as Window
    global.CustomEvent = vi.fn()

    router.navigate('/home')

    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent))
    expect(window.history.pushState).toHaveBeenCalledWith({ path: '/home', options: '/home' }, '', '/home')

    router.generate = vi.fn(() => '/home')

    router.navigate({ name: '/home', hash: 'test' })

    expect(window.history.pushState).toHaveBeenCalledWith({ path: '/home', options: { name: '/home', hash: 'test' } }, '', '/home')
  })

  it('should throw an error when navigate is called outside of browser', () => {
    // @ts-expect-error - Testing invalid input
    global.window = undefined
    expect(() => router.navigate('/home')).toThrow(RouterError)
  })

  it('test getters and issers', () => {
    // @ts-expect-error - Overriding method for testing purposes
    router.routes.hasNamedRoute = vi.fn(() => true)
    // @ts-expect-error - Overriding method for testing purposes
    router.routes.dump = vi.fn(() => ({ test: 'test' }))
    // @ts-expect-error - Overriding method for testing purposes
    router.currentRoute = {
      params: { test: 'test' },
      getParam: vi.fn(() => 'test'),
      getOption: vi.fn(() => 'route1')
    } as any

    expect(router.getCurrentRoute()).toBeTruthy()
    expect(router.getParameter('name')).toBe('test')
    expect(router.getCurrentRouteName()).toBe('route1')
    expect(router.dumpRoutes()).toEqual({ test: 'test' })
    expect(router.isCurrentRouteNamed('route1')).toBe(true)
    expect(router.hasRoute(['route1', 'route2'])).toBe(true)
    expect(router.getParameters()).toEqual({ test: 'test' })
  })

  it('should gather middleware from blueprint and route options', () => {
    (blueprintMock.get as Mock).mockImplementation((key) => {
      if (key === 'stone.router.skipMiddleware') return false
      if (key === 'stone.router.middleware') return [vi.fn(), vi.fn()]
    })
    const routeMock = { isMiddlewareExcluded: vi.fn(() => false), getOption: () => [vi.fn()] } as unknown as Route
    const middleware = router.gatherRouteMiddleware(routeMock)

    expect(middleware.length).toBe(3)
    expect(blueprintMock.get).toHaveBeenCalledWith('stone.router.middleware', [])
  })

  it('should exclude middleware if skipMiddleware is true or excluded by the route', () => {
    (blueprintMock.get as Mock).mockImplementation((key) => {
      if (key === 'stone.router.skipMiddleware') return true
      if (key === 'stone.router.middleware') return [vi.fn(), vi.fn()]
    })
    const routeMock = { isMiddlewareExcluded: vi.fn(() => true), getOption: () => [vi.fn()] } as unknown as Route
    const middleware = router.gatherRouteMiddleware(routeMock)

    expect(middleware.length).toBe(0)
    expect(blueprintMock.get).toHaveBeenCalledWith('stone.router.skipMiddleware', false)
  })

  it('should avoid adding duplicate middleware', () => {
    const middlewareFn = vi.fn();

    (blueprintMock.get as Mock).mockImplementation((key) => {
      if (key === 'stone.router.skipMiddleware') return false
      if (key === 'stone.router.middleware') return [middlewareFn]
    })
    const routeMock = { isMiddlewareExcluded: vi.fn(() => false), getOption: () => [middlewareFn] } as unknown as Route
    const middleware = router.gatherRouteMiddleware(routeMock)

    expect(middleware.length).toBe(1)
  })

  it('should resolve middleware when it is a constructor', () => {
    const MiddlewareConstructor = class {}

    // @ts-expect-error - Accessing private method for testing purposes
    router.makePipelineOptions().resolver(MiddlewareConstructor)

    expect(containerMock.resolve).toHaveBeenCalledWith(MiddlewareConstructor, true)
  })

  it('should resolve middleware from the container if it exists', () => {
    const MiddlewareConstructor = 'middleware'

    // @ts-expect-error - Accessing private method for testing purposes
    router.makePipelineOptions().resolver(MiddlewareConstructor)

    expect(containerMock.resolve).toHaveBeenCalledWith(MiddlewareConstructor, true)
  })
})
