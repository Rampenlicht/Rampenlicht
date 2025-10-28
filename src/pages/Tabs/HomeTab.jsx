import UserCard from '../../components/dashboard/UserCard';
import BalanceCard from '../../components/dashboard/BalanceCard';
import RecentTransactions from '../../components/dashboard/RecentTransactions';
import QRDisplay from '../../components/dashboard/QRDisplay';

const HomeTab = ({ profile }) => {
  return (
    <div className="space-y-6">
      

      <UserCard userId={profile.id} role={profile.role} />

      <BalanceCard userId={profile.id} role={profile.role} />
      <RecentTransactions userId={profile.id} />
    </div>
  );
};

export default HomeTab;