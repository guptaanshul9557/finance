package com.jk.missinggl;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/chartofaccounts")
public class ChartOfAccountsController {

    @Autowired
    private ChartOfAccountsService chartOfAccountsService;

    @PostMapping(
            value = "/missing-glcodes",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<?> getMissingGlCodes(@RequestParam("file") MultipartFile file) {

        try {
            MissingGlCodeSheetWiseResponse response =
                    chartOfAccountsService.findMissingGlCodesSheetWise(file);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
        	Map<String, String> errorResponse = new HashMap<>();
        	errorResponse.put("status", "FAILED");
        	errorResponse.put("message", e.getMessage());

        	return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}
