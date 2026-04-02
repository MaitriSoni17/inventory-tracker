/**
 * Memoized text formatting utilities for chatbot responses
 * Caches parsed markdown formatting to avoid recomputation
 */

const parsingCache = new Map();
const MAX_CACHE_SIZE = 200;

/**
 * Simple memoization wrapper with LRU cache
 */
const memoize = (fn, cacheSize = MAX_CACHE_SIZE) => {
  const cache = new Map();
  
  return (input) => {
    if (cache.has(input)) {
      return cache.get(input);
    }
    
    const result = fn(input);
    cache.set(input, result);
    
    // Implement simple LRU eviction
    if (cache.size > cacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
};

/**
 * Parse markdown-like formatting from text
 * Returns array of processed parts
 */
const parseFormattedTextContent = (text) => {
  if (!text) return [];

  const lines = text.split('\n');
  const elements = [];

  lines.forEach((line, lineIdx) => {
    // Process inline formatting: **bold**, *italic*
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const processedParts = parts.map((part) => {
      const boldMatch = part.match(/^\*\*(.+)\*\*$/);
      if (boldMatch) {
        return { type: 'bold', content: boldMatch[1] };
      }
      return { type: 'text', content: part };
    });

    // Detect list and paragraph types
    const trimmed = line.trim();
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('· ')) {
      elements.push({
        type: 'listItem',
        content: processedParts,
        index: lineIdx
      });
    } else if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s/);
      elements.push({
        type: 'numberedItem',
        number: numMatch[1],
        content: processedParts,
        index: lineIdx
      });
    } else if (trimmed.length > 0) {
      elements.push({
        type: 'paragraph',
        content: processedParts,
        index: lineIdx
      });
    } else {
      elements.push({
        type: 'break',
        index: lineIdx
      });
    }
  });

  return elements;
};

/**
 * Memoized version of parseFormattedTextContent
 */
const parseFormattedText = memoize(parseFormattedTextContent, 300);

/**
 * Extract quick action suggestions from response
 * (Cached)
 */
const getContextualSuggestionsFromText = memoize((text) => {
  if (!text) return [];
  
  const suggestions = [];
  const lowerText = text.toLowerCase();
  
  // Detect suggestion patterns
  if (lowerText.includes('try the quick actions') || lowerText.includes('actions below')) {
    return []; // Already has suggestions
  }
  
  // Add contextual suggestions based on content
  if (lowerText.includes('inventory') || lowerText.includes('stock')) {
    suggestions.push('📦 Check Stock Levels');
  }
  if (lowerText.includes('order') || lowerText.includes('pending')) {
    suggestions.push('📋 View Orders');
  }
  if (lowerText.includes('employee') || lowerText.includes('team')) {
    suggestions.push('👥 Team Info');
  }
  if (lowerText.includes('revenue') || lowerText.includes('sales')) {
    suggestions.push('💰 Revenue Summary');
  }
  
  return suggestions.slice(0, 3);
});

/**
 * Clear the memoization cache
 */
const clearParsingCache = () => {
  parsingCache.clear();
};

const textFormattingUtils = {
  parseFormattedText,
  getContextualSuggestionsFromText,
  clearParsingCache
};

export {
  parseFormattedText,
  getContextualSuggestionsFromText,
  clearParsingCache
};

export default textFormattingUtils;
