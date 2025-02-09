import { MetaPipe } from '@stone-js/pipeline'
import { uriConstraints } from '../src/utils'
import { methodMatcher } from '../src/matchers'
import { RouteOptions, Route } from '../src/Route'
import { OutgoingResponse } from '@stone-js/core'
import { RouterError } from '../src/errors/RouterError'
import { RouteNotFoundError } from '../src/errors/RouteNotFoundError'

/* eslint-disable @typescript-eslint/no-extraneous-class */

// Mock dependencies
vi.mock('../src/utils', () => ({
  uriRegex: vi.fn(() => /\/user-(\d+)\/?(\w+)?/),
  uriConstraints: vi.fn(() => [{ param: 'id', prefix: 'user-' }, { param: 'name', optional: true }])
}))

vi.mock('../src/matchers', () => ({
  methodMatcher: vi.fn(() => true)
}))

// Utility for creating a mock RouteOptions object
const createRouteOptions = (overrides = {}): RouteOptions => ({
  path: '/test',
  method: 'GET',
  handler: vi.fn(),
  customOptions: 'test',
  excludeMiddleware: ['middleware1', 'middleware2'],
  ...overrides
})

describe('Route Class', () => {
  let route: Route
  let routeOptions: RouteOptions

  beforeEach(() => {
    routeOptions = createRouteOptions()
    route = Route.create(routeOptions)
    // @ts-expect-error - Testing private property
    route.uriConstraints = [{ param: 'id', prefix: 'user-' }, { param: 'name', optional: true }]
  })

  describe('constructor', () => {
    it('should initialize a Route instance with valid options', () => {
      expect(route).toBeInstanceOf(Route)
      expect(route.options).toBe(routeOptions)
      expect(uriConstraints).toHaveBeenCalledWith(routeOptions)
    })

    it('should throw a RouterError if options are undefined', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => new Route(undefined)).toThrow(RouterError)
    })
  })

  describe('getters', () => {
    it('should return params when event is bound', () => {
      // @ts-expect-error - Testing private property
      route.routeParams = { test: 'value' }
      expect(route.params).toEqual({ test: 'value' })
    })

    it('should throw a RouterError when accessing params if event is not bound', () => {
      expect(() => route.params).toThrow(RouterError)
    })

    it('should return default URL components when eventUrl is not set', () => {
      expect(route.url.href).toBe('http://localhost/')
      expect(route.uri).toBe('http://localhost/')
      expect(route.query).toEqual({})
      expect(route.path).toBe('/')
      expect(route.hash).toBe('')
    })

    it('should return options method', () => {
      expect(route.method).toBe(routeOptions.method)
    })

    it('should return default protocol if not defined', () => {
      expect(route.protocol).toBe('http')
    })

    it('should return domain from URL', () => {
      // @ts-expect-error - Testing private property
      route.eventUrl = new URL('http://example.com')
      expect(route.domain).toBe('example.com')
    })
  })

  describe('Parameters', () => {
    it('test parameters methods', () => {
      // @ts-expect-error - Testing private property
      route.routeParams = { test: 'value', name: 'john' }

      expect(route.hasParams()).toBe(true)
      expect(route.hasParam('test')).toBe(true)
      expect(route.getParam('test')).toBe('value')
      expect(route.hasParam('missing')).toBe(false)
      expect(route.getParam('missing')).toBeUndefined()
      expect(route.isParamNameOptional('name')).toBe(true)
      expect(route.isParamNameOptional('test')).toBe(false)
      expect(route.getParamNames()).toEqual(['test', 'name'])
      expect(route.getOptionalParamNames()).toEqual(['name'])
      expect(route.getDefinedParams()).toEqual({ test: 'value', name: 'john' })
    })
  })

  describe('Getters and issers', () => {
    it('test options getters and issers', () => {
      expect(route.getOption('path')).toBe('/test')
      expect(route.getOption('domain', 'sub')).toBe('sub')
      expect(route.getOption('customOptions')).toBe('test')
      expect(route.isHttpsOnly()).toBe(false)
      expect(route.isFallback()).toBe(false)
      expect(route.isHttpOnly()).toBe(true)
      expect(route.isSecure()).toBe(false)
      expect(route.isStrict()).toBe(false)
    })
  })

  describe('isMiddlewareExcluded', () => {
    it('should return true if the middleware is in the excludeMiddleware list', () => {
      expect(route.isMiddlewareExcluded('middleware1')).toBe(true)
      expect(route.isMiddlewareExcluded('middleware2')).toBe(true)
    })

    it('should return false if the middleware is not in the excludeMiddleware list', () => {
      route.addMiddleware('middleware4')
      expect(route.isMiddlewareExcluded('middleware3')).toBe(false)
      expect(route.isMiddlewareExcluded('middleware4')).toBe(false)
    })

    it('should handle MetaPipe with `pipe` defined', () => {
      const metaMiddleware: MetaPipe = { pipe: 'middleware1' }
      expect(route.isMiddlewareExcluded(metaMiddleware)).toBe(true)
    })

    it('should return false if excludeMiddleware option is undefined', () => {
      const route = Route.create({ path: '/test', method: 'GET', handler: vi.fn() })
      expect(route.isMiddlewareExcluded('middleware1')).toBe(false)
    })
  })

  describe('Setters and getters', () => {
    it('should test setters', () => {
      route
        .setDispatchers({ callable: vi.fn(), handler: vi.fn() })
      // @ts-expect-error - Testing private property
      expect(route.dispatchers).toEqual({ callable: expect.any(Function), controller: expect.any(Function) })
      // @ts-expect-error - Testing private property
      expect(route.container).toEqual(expect.any(Function))
      // @ts-expect-error - Testing private property
      expect(route.outgoingResponseResolver).toEqual(expect.any(Function))
    })

    it('should test getters', () => {
      class Test {
        get = vi.fn()
      }

      const localRoute = Route.create(createRouteOptions({ name: 'test', domain: 'example.com', action: { get: Test } }))
      const expected = { path: '/test', method: 'GET', action: 'Test@get', name: 'test', domain: 'example.com', fallback: false }
      expect(localRoute.toJSON()).toEqual(expected)
      expect(localRoute.toString()).toEqual(JSON.stringify(expected))

      const localRoute2 = Route.create(createRouteOptions({ action: vi.fn(), fallback: true }))
      const expected2 = { path: '/test', method: 'GET', action: 'callable', name: 'N/A', domain: 'N/A', fallback: true }
      expect(localRoute2.toJSON()).toEqual(expected2)
      expect(localRoute2.toString()).toEqual(JSON.stringify(expected2))
    })
  })

  describe('matches', () => {
    it('should return true when all matchers pass', () => {
      const mockMatcher = vi.fn(() => true)
      route.setMatchers([mockMatcher])
      expect(route.matches({} as any, true)).toBe(true)
      expect(mockMatcher).toHaveBeenCalled()
    })

    it('should return false when any matcher fails', () => {
      const mockMatcher1 = vi.fn(() => true)
      const mockMatcher2 = vi.fn(() => false)
      const mockMatcher3 = vi.fn(() => true)
      route.setMatchers([mockMatcher1, mockMatcher2, mockMatcher3])
      expect(route.matches({} as any, true)).toBe(false)
      expect(mockMatcher1).toHaveBeenCalled()
      expect(mockMatcher2).toHaveBeenCalled()
      expect(mockMatcher3).not.toHaveBeenCalled()
    })

    it('should skip method matcher if includingMethod is false', () => {
      const mockMethodMatcher = vi.fn(() => true)
      route.setMatchers([methodMatcher, mockMethodMatcher])
      expect(route.matches({} as any, false)).toBe(true)
      expect(methodMatcher).not.toHaveBeenCalled()
    })
  })

  describe('generate', () => {
    it('should generate a valid URL based on constraints', () => {
      const result = route.generate({ params: { id: '123' }, hash: 'test' })
      expect(result).toBe('/user-123/#test')
    })

    it('should include query parameters in the generated URL', () => {
      const result = route.generate({ params: { id: '123' }, query: { search: 'test' }, hash: '#test' })
      expect(result).toBe('/user-123/?search=test#test')
    })

    it('should generate a valid URL with domain based on constraints', () => {
      // @ts-expect-error - Testing private property
      route.uriConstraints = [{ suffix: 'example.com' }, { match: 'user' }, { param: 'id', prefix: 'user-' }]
      const result = route.generate({ params: { id: '123' }, withDomain: true })
      expect(result).toBe('http://example.com/user/user-123/')
    })

    it('should throw an error if required parameters are missing', () => {
      expect(() => route.generate({})).toThrow(RouterError)
    })
  })

  describe('bind', () => {
    it('should bind event parameters and query', async () => {
      const mockEvent = {
        url: new URL('http://example.com/user-12344?search=test'),
        query: new Map([['search', 'test']]),
        getUri: vi.fn(() => '/user-12344')
      }

      await route.bind(mockEvent as any)

      expect(route.params).toEqual({ id: 12344 })
      expect(route.query).toEqual({ search: 'test' })
      expect(route.url.href).toBe('http://example.com/user-12344?search=test')
    })

    it('should bind event parameters with binding resolver as class and query', async () => {
      const mockEvent = {
        url: new URL('http://example.com/user-12344?search=test'),
        query: new Map([['search', 'test']]),
        getUri: vi.fn(() => '/user-12344')
      }
      const bindingResolver = vi.fn((key, value) => ({ username: 'john', [key]: value }))
      class User {
        static resolveRouteBinding = bindingResolver
      }
      routeOptions.bindings = { id: User }

      await route.bind(mockEvent as any)

      expect(bindingResolver).toHaveBeenCalled()
      expect(route.query).toEqual({ search: 'test' })
      expect(route.params.id).toEqual({ username: 'john', id: 12344 })
      expect(route.url.href).toBe('http://example.com/user-12344?search=test')
    })

    it('should throw RouteNotFoundError if no value is returned by the resolver', async () => {
      const mockEvent = {
        url: new URL('http://example.com/user-12344?search=test'),
        query: new Map([['search', 'test']]),
        getUri: vi.fn(() => '/user-12344')
      }

      const bindingResolver = vi.fn(() => undefined)

      routeOptions.bindings = { id: bindingResolver }

      await expect(route.bind(mockEvent as any)).rejects.toThrow(RouteNotFoundError)
    })

    it('should throw RouterError when the resolver is not a function', async () => {
      const mockEvent = {
        url: new URL('http://example.com/user-12344?search=test'),
        query: new Map([['search', 'test']]),
        getUri: vi.fn(() => '/user-12344')
      }

      // @ts-expect-error - Testing invalid input
      routeOptions.bindings = { id: 'bindingResolver' }

      await expect(route.bind(mockEvent as any)).rejects.toThrow(RouterError)
    })

    it('should throw RouterError if event lacks getUri method', async () => {
      const mockEvent = {
        url: new URL('http://example.com')
      }

      await expect(route.bind(mockEvent as any)).rejects.toThrow(RouterError)
    })
  })

  describe('run', () => {
    it('should run callable action', async () => {
      const mockEvent = {}
      routeOptions.handler = vi.fn(async () => OutgoingResponse.create({ content: 'response' }))
      const callable = vi.fn(({ callable }) => callable())

      route.setDispatchers({
        callable,
        controller: vi.fn()
      })

      const result = await route.run(mockEvent as any)

      expect(result.content).toBe('response')
      expect(callable).toHaveBeenCalled()
      expect(routeOptions.handler).toHaveBeenCalled()
    })

    it('should run callable action with response resolver', async () => {
      const mockEvent = {}
      routeOptions.handler = vi.fn(async () => 'response')
      const callable = vi.fn(({ callable }) => callable())

      route.setDispatchers({
        callable,
        controller: vi.fn()
      })
        .setOutgoingResponseResolver(vi.fn((options) => options))

      const result = await route.run(mockEvent as any)

      expect(result.content).toBe('response')
      expect(callable).toHaveBeenCalled()
      expect(routeOptions.handler).toHaveBeenCalled()
    })

    it('should run component action with response resolver', async () => {
      const mockEvent = {}
      // @ts-expect-error - Testing invalid input
      routeOptions.handler = undefined
      routeOptions.component = { default: vi.fn() }
      const callable = vi.fn(({ callable }) => callable())

      route.setDispatchers({
        callable,
        controller: vi.fn()
      })
        .setOutgoingResponseResolver(vi.fn((options) => options))

      const result = await route.run(mockEvent as any)

      expect(result.content).toBeUndefined()
    })

    it('should run controller action', async () => {
      const mockEvent = {}
      class TestController {
        get = vi.fn(async () => 'response')
      }
      routeOptions.handler = { get: TestController }
      const controller = vi.fn(({ controller, handler }) => controller[handler]())

      route
        .setDispatchers({
          controller,
          callable: vi.fn()
        })
        .setOutgoingResponseResolver(vi.fn((options) => options))

      const result = await route.run(mockEvent as any)

      expect(result.content).toBe('response')
      expect(controller).toHaveBeenCalled()
    })

    it('should run controller action resolved with the container', async () => {
      const mockEvent = {}
      class TestController {
        get = vi.fn(async () => OutgoingResponse.create({ content: 'response' }))
      }
      const container = {
        resolve: vi.fn(() => new TestController())
      } as unknown as IContainer
      routeOptions.handler = { get: TestController }
      const controller = vi.fn(({ controller, handler }) => controller[handler]())

      route
        .setContainer(container)
        .setDispatchers({
          controller,
          callable: vi.fn()
        })

      const result = await route.run(mockEvent as any)

      expect(result.content).toBe('response')
      expect(controller).toHaveBeenCalled()
      expect(container.resolve).toHaveBeenCalledWith(TestController)
    })

    it('should run redirection action with redirect as string', async () => {
      const mockEvent = {}
      routeOptions.redirect = '/redirect'
      const resolver = vi.fn((params) => params)

      route.setOutgoingResponseResolver(resolver)

      const result = await route.run(mockEvent as any)

      expect(resolver).toHaveBeenCalled()
      expect(result).toEqual({ status: 302, statusCode: 302, headers: { Location: '/redirect' } })
    })

    it('should run redirection action with redirect as object', async () => {
      const mockEvent = {}
      routeOptions.redirect = { status: 301, location: '/redirect' }
      const resolver = vi.fn((params) => params)

      route.setOutgoingResponseResolver(resolver)

      const result = await route.run(mockEvent as any)

      expect(resolver).toHaveBeenCalled()
      expect(result).toEqual({ status: 301, statusCode: 301, headers: { Location: '/redirect' } })
    })

    it('should run redirection action with redirect as object', async () => {
      const mockEvent = {}
      routeOptions.redirect = () => ({ status: 301, location: '/redirect' })
      const resolver = vi.fn((params) => params)

      route.setOutgoingResponseResolver(resolver)

      const result = await route.run(mockEvent as any)

      expect(resolver).toHaveBeenCalled()
      expect(result).toEqual({ status: 301, statusCode: 301, headers: { Location: '/redirect' } })
    })

    it('should throw an error for invalid outgoingResponseResolver', async () => {
      routeOptions.redirect = '/redirect'

      await expect(route.run({} as any)).rejects.toThrow(RouterError)
    })

    it('should throw an error for invalid dispatcher', async () => {
      routeOptions.handler = vi.fn(async () => 'response')

      await expect(route.run({} as any)).rejects.toThrow(RouterError)
    })

    it('should throw an error for invalid actions', async () => {
      routeOptions.handler = 'invalid-action' as any

      await expect(route.run({} as any)).rejects.toThrow(RouterError)
    })
  })
})
