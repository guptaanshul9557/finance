package org.egov.echallan.service;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.UUID;

import org.egov.common.contract.request.RequestInfo;
import org.egov.echallan.model.CustIdMapping;
import org.egov.echallan.model.ChallanRequest;
import org.egov.echallan.model.UserInfo;
import org.egov.echallan.repository.CustIdRepository;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class CustIdService {

    private final CustIdRepository custIdRepository;

    private static final SecureRandom RANDOM = new SecureRandom();


    @Autowired
    public CustIdService(CustIdRepository custIdRepository) {
        this.custIdRepository = custIdRepository;
    }

    public void createCustIdMapping(ChallanRequest request) {
        String tenantId = request.getChallan().getTenantId();
        UserInfo citizen = request.getChallan().getCitizen();
        String businessService= request.getChallan().getBusinessService();
        String accountId = request.getChallan().getAccountId();
        String ddnNumber = request.getChallan().getDdnNumber();
        String mobile = request.getChallan().getCitizen() != null ? request.getChallan().getCitizen().getMobileNumber() : null;
        if (accountId == null) {
            if (citizen == null || citizen.getUuid() == null) {
                throw new CustomException("INVALID_ACCOUNT_ID", "AccountId or user UUID must be present to create custId mapping");
            }
            accountId = citizen.getUuid();
            request.getChallan().setAccountId(accountId);
        }
        String custId = null;
        custId = custIdRepository.findCustIdByMobileNumber(tenantId, mobile);
            if (custId != null) {
                request.getChallan().setCustId(custId);
                return; // existing custId found — skip generation and persistence entirely
            }
            custId = generateCustId(tenantId, businessService);
            request.getChallan().setCustId(custId);

        RequestInfo requestInfo = request.getRequestInfo();
        String userUuid = requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getUuid() : null;

        CustIdMapping mapping = CustIdMapping.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(tenantId)
                .accountId(accountId)
                .custId(custId)
                .ddnNumber(ddnNumber)
                .mobilenumber(mobile)
                .createdBy(userUuid)
                .lastModifiedBy(userUuid)
                .createdTime(System.currentTimeMillis())
                .lastModifiedTime(System.currentTimeMillis())
                .build();

        custIdRepository.saveCustIdMapping(mapping);
    }

    private String generateCustId(String tenantId, String businessService) {
        String tenantCode = normalizeCode(tenantId);
        String serviceCode = normalizeCode(businessService);

        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();
        int suffix = RANDOM.nextInt(900_000) + 100_000; // 6-digit random

        return String.format("%s-%s-%02d-%04d-%06d", tenantCode, serviceCode, month, year, suffix);
    }

    private String normalizeCode(String value) {
        if (!StringUtils.hasText(value)) {
            return "XXX";
        }
        String raw = value.contains(".") ? value.substring(value.lastIndexOf('.') + 1) : value;
        raw = raw.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (raw.length() >= 3) {
            return raw.substring(0, 3);
        }
        return String.format("%-3s", raw).replace(' ', 'X');
    }
}
