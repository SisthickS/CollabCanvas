// src/services/roomService.ts
import api from '../api/axios';

/**
 * Frontend Room interface — the shape that all UI components expect.
 */
export interface Room {
  id: string;
  name: string;
  description: string;
  roomCode: string;
  ownerId: string;
  ownerName: string;
  isPublic: boolean;
  hasPassword: boolean;
  participantCount: number;
  maxParticipants: number;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

export interface CreateRoomData {
  name: string;
  description?: string;
  isPublic: boolean;
  password?: string;
  maxParticipants?: number;
}

export interface JoinRoomData {
  roomId: string;
  password?: string;
}

/**
 * Maps a raw backend room document to the frontend Room interface.
 * Backend may return:
 *   - `_id` instead of `id`
 *   - `visibility: "public"|"private"` instead of `isPublic: boolean`
 *   - `owner: { _id, username }` (populated) or `owner: string` (ObjectId)
 *   - `participants: ObjectId[]` instead of `participantCount`
 *   - `password` (hashed string) instead of `hasPassword`
 *   - No `maxParticipants` field
 */
function mapBackendRoom(raw: any): Room {
  // Handle owner — can be a populated object or a plain ObjectId string
  let ownerId = '';
  let ownerName = 'Unknown';
  if (raw.owner && typeof raw.owner === 'object') {
    ownerId = raw.owner._id || raw.owner.id || '';
    ownerName = raw.owner.username || raw.owner.fullName || 'Unknown';
  } else if (typeof raw.owner === 'string') {
    ownerId = raw.owner;
  }

  // Determine visibility
  const isPublic =
    raw.isPublic !== undefined
      ? raw.isPublic
      : raw.visibility === 'public';

  // Determine participant count
  const participantCount =
    raw.participantCount ??
    (Array.isArray(raw.participants) ? raw.participants.length : 0);

  return {
    id: raw._id || raw.id || '',
    name: raw.name || '',
    description: raw.description || '',
    roomCode: raw.roomCode || '',
    ownerId,
    ownerName,
    isPublic,
    hasPassword: raw.hasPassword ?? (raw.visibility === 'private' && !!raw.password),
    participantCount,
    maxParticipants: raw.maxParticipants ?? 50,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    thumbnail: raw.thumbnail,
  };
}

class RoomService {
  /**
   * Create a new room.
   * Frontend sends `isPublic`; backend expects `visibility`.
   */
  async createRoom(roomData: CreateRoomData): Promise<{ success: boolean; room?: Room; message?: string }> {
    try {
      const response = await api.post('/rooms/create', {
        name: roomData.name,
        description: roomData.description,
        visibility: roomData.isPublic ? 'public' : 'private',
        password: roomData.password,
      });

      const data = response.data;
      return {
        success: data.success ?? true,
        room: data.room ? mapBackendRoom(data.room) : undefined,
        message: data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to create room',
      };
    }
  }

  /**
   * Join an existing room.
   * Frontend sends `roomId` (which is actually the roomCode from the UI).
   * Backend expects `roomCode`.
   */
  async joinRoom(joinData: JoinRoomData): Promise<{ success: boolean; room?: Room; message?: string }> {
    try {
      const response = await api.post('/rooms/join', {
        roomCode: joinData.roomId,
        password: joinData.password,
      });

      const data = response.data;
      return {
        success: data.success ?? true,
        room: data.room ? mapBackendRoom(data.room) : undefined,
        message: data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to join room',
      };
    }
  }

  /**
   * Get public rooms.
   * Backend returns `{ rooms, pagination }` — we add `success: true` wrapper.
   */
  async getPublicRooms(options?: {
    search?: string;
    sort?: 'newest' | 'popular' | 'name';
    limit?: number;
    page?: number;
  }): Promise<{ success: boolean; rooms?: Room[]; total?: number; message?: string }> {
    try {
      const params = new URLSearchParams();
      if (options?.search) params.append('search', options.search);
      if (options?.sort) params.append('sort', options.sort);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.page) params.append('page', options.page.toString());

      const response = await api.get(`/rooms/public?${params.toString()}`);
      const data = response.data;

      // Backend returns { rooms, pagination } without `success`
      const rawRooms = data.rooms || [];
      return {
        success: true,
        rooms: rawRooms.map(mapBackendRoom),
        total: data.pagination?.total ?? rawRooms.length,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to fetch rooms',
      };
    }
  }

  /**
   * Get user's rooms.
   * Backend returns `{ rooms }` without `success`.
   * Also includes rooms where user is a participant (not just owner).
   */
  async getMyRooms(): Promise<{ success: boolean; rooms?: Room[]; message?: string }> {
    try {
      const response = await api.get('/rooms/my-rooms');
      const data = response.data;

      const rawRooms = data.rooms || [];
      return {
        success: true,
        rooms: rawRooms.map(mapBackendRoom),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to fetch your rooms',
      };
    }
  }

  /**
   * Get room details by ID.
   * Uses the validate endpoint which returns room info.
   */
  async getRoom(roomId: string): Promise<{ success: boolean; room?: Room; message?: string }> {
    try {
      const response = await api.get(`/rooms/${roomId}/validate`);
      const data = response.data;

      return {
        success: data.success ?? true,
        room: data.room ? mapBackendRoom(data.room) : undefined,
        message: data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to fetch room details',
      };
    }
  }

  /**
   * Update room settings.
   * Translates `isPublic` → `visibility` for the backend.
   */
  async updateRoom(roomId: string, updates: Partial<CreateRoomData>): Promise<{ success: boolean; message?: string }> {
    try {
      const backendUpdates: any = { ...updates };
      if (updates.isPublic !== undefined) {
        backendUpdates.visibility = updates.isPublic ? 'public' : 'private';
        delete backendUpdates.isPublic;
      }

      const response = await api.put(`/rooms/${roomId}`, backendUpdates);
      return {
        success: response.data.success ?? true,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to update room',
      };
    }
  }

  /**
   * Delete room.
   */
  async deleteRoom(roomId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.delete(`/rooms/${roomId}`);
      return {
        success: response.data.success ?? true,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to delete room',
      };
    }
  }

  /**
   * Leave room.
   */
  async leaveRoom(roomId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.post(`/rooms/${roomId}/leave`);
      return {
        success: response.data.success ?? true,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to leave room',
      };
    }
  }

  /**
   * Get room participants.
   */
  async getParticipants(roomId: string): Promise<{ success: boolean; participants?: any[]; message?: string }> {
    try {
      const response = await api.get(`/rooms/${roomId}/participants`);
      return {
        success: response.data.success ?? true,
        participants: response.data.participants,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to fetch participants',
      };
    }
  }

  /**
   * Manage participant (kick/ban/promote/demote).
   */
  async manageParticipant(
    roomId: string,
    userId: string,
    action: 'kick' | 'ban' | 'promote' | 'demote'
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.post(`/rooms/${roomId}/participants/${userId}`, { action });
      return {
        success: response.data.success ?? true,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || `Failed to ${action} participant`,
      };
    }
  }

  /**
   * Validate room code before joining.
   * Returns whether password is required and basic room info.
   */
  async validateRoom(roomCode: string): Promise<{ success: boolean; requiresPassword?: boolean; room?: any; message?: string }> {
    try {
      const response = await api.get(`/rooms/${roomCode}/validate`);
      const data = response.data;
      return {
        success: data.success ?? true,
        requiresPassword: data.room?.requiresPassword ?? false,
        room: data.room,
        message: data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Room not found',
      };
    }
  }

  /**
   * Invite users to a room.
   */
  async inviteUsers(roomId: string, userIds: string[]): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.post(`/rooms/${roomId}/invite`, { userIds });
      return {
        success: response.data.success ?? true,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to invite users',
      };
    }
  }
}

export default new RoomService();