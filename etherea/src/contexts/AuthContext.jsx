import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/supabase';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // İlk yüklemede mevcut oturumu kontrol et
    checkUser();

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = authApi.onAuthStateChange((_event, session) => {
      //console.log('Oturum değişikliği:', _event, session?.user ?? null);
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        fetchUserRole(newUser.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Rol getirme hatası:', error);
        setUserRole('user'); // Varsayılan olarak normal kullanıcı
      } else {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Rol getirme hatası:', error);
      setUserRole('user'); // Hata durumunda varsayılan rol
    } finally {
      setLoading(false);
    }
  }

  async function checkUser() {
    try {
      const session = await authApi.getSession();
      //console.log('Mevcut oturum kontrolü:', session?.user ?? null);
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        fetchUserRole(newUser.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    } catch (error) {
      //console.error('Oturum kontrolü hatası:', error);
      setLoading(false);
    }
  }

  const value = {
    signUp: authApi.signUp,
    signIn: authApi.signIn,
    signOut: authApi.signOut,
    user,
    userRole,
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