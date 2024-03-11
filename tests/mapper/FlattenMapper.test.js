import { cloneDeep } from 'lodash'
import { FlattenMapper } from '../../src/mapper/FlattenMapper.mjs'
import { GET, HEAD, POST, PUT } from '../../src/enums/http-methods.mjs'

const Controller = class {}

describe('FlattenMapper', () => {
  const mapper = new FlattenMapper()
  const parent = {
    name: 'users',
    path: '/users',
    action: Controller,
    defaults: { id: 12 },
    rules: { id: '\\d+' },
    throttle: ['throttle'],
    bindings: { id: 'binding' },
    middleware: ['middleware'],
    domain: '{domain}.example.com',
    excludeMiddleware: ['middleware']
  }

  const children = [{
    name: 'get',
    path: '/:id',
    children: [{
      name: 'profile',
      path: '/profile',
      children: [{
        name: 'get',
        method: GET,
        path: '/:profileId',
        action: 'get',
        redirect: '/users',
        alias: []
      }, {
        name: 'post',
        method: POST,
        path: '/:profileId',
        action: 'save',
        redirect: '/users',
        alias: []
      }]
    }]
  }, {
    name: 'put',
    path: '/:id',
    method: PUT,
    redirect: '/users',
    action: 'edit'
  }, {
    path: '/',
    method: GET,
    fallback: true,
    action: 'fallback'
  }]

  describe('#constructor', () => {
    it('Must create a new instance', () => {
      expect(new FlattenMapper()).toBeTruthy()
    })
  })

  describe('flattenMap', () => {
    it('Must return a validated flat RouteDefinition from raw definitions', () => {
      // Arrange
      const rawDefinition = cloneDeep(parent)
      rawDefinition.children = cloneDeep(children)
      const definitions = mapper.flattenMap([rawDefinition])

      // Assert
      expect(definitions.length).toBe(4)
      expect(definitions[0].get('path')).toBe('/users/:id/profile/:profileId')
      expect(definitions[0].get('name')).toBe('users.get.profile.get')
      expect(definitions[0].getMethods()).toEqual([GET, HEAD])
      expect(definitions[0].get('action')).toEqual({ get: Controller })
      expect(definitions[0].get('middleware')).toEqual(['middleware'])
      expect(definitions[0].get('bindings')).toEqual({ id: 'binding' })
      expect(definitions[0].get('domain')).toEqual('{domain}.example.com')

      expect(definitions[1].get('path')).toBe('/users/:id/profile/:profileId')
      expect(definitions[1].get('name')).toBe('users.get.profile.post')
      expect(definitions[1].getMethods()).toEqual([POST])

      expect(definitions[2].get('path')).toBe('/users/:id')
      expect(definitions[2].get('name')).toBe('users.put')
      expect(definitions[2].get('action')).toEqual({ edit: Controller })

      expect(definitions[3].get('path')).toBe('/users/')
      expect(definitions[3].get('action')).toEqual({ fallback: Controller })
    })
  })

  describe('_validate', () => {
    it('Must throw exception when path, method and action are not defined', () => {
      try {
        // Act
        mapper._validate([{}])
      } catch (error) {
        // Assert
        expect(error.message).toBe(`No Path provided for this route definition ${JSON.stringify({})}`)
      }

      try {
        // Act
        mapper._validate([{ path: '/' }])
      } catch (error) {
        // Assert
        expect(error.message).toBe(`No Methods provided for this route definition ${JSON.stringify({ path: '/' })}`)
      }

      try {
        // Act
        mapper._validate([{ path: '/', methods: [GET] }])
      } catch (error) {
        // Assert
        expect(error.message).toBe(`No Action provided for this route definition ${JSON.stringify({ path: '/', methods: [GET] })}`)
      }
    })
  })

  describe('_prepend', () => {
    it('Must prepend parent props to child', () => {
      // Act
      const definition = mapper._prepend(cloneDeep(parent), cloneDeep(children[1]))

      // Assert
      expect(definition).toEqual({
        name: 'users.put',
        path: '/users/:id',
        method: PUT,
        methods: [PUT],
        rules: { id: '\\d+' },
        throttle: ['throttle'],
        middleware: ['middleware'],
        domain: '{domain}.example.com',
        excludeMiddleware: ['middleware'],
        redirect: '/users',
        action: { edit: Controller },
        actions: {},
        bindings: { id: 'binding' },
        defaults: { id: 12 }
      })
    })
  })

  describe('_flatten', () => {
    it('Must flatten map all children with parent', () => {
      // Act
      const definitions = mapper._flatten([], cloneDeep(parent), cloneDeep(children))

      // Assert
      expect(definitions.length).toBe(4)
      expect(definitions[0].path).toBe('/users/:id/profile/:profileId')
      expect(definitions[0].name).toBe('users.get.profile.get')
      expect(definitions[0].methods).toEqual([GET])
      expect(definitions[0].action).toEqual({ get: Controller })
      expect(definitions[0].middleware).toEqual(['middleware'])
      expect(definitions[0].bindings).toEqual({ id: 'binding' })
      expect(definitions[0].domain).toEqual('{domain}.example.com')

      expect(definitions[1].path).toBe('/users/:id/profile/:profileId')
      expect(definitions[1].name).toBe('users.get.profile.post')
      expect(definitions[1].methods).toEqual([POST])

      expect(definitions[2].path).toBe('/users/:id')
      expect(definitions[2].name).toBe('users.put')
      expect(definitions[2].action).toEqual({ edit: Controller })

      expect(definitions[3].path).toBe('/users/')
      expect(definitions[3].action).toEqual({ fallback: Controller })
    })

    it('Must add parent and child controller to an array when in browser context', () => {
      // Arrange
      mapper._isBrowser = jest.fn(() => true)
      const parentDefinition = { path: '/users', name: 'users', action: { template: 'parent' } }
      const childDefinition = { path: '/:id', method: GET, name: 'get', action: { template: 'child get' } }

      // Act
      const definitions = mapper._flatten([], parentDefinition, [childDefinition])

      // Assert
      expect(definitions.length).toBe(2)
      expect(definitions[0].path).toBe('/users')
      expect(definitions[0].name).toBe('users')
      expect(definitions[0].action).toEqual({ template: 'parent' })
      expect(definitions[1].path).toBe('/users/:id')
      expect(definitions[1].name).toBe('users.get')
      expect(definitions[1].methods).toEqual([GET])
      expect(definitions[1].action).toEqual([{ template: 'parent' }, { template: 'child get' }])

      // Restore
      mapper._isBrowser.mockRestore()
    })

    it('Must throw an exception when depth exceed max depth', () => {
      // Arrange
      const localMapper = new FlattenMapper()
      localMapper.setMaxDepth(2)

      // Act
      try {
        localMapper._flatten([], cloneDeep(parent), cloneDeep(children))
      } catch (error) {
        // Assert
        expect(error.message).toBe('Route definition depth exeeceded the limit value (2)')
      }
    })
  })
})
