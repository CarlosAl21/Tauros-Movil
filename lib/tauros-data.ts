export type SuggestionType = 'EVENTO' | 'RUTINA' | 'EJERCICIO';

export type TaurosMachine = {
  numero: string;
  nombre: string;
};

export type TaurosExercise = {
  id: string;
  nombre: string;
  categoria: string;
  tipo: string;
  linkVideo: string;
  linkAM?: string;
  maquina: TaurosMachine | null;
  series: string;
  repeticiones: string;
  descanso: string;
  cargaSugerida: string;
  notas: string;
  musculos: string[];
  activacion: string[];
  thumbnail: string;
};

export type TaurosPlanExercise = {
  rutinaEjercicioId?: string;
  exerciseId: string;
  orden: number;
  series: string;
  repeticiones: string;
  carga: string;
  notas: string;
  completado: boolean;
};

export type TaurosPlanDay = {
  id: string;
  numeroDia: number;
  nombre: string;
  descripcion: string;
  descansoSegundos: number;
  finalizada: boolean;
  ejercicios: TaurosPlanExercise[];
};

export type TaurosPlan = {
  id: string;
  nombre: string;
  descripcion: string;
  objetivo: string;
  duracionDias: number;
  esPlantilla: boolean;
  activo: boolean;
  dias: TaurosPlanDay[];
};

export type TaurosEvent = {
  id: string;
  nombre: string;
  fechaHora: string;
  lugar: string;
  descripcion: string;
  asistentes: number;
  cupo: number;
  activo: boolean;
  inscrito?: boolean;
};

export type TaurosSchedule = {
  dia: string;
  apertura: string;
  cierre: string;
  detalle: string;
  destacado?: boolean;
};

export type TaurosSuggestion = {
  id: string;
  tipoEntidad: SuggestionType;
  entidadId: string;
  contenido: string;
  actividad: string;
  solucionada?: boolean;
};

export const taurosProfile = {
  nombre: 'Luis Andrade',
  correo: 'luis.andrade@tauros.com',
  telefono: '+593 99 742 1108',
  cedula: '0912345678',
  peso: 78.4,
  rol: 'user',
  googleLinked: false,
};

export const taurosSchedules: TaurosSchedule[] = [
  { dia: 'Lunes', apertura: '05:30', cierre: '22:00', detalle: 'Horario fuerte para pierna y tren superior', destacado: true },
  { dia: 'Martes', apertura: '05:30', cierre: '22:00', detalle: 'Clases funcionales y cardio controlado' },
  { dia: 'Miercoles', apertura: '05:30', cierre: '22:00', detalle: 'Horario regular con área de pesas completa' },
  { dia: 'Jueves', apertura: '05:30', cierre: '22:00', detalle: 'Sesiones de técnica y movilidad' },
  { dia: 'Viernes', apertura: '05:30', cierre: '22:00', detalle: 'Pico de asistencia por la tarde' },
  { dia: 'Sabado', apertura: '07:00', cierre: '18:00', detalle: 'Horario corto para planes express' },
  { dia: 'Domingo', apertura: 'Cerrado', cierre: 'Cerrado', detalle: 'Descanso y mantenimiento del gimnasio' },
];

export const taurosExercises: TaurosExercise[] = [
  {
    id: 'sentadilla-hack',
    nombre: 'Sentadilla En Hack',
    categoria: 'Pierna',
    tipo: 'Fuerza',
    linkVideo: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    linkAM: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80',
    maquina: { numero: '11', nombre: 'Hack Squat' },
    series: '3 x 8 a 10',
    repeticiones: '8 a 10',
    descanso: '00:45',
    cargaSugerida: '0.0 kg',
    notas: 'Mantener la espalda pegada al respaldo y bajar con control.',
    musculos: ['Gluteos', 'Cuadriceps', 'Gemelos'],
    activacion: ['Cuadriceps', 'Gluteos'],
    thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'press-pecho-maquina',
    nombre: 'Press De Pecho En Maquina',
    categoria: 'Pecho',
    tipo: 'Empuje',
    linkVideo: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    linkAM: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
    maquina: { numero: '4', nombre: 'Chest Press' },
    series: '4 x 10 a 12',
    repeticiones: '10 a 12',
    descanso: '01:00',
    cargaSugerida: '12.5 kg',
    notas: 'Juntar escapulas y evitar extender del todo los codos.',
    musculos: ['Pectoral', 'Triceps', 'Deltoides'],
    activacion: ['Pectoral', 'Triceps'],
    thumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'jalon-pecho',
    nombre: 'Jalon Al Pecho',
    categoria: 'Espalda',
    tipo: 'Tiron',
    linkVideo: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    linkAM: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80',
    maquina: { numero: '8', nombre: 'Lat Pulldown' },
    series: '4 x 10',
    repeticiones: '10',
    descanso: '00:50',
    cargaSugerida: '18.0 kg',
    notas: 'Traer la barra al pecho sin balancear el tronco.',
    musculos: ['Dorsal', 'Biceps', 'Deltoides Posterior'],
    activacion: ['Dorsal', 'Biceps'],
    thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'peso-muerto-rumano',
    nombre: 'Peso Muerto Rumano',
    categoria: 'Posterior',
    tipo: 'Bisagra',
    linkVideo: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    linkAM: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
    maquina: null,
    series: '3 x 12',
    repeticiones: '12',
    descanso: '01:15',
    cargaSugerida: '20.0 kg',
    notas: 'Cadera atrás, columna neutra y recorrido completo.',
    musculos: ['Femorales', 'Gluteos', 'Core'],
    activacion: ['Femorales', 'Gluteos'],
    thumbnail: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80',
  },
];

export const taurosPlans: TaurosPlan[] = [
  {
    id: 'entrenamiento-b',
    nombre: 'Entrenamiento B',
    descripcion: 'Rutina de volumen controlado con enfoque en técnica y consistencia diaria.',
    objetivo: 'Ganar fuerza y cumplir rutina diaria',
    duracionDias: 4,
    esPlantilla: false,
    activo: true,
    dias: [
      {
        id: 'dia-1',
        numeroDia: 1,
        nombre: 'Pierna y estabilidad',
        descripcion: 'Trabajo principal en cuádriceps, glúteos y gemelos.',
        ejercicios: [
          { exerciseId: 'sentadilla-hack', orden: 1, series: '3', repeticiones: '8 a 10', carga: '0.0 kg', notas: 'Subir la carga solo si la técnica se mantiene', completado: false },
          { exerciseId: 'peso-muerto-rumano', orden: 2, series: '3', repeticiones: '12', carga: '20.0 kg', notas: 'Pausa de 1 segundo en la bajada', completado: true },
        ],
      },
      {
        id: 'dia-2',
        numeroDia: 2,
        nombre: 'Empuje controlado',
        descripcion: 'Sesión de pecho, hombro y tríceps para mantener continuidad.',
        ejercicios: [
          { exerciseId: 'press-pecho-maquina', orden: 1, series: '4', repeticiones: '10 a 12', carga: '12.5 kg', notas: 'No bloquear codos al final', completado: false },
          { exerciseId: 'jalon-pecho', orden: 2, series: '3', repeticiones: '10', carga: '18.0 kg', notas: 'Descenso lento y controlado', completado: false },
        ],
      },
      {
        id: 'dia-3',
        numeroDia: 3,
        nombre: 'Tiron y postura',
        descripcion: 'Espalda y bíceps con foco en estabilidad escapular.',
        ejercicios: [
          { exerciseId: 'jalon-pecho', orden: 1, series: '4', repeticiones: '10', carga: '18.0 kg', notas: 'Pecho arriba y abdomen firme', completado: false },
          { exerciseId: 'peso-muerto-rumano', orden: 2, series: '3', repeticiones: '12', carga: '20.0 kg', notas: 'Mantener tensión en isquiotibiales', completado: false },
        ],
      },
      {
        id: 'dia-4',
        numeroDia: 4,
        nombre: 'Recuperacion activa',
        descripcion: 'Cardio suave, movilidad y repaso de cargas.',
        ejercicios: [
          { exerciseId: 'sentadilla-hack', orden: 1, series: '2', repeticiones: '15', carga: 'Ligera', notas: 'Solo técnica y rango completo', completado: false },
        ],
      },
    ],
  },
  {
    id: 'rendimiento-avanzado',
    nombre: 'Rendimiento Avanzado',
    descripcion: 'Bloque para usuarios con mayor experiencia y control de cargas.',
    objetivo: 'Hipertrofia y potencia',
    duracionDias: 5,
    esPlantilla: true,
    activo: false,
    dias: [
      {
        id: 'dia-5',
        numeroDia: 1,
        nombre: 'Empuje pesado',
        descripcion: 'Cargas altas y descansos más amplios.',
        ejercicios: [
          { exerciseId: 'press-pecho-maquina', orden: 1, series: '5', repeticiones: '6 a 8', carga: '22.5 kg', notas: 'Si falla la técnica, bajar 10%', completado: false },
        ],
      },
    ],
  },
];

export const taurosEvents: TaurosEvent[] = [
  {
    id: 'evento-clase-funcional',
    nombre: 'Clase Funcional Nocturna',
    fechaHora: '2026-05-02T18:30:00-05:00',
    lugar: 'Sala multifuncional',
    descripcion: 'Sesión especial con bloques cortos de fuerza y cardio.',
    asistentes: 18,
    cupo: 25,
    activo: true,
  },
  {
    id: 'evento-reto-fuerza',
    nombre: 'Reto De Fuerza 30 Dias',
    fechaHora: '2026-05-08T07:00:00-05:00',
    lugar: 'Zona de pesas',
    descripcion: 'Competencia interna para mejorar cargas y constancia.',
    asistentes: 12,
    cupo: 30,
    activo: true,
  },
  {
    id: 'evento-taller-tecnica',
    nombre: 'Taller De Tecnica En Maquinas',
    fechaHora: '2026-05-12T16:00:00-05:00',
    lugar: 'Area funcional',
    descripcion: 'Aprende a ajustar asientos, respaldos y rangos seguros.',
    asistentes: 9,
    cupo: 20,
    activo: true,
  },
];

export const taurosSuggestions: TaurosSuggestion[] = [
  {
    id: 'sug-rutina-1',
    tipoEntidad: 'RUTINA',
    entidadId: 'entrenamiento-b',
    actividad: 'Entrenamiento B',
    contenido: 'Registra la carga de cada serie para ver tu progreso real al final de la semana.',
  },
  {
    id: 'sug-rutina-2',
    tipoEntidad: 'RUTINA',
    entidadId: 'entrenamiento-b',
    actividad: 'Entrenamiento B',
    contenido: 'Si faltas un día, completa el siguiente sin duplicar volumen para no sobrecargarte.',
  },
  {
    id: 'sug-ej-1',
    tipoEntidad: 'EJERCICIO',
    entidadId: 'sentadilla-hack',
    actividad: 'Sentadilla En Hack',
    contenido: 'Ajusta el asiento para que la rodilla no cierre demasiado en la parte baja.',
  },
  {
    id: 'sug-ej-2',
    tipoEntidad: 'EJERCICIO',
    entidadId: 'press-pecho-maquina',
    actividad: 'Press De Pecho En Maquina',
    contenido: 'Mantén las escápulas retraídas y evita despegar la espalda del respaldo.',
  },
  {
    id: 'sug-evento-1',
    tipoEntidad: 'EVENTO',
    entidadId: 'evento-clase-funcional',
    actividad: 'Clase Funcional Nocturna',
    contenido: 'Llega 15 minutos antes para reservar espacio y calentar correctamente.',
  },
  {
    id: 'sug-evento-2',
    tipoEntidad: 'EVENTO',
    entidadId: 'evento-taller-tecnica',
    actividad: 'Taller De Tecnica En Maquinas',
    contenido: 'Lleva tu libreta para registrar ajustes de máquinas y recomendaciones del coach.',
  },
];

export function getExerciseById(id: string | undefined) {
  return taurosExercises.find((exercise) => exercise.id === id);
}

export function getPlanById(id: string | undefined) {
  return taurosPlans.find((plan) => plan.id === id);
}

export function getEventById(id: string | undefined) {
  return taurosEvents.find((event) => event.id === id);
}

export function getSuggestionsByType(type: SuggestionType, entityId?: string) {
  return taurosSuggestions.filter((item) => item.tipoEntidad === type && (!entityId || item.entidadId === entityId));
}

export function formatTaurosDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatTaurosDay(value: string) {
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(value));
}
