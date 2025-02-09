import { Route } from '../src/Route'
import { RouterError } from '../src/errors/RouterError'
import { RouteCollection } from '../src/RouteCollection'
import { RouteNotFoundError } from '../src/errors/RouteNotFoundError'
import { MethodNotAllowedError } from '../src/errors/MethodNotAllowedError'

vi.mock('../src/Route', () => ({
  Route: {
    create: vi.fn((options) => ({
      ...options,
      matches: vi.fn(() => false),
      getOption: vi.fn((key) => options[key]),
      toJSON: vi.fn(() => options)
    }))
  }
}))

describe('RouteCollection', () => {
  let routeCollection: RouteCollection

  beforeEach(() => {
    routeCollection = RouteCollection.create()
  })

  it('should initialize with an empty collection when no routes are provided', () => {
    expect(routeCollection.size).toBe(0)
    expect(routeCollection.getRoutes()).toEqual([])
  })

  it('should initialize with provided routes', () => {
    const routes = [
      Route.create({ path: '/test', method: 'GET', handler: vi.fn() }),
      Route.create({ path: '/example', method: 'POST', handler: vi.fn() })
    ]

    const collection = new RouteCollection(routes)

    expect(collection.size).toBe(2)
    expect(collection.getRoutes()).toEqual(routes)
  })

  it('should add a route to the collection', () => {
    const route = Route.create({ path: '/test', method: 'GET', handler: vi.fn() })

    routeCollection.add(route)

    expect(routeCollection.size).toBe(1)
    expect(routeCollection.getRoutes()).toContain(route)
  })

  it('should retrieve routes by method', () => {
    const route1 = Route.create({ path: '/test', method: 'GET', handler: vi.fn() })
    const route2 = Route.create({ path: '/example', method: 'POST', handler: vi.fn() })

    routeCollection.add(route1).add(route2)

    expect(routeCollection.getRoutesByMethod('PUT')).toEqual([])
    expect(routeCollection.getRoutesByMethod('GET')).toEqual([route1])
    expect(routeCollection.getRoutesByMethod('POST')).toEqual([route2])
  })

  it('should match a route based on event and method', () => {
    const route = Route.create({ path: '/test', method: 'GET', handler: vi.fn() })
    route.matches = vi.fn(() => true)

    routeCollection.add(route)

    const matchedRoute = routeCollection.match({ method: 'GET', pathname: '/test' } as any)

    expect(matchedRoute).toBe(route)
  })

  it('should throw RouteNotFoundError if no route matches the event', () => {
    expect(() =>
      routeCollection.match({ method: 'GET', pathname: '/not-found' } as any)
    ).toThrowError(RouteNotFoundError)
  })

  it('should return options response if a route exists but the method is OPTIONS', async () => {
    const route = Route.create({ path: '/test', method: 'POST', handler: vi.fn() })
    const resolver = vi.fn((params) => params)

    route.matches = vi.fn((a, b) => b === false)

    routeCollection.add(route).setOutgoingResponseResolver(resolver)

    const matchedRoute = routeCollection.match({ method: 'GET', pathname: '/test', isMethod: vi.fn(() => true) } as any)
    const action = matchedRoute.getOption<() => Promise<any>>('action', vi.fn())

    await action()

    expect(action).toEqual(expect.any(Function))
    expect(matchedRoute).toMatchObject({ path: '/test', method: 'OPTIONS', action: expect.any(Function) })
    expect(resolver).toHaveBeenCalledWith({ statusCode: 200, statusText: '', content: { Allow: 'POST' } })
  })

  it('should throw RouterError if resolver is undefined and a route exists but the method is OPTIONS', async () => {
    const route = Route.create({ path: '/test', method: 'POST', handler: vi.fn() })

    route.matches = vi.fn((a, b) => b === false)

    routeCollection.add(route)

    const matchedRoute = routeCollection.match({ method: 'GET', pathname: '/test', isMethod: vi.fn(() => true) } as any)
    const action = matchedRoute.getOption<() => Promise<any>>('action', vi.fn())

    expect(action).toEqual(expect.any(Function))
    expect(matchedRoute).toMatchObject({ path: '/test', method: 'OPTIONS', action: expect.any(Function) })
    await expect(async () => await action()).rejects.toThrowError(RouterError)
  })

  it('should throw MethodNotAllowedError if a route exists but the method is not allowed', () => {
    const route = Route.create({ path: '/test', method: 'POST', handler: vi.fn() })
    route.matches = vi.fn(() => true)

    routeCollection.add(route)

    expect(() =>
      routeCollection.match({ method: 'GET', pathname: '/test' } as any)
    ).toThrowError(MethodNotAllowedError)
  })

  it('should check if a named route exists and retrieve it by name', () => {
    const route = Route.create({ path: '/test', method: 'GET', name: 'testRoute', handler: vi.fn() })

    routeCollection.add(route)

    expect(routeCollection.hasNamedRoute('testRoute')).toBe(true)
    expect(routeCollection.getByName('testRoute')).toBe(route)
  })

  it('should return undefined for a non-existing named route', () => {
    expect(routeCollection.getByName('nonExistentRoute')).toBeUndefined()
  })

  it('should dump all routes as JSON objects', () => {
    const route1 = Route.create({ path: '/test', method: 'GET', handler: vi.fn() })
    const route2 = Route.create({ path: '/example', method: 'POST', handler: vi.fn() })
    const route3 = Route.create({ path: '/test', method: 'HEAD', handler: vi.fn(), isInternalHeader: true })

    routeCollection.add(route1).add(route2).add(route3)

    const dumpedRoutes = routeCollection.dump()

    expect(dumpedRoutes).toHaveLength(2)
    expect(dumpedRoutes[2]).toBeUndefined()
    expect(dumpedRoutes[1]).toMatchObject({ path: '/test', method: 'GET' })
    expect(route3.getOption).toHaveBeenCalledWith('isInternalHeader', false)
    expect(dumpedRoutes[0]).toMatchObject({ path: '/example', method: 'POST' })
  })

  it('should set the outgoing response resolver', () => {
    const resolver = vi.fn()
    routeCollection.setOutgoingResponseResolver(resolver)

    // @ts-expect-error - Accessing private method for testing purposes
    expect(routeCollection.outgoingResponseResolver).toBe(resolver)
  })

  it('should convert all routes to a JSON string', () => {
    const route1 = Route.create({ path: '/test', method: 'GET', handler: vi.fn() })
    const route2 = Route.create({ path: '/example', method: 'POST', handler: vi.fn() })

    routeCollection.add(route1).add(route2)

    const jsonString = routeCollection.toString()

    expect(jsonString).toBe(JSON.stringify(routeCollection.dump()))
  })

  it('should iterate over all routes', () => {
    const route1 = Route.create({ path: '/test', method: 'GET', handler: vi.fn() })
    const route2 = Route.create({ path: '/example', method: 'POST', handler: vi.fn() })

    routeCollection.add(route1).add(route2)

    const routes = [...routeCollection]

    expect(routes).toHaveLength(2)
    expect(routes).toContain(route1)
    expect(routes).toContain(route2)
  })
})
