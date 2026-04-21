import axios from 'axios';

let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
if (baseUrl && !baseUrl.endsWith('/api/v1')) {
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  baseUrl += '/api/v1';
}

const API_BASE_URL = baseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// --- Interfaces de Perfil ---

export interface Profile {
  id: number;
  nombre: string;
  edad: number;
  estatura_cm: number;
  genero: string;
  created_at: string;
}

export interface ProfileCreate {
  nombre: string;
  edad: number;
  estatura_cm: number;
  genero: string;
}

// --- Interfaces de Medición ---

export interface MeasurementBase {
  peso_kg: number;
  imc?: number;
  grasa_corporal_pct?: number;
  masa_muscular_kg?: number;
  agua_corporal_pct?: number;
  bmr_kcal?: number;
  edad_corporal?: number;
  peso_estandar_kg?: number;
  impedancia_ohms?: number;
  grasa_visceral?: number;
}

export interface MeasurementCreate extends MeasurementBase {
  profile_id: number;
}

export interface MeasurementResponse extends MeasurementBase {
  id: number;
  profile_id: number;
  created_at: string;
}

// --- Interfaces de Rendimiento Deportivo ---

export interface PerformanceRecord {
  id: number;
  profile_id: number;
  remate?: number;
  bloqueo?: number;
  envergadura?: number;
  created_at: string;
}

export interface PerformanceCreate {
  profile_id: number;
  remate?: number | null;
  bloqueo?: number | null;
  envergadura?: number | null;
}

// --- API Methods: Profiles ---

export const getProfiles = async (): Promise<Profile[]> => {
  const response = await api.get<Profile[]>('/profiles/');
  return response.data;
};

export const createProfile = async (profileData: ProfileCreate): Promise<Profile> => {
  const response = await api.post<Profile>('/profiles/', profileData);
  return response.data;
};

export const updateProfile = async (id: number, profileData: Partial<ProfileCreate>): Promise<Profile> => {
  const response = await api.put<Profile>(`/profiles/${id}`, profileData);
  return response.data;
};

export const deleteProfile = async (id: number): Promise<void> => {
  await api.delete(`/profiles/${id}`);
};

// --- API Methods: Measurements ---

export const getMeasurementsByProfile = async (profileId: number): Promise<MeasurementResponse[]> => {
  const response = await api.get<MeasurementResponse[]>(`/measurements/profile/${profileId}`);
  return response.data;
};

export const createMeasurement = async (measurementData: MeasurementCreate): Promise<MeasurementResponse> => {
  const response = await api.post<MeasurementResponse>('/measurements/', measurementData);
  return response.data;
};

// --- API Methods: Performance ---

export const getPerformanceByProfile = async (profileId: number): Promise<PerformanceRecord[]> => {
  const response = await api.get<PerformanceRecord[]>(`/performance/profile/${profileId}`);
  return response.data;
};

export const getAllPerformanceRecords = async (): Promise<PerformanceRecord[]> => {
  const response = await api.get<PerformanceRecord[]>('/performance/all');
  return response.data;
};

export const createPerformanceRecord = async (data: PerformanceCreate): Promise<PerformanceRecord> => {
  const response = await api.post<PerformanceRecord>('/performance/', data);
  return response.data;
};
