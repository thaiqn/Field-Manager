import { useRoute } from './router';
import { Home, CreateMeet } from './pages/Home';
import { Spectate } from './pages/Spectate';
import { Officials } from './pages/Officials';

export default function App() {
  const route = useRoute();
  if (route.page === 'spectate') return <Spectate code={route.code} />;
  if (route.page === 'official') return <Officials code={route.code} />;
  if (route.page === 'create') return <CreateMeet />;
  return <Home />;
}
