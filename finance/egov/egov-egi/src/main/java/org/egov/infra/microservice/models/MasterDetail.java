package org.egov.infra.microservice.models;

import java.io.Serializable;

import org.egov.infra.microservice.utils.MicroserviceConstants;
import org.egov.infra.persistence.validator.annotation.OptionalPattern;
import org.hibernate.validator.constraints.SafeHtml;

public class MasterDetail implements Serializable{
    
    @SafeHtml
    @OptionalPattern(regex = MicroserviceConstants.ALPHANUMERICWITHALLSPECIALCHAR, message = "Special characters are not allowed")
    private String name;
    @SafeHtml
    @OptionalPattern(regex = MicroserviceConstants.ALPHANUMERICWITHALLSPECIALCHAR, message = "Special characters are not allowed")
    private String filter;

    public MasterDetail(String name, String filter) {
        this.name = name;
        this.filter = filter;
    }
    public MasterDetail(){}
    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
    public String getFilter() {
        return filter;
    }
    public void setFilter(String filter) {
        this.filter = filter;
    }
    

}
