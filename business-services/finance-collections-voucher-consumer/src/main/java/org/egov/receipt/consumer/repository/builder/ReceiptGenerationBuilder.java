package org.egov.receipt.consumer.repository.builder;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

@Component
public class ReceiptGenerationBuilder {	
	 
	
	public static final String RECEIPT_GENERATION_FAILED_DATA ="SELECT * FROM egf_voucher_integration_log WHERE status = 'FAILED'\r\n"
			+ "			AND type = 'Receipt' and vouchernumber='' \r\n"
			+ "			AND createddate >'2026-06-08 00:00:00.00' \r\n"
			+ "			ORDER BY createddate asc LIMIT ?"; //For prod 2 hours
		 // + "			AND createddate >='2025-02-11 00:00:00.00' AND createddate <='2025-02-11 23:58:00.00' ";
	
	public static final String RECEIPT_PAYMENT_DETAILS_DATA = "select * from egcl_paymentdetail pd\r\n"
			+ "inner join egcl_payment ep on pd.paymentid =ep.id \r\n"
			+ "where pd.receiptnumber=?";
	

}
