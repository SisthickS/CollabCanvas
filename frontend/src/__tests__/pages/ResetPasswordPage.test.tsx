// src/__tests__/pages/ResetPasswordPage.test.tsx

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ResetPasswordPage from "../../pages/ResetPasswordPage";
import { resetPassword } from "../../utils/authService";

jest.mock("../../utils/authService", () => ({
  resetPassword: jest.fn(),
}));

// Mock your Button component to a normal HTML button
jest.mock("../../components/ui/Button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// Mock strength meter (not needed for logic)
jest.mock("../../components/ui/PasswordStrengthMeter", () => ({
  PasswordStrengthMeter: () => <div data-testid="password-strength-meter" />,
}));

const mockedResetPassword = resetPassword as jest.Mock;

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderPage = (token?: string | null) => {
  const url = token ? `/reset-password?token=${token}` : `/reset-password`;

  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("renders reset form UI", () => {
    renderPage("abc123");

    expect(
      screen.getByRole("heading", { name: /set new password/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update password/i })
    ).toBeInTheDocument();
  });

  test("shows error if no token is present", async () => {
    renderPage(null);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no reset token found/i
    );

    const submitBtn = screen.getByRole("button", { name: /update password/i });
    expect(submitBtn).toBeDisabled();
  });

  test("toggles password visibility when clicking show/hide button", () => {
    renderPage("abc123");

    const passwordInput = screen.getByLabelText(/new password/i);
    const toggleBtn = screen.getByRole("button", { name: /show password/i });

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("shows validation error when password is less than 8 chars", async () => {
    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "123" },
    });

    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /at least 8 characters/i
    );

    expect(mockedResetPassword).not.toHaveBeenCalled();
  });

  test("shows validation error when passwords do not match", async () => {
    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "password999" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /passwords do not match/i
    );

    expect(mockedResetPassword).not.toHaveBeenCalled();
  });

  test("calls resetPassword API with token and password on valid submit", async () => {
    mockedResetPassword.mockResolvedValueOnce({ success: true });

    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockedResetPassword).toHaveBeenCalledWith("abc123", "password123");
    });
  });

  test("shows success screen when resetPassword returns success", async () => {
    mockedResetPassword.mockResolvedValueOnce({ success: true });

    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByRole("heading", { name: /password updated/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /go to login page/i })
    ).toBeInTheDocument();
  });

  test("navigates to /login after 3 seconds on success", async () => {
    mockedResetPassword.mockResolvedValueOnce({ success: true });

    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await screen.findByRole("heading", { name: /password updated/i });

    expect(mockNavigate).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3000);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("shows API error message when resetPassword returns success=false", async () => {
    mockedResetPassword.mockResolvedValueOnce({
      success: false,
      message: "Invalid token",
    });

    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid token/i);
  });

  test("shows fallback error message when resetPassword throws", async () => {
    mockedResetPassword.mockRejectedValueOnce(new Error("Network error"));

    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /failed to reset password/i
    );
  });
});
