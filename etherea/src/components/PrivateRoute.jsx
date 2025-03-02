import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Layout from './Layout';
import TherapistLayout from './TherapistLayout';
import AdminLayout from './AdminLayout';
import { Loader, Center } from '@mantine/core';

export default function PrivateRoute() {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  //console.log('PrivateRoute: user:', user, 'loading:', loading, 'roleLoading:', roleLoading);

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
          //console.log('Kullanıcı rolü yüklendi:', data?.role);
          setUserRole(data.role);
        } catch (error) {
          //console.error('Rol yüklenirken hata:', error);
        } finally {
          setRoleLoading(false);
        }
      } else {
        //console.log('Kullanıcı olmadığı için rol yüklenemedi');
        setRoleLoading(false);
      }
    }

    loadUserRole();
  }, [user]);

  if (loading || roleLoading) {
    //console.log('Yükleniyor durumu, henüz yönlendirme yapılmıyor');
    return (
      <Center style={{ height: '100vh' }}>
        <Loader color="etherea.4" size="lg" />
      </Center>
    );
  }

  if (!user) {
    //console.log('Kullanıcı oturum açmamış, signin sayfasına yönlendiriliyor');
    return <Navigate to="/auth/signin" />;
  }

  // Kullanıcı rolüne göre layout seç
  if (userRole === 'therapist') {
    //console.log('Terapist rolü tespit edildi, terapist layoutu gösteriliyor');
    return (
      <TherapistLayout>
        <Outlet />
      </TherapistLayout>
    );
  } else if (userRole === 'admin') {
    //console.log('Admin rolü tespit edildi, admin layoutu gösteriliyor');
    return (
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    );
  }

  //console.log('Normal kullanıcı layoutu gösteriliyor');
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
} 