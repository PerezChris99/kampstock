import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/pos', label: 'POS / Sales', icon: '🛒' },
  { to: '/products', label: 'Products', icon: '📦' },
  { to: '/inventory', label: 'Inventory', icon: '🏪' },
  { to: '/suppliers', label: 'Suppliers', icon: '🚚' },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: '📋' },
  { to: '/customers', label: 'Customers', icon: '👥' },
  { to: '/expenses', label: 'Expenses', icon: '💸' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/users', label: 'Users', icon: '⚙️' },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-60 bg-blue-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-blue-800">
          <h1 className="text-xl font-bold">KampStock</h1>
          <p className="text-xs text-blue-300 mt-0.5">Business Management</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-6 py-2.5 text-sm hover:bg-blue-800 transition"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-blue-800">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-blue-300">{user?.role}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-red-300 hover:text-red-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
