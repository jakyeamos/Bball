/**
 * Rejoin Manager
 * Handles user reconnection to existing lobbies/drafts/leagues
 */

export interface UserLobbyMapping {
  userId: string;
  lobbyId: string;
  lastSeen: string;
}

class RejoinManager {
  private userToLobby: Map<string, string> = new Map();
  private lobbyUsers: Map<string, Set<string>> = new Map();

  /**
   * Register a user's association with a lobby
   */
  registerUser(userId: string, lobbyId: string): void {
    this.userToLobby.set(userId, lobbyId);

    if (!this.lobbyUsers.has(lobbyId)) {
      this.lobbyUsers.set(lobbyId, new Set());
    }
    this.lobbyUsers.get(lobbyId)!.add(userId);
  }

  /**
   * Get the lobby ID for a user
   */
  getUserLobby(userId: string): string | undefined {
    return this.userToLobby.get(userId);
  }

  /**
   * Check if a user has an active lobby session
   */
  hasActiveSession(userId: string): boolean {
    return this.userToLobby.has(userId);
  }

  /**
   * Remove user from rejoin tracking (when they explicitly leave)
   */
  removeUser(userId: string): void {
    const lobbyId = this.userToLobby.get(userId);
    if (lobbyId) {
      const lobbyUserSet = this.lobbyUsers.get(lobbyId);
      if (lobbyUserSet) {
        lobbyUserSet.delete(userId);
        if (lobbyUserSet.size === 0) {
          this.lobbyUsers.delete(lobbyId);
        }
      }
    }
    this.userToLobby.delete(userId);
  }

  /**
   * Remove all users from a lobby (when lobby is deleted)
   */
  removeLobby(lobbyId: string): void {
    const userSet = this.lobbyUsers.get(lobbyId);
    if (userSet) {
      for (const userId of userSet) {
        this.userToLobby.delete(userId);
      }
      this.lobbyUsers.delete(lobbyId);
    }
  }

  /**
   * Get all users in a lobby
   */
  getLobbyUsers(lobbyId: string): string[] {
    const userSet = this.lobbyUsers.get(lobbyId);
    return userSet ? Array.from(userSet) : [];
  }

  /**
   * Clear all mappings (for testing/cleanup)
   */
  clear(): void {
    this.userToLobby.clear();
    this.lobbyUsers.clear();
  }
}

// Singleton instance
export const rejoinManager = new RejoinManager();
