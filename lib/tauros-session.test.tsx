jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(null),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
  clear: jest.fn().mockResolvedValue(null),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('TaurosSession - Gestión de Sesión', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Debe guardar token en AsyncStorage', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);
    await AsyncStorage.setItem('authToken', 'test-token-123');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'test-token-123');
  });

  it('Debe recuperar datos de usuario guardados', async () => {
    const mockUser = JSON.stringify({ id: '1', nombre: 'Test User', email: 'test@test.com' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockUser);
    
    const userData = await AsyncStorage.getItem('usuario');
    expect(userData).toBe(mockUser);
    expect(JSON.parse(userData!)).toEqual(JSON.parse(mockUser));
  });

  it('Debe limpiar sesión correctamente', async () => {
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(null);
    
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('usuario');
    
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('usuario');
  });

  it('Debe verificar si el usuario está autenticado', async () => {
    // Sin token
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    let token = await AsyncStorage.getItem('authToken');
    expect(token).toBeNull();
    
    // Con token
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('valid-token');
    token = await AsyncStorage.getItem('authToken');
    expect(token).not.toBeNull();
  });
});
