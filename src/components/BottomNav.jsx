import { Home, History, User, Scan, Users } from 'lucide-react';

const BottomNav = ({ activeTab, setActiveTab, role }) => {
  const userTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'verlauf', label: 'Verlauf', icon: History },
    { id: 'profil', label: 'Profil', icon: User },
  ];

  const kassiererTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'verlauf', label: 'Verlauf', icon: History },
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'scanner', label: 'Scanner', icon: Scan },
    { id: 'user', label: 'User', icon: Users },
  ];

  const tabs = role === 'kassierer' ? kassiererTabs : userTabs;
  const activeColorLight = role === 'kassierer' ? 'text-green-600' : 'text-blue-600';
  const activeColorDark = role === 'kassierer' ? 'dark:text-green-400' : 'dark:text-blue-400';

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg transition-colors duration-300 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? `${activeColorLight} ${activeColorDark} font-semibold`
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
