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

package org.egov.commons.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.persistence.metamodel.EntityType;
import javax.persistence.metamodel.Metamodel;

import org.egov.infra.utils.DateUtils;
import org.egov.commons.Fund;
import org.egov.commons.UtilizationCertificate;
import org.egov.commons.contracts.FundSearchRequest;
import org.egov.commons.contracts.UTCertificateSearchRequest;
import org.egov.commons.repository.UtilizationCertificateRepository;
import org.egov.infra.admin.master.repository.CityRepository;
import org.egov.infra.config.core.ApplicationThreadLocals;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UtilizationCertificateService {

	private final UtilizationCertificateRepository utilizationCertificateRepository;
	
	@PersistenceContext
	private EntityManager entityManager;
	
	@Autowired
	private CFinancialYearService cFinancialYearService;
	
	@Autowired
	private CityRepository cityRepository;

	@Autowired
	public UtilizationCertificateService(final UtilizationCertificateRepository utilizationCertificateRepository) {
		this.utilizationCertificateRepository = utilizationCertificateRepository;
	}
	
	@Transactional
	public UtilizationCertificate create(final UtilizationCertificate utc) {
		
		UtilizationCertificate utilizationCertificate = new UtilizationCertificate();

	    Long userId = ApplicationThreadLocals.getUserId();
	    Date currentDate = DateUtils.now();
	    
	    utilizationCertificate.setCreatedby(userId);
	    utilizationCertificate.setCreatedDate(currentDate);
	    utilizationCertificate.setLastModifiedBy(userId);
	    utilizationCertificate.setLastModifiedDate(currentDate);
	    utilizationCertificate.setPurpose(utc.getPurpose());
	    utilizationCertificate.setSignatoryDesignation(utc.getSignatoryDesignation());
	    utilizationCertificate.setSignatoryName(utc.getSignatoryName());

	    utilizationCertificate.setCertificateDate(currentDate);
	    utilizationCertificate.setFinancialYearId(utc.getFinancialYearId());
	    utilizationCertificate.setUcNumber(generateUcNumber(utc.getFinancialYearId()));

	    utilizationCertificate.setTotalAvailableFunds(utc.getTotalAvailableFunds());
	    utilizationCertificate.setUnutilisedBalance(utc.getUnutilisedBalance());
	    utilizationCertificate.setGrantAmount(utc.getGrantAmount());
	    utilizationCertificate.setPreviousBalance(utc.getPreviousBalance());
	    utilizationCertificate.setUtilisedAmount(utc.getUtilisedAmount());
	    utilizationCertificate.setStatus(utc.getStatus());

	    if (utc.getCertificateNumber() == null || utc.getCertificateNumber().trim().isEmpty()) {
	    	utilizationCertificate.setCertificateNumber(generateCertificateNumber());
	    }

	    return utilizationCertificateRepository.save(utilizationCertificate);
	}
	
	public List<UtilizationCertificate> search(final UTCertificateSearchRequest uTCertificateSearchRequest) {
		final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
		final CriteriaQuery<UtilizationCertificate> createQuery = cb.createQuery(UtilizationCertificate.class);
		final Root<UtilizationCertificate> utilizationCertificate = createQuery.from(UtilizationCertificate.class);
		createQuery.select(utilizationCertificate);
		final Metamodel m = entityManager.getMetamodel();
		final EntityType<UtilizationCertificate> ucEntityType = m.entity(UtilizationCertificate.class);

		final List<Predicate> predicates = new ArrayList<>();
		if (uTCertificateSearchRequest.getUcNumber() != null) {
			final String ucNumber = uTCertificateSearchRequest.getUcNumber().toLowerCase() ;
			predicates.add(cb.isNotNull(utilizationCertificate.get("ucNumber")));
			predicates.add(cb.like(
					cb.lower(utilizationCertificate.get(ucEntityType.getDeclaredSingularAttribute("ucNumber", String.class))), ucNumber));
		}
		

		createQuery.where(predicates.toArray(new Predicate[] {}));
		final TypedQuery<UtilizationCertificate> query = entityManager.createQuery(createQuery);
		return query.getResultList();

	}
	
	@Transactional
	public UtilizationCertificate update(final UtilizationCertificate utilizationCertificate) {
		return utilizationCertificateRepository.save(utilizationCertificate);
	}
	
	
	public UtilizationCertificate findOne(final Long id) {
		return utilizationCertificateRepository.findOne(id);
	}
	
	private String generateCertificateNumber() {

	    return "CERT-" + System.currentTimeMillis();
	}
	
	private String generateUcNumber(Long financialYearId) {
	    String finYearRange = cFinancialYearService.findOne(financialYearId).getFinYearRange();
	    Long seq = utilizationCertificateRepository.getNextSequenceValue();
	    String cityCode = cityRepository.findByCode(ApplicationThreadLocals.getTenantID()).getCode().substring(0, 3).toUpperCase();
	    return cityCode +"/" + finYearRange + "/" + seq;
	}

}