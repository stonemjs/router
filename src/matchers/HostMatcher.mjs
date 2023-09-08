export class HostMatcher {
  matches (route, requestContext) {
    if (!route.domainRegex()) return true
    return route.domainRegex().test(requestContext.host)
  }
}
