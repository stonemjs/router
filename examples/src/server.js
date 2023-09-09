import http from 'http'

http
  .createServer(async (req, res) => {
    res.writeHead(middlewareResponse.statusCode, headers)
    middlewareResponse.content ? res.end(middlewareResponse.toJson()) : res.end()
  })
  .listen(
    5000,
    'localhost',
    () => console.log('Server started at:', 'localhost:5000')
  )