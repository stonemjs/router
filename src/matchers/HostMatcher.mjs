export class HostMatcher {
  matches (route, request) {
    if (!route.domainRegex()) return true
    return route.domainRegex().test(request.host)
  }
}
