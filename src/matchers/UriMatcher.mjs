/**
 * Class representing an UriMatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class UriMatcher {
  /**
   * matches.
   *
   * @param  {Route}   route
   * @param  {external:Request} request
   * @return {boolean}
   */
  matches (route, request) {
    return route.pathRegex().reduce((prev, curr) => prev || curr.test(request.decodedPath), false)
  }
}
