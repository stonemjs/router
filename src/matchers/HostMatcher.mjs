export class HostMatcher {
  matches (route, request) {
    return !route.domainRegex() || route.domainRegex().test(request.host)
  }
}
