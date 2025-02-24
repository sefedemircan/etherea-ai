import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PrivateRoute from '../components/PrivateRoute';
import Home from './Home';
import JournalEntry from './JournalEntry';
import Analysis from './Analysis';
import Recommendations from './Recommendations';
import SignIn from './auth/SignIn';
import SignUp from './auth/SignUp';

function AppRoutes() {
  return (
    <Routes>
      {/* Kimlik doğrulama sayfaları */}
      <Route path="/auth/signin" element={<SignIn />} />
      <Route path="/auth/signup" element={<SignUp />} />

      {/* Korumalı sayfalar */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<Home />} />
        <Route path="/entry" element={<JournalEntry />} />
        <Route path="/entry/:date" element={<JournalEntry />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/recommendations" element={<Recommendations />} />
      </Route>

      {/* Bilinmeyen rotaları ana sayfaya yönlendir */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes; 