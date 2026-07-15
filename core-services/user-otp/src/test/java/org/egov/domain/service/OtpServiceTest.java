package org.egov.domain.service;

import org.egov.domain.exception.*;
import org.egov.domain.model.OtpRequest;
import org.egov.domain.model.OtpRequestType;
import org.egov.domain.model.User;
import org.egov.persistence.repository.OtpEmailRepository;
import org.egov.persistence.repository.OtpRepository;
import org.egov.persistence.repository.OtpSMSRepository;
import org.egov.persistence.repository.UserRepository;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static org.mockito.Mockito.*;

@RunWith(MockitoJUnitRunner.class)
public class OtpServiceTest {

    @Mock
    private OtpRepository otpRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OtpSMSRepository otpSMSRepository;

    @Mock
    private OtpEmailRepository otpEmailRepository;

    @InjectMocks
    private OtpService otpService;

    @Test
    public void test_should_validate_otp_request_for_user_registration() {
        final OtpRequest otpRequest = OtpRequest.builder()
                .tenantId("tenant")
                .mobileNumber("1234567890")
                .type(OtpRequestType.REGISTER)
                .userType("CITIZEN")
                .build();

        otpService.sendOtp(otpRequest);

        otpRequest.validate();
    }

    // @Test(expected = UserNotExistingInSystemException.class)
    // public void test_should_validate_otp_request_for_user_login() {
    //     final OtpRequest otpRequest = OtpRequest.builder()
    //             .tenantId("tenant")
    //             .mobileNumber("1234567890")
    //             .type(OtpRequestType.LOGIN)
    //             .userType("CITIZEN")
    //             .build();

    //     // lenient because depending on service logic, fetchUser may or may not be called
    //     lenient().when(userRepository.fetchUser(anyString(), anyString(), anyString(), anyString()))
    //             .thenReturn(new User(1L, "foo@bar.com", "123"));

    //     otpService.sendOtp(otpRequest);

    //     otpRequest.validate();
    // }

    // @Test(expected = UserAlreadyExistInSystemException.class)
    // public void test_should_throwException_when_userAlreadyExist_IncaseOfRegistration() {
    //     final OtpRequest otpRequest = OtpRequest.builder()
    //             .tenantId("tenant")
    //             .mobileNumber("1234567890")
    //             .type(OtpRequestType.REGISTER)
    //             .userType("CITIZEN")
    //             .build();

    //     when(userRepository.fetchUser(anyString(), anyString(), anyString(), anyString()))
    //             .thenReturn(new User(1L, "foo@bar.com", "1234567890"));

    //     otpService.sendOtp(otpRequest);
    // }

    // @Test(expected = UserNotExistingInSystemException.class)
    // public void test_should_throwException_when_userNotExist_IncaseOfLogin() {
    //     final OtpRequest otpRequest = OtpRequest.builder()
    //             .tenantId("tenant")
    //             .mobileNumber("1234567890")
    //             .type(OtpRequestType.LOGIN)
    //             .userType("CITIZEN")
    //             .build();

    //     when(userRepository.fetchUser(anyString(), anyString(), anyString(), anyString()))
    //             .thenReturn(null);

    //     otpService.sendOtp(otpRequest);
    // }

    @Test
    public void test_should_validate_otp_request_for_password_reset() {
        final OtpRequest otpRequest = OtpRequest.builder()
                .tenantId("tenant")
                .mobileNumber("1234567890")
                .type(OtpRequestType.PASSWORD_RESET)
                .userType("CITIZEN")
                .build();

        lenient().when(userRepository.fetchUser(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new User(1L, "foo@bar.com", "123"));

        otpService.sendOtp(otpRequest);

        otpRequest.validate();
    }

    @Test(expected = UserNotFoundException.class)
    public void test_should_throwException_whenmobilenumber_is_null() {
        final OtpRequest otpRequest = OtpRequest.builder()
                .tenantId("tenant")
                .mobileNumber(null)
                .type(OtpRequestType.PASSWORD_RESET)
                .userType("CITIZEN")
                .build();

        otpService.sendOtp(otpRequest);
    }

    @Test(expected = UserNotFoundException.class)
    public void test_should_throwException_whenmobilenumber_is_empty() {
        final OtpRequest otpRequest = OtpRequest.builder()
                .tenantId("tenant")
                .mobileNumber("")
                .type(OtpRequestType.PASSWORD_RESET)
                .userType("CITIZEN")
                .build();

        otpService.sendOtp(otpRequest);
    }

    @Test
    public void test_should_send_smsm_otp_for_user_registration() {
        final OtpRequest otpRequest = OtpRequest.builder()
                .tenantId("tenant")
                .mobileNumber("1234567890")
                .type(OtpRequestType.REGISTER)
                .userType("CITIZEN")
                .build();

        final String otpNumber = "otpNumber";
        when(otpRepository.fetchOtp(otpRequest)).thenReturn(otpNumber);

        otpService.sendOtp(otpRequest);

        verify(otpSMSRepository).send(otpRequest, otpNumber);
    }

    @Test
    public void test_should_send_sms_otp_for_password_reset() {
        final OtpRequest otpRequest = OtpRequest.builder()
                .tenantId("tenant")
                .mobileNumber("1234567890")
                .type(OtpRequestType.PASSWORD_RESET)
                .userType("CITIZEN")
                .build();

        final String otpNumber = "otpNumber";
        when(otpRepository.fetchOtp(otpRequest)).thenReturn(otpNumber);
        when(userRepository.fetchUser(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new User(1L, "foo@bar.com", "1234"));

        otpService.sendOtp(otpRequest);

        verify(otpSMSRepository).send(otpRequest, otpNumber);
    }

    @Test
    public void test_should_send_email_otp_for_password_reset() {
        final OtpRequest otpRequest = OtpRequest.builder()
                .tenantId("tenant")
                .mobileNumber("1234567890")
                .type(OtpRequestType.PASSWORD_RESET)
                .userType("CITIZEN")
                .build();

        final String otpNumber = "otpNumber";
        when(otpRepository.fetchOtp(otpRequest)).thenReturn(otpNumber);
        when(userRepository.fetchUser(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new User(1L, "foo@bar.com", "123"));

        otpService.sendOtp(otpRequest);

        verify(otpEmailRepository).send("foo@bar.com", otpNumber);
    }
}
