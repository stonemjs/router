import { FlattenMapper } from '../../src/mapper/FlattenMapper.mjs'
import { AbstractLoader } from '../../src/loaders/AbstractLoader.mjs'

describe('AbstractLoader', () => {
  describe('load', () => {
    it('Must throw an exception when call flatmap on abstract instance', () => {
      // Arrange
      const loader = new AbstractLoader(new FlattenMapper())
      try {
        // Act
        loader.load()
      } catch (error) {
        // Assert
        expect(error.message).toBe('Cannot call this abstract method.')
      }
    })
  })
})
