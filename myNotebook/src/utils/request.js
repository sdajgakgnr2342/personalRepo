import axios from 'axios'
import { getToken, removeToken } from './auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  (response) => {
    const { data } = response

    if (data && typeof data === 'object' && 'code' in data) {
      if (data.code === 0 || data.code === 200) {
        return data.data ?? data
      }

      const message = data.message || '请求失败'
      const err = new Error(message)
      err.code = data.code
      err.data = data.data
      return Promise.reject(err)
    }

    return data
  },
  (error) => {
    const status = error.response?.status
    const message =
      error.response?.data?.message || error.message || '网络异常，请稍后重试'

    const err = new Error(message)
    err.code = error.response?.data?.code
    err.data = error.response?.data?.data

    if (status === 401) {
      removeToken()
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(err)
  },
)

export function get(url, params, config = {}) {
  return request.get(url, { params, ...config })
}

export function post(url, data, config = {}) {
  return request.post(url, data, config)
}

export function put(url, data, config = {}) {
  return request.put(url, data, config)
}

export function del(url, params, config = {}) {
  return request.delete(url, { params, ...config })
}

export default request
