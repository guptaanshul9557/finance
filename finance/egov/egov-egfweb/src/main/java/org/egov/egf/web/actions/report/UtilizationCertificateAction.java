package org.egov.egf.web.actions.report;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.struts2.convention.annotation.Action;
import org.apache.struts2.convention.annotation.ParentPackage;
import org.apache.struts2.convention.annotation.Result;
import org.apache.struts2.convention.annotation.Results;
import org.egov.commons.UtilizationCertificate;
import org.egov.commons.repository.UtilizationCertificateRepository;
import org.egov.egf.model.BankAdviceReportInfo;
import org.egov.egf.model.UCReportInfo;
import org.egov.infra.admin.master.entity.City;
import org.egov.infra.config.core.ApplicationThreadLocals;
import org.egov.infra.reporting.engine.ReportFormat;
import org.egov.infra.reporting.engine.ReportOutput;
import org.egov.infra.reporting.engine.ReportRequest;
import org.egov.infra.reporting.engine.ReportService;
import org.egov.infra.reporting.viewer.ReportViewerUtil;
import org.egov.infra.web.struts.actions.BaseFormAction;
import org.springframework.beans.factory.annotation.Autowired;

import com.opensymphony.xwork2.ActionSupport;

@ParentPackage("egov")
@Results({

		@Result(name = "reportview", type = "stream", location = "inputStream", params = { "contentType",
				"${contentType}", "contentDisposition", "attachment; filename=${fileName}" }),

})
public class UtilizationCertificateAction extends BaseFormAction {

	private String ucNumber;
	private String financialYear;
	private String purpose;
	private BigDecimal grantAmount;
	private BigDecimal previousBalance;
	private BigDecimal utilisedAmount;
	private BigDecimal totalAvailableFunds;
	private BigDecimal unutilisedBalance;

	private String contentType;
	private String fileName;
	private ReportService reportService;
	private InputStream inputStream;

	@Autowired
	private UtilizationCertificateRepository utilizationCertificateRepository;

	public String getContentType() {
		return contentType;
	}

	public void setContentType(String contentType) {
		this.contentType = contentType;
	}

	public String getFileName() {
		return fileName;
	}

	public void setFileName(String fileName) {
		this.fileName = fileName;
	}

	public InputStream getInputStream() {
		return inputStream;
	}

	public void setInputStream(InputStream inputStream) {
		this.inputStream = inputStream;
	}

	public ReportService getReportService() {
		return reportService;
	}

	@Action(value = "/report/printUC-exportpdf")
	public String exportpdf() {
		final Map<String, Object> reportParams = new HashMap<String, Object>();
		final StringBuffer letterContext = new StringBuffer();

		final UCReportInfo ucReport = getUCReportInfo();
		final ReportRequest reportInput = new ReportRequest("UCReport", ucReport, reportParams);
		reportInput.setReportFormat(ReportFormat.PDF);
		contentType = ReportViewerUtil.getContentType(ReportFormat.PDF);
		fileName = "UCReport." + ReportFormat.PDF.toString().toLowerCase();
		final ReportOutput reportOutput = reportService.createReport(reportInput);
		if (reportOutput != null && reportOutput.getReportOutputData() != null)
			inputStream = new ByteArrayInputStream(reportOutput.getReportOutputData());

		return "reportview";
	}

	private UCReportInfo getUCReportInfo() {
		UtilizationCertificate byUcNumber = utilizationCertificateRepository.findByUcNumber(ucNumber);
		UCReportInfo ucReport = new UCReportInfo();
		ucReport.setFinancialYear(financialYear);
		ucReport.setGrantAmount(byUcNumber.getGrantAmount());
		ucReport.setPreviousBalance(byUcNumber.getPreviousBalance());
		ucReport.setPurpose(byUcNumber.getPurpose());
		ucReport.setTotalAvailableFunds(byUcNumber.getTotalAvailableFunds());
		ucReport.setUcNumber(byUcNumber.getUcNumber());
		ucReport.setUnutilisedBalance(byUcNumber.getUnutilisedBalance());
		ucReport.setUtilisedAmount(byUcNumber.getUtilisedAmount());
		ucReport.setCertificateDate(byUcNumber.getCertificateDate());
		ucReport.setSignatoryName(byUcNumber.getSignatoryName());
		ucReport.setSignatoryDesignation(byUcNumber.getSignatoryDesignation());
		ucReport.setStatus(byUcNumber.getStatus());
		return ucReport;
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

	public void setReportService(final ReportService reportService) {
		this.reportService = reportService;
	}

	@Override
	public Object getModel() {
		// TODO Auto-generated method stub
		return null;
	}

}
