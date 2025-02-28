import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PrivateRoute from '../components/PrivateRoute';
import Home from './Home';
import JournalEntry from './JournalEntry';
import JournalList from './JournalList';
import Analysis from './Analysis';
import Recommendations from './Recommendations';
import SignIn from './auth/SignIn';
import SignUp from './auth/SignUp';
import TherapistSignUp from './auth/TherapistSignUp';
import TherapistProfile from './therapist/Profile';

function AppRoutes() {
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

        {/* Psikolog sayfaları */}
        <Route path="/therapist/profile" element={<TherapistProfile />} />
        <Route path="/therapist/appointments" element={<div>Randevularım</div>} />
        <Route path="/therapist/messages" element={<div>Mesajlarım</div>} />
        <Route path="/therapist/settings" element={<div>Ayarlar</div>} />
      </Route>

      {/* Bilinmeyen rotaları ana sayfaya yönlendir */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes; 