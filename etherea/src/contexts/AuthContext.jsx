import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // İlk yüklemede mevcut oturumu kontrol et
    checkUser();

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = authApi.onAuthStateChange((_event, session) => {
      //console.log('Oturum değişikliği:', _event, session?.user ?? null);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    try {
      const session = await authApi.getSession();
      //console.log('Mevcut oturum kontrolü:', session?.user ?? null);
      setUser(session?.user ?? null);
    } catch (error) {
      //console.error('Oturum kontrolü hatası:', error);
    } finally {
      setLoading(false);
    }
  }

  const value = {
    signUp: authApi.signUp,
    signIn: authApi.signIn,
    signOut: authApi.signOut,
    user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth hook\'u AuthProvider içinde kullanılmalıdır');
  }
  return context;
}; 