import { Route } from '../src/Route.mjs'
import { Router } from '../src/Router.mjs'
import { Get } from '../src/decorators/Get.mjs'
import { Post } from '../src/decorators/Post.mjs'
import { Group } from '../src/decorators/Group.mjs'
import { UriMatcher } from '../src/matchers/UriMatcher.mjs'
import { RouteCollection } from '../src/RouteCollection.mjs'
import { RouteDefinition } from '../src/RouteDefinition.mjs'
import { Controller } from '../src/decorators/Controller.mjs'
import { MethodMatcher } from '../src/matchers/MethodMatcher.mjs'
import { CallableDispatcher } from '../src/dispatchers/CallableDispatcher.mjs'
import { ComponentDispatcher } from '../src/dispatchers/ComponentDispatcher.mjs'
import { ControllerDispatcher } from '../src/dispatchers/ControllerDispatcher.mjs'
import { DELETE, GET, HEAD, HTTP_METHODS, OPTIONS, PATCH, POST, PUT } from '../src/enums/http-methods.mjs'

describe('Router', () => {
  let router
  const config = {
    get: jest.fn((_, v) => v)
  }
  const container = {
    instance: jest.fn(),
    bound: jest.fn(() => true),
    make: jest.fn(V => V === 'config' ? config : new V())
  }
  const eventManager = {
    on: jest.fn(),
    emit: jest.fn()
  }

  beforeEach(() => {
    router = new Router({ container, eventManager })
  })

  describe('#constructor', () => {
    it('Must create a Router instance with service container and eventManager provided', () => {
      // Assert
      expect(config.get).toHaveBeenCalled()
      expect(container.instance).toHaveBeenCalled()
      expect(router.getRoutes()).toBeInstanceOf(RouteCollection)
    })

    it('Must create a Router and must log container and eventManager message when not present', () => {
      // Arrange
      console.log = jest.fn()

      // Act
      const router = new Router()

      // Assert
      expect(router.getRoutes()).toBeInstanceOf(RouteCollection)
      expect(console.log).toHaveBeenCalledWith('No service container instance provided.')
      expect(console.log).toHaveBeenCalledWith('No Event manager instance provided. No events will be disptached.')
    })
  })

  describe('#dispatch', () => {
    const SimpleMiddleware = class {
      handle (request, next) {
        request.custom = 'Stone.js'
        return next(request)
      }
    }
    const request = {
      resolver: () => null,
      decodedPath: '/users/jonhy-doe',
      method: GET,
      getUri () { return this.decodedPath },
      setRouteResolver (resolver) {
        this.resolver = resolver
      },
      route () {
        return this.resolver()
      }
    }

    it('Dispatch request to route and execute callable route action', async () => {
      // Arrange
      const definitions = [
        { path: '/users/:username', action: () => Promise.resolve('Get users'), name: 'users.get', method: GET, middleware: [SimpleMiddleware] },
        { path: '/users/:username', action: () => Promise.resolve('Save user'), name: 'users.post', method: POST, middleware: [SimpleMiddleware] }
      ]

      request.method = GET
      request.custom = null

      router
        .addMiddleware(SimpleMiddleware)
        .addMiddleware(SimpleMiddleware)
        .loadRoutesFromExplicitSource(definitions)

      // Act
      const response = await router.dispatch(request)

      // Assert
      expect(response).toBe('Get users')
      expect(router.input('username')).toBe('jonhy-doe')
      expect(router.getCurrentRequest().custom).toBe('Stone.js')
      expect(router.gatherRouteMiddleware(router.current()).length).toBe(1)
    })

    it('Dispatch request to route and execute controller route action', async () => {
      // Arrange
      const router = new Router()
      const Controller = class {
        getUsers () { return Promise.resolve('Get users') }
        saveUser ({ params }) { return Promise.resolve(`Save user ${params.username}`) }
      }
      const definitions = [
        {
          name: 'users',
          path: '/users/{username}',
          action: Controller,
          children: [
            { action: 'getUsers', name: 'get', method: GET },
            { action: 'saveUser', name: 'post', method: POST }
          ]
        }
      ]

      request.method = POST
      request.custom = null

      router
        .addMiddleware(SimpleMiddleware)
        .skipMiddleware()
        .loadRoutesFromExplicitSource(definitions)

      // Act
      const response = await router.dispatch(request)

      // Assert
      expect(response).toBe('Save user jonhy-doe')
      expect(request.route().name).toBe('users.post')
      expect(router.getCurrentRequest().custom).toBe(null)

      try {
        await router.respondWithRouteName(request, 'users.put')
      } catch (error) {
        // Assert
        expect(error.message).toBe('Not Found')
        expect(error.body).toBe('No routes found for this name users.put')
      }
    })

    it('Dispatch request to route and execute component route action', async () => {
      // Arrange
      const definitions = [
        { path: '/users/{username}', action: { template: 'Get users' }, name: 'users.get', method: GET, excludeMiddleware: [SimpleMiddleware] },
        { path: '/users/{username}', action: { template: 'Save user' }, name: 'users.post', method: POST, excludeMiddleware: [SimpleMiddleware] }
      ]

      request.method = GET
      request.custom = null

      router
        .addMiddleware(SimpleMiddleware)
        .loadRoutesFromExplicitSource(definitions)

      Route.prototype._isBrowser = jest.fn(() => true)

      // Act
      const response = await router.dispatch(request)
      const response2 = await router.respondWithRouteName(request, 'users.post')

      // Assert
      expect(response.action.template).toBe('Get users')
      expect(response.context.params.username).toBe('jonhy-doe')
      expect(response2.action.template).toBe('Save user')
      expect(response2.context.params.username).toBe('jonhy-doe')
      expect(router.getCurrentRequest().custom).toBe(null)
      expect(router.gatherRouteMiddleware(router.current()).length).toBe(0)

      Route.prototype._isBrowser.mockRestore()
    })
  })

  describe('#get, #post, #put, #path, #delete, #options, #any, #fallback', () => {
    it('Must add new routes with all supported http verbs to collection', () => {
      // Arrange
      const getDef = { path: '/users', action: () => 'Stone.js', name: 'users.get' }
      const postDef = { path: '/users', action: () => 'Stone.js', name: 'users.post' }
      const putDef = { path: '/users/:id', action: () => 'Stone.js', name: 'users.put' }
      const patchDef = { path: '/users/:id', action: () => 'Stone.js', name: 'users.patch' }
      const deleteDef = { path: '/users/:id', action: () => 'Stone.js', name: 'users.delete' }
      const optionsDef = { path: '/users/:id', action: () => 'Stone.js', name: 'users.options' }
      const anyDef = { path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.profile' }

      // Act
      router
        .get(getDef)
        .post(postDef)
        .put(putDef)
        .patch(patchDef)
        .delete(deleteDef)
        .options(optionsDef)
        .any(anyDef)
        .fallback(() => 'Stone.js')

      const routes = router.getRoutes()
      const getRoute = routes.getByName(getDef.name)
      const anyRoute = routes.getByName(anyDef.name)
      const putRoute = routes.getByName(putDef.name)
      const postRoute = routes.getByName(postDef.name)
      const patchRoute = routes.getByName(patchDef.name)
      const deleteRoute = routes.getByName(deleteDef.name)
      const optionsRoute = routes.getByName(optionsDef.name)
      const fallbackRoute = routes.getByMethod(GET).find(route => route.isFallback)

      // Assert
      expect(routes.size).toEqual(16)
      expect(putRoute.methods).toEqual([PUT])
      expect(postRoute.methods).toEqual([POST])
      expect(patchRoute.methods).toEqual([PATCH])
      expect(getRoute.methods).toEqual([GET, HEAD])
      expect(deleteRoute.methods).toEqual([DELETE])
      expect(optionsRoute.methods).toEqual([OPTIONS])
      expect(anyRoute.methods).toEqual([...HTTP_METHODS, HEAD])

      expect(putRoute.name).toEqual(putDef.name)
      expect(getRoute.action()).toEqual(getDef.action())
      expect(fallbackRoute.path).toEqual('/:__fallback__(.*)*')
    })
  })

  describe('#setDispatchers', () => {
    it('Must throw LogicException when setting an invalid dispatcher', () => {
      // Act
      try {
        router.setDispatchers({ patate: class {} })
      } catch (error) {
        // Assert
        expect(error.message).toEqual("Invalid dispatcher type patate. Valid types are ('component', 'callable', 'controller')")
      }
    })
  })

  describe('#loadRoutes', () => {
    it('Must throw LogicException when load method not present in loader', async () => {
      // Act
      try {
        await router.loadRoutes({})
      } catch (error) {
        // Assert
        expect(error.message).toEqual('Invalid loader, routeLoader must have `load` method')
      }
    })
  })

  describe('#loadRoutesFromExplicitSource', () => {
    it('Must load routes from explicit definition source', () => {
      // Arrange
      const definitions = [
        { path: '/users', action: () => 'Stone.js', name: 'users.get', method: GET },
        { path: '/users', action: () => 'Stone.js', name: 'users.post', method: POST }
      ]

      // Act
      router.loadRoutesFromExplicitSource(definitions)

      const routes = router.getRoutes()
      const getRoute = routes.getByName('users.get')
      const postRoute = routes.getByName('users.post')

      // Assert
      expect(postRoute.methods).toEqual([POST])
      expect(getRoute.methods).toEqual([GET, HEAD])
      expect(getRoute.action()).toEqual('Stone.js')
      expect(postRoute.action()).toEqual('Stone.js')
    })
  })

  describe('#loadRoutesFromDecoratorSource', () => {
    it('Must load routes from decorator definition source', async () => {
      // Arrange
      let UserController = Controller({ name: 'UserController' })(class {
        getUsers () {
          return 'Get users'
        }

        saveUser () {
          return 'Save user'
        }
      })
      UserController = Group({ path: '/users', name: 'users' })(UserController)
      const getDescriptor = Get({
        name: 'get',
        path: '/'
      })(UserController, 'getUsers', Object.getOwnPropertyDescriptor(UserController.prototype, 'getUsers'))
      const postDescriptor = Post({
        name: 'post',
        path: '/'
      })(UserController, 'saveUser', Object.getOwnPropertyDescriptor(UserController.prototype, 'saveUser'))

      Object.defineProperty(UserController.prototype, 'getUsers', getDescriptor)
      Object.defineProperty(UserController.prototype, 'saveUser', postDescriptor)

      const definitions = [UserController]

      // Act
      await router.loadRoutesFromDecoratorSource(definitions)

      const routes = router.getRoutes()
      const getRoute = routes.getByName('users.get')
      const postRoute = routes.getByName('users.post')

      // Assert
      expect(postRoute.methods).toEqual([POST])
      expect(getRoute.methods).toEqual([GET, HEAD])
      expect(getRoute.action).toEqual({ getUsers: UserController })
      expect(postRoute.action).toEqual({ saveUser: UserController })
    })
  })

  describe('#generate', () => {
    it('Must generate route with provided params and without domain', () => {
      // Arrange
      const definitions = [
        { path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.get', method: GET },
        { path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.post', method: POST, defaults: { id: 11 } }
      ]
      router.loadRoutesFromExplicitSource(definitions)

      // Act
      const postUrl = router.generate('users.post')
      const getUrl = router.generate('users.get', { id: 22 }, { name: 'Stone' }, 'title')

      // Assert
      expect(postUrl).toEqual('/users/11/profile/')
      expect(getUrl).toEqual('/users/22/profile/?name=Stone#title')
    })

    it('Must generate route with provided params and with domain', () => {
      // Arrange
      const definitions = [
        { domain: '{subDomain}.example.com', path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.get', method: GET },
        { domain: '{subDomain}.example.com', path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.put', method: PUT },
        { domain: '{mydomain}.example.com', path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.delete', method: DELETE },
        { domain: '{subDomain}.example.com', path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.post', method: POST, defaults: { subDomain: 'your' } }
      ]
      router
        .addDefault('mydomain', 'stone')
        .loadRoutesFromExplicitSource(definitions)

      // Act
      const getUrl = router.generate('users.get', { subDomain: 'my', id: 22 }, { name: 'Stone' }, 'title')
      const postUrl = router.generate('users.post', { id: 11 }, { name: 'Stone' }, 'title')
      const putUrl = router.generate('users.put', { id: 11 }, { name: 'Stone' }, 'title')
      const deleteUrl = router.generate('users.delete', { id: 11 }, { name: 'Stone' }, 'title')

      // Assert
      expect(getUrl).toEqual('my.example.com/users/22/profile/?name=Stone#title')
      expect(postUrl).toEqual('your.example.com/users/11/profile/?name=Stone#title')
      expect(putUrl).toEqual('.example.com/users/11/profile/?name=Stone#title')
      expect(deleteUrl).toEqual('stone.example.com/users/11/profile/?name=Stone#title')
    })

    it('Must throw LogicException when no such route is defined', () => {
      // Arrange
      const definitions = [
        { path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.get', method: GET }
      ]
      router.loadRoutesFromExplicitSource(definitions)

      // Act
      try {
        router.generate('users.post', { id: 22 }, { name: 'Stone' }, 'title')
      } catch (error) {
        // Assert
        expect(error.message).toEqual('No routes found for this name users.post')
      }
    })
  })

  describe('#setters && #getters', () => {
    it('Must set and get values from router', () => {
      // Arrange
      const router = new Router()
      const definitions = [
        { path: '/users/', action: () => 'Get users', name: 'users.get', method: GET },
        { path: '/users/', action: () => 'Save user', name: 'users.post', method: POST }
      ]
      const SimpleMiddleware = class {
        handle (request, next) {
          return next(request)
        }
      }
      const route = new Route(new RouteDefinition({ path: '/users/profile', method: GET, action: () => 'Get user profile' }))
      const routeCollection = new RouteCollection().add(route)

      const request = { decodedPath: '/users', method: GET, getUri () { return this.decodedPath } }
      const emptyMatchers = router.getMatchers(false)
      const emptyDispatchers = router.getDispatchers(false)

      // Act
      router
        .setMaxDepth(5)
        .setRules({ id: /\d+/ })
        .addRule('name', /.+/g)
        .setMiddleware([])
        .setDefaults({ domain: 'stone' })
        .addMiddleware(SimpleMiddleware)
        .skipMiddleware()
        .setRoutes(routeCollection)
        .setContainer(container)
        .setEventManager(eventManager)
        .setMatchers([new MethodMatcher(), new UriMatcher()], false)
        .setMatchers([new MethodMatcher(), new UriMatcher()])
        .setDispatchers({})
        .addDispatcher('component', ComponentDispatcher)
        .setCallableDispatcher(CallableDispatcher)
        .setComponentDispatcher(ComponentDispatcher)
        .setControllerDispatcher(ControllerDispatcher)
        .matched(() => 'Route matched')
        .loadRoutesFromExplicitSource(definitions)

      try {
        // Act
        router.setRoutes(new SimpleMiddleware())
      } catch (error) {
        // Assert
        expect(error.message).toBe('Parameter must be an instance of RouteCollection')
      }

      // Assert
      expect(emptyMatchers).toEqual([])
      expect(emptyDispatchers).toEqual({})
      expect(router.has('users.get')).toBe(true)
      expect(router.has(['users.get', 'user.put'])).toBe(false)
      expect(router.getMiddleware()).toEqual([SimpleMiddleware])
      expect(router.findRoute(request).action()).toBe('Get users')
      expect(router.currentRouteName()).toBe('users.get')
      expect(router.isCurrentRouteNamed('users.get')).toBe(true)
      expect(router.currentRouteAction()()).toBe('Get users')
      expect(router.dumpRoutes()).toBeTruthy()
    })
  })
})
