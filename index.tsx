import React from 'react';
import { createRoot } from 'react-dom/client';
import HomePage from './apps/web/app/page';
import RootLayout from './apps/web/app/layout';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <RootLayout>
      <HomePage />
    </RootLayout>
  </React.StrictMode>
);