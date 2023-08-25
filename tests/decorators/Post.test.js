import { MetaProperty } from '@stone-js/common'
import { Post } from '../../src/decorators/Post.mjs'
import { POST } from '../../src/enums/http-methods.mjs'

const Controller = class { users () {} }

describe('Post', () => {
  it('Must return a descriptor with MetaProperty class instance as value and [POST] as methods array', () => {
    // Arrange
    const definition = { path: '/users' }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'users')

    // Act
    const result = Post(definition)(Controller, 'users', descriptor)

    // Assert
    expect(result.value).toBeInstanceOf(MetaProperty)
    expect(result.value.getRouteDecorator()).toEqual({ path: '/users', methods: [POST], action: { users: Controller } })
  })
})
