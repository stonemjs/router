import { MetaProperty } from '@stone-js/common'
import { Controller } from '../../src/decorators/Controller.mjs'

const UserController = class {
  getUsers () { return 'users' }
}

describe('Controller', () => {
  it('Must throw an exception when target is not a class', () => {
    // Arrange
    const definition = { name: 'UserController' }

    try {
      // Act
      Controller(definition)(UserController.prototype)
    } catch (error) {
      // Assert
      expect(error.message).toBe('This decorator can only be applied at class level')
    }
  })

  it('Must only return a class with static metadata prop', () => {
    // Arrange
    const definition = { name: 'UserController' }
    const MyClass = class { callAction (method, context) { this[method](context) }}

    // Act
    const result = Controller(definition)(MyClass)

    // Assert
    expect(result.metadata).toBeTruthy()
    expect(result.metadata.type).toBe('service')
    expect(result.metadata.isController).toBe(true)
    expect(result.metadata.name).toBe('UserController')
    expect(result.prototype.callAction).toBeTruthy()
  })

  it('Must return a class with static metadata prop and must set `callAction` as instance method if not defined', () => {
    // Arrange
    const definition = { name: 'UserController' }
    Object.defineProperty(UserController.prototype, 'saveUser', { value: new MetaProperty('saveUser', () => 'Save user', {}) })

    // Act
    const result = Controller(definition)(UserController)

    // Assert
    expect(result.metadata).toBeTruthy()
    expect(result.metadata.type).toBe('service')
    expect(result.metadata.isController).toBe(true)
    expect(result.metadata.name).toBe('UserController')
    expect(result.prototype.callAction('getUsers', {})).toBe('users')
    expect(result.prototype.callAction('saveUser', {})).toBe('Save user')
  })
})
