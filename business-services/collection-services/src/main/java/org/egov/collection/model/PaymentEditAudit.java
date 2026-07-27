package org.egov.collection.model;



import com.fasterxml.jackson.annotation.JsonProperty;
import org.hibernate.validator.constraints.SafeHtml;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentEditAudit {
	
	
	   @Size(max=64)
	   @JsonProperty("id")
	   private String id;
	   
	   @NotNull
	   @Size(max=64)
	   @JsonProperty("paymentId")
	   private String paymentId;
	   
	   @NotNull
	   @Size(max=64)
	   @SafeHtml
	   @JsonProperty("receiptNumber")
	   private String receiptNumber;
	   
	   
	   @NotNull
	   @Size(max=2048)
	   @SafeHtml
	   @JsonProperty("modifiedFields")
	   private String modifiedFields;
	   
	   @NotNull
	   @Size(max=64)
	   @SafeHtml
	   @JsonProperty("modifiedBy")
	   private String modifiedBy;
	   
	   @NotNull
	   @JsonProperty("modifiedTime")
	   private Long modifiedTime;

}
