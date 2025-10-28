import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';

function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = async () => {
      if (loading) return;

      if (user) {
        // Benutzer ist eingeloggt - zum Dashboard weiterleiten
        const { data: profile } = await profileService.getProfile(user.id);
        
        if (profile) {
          if (profile.role === 'cashier') {
            navigate('/dashboards/cashier', { replace: true });
          } else {
            navigate('/dashboards/user', { replace: true });
          }
        } else {
          // Fallback wenn kein Profil
          navigate('/dashboards/user', { replace: true });
        }
      } else {
        // Nicht eingeloggt - zum Login weiterleiten
        navigate('/login', { replace: true });
      }
    };

    redirect();
  }, [user, loading, navigate]);

  // Loading-Anzeige während der Weiterleitung
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Wird weitergeleitet...</p>
      </div>
    </div>
  );
}

export default Home;

