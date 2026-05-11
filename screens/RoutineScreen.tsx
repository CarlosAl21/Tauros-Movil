import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { useOfflineRoutine } from '../hooks/useOfflineRoutine';
import api from '../lib/apiClient';

export default function RoutineScreen({ route }: any) {
  const { routineId } = route.params ?? { routineId: 'demo' };
  const { user } = useAuth();
  const { getRoutine, saveRoutineForOffline, queueOfflineAction, flushQueueIfOnline } = useOfflineRoutine();
  const [routine, setRoutine] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const local = await getRoutine(routineId);
      if (local) {
        setRoutine(local.data);
      } else {
        // try fetching from backend
        setLoading(true);
        try {
          const res = await api.get(`/rutina/${routineId}`);
          setRoutine(res.data);
        } catch (e) {
          // offline or error
        } finally { setLoading(false); }
      }
    })();
  }, [routineId]);

  async function handleDownload() {
    if (!routine) return;
    setLoading(true);
    await saveRoutineForOffline(routineId, routine);
    setLoading(false);
  }

  async function handleCompleteSet(exerciseId: string) {
    // example offline action: submit progress later
    const action = { method: 'post', url: `/progress`, body: { userId: user?.userId, routineId, exerciseId, timestamp: Date.now() } };
    await queueOfflineAction(action);
    // try flush
    await flushQueueIfOnline(api);
  }

  if (loading) return <ActivityIndicator />;
  if (!routine) return <View><Text>No hay rutina disponible</Text></View>;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold' }}>{routine.title ?? 'Rutina'}</Text>
      <Button title="Descargar para uso offline" onPress={handleDownload} />
      {routine.exercises?.map((ex: any) => (
        <View key={ex.id} style={{ marginTop: 12 }}>
          <Text>{ex.name}</Text>
          <Button title="Marcar serie completada (offline)" onPress={() => handleCompleteSet(ex.id)} />
        </View>
      ))}
    </View>
  );
}
