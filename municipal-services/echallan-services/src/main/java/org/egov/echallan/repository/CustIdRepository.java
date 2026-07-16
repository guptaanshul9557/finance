package org.egov.echallan.repository;

import org.egov.common.exception.InvalidTenantIdException;
import org.egov.common.utils.MultiStateInstanceUtil;
import org.egov.echallan.model.CustIdMapping;
import org.egov.tracer.model.CustomException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CustIdRepository {

    private static final Logger LOG = LoggerFactory.getLogger(CustIdRepository.class);

    private static final String CUSTID_MAPPING_INSERT_SQL = "INSERT INTO eg_challan_custid " +
            "(id, tenantid, accountid, custid, ddnnumber,mobilenumber, createdby, lastmodifiedby, createdtime, lastmodifiedtime) " +
            "VALUES (?, ?, ?, ?, ?,?, ?, ?, ?, ?)";
    
    private static final String FIND_CUSTID_BY_MOBILE_SQL = "SELECT custid FROM eg_challan_custid " +
            "WHERE tenantid = ? AND mobilenumber = ?";

    private final JdbcTemplate jdbcTemplate;
    private final MultiStateInstanceUtil centralInstanceutil;

    @Autowired
    public CustIdRepository(JdbcTemplate jdbcTemplate, MultiStateInstanceUtil centralInstanceutil) {
        this.jdbcTemplate = jdbcTemplate;
        this.centralInstanceutil = centralInstanceutil;
    }

    public void saveCustIdMapping(CustIdMapping mapping) {
        String query = CUSTID_MAPPING_INSERT_SQL;
        try {
            query = centralInstanceutil.replaceSchemaPlaceholder(query, mapping.getTenantId());
        } catch (InvalidTenantIdException e) {
            LOG.error("TenantId length is not sufficient to replace query schema in a multi state instance", e);
            throw new CustomException("ECHALLAN_AS_TENANTID_ERROR",
                    "TenantId length is not sufficient to replace query schema in a multi state instance");
        }

        jdbcTemplate.update(query,
                mapping.getId(),
                mapping.getTenantId(),
                mapping.getAccountId(),
                mapping.getCustId(),
                mapping.getDdnNumber(),
                mapping.getMobilenumber(),
                mapping.getCreatedBy(),
                mapping.getLastModifiedBy(),
                mapping.getCreatedTime(),
                mapping.getLastModifiedTime());
    }
    
    public String findCustIdByMobileNumber(String tenantId, String mobile) {
        String query;
        try {
            query = centralInstanceutil.replaceSchemaPlaceholder(FIND_CUSTID_BY_MOBILE_SQL, tenantId);
        } catch (InvalidTenantIdException e) {
            LOG.error("TenantId length is not sufficient to replace query schema in a multi state instance", e);
            throw new CustomException("ECHALLAN_AS_TENANTID_ERROR",
                    "TenantId length is not sufficient to replace query schema in a multi state instance");
        }

        LOG.info("Fetching custId mapping for tenantId: {} and mobile: {}", tenantId, mobile);

        try {
            return jdbcTemplate.queryForObject(query, String.class, tenantId, mobile);
        } catch (EmptyResultDataAccessException e) {
            LOG.info("No custId mapping found for tenantId: {} and mobile: {}", tenantId, mobile);
            return null;
        }
    }
}
