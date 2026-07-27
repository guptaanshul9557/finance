package com.jk.missinggl;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/transaction-summary")
public class TransactionSummaryController {

    @Autowired
    private TransactionSummaryService service;

    @PostMapping(value = "/generate-query", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> generateQuery(
            @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(service.generateQueries(file));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(e.getMessage());
        }
    }

    @PostMapping(value = "/generate-jv-query", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> generateJVQuery(
            @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(service.generateJVQueries(file));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(e.getMessage());
        }
    }

    @PostMapping(value = "/create-glcode", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> generateGlCodeQuery(
            @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(service.generateGlCodeQueries(file));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(e.getMessage());
        }
    }
}