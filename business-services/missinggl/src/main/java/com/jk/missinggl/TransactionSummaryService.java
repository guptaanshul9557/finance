package com.jk.missinggl;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class TransactionSummaryService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Transactional(rollbackFor = Exception.class)
    public String generateQueries(MultipartFile file) throws Exception {

        List<String> queries = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {

            Sheet sheet = workbook.getSheet("BS");

            if (sheet == null) {
                throw new ExcelProcessingException(
                        "BS sheet not found in uploaded Excel file. Please ensure the sheet is named 'BS'.");
            }

            DataFormatter formatter = new DataFormatter();
            FormulaEvaluator formulaEvaluator = workbook.getCreationHelper()
                    .createFormulaEvaluator();

            Map<String, Integer> columnMap = getColumnMap(sheet.getRow(0), formatter);

            validateBSColumns(columnMap);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {

                Row row = sheet.getRow(i);

                if (row == null || isRowEmpty(row, formatter, formulaEvaluator)) {
                    continue;
                }

                String schema = getCellValue(row, columnMap.get("ulb"), formatter, formulaEvaluator);
                String financialYear = getCellValue(row, columnMap.get("financialyear"), formatter, formulaEvaluator);
                String departmentCode = getCellValue(row, columnMap.get("department"), formatter, formulaEvaluator);
                String fundCode = getCellValue(row, columnMap.get("fund"), formatter, formulaEvaluator);
                String functionCode = getCellValue(row, columnMap.get("function"), formatter, formulaEvaluator);
                String glCode = getCellValue(row, columnMap.get("glcode"), formatter, formulaEvaluator);

                double openingDebit = getNumericValue(
                        row.getCell(columnMap.get("openingdebitbalance")),
                        i + 1,
                        "Opening Debit Balance",
                        formatter,
                        formulaEvaluator);

                double openingCredit = getNumericValue(
                        row.getCell(columnMap.get("openingcreditbalance")),
                        i + 1,
                        "Opening Credit Balance",
                        formatter,
                        formulaEvaluator);

                if (schema.isEmpty() || glCode.isEmpty()) {
                    continue;
                }

                String sql = "INSERT INTO " + schema + ".transactionsummary "
                        + "(id, glcodeid, openingdebitbalance, openingcreditbalance, "
                        + "accountdetailtypeid, accountdetailkey, financialyearid, "
                        + "fundid, fundsourceid, narration, lastmodifiedby, "
                        + "lastmodifieddate, departmentcode, functionaryid, "
                        + "functionid, divisionid, version, createdby, createddate) "
                        + "VALUES ("
                        + "nextval('" + schema + ".seq_transactionsummary'), "
                        + "(SELECT id FROM " + schema + ".chartofaccounts WHERE glcode='"
                        + escapeSql(glCode) + "'), "
                        + formatAmount(openingDebit) + ", "
                        + formatAmount(openingCredit) + ", "
                        + "NULL, NULL, "
                        + "(SELECT id FROM " + schema + ".financialyear WHERE financialyear='"
                        + escapeSql(financialYear) + "'), "
                        + "(SELECT id FROM " + schema + ".fund WHERE code='1000'), "
                        + "NULL, NULL, NULL, CURRENT_TIMESTAMP, "
                        + "'DEPT_25', "
                        + "NULL, "
                        + "(SELECT id FROM " + schema + ".\"function\" WHERE code='1010'), "
                        + "NULL, 0, NULL, CURRENT_TIMESTAMP"
                        + ");";

                queries.add(sql);
            }
            try {
                int batchSize = 500;
                for (int startIndex = 0; startIndex < queries.size(); startIndex += batchSize) {
                    List<String> chunk = queries.subList(startIndex, Math.min(startIndex + batchSize, queries.size()));
                    jdbcTemplate.batchUpdate(chunk.toArray(new String[0]));
                }
            } catch (org.springframework.dao.DataAccessException e) {
                String cause = e.getRootCause() != null ? e.getRootCause().getMessage() : e.getMessage();
                throw new ExcelProcessingException("Database insertion failed for BS sheet. Reason: " + cause, e);
            }
        } catch (ExcelProcessingException ex) {
            throw ex;
        } catch (Exception e) {
            throw new ExcelProcessingException("Failed to process BS sheet. Reason: " + e.getMessage(), e);
        }

        return "Successfully generated and inserted " + queries.size() + " queries for BS.";
    }

    @Transactional(rollbackFor = Exception.class)
    public String generateJVQueries(MultipartFile file) throws Exception {

        List<String> queries = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {

            Sheet sheet = workbook.getSheet("JV");

            if (sheet == null) {
                throw new ExcelProcessingException(
                        "JV sheet not found in uploaded Excel file. Please ensure the sheet is named 'JV'.");
            }

            DataFormatter formatter = new DataFormatter();
            FormulaEvaluator formulaEvaluator = workbook.getCreationHelper()
                    .createFormulaEvaluator();

            Map<String, Integer> columnMap = getColumnMap(sheet.getRow(0), formatter);

            validateJVColumns(columnMap);

            String currentSchema = null;
            String currentVoucherDate = null;
            boolean voucherStarted = false;
            int voucherLineId = 1;

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {

                Row row = sheet.getRow(i);

                if (row == null || isRowEmpty(row, formatter, formulaEvaluator)) {
                    continue;
                }

                String schema = getCellValue(row, columnMap.get("ulb"), formatter, formulaEvaluator);

                String voucherDate = getDateValue(
                        row.getCell(columnMap.get("voucherdate")),
                        formatter,
                        formulaEvaluator);

                String glCode = getCellValue(row, columnMap.get("glcode"), formatter, formulaEvaluator);

                double debitAmount = getNumericValue(
                        row.getCell(columnMap.get("debitamount")),
                        i + 1,
                        "Debit Amount",
                        formatter,
                        formulaEvaluator);

                double creditAmount = getNumericValue(
                        row.getCell(columnMap.get("creditamount")),
                        i + 1,
                        "Credit Amount",
                        formatter,
                        formulaEvaluator);

                String functionCode = getCellValue(row, columnMap.get("function"), formatter, formulaEvaluator);
                String departmentCode = getCellValue(row, columnMap.get("department"), formatter, formulaEvaluator);
                String fundCode = getCellValue(row, columnMap.get("fund"), formatter, formulaEvaluator);

                if (schema.isEmpty() || voucherDate.isEmpty() || glCode.isEmpty()) {
                    continue;
                }

                boolean isNewVoucher = !voucherStarted
                        || !schema.equalsIgnoreCase(currentSchema)
                        || !voucherDate.equals(currentVoucherDate);

                if (isNewVoucher) {

                    currentSchema = schema;
                    currentVoucherDate = voucherDate;
                    voucherLineId = 1;
                    voucherStarted = true;

                    queries.add(
                            "INSERT INTO " + currentSchema + ".voucherheader "
                                    + "(id, name, type, description, effectivedate, "
                                    + "vouchernumber, voucherdate, fundid, fiscalperiodid, "
                                    + "status, originalvcid, isconfirmed, createdby, refvhid, "
                                    + "cgvn, lastmodifiedby, lastmodifieddate, moduleid, "
                                    + "state_id, createddate, version) "
                                    + "VALUES ("
                                    + "nextval('" + currentSchema + ".seq_voucherheader'), "
                                    + "'JVGeneral', 'Journal Voucher', '', CURRENT_TIMESTAMP, "
                                    + "'EJV-' || currval('" + currentSchema + ".seq_voucherheader'), "
                                    + "'" + escapeSql(currentVoucherDate) + "', "
                                    + "(SELECT id FROM " + currentSchema + ".fund WHERE code='1000'), "
                                    + "(SELECT id FROM " + currentSchema + ".fiscalperiod "
                                    + "WHERE '" + escapeSql(currentVoucherDate)
                                    + "'::date BETWEEN startingdate::date AND endingdate::date), "
                                    + "3, NULL, 0, NULL, NULL, "
                                    + "'null/JVG/CGVN' || LPAD(currval('"
                                    + currentSchema + ".seq_voucherheader')::text, 10, '0'), "
                                    + "NULL, CURRENT_TIMESTAMP, NULL, 682, CURRENT_TIMESTAMP, 1"
                                    + ");");

                    queries.add(
                            "INSERT INTO " + currentSchema + ".vouchermis "
                                    + "(id, billnumber, divisionid, departmentcode, voucherheaderid, "
                                    + "fundsourceid, schemeid, subschemeid, functionaryid, sourcepath, "
                                    + "budgetary_appnumber, budgetcheckreq, functionid, "
                                    + "referencedocument, servicename) "
                                    + "VALUES ("
                                    + "currval('" + currentSchema + ".seq_voucherheader'), "
                                    + "NULL, NULL, 'DEPT_25', "
                                    + "currval('" + currentSchema + ".seq_voucherheader'), "
                                    + "NULL, NULL, NULL, NULL, NULL, NULL, true, "
                                    + "(SELECT id FROM " + currentSchema
                                    + ".\"function\" WHERE code='1010'), "
                                    + "NULL, NULL"
                                    + ");");
                }

                queries.add(
                        "INSERT INTO " + currentSchema + ".generalledger "
                                + "(id, voucherlineid, effectivedate, glcodeid, glcode, "
                                + "debitamount, creditamount, description, voucherheaderid, "
                                + "functionid, remittancedate) "
                                + "VALUES ("
                                + "nextval('" + currentSchema + ".seq_generalledger'), "
                                + voucherLineId + ", "
                                + "CURRENT_TIMESTAMP, "
                                + "(SELECT id FROM " + currentSchema
                                + ".chartofaccounts WHERE glcode='" + escapeSql(glCode) + "'), "
                                + "'" + escapeSql(glCode) + "', "
                                + formatAmount(debitAmount) + ", "
                                + formatAmount(creditAmount) + ", "
                                + "'', "
                                + "currval('" + currentSchema + ".seq_voucherheader'), "
                                + "(SELECT id FROM " + currentSchema
                                + ".\"function\" WHERE code='1010'), "
                                + "NULL"
                                + ");");

                voucherLineId++;
            }
            try {
                int batchSize = 500;
                for (int startIndex = 0; startIndex < queries.size(); startIndex += batchSize) {
                    List<String> chunk = queries.subList(startIndex, Math.min(startIndex + batchSize, queries.size()));
                    jdbcTemplate.batchUpdate(chunk.toArray(new String[0]));
                }
            } catch (org.springframework.dao.DataAccessException e) {
                String cause = e.getRootCause() != null ? e.getRootCause().getMessage() : e.getMessage();
                throw new ExcelProcessingException("Database insertion failed for JV sheet. Reason: " + cause, e);
            }
        } catch (ExcelProcessingException ex) {
            throw ex;
        } catch (Exception e) {
            throw new ExcelProcessingException("Failed to process JV sheet. Reason: " + e.getMessage(), e);
        }

        return "Successfully generated and inserted " + queries.size() + " queries for JV.";
    }

    @Transactional(rollbackFor = Exception.class)
    public String generateGlCodeQueries(MultipartFile file) throws Exception {

        List<String> queries = new ArrayList<>();
        int recordCount = 0;

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {

            Sheet sheet = workbook.getSheet("GLCODE");
            if (sheet == null) {
                sheet = workbook.getSheetAt(0); // fallback to the first sheet
            }

            DataFormatter formatter = new DataFormatter();
            FormulaEvaluator formulaEvaluator = workbook.getCreationHelper().createFormulaEvaluator();

            Map<String, Integer> columnMap = getColumnMap(sheet.getRow(0), formatter);

            String[] requiredColumns = { "ulb", "glcode", "name" };
            for (String column : requiredColumns) {
                if (!columnMap.containsKey(column)) {
                    throw new ExcelProcessingException(
                            "Required column not found in '" + sheet.getSheetName() + "' sheet: '" + column
                                    + "'. Please ensure exact columns exist.");
                }
            }

            java.util.Set<String> processedCodes = new java.util.HashSet<>();

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {

                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row, formatter, formulaEvaluator)) {
                    continue;
                }

                String schema = getCellValue(row, columnMap.get("ulb"), formatter, formulaEvaluator);
                String glCode = getCellValue(row, columnMap.get("glcode"), formatter, formulaEvaluator);
                String name = getCellValue(row, columnMap.get("name"), formatter, formulaEvaluator);

                // Safety check in case it interprets it as decimal based on formatting
                if (glCode.endsWith(".0"))
                    glCode = glCode.replace(".0", "");

                if (schema.isEmpty() || glCode.isEmpty()) {
                    continue;
                }

                recordCount++;

                String type = "";
                if (glCode.startsWith("1"))
                    type = "I";
                else if (glCode.startsWith("2"))
                    type = "E";
                else if (glCode.startsWith("3"))
                    type = "L";
                else if (glCode.startsWith("4"))
                    type = "A";

                String baseCode = "";
                if (glCode.length() >= 1) {
                    baseCode = glCode.substring(0, 1);
                }

                String majorCode = "";
                if (glCode.length() >= 3) {
                    majorCode = glCode.substring(0, 3);
                    String key = schema + "-" + majorCode;

                    if (!processedCodes.contains(key)) {
                        String grandParentSql = "INSERT INTO " + schema + ".chartofaccounts "
                                + "(id, glcode, \"name\", description, isactiveforposting, parentid, purposeid, operation, \"type\", \"class\", classification, functionreqd, budgetcheckreq, scheduleid, receiptscheduleid, receiptoperation, paymentscheduleid, paymentoperation, majorcode, fiescheduleid, fieoperation, createddate, createdby, lastmodifieddate, lastmodifiedby, \"version\") "
                                + "SELECT nextval('" + schema + ".seq_chartofaccounts'), "
                                + "'" + escapeSql(majorCode) + "', "
                                + "'" + escapeSql(name) + "', "
                                + "NULL, true, "
                                + "(SELECT id FROM " + schema + ".chartofaccounts WHERE glcode='" + escapeSql(baseCode)
                                + "' LIMIT 1), "
                                + "NULL, NULL, "
                                + "'" + type + "', "
                                + "NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, " // Classification 1
                                + "'" + escapeSql(majorCode) + "', "
                                + "NULL, NULL, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP, NULL, 0 "
                                + "WHERE NOT EXISTS (SELECT 1 FROM " + schema + ".chartofaccounts WHERE glcode='"
                                + escapeSql(majorCode) + "');";

                        queries.add(grandParentSql);
                        processedCodes.add(key);
                    }
                }

                String parentGlCode = "";
                if (glCode.length() >= 5) {
                    parentGlCode = glCode.substring(0, 5);
                    String key = schema + "-" + parentGlCode;

                    if (!processedCodes.contains(key)) {
                        String parentSql = "INSERT INTO " + schema + ".chartofaccounts "
                                + "(id, glcode, \"name\", description, isactiveforposting, parentid, purposeid, operation, \"type\", \"class\", classification, functionreqd, budgetcheckreq, scheduleid, receiptscheduleid, receiptoperation, paymentscheduleid, paymentoperation, majorcode, fiescheduleid, fieoperation, createddate, createdby, lastmodifieddate, lastmodifiedby, \"version\") "
                                + "SELECT nextval('" + schema + ".seq_chartofaccounts'), "
                                + "'" + escapeSql(parentGlCode) + "', "
                                + "'" + escapeSql(name) + "', "
                                + "NULL, true, "
                                + "(SELECT id FROM " + schema + ".chartofaccounts WHERE glcode='" + escapeSql(majorCode)
                                + "' LIMIT 1), "
                                + "NULL, NULL, "
                                + "'" + type + "', "
                                + "NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, "
                                + "'" + escapeSql(majorCode) + "', "
                                + "NULL, NULL, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP, NULL, 0 "
                                + "WHERE NOT EXISTS (SELECT 1 FROM " + schema + ".chartofaccounts WHERE glcode='"
                                + escapeSql(parentGlCode) + "');";

                        queries.add(parentSql);
                        processedCodes.add(key);
                    }
                }

                String sql = "INSERT INTO " + schema + ".chartofaccounts "
                        + "(id, glcode, \"name\", description, isactiveforposting, parentid, purposeid, operation, \"type\", \"class\", classification, functionreqd, budgetcheckreq, scheduleid, receiptscheduleid, receiptoperation, paymentscheduleid, paymentoperation, majorcode, fiescheduleid, fieoperation, createddate, createdby, lastmodifieddate, lastmodifiedby, \"version\") "
                        + "VALUES("
                        + "nextval('" + schema + ".seq_chartofaccounts'), "
                        + "'" + escapeSql(glCode) + "', "
                        + "'" + escapeSql(name) + "', "
                        + "NULL, true, "
                        + (parentGlCode.isEmpty() ? "NULL, "
                                : "(SELECT id FROM " + schema + ".chartofaccounts WHERE glcode='"
                                        + escapeSql(parentGlCode) + "' LIMIT 1), ") // Dynamic parent ID lookup
                        + "NULL, NULL, "
                        + "'" + type + "', "
                        + "NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, "
                        + "'" + escapeSql(majorCode) + "', "
                        + "NULL, NULL, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP, NULL, 0"
                        + ");";

                queries.add(sql);
            }
            try {
                int batchSize = 500;
                for (int startIndex = 0; startIndex < queries.size(); startIndex += batchSize) {
                    List<String> chunk = queries.subList(startIndex, Math.min(startIndex + batchSize, queries.size()));
                    jdbcTemplate.batchUpdate(chunk.toArray(new String[0]));
                }
            } catch (org.springframework.dao.DataAccessException e) {
                String cause = e.getRootCause() != null ? e.getRootCause().getMessage() : e.getMessage();
                throw new ExcelProcessingException("Database insertion failed for GLCODE sheet. Reason: " + cause, e);
            }
        } catch (ExcelProcessingException ex) {
            throw ex;
        } catch (Exception e) {
            throw new ExcelProcessingException("Failed to process GLCODE sheet. Reason: " + e.getMessage(), e);
        }

        return "Successfully generated and inserted " + recordCount + " GL Code records (via " + queries.size()
                + " sub-queries).";
    }

    private Map<String, Integer> getColumnMap(Row headerRow, DataFormatter formatter) {

        if (headerRow == null) {
            throw new ExcelProcessingException(
                    "Header row not found in Excel sheet. Please verify row 1 contains column headers.");
        }

        Map<String, Integer> columnMap = new HashMap<>();

        for (int i = 0; i < headerRow.getLastCellNum(); i++) {

            Cell cell = headerRow.getCell(i);

            if (cell == null) {
                continue;
            }

            String header = normalizeHeader(formatter.formatCellValue(cell));

            if (!header.isEmpty()) {
                columnMap.put(header, i);
            }
        }

        return columnMap;
    }

    private void validateBSColumns(Map<String, Integer> columnMap) {

        String[] requiredColumns = {
                "ulb",
                "financialyear",
                "department",
                "fund",
                "function",
                "glcode",
                "openingdebitbalance",
                "openingcreditbalance"
        };

        validateRequiredColumns(columnMap, requiredColumns, "BS");
    }

    private void validateJVColumns(Map<String, Integer> columnMap) {

        String[] requiredColumns = {
                "ulb",
                "voucherdate",
                "glcode",
                "debitamount",
                "creditamount",
                "function",
                "department",
                "fund"
        };

        validateRequiredColumns(columnMap, requiredColumns, "JV");
    }

    private void validateRequiredColumns(
            Map<String, Integer> columnMap,
            String[] requiredColumns,
            String sheetName) {

        for (String column : requiredColumns) {
            if (!columnMap.containsKey(column)) {
                throw new ExcelProcessingException(
                        "Required column not found in '" + sheetName + "' sheet: '" + column
                                + "'. Please ensure the exact columns exist.");
            }
        }
    }

    private String normalizeHeader(String header) {
        return header == null
                ? ""
                : header.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private double getNumericValue(
            Cell cell,
            int excelRowNumber,
            String columnName,
            DataFormatter formatter,
            FormulaEvaluator formulaEvaluator) {

        if (cell == null) {
            return 0.00;
        }

        try {
            if (cell.getCellType() == CellType.FORMULA) {
                return formulaEvaluator.evaluate(cell).getNumberValue();
            }

            if (cell.getCellType() == CellType.NUMERIC) {
                return cell.getNumericCellValue();
            }

            String value = formatter.formatCellValue(cell, formulaEvaluator)
                    .trim()
                    .replace(",", "");

            if (value.isEmpty()) {
                return 0.00;
            }

            return Double.parseDouble(value);

        } catch (Exception e) {
            throw new ExcelProcessingException(
                    "Invalid numeric value in Excel. Excel Row: "
                            + excelRowNumber
                            + ", Column: "
                            + columnName
                            + ", Value: ["
                            + formatter.formatCellValue(cell, formulaEvaluator)
                            + "]. Ensure it is formatted as a number.");
        }
    }

    private String getCellValue(
            Row row,
            int cellIndex,
            DataFormatter formatter,
            FormulaEvaluator formulaEvaluator) {

        Cell cell = row.getCell(cellIndex);

        if (cell == null) {
            return "";
        }

        return formatter.formatCellValue(cell, formulaEvaluator).trim();
    }

    private String getDateValue(
            Cell cell,
            DataFormatter formatter,
            FormulaEvaluator formulaEvaluator) {

        if (cell == null) {
            return "";
        }

        if (DateUtil.isCellDateFormatted(cell)) {
            return new SimpleDateFormat("yyyy-MM-dd")
                    .format(cell.getDateCellValue());
        }

        return formatter.formatCellValue(cell, formulaEvaluator).trim();
    }

    private boolean isRowEmpty(
            Row row,
            DataFormatter formatter,
            FormulaEvaluator formulaEvaluator) {

        for (int i = 0; i < row.getLastCellNum(); i++) {
            if (!getCellValue(row, i, formatter, formulaEvaluator).isEmpty()) {
                return false;
            }
        }

        return true;
    }

    private String formatAmount(double amount) {
        return String.format(Locale.US, "%.2f", amount);
    }

    private String escapeSql(String value) {
        return value == null ? "" : value.replace("'", "''");
    }

}
