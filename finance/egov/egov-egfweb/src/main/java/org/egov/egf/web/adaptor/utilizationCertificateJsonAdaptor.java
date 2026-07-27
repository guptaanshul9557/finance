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

package org.egov.egf.web.adaptor;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;

import org.egov.commons.CFinancialYear;
import org.egov.commons.Fund;
import org.egov.commons.UtilizationCertificate;
import org.egov.commons.service.CFinancialYearService;
import org.springframework.beans.factory.annotation.Autowired;

import java.lang.reflect.Type;
public class utilizationCertificateJsonAdaptor implements JsonSerializer<UtilizationCertificate>
{
	private CFinancialYearService cFinancialYearService;

	public utilizationCertificateJsonAdaptor(CFinancialYearService cFinancialYearService) {
		this.cFinancialYearService = cFinancialYearService;
	}
	
	@Override
	public JsonElement serialize(final UtilizationCertificate utilizationCertificate, final Type type,final JsonSerializationContext jsc) 
	{
		final JsonObject jsonObject = new JsonObject();
		if (utilizationCertificate != null)
		{
			if(utilizationCertificate.getUcNumber()!=null)
				jsonObject.addProperty("ucNumber", utilizationCertificate.getUcNumber());
			else
				jsonObject.addProperty("ucNumber","");
			
			if(utilizationCertificate.getPurpose()!=null)
				jsonObject.addProperty("purpose", utilizationCertificate.getPurpose());
			else
				jsonObject.addProperty("purpose","");
			
			if(utilizationCertificate.getFinancialYearId() !=null) {
				final CFinancialYear cFinancialYear = cFinancialYearService.findOne(utilizationCertificate.getFinancialYearId());
			    String financialYear = cFinancialYear != null ? cFinancialYear.getFinYearRange() : null;
				jsonObject.addProperty("financialYear", financialYear);
			}
			else {
				jsonObject.addProperty("financialYear","");}
			if(utilizationCertificate.getGrantAmount() !=null)
				jsonObject.addProperty("grantAmount", utilizationCertificate.getGrantAmount());
			else
				jsonObject.addProperty("grantAmount","");
			if(utilizationCertificate.getUtilisedAmount() !=null)
				jsonObject.addProperty("utilizedAmount", utilizationCertificate.getUtilisedAmount());
			else
				jsonObject.addProperty("utilizedAmount","");
			
			if(utilizationCertificate.getUnutilisedBalance()!=null)
				jsonObject.addProperty("unutilisedBalance", utilizationCertificate.getUnutilisedBalance());
			else
				jsonObject.addProperty("unutilisedBalance","");
			if(utilizationCertificate.getTotalAvailableFunds() !=null)
				jsonObject.addProperty("totalAvailableFunds", utilizationCertificate.getTotalAvailableFunds());
			else
				jsonObject.addProperty("totalAvailableFunds","");
			if(utilizationCertificate.getCertificateDate()!=null)
				jsonObject.addProperty("certificateDate", utilizationCertificate.getCertificateDate().toString());
			else
				jsonObject.addProperty("certificateDate","");
			
			jsonObject.addProperty("id", utilizationCertificate.getId());
		} 
		return jsonObject;  }
}