const API_BASE_URL = 'http://localhost:8000/api/v1';

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

export const getProfiles = async (): Promise<Profile[]> => {
  const response = await fetch(`${API_BASE_URL}/profiles/`);
  if (!response.ok) {
    throw new Error('Error al obtener los perfiles');
  }
  return response.json();
};

export const createProfile = async (profileData: ProfileCreate): Promise<Profile> => {
  const response = await fetch(`${API_BASE_URL}/profiles/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  
  if (!response.ok) {
    throw new Error('Error al crear el perfil');
  }
  return response.json();
};
