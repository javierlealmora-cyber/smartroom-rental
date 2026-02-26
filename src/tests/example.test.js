import { describe, it, expect } from 'vitest';

describe('Vitest Setup', () => {
  it('debe ejecutar tests correctamente', () => {
    expect(1 + 1).toBe(2);
  });

  it('debe tener acceso a matchers de jest-dom', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello World';
    document.body.appendChild(element);
    
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello World');
  });
});
