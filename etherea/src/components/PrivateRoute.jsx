import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Layout from './Layout';
import TherapistLayout from './TherapistLayout';

export default function PrivateRoute() {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    async function loadUserRole() {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          setUserRole(data.role);
        } catch (error) {
          console.error('Rol yüklenirken hata:', error);
        } finally {
          setRoleLoading(false);
        }
      }
    }

    loadUserRole();
  }, [user]);

  if (loading || roleLoading) {
    return null; // veya bir yükleme göstergesi
  }

  if (!user) {
    return <Navigate to="/auth/signin" />;
  }

  // Kullanıcı rolüne göre layout seç
  if (userRole === 'therapist') {
    return <TherapistLayout />;
  }

  return <Layout />;
} 