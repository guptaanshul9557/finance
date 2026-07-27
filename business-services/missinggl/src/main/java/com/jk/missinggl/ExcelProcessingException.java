package com.jk.missinggl;

public class ExcelProcessingException extends RuntimeException {
    public ExcelProcessingException(String message) {
        super(message);
    }

    public ExcelProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}
