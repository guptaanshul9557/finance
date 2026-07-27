package org.egov.receipt.consumer.util;

import java.util.Arrays;
import java.util.List;

import javax.transaction.Transactional;

import org.egov.receipt.consumer.entity.VoucherIntegrationLog;
import org.egov.receipt.consumer.entity.paymentDetails;
import org.egov.receipt.consumer.model.Bill;
import org.egov.receipt.consumer.model.FinanceMdmsModel;
import org.egov.receipt.consumer.model.ProcessStatus;
import org.egov.receipt.consumer.model.Receipt;
import org.egov.receipt.consumer.model.ReceiptReq;
import org.egov.receipt.consumer.model.VoucherResponse;
import org.egov.receipt.consumer.repository.ReceiptGenerationRowMapper;
import org.egov.receipt.consumer.repository.builder.ReceiptGenerationBuilder;
import org.egov.receipt.consumer.service.InstrumentService;
import org.egov.receipt.consumer.service.ReceiptService;
import org.egov.receipt.consumer.service.VoucherService;
import org.egov.receipt.custom.exception.VoucherCustomException;
import org.egov.reciept.consumer.config.PropertiesManager;
import org.egov.tracer.model.CustomException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;


@Service
public class ReceiptGenerationScheduler {
	

	@Autowired
	private ObjectMapper mapper;

	@Autowired
	private RestTemplate restTemplate;
	
	@Autowired
	private JdbcTemplate jdbcTemplate;
	
	@Autowired
	private ReceiptGenerationRowMapper ReceiptGenerationRowMapper ;
	
	
	@Autowired
	private VoucherService voucherService;
	
	@Autowired
	private ReceiptService receiptService;
	
	@Autowired
	private InstrumentService instrumentService;

	@Autowired
	private PropertiesManager manager;

	public static final Logger LOGGER = LoggerFactory.getLogger(ReceiptGenerationScheduler.class);
	private static final int DEFAULT_BATCH_SIZE = 300;
	private static final String RECEIPT_TYPE = "Receipt";
	private static final String COLLECTION_VERSION = "V2";


	//@Scheduled(cron = "0 */2 * * * *", zone = "Asia/Calcutta") // 2 minutes
	@Transactional
	// @Scheduled(cron = "0 0 */2 * * *", zone = "Asia/Calcutta") // 2 hours
	@Scheduled(cron = "0 */30 * * * *", zone = "Asia/Calcutta")
	public void receiptGenerationScheduler() {
		int batchSize = manager.getReceiptGenerationSchedulerBatchSize();
		if (batchSize <= 0) {
			LOGGER.warn("Configured receipt.generation.scheduler.batch.size : {} is invalid, falling back to default : {}", batchSize, DEFAULT_BATCH_SIZE);
			batchSize = DEFAULT_BATCH_SIZE;
		}
		LOGGER.info("receiptGenerationScheduler cron started, batchSize : {}", batchSize);
        ReceiptReq recRequest = ReceiptReq.builder().build();

		try {
			String voucherNumber = "";
			VoucherResponse voucherResponse = null;
			List<VoucherIntegrationLog> receiptGenerationFailedData = getReceiptGenerationFailedData(batchSize);
			LOGGER.info("Fetched {} failed receipt generation record(s) for processing", receiptGenerationFailedData.size());
			for (VoucherIntegrationLog voucherIntegrationLog : receiptGenerationFailedData) {
			try {
				FinanceMdmsModel finSerMdms = new FinanceMdmsModel();
				int updateVoucherIntegLogStatusprogress = updateVoucherIntegLogStatusProgress(voucherIntegrationLog.getReferenceNumber());
				 String requestJson = voucherIntegrationLog.getRequestJson();
				 ObjectMapper objectMapper = new ObjectMapper();
				 recRequest = objectMapper.readValue(requestJson, ReceiptReq.class);
				 //ReceiptReq recRequest = mapper.readValue(requestJson, ReceiptReq.class);
				 //paymentDetails payRequest = getReceiptPaymentDetails(voucherIntegrationLog.getReferenceNumber());
//				 VoucherAndMisResponse vmResponse = voucherService.createReceiptVoucherForScheduler(recRequest, finSerMdms, null,payRequest);
//				 voucherResponse = vmResponse.getVoucherResponse();
				 boolean misSuccess = false;
					String description = "";
	        		ProcessStatus status = ProcessStatus.SUCCESS;
	        		ReceiptReq recRequestTemp = ReceiptReq.builder().requestInfo(recRequest.getRequestInfo()).build();
					for (Receipt recpt : recRequest.getReceipt()) {
						recRequestTemp.setReceipt(Arrays.asList(recpt));
						Bill bill = recpt.getBill().get(0);
						VoucherResponse voucherByServiceAndRefDoc = voucherService.getVoucherByServiceAndRefDoc(recRequestTemp.getRequestInfo(), recpt.getTenantId(), null, recpt.getInstrument().getPaymentId());
						if (voucherService.isVoucherCreationEnabled(recpt, recRequestTemp.getRequestInfo(), finSerMdms)) {
							if(voucherByServiceAndRefDoc!=null && !voucherByServiceAndRefDoc.getVouchers().isEmpty() && !voucherByServiceAndRefDoc.getVouchers().get(0).getStatus().getCode().equals("4")){
	        					voucherNumber = voucherByServiceAndRefDoc.getVouchers().get(0).getVoucherNumber();
	        					throw new VoucherCustomException(ProcessStatus.NA, String.format("Already voucher exists (%1$s) for service %2$s with reference number: %3$s.", voucherNumber, bill.getBusinessService(), recpt.getPaymentId()));
	        				}
	        				VoucherResponse createReceiptVoucher = voucherService.createReceiptVoucher(recRequestTemp, finSerMdms, COLLECTION_VERSION);
	        				if(voucherResponse == null){
	        					voucherResponse = createReceiptVoucher;
	        				}else{
	        					voucherResponse.getVouchers().addAll(createReceiptVoucher.getVouchers());
	        				}
//	       				 
	        				if(voucherNumber.isEmpty()){
	        					voucherNumber = voucherResponse.getVouchers().get(0).getVoucherNumber();
	        				}else{
	        					voucherNumber = ", " + voucherNumber;
	        				}
//	        				receiptService.updateReceipt(recRequest, voucherResponse);
						}
					}
					instrumentService.createInstrument(recRequest, voucherResponse, finSerMdms, COLLECTION_VERSION);
					description = String.format("Voucher created successfully with VoucherNumber : %1$s", voucherNumber);
					status = ProcessStatus.SUCCESS;
				LOGGER.debug("Processed voucher for referenceNumber : {}, misSuccess : {}, voucherResponse : {}", voucherIntegrationLog.getReferenceNumber(), misSuccess, voucherResponse);

				 if (voucherResponse != null && voucherResponse.getVouchers() != null &&!voucherResponse.getVouchers().isEmpty()) {
					 int updateVoucherIntegLogStatus = updateVoucherIntegLogStatus(recRequest.getReceipt().get(0).getReceiptNumber(),voucherResponse.getVouchers().get(0).getVoucherNumber());
					 LOGGER.info("Updated voucher integration log to SUCCESS for referenceNumber : {}, voucherNumber : {}, rowsUpdated : {}", voucherIntegrationLog.getReferenceNumber(), voucherResponse.getVouchers().get(0).getVoucherNumber(), updateVoucherIntegLogStatus);
				 }else {
					 LOGGER.warn("VoucherResponse was null or had empty vouchers for referenceNumber : {}", voucherIntegrationLog.getReferenceNumber());
				 }
				 } catch (Exception innerEx) {
		                // Log and continue with next record
					 LOGGER.error("Exception occurred while processing referenceNumber : {}", voucherIntegrationLog.getReferenceNumber(), innerEx);
		           updateVoucherIntegLogStatusInProgressToFailed(voucherIntegrationLog.getReferenceNumber());
		         }
			}
			LOGGER.info("receiptGenerationScheduler run completed, batchSize : {}, recordsFetched : {}", batchSize, receiptGenerationFailedData.size());
		} catch (Exception e) {
			LOGGER.error("Exception in receiptGenerationScheduler method", e);
			throw new CustomException("Exception in receiptGenerationScheduler method",e.getMessage());
		}

	}
		
	@Transactional
	public int updateVoucherIntegLogStatusInProgressToFailed(String referenceNumber) {
		int updatestatus=0;
        try {
        	updatestatus = jdbcTemplate.update("UPDATE egf_voucher_integration_log SET status = 'FAILED' WHERE referencenumber = ?", referenceNumber);
        } catch (Exception e) {
            LOGGER.error("Exception in updateVoucherIntegLogStatusInProgressToFailed method for referenceNumber : {}", referenceNumber, e);
            throw new RuntimeException("Exception in updateVoucherIntegLogStatusProgress method: " + e.getMessage());
        }
        return updatestatus;
    }

	public List<VoucherIntegrationLog> getReceiptGenerationFailedData(int batchSize) {
		try {
				return jdbcTemplate.query(ReceiptGenerationBuilder.RECEIPT_GENERATION_FAILED_DATA,
						new Object[] { batchSize
									 }, ReceiptGenerationRowMapper);

		} catch (Exception e) {
			LOGGER.error("Exception occurred while fetching receipt generation failed data, batchSize : {}", batchSize, e);
			throw new CustomException("Exception",e.getMessage());
		}

	}

//	public paymentDetails getReceiptPaymentDetails(String receiptNo) {
//
//		try {
//				return jdbcTemplate.query(ReceiptGenerationBuilder.RECEIPT_PAYMENT_DETAILS_DATA,
//						new Object[] {receiptNo
//									 }, paymentReceiptRowMapper);
//
//		} catch (Exception e) {
//			LOGGER.error("Exception occurred while fetching receipt payment details for receiptNo : {}", receiptNo, e);
//			throw new CustomException("Exception",e.getMessage());
//		}
//
//	}



	@Transactional
    public int updateVoucherIntegLogStatus(String receiptNo,String voucherNo) {
		int updatestatus=0;
        try {
        	String description = "Voucher created successfully with VoucherNumber : " + voucherNo;
        	updatestatus = jdbcTemplate.update("UPDATE egf_voucher_integration_log SET status = 'SUCCESS',vouchernumber='"+voucherNo+"',description='"+description+"' WHERE referencenumber = ?", receiptNo);
        } catch (Exception e) {
            LOGGER.error("Failed to update egf_voucher_integration_log to SUCCESS for receiptNo : {}, voucherNo : {}", receiptNo, voucherNo, e);
            throw new RuntimeException("Failed to update egf_voucher_integration_log: " + e.getMessage());
        }
        return updatestatus;
    }
	
	@Transactional
    public int updateVoucherIntegLogStatusProgress(String receiptNo) {
		int updatestatus=0;
        try {
        	updatestatus = jdbcTemplate.update("UPDATE egf_voucher_integration_log SET status = 'INPROGRESS' WHERE referencenumber = ?", receiptNo);
        } catch (Exception e) {
            LOGGER.error("Exception in updateVoucherIntegLogStatusProgress method for receiptNo : {}", receiptNo, e);
            throw new RuntimeException("Exception in updateVoucherIntegLogStatusProgress method: " + e.getMessage());
        }
        return updatestatus;
    }

}
