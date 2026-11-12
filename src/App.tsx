import React, { useState } from 'react';
import { MEDICINES_DATA } from './data/mockData';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/home/HeroSection';
import { CategoryGrid } from './components/home/CategoryGrid';
import { FeaturedProducts } from './components/home/FeaturedProducts';
import { AIAssistantTeaser } from './components/home/AIAssistantTeaser';
import { RoleFlowSection } from './components/home/RoleFlowSection';
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
          <CustomerProfileView onNavigateToOrders={() => setCurrentView('my-orders')} />
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


    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
};

export default App;
