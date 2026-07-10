package org.egov.egf.model;

import java.math.BigDecimal;

import java.util.Date;

import org.springframework.transaction.annotation.Transactional;


public class UCReportInfo {

	private String ucNumber;
    private String financialYear;
    private String purpose;
    private BigDecimal grantAmount;
    private BigDecimal previousBalance;
    private BigDecimal utilisedAmount;
    private BigDecimal totalAvailableFunds;
    private BigDecimal unutilisedBalance;
    private Date certificateDate;
    private String status;
    private String signatoryDesignation;
    private String certificateNumber;
    private String signatoryName;
    
    
    
	public String getStatus() {
		return status;
	}
	public void setStatus(String status) {
		this.status = status;
	}
	public String getSignatoryDesignation() {
		return signatoryDesignation;
	}
	public void setSignatoryDesignation(String signatoryDesignation) {
		this.signatoryDesignation = signatoryDesignation;
	}
	public String getCertificateNumber() {
		return certificateNumber;
	}
	public void setCertificateNumber(String certificateNumber) {
		this.certificateNumber = certificateNumber;
	}
	public String getSignatoryName() {
		return signatoryName;
	}
	public void setSignatoryName(String signatoryName) {
		this.signatoryName = signatoryName;
	}
	public Date getCertificateDate() {
		return certificateDate;
	}
	public void setCertificateDate(Date certificateDate) {
		this.certificateDate = certificateDate;
	}
	public String getUcNumber() {
		return ucNumber;
	}
	public void setUcNumber(String ucNumber) {
		this.ucNumber = ucNumber;
	}
	public String getFinancialYear() {
		return financialYear;
	}
	public void setFinancialYear(String financialYear) {
		this.financialYear = financialYear;
	}
	public String getPurpose() {
		return purpose;
	}
	public void setPurpose(String purpose) {
		this.purpose = purpose;
	}
	public BigDecimal getGrantAmount() {
		return grantAmount;
	}
	public void setGrantAmount(BigDecimal grantAmount) {
		this.grantAmount = grantAmount;
	}
	public BigDecimal getPreviousBalance() {
		return previousBalance;
	}
	public void setPreviousBalance(BigDecimal previousBalance) {
		this.previousBalance = previousBalance;
	}
	public BigDecimal getUtilisedAmount() {
		return utilisedAmount;
	}
	public void setUtilisedAmount(BigDecimal utilisedAmount) {
		this.utilisedAmount = utilisedAmount;
	}
	public BigDecimal getTotalAvailableFunds() {
		return totalAvailableFunds;
	}
	public void setTotalAvailableFunds(BigDecimal totalAvailableFunds) {
		this.totalAvailableFunds = totalAvailableFunds;
	}
	public BigDecimal getUnutilisedBalance() {
		return unutilisedBalance;
	}
	public void setUnutilisedBalance(BigDecimal unutilisedBalance) {
		this.unutilisedBalance = unutilisedBalance;
	}
    
    
    
    
    
}
