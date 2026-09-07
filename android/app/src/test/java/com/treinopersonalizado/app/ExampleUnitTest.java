package com.treinopersonalizado.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/** Verifica a identidade de lançamento do app no ambiente local. */
public class ExampleUnitTest {

    @Test
    public void applicationId_isStable() {
        assertEquals("com.treinopersonalizado.app", BuildConfig.APPLICATION_ID);
    }
}
