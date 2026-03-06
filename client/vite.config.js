export default {
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/listings': 'http://localhost:5000',
    }
  }
}