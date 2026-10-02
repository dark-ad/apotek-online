import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { NotificationDropdown } from '../common/NotificationDropdown';
import {
  Pill,
  Sparkles,
  ShoppingCart,
  FileUp,
  LogIn,
  LogOut,
  User,
  LayoutDashboard,
  Stethoscope,
  ShieldCheck,
  ChevronDown,
  Package,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onOpenCartModal: () => void;
  onOpenAuthModal: () => void;
  onOpenUploadModal: () => void;
  onNavigate: (
    view: 'home' | 'catalog' | 'profile' | 'staff-dashboard' | 'admin-dashboard' | 'checkout' | 'my-orders' | 'order-detail',
    data?: any
  ) => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCartModal,
  onOpenAuthModal,
  onOpenUploadModal,
  onNavigate,
  currentView,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setIsMobileMenuOpen(false);
    onNavigate('home');
  };

  const getRoleBadgeStyle = () => {
    if (!user) return {};
    if (user.role === 'ADMIN') return { background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' };
    if (user.role === 'STAFF') return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
    return { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
  };

  const getRoleIcon = () => {
    if (!user) return null;
    if (user.role === 'ADMIN') return <ShieldCheck size={12} />;
    if (user.role === 'STAFF') return <Stethoscope size={12} />;
    return <User size={12} />;
  };

  const getDashboardLabel = () => {
    if (!user) return '';
    if (user.role === 'ADMIN') return 'Dashboard Admin';
    if (user.role === 'STAFF') return 'Dashboard Staf';
    return 'Profil Saya';
  };

  const getDashboardView = (): 'profile' | 'staff-dashboard' | 'admin-dashboard' => {
    if (!user) return 'profile';
    if (user.role === 'ADMIN') return 'admin-dashboard';
    if (user.role === 'STAFF') return 'staff-dashboard';
    return 'profile';
  };

  const navigateAndClose = (view: any, data?: any) => {
    onNavigate(view, data);
    setIsMobileMenuOpen(false);
    setShowUserMenu(false);
  };

  return (
    <header className="navbar" role="banner">
      <div className="container">
        <div className="navbar-inner">
          {/* Logo & Brand */}
          <a
            href="#"
            className="nav-brand"
            onClick={(e) => {
              e.preventDefault();
              navigateAndClose('home');
            }}
            aria-label="Apotek Sehat AI Beranda"
          >
            <div className="brand-icon-box">
              <Pill size={22} />
            </div>
            <div>
              <span>Apotek</span>
              <span className="gradient-text-emerald">Sehat</span>
              <span className="brand-tag-ai">AI</span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="desktop-nav" aria-label="Navigasi Utama">
            <ul className="nav-links">
              <li>
                <a
                  href="#katalog"
                  className={`nav-link${currentView === 'catalog' ? ' active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateAndClose('catalog');
                  }}
                >
                  Katalog Obat
                </a>
              </li>
              <li>
                <a
                  href="#ai-assistant"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateAndClose('catalog');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Sparkles size={15} color="#8b5cf6" />
                  <span>AI Assistant</span>
                </a>
              </li>
              <li>
                <a
                  href="#upload-resep"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenUploadModal();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <FileUp size={15} color="#059669" />
                  <span>Upload Resep</span>
                </a>
              </li>
              {isAuthenticated && user && (
                <li>
                  <a
                    href="#dashboard"
                    className={`nav-link${
                      currentView === 'profile' ||
                      currentView === 'staff-dashboard' ||
                      currentView === 'admin-dashboard'
                        ? ' active'
                        : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateAndClose(getDashboardView());
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <LayoutDashboard size={15} color="#0284c7" />
                    <span>{getDashboardLabel()}</span>
                  </a>
                </li>
              )}
              {isAuthenticated && user?.role === 'CUSTOMER' && (
                <li>
                  <a
                    href="#pesanan-saya"
                    className={`nav-link${
                      currentView === 'my-orders' || currentView === 'order-detail' ? ' active' : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateAndClose('my-orders');
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Package size={15} color="#059669" />
                    <span>Pesanan Saya</span>
                  </a>
                </li>
              )}
            </ul>
          </nav>

          {/* Action Center */}
          <div className="nav-actions">
            {/* Notification Center Dropdown */}
            <NotificationDropdown onNavigate={navigateAndClose} />

            {/* Cart Button */}
            <button
              className="btn btn-secondary btn-icon-only"
              onClick={onOpenCartModal}
              title="Keranjang Belanja"
              style={{ position: 'relative' }}
              aria-label={`Keranjang Belanja (${cartCount} item)`}
            >
              <ShoppingCart size={19} />
              {cartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: 'var(--primary-600)',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ffffff',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* Auth Section */}
            {isAuthenticated && user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  aria-expanded={showUserMenu}
                  aria-label="Menu pengguna"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#ffffff',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.4rem 0.75rem',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-nav-text" style={{ textAlign: 'left', lineHeight: 1.2 }}>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--secondary-900)',
                        maxWidth: '90px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        ...getRoleBadgeStyle(),
                        borderRadius: '3px',
                        padding: '1px 4px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        marginTop: '1px',
                      }}
                    >
                      {getRoleIcon()}
                      <span>{user.role}</span>
                    </div>
                  </div>
                  <ChevronDown
                    size={14}
                    color="#94a3b8"
                    style={{
                      transform: showUserMenu ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s',
                    }}
                  />
                </button>

                {showUserMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: '#ffffff',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      minWidth: '210px',
                      zIndex: 100,
                      overflow: 'hidden',
                      animation: 'fadeIn 0.15s ease-out',
                    }}
                  >
                    {/* User Info Header */}
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        borderBottom: '1px solid var(--border-light)',
                        background: 'var(--secondary-50)',
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary-900)' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', marginTop: '1px' }}>
                        {user.email}
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div style={{ padding: '0.35rem' }}>
                      <button
                        onClick={() => navigateAndClose(getDashboardView())}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.6rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--secondary-700)',
                          textAlign: 'left',
                        }}
                      >
                        <LayoutDashboard size={15} color="#0284c7" />
                        {getDashboardLabel()}
                      </button>

                      {user.role === 'CUSTOMER' && (
                        <button
                          onClick={() => navigateAndClose('my-orders')}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.6rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: 'var(--secondary-700)',
                            textAlign: 'left',
                          }}
                        >
                          <Package size={15} color="#059669" />
                          Pesanan Saya
                        </button>
                      )}

                      <button
                        onClick={handleLogout}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.6rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: '#dc2626',
                          textAlign: 'left',
                        }}
                      >
                        <LogOut size={15} />
                        Keluar dari Akun
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<LogIn size={15} />}
                onClick={onOpenAuthModal}
              >
                Masuk / Daftar
              </Button>
            )}

            {/* Mobile Menu Hamburger Toggle */}
            <button
              className="btn btn-secondary btn-icon-only mobile-toggle-btn"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Buka menu navigasi mobile"
              aria-expanded={isMobileMenuOpen}
              style={{ display: 'none' }}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div
            className="mobile-nav-drawer"
            style={{
              padding: '1rem 0',
              borderTop: '1px solid var(--border-light)',
              animation: 'slideDown 0.2s ease-out',
            }}
          >
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <button
                  onClick={() => navigateAndClose('catalog')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: currentView === 'catalog' ? 'var(--primary-50)' : 'transparent',
                    color: currentView === 'catalog' ? 'var(--primary-700)' : 'var(--secondary-700)',
                    fontWeight: currentView === 'catalog' ? 700 : 500,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  Katalog Obat
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenUploadModal();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--secondary-700)',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  <FileUp size={16} color="#059669" />
                  Upload Resep Dokter
                </button>
              </li>
              {isAuthenticated && user && (
                <li>
                  <button
                    onClick={() => navigateAndClose(getDashboardView())}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--secondary-700)',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <LayoutDashboard size={16} color="#0284c7" />
                    {getDashboardLabel()}
                  </button>
                </li>
              )}
              {isAuthenticated && user?.role === 'CUSTOMER' && (
                <li>
                  <button
                    onClick={() => navigateAndClose('my-orders')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: currentView === 'my-orders' ? 'var(--primary-50)' : 'transparent',
                      color: currentView === 'my-orders' ? 'var(--primary-700)' : 'var(--secondary-700)',
                      fontWeight: currentView === 'my-orders' ? 700 : 500,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Package size={16} color="#059669" />
                    Pesanan Saya
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Backdrop overlay for user menu */}
      {showUserMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
};
