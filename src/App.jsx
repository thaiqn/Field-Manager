import { useRoute } from './router';
import { Landing } from './pages/Landing';
import { Spectate } from './pages/Spectate';
import { Officials } from './pages/Officials';

export default function App() {
  const route = useRoute();
  if (route.page === 'spectate') return <Spectate code={route.code} />;
  if (route.page === 'official') return <Officials code={route.code} />;
  return (
    <div className="app-shell">
      <Landing />
    </div>
  );
}
