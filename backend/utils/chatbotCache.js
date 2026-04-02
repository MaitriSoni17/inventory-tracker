/**
 * Cache utility for chatbot responses and context
 * Improves performance by reducing repetitive database queries
 */

class ChatbotCache {
  constructor(ttlSeconds = 600) {
    this.cache = new Map();
    this.ttlSeconds = ttlSeconds;
  }

  /**
   * Generate cache key from user ID and role
   */
  generateKey(userId, role) {
    return `${userId}:${role}`;
  }

  /**
   * Get cached context for a user
   */
  get(userId, role) {
    const key = this.generateKey(userId, role);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache has expired
    if (Date.now() - cached.timestamp > this.ttlSeconds * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cache for a user
   */
  set(userId, role, data) {
    const key = this.generateKey(userId, role);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache for a user (when data changes)
   */
  invalidate(userId, role) {
    const key = this.generateKey(userId, role);
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Auto-cleanup expired entries every minute
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache) {
        if (now - value.timestamp > this.ttlSeconds * 1000) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }
}

// Export singleton instance
module.exports = new ChatbotCache(600); // 10 minute TTL
