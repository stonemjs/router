export class HostMatcher {
  matches (route, request) {
    if (!route.getHostRegex()) return true
    return RegExp(`^${route.getHostRegex()}$`, 'g').test(request.host)
  }
}