/**
 * Pagination helper - standardizes pagination across all list endpoints
 */

function parsePaginationParams(query) {
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || 10;

  // Validate ranges
  page = Math.max(1, page);
  limit = Math.min(Math.max(1, limit), 100); // Min 1, Max 100 items per page

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function buildPaginatedResponse(data, totalCount, page, limit) {
  const totalPages = Math.ceil(totalCount / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

/**
 * Query builder helper - safely builds MongoDB query with filters
 */
function buildQueryFilter(query, allowedFields) {
  const filter = {};

  Object.keys(query).forEach(key => {
    if (allowedFields.includes(key) && query[key]) {
      // Support partial text search for string fields
      const value = query[key];
      if (typeof value === 'string' && value.length > 0) {
        filter[key] = { $regex: value, $options: 'i' }; // Case-insensitive search
      } else {
        filter[key] = value;
      }
    }
  });

  return filter;
}

/**
 * Sort builder helper - safely builds MongoDB sort spec
 */
function buildSortSpec(sortBy, sortOrder = 'desc', defaultSort = '-createdAt') {
  if (!sortBy) {
    return defaultSort;
  }

  const order = sortOrder === 'asc' ? 1 : -1;
  return `${order === 1 ? '' : '-'}${sortBy}`;
}

module.exports = {
  parsePaginationParams,
  buildPaginatedResponse,
  buildQueryFilter,
  buildSortSpec
};
