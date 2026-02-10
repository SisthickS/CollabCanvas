// src/__tests__/pages/RoomPage.test.tsx

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RoomPage from "../../pages/RoomPage";
import roomService from "../../services/roomService";

// -------------------- Mocks --------------------

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock("../../services/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("../../services/roomService", () => ({
  __esModule: true,
  default: {
    getRoom: jest.fn(),
  },
}));

jest.mock("../../components/ui/InviteModal", () => ({
  __esModule: true,
  default: ({ isOpen, roomId, roomName }: any) =>
    isOpen ? (
      <div data-testid="invite-modal">
        InviteModal - {roomId} - {roomName}
      </div>
    ) : null,
}));

jest.mock("../../features/rooms/ParticipantsPanel", () => ({
  __esModule: true,
  default: ({ isOpen, roomId, currentUserRole }: any) =>
    isOpen ? (
      <div data-testid="participants-panel">
        ParticipantsPanel - {roomId} - {currentUserRole}
      </div>
    ) : null,
}));

jest.mock("../../features/canvas/CollaborativeCanvas", () => ({
  __esModule: true,
  CollaborativeCanvas: ({ roomId }: any) => (
    <div data-testid="collaborative-canvas">Canvas - {roomId}</div>
  ),
}));

// Clipboard mock
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

const mockedGetRoom = (roomService as any).default.getRoom as jest.Mock;

// -------------------- Helpers --------------------

const renderPage = (roomId = "room-123") => {
  return render(
    <MemoryRouter initialEntries={[`/room/${roomId}`]}>
      <Routes>
        <Route path="/room/:id" element={<RoomPage />} />
      </Routes>
    </MemoryRouter>
  );
};

// -------------------- Tests --------------------

describe("RoomPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("shows loading state initially", async () => {
    mockedGetRoom.mockResolvedValueOnce({
      success: true,
      room: {
        name: "My Room",
        description: "desc",
        isPublic: true,
        ownerId: "user-1",
        ownerName: "Owner",
        participantCount: 5,
        roomCode: "ABC",
      },
    });

    renderPage("room-123");

    expect(screen.getByText(/loading room/i)).toBeInTheDocument();

    await screen.findByText("My Room");
  });

  test("renders room details after successful fetch", async () => {
    mockedGetRoom.mockResolvedValueOnce({
      success: true,
      room: {
        name: "Design Room",
        description: "desc",
        isPublic: false,
        ownerId: "user-999",
        ownerName: "OtherOwner",
        participantCount: 12,
        roomCode: "XYZ",
      },
    });

    renderPage("room-999");

    expect(await screen.findByText("Design Room")).toBeInTheDocument();

    // Room ID shown
    expect(screen.getAllByText(/room id/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText("room-999")[0]).toBeInTheDocument();

    // Participant count badge
    expect(screen.getByText("12")).toBeInTheDocument();

    // Canvas rendered
    expect(screen.getByTestId("collaborative-canvas")).toHaveTextContent(
      "Canvas - room-999"
    );

    // Live badge
    expect(screen.getByText(/live/i)).toBeInTheDocument();
  });

  test("calls roomService.getRoom with the correct id", async () => {
    mockedGetRoom.mockResolvedValueOnce({
      success: true,
      room: {
        name: "Room A",
        description: "",
        isPublic: true,
        ownerId: "user-1",
        ownerName: "Me",
        participantCount: 1,
        roomCode: "",
      },
    });

    renderPage("abc-room");

    await waitFor(() => {
      expect(mockedGetRoom).toHaveBeenCalledWith("abc-room");
    });
  });

  test("shows error screen if API returns success=false", async () => {
    mockedGetRoom.mockResolvedValueOnce({
      success: false,
      message: "Room not found",
    });

    renderPage("missing-room");

    expect(
      await screen.findByText(/unable to load room/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/room not found/i)).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /back to dashboard/i });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  test("shows error screen if API throws", async () => {
    mockedGetRoom.mockRejectedValueOnce(new Error("Network fail"));

    renderPage("room-err");

    expect(
      await screen.findByText(/unable to load room/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/failed to load room/i)
    ).toBeInTheDocument();
  });

  test("copies room id to clipboard when clicking Copy button", async () => {
    mockedGetRoom.mockResolvedValueOnce({
      success: true,
      room: {
        name: "Copy Test Room",
        description: "",
        isPublic: true,
        ownerId: "user-1",
        ownerName: "Me",
        participantCount: 2,
        roomCode: "",
      },
    });

    renderPage("room-copy");

    await screen.findByText("Copy Test Room");

    const copyBtn = screen.getByRole("button", { name: /copy room id/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("room-copy");

    // UI changes to "Copied!"
    expect(await screen.findByText(/copied!/i)).toBeInTheDocument();

    // After 2s it should revert
    jest.advanceTimersByTime(2000);

    expect(await screen.findByText(/copy/i)).toBeInTheDocument();
  });

  test("opens InviteModal when clicking Invite button", async () => {
    mockedGetRoom.mockResolvedValueOnce({
      success: true,
      room: {
        name: "Invite Room",
        description: "",
        isPublic: true,
        ownerId: "user-1",
        ownerName: "Me",
        participantCount: 2,
        roomCode: "",
      },
    });

    renderPage("room-invite");

    await screen.findByText("Invite Room");

    const inviteBtn = screen.getByRole("button", { name: /invite users to room/i });
    fireEvent.click(inviteBtn);

    expect(await screen.findByTestId("invite-modal")).toBeInTheDocument();
    expect(screen.getByTestId("invite-modal")).toHaveTextContent("room-invite");
    expect(screen.getByTestId("invite-modal")).toHaveTextContent("Invite Room");
  });

  test("toggles ParticipantsPanel when clicking Users button", async () => {
    mockedGetRoom.mockResolvedValueOnce({
      success: true,
      room: {
        name: "Users Room",
        description: "",
        isPublic: true,
        ownerId: "user-1", // current user is owner
        ownerName: "Me",
        participantCount: 10,
        roomCode: "",
      },
    });

    renderPage("room-users");

    await screen.findByText("Users Room");

    const usersBtn = screen.getByRole("button", { name: /show active users/i });

    // open
    fireEvent.click(usersBtn);

    expect(await screen.findByTestId("participants-panel")).toBeInTheDocument();
    expect(screen.getByTestId("participants-panel")).toHaveTextContent(
      "ParticipantsPanel - room-users - owner"
    );

    // close (toggle)
    fireEvent.click(usersBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("participants-panel")).not.toBeInTheDocument();
    });
  });

  test("sets currentUserRole to participant when user is not owner", async () => {
    mockedGetRoom.mockResolvedValueOnce({
      success: true,
      room: {
        name: "Role Room",
        description: "",
        isPublic: true,
        ownerId: "someone-else",
        ownerName: "Other",
        participantCount: 10,
        roomCode: "",
      },
    });

    renderPage("room-role");

    await screen.findByText("Role Room");

    const usersBtn = screen.getByRole("button", { name: /show active users/i });
    fireEvent.click(usersBtn);

    expect(await screen.findByTestId("participants-panel")).toHaveTextContent(
      "participant"
    );
  });

  test("chat button exists and is clickable (does not crash)", async () => {
    mockedGetRoom.mockResolvedValueOnce({
      success: true,
      room: {
        name: "Chat Room",
        description: "",
        isPublic: true,
        ownerId: "user-1",
        ownerName: "Me",
        participantCount: 2,
        roomCode: "",
      },
    });

    renderPage("room-chat");

    await screen.findByText("Chat Room");

    const chatBtn = screen.getByRole("button", { name: /open chat/i });
    fireEvent.click(chatBtn);

    // no assertion needed - just ensuring no crash
    expect(chatBtn).toBeInTheDocument();
  });
});
