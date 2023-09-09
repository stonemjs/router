import { Service } from "@noowow-community/service-container"

@Service({
  singleton: true
})
export class AuthMiddleware {
  handleRequest(request) {
    if (!request.headers.authorization) {
      throw new Error(Response.HTTP_UNAUTHORIZED)
    }
  }

  handleResponse(request, response) {}
}