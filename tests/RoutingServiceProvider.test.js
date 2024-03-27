import { RoutingServiceProvider } from '../src/RoutingServiceProvider.mjs'

describe('RoutingServiceProvider', () => {
  describe('#register', () => {
    let config
    let provider
    let container

    beforeEach(() => {
      config = {
        get: jest.fn(() => null)
      }
      container = {
        aliases: [],
        singleton: [],
        instance: jest.fn(),
        make: jest.fn(v => v === 'config' ? config : null),
        bound: jest.fn(() => true),
        alias (Class, name) {
          this.aliases.push({ [name]: Class })
          return this
        },
        singletonIf (Class, resolver) {
          this.singleton.push([Class, resolver])
          return this
        }
      }
      provider = new RoutingServiceProvider(container)
    })

    it('Must register Router and Dispatchers into the service container when item are bound', () => {
      // Act
      provider.register()

      // Assert
      expect(container.aliases.length).toBe(1)
      expect(container.singleton.length).toBe(4)
      expect(container.bound).toHaveBeenCalled()
      expect(container.make).toHaveBeenCalled()
      expect(config.get).toHaveBeenCalledWith('router', {})

      for (const [Class, resolver] of container.singleton) {
        expect(resolver(container)).toBeInstanceOf(Class)
      }
    })

    it('Must register Router and Dispatchers into the service container when item are not bound', () => {
      // Arrange
      container.bound = jest.fn(() => false)

      // Act
      provider.register()

      // Assert
      expect(container.aliases.length).toBe(1)
      expect(container.singleton.length).toBe(4)
      expect(container.bound).toHaveBeenCalled()
      expect(container.make).not.toHaveBeenCalled()
      expect(config.get).not.toHaveBeenCalledWith('router', {})

      for (const [Class, resolver] of container.singleton) {
        expect(resolver(container)).toBeInstanceOf(Class)
      }
    })
  })
})
