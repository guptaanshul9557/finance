package com.jk.missinggl;

import java.util.List;

import lombok.Data; @Data public class MissingGlCodeSheetResponse { private String sheetName; private Integer totalExcelGlCodes; private Integer existingGlCodes; private Integer missingGlCodesCount; private List<MissingGlCodeDetail> missingGlCodes; }