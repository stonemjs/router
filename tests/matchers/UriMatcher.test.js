import { UriMatcher } from '../../src/matchers/UriMatcher.mjs'

const matcher = new UriMatcher()
const route = { pathRegex: () => [/^\/?[^\\]+?\/[^\\]+?\/?$/] }

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

    it('Must return `true` when regex matches alias', () => {
      // Arrange
      const request = { decodedPath: '/people/12/profile/123/name' }
      const route = {
        pathRegex () {
          return [
            /^\/users\/(\d+)\/profile\/([^/]+?)\/name$/,
            /^\/people\/(\d+)\/profile\/([^/]+?)\/name$/,
            /^\/man\/(\d+)\/profile\/([^/]+?)\/name$/
          ]
        }
      }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(true)
    })

    it('Must return `false` when regex not matches alias', () => {
      // Arrange
      const request = { decodedPath: '/patate/12/profile/123/name' }
      const route = {
        pathRegex () {
          return [
            /^\/users\/(\d+)\/profile\/([^/]+?)\/name$/,
            /^\/people\/(\d+)\/profile\/([^/]+?)\/name$/,
            /^\/man\/(\d+)\/profile\/([^/]+?)\/name$/
          ]
        }
      }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(false)
    })
  })
})
