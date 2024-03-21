import { RoutingServiceProvider } from '../src/RoutingServiceProvider.mjs'

describe('RoutingServiceProvider', () => {
  describe('#register', () => {
    it('Must register Router and Dispatchers into the service container', () => {
      // Arrange
      const container = {
        aliases: [],
        singleton: [],
        instance: jest.fn(),
        make: jest.fn(() => null),
        bound: jest.fn(v => v === 'events'),
        alias (Class, name) {
          this.aliases.push({ [name]: Class })
          return this
        },
        singletonIf (Class, resolver) {
          this.singleton.push([Class, resolver])
          return this
        }
      }
      const provider = new RoutingServiceProvider(container)

      // Act
      provider.register()

      // Assert
      expect(container.aliases.length).toBe(1)
      expect(container.singleton.length).toBe(4)

      for (const [Class, resolver] of container.singleton) {
        expect(resolver(container)).toBeInstanceOf(Class)
      }

      container.bound = jest.fn(() => false)

      for (const [Class, resolver] of container.singleton) {
        expect(resolver(container)).toBeInstanceOf(Class)
      }

      expect(container.make).toHaveBeenCalled()
      expect(container.bound).toHaveBeenCalled()
    })
  })
})
