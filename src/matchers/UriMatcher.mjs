/**
 * Class representing an UriMatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../Route.mjs').Route} Route
 *
 * @external Request
 * @see {@link https://github.com/stonemjs/http/blob/main/src/Request.mjs|Request}
 */
export class UriMatcher {
  /**
   * matches.
   *
   * @param  {Route}   route
   * @param  {Request} request
   * @return {boolean}
   */
  matches (route, request) {
    return route.uriRegex().test(request.decodedPath)
  }
}
