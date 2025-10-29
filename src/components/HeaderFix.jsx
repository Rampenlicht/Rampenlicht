const HeaderFix = ({ activeTab }) => {
  const getTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'Dashboard';
      case 'verlauf':
        return 'Verlauf';
      case 'transactions':
        return 'Transaktionen';
      case 'users':
        return 'Benutzerliste';
      case 'user':
        return 'Benutzerliste';
      case 'cash':
        return 'Kassensystem';
      case 'scanner':
        return 'QR-Scanner';
      case 'profil':
        return 'Profil';
      case 'profile':
        return 'Profil';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-white/20 dark:border-gray-700/20 shadow-sm z-40 transition-colors duration-300 pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {getTitle()}
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderFix;

