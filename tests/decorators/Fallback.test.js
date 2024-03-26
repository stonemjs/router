import { MetaProperty } from '@stone-js/common'
import { GET } from '../../src/enums/http-methods.mjs'
import { Fallback } from '../../src/decorators/Fallback.mjs'

const Controller = class { users () {} }

describe('Fallback', () => {
  it('Must return a descriptor with MetaProperty class instance as value and [GET] as methods array and fallback must be true', () => {
    // Arrange
    const definition = { path: '/users' }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'users')

    // Act
    const result = Fallback(definition)(Controller, 'users', descriptor)

    // Assert
    expect(result.value).toBeInstanceOf(MetaProperty)
    expect(result.value.getRouteDecorator()).toEqual({ path: '/users', methods: [GET], action: { users: Controller }, fallback: true })
  })
})
