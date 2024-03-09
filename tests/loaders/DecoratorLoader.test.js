import { Get } from '../../src/decorators/Get.mjs'
import { Post } from '../../src/decorators/Post.mjs'
import { Group } from '../../src/decorators/Group.mjs'
import { GET, HEAD, POST } from '../../src/enums/http-methods.mjs'
import { Controller } from '../../src/decorators/Controller.mjs'
import { FlattenMapper } from '../../src/mapper/FlattenMapper.mjs'
import { DecoratorLoader } from '../../src/loaders/DecoratorLoader.mjs'

const getController = parent => {
  let UserController = Controller({ name: 'UserController' })(class {
    getUsers () {
      return 'Get users'
    }

    saveUser () {
      return 'Save user'
    }
  })

  if (parent) {
    UserController = Group({ path: '/users', name: 'users' })(UserController)
  }

  const getDescriptor = Get({
    name: 'get',
    path: '/'
  })(UserController, 'getUsers', Object.getOwnPropertyDescriptor(UserController.prototype, 'getUsers'))

  const postDescriptor = Post({
    name: 'post',
    path: '/'
  })(UserController, 'saveUser', Object.getOwnPropertyDescriptor(UserController.prototype, 'saveUser'))

  Object.defineProperty(UserController.prototype, 'getUsers', getDescriptor)
  Object.defineProperty(UserController.prototype, 'saveUser', postDescriptor)

  return UserController
}

describe('DecoratorLoader', () => {
  describe('constructor', () => {
    it('Must throw an exception while creating a new instance when classes is not an array', () => {
      try {
        // Act
        const loader = new DecoratorLoader(new FlattenMapper())
        expect(loader).toBeTruthy()
      } catch (error) {
        // Assert
        expect(error.message).toBe('classes must be an array of class.')
      }
    })
  })

  describe('load', () => {
    it('Must load definitions without parent from decorator source', () => {
      // Arrange
      const Controller = getController(false)
      const loader = new DecoratorLoader(new FlattenMapper(), [Controller])

      // Act
      const definitions = loader.load()

      // Assert
      expect(definitions.length).toBe(2)
      expect(definitions[0].get('path')).toBe('/')
      expect(definitions[0].getMethods()).toEqual([GET, HEAD])
      expect(definitions[0].get('action')).toEqual({ getUsers: Controller })
    })

    it('Must load definitions with parent from decorator source', () => {
      // Arrange
      const Controller = getController(true)
      const loader = new DecoratorLoader(new FlattenMapper(), [Controller])

      // Act
      const definitions = loader.load()

      // Assert
      expect(definitions.length).toBe(2)
      expect(definitions[0].get('path')).toBe('/users/')
      expect(definitions[0].getMethods()).toEqual([GET, HEAD])
      expect(definitions[0].get('action')).toEqual({ getUsers: Controller })
      expect(definitions[1].get('path')).toBe('/users/')
      expect(definitions[1].getMethods()).toEqual([POST])
      expect(definitions[1].get('action')).toEqual({ saveUser: Controller })
    })
  })
})
