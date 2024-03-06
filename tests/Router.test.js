import { Router } from '../src/Router.mjs'
import { RouteCollection } from '../src/RouteCollection.mjs'
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
    test('Must create a Router instance with service container and eventManager provided', () => {
      // Assert
      expect(config.get).toHaveBeenCalled()
      expect(container.instance).toHaveBeenCalled()
      expect(router.getRoutes()).toBeInstanceOf(RouteCollection)
    })

    test('Must create a Router and must log container and eventManager message when not present', () => {
      // Arrange
      console.log = jest.fn()

      // Act
      const router = new Router({})

      // Assert
      expect(router.getRoutes()).toBeInstanceOf(RouteCollection)
      expect(console.log).toHaveBeenCalledWith('No service container instance provided.')
      expect(console.log).toHaveBeenCalledWith('No Event manager instance provided. No events will be disptached.')
    })
  })

  describe('#get, #post, #put, #path, #delete, #options, #any, #fallback', () => {
    test('Must add new routes with all supported http verbs to collection', () => {
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

  describe('#loadRoutes', () => {
    test('Must throw LogicException when load method not present in loader', async () => {
      // Act
      try {
        await router.loadRoutes({})
      } catch (error) {
        // Assert
        expect(error.message).toEqual('Invalid loader, routeLoader must have `load` method')
      }
    })
  })

  describe('#loadRouteFromExplicitSource', () => {
    test('Must load routes from explicit defition source', async () => {
      // Arrange
      const definitions = [
        { path: '/users', action: () => 'Stone.js', name: 'users.get', method: GET },
        { path: '/users', action: () => 'Stone.js', name: 'users.post', method: POST }
      ]

      // Act
      await router.loadRouteFromExplicitSource(definitions)

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

  describe('#generate', () => {
    test('Must generate route with provided params and without domain', async () => {
      // Arrange
      const definitions = [
        { path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.get', method: GET },
        { path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.post', method: POST, defaults: { id: 11 } }
      ]
      await router.loadRouteFromExplicitSource(definitions)

      // Act
      const postUrl = router.generate('users.post')
      const getUrl = router.generate('users.get', { id: 22 }, { name: 'Stone' }, 'title')

      // Assert
      expect(postUrl).toEqual('/users/11/profile/')
      expect(getUrl).toEqual('/users/22/profile/?name=Stone#title')
    })

    test('Must generate route with provided params and with domain', async () => {
      // Arrange
      const definitions = [
        { domain: '{subDomain}.example.com', path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.get', method: GET },
        { domain: '{subDomain}.example.com', path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.put', method: PUT },
        { domain: '{subDomain}.example.com', path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.post', method: POST, defaults: { subDomain: 'your' } }
      ]
      await router.loadRouteFromExplicitSource(definitions)

      // Act
      const getUrl = router.generate('users.get', { subDomain: 'my', id: 22 }, { name: 'Stone' }, 'title')
      const postUrl = router.generate('users.post', { id: 11 }, { name: 'Stone' }, 'title')
      const putUrl = router.generate('users.put', { id: 11 }, { name: 'Stone' }, 'title')

      // Assert
      expect(getUrl).toEqual('my.example.com/users/22/profile/?name=Stone#title')
      expect(postUrl).toEqual('your.example.com/users/11/profile/?name=Stone#title')
      expect(putUrl).toEqual('.example.com/users/11/profile/?name=Stone#title')
    })

    test('Must throw LogicException when load method not present in loader', async () => {
      // Arrange
      const definitions = [
        { path: '/users/:id/profile', action: () => 'Stone.js', name: 'users.get', method: GET }
      ]
      await router.loadRouteFromExplicitSource(definitions)

      // Act
      try {
        router.generate('users.post', { id: 22 }, { name: 'Stone' }, 'title')
      } catch (error) {
        // Assert
        expect(error.message).toEqual('No routes found for this name users.post')
      }
    })
  })
})
