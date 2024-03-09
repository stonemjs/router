import { GET, HEAD } from '../../src/enums/http-methods.mjs'
import { ExplicitLoader } from '../../src/loaders/ExplicitLoader.mjs'
import { FlattenMapper } from '../../src/mapper/FlattenMapper.mjs'

describe('ExplicitLoader', () => {
  describe('constructor', () => {
    it('Must throw an exception while creating a new instance when definitions is not an array', () => {
      try {
        // Act
        const loader = new ExplicitLoader(new FlattenMapper())
        expect(loader).toBeTruthy()
      } catch (error) {
        // Assert
        expect(error.message).toBe('definitions must be an array of object.')
      }
    })
  })

  describe('load', () => {
    it('Must load definitions from explicit source', () => {
      // Arrange
      const rawDefinitions = [{ path: '/users', method: GET, action: () => 'Stone.js' }]
      const loader = new ExplicitLoader(new FlattenMapper(), rawDefinitions)

      // Act
      const definitions = loader.load()

      // Assert
      expect(definitions.length).toBe(1)
      expect(definitions[0].get('path')).toBe('/users')
      expect(definitions[0].getMethods()).toEqual([GET, HEAD])
      expect(definitions[0].get('action')()).toEqual('Stone.js')
    })
  })
})
