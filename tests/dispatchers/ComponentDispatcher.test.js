import { GET } from '../../src/enums/http-methods.mjs'
import { ComponentDispatcher } from '../../src/dispatchers/ComponentDispatcher.mjs'

const route = {
  action: () => 'Users',
  parametersWithoutNulls () { return { name: 'Stone' } }
}

const request = { path: '/users', method: GET }

describe('ComponentDispatcher', () => {
  describe('dispatch', () => {
    it('Must return action, actions and context', () => {
      // Arrange
      const dispatcher = new ComponentDispatcher()

      // Act
      const response = dispatcher.dispatch(request, route)

      // Asset
      expect(response.context.route.action()).toBe('Users')
      expect(response.context.params).toEqual({ name: 'Stone' })
      expect(response.context.request).toEqual({ path: '/users', method: GET })
    })
  })
})
