import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { Login } from '@/components/Auth/Login';
import { Register } from '@/components/Auth/Register';
import { ChatList } from '@/components/Chat/ChatList';
import { ChatWindow } from '@/components/Chat/ChatWindow';
import { Loader } from '@/components/Common/Loader';

const queryClient = new QueryClient();

function AuthPage({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-100 p-4 py-6">
      {children}
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ChatLayout() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  return (
    <div className="flex h-[100dvh] max-h-screen w-full overflow-hidden bg-gray-100 md:h-screen">
      {/* На мобилке: список на весь экран, при выборе чата — только чат с кнопкой «Назад» */}
      <div
        className={`h-full w-full flex-col md:w-80 md:shrink-0 ${
          selectedChatId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <ChatList selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />
      </div>
      <div
        className={`h-full min-w-0 flex-1 flex flex-col ${
          !selectedChatId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <ChatWindow chatId={selectedChatId} onBack={() => setSelectedChatId(null)} />
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage><Login /></AuthPage>} />
      <Route path="/register" element={<AuthPage><Register /></AuthPage>} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <ChatLayout />
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
