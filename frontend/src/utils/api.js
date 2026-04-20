import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL })

export async function getProfiles() {
  const { data } = await api.get('/api/profiles')
  return data
}

export async function createProfile(profileData) {
  const { data } = await api.post('/api/profiles', profileData)
  return data
}

export async function updateProfile(id, profileData) {
  const { data } = await api.put(`/api/profiles/${id}`, profileData)
  return data
}

export async function deleteProfile(id) {
  await api.delete(`/api/profiles/${id}`)
}

export async function getMeasurements(profileId) {
  const { data } = await api.get(`/api/measurements/${profileId}`)
  return data
}

export async function saveMeasurement(profileId, measurementData) {
  const { data } = await api.post(`/api/measurements/${profileId}`, measurementData)
  return data
}

export async function deleteMeasurement(id) {
  await api.delete(`/api/measurements/${id}`)
}

export async function exportProfiles(ids) {
  const response = await api.get('/api/export/profiles', {
    params: { profile_ids: ids.join(',') },
    responseType: 'blob',
  })
  return response.data
}
