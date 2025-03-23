import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from '../components/PrivateRoute';
import Home from './Home';
import JournalEntry from './JournalEntry';
import JournalList from './JournalList';
import Analysis from './Analysis';
import Recommendations from './Recommendations';
import Messages from './Messages';
import TherapistList from './TherapistList';
import SignIn from './auth/SignIn';
import SignUp from './auth/SignUp';
import TherapistSignUp from './auth/TherapistSignUp';
import TherapistProfile from './therapist/Profile';
import TherapistMessages from './therapist/Messages';
import { useAuth } from '../contexts/AuthContext';
import PersonalAssistantPage from './PersonalAssistantPage';
import Appointments from './Appointments';
import VideoSession from './VideoSession';

// Admin sayfaları
import AdminDashboard from './admin/Dashboard';
import AdminTherapists from './admin/Therapists';
import AdminUsers from './admin/Users';
import AdminAppointments from './admin/Appointments';
import AdminSettings from './admin/Settings';

function AppRoutes() {
  const { user, loading } = useAuth();
  
  //console.log('AppRoutes: user:', user, 'loading:', loading);
  
  // Yükleme durumunda boş bir sayfa göster
  if (loading) {
    //console.log('AppRoutes: Yükleniyor...');
    return <div>Yükleniyor...</div>;
  }
  
  // Kullanıcı oturum açmamışsa doğrudan SignIn sayfasına yönlendir
  if (!user) {
    //console.log('AppRoutes: Kullanıcı oturum açmamış, SignIn sayfasına yönlendiriliyor');
    return (
      <Routes>
        <Route path="/auth/signin" element={<SignIn />} />
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/therapist-signup" element={<TherapistSignUp />} />
        <Route path="*" element={<Navigate to="/auth/signin" replace />} />
      </Routes>
    );
  }

  // Kullanıcı oturum açmışsa normal rotaları göster
  return (
    <Routes>
      {/* Kimlik doğrulama sayfaları */}
      <Route path="/auth/signin" element={<SignIn />} />
      <Route path="/auth/signup" element={<SignUp />} />
      <Route path="/auth/therapist-signup" element={<TherapistSignUp />} />

      {/* Korumalı sayfalar */}
      <Route element={<PrivateRoute />}>
        {/* Kullanıcı sayfaları */}
        <Route path="/" element={<Home />} />
        <Route path="/entry" element={<JournalEntry />} />
        <Route path="/entry/:date" element={<JournalEntry />} />
        <Route path="/journals" element={<JournalList />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/therapists" element={<TherapistList />} />
        <Route path="/assistant" element={<PersonalAssistantPage />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/video/:roomName" element={<VideoSession />} />

        {/* Psikolog sayfaları */}
        <Route path="/therapist/profile" element={<TherapistProfile />} />
        <Route path="/therapist/messages" element={<TherapistMessages />} />
        <Route path="/therapist/appointments" element={<Appointments />} />
        <Route path="/therapist/settings" element={<div>Ayarlar</div>} />
        
        {/* Admin sayfaları */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/therapists" element={<AdminTherapists />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/appointments" element={<AdminAppointments />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Route>

      {/* Bilinmeyen rotaları ana sayfaya yönlendir */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes; 