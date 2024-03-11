import { MetaProperty } from '@stone-js/common'
import { Match } from '../../src/decorators/Match.mjs'
import { GET } from '../../src/enums/http-methods.mjs'

const Controller = class { getUsers () {} }

describe('Match', () => {
  it('Must throw an exception when target is not a class', () => {
    // Arrange
    const definition = { path: '/users', method: GET }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'getUsers')
    try {
      // Act
      Match(definition)(Controller.prototype, 'getUsers', descriptor)
    } catch (error) {
      // Assert
      expect(error.message).toBe('This decorator can only be applied at method level')
    }
  })

  it('Must throw an exception when descriptor.value is not a method or MetaProperty', () => {
    // Arrange
    const definition = { path: '/users', method: GET }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'getUsers')
    descriptor.value = Controller
    try {
      // Act
      Match(definition)(Controller, 'getUsers', descriptor)
    } catch (error) {
      // Assert
      expect(error.message).toBe('This decorator can only be applied at method level')
    }
  })

  it('Must return a descriptor with MetaProperty class instance as value', () => {
    // Arrange
    const definition = { path: '/users', methods: [GET] }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'getUsers')

    // Act
    const result = Match(definition)(Controller, 'getUsers', descriptor)

    // Assert
    expect(result.value).toBeInstanceOf(MetaProperty)
    expect(result.value.getRouteDecorator()).toEqual({ path: '/users', methods: [GET], action: { getUsers: Controller } })
  })
})
