import { Group } from '../../src/decorators/Group.mjs'
import { GET } from '../../src/enums/http-methods.mjs'

const Controller = class { getUsers () {} }

describe('Group', () => {
  it('Must throw an exception when target is not a class', () => {
    // Arrange
    const definition = { path: '/users', methods: [GET] }
    try {
      // Act
      Group(definition)(Controller.prototype)
    } catch (error) {
      // Assert
      expect(error.message).toBe('This decorator can only be applied at class level')
    }
  })

  it('Must return a class with metadata as static method', () => {
    // Arrange
    const definition = { path: '/users', methods: [GET] }

    // Act
    const result = Group(definition)(Controller)

    // Assert
    expect(result.metadata).toBeTruthy()
    expect(result.metadata.decorators.route).toEqual({ path: '/users', methods: [GET] })
  })
})
