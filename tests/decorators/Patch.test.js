import { MetaProperty } from '@stone-js/common'
import { Patch } from '../../src/decorators/Patch.mjs'
import { PATCH } from '../../src/enums/http-methods.mjs'

const Controller = class { users () {} }

describe('Patch', () => {
  it('Must return a descriptor with MetaProperty class instance as value and [PATCH] as methods array', () => {
    // Arrange
    const definition = { path: '/users' }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'users')

    // Act
    const result = Patch(definition)(Controller, 'users', descriptor)

    // Assert
    expect(result.value).toBeInstanceOf(MetaProperty)
    expect(result.value.getRouteDecorator()).toEqual({ path: '/users', methods: [PATCH], action: { users: Controller } })
  })
})
