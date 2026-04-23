import { Navigate, type RouteObject } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import ProjectsPage from '../pages/ProjectsPage';
import BundleListPage from '../pages/BundleListPage';
import BundleManagerPage from '../pages/BundleManagerPage';
import ReleasesPage from '../pages/ReleasesPage';
import ReleaseDetailPage from '../pages/ReleaseDetailPage';
import ApiKeysPage from '../pages/ApiKeysPage';
import SettingsPage from '../pages/SettingsPage';

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <ProjectsPage /> },
          {
            path: '/projects/:projectId',
            element: <Navigate to="bundles" replace />,
          },
          { path: '/projects/:projectId/bundles', element: <BundleListPage /> },
          {
            path: '/projects/:projectId/bundles/new',
            element: <BundleManagerPage />,
          },
          {
            path: '/projects/:projectId/bundles/:bundleId',
            element: <BundleManagerPage />,
          },
          { path: '/projects/:projectId/releases', element: <ReleasesPage /> },
          {
            path: '/projects/:projectId/releases/:targetVersion',
            element: <ReleaseDetailPage />,
          },
          { path: '/projects/:projectId/api-keys', element: <ApiKeysPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];
