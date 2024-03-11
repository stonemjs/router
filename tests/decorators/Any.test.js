import { MetaProperty } from '@stone-js/common'
import { Any } from '../../src/decorators/Any.mjs'
import { HTTP_METHODS } from '../../src/enums/http-methods.mjs'

const Controller = class { users () {} }

describe('Any', () => {
  it('Must return a descriptor with MetaProperty class instance as value and [GET, PUT, POST, PATCH, DELETE, OPTIONS] as methods array', () => {
    // Arrange
    const definition = { path: '/users' }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'users')

    // Act
    const result = Any(definition)(Controller, 'users', descriptor)

    // Assert
    expect(result.value).toBeInstanceOf(MetaProperty)
    expect(result.value.getRouteDecorator()).toEqual({ path: '/users', methods: HTTP_METHODS, action: { users: Controller } })
  })
})
