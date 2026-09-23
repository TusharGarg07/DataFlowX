import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthLayout } from '../AuthLayout/AuthLayout';

describe('AuthLayout', () => {
  it('renders hero title, tagline, and nested route outlet', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="login" element={<div>Nested Login Form</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getAllByText('DataFlowX').length).toBeGreaterThan(0);
    expect(screen.getByText('Process. Discover. Advance.')).toBeInTheDocument();
    expect(screen.getByText('Nested Login Form')).toBeInTheDocument();
  });
});
