import { MetaProperty } from '@stone-js/common'
import { Get } from '../../src/decorators/Get.mjs'
import { GET } from '../../src/enums/http-methods.mjs'

const Controller = class { users () {} }

describe('Get', () => {
  it('Must return a descriptor with MetaProperty class instance as value and [GET] as methods array', () => {
    // Arrange
    const definition = { path: '/users' }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'users')

    // Act
    const result = Get(definition)(Controller, 'users', descriptor)

    // Assert
    expect(result.value).toBeInstanceOf(MetaProperty)
    expect(result.value.getRouteDecorator()).toEqual({ path: '/users', methods: [GET], action: { users: Controller } })
  })
})
