/**
 * Class representing an HostMatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../Route.mjs').Route} Route
 *
 * @external Request
 * @see {@link https://github.com/stonemjs/http/blob/main/src/Request.mjs|Request}
 */
export class HostMatcher {
  /**
   * matches.
   *
   * @param  {Route}   route
   * @param  {Request} request
   * @return {boolean}
   */
  matches (route, request) {
    return !route.domainRegex() || route.domainRegex().test(request.host)
  }
}
