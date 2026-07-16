package org.egov.echallan.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.validator.constraints.SafeHtml;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustIdMapping {

    @JsonProperty("id")
    @SafeHtml
    private String id;

    @JsonProperty("tenantId")
    @SafeHtml
    private String tenantId;

    @JsonProperty("accountId")
    @SafeHtml
    private String accountId;

    @JsonProperty("custId")
    @SafeHtml
    private String custId;

    @JsonProperty("ddnNumber")
    @SafeHtml
    private String ddnNumber;
    
    @JsonProperty("mobilenumber")
    @SafeHtml
    private String mobilenumber;

    @JsonProperty("createdBy")
    @SafeHtml
    private String createdBy;

    @JsonProperty("lastModifiedBy")
    @SafeHtml
    private String lastModifiedBy;

    @JsonProperty("createdTime")
    private Long createdTime;

    @JsonProperty("lastModifiedTime")
    private Long lastModifiedTime;
}
