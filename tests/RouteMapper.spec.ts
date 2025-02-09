import { Route } from '../src/Route'
import { GET, POST, PUT } from '../src/constants'
import { DependencyResolver, RouteDefinition } from '../src/declarations'
import { RouterError } from '../src/errors/RouterError'
import { RouteMapperOptions, RouteMapper } from '../src/RouteMapper'

// Mocking Route class
vi.mock('../src/Route', () => ({
  Route: {
    create: vi.fn().mockReturnThis(),
    setOutgoingResponseResolver: vi.fn().mockReturnThis(),
    setDispatchers: vi.fn().mockReturnThis(),
    setMatchers: vi.fn().mockReturnThis(),
    setContainer: vi.fn().mockReturnThis()
  }
}))

// User controller class
class UserController {
  public index = vi.fn()
  public show = vi.fn()
}

describe('RouteMapper', () => {
  let parent: RouteDefinition
  let children: RouteDefinition[]
  let options: RouteMapperOptions
  let mockContainer: DependencyResolver

  beforeEach(() => {
    parent = {
      children,
      name: 'users',
      path: '/users',
      defaults: { id: 12 },
      rules: { id: /^\d+$/ },
      throttle: ['throttle'],
      handler: UserController,
      bindings: { id: vi.fn() },
      middleware: ['middleware'],
      domain: '{domain}.example.com',
      excludeMiddleware: ['middleware']
    }

    children = [{
      name: 'get',
      path: '/:id',
      children: [{
        name: 'profile',
        path: '/profile',
        children: [{
          name: 'get',
          method: GET,
          path: '/:profileId',
          handler: 'get',
          redirect: '/users',
          alias: []
        }, {
          name: 'post',
          method: POST,
          path: '/:profileId',
          handler: 'save',
          redirect: '/users',
          alias: []
        }]
      }]
    }, {
      name: 'put',
      path: '/:id',
      method: PUT,
      redirect: '/users',
      handler: 'edit'
    }, {
      path: '/',
      method: GET,
      fallback: true,
      handler: 'fallback'
    }]

    options = {
      prefix: '/api',
      strict: false,
      maxDepth: 3,
      matchers: [],
      rules: {},
      defaults: {},
      bindings: {},
      dispatchers: {} as any,
      responseResolver: vi.fn()
    }

    mockContainer = {
      resolve: vi.fn()
    } as unknown as DependencyResolver
  })

  it('should create an instance of RouteMapper', () => {
    const mapper = new RouteMapper(options, mockContainer)
    expect(mapper).toBeInstanceOf(RouteMapper)
  })

  it('should throw an error if maxDepth is not positive', () => {
    options.maxDepth = 0
    expect(() => new RouteMapper(options)).toThrow(RouterError)
  })

  it('should map route definitions to Route instances', () => {
    options.maxDepth = 4
    const routes = RouteMapper.create(options, mockContainer).toRoutes([parent])

    expect(routes).toHaveLength(4)
    expect(Route.create).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      action: expect.any(Object),
      name: 'users.get.profile.get',
      path: '/api/users/:id/profile/:profileId'
    }))
    expect(Route.create).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      action: expect.any(Object),
      name: 'users.get.profile.post',
      path: '/api/users/:id/profile/:profileId'
    }))
    expect(Route.create).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PUT',
      name: 'users.put',
      path: '/api/users/:id',
      action: expect.any(Object)
    }))
    expect(Route.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'users',
      method: 'GET',
      path: '/api/users/',
      action: expect.any(Object)
    }))
  })

  it('should map route definitions to Route instances and take the child action', () => {
    const definitions: RouteDefinition[] = [
      {
        path: '/users',
        method: 'GET',
        handler: {},
        pageLayout: 'UserLayout',
        children: [
          {
            path: '/profile',
            method: 'POST',
            handler: vi.fn(),
            customOptions: 'Profile'
          }
        ]
      }
    ]

    const mapper = RouteMapper.create(options, mockContainer)
    const routes = mapper.toRoutes(definitions)
    const expectedObject = { path: '/api/users/profile', method: 'POST', action: expect.any(Function), pageLayout: 'UserLayout', customOptions: 'Profile' }

    expect(routes).toHaveLength(1)
    expect(Route.create).toHaveBeenCalledWith(expect.objectContaining(expectedObject))
  })

  it('should throw an error if maxDepth is exceeded', () => {
    expect(() => {
      options.maxDepth = 2
      RouteMapper.create(options, mockContainer).toRoutes([parent])
    }).toThrow(RouterError)
  })

  it('should validate route options successfully', () => {
    const routeOption = {
      path: '/test',
      method: 'GET',
      action: vi.fn()
    }

    const mapper = new RouteMapper(options)

    // @ts-expect-error Accessing private method for testing
    const validatedOption = mapper.toRouteOptions(routeOption)

    expect(validatedOption).toMatchObject({
      path: '/api/test',
      method: 'GET'
    })
  })

  it('should throw an error if path is missing in route options', () => {
    const routeOption = {
      method: 'GET',
      action: vi.fn()
    }

    const mapper = new RouteMapper(options)

    expect(() => {
      // @ts-expect-error Accessing private method for testing
      mapper.toRouteOptions(routeOption)
    }).toThrow(RouterError)
  })

  it('should throw an error if method is invalid', () => {
    const routeOption = {
      path: '/test',
      method: 'INVALID_METHOD',
      action: vi.fn()
    }

    const mapper = new RouteMapper(options)

    expect(() => {
      // @ts-expect-error Accessing private method for testing
      mapper.toRouteOptions(routeOption)
    }).toThrow(RouterError)
  })

  it('should throw an error if action is missing in route options', () => {
    const routeOption = {
      path: '/test',
      method: 'GET'
    }

    const mapper = new RouteMapper(options)

    expect(() => {
      // @ts-expect-error Accessing private method for testing
      mapper.toRouteOptions(routeOption)
    }).toThrow(RouterError)
  })
})
