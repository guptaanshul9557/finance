/**
 * Common Collection Service
 * Handles all queries for Common Collection module
 */

const db = require('../db.js');

class CommonCollectionService {
  /**
   * Get total collection stats
   */
  async getTotalCollection(dateRange) {
    const query = `
      SELECT 
        SUM(CAST(tres_coll_receipt_amount AS NUMERIC)) as total_collection,
        COUNT(*) as total_transactions,
        COUNT(*) as collection_count,
        AVG(CAST(tres_coll_receipt_amount AS NUMERIC)) as avg_amount
      FROM coll_kmc1_data.tres_coll_receipt_hdr
    `;
      const result = await db.query(query, [dateRange.start, dateRange.end]);
      console.log({result});
      
    return result.rows[0];
  }

  /**
   * Get collection breakdown by status
   */
  async getCollectionByStatus(dateRange, filters = {}) {
    const query = `
      SELECT 
        COALESCE(status, 'Unknown') as status,
        COUNT(*) as count,
        SUM(CAST(amount AS NUMERIC)) as amount
      FROM coll_kmc1_data.tres_coll_receipt_hdr
      WHERE created_date >= $1 AND created_date <= $2
      GROUP BY status
      ORDER BY count DESC
    `;
    const result = await db.query(query, [dateRange.start, dateRange.end]);
    return result.rows;
  }

  /**
   * Get all collections with pagination
   */
  async getAllCollections(dateRange, limit, offset, filters = {}, search = '') {
    let query = `
      SELECT 
        id,
        receipt_no as collection_no,
        CAST(amount AS NUMERIC) as amount,
        COALESCE(status, 'Unknown') as status,
        created_date,
        (SELECT department_name FROM coll_kmc1_data.com_department 
         WHERE department_code = t.department_code LIMIT 1) as department_name
      FROM coll_kmc1_data.tres_coll_receipt_hdr t
      WHERE created_date >= $1 AND created_date <= $2
    `;

    const params = [dateRange.start, dateRange.end];

    // Apply filters
    if (filters.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    // Apply search
    if (search) {
      query += ` AND (receipt_no ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    // Add pagination
    query += ` ORDER BY created_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get collections count
   */
  async getCollectionsCount(dateRange, filters = {}, search = '') {
    let query = `
      SELECT COUNT(*) as total
      FROM coll_kmc1_data.tres_coll_receipt_hdr
      WHERE created_date >= $1 AND created_date <= $2
    `;

    const params = [dateRange.start, dateRange.end];

    if (filters.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (search) {
      query += ` AND receipt_no ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].total);
  }

  /**
   * Get collection detail by ID
   */
  async getCollectionDetail(id) {
    const query = `
      SELECT 
        *,
        (SELECT department_name FROM coll_kmc1_data.com_department 
         WHERE department_code = t.department_code LIMIT 1) as department_name
      FROM coll_kmc1_data.tres_coll_receipt_hdr t
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get status options for filter
   */
  async getStatusOptions() {
    const query = `
      SELECT DISTINCT status FROM coll_kmc1_data.tres_coll_receipt_hdr
      WHERE status IS NOT NULL
      ORDER BY status
    `;
    const result = await db.query(query);
    return result.rows.map((r) => ({ value: r.status, label: r.status }));
  }
}

const commonCollectionService = new CommonCollectionService();
module.exports = commonCollectionService;
