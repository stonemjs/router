/**
 * Class representing an HostMatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class HostMatcher {
  /**
   * matches.
   *
   * @param  {Route}   route
   * @param  {external:Request} request
   * @return {boolean}
   */
  matches (route, request) {
    return !route.domainRegex() || route.domainRegex().test(request.host)
  }
}
