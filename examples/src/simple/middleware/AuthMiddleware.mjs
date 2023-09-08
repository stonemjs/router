export default class AuthMiddleware {
  handleRequest(request) {
    if (!request.headers.authorization) {
      throw new Error(Response.HTTP_UNAUTHORIZED)
    }
  }

  handleResponse(request, response) {}
}