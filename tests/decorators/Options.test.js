import { MetaProperty } from '@stone-js/common'
import { Options } from '../../src/decorators/Options.mjs'
import { OPTIONS } from '../../src/enums/http-methods.mjs'

const Controller = class { users () {} }

describe('Options', () => {
  it('Must return a descriptor with MetaProperty class instance as value and [OPTIONS] as methods array', () => {
    // Arrange
    const definition = { path: '/users' }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'users')

    // Act
    const result = Options(definition)(Controller, 'users', descriptor)

    // Assert
    expect(result.value).toBeInstanceOf(MetaProperty)
    expect(result.value.getRouteDecorator()).toEqual({ path: '/users', methods: [OPTIONS], action: { users: Controller } })
  })
})
