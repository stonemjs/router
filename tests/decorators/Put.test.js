import { MetaProperty } from '@stone-js/common'
import { Put } from '../../src/decorators/Put.mjs'
import { PUT } from '../../src/enums/http-methods.mjs'

const Controller = class { users () {} }

describe('Put', () => {
  it('Must return a descriptor with MetaProperty class instance as value and [PUT] as methods array', () => {
    // Arrange
    const definition = { path: '/users' }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'users')

    // Act
    const result = Put(definition)(Controller, 'users', descriptor)

    // Assert
    expect(result.value).toBeInstanceOf(MetaProperty)
    expect(result.value.getRouteDecorator()).toEqual({ path: '/users', methods: [PUT], action: { users: Controller } })
  })
})
