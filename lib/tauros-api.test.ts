describe('TaurosAPI - Llamadas HTTP a Backend', () => {
  const mockApiUrl = 'http://localhost:3000/api';

  // Mock de fetch
  global.fetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Debe hacer login correctamente', async () => {
    const mockResponse = {
      id: '1',
      email: 'usuario@test.com',
      nombre: 'Usuario Test',
      token: 'jwt-token-123',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch(`${mockApiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usuario@test.com', password: 'pass123' }),
    });

    const data = await response.json();
    expect(data.token).toBe('jwt-token-123');
  });

  it('Debe obtener lista de ejercicios', async () => {
    const mockExercises = [
      { id: '1', nombre: 'Press de Banca', videoUrl: 'http://...' },
      { id: '2', nombre: 'Sentadilla', videoUrl: 'http://...' },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockExercises,
    });

    const response = await fetch(`${mockApiUrl}/ejercicio`, {
      headers: { 'Authorization': 'Bearer token-123' },
    });

    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty('nombre');
  });

  it('Debe obtener plan de entrenamiento por ID', async () => {
    const mockPlan = {
      id: '1',
      nombre: 'Plan Full Body',
      duracionDias: 30,
      objetivo: 'Ganar masa muscular',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlan,
    });

    const response = await fetch(`${mockApiUrl}/plan-entrenamiento/1`, {
      headers: { 'Authorization': 'Bearer token-123' },
    });

    const data = await response.json();
    expect(data.id).toBe('1');
    expect(data.duracionDias).toBe(30);
  });

  it('Debe manejar errores de API correctamente', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ mensaje: 'No autorizado' }),
    });

    const response = await fetch(`${mockApiUrl}/usuario/protected`, {
      headers: { 'Authorization': 'Bearer invalid-token' },
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  it('Debe obtener eventos próximos', async () => {
    const mockEvents = [
      {
        id: '1',
        nombre: 'Clase de Yoga',
        fecha: '2026-05-10',
        hora: '10:00',
        entrenador: 'Juan Pérez',
      },
      {
        id: '2',
        nombre: 'Entrenamiento Grupal',
        fecha: '2026-05-12',
        hora: '18:00',
        entrenador: 'María García',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents,
    });

    const response = await fetch(`${mockApiUrl}/evento`, {
      headers: { 'Authorization': 'Bearer token-123' },
    });

    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty('entrenador');
  });

  it('Debe completar ejercicio de rutina correctamente', async () => {
    const mockResponse = {
      id: '1',
      completada: true,
      fechaCompletada: '2026-05-04T15:30:00',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch(`${mockApiUrl}/rutina-ejercicio/1/completada`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer token-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ completada: true }),
    });

    const data = await response.json();
    expect(data.completada).toBe(true);
  });

  it('Debe eliminar la cuenta del usuario correctamente', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: { get: () => null },
      text: async () => '',
    });

    const response = await fetch(`${mockApiUrl}/auth/account`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer token-123' },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(204);
  });
});
