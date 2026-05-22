import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Products from './pages/Products';
import SellerProducts from './pages/SellerProducts';
import ProductEditor from './pages/ProductEditor';
import Auctions from './pages/Auctions';
import AuctionDetail from './pages/AuctionDetail';
import SellerAuctions from './pages/SellerAuctions';
import AuctionEditor from './pages/AuctionEditor';
import AdminProductReviews from './pages/AdminProductReviews';
import Orders from './pages/Orders';
import SellerOrders from './pages/SellerOrders';
import OrderDetail from './pages/OrderDetail';
import AdminOrderArbitration from './pages/AdminOrderArbitration';
import { useAuthStore } from './stores/auth';

export default function App() {
  const { token, fetchProfile } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/auctions" element={<Auctions />} />
        <Route path="/auctions/:id" element={<AuctionDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/products"
          element={
            <ProtectedRoute roles={['SELLER', 'ADMIN']}>
              <SellerProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/products/new"
          element={
            <ProtectedRoute roles={['SELLER', 'ADMIN']}>
              <ProductEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/products/:id/edit"
          element={
            <ProtectedRoute roles={['SELLER', 'ADMIN']}>
              <ProductEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/reviews"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminProductReviews />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders/arbitration"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminOrderArbitration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/orders"
          element={
            <ProtectedRoute roles={['SELLER', 'ADMIN']}>
              <SellerOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/auctions"
          element={
            <ProtectedRoute roles={['SELLER', 'ADMIN']}>
              <SellerAuctions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/auctions/new"
          element={
            <ProtectedRoute roles={['SELLER', 'ADMIN']}>
              <AuctionEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/auctions/:id/edit"
          element={
            <ProtectedRoute roles={['SELLER', 'ADMIN']}>
              <AuctionEditor />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
