import { UriMatcher } from '../../src/matchers/UriMatcher.mjs'

const matcher = new UriMatcher()
const route = { uriRegex () { return /^\/?[^\\]+?\/[^\\]+?\/?$/ } }

describe('UriMatcher', () => {
  describe('matches', () => {
    it('Must return `true` when regex matches', () => {
      // Arrange
      const request = { decodedPath: '/users/12' }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(true)
    })

    it('Must return `false` when regex not matches', () => {
      // Arrange
      const request = { decodedPath: 'name.stone' }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(false)
    })
  })
})
