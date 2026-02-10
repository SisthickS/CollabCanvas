import '@testing-library/jest-dom';

describe('Test Environment Setup', () => {
  test('Jest is properly configured', () => {
    expect(1 + 1).toBe(2);
  });

  test('DOM testing library is available', () => {
    const element = document.createElement('div');
    element.textContent = 'Test Element';
    document.body.appendChild(element);
    
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Test Element');
  });

  test('Jest mocks are working', () => {
    expect(jest).toBeDefined();
    expect(jest.fn).toBeDefined();
  });

  test('ES modules are supported', async () => {
    // Test that ES modules work
    const module = await import('../../package.json');
    expect(module.default.name).toBe('frontend');
  });
});