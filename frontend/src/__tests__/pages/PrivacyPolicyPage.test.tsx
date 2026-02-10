import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrivacyPolicyPage from "../../pages/PrivacyPolicyPage";

// Mock lucide-react icons (so tests don't break)
vi.mock("lucide-react", () => ({
  Shield: () => <svg data-testid="icon-shield" />,
  Lock: () => <svg data-testid="icon-lock" />,
  Eye: () => <svg data-testid="icon-eye" />,
  Database: () => <svg data-testid="icon-database" />,
}));

// Mock Button component (avoid UI dependency issues)
vi.mock("../components/ui/Button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe("PrivacyPolicyPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>
    );

  it("renders main title", () => {
    renderPage();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("renders the last updated date text", () => {
    renderPage();
    expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
  });

  it("renders all main section headings", () => {
    renderPage();

    expect(screen.getByText("1. Introduction")).toBeInTheDocument();
    expect(screen.getByText("2. Information We Collect")).toBeInTheDocument();
    expect(screen.getByText("3. How We Use Your Information")).toBeInTheDocument();
    expect(screen.getByText("4. Data Sharing and Disclosure")).toBeInTheDocument();
    expect(screen.getByText("5. Data Security")).toBeInTheDocument();
    expect(screen.getByText("6. Your Data Protection Rights")).toBeInTheDocument();
    expect(screen.getByText("7. Children's Privacy")).toBeInTheDocument();
    expect(screen.getByText("8. Contact Us")).toBeInTheDocument();
  });

  it("renders the Personal Information and Usage Information cards", () => {
    renderPage();

    expect(screen.getByText("Personal Information")).toBeInTheDocument();
    expect(screen.getByText("Usage Information")).toBeInTheDocument();

    // Some list items
    expect(screen.getByText("Name and email address")).toBeInTheDocument();
    expect(screen.getByText("Canvas creations and edits")).toBeInTheDocument();
  });

  it("renders the 'We do not sell your personal data' statement", () => {
    renderPage();
    expect(
      screen.getByText("We do not sell your personal data.")
    ).toBeInTheDocument();
  });

  it("renders the Data Protection Rights table with correct headers", () => {
    renderPage();

    expect(screen.getByText("Right")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();

    // Table row checks
    expect(screen.getByText("Access")).toBeInTheDocument();
    expect(screen.getByText("Rectification")).toBeInTheDocument();
    expect(screen.getByText("Erasure")).toBeInTheDocument();
    expect(screen.getByText("Restriction")).toBeInTheDocument();
    expect(screen.getByText("Objection")).toBeInTheDocument();
  });

  it("renders contact email and address", () => {
    renderPage();

    expect(screen.getByText("privacy@collaborativecanvas.com")).toBeInTheDocument();
    expect(
      screen.getByText("123 Creative Street, Design City, DC 12345")
    ).toBeInTheDocument();
  });

  it("renders navigation buttons with correct labels", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Back to Registration" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Terms of Service" })).toBeInTheDocument();
  });

  it("renders correct links for navigation buttons", () => {
    renderPage();

    const registerLink = screen.getByRole("link", { name: /Back to Registration/i });
    const termsLink = screen.getByRole("link", { name: /View Terms of Service/i });

    expect(registerLink).toHaveAttribute("href", "/register");
    expect(termsLink).toHaveAttribute("href", "/terms-of-service");
  });

  it("renders lucide icons (mocked)", () => {
    renderPage();

    expect(screen.getByTestId("icon-shield")).toBeInTheDocument();
    expect(screen.getByTestId("icon-lock")).toBeInTheDocument();
    expect(screen.getByTestId("icon-eye")).toBeInTheDocument();
    expect(screen.getByTestId("icon-database")).toBeInTheDocument();
  });

  it("renders the footer note", () => {
    renderPage();

    expect(
      screen.getByText(/This Privacy Policy may be updated periodically/i)
    ).toBeInTheDocument();
  });
});
