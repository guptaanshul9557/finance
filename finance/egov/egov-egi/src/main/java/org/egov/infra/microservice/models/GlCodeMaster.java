package org.egov.infra.microservice.models;

import org.egov.infra.microservice.utils.MicroserviceConstants;
import org.egov.infra.persistence.validator.annotation.OptionalPattern;
import org.hibernate.validator.constraints.SafeHtml;

public class GlCodeMaster {
    @SafeHtml
    @OptionalPattern(regex = MicroserviceConstants.ALPHANUMERICWITHALLSPECIALCHAR, message = "Special characters are not allowed")
    private String id;
    @SafeHtml
    @OptionalPattern(regex = MicroserviceConstants.ALPHANUMERICWITHALLSPECIALCHAR, message = "Special characters are not allowed")
    private String tenantId;
    @SafeHtml
    @OptionalPattern(regex = MicroserviceConstants.ALPHANUMERICWITHALLSPECIALCHAR, message = "Special characters are not allowed")
    private String taxHead;
    @SafeHtml
    @OptionalPattern(regex = MicroserviceConstants.ALPHANUMERICWITHALLSPECIALCHAR, message = "Special characters are not allowed")
    private String service;
    @SafeHtml
    @OptionalPattern(regex = MicroserviceConstants.ALPHANUMERICWITHALLSPECIALCHAR, message = "Special characters are not allowed")
    private String glCode;
    private Long fromDate;
    private Long toDate;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getTaxHead() {
        return taxHead;
    }

    public void setTaxHead(String taxHead) {
        this.taxHead = taxHead;
    }

    public String getService() {
        return service;
    }

    public void setService(String service) {
        this.service = service;
    }

    public String getGlCode() {
        return glCode;
    }

    public void setGlCode(String glCode) {
        this.glCode = glCode;
    }

    public Long getFromDate() {
        return fromDate;
    }

    public void setFromDate(Long fromDate) {
        this.fromDate = fromDate;
    }

    public Long getToDate() {
        return toDate;
    }

    public void setToDate(Long toDate) {
        this.toDate = toDate;
    }

}
