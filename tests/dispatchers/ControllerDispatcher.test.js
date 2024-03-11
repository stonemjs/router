import { GET } from '../../src/enums/http-methods.mjs'
import { ControllerDispatcher } from '../../src/dispatchers/ControllerDispatcher.mjs'

const route = {
  action: () => 'Users',
  parametersWithoutNulls () { return { name: 'Stone' } }
}

const request = { path: '/users', method: GET }

const Controller = class {
  getUsers ({ request, params }) { return { ...params, ...request } }
}

describe('ControllerDispatcher', () => {
  describe('dispatch', () => {
    it('Must invoke controller method and return the response', () => {
      // Arrange
      const instance = new Controller()
      const dispatcher = new ControllerDispatcher()

      // Act
      const response = dispatcher.dispatch(request, route, instance, 'getUsers')

      // Asset
      expect(response).toEqual({ name: 'Stone', path: '/users', method: GET })
    })

    it('Must invoke controller method via `callAction` when defined and return the response', () => {
      // Arrange
      const UserController = class {
        callAction (method, context) { return this[method](context) }
        getUsers ({ request, params }) { return { ...params, ...request } }
      }
      const instance = new UserController()
      const dispatcher = new ControllerDispatcher()

      // Act
      const response = dispatcher.dispatch(request, route, instance, 'getUsers')

      // Asset
      expect(response).toEqual({ name: 'Stone', path: '/users', method: GET })
    })
  })
})
