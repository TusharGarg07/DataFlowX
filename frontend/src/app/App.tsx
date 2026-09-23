import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from '../features/auth';
import { AppRouter } from './router';

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryProvider>
  );
}