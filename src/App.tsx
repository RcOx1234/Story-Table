import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { seedData } from '@/data/seed';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Dashboard } from '@/pages/Dashboard';
import { WorldsPage } from '@/pages/WorldsPage';
import { WorldView } from '@/pages/WorldView';
import { CharacterDetail } from '@/pages/CharacterDetail';
import { HouseDetail } from '@/pages/HouseDetail';
import { SceneDetail } from '@/pages/SceneDetail';
import { IdeasPage } from '@/pages/IdeasPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { TrashPage } from '@/pages/TrashPage';
import { PlaceDetail } from '@/pages/PlaceDetail';
import { MapView } from '@/pages/MapView';
import { LoginPage } from '@/pages/LoginPage';
import { Toaster } from '@/components/ui/sonner';
import { isFirebaseConfigured } from '@/lib/firebase';
import { subscribeToAuth } from '@/services/authService';
import { applyEmptyStorySlice, hydrateStoryBundleFromFirebase } from '@/services/storyBundleSync';

function AppContent() {
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (!isFirebaseConfigured()) {
      seedData(useStore);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let cancelled = false;
    const unsub = subscribeToAuth((u) => {
      if (!u) {
        if (!cancelled) applyEmptyStorySlice();
        return;
      }
      if (!cancelled) void hydrateStoryBundleFromFirebase(u.uid);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AuthLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="mundos" element={<WorldsPage />} />
            <Route path="world/:worldId" element={<WorldView />} />
            <Route path="world/:worldId/character/:characterId" element={<CharacterDetail />} />
            <Route path="world/:worldId/house/:houseId" element={<HouseDetail />} />
            <Route path="world/:worldId/scene/:sceneId" element={<SceneDetail />} />
            <Route path="world/:worldId/place/:placeId" element={<PlaceDetail />} />
            <Route path="world/:worldId/map/:mapId" element={<MapView />} />
            <Route path="ideas" element={<IdeasPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="trash" element={<TrashPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#151820',
            border: '1px solid #2A3045',
            color: '#E8E9EB',
          },
        }}
      />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
