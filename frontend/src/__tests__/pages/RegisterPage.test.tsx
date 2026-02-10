// src/__tests__/pages/RegisterPage.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../../pages/RegisterPage';
import { registerUser } from '../../utils/authService';
import { validateEmailFormat } from '../../utils/emailValidation';
import { openInNewTab } from '../../utils/navigation';
import { useNavigate } from 'react-router-dom';

// ================== MOCKS ==================

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    Link: ({ to, children, ...rest }: any) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useNavigate: jest.fn(),
  };
});

jest.mock('../../components/ui/Button', () => ({
  Button: ({ children, disabled, isLoading, ...rest }: any) => (
    <button disabled={disabled} data-loading={isLoading ? 'true' : 'false'} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('../../components/ui/PasswordStrengthMeter', () => ({
  PasswordStrengthMeter: ({ password }: any) => (
    <div data-testid="password-meter">Strength for: {password}</div>
  ),
}));

jest.mock('../../components/ui/UsernameChecker', () => ({
  UsernameChecker: ({ username, onAvailabilityChange }: any) => (
    <div data-testid="username-checker">
      <div>Username: {username}</div>
      <button onClick={() => onAvailabilityChange(true)}>Mark Available</button>
      <button onClick={() => onAvailabilityChange(false)}>Mark Unavailable</button>
    </div>
  ),
}));

jest.mock('../../utils/authService', () => ({
  registerUser: jest.fn(),
}));

jest.mock('../../utils/emailValidation', () => ({
  validateEmailFormat: jest.fn(),
}));

jest.mock('../../utils/navigation', () => ({
  openInNewTab: jest.fn(),
}));

// ================== TESTS ==================

describe('RegisterPage', () => {
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(navigateMock);

    jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Default: valid email
    (validateEmailFormat as jest.Mock).mockImplementation((email: string) => ({
      valid: email.includes('@'),
      message: email.includes('@') ? '' : 'Invalid email format',
    }));
  });

  test('renders all main inputs and submit button', () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
    expect(screen.getByTestId('username-checker')).toBeInTheDocument();
    expect(screen.getByTestId('password-meter')).toBeInTheDocument();
  });

  test('clicking Terms of Service opens in new tab', () => {
    render(<RegisterPage />);

    fireEvent.click(screen.getByRole('button', { name: /Open Terms of Service/i }));
    expect(openInNewTab).toHaveBeenCalledWith('/terms-of-service');
  });

  test('clicking Privacy Policy opens in new tab', () => {
    render(<RegisterPage />);

    fireEvent.click(screen.getByRole('button', { name: /Open Privacy Policy/i }));
    expect(openInNewTab).toHaveBeenCalledWith('/privacy-policy');
  });

  test('email validation: invalid email shows error message and aria-invalid=true', () => {
    (validateEmailFormat as jest.Mock).mockReturnValueOnce({
      valid: false,
      message: 'Invalid email format',
    });

    render(<RegisterPage />);

    const emailInput = screen.getByLabelText(/Email address/i);

    fireEvent.change(emailInput, { target: { value: 'bademail' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email format');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('submit: missing fields shows alert and does not call registerUser', async () => {
    render(<RegisterPage />);

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(window.alert).toHaveBeenCalledWith('Please fill in all required fields');
    expect(registerUser).not.toHaveBeenCalled();
  });

  test('submit: username not available shows alert', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'john' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    // do NOT mark available
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(window.alert).toHaveBeenCalledWith('Please choose an available username');
    expect(registerUser).not.toHaveBeenCalled();
  });

  test('submit: invalid email shows alert', async () => {
    (validateEmailFormat as jest.Mock).mockReturnValue({
      valid: false,
      message: 'Email invalid',
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'john' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'bad' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(window.alert).toHaveBeenCalledWith('Email invalid');
    expect(registerUser).not.toHaveBeenCalled();
  });

  test('submit: not agreeing to terms shows alert', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'john' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));

    // do NOT check terms
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(window.alert).toHaveBeenCalledWith(
      'You must agree to the Terms of Service and Privacy Policy'
    );
    expect(registerUser).not.toHaveBeenCalled();
  });

  test('submit: password too short shows alert', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'john' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));

    fireEvent.click(screen.getByLabelText(/Agree to terms and conditions/i));

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(window.alert).toHaveBeenCalledWith('Password must be at least 8 characters long');
    expect(registerUser).not.toHaveBeenCalled();
  });

  test('successful registration: calls registerUser with normalized data and navigates', async () => {
    (registerUser as jest.Mock).mockResolvedValueOnce({ success: true });

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'JohnUser' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'John@Test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));
    fireEvent.click(screen.getByLabelText(/Agree to terms and conditions/i));

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledTimes(1);
    });

    expect(registerUser).toHaveBeenCalledWith({
      fullName: 'John Doe',
      username: 'johnuser',
      email: 'john@test.com',
      password: 'password123',
    });

    expect(navigateMock).toHaveBeenCalledWith('/registration-success', {
      state: {
        email: 'John@Test.com',
        message: 'Registration successful! Please check your email.',
      },
    });
  });

  test('failed registration: shows alert with backend message', async () => {
    (registerUser as jest.Mock).mockResolvedValueOnce({
      success: false,
      message: 'Username already exists',
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'johnuser' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));
    fireEvent.click(screen.getByLabelText(/Agree to terms and conditions/i));

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledTimes(1);
    });

    expect(window.alert).toHaveBeenCalledWith('Username already exists');
  });

  test('thrown error registration: shows fallback alert message', async () => {
    (registerUser as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'johnuser' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));
    fireEvent.click(screen.getByLabelText(/Agree to terms and conditions/i));

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledTimes(1);
    });

    expect(window.alert).toHaveBeenCalledWith(
      'Registration failed. Please try again.'
    );
  });

  test('submit button disabled when terms not checked / username not available / email invalid', () => {
    (validateEmailFormat as jest.Mock).mockReturnValue({
      valid: false,
      message: 'Bad email',
    });

    render(<RegisterPage />);

    const submit = screen.getByRole('button', { name: /Sign Up/i });

    // Initially: username unavailable + email invalid + terms unchecked => disabled
    expect(submit).toBeDisabled();

    // Make email valid
    (validateEmailFormat as jest.Mock).mockReturnValue({
      valid: true,
      message: '',
    });

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: 'good@test.com' },
    });

    // Still disabled because username not marked available + terms not checked
    expect(submit).toBeDisabled();

    // Mark username available
    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));
    expect(submit).toBeDisabled();

    // Agree terms
    fireEvent.click(screen.getByLabelText(/Agree to terms and conditions/i));
    expect(submit).not.toBeDisabled();
  });
});
