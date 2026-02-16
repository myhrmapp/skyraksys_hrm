import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders as render } from '../test-utils/testUtils';

// Simple smoke test to verify test infrastructure works
describe('Test Infrastructure', () => {
  it('should run tests successfully', () => {
    const TestComponent = () => <div>Hello Test</div>;
    render(<TestComponent />);
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });

  it('should have access to jest-dom matchers', () => {
    const element = document.createElement('div');
    element.textContent = 'Test';
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Test');
  });

  it('should mock environment variables', () => {
    expect(process.env.REACT_APP_API_URL).toBe('http://localhost:5000/api');
  });

  it('should have TextEncoder available', () => {
    expect(typeof TextEncoder).toBe('function');
    expect(typeof TextDecoder).toBe('function');
  });

  it('should have localStorage mock', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
    localStorage.clear();
  });

  it('should have window.matchMedia mock', () => {
    expect(typeof window.matchMedia).toBe('function');
    const result = window.matchMedia('(min-width: 768px)');
    expect(result.matches).toBe(false);
  });
});
