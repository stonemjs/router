import { MetaProperty } from '@stone-js/common'
import { Delete } from '../../src/decorators/Delete.mjs'
import { DELETE } from '../../src/enums/http-methods.mjs'

const Controller = class { users () {} }

describe('Delete', () => {
  it('Must return a descriptor with MetaProperty class instance as value and [DELETE] as methods array', () => {
    // Arrange
    const definition = { path: '/users' }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'users')

    // Act
    const result = Delete(definition)(Controller, 'users', descriptor)

    // Assert
    expect(result.value).toBeInstanceOf(MetaProperty)
    expect(result.value.getRouteDecorator()).toEqual({ path: '/users', methods: [DELETE], action: { users: Controller } })
  })
})
