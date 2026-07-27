package org.egov.infra.microservice.models;

import java.util.List;

import org.egov.infra.microservice.utils.MicroserviceConstants;
import org.egov.infra.persistence.validator.annotation.OptionalPattern;
import org.hibernate.validator.constraints.SafeHtml;

public class MdmsCriteria {
    @SafeHtml
    @OptionalPattern(regex = MicroserviceConstants.ALPHANUMERICWITHALLSPECIALCHAR, message = "Special characters are not allowed")
    private String tenantId;
    
    private List<ModuleDetail> moduleDetails;

    public MdmsCriteria(String tenantId, List<ModuleDetail> moduleDetails) {
        this.tenantId = tenantId;
        this.moduleDetails = moduleDetails;
    }
    
    public MdmsCriteria(){}

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public List<ModuleDetail> getModuleDetails() {
        return moduleDetails;
    }

    public void setModuleDetails(List<ModuleDetail> moduleDetails) {
        this.moduleDetails = moduleDetails;
    }
    
    
}
