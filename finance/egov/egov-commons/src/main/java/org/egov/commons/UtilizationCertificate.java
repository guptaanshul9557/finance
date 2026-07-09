/*
 *    eGov  SmartCity eGovernance suite aims to improve the internal efficiency,transparency,
 *    accountability and the service delivery of the government  organizations.
 *
 *     Copyright (C) 2017  eGovernments Foundation
 *
 *     The updated version of eGov suite of products as by eGovernments Foundation
 *     is available at http://www.egovernments.org
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program. If not, see http://www.gnu.org/licenses/ or
 *     http://www.gnu.org/licenses/gpl.html .
 *
 *     In addition to the terms of the GPL license to be adhered to in using this
 *     program, the following additional terms are to be complied with:
 *
 *         1) All versions of this program, verbatim or modified must carry this
 *            Legal Notice.
 *            Further, all user interfaces, including but not limited to citizen facing interfaces,
 *            Urban Local Bodies interfaces, dashboards, mobile applications, of the program and any
 *            derived works should carry eGovernments Foundation logo on the top right corner.
 *
 *            For the logo, please refer http://egovernments.org/html/logo/egov_logo.png.
 *            For any further queries on attribution, including queries on brand guidelines,
 *            please contact contact@egovernments.org
 *
 *         2) Any misrepresentation of the origin of the material is prohibited. It
 *            is required that all modified versions of this material be marked in
 *            reasonable ways as different from the original version.
 *
 *         3) This license does not grant any rights to any user of the program
 *            with regards to rights under trademark law for use of the trade names
 *            or trademarks of eGovernments Foundation.
 *
 *   In case of any queries, you can reach eGovernments Foundation at contact@egovernments.org.
 *
 */

package org.egov.commons;

import java.math.BigDecimal;
import java.util.Date;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.validation.constraints.Digits;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

import org.egov.infra.persistence.entity.AbstractPersistable;
import org.egov.infra.persistence.validator.annotation.Unique;
import org.hibernate.validator.constraints.Length;
import org.hibernate.validator.constraints.SafeHtml;

@Entity
@Table(name = "utilization_certificate")
@SequenceGenerator(name = UtilizationCertificate.SEQ, sequenceName = UtilizationCertificate.SEQ, allocationSize = 1)

public class UtilizationCertificate extends AbstractPersistable<Long> {

	
	public static final String SEQ = "seq_utilization_certificate";
    private static final long serialVersionUID = 7977534010758407945L;
    @Id
    @GeneratedValue(generator = UtilizationCertificate.SEQ, strategy = GenerationType.SEQUENCE)
    private Long id;

    @Size(max = 50)
    @SafeHtml
    @Column(name = "uc_number", nullable = false, unique = true)
    private String ucNumber;

    @NotNull
    @Column(name = "financialyear_id", nullable = false)
    private Long financialYearId;

    @NotNull
    @Column(name = "grant_amount")
    private BigDecimal grantAmount;

    @NotNull
    @Column(name = "previous_balance")
    private BigDecimal previousBalance;

    @NotNull
    @Column(name = "utilised_amount")
    private BigDecimal utilisedAmount;

    @NotNull
    @Column(name = "total_available_funds")
    private BigDecimal totalAvailableFunds;

    @NotNull
    @Column(name = "unutilised_balance")
    private BigDecimal unutilisedBalance;

    @Size(max = 100)
    @SafeHtml
    @Column(name = "certificate_number")
    private String certificateNumber;

    @Temporal(TemporalType.DATE)
    @Column(name = "certificate_date")
    private Date certificateDate;

    @Size(max = 150)
    @SafeHtml
    @Column(name = "signatory_name")
    private String signatoryName;

	@Size(max = 200)
    @SafeHtml
    @Column(name = "purpose")
    private String purpose;
    
    @Size(max = 200)
    @SafeHtml
    @Column(name = "signatory_designation")
    private String signatoryDesignation;

    @Size(max = 20)
    @SafeHtml
    @Column(name = "status")
    private String status;

    @Column(name = "created_by")
	private Long createdby;
	
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_date")
    private Date createdDate;
    
    @Column(name = "modified_by")
    private Long lastModifiedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "modified_date")
    private Date lastModifiedDate;

	@Override
	public Long getId() {
		return this.id;
	}

	@Override
	protected void setId(Long id) {
		this.id=id;
	}
	
	public String getUcNumber() {
		return ucNumber;
	}

	public void setUcNumber(String ucNumber) {
		this.ucNumber = ucNumber;
	}


    public String getPurpose() {
		return purpose;
	}

	public void setPurpose(String purpose) {
		this.purpose = purpose;
	}

	public Long getFinancialYearId() {
		return financialYearId;
	}

	public void setFinancialYearId(Long financialYearId) {
		this.financialYearId = financialYearId;
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

	public String getCertificateNumber() {
		return certificateNumber;
	}

	public void setCertificateNumber(String certificateNumber) {
		this.certificateNumber = certificateNumber;
	}

	public Date getCertificateDate() {
		return certificateDate;
	}

	public void setCertificateDate(Date certificateDate) {
		this.certificateDate = certificateDate;
	}

	public String getSignatoryName() {
		return signatoryName;
	}

	public void setSignatoryName(String signatoryName) {
		this.signatoryName = signatoryName;
	}

	public String getSignatoryDesignation() {
		return signatoryDesignation;
	}

	public void setSignatoryDesignation(String signatoryDesignation) {
		this.signatoryDesignation = signatoryDesignation;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}
	
	public Long getCreatedby() {
		return createdby;
	}

	public void setCreatedby(Long createdby) {
		this.createdby = createdby;
	}

	public Date getCreatedDate() {
		return createdDate;
	}

	public void setCreatedDate(Date createdDate) {
		this.createdDate = createdDate;
	}

	public Long getLastModifiedBy() {
		return lastModifiedBy;
	}

	public void setLastModifiedBy(Long lastModifiedBy) {
		this.lastModifiedBy = lastModifiedBy;
	}

	public Date getLastModifiedDate() {
		return lastModifiedDate;
	}

	public void setLastModifiedDate(Date lastModifiedDate) {
		this.lastModifiedDate = lastModifiedDate;
	}


}
