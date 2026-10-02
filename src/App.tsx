import React, { useState } from 'react';
import { MEDICINES_DATA } from './data/mockData';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/home/HeroSection';
import { CategoryGrid } from './components/home/CategoryGrid';
import { FeaturedProducts } from './components/home/FeaturedProducts';
import { AIAssistantTeaser } from './components/home/AIAssistantTeaser';
import { PrescriptionBanner } from './components/home/PrescriptionBanner';
import { RoleFlowSection } from './components/home/RoleFlowSection';
import { Modal } from './components/common/Modal';
import { Button } from './components/common/Button';
import { AuthModal } from './components/auth/AuthModal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CustomerProfileView } from './components/dashboard/CustomerProfileView';
import { StaffDashboardView } from './components/dashboard/StaffDashboardView';
import { AdminDashboardView } from './components/dashboard/AdminDashboardView';
import { MedicineCatalogView } from './components/catalog/MedicineCatalogView';
import { CartDrawerModal } from './components/cart/CartDrawerModal';
import { CheckoutView } from './components/checkout/CheckoutView';
import { OrderSuccessView } from './components/order/OrderSuccessView';
import { MyOrdersView } from './components/order/MyOrdersView';
import { OrderDetailView } from './components/order/OrderDetailView';
import { DbMedicine } from './services/medicineService';
import { OrderData } from './services/orderService';
import { AIChatWidget, AIFloatingButton } from './components/ai/AIChatWidget';
import { ToastProvider, useToast } from './context/ToastContext';
import { ToastContainer } from './components/common/ToastContainer';
import { NotificationProvider } from './context/NotificationContext';
import { 
  CheckCircle, 
  UploadCloud,
  Sparkles
} from 'lucide-react';

// Inner app that accesses AuthContext, CartContext, and ToastContext
const AppInner: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { totalCount, addItem, items: cartItems } = useCart();
  const toast = useToast();

  // Navigation State
  type AppView = 
    | 'home' 
    | 'catalog' 
    | 'profile' 
    | 'staff-dashboard' 
    | 'admin-dashboard'
    | 'checkout'
    | 'order-success'
    | 'my-orders'
    | 'order-detail';

  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<OrderData | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activePromptIndex, setActivePromptIndex] = useState<number>(0);

  // Modals state
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState<boolean>(false);

  // Cart operations via server-side CartContext with Toast feedback
  const handleAddToCart = async (medicine: DbMedicine | any, quantity: number = 1) => {
    if (!isAuthenticated) {
      toast.info('Silakan masuk ke akun Pembeli (Customer) terlebih dahulu untuk menambahkan obat ke keranjang.');
      setIsAuthOpen(true);
      return;
    }

    if (user?.role !== 'CUSTOMER') {
      toast.warning(`Fitur keranjang belanja hanya tersedia untuk akun CUSTOMER (Akun Anda: ${user?.role}).`);
      return;
    }

    if (medicine.stock <= 0) {
      toast.error(`Maaf, stok obat "${medicine.name}" saat ini habis (Stok: 0).`);
      return;
    }

    const res = await addItem(medicine.id, quantity);
    if (res.success) {
      toast.success(`"${medicine.name}" berhasil ditambahkan ke keranjang!`);
      setIsCartOpen(true);
    } else {
      toast.error(res.message || 'Gagal menambahkan produk ke keranjang.');
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthOpen(false);
    toast.success(`Selamat datang kembali, ${user?.name || 'Pelanggan'}!`);
  };

  const handleOrderCreated = (order: OrderData) => {
    setLastCreatedOrder(order);
    setSelectedOrderId(order.id);
    setCurrentView('order-success');
  };

  const handleViewOrderDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentView('order-detail');
  };

  const handleNavigate = (view: AppView, data?: any) => {
    setCurrentView(view);
    if (view === 'order-detail' && data?.orderId) {
      setSelectedOrderId(data.orderId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-layout">
      {/* Top Banner */}
      <div style={{ background: 'linear-gradient(90deg, #064e3b, #0c4a6e)', color: '#ffffff', padding: '0.45rem 1rem', fontSize: '0.8rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Sparkles size={14} color="#34d399" />
        <span>
          <strong>Apotek Sehat AI:</strong> Platform pemesanan obat modern dengan AI Assistant & verifikasi resep digital resmi.
        </span>
      </div>

      {/* Main Sticky Navbar */}
      <Navbar
        cartCount={totalCount}
        onOpenCartModal={() => setIsCartOpen(true)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenUploadModal={() => setIsUploadOpen(true)}
        onNavigate={handleNavigate}
        currentView={currentView}
      />

      {/* Main Content — View Router */}
      {currentView === 'home' && (
        <main>
          <HeroSection
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectAiPrompt={(idx) => {
              setActivePromptIndex(idx);
              const aiSec = document.getElementById('ai-assistant');
              if (aiSec) aiSec.scrollIntoView({ behavior: 'smooth' });
            }}
            onOpenUploadModal={() => setIsUploadOpen(true)}
          />

          <CategoryGrid
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              setCurrentView('catalog');
            }}
          />

          <FeaturedProducts
            medicines={MEDICINES_DATA}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            onAddToCart={handleAddToCart}
          />

          <AIAssistantTeaser
            activePromptIndex={activePromptIndex}
            onSelectMedicine={(id) => {
              const med = MEDICINES_DATA.find((m) => m.id === id);
              if (med) handleAddToCart(med);
            }}
            onOpenChat={() => setIsAiChatOpen(true)}
          />

          <PrescriptionBanner
            onOpenUploadModal={() => setIsUploadOpen(true)}
          />

          <RoleFlowSection
            currentRole="pembeli"
            onRoleChange={() => {}}
          />
        </main>
      )}

      {currentView === 'catalog' && (
        <main>
          <MedicineCatalogView
            onAddToCart={handleAddToCart}
            cartItems={cartItems.map((ci) => ({ medicineId: ci.medicineId, quantity: ci.quantity }))}
          />
        </main>
      )}

      {currentView === 'checkout' && (
        <ProtectedRoute
          allowedRoles={['CUSTOMER']}
          onGoHome={() => setCurrentView('home')}
          onOpenLogin={() => setIsAuthOpen(true)}
        >
          <main>
            <CheckoutView
              onBackToCart={() => {
                setCurrentView('catalog');
                setIsCartOpen(true);
              }}
              onOrderSuccess={handleOrderCreated}
            />
          </main>
        </ProtectedRoute>
      )}

      {currentView === 'order-success' && lastCreatedOrder && (
        <ProtectedRoute
          allowedRoles={['CUSTOMER']}
          onGoHome={() => setCurrentView('home')}
          onOpenLogin={() => setIsAuthOpen(true)}
        >
          <main>
            <OrderSuccessView
              order={lastCreatedOrder}
              onViewOrderDetail={handleViewOrderDetail}
              onViewMyOrders={() => setCurrentView('my-orders')}
              onContinueShopping={() => setCurrentView('catalog')}
            />
          </main>
        </ProtectedRoute>
      )}

      {currentView === 'my-orders' && (
        <ProtectedRoute
          allowedRoles={['CUSTOMER']}
          onGoHome={() => setCurrentView('home')}
          onOpenLogin={() => setIsAuthOpen(true)}
        >
          <main>
            <MyOrdersView
              onViewOrderDetail={handleViewOrderDetail}
              onExploreCatalog={() => setCurrentView('catalog')}
            />
          </main>
        </ProtectedRoute>
      )}

      {currentView === 'order-detail' && selectedOrderId && (
        <ProtectedRoute
          allowedRoles={['CUSTOMER']}
          onGoHome={() => setCurrentView('home')}
          onOpenLogin={() => setIsAuthOpen(true)}
        >
          <main>
            <OrderDetailView
              orderId={selectedOrderId}
              onBack={() => setCurrentView('my-orders')}
            />
          </main>
        </ProtectedRoute>
      )}

      {currentView === 'profile' && (
        <ProtectedRoute
          allowedRoles={['CUSTOMER']}
          onGoHome={() => setCurrentView('home')}
          onOpenLogin={() => setIsAuthOpen(true)}
        >
          <CustomerProfileView />
        </ProtectedRoute>
      )}

      {currentView === 'staff-dashboard' && (
        <ProtectedRoute
          allowedRoles={['STAFF', 'ADMIN']}
          onGoHome={() => setCurrentView('home')}
          onOpenLogin={() => setIsAuthOpen(true)}
        >
          <StaffDashboardView />
        </ProtectedRoute>
      )}

      {currentView === 'admin-dashboard' && (
        <ProtectedRoute
          allowedRoles={['ADMIN']}
          onGoHome={() => setCurrentView('home')}
          onOpenLogin={() => setIsAuthOpen(true)}
        >
          <AdminDashboardView />
        </ProtectedRoute>
      )}

      {/* Footer */}
      <Footer />

      {/* Shopping Cart Drawer / Modal (Server-Side Validated) */}
      <CartDrawerModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onNavigateToCatalog={() => {
          setIsCartOpen(false);
          setCurrentView('catalog');
        }}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setCurrentView('checkout');
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* AI Chat Widget — Persistent floating chat across all views */}
      <AIChatWidget
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
      />
      {!isAiChatOpen && (
        <AIFloatingButton
          onClick={() => setIsAiChatOpen(true)}
          isOpen={false}
          hasUnread={true}
        />
      )}
      {isAiChatOpen && (
        <AIFloatingButton
          onClick={() => setIsAiChatOpen(false)}
          isOpen={true}
        />
      )}

      {/* Quick Upload Resep Modal from Home */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setUploadSuccess(false);
        }}
        title="Upload Resep Dokter"
      >
        {uploadSuccess ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ color: '#059669', marginBottom: '1rem' }}>
              <CheckCircle size={48} style={{ margin: '0 auto' }} />
            </div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--secondary-900)', marginBottom: '0.5rem' }}>
              Resep Berhasil Diunggah!
            </h4>
            <p style={{ color: 'var(--secondary-600)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Staf apoteker kami akan memverifikasi resep Anda. Anda juga dapat langsung menambahkan obat ke keranjang dan mengunggah resep pada halaman checkout.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setIsUploadOpen(false);
                setUploadSuccess(false);
                setCurrentView('catalog');
              }}
            >
              Lanjut ke Katalog Obat
            </Button>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--secondary-600)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Unggah foto resep dokter Anda (JPG, PNG, atau PDF). Apoteker kami akan memvalidasi keaslian resep dan menyiapkan pesanan Anda sesuai dosis.
            </p>
            <div
              style={{
                border: '2px dashed var(--secondary-200)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--secondary-50)',
                marginBottom: '1rem',
              }}
              onClick={() => setUploadSuccess(true)}
            >
              <UploadCloud size={36} color="var(--primary-600)" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--secondary-800)', margin: '0 0 0.25rem 0' }}>
                Klik untuk Memilih File Resep
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>
                Mendukung PNG, JPG, PDF (Maks. 10MB)
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <CartProvider>
            <AppInner />
            <ToastContainer />
          </CartProvider>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
