import { RouteDefinition } from '../src/RouteDefinition.mjs'
import { GET, HEAD, POST, PUT } from '../src/enums/http-methods.mjs'

describe('RouteDefinition', () => {
  describe('get', () => {
    it('Get definition', () => {
      // Arrange
      const definition = new RouteDefinition({ name: 'Stone' })

      // Assert
      expect(definition.get('name')).toBe('Stone')
      expect(definition.get('action')).toBeNull()
    })
  })

  describe('set', () => {
    it('Set definition', () => {
      // Arrange
      const definition = new RouteDefinition()

      // Act
      definition.set('name', 'Stone')

      // Assert
      expect(definition.get('name')).toBe('Stone')
    })
  })

  describe('has', () => {
    it('Has definition', () => {
      // Arrange
      const definition = new RouteDefinition({ name: 'Stone' })

      // Assert
      expect(definition.has('name')).toBe(true)
    })
  })

  describe('add', () => {
    it('Add definition', () => {
      // Arrange
      const definition = new RouteDefinition({ name: 'Stone' })

      // Act
      definition.add('middleware', 'Middleware')
      definition.add('rules', { id: '\\d+' }, false)

      // Assert
      expect(definition.get('rules')).toEqual({ id: '\\d+' })
      expect(definition.get('middleware')).toEqual(['Middleware'])
    })
  })

  describe('getMethods', () => {
    it('Get methods in definition', () => {
      // Arrange
      const definition = new RouteDefinition({ method: [GET] })

      // Assert
      expect(definition.getMethods()).toEqual([GET, HEAD])
    })

    it('Get methods in definition and must return [GET] when empty', () => {
      // Arrange
      const definition = new RouteDefinition()

      // Assert
      expect(definition.getMethods()).toEqual([GET])
    })
  })

  describe('setMethods', () => {
    it('Add methods to definition', () => {
      // Arrange
      const definition = new RouteDefinition()

      // Act
      definition
        .setMethods([PUT])
        .setMethods(null)
        .setMethods(POST)

      // Assert
      expect(definition.getMethods()).toEqual([PUT, GET, POST, HEAD])
    })
  })
})
