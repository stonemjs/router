import { MethodMatcher } from '../../src/matchers/MethodMatcher.mjs'
import { GET, PATCH, POST, PUT } from '../../src/enums/http-methods.mjs'

const request = { method: GET }
const matcher = new MethodMatcher()

describe('MethodMatcher', () => {
  describe('matches', () => {
    it('Must return `true` when method matches', () => {
      // Arrange
      const route = { methods: [GET, POST] }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(true)
    })

    it('Must return `false` when method not matches', () => {
      // Arrange
      const route = { methods: [PUT, PATCH] }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(false)
    })
  })
})
