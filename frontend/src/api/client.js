import axios from 'axios'

// Read a cookie by name from document.cookie.
function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

const client = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

// Attach CSRF token to all mutating requests.
// The charlotte_csrf cookie is readable (not HttpOnly).
client.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase()
  if (method && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = getCookie('charlotte_csrf')
    if (token) {
      config.headers['X-CSRF-Token'] = token
    }
  }
  return config
})

// Unwrap the {"data": ...} envelope and dispatch a custom event on 401.
client.interceptors.response.use(
  (res) => {
    // The Go API wraps every success response as {"data": <payload>}.
    // Unwrap it so callers receive the payload directly in res.data.
    if (res.data && Object.prototype.hasOwnProperty.call(res.data, 'data')) {
      res.data = res.data.data
    }
    return res
  },
  (err) => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new Event('unauthorized'))
    }
    return Promise.reject(err)
  }
)

// Fetch a fresh CSRF token from the server and set the cookie.
export async function getCsrfToken() {
  const res = await client.get('/auth/csrf')
  return res.data.token
}

export default client
