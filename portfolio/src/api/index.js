const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

let authToken = null

export const setToken = (token) => { authToken = token }
export const clearToken = () => { authToken = null }
export const getToken = () => authToken

const headers = (isAdmin = false, isMultipart = false) => {
  const h = {}
  if (!isMultipart) h['Content-Type'] = 'application/json'
  if (isAdmin && authToken) h['Authorization'] = `Bearer ${authToken}`
  return h
}

const req = async (method, path, body = null, isAdmin = false, isMultipart = false) => {
  const opts = {
    method,
    headers: headers(isAdmin, isMultipart),
  }
  if (body) opts.body = isMultipart ? body : JSON.stringify(body)
  const res = await fetch(`${BASE_URL}${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// Auth
export const verifyPasskey = (passkey) => req('POST', '/api/auth/verify', { passkey })

// Profile
export const getProfile = () => req('GET', '/api/profile')
export const updateProfile = (data) => req('PATCH', '/api/admin/profile', data, true)

// Categories
export const getCategories = () => req('GET', '/api/categories')
export const createCategory = (data) => req('POST', '/api/admin/categories', data, true)
export const updateCategory = (id, data) => req('PATCH', `/api/admin/categories/${id}`, data, true)
export const deleteCategory = (id) => req('DELETE', `/api/admin/categories/${id}`, null, true)

// Skills
export const getSkills = (categoryId) => req('GET', `/api/skills${categoryId ? `?category_id=${categoryId}` : ''}`)
export const createSkill = (data) => req('POST', '/api/admin/skills', data, true)
export const updateSkill = (id, data) => req('PATCH', `/api/admin/skills/${id}`, data, true)
export const deleteSkill = (id) => req('DELETE', `/api/admin/skills/${id}`, null, true)

// Projects
export const getProjects = (params = {}) => {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.featured) q.set('featured', 'true')
  return req('GET', `/api/projects${q.toString() ? `?${q}` : ''}`)
}
export const getProject = (slug) => req('GET', `/api/projects/${slug}`)
export const createProject = (data) => req('POST', '/api/admin/projects', data, true)
export const updateProject = (id, data) => req('PATCH', `/api/admin/projects/${id}`, data, true)
export const deleteProject = (id) => req('DELETE', `/api/admin/projects/${id}`, null, true)
export const uploadProjectImage = (id, formData) => req('POST', `/api/admin/projects/${id}/images`, formData, true, true)
export const deleteProjectImage = (imageId) => req('DELETE', `/api/admin/projects/images/${imageId}`, null, true)

// Experiences
export const getExperiences = () => req('GET', '/api/experiences')
export const createExperience = (data) => req('POST', '/api/admin/experiences', data, true)
export const updateExperience = (id, data) => req('PATCH', `/api/admin/experiences/${id}`, data, true)
export const deleteExperience = (id) => req('DELETE', `/api/admin/experiences/${id}`, null, true)

// Education
export const getEducation = () => req('GET', '/api/education')
export const createEducation = (data) => req('POST', '/api/admin/education', data, true)
export const updateEducation = (id, data) => req('PATCH', `/api/admin/education/${id}`, data, true)
export const deleteEducation = (id) => req('DELETE', `/api/admin/education/${id}`, null, true)

// Upload & Media
export const uploadFile = (file, bucket = 'misc') => {
  const form = new FormData()
  form.append('file', file)
  form.append('bucket', bucket)
  return req('POST', '/api/admin/upload', form, true, true)
}
export const deleteFile = (path) => req('DELETE', '/api/admin/upload', { path }, true)
export const imgUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${BASE_URL}${url}`
}

// Resume
// checkResume: raw fetch — HEAD returns no body so we must NOT use req() which calls res.json()
export const checkResume = () =>
  fetch(`${BASE_URL}/api/resume`, { method: 'HEAD' })
    .then(r => r.ok)
    .catch(() => false)

export const uploadResume = (file) => {
  const form = new FormData()
  form.append('file', file)
  return req('POST', '/api/admin/resume/upload', form, true, true)
}

export const deleteResume = () => req('DELETE', '/api/admin/resume', null, true)