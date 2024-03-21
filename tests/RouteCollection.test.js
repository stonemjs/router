import { Route } from '../src/Route.mjs'
import { UriMatcher } from '../src/matchers/UriMatcher.mjs'
import { RouteCollection } from '../src/RouteCollection.mjs'
import { RouteDefinition } from '../src/RouteDefinition.mjs'
import { MethodMatcher } from '../src/matchers/MethodMatcher.mjs'
import { GET, OPTIONS, PATCH, POST, PUT } from '../src/enums/http-methods.mjs'

describe('RouteCollection', () => {
  describe('#add', () => {
    it('Add routes to collection and retrieve them', () => {
      // Arrange
      const routes = new RouteCollection()
      const Controller = class { static metadata = { name: 'UserController' } }

      // Act
      routes.add(Route.create(new RouteDefinition({ path: '/users', method: POST, action: () => 'users' })))
      routes.add(Route.create(new RouteDefinition({ path: '/users/:id', method: PUT, action: { edit: Controller } })))
      routes.add(Route.create(new RouteDefinition({ name: 'users', path: '/users', method: GET, action: () => 'users' })))
      routes.add(Route.create(new RouteDefinition({ name: 'users.profile', path: '/users/:id/profile', method: GET, action: () => 'users profile' })))

      // Assert
      expect(routes.size).toBe(6) // size
      expect(routes.length).toBe(6) // length
      expect(routes.dump().length).toBe(4) // dump
      expect(routes.toJSON().length).toBe(6) // toJSON
      expect(routes.getRoutes().length).toBe(6) // getRoutes
      expect(routes.getRoutesByName().size).toBe(2) // getRoutesByName
      expect(routes.getRoutesByMethod().size).toBe(4) // getRoutesByMethod
      expect(routes.getByMethod(PATCH).length).toBe(0) // getByMethod
      expect(routes.hasNamedRoute('users')).toBe(true) // hasNamedRoute
      expect(routes.getByName('users').action()).toBe('users') // getByName
      expect(routes.getByMethod(GET)[0].action()).toBe('users') // getByMethod
      expect(routes.toString()).toContain('/users/:id/profile') // toString
      expect(routes.getByAction('UserController@edit').path).toBe('/users/:id') // getByAction

      for (const route of routes) { // [Symbol.iterator]
        expect(route.path).toBeTruthy()
      }
    })
  })

  describe('#match', () => {
    const matchers = [new MethodMatcher(), new UriMatcher()]

    it('Check the matching and return a matched route', async () => {
      // Arrange
      const routes = new RouteCollection()
      const request = { method: GET, decodedPath: '/users/12', isSecure: false, getUri () { return this.decodedPath } }

      routes.add(Route.create(new RouteDefinition({ name: 'users', path: '/users/:id(\\d+)', method: GET, action: () => 'get users' })).setMatchers(matchers))
      routes.add(Route.create(new RouteDefinition({ path: '/:any(.*)*', fallback: true, method: GET, action: () => 'fallback' })).setMatchers(matchers))

      // Act
      const route = await routes.match(request).bind(request)

      // Assert
      expect(route.parameter('id')).toBe(12)
      expect(route.path).toBe('/users/:id(\\d+)')
      expect(route.action()).toBe('get users')
    })

    it('Check the matching and return a matched OPTIONS route for OPTIONS request', () => {
      // Arrange
      const routes = new RouteCollection()
      const request = {
        method: OPTIONS,
        isSecure: false,
        decodedPath: '/users',
        getUri () { return this.decodedPath },
        isMethod (v) { return v === this.method }
      }

      routes.add(Route.create(new RouteDefinition({ name: 'users', path: '/users', method: POST, action: () => 'save users' })).setMatchers(matchers))

      // Act
      const route = routes.match(request)

      // Assert
      expect(route.path).toBe('/users')
      expect(route.action().statusCode).toBe(200)
      expect(route.action().content).toEqual({ Allow: POST })
    })

    it('Check the matching and throw exception when match found with different method', () => {
      // Arrange
      const routes = new RouteCollection()
      const request = { method: POST, decodedPath: '/users', isSecure: false, getUri () { return this.decodedPath } }

      routes.add(Route.create(new RouteDefinition({ name: 'users', path: '/users', method: GET, action: () => 'get users' })).setMatchers(matchers))

      try {
        // Act
        const route = routes.match(request)
        expect(route).toBe('') // Confirm exception has thrown
      } catch (error) {
        // Assert
        expect(error.message).toBe('Not Found')
        expect(error.body).toBe('The POST method is not supported for route /users. Supported methods: GET.')
      }
    })

    it('Check the matching and throw exception when no matches found', () => {
      // Arrange
      const routes = new RouteCollection()
      const request = { method: GET, decodedPath: '/users/doe', isSecure: false, getUri () { return this.decodedPath } }

      routes.add(Route.create(new RouteDefinition({ name: 'users', path: '/users/:id(\\d+)', method: GET, action: () => 'get users' })).setMatchers(matchers))

      try {
        // Act
        const route = routes.match(request)
        expect(route).toBe('') // Confirm exception has thrown
      } catch (error) {
        // Assert
        expect(error.message).toBe('Not Found')
        expect(error.body).toBe('The route /users/doe could not be found.')
      }
    })
  })
})
