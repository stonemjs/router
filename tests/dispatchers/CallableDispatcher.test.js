import { GET } from '../../src/enums/http-methods.mjs'
import { CallableDispatcher } from '../../src/dispatchers/CallableDispatcher.mjs'

const route = {
  parametersWithoutNulls () { return { name: 'Stone' } }
}

const request = { path: '/users', method: GET }

describe('CallableDispatcher', () => {
  describe('dispatch', () => {
    it('Must invoke callable with the request context', () => {
      // Arrange
      const dispatcher = new CallableDispatcher()
      const callable = ({ request, params }) => ({ ...params, ...request })

      // Act
      const response = dispatcher.dispatch(request, route, callable)

      // Asset
      expect(response).toEqual({ name: 'Stone', path: '/users', method: GET })
    })
  })
})
