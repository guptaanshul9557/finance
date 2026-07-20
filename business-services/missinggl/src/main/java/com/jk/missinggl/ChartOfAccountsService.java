package com.jk.missinggl;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ChartOfAccountsService {

    private final JdbcTemplate jdbcTemplate;

    public ChartOfAccountsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public MissingGlCodeSheetWiseResponse findMissingGlCodesSheetWise(MultipartFile file) throws Exception {

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Excel file is required");
        }

        MissingGlCodeSheetWiseResponse response = new MissingGlCodeSheetWiseResponse();
        response.setStatus("SUCCESS");

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {

            Sheet bsSheet = workbook.getSheet("BS");
            Sheet jvSheet = workbook.getSheet("JV");

            response.setBs(processSheet(bsSheet, "BS"));
            response.setJv(processSheet(jvSheet, "JV"));
        }

        return response;
    }

    private MissingGlCodeSheetResponse processSheet(Sheet sheet, String sheetName) {

        MissingGlCodeSheetResponse response = new MissingGlCodeSheetResponse();
        response.setSheetName(sheetName);

        if (sheet == null) {
            response.setTotalExcelGlCodes(0);
            response.setExistingGlCodes(0);
            response.setMissingGlCodesCount(0);
            response.setMissingGlCodes(Collections.emptyList());
            return response;
        }

        List<ExcelGlCodeRow> excelRows = readGlCodeRowsFromSheet(sheet);

        /*
         * Duplicate GL code in the same schema is checked only once.
         * Key format: schemaName|glCode
         */
        Map<String, ExcelGlCodeRow> uniqueRowMap = new LinkedHashMap<>();

        for (ExcelGlCodeRow row : excelRows) {
            String uniqueKey = row.getSchemaName() + "|" + row.getGlCode();
            uniqueRowMap.putIfAbsent(uniqueKey, row);
        }

        List<ExcelGlCodeRow> uniqueExcelRows = new ArrayList<>(uniqueRowMap.values());

        Map<String, List<ExcelGlCodeRow>> rowsBySchema = uniqueExcelRows.stream()
                .collect(Collectors.groupingBy(
                        ExcelGlCodeRow::getSchemaName,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<MissingGlCodeDetail> missingGlCodes = new ArrayList<>();
        int existingGlCodesCount = 0;

        for (Map.Entry<String, List<ExcelGlCodeRow>> entry : rowsBySchema.entrySet()) {

            String schemaName = entry.getKey();
            List<ExcelGlCodeRow> schemaRows = entry.getValue();

            Set<String> glCodes = schemaRows.stream()
                    .map(ExcelGlCodeRow::getGlCode)
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            Set<String> existingGlCodes = getExistingGlCodes(schemaName, glCodes);

            existingGlCodesCount += existingGlCodes.size();

            for (ExcelGlCodeRow excelRow : schemaRows) {

                if (!existingGlCodes.contains(excelRow.getGlCode())) {

                    MissingGlCodeDetail missingGlCode = new MissingGlCodeDetail();
                    missingGlCode.setRowNumber(excelRow.getRowNumber());
                    //missingGlCode.setUlb(excelRow.getUlb());
                    //missingGlCode.setSchemaName(excelRow.getSchemaName());
                    missingGlCode.setGlCode(excelRow.getGlCode());

                    missingGlCodes.add(missingGlCode);
                }
            }
        }

        response.setTotalExcelGlCodes(uniqueExcelRows.size());
        response.setExistingGlCodes(existingGlCodesCount);
        response.setMissingGlCodesCount(missingGlCodes.size());
        response.setMissingGlCodes(missingGlCodes);

        return response;
    }

    private List<ExcelGlCodeRow> readGlCodeRowsFromSheet(Sheet sheet) {

        List<ExcelGlCodeRow> excelRows = new ArrayList<>();

        Row headerRow = sheet.getRow(0);

        if (headerRow == null) {
            throw new RuntimeException("Header row not found in sheet: " + sheet.getSheetName());
        }

        int ulbColumnIndex = findColumnIndex(headerRow, "ULB");
        int glCodeColumnIndex = findColumnIndex(headerRow, "glcode");

        if (ulbColumnIndex == -1) {
            throw new RuntimeException("ULB column not found in sheet: " + sheet.getSheetName());
        }

        if (glCodeColumnIndex == -1) {
            throw new RuntimeException("glcode column not found in sheet: " + sheet.getSheetName());
        }

        for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {

            Row row = sheet.getRow(rowIndex);

            if (row == null) {
                continue;
            }

            String ulbValue = getCellValueAsString(row.getCell(ulbColumnIndex));
            String schemaName = normalizeSchemaName(ulbValue);

            String glCode = normalizeGlCode(
                    getCellValueAsString(row.getCell(glCodeColumnIndex))
            );

            if (schemaName == null || schemaName.isEmpty()
                    || glCode == null || glCode.isEmpty()) {
                continue;
            }

            ExcelGlCodeRow excelRow = new ExcelGlCodeRow();
            excelRow.setSheetName(sheet.getSheetName());
            excelRow.setRowNumber(rowIndex + 1);
            excelRow.setUlb(schemaName);
            excelRow.setSchemaName(schemaName);
            excelRow.setGlCode(glCode);

            excelRows.add(excelRow);
        }

        return excelRows;
    }

    private int findColumnIndex(Row headerRow, String expectedColumnName) {

        for (Cell cell : headerRow) {

            String headerValue = getCellValueAsString(cell);

            if (headerValue != null
                    && expectedColumnName.equalsIgnoreCase(headerValue.trim())) {
                return cell.getColumnIndex();
            }
        }

        return -1;
    }

    private Set<String> getExistingGlCodes(String schemaName, Set<String> glCodes) {

        if (glCodes == null || glCodes.isEmpty()) {
            return Collections.emptySet();
        }

        String placeholders = glCodes.stream()
                .map(glCode -> "?")
                .collect(Collectors.joining(","));

        String query = "SELECT glcode::text "
                + "FROM " + schemaName + ".chartofaccounts "
                + "WHERE REPLACE(REPLACE(TRIM(glcode::text), ' ', ''), '\"', '') "
                + "IN (" + placeholders + ")";

        try {
            List<String> existingGlCodes = jdbcTemplate.queryForList(
                    query,
                    String.class,
                    glCodes.toArray()
            );

            return existingGlCodes.stream()
                    .map(this::normalizeGlCode)
                    .collect(Collectors.toSet());

        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to check GL codes for schema: " + schemaName
                            + ". Root cause: " + getRootCauseMessage(e),
                    e
            );
        }
    }

    /*
     * Removes:
     * - double quotes
     * - leading/trailing spaces
     * - spaces between GL code digits
     * - tabs/new lines and other whitespace
     *
     * Examples:
     * " 1401101 " -> 1401101
     * 140 1101   -> 1401101
     * "1401101"  -> 1401101
     */
    private String normalizeGlCode(String glCode) {

        if (glCode == null) {
            return null;
        }

        return glCode
                .replace("\"", "")
                .trim()
                .replaceAll("\\s+", "");
    }

    /*
     * ULB value itself is the PostgreSQL schema name.
     * Only surrounding quotes and spaces are removed.
     *
     * Example:
     * " pb_devsar " -> pb_devsar
     */
    private String normalizeSchemaName(String ulbValue) {

        if (ulbValue == null) {
            return null;
        }

        String schemaName = ulbValue
                .replace("\"", "")
                .trim();

        if (schemaName.isEmpty()) {
            return null;
        }

        validateSchemaName(schemaName);

        return schemaName;
    }

    private void validateSchemaName(String schemaName) {

        /*
         * PostgreSQL unquoted schema names allowed by this API:
         * devsar
         * pb_devsar
         * ukd_devsar
         */
        if (!schemaName.matches("^[a-zA-Z0-9_]+$")) {
            throw new RuntimeException(
                    "Invalid schema name in Excel ULB column: " + schemaName
            );
        }
    }

    private String getCellValueAsString(Cell cell) {

        if (cell == null) {
            return null;
        }

        DataFormatter dataFormatter = new DataFormatter();

        if (cell.getCellType() == CellType.FORMULA) {
            try {
                FormulaEvaluator formulaEvaluator = cell.getSheet()
                        .getWorkbook()
                        .getCreationHelper()
                        .createFormulaEvaluator();

                return dataFormatter.formatCellValue(cell, formulaEvaluator);
            } catch (Exception e) {
                return dataFormatter.formatCellValue(cell);
            }
        }

        if (cell.getCellType() == CellType.NUMERIC) {
            return BigDecimal.valueOf(cell.getNumericCellValue())
                    .stripTrailingZeros()
                    .toPlainString();
        }

        return dataFormatter.formatCellValue(cell);
    }

    private String getRootCauseMessage(Exception exception) {

        Throwable cause = exception;

        while (cause.getCause() != null) {
            cause = cause.getCause();
        }

        return cause.getMessage() == null
                ? cause.getClass().getName()
                : cause.getMessage();
    }
}
