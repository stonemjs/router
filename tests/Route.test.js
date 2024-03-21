import { HEAD } from '@stone-js/common'
import { Route } from '../src/Route.mjs'
import { GET, POST } from '../src/enums/http-methods.mjs'
import { UriMatcher } from '../src/matchers/UriMatcher.mjs'
import { RouteDefinition } from '../src/RouteDefinition.mjs'
import { HostMatcher } from '../src/matchers/HostMatcher.mjs'
import { MethodMatcher } from '../src/matchers/MethodMatcher.mjs'
import { ProtocolMatcher } from '../src/matchers/ProtocolMatcher.mjs'
import { CallableDispatcher } from '../src/dispatchers/CallableDispatcher.mjs'
import { ComponentDispatcher } from '../src/dispatchers/ComponentDispatcher.mjs'
import { ControllerDispatcher } from '../src/dispatchers/ControllerDispatcher.mjs'

const Controller = class {
  getUsers () {
    return 'Get users'
  }
}

const Container = class {
  make (Class) {
    return new Class()
  }
}

const Middleware = class {}

const matchers = [
  new HostMatcher(),
  new MethodMatcher(),
  new ProtocolMatcher(),
  new UriMatcher()
]

const dispatchers = {
  callable: CallableDispatcher,
  component: ComponentDispatcher,
  controller: ControllerDispatcher
}

describe('#Route', () => {
  describe('#create', () => {
    it('Must throw an exception when creating new route with a non RouteDefinition class', () => {
      try {
        // Act
        Route.create({ path: '/users' })
      } catch (error) {
        // Assert
        expect(error.message).toBe("This method's parameter must be an instance of `RouteDefinition`")
      }
    })
  })

  describe('#getters', () => {
    it('Getters must return the right values', () => {
      // Arrange
      const definition = new RouteDefinition({
        path: '/users/:id',
        method: GET,
        protocol: 'http',
        name: 'users.get',
        domain: 'http://{subdomain}.example.com',
        action: { getUsers: Controller },
        isFallback: false,
        middleware: [Middleware],
        excludeMiddleware: [Middleware]

      })
      const route = new Route(definition)
      route.setRouter(null)
      route.setContainer(null)
      route.setMatchers([])
      route.setDispatchers({ callable: null })
      route.addDispatcher('controller', null)
      route.addDefault('id', 1000)
      route.addDefaults({ username: 'Doe' })
      route.addRule('id', /\d+/)
      route.addRules({ name: /.+/ })
      try {
        route.addDispatcher('class', null)
      } catch (error) {
        expect(error.message).toBe("Invalid dispatcher type class. Valid types are 'component', 'callable' and 'controller'")
      }

      // Action
      // Assert
      expect(route.uri).toBe('{subdomain}.example.com/users/:id')
      expect(route.path).toBe('/users/:id')
      expect(route.domain).toBe('{subdomain}.example.com')
      expect(route.methods).toEqual([GET, HEAD])
      expect(route.action).toEqual({ getUsers: Controller })
      expect(route.name).toBe('users.get')
      expect(route.rules).toEqual({ id: /\d+/, name: /.+/ })
      expect(route.defaults).toEqual({ id: 1000, username: 'Doe' })
      expect(route.protocol).toBe('http')
      expect(route.isFallback).toBe(false)
      expect(route.middleware).toEqual([Middleware])
      expect(route.excludeMiddleware).toEqual([Middleware])
      expect(route.get('link')).toBe(null)
      expect(route.getDefault('id')).toBe(1000)
      expect(route.getDefault('username')).toBe('Doe')
      expect(route.getDefault('name')).toBe(null)
      expect(route.getRule('id')).toEqual(/\d+/)
      expect(route.getRule('name')).toEqual(/.+/)
      expect(route.getRule('username')).toEqual('[^/]+?')
      expect(route.hasDomain()).toBe(true)
      expect(route.isSecure()).toBe(false)
      expect(route.isHttpOnly()).toBe(true)
      expect(route.getActionType()).toBe('Controller')
      expect(route.isHttpsOnly()).toBe(false)
      expect(route.isCallableAction()).toBe(false)
      try {
        route.getComponent()
      } catch (error) {
        expect(error.message).toBe('Component action must be called only on browser context.')
      }
      try {
        route.getCallable()
      } catch (error) {
        expect(error.message).toBe('Callable action must be a function')
      }
      expect(route.isControllerAction()).toBe(true)
      expect(route.getController()).toBeTruthy()
      expect(route.getController().getUsers()).toEqual('Get users')
      expect(route.getControllerMethod()).toBe('getUsers')
      expect(route.getControllerActionFullname()).toBe('Controller@getUsers')
      expect(route.getRouter()).toBe(null)
      expect(route.hasMatchers()).toBe(false)
      expect(route.getMatchers()).toEqual([])
      expect(route.getDispatchers()).toEqual({ callable: null, controller: null })
      expect(route.getDispatcher('controller')).toBe(null)
      expect(route.hasDispatcher('controller')).toBe(false)
      expect(route.toString()).toBe('{"name":"users.get","path":"/users/:id","methods":["GET","HEAD"],"action":"Controller@getUsers","domain":"{subdomain}.example.com","fallback":false}')
    })
  })

  describe('#matches', () => {
    it('The request must match the route', () => {
      // Arrange
      const route = new Route(new RouteDefinition({ path: '/users/:id(\\d+)/profile/:name(.+)/comments/:commId(\\d+)?', method: GET }))
      const requiredRoute1 = new Route(new RouteDefinition({ path: '/users/:id(\\d+)+', method: GET }))
      const optionalRoute1 = new Route(new RouteDefinition({ path: '/users/:id(\\d+)*', method: GET }))
      const requiredRoute2 = new Route(new RouteDefinition({ path: '/users/user-:id(\\d+)*', method: GET }))

      const request1 = { decodedPath: '/users/', method: GET, getUri () { return this.decodedPath } }
      const request2 = { decodedPath: '/users/12/13/14/15', method: GET, getUri () { return this.decodedPath } }
      const request3 = { decodedPath: '/users/12/profile/stone/comments', method: GET, getUri () { return this.decodedPath } }
      const request4 = { decodedPath: '/users/12/profile/stone/comments/33', method: POST, getUri () { return this.decodedPath } }
      const request5 = { decodedPath: '/users/12/profile/stone/comments/44/deee', method: GET, getUri () { return this.decodedPath } }
      const request6 = { decodedPath: '/users/user-', method: GET, getUri () { return this.decodedPath } }
      const request7 = { decodedPath: '/users/user-12/13/14/15', method: GET, getUri () { return this.decodedPath } }

      route.setMatchers(matchers)
      requiredRoute1.setMatchers(matchers)
      optionalRoute1.setMatchers(matchers)
      requiredRoute2.setMatchers(matchers)

      // Assert
      expect(route.matches(request3)).toBe(true)
      expect(route.matches(request4)).toBe(false)
      expect(route.matches(request4, false)).toBe(true)
      expect(route.matches(request5)).toBe(false)

      expect(requiredRoute1.matches(request1)).toBe(false)
      expect(requiredRoute1.matches(request2)).toBe(true)

      expect(optionalRoute1.matches(request1)).toBe(true)
      expect(optionalRoute1.matches(request2)).toBe(true)

      expect(requiredRoute2.matches(request6)).toBe(true)
      expect(requiredRoute2.matches(request7)).toBe(true)
    })
  })

  describe('#getController && #getControllerMethod', () => {
    it('Must throw an exception when controller is not a class', async () => {
      // Arrange
      const route = new Route(new RouteDefinition({ path: '/users/:id(\\d+)', method: GET, action: { getUsers: () => 'Users' } }))

      try {
        // Act
        route.getController()
      } catch (error) {
        // Assert
        expect(error.message).toBe('The controller must be a class')
      }

      try {
        // Act
        route.getControllerMethod()
      } catch (error) {
        // Assert
        expect(error.message).toBe("The controller action must be a string, representing the controller's method.")
      }
    })
  })

  describe('#run', () => {
    it('Must throw an exception when an invalid action is provided', async () => {
      // Arrange
      const route = new Route(new RouteDefinition({ path: '/users/:id(\\d+)', method: GET, action: 'User action' }))
      const request = { decodedPath: '/users/12', method: GET, getUri () { return this.decodedPath } }

      await route.bind(request)

      try {
        // Act
        route.run(request)
      } catch (error) {
        // Assert
        expect(error.message).toBe('Invalid action provided.')
      }
    })

    it('Must throw an exception when there is no callable dispatcher', async () => {
      // Arrange
      const route = new Route(new RouteDefinition({ path: '/users/:id(\\d+)', method: GET, action: () => 'Get users' }))
      const request = { decodedPath: '/users/12', method: GET, getUri () { return this.decodedPath } }

      await route.bind(request)

      try {
        // Act
        route.run(request)
      } catch (error) {
        // Assert
        expect(error.message).toBe('No callable dispatcher provided')
      }
    })

    it('Must run callable route action', async () => {
      // Arrange
      const route = new Route(new RouteDefinition({ path: '/users/:id(\\d+)', method: GET, action: () => 'Get users' }))
      const request = { decodedPath: '/users/12', method: GET, getUri () { return this.decodedPath } }

      route.setDispatchers(dispatchers)

      await route.bind(request)

      // Act
      const response = route.run(request)

      // Assert
      expect(response).toBe('Get users')
    })

    it('Must throw an exception when there is no controller dispatcher', async () => {
      // Arrange
      const route = new Route(new RouteDefinition({ path: '/users/:id(\\d+)', method: GET, action: { getUsers: Controller } }))
      const request = { decodedPath: '/users/12', method: GET, getUri () { return this.decodedPath } }

      await route.bind(request)

      try {
        // Act
        route.run(request)
      } catch (error) {
        // Assert
        expect(error.message).toBe('No controller dispatcher provided')
      }
    })

    it('Must run controller route action', async () => {
      // Arrange
      const route = new Route(new RouteDefinition({ path: '/users/:id(\\d+)', method: GET, action: { getUsers: Controller } }))
      const request = { decodedPath: '/users/12', method: GET, getUri () { return this.decodedPath } }

      route.setDispatchers(dispatchers)
      route.setContainer(new Container())

      await route.bind(request)

      // Act
      const response = route.run(request)

      // Assert
      expect(response).toBe('Get users')
    })

    it('Must throw an exception when there is no component dispatcher', async () => {
      // Arrange
      const route = new Route(new RouteDefinition({ path: '/users/:id(\\d+)', method: GET, action: { getUsers: { template: '<h1>Get users</h1>' } } }))
      const request = { decodedPath: '/users/12', method: GET, getUri () { return this.decodedPath } }

      route._isBrowser = jest.fn(() => true)

      await route.bind(request)

      try {
        // Act
        route.run(request)
      } catch (error) {
        // Assert
        expect(error.message).toBe('No component dispatcher provided.')
      }
    })

    it('Must run component route action', async () => {
      // Arrange
      const route = new Route(new RouteDefinition({ path: '/users/:id(\\d+)', method: GET, action: { getUsers: { template: '<h1>Get users</h1>' } } }))
      const request = { decodedPath: '/users/12', method: GET, getUri () { return this.decodedPath } }

      route.setDispatchers(dispatchers)
      route.setContainer(new Container())
      route._isBrowser = jest.fn(() => true)

      await route.bind(request)

      // Act
      const response = route.run(request)

      // Assert
      expect(route.getActionType()).toBe('Component')
      expect(response.action).toEqual({ getUsers: { template: '<h1>Get users</h1>' } })
    })
  })

  describe('#generate', () => {
    it('Must generate route path with domain from route', () => {
      // Arrange
      const route = new Route(new RouteDefinition({
        domain: 'http://{domain@subDomain(.+?)}.example.com',
        path: '/users/:id(\\d+)/profile/:name(.+)/comments/:commId(\\d+)?',
        method: GET,
        defaults: { commId: 24 }
      }))

      // Act
      const path1 = route.generate()
      const path2 = route.generate({ domain: 'stone', id: 12, name: 'stone.js' })
      const path3 = route.generate({ domain: 'stone', id: 12, name: 'stone.js' }, {}, null, false)
      const path4 = route.generate({ domain: 'stone', id: 12, name: 'stone.js' }, { firstname: 'Doe' }, 'title')

      // Assert
      expect(path1).toBe('.example.com/users/null/profile/null/comments/24/')
      expect(path2).toBe('stone.example.com/users/12/profile/stone.js/comments/24/')
      expect(path3).toBe('/users/12/profile/stone.js/comments/24/')
      expect(path4).toBe('stone.example.com/users/12/profile/stone.js/comments/24/?firstname=Doe#title')
    })

    it('Must generate route path without domain from route', () => {
      // Arrange
      const route = new Route(new RouteDefinition({
        path: '/users/:id(\\d+)/profile/:name(.+)/comments/:commId(\\d+)?',
        method: GET,
        defaults: { commId: 24 }
      }))

      // Act
      const path1 = route.generate({ domain: 'stone', id: 12, name: 'stone.js' })

      // Assert
      expect(path1).toBe('/users/12/profile/stone.js/comments/24/')
      expect(route.uri).toBe('/users/:id(\\d+)/profile/:name(.+)/comments/:commId(\\d+)?')
    })
  })

  describe('#parameters', () => {
    it('Must throw an exception when request not bound to route', () => {
      // Arrange
      const definition = new RouteDefinition({
        path: '/users/:id(\\d+)/profile/:name(.+)/comments/:commId(\\d+)?',
        method: GET,
        action: { getUsers: Controller }
      })
      const route = new Route(definition)

      try {
        // Act
        route.parameters()
      } catch (error) {
        // Assert
        expect(error.message).toBe('Route is not bound')
      }
    })

    it('Must throw an exception when `getUri` is not present in the request', async () => {
      // Arrange
      const definition = new RouteDefinition({
        path: '/users/:id(\\d+)/profile/:name(.+)/comments/:commId(\\d+)?',
        method: GET,
        action: { getUsers: Controller }
      })
      const route = new Route(definition)

      try {
        // Act
        await route.bind({})
      } catch (error) {
        // Assert
        expect(error.message).toBe('Request must have a `getUri` method.')
      }
    })

    it('Must return null for all params when request not matches the route', async () => {
      // Arrange
      const definition = new RouteDefinition({
        path: '/users/:id(\\d+)/profile/:name(.+)/comments/:commId(\\d+)?',
        method: GET,
        action: { getUsers: Controller }
      })
      const route = new Route(definition)
      const request = { decodedPath: '/users/12/profile/stone/', method: GET, getUri () { return this.decodedPath } }

      // Act
      await route.bind(request)

      // Assert
      expect(route.parameters()).toEqual({ id: null, name: null, commId: null })
    })

    it('Must bind request to route and get request parameters', async () => {
      // Arrange
      const definition = new RouteDefinition({
        path: '/users/:id(\\d+)/profile/:name(.+)/comments/:commId(\\d+)?',
        method: GET,
        action: { getUsers: Controller },
        defaults: { name: null, commId: null }
      })
      const route = new Route(definition)
      const request = { decodedPath: '/users/12/profile/stone/comments', method: GET, getUri () { return this.decodedPath } }

      // Act
      await route.bind(request)

      route.setParameter('firstname', 'Doe')

      // Assert
      expect(route.hasParameters()).toBe(true)
      expect(route.hasParameter('id')).toBe(true)
      expect(route.hasParameter('username')).toBe(false)
      expect(route.parameter('id')).toBe(12)
      expect(route.parameter('ids')).toBe(null)
      expect(route.parameter('firstname')).toBe('Doe')
      expect(route.parameters()).toEqual({ id: 12, name: 'stone', commId: null, firstname: 'Doe' })
      expect(route.parametersWithoutNulls()).toEqual({ id: 12, name: 'stone', firstname: 'Doe' })
      expect(route.parameterNames()).toEqual(['id', 'name', 'commId', 'firstname'])
      expect(route.optionalParameterNames()).toEqual(['commId'])
      expect(route.isParameterNameOptional('id')).toBe(false)
      expect(route.isParameterNameOptional('commId')).toBe(true)

      route.deleteParameter('firstname')
      expect(route.parameter('firstname')).toBe(null)
    })
  })

  describe('#bindEntity', () => {
    it('Must throw an exception when binding value is not a class', async () => {
      // Arrange
      const definition = new RouteDefinition({
        path: '/users/:id(\\d+)',
        method: GET,
        action: { getUsers: Controller },
        bindings: { id: () => {} }
      })
      const route = new Route(definition)
      const request = { decodedPath: '/users/12/', method: GET, getUri () { return this.decodedPath } }

      try {
        // Act
        await route.bind(request)
      } catch (error) {
        // Assert
        expect(error.message).toBe('Binding must be a class.')
      }
    })

    it('Must throw an exception when class not contains resolveRouteBinding method', async () => {
      // Arrange
      const definition = new RouteDefinition({
        path: '/users/:id(\\d+)',
        method: GET,
        action: { getUsers: Controller },
        bindings: { id: class {} }
      })
      const route = new Route(definition)
      const request = { decodedPath: '/users/12/', method: GET, getUri () { return this.decodedPath } }

      try {
        // Act
        await route.bind(request)
      } catch (error) {
        // Assert
        expect(error.message).toBe('Binding must have this `resolveRouteBinding` as class or instance method.')
      }
    })

    it('Must return binding value when class contains static resolveRouteBinding method', async () => {
      // Arrange
      const User = class {
        static resolveRouteBinding (field, value, isOptional) {
          return Promise.resolve(`UserEntity-${field}-${value}-${isOptional}`)
        }
      }
      const definition = new RouteDefinition({
        path: '/users/:id@uuid(\\d+)',
        method: GET,
        action: { getUsers: Controller },
        bindings: { id: User }
      })
      const route = new Route(definition)
      const request = { decodedPath: '/users/12/', method: GET, getUri () { return this.decodedPath } }

      // Act
      await route.bind(request)

      // Assert
      expect(route.parameters()).toEqual({ id: 'UserEntity-uuid-12-false' })
    })

    it('Must return binding value when class contains instance resolveRouteBinding method', async () => {
      // Arrange
      const UserService = class {
        resolveRouteBinding (field, value, isOptional) {
          return Promise.resolve(`UserEntity-${field}-${value}-${isOptional}`)
        }
      }
      const definition = new RouteDefinition({
        path: '/users/:id(\\d+)?',
        method: GET,
        action: { getUsers: Controller },
        bindings: { id: UserService }
      })
      const route = new Route(definition)
      const request = { decodedPath: '/users/12/', method: GET, getUri () { return this.decodedPath } }

      // Act
      await route.bind(request)

      // Assert
      expect(route.parameters()).toEqual({ id: 'UserEntity-id-12-true' })
    })
  })

  describe('#uriRegex', () => {
    it('Must return full uri regex', () => {
      // Arrange
      const requiredRoute = new Route(new RouteDefinition({ domain: 'http://{name@subDomain(.+?)?}.example.com', path: '/users/:id@userId(\\d+)/profile/:profile' }))
      const requiredRoute2 = new Route(new RouteDefinition({ path: '/users/:id@userId(\\d+)/profile/:profile+' }))
      const optionalRoute = new Route(new RouteDefinition({ domain: 'http://{name@subDomain(.+?)}.example.com', path: '/users/{id@userId(\\d+)}/profile/{profile?}' }))
      const optionalRoute2 = new Route(new RouteDefinition({ domain: 'http://{name@subDomain(.+?)}.example.com', path: '/users/{id@userId(\\d+)}/profile/{profile*}' }))
      const optionalRoute3 = new Route(new RouteDefinition({ domain: 'http://{name@subDomain(.+?)}.example.com' }))

      // Act
      const requiredRegex = requiredRoute.uriRegex()
      const requiredRegex2 = requiredRoute2.uriRegex()
      const optionalRegex = optionalRoute.uriRegex()
      const optionalRegex2 = optionalRoute2.uriRegex()
      const optionalRegex3 = optionalRoute3.uriRegex()

      // Assert
      expect(requiredRegex).toEqual(/^(.+?)?.example.com\/users\/(\d+)\/profile\/([^/]+?)\/?$/i)
      expect(requiredRegex2).toEqual(/^\/users\/(\d+)\/profile\/((?:[^/]+?)(?:\/(?:[^/]+?))*)\/?$/i)
      expect(optionalRegex).toEqual(/^(.+?).example.com\/users\/(\d+)\/profile(?:\/([^/]+?))?\/?$/i)
      expect(optionalRegex2).toEqual(/^(.+?).example.com\/users\/(\d+)\/profile(?:\/((?:[^/]+?)(?:\/(?:[^/]+?))*))?\/?$/i)
      expect(optionalRegex3).toEqual(/^(.+?).example.com\/\/?$/i)
    })
  })

  describe('#pathRegex', () => {
    it('Must return path regex', () => {
      // Arrange
      const emptyRoute = new Route(new RouteDefinition({}))
      const emptyRoute2 = new Route(new RouteDefinition({ path: '/users' }))

      const requiredRoute = new Route(new RouteDefinition({ path: '/users/:id@userId(\\d+)' }))
      const requiredRoute2 = new Route(new RouteDefinition({ path: '/users/:id@userId(\\d+)+' }))
      const optionalRoute = new Route(new RouteDefinition({ path: '/users/{id@userId(\\d+)?}' }))
      const optionalRoute2 = new Route(new RouteDefinition({ path: '/users/{id@userId(\\d+)*}' }))

      const prefixRequiredRoute = new Route(new RouteDefinition({ path: '/users/user-:id@userId' }))
      const prefixRequiredRoute2 = new Route(new RouteDefinition({ path: '/users/user-:id@userId+' }))
      const prefixOptionalRoute = new Route(new RouteDefinition({ path: '/users/user-{id@userId?}' }))
      const prefixOptionalRoute2 = new Route(new RouteDefinition({ path: '/users/user-{id@userId*}' }))

      // Act
      const emptyRegex = emptyRoute.pathRegex()
      const emptyRegex2 = emptyRoute2.pathRegex()

      const requiredRegex = requiredRoute.pathRegex()
      const requiredRegex2 = requiredRoute2.pathRegex()
      const optionalRegex = optionalRoute.pathRegex()
      const optionalRegex2 = optionalRoute2.pathRegex()

      const prefixRequiredRegex = prefixRequiredRoute.pathRegex()
      const prefixRequiredRegex2 = prefixRequiredRoute2.pathRegex()
      const prefixOptionalRegex = prefixOptionalRoute.pathRegex()
      const prefixOptionalRegex2 = prefixOptionalRoute2.pathRegex()

      // Assert
      expect(emptyRegex).toEqual(/^\/\/?$/i)
      expect(emptyRegex2).toEqual(/^\/users\/?$/i)

      expect(requiredRegex).toEqual(/^\/users\/(\d+)\/?$/i)
      expect(requiredRegex2).toEqual(/^\/users\/((?:\d+)(?:\/(?:\d+))*)\/?$/i)
      expect(optionalRegex).toEqual(/^\/users(?:\/(\d+))?\/?$/i)
      expect(optionalRegex2).toEqual(/^\/users(?:\/((?:\d+)(?:\/(?:\d+))*))?\/?$/i)

      expect(prefixRequiredRegex).toEqual(/^\/users\/user-([^/]+?)\/?$/i)
      expect(prefixRequiredRegex2).toEqual(/^\/users\/user-((?:[^/]+?)(?:\/(?:[^/]+?))*)\/?$/i)
      expect(prefixOptionalRegex).toEqual(/^\/users\/user-([^/]+?)?\/?$/i)
      expect(prefixOptionalRegex2).toEqual(/^\/users\/user-((?:[^/]+?)(?:\/(?:[^/]+?))*)?\/?$/i)
    })
  })

  describe('#domainRegex', () => {
    it('Must return domain regex', () => {
      // Arrange
      const emptyRoute = new Route(new RouteDefinition({}))
      const emptyRoute2 = new Route(new RouteDefinition({ domain: 'example.com' }))
      const requiredRoute = new Route(new RouteDefinition({ domain: 'http://{name@subDomain(.+?)}.example.com' }))
      const optionalRoute = new Route(new RouteDefinition({ domain: 'http://{name@subDomain(.+?)?}.example.com' }))

      // Act
      const emptyRegex = emptyRoute.domainRegex()
      const emptyRegex2 = emptyRoute2.domainRegex()
      const requiredRegex = requiredRoute.domainRegex()
      const optionalRegex = optionalRoute.domainRegex()

      // Assert
      expect(emptyRegex).toBe(null)
      expect(emptyRegex2).toEqual(/^example.com$/i)
      expect(requiredRegex).toEqual(/^(.+?).example.com$/i)
      expect(optionalRegex).toEqual(/^(.+?)?.example.com$/i)
    })
  })

  describe('#_buildDomainPattern', () => {
    it('Must return domain regex pattern for constraints', () => {
      // Arrange
      const emptyRoute = new Route(new RouteDefinition({ domain: 'example.com' }))
      const requiredRoute = new Route(new RouteDefinition({ domain: 'http://{name@subDomain(.+)}.example.com' }))
      const optionalRoute = new Route(new RouteDefinition({ domain: 'http://{name@subDomain(.+)?}.example.com' }))

      const emptyDomain = emptyRoute._getDomainConstraints()
      const requiredDomain = requiredRoute._getDomainConstraints()
      const optionalDomain = optionalRoute._getDomainConstraints()

      // Act
      const emptyRegex = emptyRoute._buildDomainPattern(emptyDomain)
      const requiredRegex = requiredRoute._buildDomainPattern(requiredDomain)
      const optionalRegex = optionalRoute._buildDomainPattern(optionalDomain)

      // Assert
      expect(emptyRegex).toBe('example.com')
      expect(requiredRegex).toBe('(.+).example.com')
      expect(optionalRegex).toBe('(.+)?.example.com')
    })
  })

  describe('#_buildSegmentPattern', () => {
    it('Must return segment regex pattern for constraints', () => {
      // Arrange
      const emptyRoute = new Route(new RouteDefinition({}))
      const emptyRoute2 = new Route(new RouteDefinition({ path: '/users' }))

      const requiredRoute = new Route(new RouteDefinition({ path: '/users/:id@userId(\\d+)' }))
      const requiredRoute2 = new Route(new RouteDefinition({ path: '/users/:id@userId(\\d+)+' }))
      const optionalRoute = new Route(new RouteDefinition({ path: '/users/{id@userId(\\d+)?}' }))
      const optionalRoute2 = new Route(new RouteDefinition({ path: '/users/{id@userId(\\d+)*}' }))

      const prefixRequiredRoute = new Route(new RouteDefinition({ path: '/users/user-:id@userId' }))
      const prefixRequiredRoute2 = new Route(new RouteDefinition({ path: '/users/user-:id@userId+' }))
      const prefixOptionalRoute = new Route(new RouteDefinition({ path: '/users/user-{id@userId?}' }))
      const prefixOptionalRoute2 = new Route(new RouteDefinition({ path: '/users/user-{id@userId*}' }))

      const emptySegments = emptyRoute._getSegmentsConstraints()
      const emptySegments2 = emptyRoute2._getSegmentsConstraints()

      const requiredSegments = requiredRoute._getSegmentsConstraints()
      const requiredSegments2 = requiredRoute2._getSegmentsConstraints()
      const optionalSegments = optionalRoute._getSegmentsConstraints()
      const optionalSegments2 = optionalRoute2._getSegmentsConstraints()

      const prefixRequiredSegments = prefixRequiredRoute._getSegmentsConstraints()
      const prefixRequiredSegments2 = prefixRequiredRoute2._getSegmentsConstraints()
      const prefixOptionalSegments = prefixOptionalRoute._getSegmentsConstraints()
      const prefixOptionalSegments2 = prefixOptionalRoute2._getSegmentsConstraints()

      // Act
      const emptyRegex = emptyRoute._buildSegmentPattern(emptySegments[0])
      const emptyRegex2 = emptyRoute2._buildSegmentPattern(emptySegments2[0])

      const requiredRegex = requiredRoute._buildSegmentPattern(requiredSegments[1])
      const requiredRegex2 = requiredRoute2._buildSegmentPattern(requiredSegments2[1])
      const optionalRegex = optionalRoute._buildSegmentPattern(optionalSegments[1])
      const optionalRegex2 = optionalRoute2._buildSegmentPattern(optionalSegments2[1])

      const prefixRequiredRegex = prefixRequiredRoute._buildSegmentPattern(prefixRequiredSegments[1])
      const prefixRequiredRegex2 = prefixRequiredRoute2._buildSegmentPattern(prefixRequiredSegments2[1])
      const prefixOptionalRegex = prefixOptionalRoute._buildSegmentPattern(prefixOptionalSegments[1])
      const prefixOptionalRegex2 = prefixOptionalRoute2._buildSegmentPattern(prefixOptionalSegments2[1])

      // Assert
      expect(emptyRegex).toBe('/')
      expect(emptyRegex2).toBe('/users')

      expect(requiredRegex).toBe('/(\\d+)')
      expect(requiredRegex2).toBe('/((?:\\d+)(?:/(?:\\d+))*)')
      expect(optionalRegex).toBe('(?:/(\\d+))?')
      expect(optionalRegex2).toBe('(?:/((?:\\d+)(?:/(?:\\d+))*))?')

      expect(prefixRequiredRegex).toBe('/user-([^/]+?)')
      expect(prefixRequiredRegex2).toBe('/user-((?:[^/]+?)(?:/(?:[^/]+?))*)')
      expect(prefixOptionalRegex).toBe('/user-([^/]+?)?')
      expect(prefixOptionalRegex2).toBe('/user-((?:[^/]+?)(?:/(?:[^/]+?))*)?')
    })
  })

  describe('#_uriConstraints', () => {
    it('Must return full uri constraints', () => {
      // Arrange
      const requiredRoute = new Route(new RouteDefinition({
        path: '/users/user-:id@userId(\\d+)',
        domain: 'http://{name@subDomain(.+)}.example.com'
      }))

      // Act
      const requiredUri = requiredRoute._uriConstraints()

      // Assert
      expect(requiredUri[0]).toEqual({
        alias: 'subDomain',
        default: null,
        match: '{name@subDomain(.+)}.example.com',
        optional: false,
        param: 'name',
        suffix: '.example.com',
        quantifier: '',
        rule: '.+'
      })
      expect(requiredUri[1]).toEqual({ match: 'users' })
      expect(requiredUri[2]).toEqual({
        alias: 'userId',
        default: null,
        match: 'user-:id@userId(\\d+)',
        optional: false,
        param: 'id',
        prefix: 'user-',
        quantifier: '',
        rule: '\\d+'
      })
    })
  })

  describe('#_getDomainConstraints', () => {
    it('Must return domain constraints', () => {
      // Arrange
      const requiredRoute = new Route(new RouteDefinition({ domain: 'http://{name@subDomain(.+)}.example.com' }))
      const optionalRoute = new Route(new RouteDefinition({ domain: 'http://{name@subDomain(.+)?}.example.com' }))

      // Act
      const requiredDomain = requiredRoute._getDomainConstraints()
      const optionalDomain = optionalRoute._getDomainConstraints()

      // Assert
      expect(requiredDomain).toEqual({
        alias: 'subDomain',
        default: null,
        match: '{name@subDomain(.+)}.example.com',
        optional: false,
        param: 'name',
        suffix: '.example.com',
        quantifier: '',
        rule: '.+'
      })

      expect(optionalDomain).toEqual({
        alias: 'subDomain',
        default: null,
        match: '{name@subDomain(.+)?}.example.com',
        optional: true,
        param: 'name',
        suffix: '.example.com',
        quantifier: '?',
        rule: '.+'
      })
    })
  })

  describe('#_getSegmentsConstraints', () => {
    it('Must return segments constraints', () => {
      // Arrange
      const requiredRoute = new Route(new RouteDefinition({ path: '/users/user-:id@userId(\\d+)' }))
      const requiredRoute2 = new Route(new RouteDefinition({ path: '/users/user-:id@userId(\\d+)+' }))
      const optionalRoute = new Route(new RouteDefinition({ path: '/users/user-{id@userId(\\d+)?}' }))
      const optionalRoute2 = new Route(new RouteDefinition({ path: '/users/user-{id@userId(\\d+)*}' }))

      // Act
      const requiredSegments = requiredRoute._getSegmentsConstraints()
      const requiredSegments2 = requiredRoute2._getSegmentsConstraints()
      const optionalSegments = optionalRoute._getSegmentsConstraints()
      const optionalSegments2 = optionalRoute2._getSegmentsConstraints()

      // Assert
      expect(requiredSegments[0]).toEqual({ match: 'users' })
      expect(requiredSegments[1]).toEqual({
        alias: 'userId',
        default: null,
        match: 'user-:id@userId(\\d+)',
        optional: false,
        param: 'id',
        prefix: 'user-',
        quantifier: '',
        rule: '\\d+'
      })

      expect(requiredSegments2[1].optional).toBe(false)

      expect(optionalSegments[0]).toEqual({ match: 'users' })
      expect(optionalSegments[1]).toEqual({
        alias: 'userId',
        default: null,
        match: 'user-{id@userId(\\d+)?}',
        optional: true,
        param: 'id',
        prefix: 'user-',
        quantifier: '?',
        rule: '\\d+'
      })

      expect(optionalSegments2[1].optional).toBe(true)
    })
  })
})
